(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    const A = FD.DataServiceAuthoring;
    function markerGeometry(marker) {
        const geometry = FD.MarkerShapeService?.geometry(marker);
        if (!geometry) {
            throw C.workerError(400, 'Deze marker heeft geen geldige positie of grootte. Ververs en probeer opnieuw.');
        }
        return geometry;
    }
    function baseMarkerRevisions(floorplan, prepared) {
        const touched = new Set();
        [...prepared.markerUpdates, ...prepared.doorUpdates].forEach((item) => {
            const doorId = Number(item?.doorId || 0);
            if (doorId)
                touched.add(doorId);
        });
        prepared.deletedDoorIds.forEach((doorId) => touched.add(Number(doorId)));
        return (Array.isArray(floorplan?.doors) ? floorplan.doors : [])
            .filter((door) => touched.has(Number(door?.id)) && door?.marker_revision)
            .map((door) => ({
            door_id: Number(door.id),
            marker_revision: String(door.marker_revision),
        }));
    }
    function baseMarkerStates(floorplan, prepared, svgEl, editChanges) {
        const cloneValue = (value) => (value ? JSON.parse(JSON.stringify(value)) : undefined);
        const changes = Array.from(editChanges || []);
        const geometryById = new Map(prepared.markerUpdates.map((item) => [Number(item.doorId), item.geometry]));
        const metadataById = new Map(prepared.doorUpdates.map((item) => [Number(item.doorId), item]));
        const deleted = new Set(prepared.deletedDoorIds.map((doorId) => Number(doorId)));
        const doors = Array.isArray(floorplan?.doors) ? floorplan.doors : [];
        return doors.flatMap((door) => {
            const doorId = Number(door?.id || 0);
            if (!geometryById.has(doorId) && !metadataById.has(doorId) && !deleted.has(doorId))
                return [];
            const keys = new Set([String(doorId), String(F.markerKey(door) || '')]);
            const markerChanges = changes
                .filter(change => keys.has(String(change?.doorId || '')))
                .reverse();
            let geometry = cloneValue(geometryById.get(doorId));
            if (!geometry) {
                const marker = Array.from(svgEl.querySelectorAll(FD.MarkerShapeService?.markerSelector || 'ellipse, circle')).find(item => A.doorByMarker(item, [door]));
                const originalMarker = markerChanges.find(change => change?.element)?.element;
                if (marker)
                    geometry = markerGeometry(marker);
                else if (originalMarker)
                    geometry = markerGeometry(originalMarker);
            }
            if (!geometry)
                throw C.workerError(409, 'De oorspronkelijke markerpositie ontbreekt. Open de kaart opnieuw.');
            let resolvedGeometry = geometry;
            const fields = new Set();
            markerChanges.forEach(change => {
                const type = String(change?.type || '');
                if (type === 'move') {
                    fields.add('position');
                    if (resolvedGeometry.shape === 'ellipse' || !resolvedGeometry.shape) {
                        resolvedGeometry.cx = Number(change.oldCx);
                        resolvedGeometry.cy = Number(change.oldCy);
                    }
                    else if (resolvedGeometry.shape === 'rectangle') {
                        resolvedGeometry.x = Number(change.oldCx) - Number(resolvedGeometry.width) / 2;
                        resolvedGeometry.y = Number(change.oldCy) - Number(resolvedGeometry.height) / 2;
                    }
                    else {
                        fields.delete('position');
                        fields.add('geometry');
                    }
                }
                if (type === 'resize') {
                    if (change.oldGeometry)
                        resolvedGeometry = cloneValue(change.oldGeometry) || resolvedGeometry;
                    else {
                        resolvedGeometry.rx = Number(change.oldRx);
                        resolvedGeometry.ry = Number(change.oldRx);
                    }
                    fields.add(resolvedGeometry.shape === 'polygon' ? 'geometry' : 'size');
                }
                if (type === 'replace') {
                    if (change.element)
                        resolvedGeometry = markerGeometry(change.element);
                    fields.add('geometry');
                }
            });
            const metadata = metadataById.get(doorId);
            if (metadata) {
                if (String(metadata.doorCode || '') !== String(door.door_code || ''))
                    fields.add('door_code');
                if (String(metadata.name || '') !== String(door.name || ''))
                    fields.add('name');
                if (String(metadata.securityLevel || '') !== String(door.security_level || ''))
                    fields.add('security_level');
            }
            if (deleted.has(doorId))
                fields.add('delete');
            if (!fields.size) {
                throw C.workerError(409, 'De gewijzigde markervelden konden niet worden bepaald. Open de kaart opnieuw.');
            }
            return [{
                    door_id: doorId,
                    marker_revision: String(door.marker_revision || ''),
                    geometry: resolvedGeometry,
                    door_code: String(door.door_code || ''),
                    name: door.name || null,
                    security_level: door.security_level || null,
                    changed_fields: [...fields],
                }];
        });
    }
    FD.DataServiceMarkerFieldBases = { baseMarkerRevisions, baseMarkerStates };
})(window);
