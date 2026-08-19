(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    function applyStatusRows(floorId, rows) {
        const floorplan = C.floorplanCache.get(floorId);
        if (!floorplan || !Array.isArray(floorplan.doors))
            return [];
        const byDoorId = new Map(rows.map(row => [Number(row.id), row]));
        const changedDoorIds = [];
        const doors = floorplan.doors.map((door) => {
            const row = byDoorId.get(Number(door.id));
            if (!row)
                return door;
            const next = {
                ...door,
                status: row.status,
                opname_status: row.opname_status,
                onderhoud_status: row.onderhoud_status,
                has_opname: Boolean(row.has_opname),
                has_onderhoud: Boolean(row.has_onderhoud),
            };
            if (next.status !== door.status || next.opname_status !== door.opname_status ||
                next.onderhoud_status !== door.onderhoud_status || next.has_opname !== door.has_opname ||
                next.has_onderhoud !== door.has_onderhoud)
                changedDoorIds.push(F.markerKey(next));
            return next;
        });
        if (!changedDoorIds.length)
            return changedDoorIds;
        const nextFloorplan = { ...floorplan, doors };
        C.floorplanCache.set(floorId, nextFloorplan);
        F.updateStatusCache(nextFloorplan);
        return changedDoorIds;
    }
    async function loadFloorplanStatus(config, fileUrl, options = {}) {
        const floorId = F.floorIdFromUrl(fileUrl);
        if (!floorId)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const knownRevision = String(options.statusRevision || '').trim();
        const query = knownRevision ? `?revision=${encodeURIComponent(knownRevision)}` : '';
        const response = await C.requestJson(config, `/api/floors/${floorId}/status${query}`, options);
        const rows = Array.isArray(response?.doors) ? response.doors : [];
        const doorIds = response?.changed ? applyStatusRows(floorId, rows) : [];
        return {
            changed: doorIds.length > 0,
            revision: String(response?.revision || knownRevision),
            doorIds,
            rows,
            status: FD.StatusService?.readCachedDoorStatus?.() || {},
        };
    }
    FD.DataServiceFloorplanStatus = { loadFloorplanStatus };
})(window);
