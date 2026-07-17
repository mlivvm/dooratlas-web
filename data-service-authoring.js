(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    const DOOR_METADATA_EDITED_ATTR = 'data-dooratlas-door-metadata-edited';
    const DUTCH_ORDINAL_LEVELS = {
        eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5,
        zesde: 6, zevende: 7, achtste: 8, negende: 9, tiende: 10,
    };
    function expectedLevelOrder(value) {
        const text = F.normalizeLookup(value);
        if (!text)
            return null;
        const numeric = text.match(/^-?\d{1,2}$/);
        if (numeric)
            return Math.max(-50, Math.min(100, parseInt(numeric[0], 10)));
        const basementMatch = text.match(/(?:kelder|souterrain)\s*(?:niveau\s*)?-?\s*(\d{1,2})/);
        if (basementMatch?.[1])
            return Math.max(-50, -Number(basementMatch[1]));
        if (text.includes('kelder') || text.includes('souterrain'))
            return -1;
        if (text.includes('begane grond') || text === 'bg' || text.includes('parterre'))
            return 0;
        if (text.includes('dak'))
            return 100;
        if (text.includes('zolder'))
            return 9;
        const floorMatch = text.match(/(?:verdieping|etage|vloer)?\s*(\d{1,2})\s*(?:e|ste|de)?\s*(?:verdieping|etage|vloer)?/);
        if (floorMatch?.[1] && /(verdieping|etage|vloer)|^\d/.test(text)) {
            return Math.max(-50, Math.min(100, Number(floorMatch[1])));
        }
        const ordinal = Object.entries(DUTCH_ORDINAL_LEVELS).find(([word]) => text.includes(`${word} verdieping`) || text.includes(`${word} etage`));
        return ordinal ? ordinal[1] : null;
    }
    function suggestLevelOrder(value) {
        return expectedLevelOrder(value) ?? 0;
    }
    function levelOrderWarning(value, levelOrder) {
        const expected = expectedLevelOrder(value);
        const levelText = String(levelOrder ?? '').trim();
        if (expected === null || !levelText || !Number.isInteger(Number(levelText)) || Number(levelText) === expected)
            return '';
        return `Weet u zeker dat het ingevulde niveau klopt? Op basis van de naam verwachten we niveau ${expected}.`;
    }
    async function tenantByName(config, customerName, options = {}) {
        const name = F.normalizeLookup(customerName);
        if (!name)
            throw C.workerError(400, 'Kies een klant.');
        const tenants = await C.requestJson(config, '/api/tenants', options);
        const tenant = (tenants || []).find((item) => F.normalizeLookup(item.tenant_name) === name);
        if (!tenant)
            throw C.workerError(404, 'Klant niet gevonden. Ververs de app en kies de klant opnieuw.');
        return tenant;
    }
    async function createTenant(config, body, options = {}) {
        return C.requestJson(config, '/api/tenants', { ...options, method: 'POST', csrf: true, body });
    }
    async function listLocations(config, tenantId, options = {}) {
        return C.requestJson(config, `/api/locations?tenant_id=${tenantId}`, options);
    }
    async function createLocation(config, body, options = {}) {
        return C.requestJson(config, '/api/locations', { ...options, method: 'POST', csrf: true, body });
    }
    async function locationForUpload(config, tenantId, buildingName, options = {}) {
        const name = F.normalizeName(buildingName);
        if (!name)
            throw C.workerError(400, 'Vul een pand in.');
        const locations = await C.requestJson(config, `/api/locations?tenant_id=${tenantId}`, options);
        const existing = (locations || []).find((item) => F.normalizeLookup(item.name) === F.normalizeLookup(name));
        if (existing)
            return existing;
        return C.requestJson(config, '/api/locations', { ...options, method: 'POST', csrf: true, body: { tenant_id: tenantId, name } });
    }
    function floorplanFromMutation(floor, tenant) {
        const floorId = Number(floor?.id || 0);
        return {
            name: String(floorId || ''),
            displayName: `${floor?.location_name || ''} - ${floor?.name || ''}`.trim(),
            file: String(floorId || ''),
            repo: 'uploads',
            tenantId: Number(tenant?.id || floor?.tenant_id || 0),
            locationId: Number(floor?.location_id || 0),
            floorId,
            building: String(floor?.location_name || ''),
            floorLabel: String(floor?.name || ''),
            levelOrder: Number(floor?.level_order ?? floor?.levelOrder),
            floorNotes: String(floor?.notes || ''),
            locationStreet: String(floor?.location_street || ''),
            locationPostalCode: String(floor?.location_postal_code || ''),
            locationCity: String(floor?.location_city || ''),
            locationNotes: String(floor?.location_notes || ''),
            doorCount: Number(floor?.door_count || 0),
            uploaded: true,
            uploadedByApp: true,
        };
    }
    async function putFloorSvg(config, floorId, svgText, options = {}) {
        return C.requestRawJson(config, `/api/floors/${floorId}/svg`, { ...options, method: 'PUT', csrf: true, contentType: 'image/svg+xml; charset=utf-8', body: svgText });
    }
    async function saveFloorAuthoring(config, floorId, svgText, doorUpdates, newDoors, deletedDoorIds, options = {}) {
        return C.requestJson(config, `/api/floors/${floorId}/authoring-save`, {
            ...options,
            method: 'POST',
            csrf: true,
            body: {
                svg_text: svgText,
                expected_revision: String(options.expectedRevision || ''),
                door_updates: doorUpdates.map(update => ({ door_id: update.doorId, door_code: update.doorCode, name: update.name })),
                new_doors: newDoors.map(door => ({ draft_key: door.draftKey, door_code: door.doorCode, name: door.name })),
                deleted_door_ids: deletedDoorIds,
            },
        });
    }
    async function createInspection(config, doorId, payload, options = {}) {
        const id = Number(doorId || 0);
        if (!id)
            throw C.workerError(400, 'Kies eerst een deur.');
        const result = await C.requestJson(config, `/api/doors/${id}/inspections`, { ...options, method: 'POST', csrf: true, body: payload });
        C.floorplanCache.clear();
        return result;
    }
    function doorByMarker(marker, doors) {
        const doorId = Number(marker.getAttribute('data-dooratlas-door-id') || marker.getAttribute('data-fd-api-door-id') || 0);
        if (doorId) {
            const byId = doors.find(door => Number(door.id) === doorId);
            if (byId)
                return byId;
        }
        const markerUuid = String(marker.getAttribute('data-dooratlas-marker-uuid') || F.markerUuidFromKey(marker.getAttribute('id'))).toLowerCase();
        if (markerUuid) {
            const byUuid = doors.find(door => String(door.marker_uuid || '').toLowerCase() === markerUuid);
            if (byUuid)
                return byUuid;
        }
        const pgCode = F.normalizeName(marker.getAttribute('data-dooratlas-pg-code'));
        if (pgCode) {
            const exactMatch = doors.find(door => F.normalizeName(door.pg_code) === pgCode);
            if (exactMatch)
                return exactMatch;
            // Historical pg_code identifies the row only; it never becomes a human door_code.
            const legacyMatch = doors.find(door => !hasTechnicalAnchor(door) && F.normalizeLookup(door.pg_code) === F.normalizeLookup(pgCode));
            if (legacyMatch)
                return legacyMatch;
        }
        const markerId = F.normalizeName(marker.getAttribute('id'));
        if (markerId) {
            const exactMatch = doors.find(door => F.normalizeName(door.pg_code) === markerId);
            if (exactMatch)
                return exactMatch;
            return doors.find(door => !hasTechnicalAnchor(door) && F.normalizeLookup(door.pg_code) === F.normalizeLookup(markerId)) || null;
        }
        return null;
    }
    function markerManualCode(marker) { return F.normalizeName(marker.getAttribute('data-dooratlas-door-code') || marker.getAttribute('data-fd-door-code')); }
    function markerMetadataWasEdited(marker) { return marker.getAttribute(DOOR_METADATA_EDITED_ATTR) === 'true'; }
    function markerDescription(marker) {
        const explicitDescription = F.normalizeName(marker.getAttribute('data-dooratlas-door-description'));
        if (explicitDescription)
            return explicitDescription;
        const name = F.normalizeName(marker.getAttribute('data-dooratlas-door-name') || marker.getAttribute('data-fd-door-name'));
        return name && name !== markerManualCode(marker) ? name : '';
    }
    function doorDescription(door) {
        const name = F.normalizeName(door?.name);
        return name && name !== F.normalizeName(door?.door_code) ? name : '';
    }
    function hasTechnicalAnchor(door) {
        const markerUuid = String(door?.marker_uuid || '').trim();
        return Boolean(markerUuid && String(door?.pg_code || '') === `door-${markerUuid}`);
    }
    function applyDoorMetadataToMarker(marker, door, { preserveTechnicalAnchor = false } = {}) {
        const key = F.markerKey(door);
        const label = F.doorDisplayLabel(door);
        if (!preserveTechnicalAnchor) {
            marker.setAttribute('id', key);
            marker.setAttributeNS?.('http://www.inkscape.org/namespaces/inkscape', 'inkscape:label', key);
            marker.setAttribute('data-dooratlas-door-id', String(door.id));
            marker.setAttribute('data-dooratlas-marker-uuid', String(door.marker_uuid));
            marker.setAttribute('data-dooratlas-door-label', label);
            marker.setAttribute('data-dooratlas-status', String(door.status || 'blauw'));
            marker.setAttribute('data-dooratlas-pg-code', `door-${String(door.marker_uuid || '')}`);
        }
        if (door.door_code)
            marker.setAttribute('data-dooratlas-door-code', String(door.door_code));
        if (door.name)
            marker.setAttribute('data-dooratlas-door-name', String(door.name));
        const description = doorDescription(door);
        if (description)
            marker.setAttribute('data-dooratlas-door-description', description);
        else
            marker.removeAttribute('data-dooratlas-door-description');
    }
    function parseSvgDocument(svgText) {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        if (doc.querySelector('parsererror'))
            throw C.workerError(400, 'Gebruik een geldig SVG-bestand.');
        return doc;
    }
    function duplicateDoorCodeError(code, conflicts = []) {
        const displayCode = F.normalizeName(code);
        const err = C.workerError(409, 'duplicate_door_code', {
            code: 'duplicate_door_code',
            message: 'Deze deurcode bestaat al.',
            attemptedDoorCode: displayCode,
            conflicts: conflicts.length ? conflicts : [{ code: displayCode, scope: 'floorplan' }],
        });
        err.attemptedDoorCode = displayCode;
        return err;
    }
    function assertNoCurrentFloorDuplicateCodes(markers, doors) {
        const existingCodes = new Map();
        doors.forEach(door => {
            const code = F.normalizeLookup(door.door_code);
            if (code)
                existingCodes.set(code, door);
        });
        const markerCodes = new Set();
        const conflicts = [];
        markers.forEach(marker => {
            const existing = doorByMarker(marker, doors);
            const humanCode = markerMetadataWasEdited(marker) || !existing ? markerManualCode(marker) : F.normalizeName(existing.door_code);
            const code = F.normalizeLookup(humanCode);
            if (!code)
                return;
            const codeOwner = existingCodes.get(code);
            if (markerCodes.has(code) || (codeOwner && Number(codeOwner.id) !== Number(existing?.id))) {
                conflicts.push({ code: humanCode, scope: 'floorplan' });
            }
            markerCodes.add(code);
        });
        if (conflicts.length)
            throw duplicateDoorCodeError(conflicts[0].code, conflicts);
    }
    function prepareSvgForDoorSave(floorplan, svgText) {
        const doc = parseSvgDocument(svgText);
        const doors = Array.isArray(floorplan?.doors) ? floorplan.doors.slice() : [];
        const markers = Array.from(doc.querySelectorAll('ellipse, circle'));
        const seenDoorIds = new Set();
        const doorUpdates = [];
        const newDoors = [];
        const deletedDoorIds = [];
        assertNoCurrentFloorDuplicateCodes(markers, doors);
        for (const marker of markers) {
            const existing = doorByMarker(marker, doors);
            if (existing) {
                seenDoorIds.add(Number(existing.id));
                const metadataEdited = markerMetadataWasEdited(marker);
                const manualCode = markerManualCode(marker);
                const manualDescription = markerDescription(marker);
                if (metadataEdited && !manualCode) {
                    throw C.workerError(400, 'Vul een deurcode in voor iedere gewijzigde marker.');
                }
                const desiredCode = metadataEdited ? manualCode : F.normalizeName(existing.door_code);
                const desiredDescription = metadataEdited ? manualDescription : doorDescription(existing);
                const changed = metadataEdited && Boolean(desiredCode) && (desiredCode !== F.normalizeName(existing.door_code) || desiredDescription !== doorDescription(existing));
                if (changed)
                    doorUpdates.push({ doorId: Number(existing.id), doorCode: desiredCode, name: desiredDescription || null });
                applyDoorMetadataToMarker(marker, { ...existing, door_code: desiredCode, name: desiredDescription || desiredCode }, { preserveTechnicalAnchor: !hasTechnicalAnchor(existing) });
                marker.removeAttribute(DOOR_METADATA_EDITED_ATTR);
                continue;
            }
            const draftKey = F.normalizeName(marker.getAttribute('data-dooratlas-draft-key'));
            if (!draftKey)
                continue;
            const manualCode = markerManualCode(marker);
            if (!manualCode) {
                throw C.workerError(400, 'Vul een deurcode in voor iedere nieuwe marker.');
            }
            const manualDescription = markerDescription(marker);
            newDoors.push({ draftKey, doorCode: manualCode, name: manualDescription || null });
            marker.removeAttribute(DOOR_METADATA_EDITED_ATTR);
        }
        for (const door of doors) {
            const doorId = Number(door.id);
            if (doorId && !seenDoorIds.has(doorId) && hasTechnicalAnchor(door)) {
                deletedDoorIds.push(doorId);
            }
        }
        return {
            svgText: new XMLSerializer().serializeToString(doc.documentElement),
            doorUpdates,
            newDoors,
            deletedDoorIds,
        };
    }
    function applyCreatedDoorMetadata(svgText, createdDoors) {
        if (!createdDoors.length)
            return svgText;
        const doc = parseSvgDocument(svgText);
        const markers = Array.from(doc.querySelectorAll('ellipse, circle'));
        createdDoors.forEach(door => {
            const draftKey = F.normalizeName(door?.draft_key);
            const marker = markers.find(item => item.getAttribute('data-dooratlas-draft-key') === draftKey);
            if (!draftKey || !marker)
                throw C.workerError(409, 'De nieuwe marker kon niet worden gekoppeld. Ververs de plattegrond.');
            applyDoorMetadataToMarker(marker, door);
            marker.removeAttribute('data-dooratlas-draft-key');
        });
        return new XMLSerializer().serializeToString(doc.documentElement);
    }
    async function saveFloorplanSVG(fileUrl, svgText, options = {}) {
        const floorId = F.floorIdFromUrl(fileUrl);
        if (!floorId)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const config = options.config;
        const floorplan = C.floorplanCache.get(floorId) || await F.fetchFloorplan(config, floorId, options);
        try {
            const prepared = prepareSvgForDoorSave(floorplan, svgText);
            const expectedRevision = String(floorplan?.revision || '');
            if (!expectedRevision)
                throw C.workerError(409, 'De plattegrondrevisie ontbreekt. Ververs en probeer opnieuw.');
            const result = await saveFloorAuthoring(config, floorId, prepared.svgText, prepared.doorUpdates, prepared.newDoors, prepared.deletedDoorIds, { ...options, expectedRevision });
            const finalizedSvg = applyCreatedDoorMetadata(prepared.svgText, Array.isArray(result?.created_doors) ? result.created_doors : []);
            C.floorplanCache.delete(floorId);
            return {
                ...result,
                svgText: finalizedSvg,
                createdDoorIds: (result?.created_doors || []).map((door) => Number(door.id)),
                updatedDoorIds: prepared.doorUpdates.map((update) => update.doorId),
                deletedDoorIds: prepared.deletedDoorIds,
            };
        }
        catch (err) {
            C.floorplanCache.delete(floorId);
            throw err;
        }
    }
    async function addUploadedFloorplan(config, payload, options = {}) {
        const tenant = payload?.tenantId
            ? { id: Number(payload.tenantId), tenant_name: payload.customerName || '' }
            : await tenantByName(config, payload?.customerName, options);
        const locationId = Number(payload?.locationId || 0);
        if (!locationId)
            throw C.workerError(400, 'Kies een pand / locatie.');
        const floorLabel = F.normalizeName(payload?.floorName || payload?.floorLabel || payload?.floorplanName);
        if (!floorLabel)
            throw C.workerError(400, 'Vul een verdieping of naam in voor de plattegrond.');
        const levelOrder = Number(payload?.levelOrder);
        if (!Number.isInteger(levelOrder) || levelOrder < -50 || levelOrder > 100) {
            throw C.workerError(400, 'Vul een geldig niveau in van -50 t/m 100.');
        }
        const floor = await C.requestJson(config, '/api/floors', {
            ...options,
            method: 'POST',
            csrf: true,
            body: {
                tenant_id: Number(tenant.id),
                location_id: locationId,
                name: floorLabel,
                level_order: levelOrder,
                notes: F.normalizeName(payload?.floorNotes || '') || null,
            },
        });
        try {
            await putFloorSvg(config, Number(floor.id), payload?.svgText || '', options);
        }
        catch (err) {
            C.floorplanCache.delete(Number(floor.id));
            try {
                await C.requestJson(config, `/api/floors/${Number(floor.id)}`, {
                    ...options,
                    method: 'DELETE',
                    csrf: true,
                });
            }
            catch (rollbackErr) {
                options.logger?.error?.('Uploadrollback mislukt:', rollbackErr);
            }
            throw err;
        }
        C.floorplanCache.delete(Number(floor.id));
        const customers = await F.loadCustomers(config);
        return { customers, floorplan: floorplanFromMutation(floor, tenant) };
    }
    FD.DataServiceAuthoring = {
        addUploadedFloorplan,
        createLocation,
        createTenant,
        expectedLevelOrder,
        createInspection,
        listLocations,
        saveFloorplanSVG,
        suggestLevelOrder,
        levelOrderWarning,
    };
})(window);
