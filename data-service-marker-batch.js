(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    const A = FD.DataServiceAuthoring;
    const B = FD.DataServiceMarkerFieldBases;
    const DOOR_METADATA_EDITED_ATTR = 'data-dooratlas-door-metadata-edited';
    const MARKER_BATCH_TIMEOUT_MS = 25000;
    function createMarkerSaveId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
            const random = Math.floor(Math.random() * 16);
            const value = character === 'x' ? random : ((random & 0x3) | 0x8);
            return value.toString(16);
        });
    }
    function markerBatchUnknownError(cause, timedOut) {
        const error = C.workerError(0, 'marker_save_unknown', {
            code: 'marker_save_unknown',
            message: 'De opslagstatus is onbekend. Probeer dezelfde save opnieuw zodra de verbinding terug is.',
            timed_out: timedOut,
        });
        error.cause = cause;
        return error;
    }
    async function saveFloorMarkerBatchRequest(config, floorId, prepared, options = {}) {
        const clientMutationId = String(options.clientMutationId || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMutationId)) {
            throw C.workerError(400, 'Ongeldige opslaanactie. Probeer opnieuw.');
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            throw C.workerError(0, 'marker_save_offline');
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        let timedOut = false;
        const timeoutId = controller
            ? setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, MARKER_BATCH_TIMEOUT_MS)
            : null;
        try {
            const includeSecurityLevel = options.includeSecurityLevel !== false;
            return await C.requestJson(config, `/api/floors/${floorId}/marker-batch-save`, {
                ...options,
                method: 'POST', csrf: true, signal: controller?.signal,
                body: {
                    client_mutation_id: clientMutationId,
                    expected_revision: String(options.expectedRevision || ''),
                    marker_updates: prepared.markerUpdates.map((update) => ({
                        door_id: update.doorId, ...update.geometry,
                    })),
                    door_updates: prepared.doorUpdates.map((update) => ({
                        door_id: update.doorId,
                        door_code: update.doorCode,
                        name: update.name,
                        ...(includeSecurityLevel ? { security_level: update.securityLevel } : {}),
                    })),
                    new_markers: prepared.newMarkers.map((marker) => ({
                        draft_key: marker.draftKey,
                        door_code: marker.doorCode,
                        name: marker.name,
                        ...(includeSecurityLevel ? { security_level: marker.securityLevel } : {}),
                        ...marker.geometry,
                    })),
                    deleted_door_ids: prepared.deletedDoorIds,
                    base_marker_revisions: options.baseMarkerRevisions || [],
                    base_marker_states: options.baseMarkerStates || [],
                },
            });
        }
        catch (err) {
            const errorStatus = Number(err?.status || 0);
            if (err?.code === 'session_changed' || (errorStatus > 0 && errorStatus < 500))
                throw err;
            throw markerBatchUnknownError(err, timedOut);
        }
        finally {
            if (timeoutId !== null)
                clearTimeout(timeoutId);
        }
    }
    function markerGeometry(marker) {
        const geometry = FD.MarkerShapeService?.geometry(marker);
        if (!geometry) {
            throw C.workerError(400, 'Deze marker heeft geen geldige positie of grootte. Ververs en probeer opnieuw.');
        }
        return geometry;
    }
    function changedMarkerKeys(editChanges, types) {
        const keys = new Set();
        Array.from(editChanges || []).forEach(change => {
            if (!types.has(String(change?.type || '')))
                return;
            const doorId = String(change?.doorId || '').trim();
            if (doorId)
                keys.add(doorId);
        });
        return keys;
    }
    function prepareMarkerBatchSave(floorplan, svgEl, securityLevels = {}, editChanges = []) {
        if (!svgEl)
            throw C.workerError(400, 'Geen SVG gevonden.');
        const doors = Array.isArray(floorplan?.doors) ? floorplan.doors.slice() : [];
        const markers = Array.from(svgEl.querySelectorAll(FD.MarkerShapeService?.markerSelector || 'ellipse, circle'));
        const seenDoorIds = new Set();
        const markerUpdates = [];
        const doorUpdates = [];
        const newMarkers = [];
        const deletedDoorIds = [];
        const geometryKeys = changedMarkerKeys(editChanges, new Set(['move', 'resize', 'replace']));
        const deleteKeys = changedMarkerKeys(editChanges, new Set(['delete']));
        A.assertNoCurrentFloorDuplicateCodes(markers, doors);
        for (const marker of markers) {
            const existing = A.doorByMarker(marker, doors);
            if (existing) {
                const existingDoorId = Number(existing.id);
                seenDoorIds.add(existingDoorId);
                const markerKey = String(marker.getAttribute('data-door-id') || F.markerKey(existing)).trim();
                if (geometryKeys.has(markerKey) || geometryKeys.has(F.markerKey(existing))) {
                    markerUpdates.push({ doorId: existingDoorId, geometry: markerGeometry(marker) });
                }
                const metadataEdited = A.markerMetadataWasEdited(marker);
                const manualCode = A.markerManualCode(marker);
                const manualDescription = A.markerDescription(marker);
                if (metadataEdited && !manualCode) {
                    throw C.workerError(400, 'Vul een deurcode in voor iedere gewijzigde marker.');
                }
                const desiredCode = metadataEdited ? manualCode : F.normalizeName(existing.door_code);
                const desiredDescription = metadataEdited ? manualDescription : A.doorDescription(existing);
                const markerKeyForSecurity = F.markerKey(existing);
                const hasSecurityLevel = Object.prototype.hasOwnProperty.call(securityLevels, markerKeyForSecurity);
                const desiredSecurityLevel = hasSecurityLevel
                    ? (F.normalizeName(securityLevels[markerKeyForSecurity]).toLowerCase() || null)
                    : (F.normalizeName(existing.security_level).toLowerCase() || null);
                const existingSecurityLevel = F.normalizeName(existing.security_level).toLowerCase() || null;
                const changed = metadataEdited && Boolean(desiredCode) && (desiredCode !== F.normalizeName(existing.door_code) ||
                    desiredDescription !== A.doorDescription(existing) ||
                    desiredSecurityLevel !== existingSecurityLevel);
                if (changed) {
                    doorUpdates.push({
                        doorId: existingDoorId,
                        doorCode: desiredCode,
                        name: desiredDescription || null,
                        securityLevel: desiredSecurityLevel,
                    });
                }
                continue;
            }
            const draftKey = F.normalizeName(marker.getAttribute('data-dooratlas-draft-key'));
            if (!draftKey)
                continue;
            const manualCode = A.markerManualCode(marker);
            if (!manualCode) {
                throw C.workerError(400, 'Vul een deurcode in voor iedere nieuwe marker.');
            }
            const securityLevel = F.normalizeName(securityLevels[draftKey]).toLowerCase() || null;
            newMarkers.push({
                draftKey,
                doorCode: manualCode,
                name: A.markerDescription(marker) || null,
                securityLevel,
                geometry: markerGeometry(marker),
            });
        }
        for (const door of doors) {
            const doorId = Number(door.id);
            if (!doorId || seenDoorIds.has(doorId))
                continue;
            const markerKey = F.markerKey(door);
            const deletedByUser = deleteKeys.has(markerKey) || deleteKeys.has(String(doorId));
            if (A.hasTechnicalAnchor(door) && deletedByUser) {
                deletedDoorIds.push(doorId);
                continue;
            }
            if (!A.hasTechnicalAnchor(door)) {
                throw C.workerError(409, 'Deze historische deurkoppeling kan niet via de snelle marker-save worden verwijderd. Ververs en probeer opnieuw.');
            }
            throw C.workerError(409, 'Een technische marker ontbreekt op de kaart. Ververs voordat je opnieuw opslaat.');
        }
        return { markerUpdates, doorUpdates, newMarkers, deletedDoorIds };
    }
    function applyCreatedDoorMetadataToRoot(svgEl, createdDoors) {
        if (!createdDoors.length)
            return;
        const markers = Array.from(svgEl.querySelectorAll(FD.MarkerShapeService?.markerSelector || 'ellipse, circle'));
        createdDoors.forEach(door => {
            const draftKey = F.normalizeName(door?.draft_key);
            const marker = markers.find(item => item.getAttribute('data-dooratlas-draft-key') === draftKey);
            if (!draftKey || !marker)
                throw C.workerError(409, 'De nieuwe marker kon niet worden gekoppeld. Ververs de plattegrond.');
            A.applyDoorMetadataToMarker(marker, door);
            marker.removeAttribute('data-dooratlas-draft-key');
            marker.removeAttribute(DOOR_METADATA_EDITED_ATTR);
            const securityLevel = F.normalizeName(door?.security_level).toLowerCase();
            if (['hoog', 'normaal', 'laag'].includes(securityLevel)) {
                marker.setAttribute('data-fd-security-level', securityLevel);
            }
            else {
                marker.removeAttribute('data-fd-security-level');
            }
            const markerKey = F.markerKey(door);
            if (markerKey && FD.MarkerService?.prepareInteractiveMarker) {
                FD.MarkerService.prepareInteractiveMarker(marker, markerKey);
            }
            if (markerKey)
                marker.setAttribute('data-fd-marker-key', markerKey);
            marker.setAttribute('data-fd-api-door-id', String(door.id));
            if (door.door_code)
                marker.setAttribute('data-fd-door-code', String(door.door_code));
            if (door.name)
                marker.setAttribute('data-fd-door-name', String(door.name));
        });
    }
    function clearSavedMarkerMetadata(svgEl) {
        svgEl.querySelectorAll(`[${DOOR_METADATA_EDITED_ATTR}]`).forEach(marker => {
            marker.removeAttribute(DOOR_METADATA_EDITED_ATTR);
        });
    }
    async function saveFloorplanMarkers(fileUrl, svgEl, options = {}) {
        const floorId = F.floorIdFromUrl(fileUrl);
        if (!floorId)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const config = options.config;
        const floorplan = C.floorplanCache.get(floorId) || await F.fetchFloorplan(config, floorId, options);
        try {
            const user = C.getWorkerSessionUser(config);
            const membership = (user?.memberships || []).find((item) => Number(item?.tenant_id || item?.tenantId) === Number(floorplan?.tenant_id));
            const includeSecurityLevel = Boolean(user?.isSuperadmin) || membership?.role !== 'da_monteur';
            const prepared = prepareMarkerBatchSave(floorplan, svgEl, options.securityLevels, options.editChanges);
            const hasMutations = prepared.markerUpdates.length || prepared.doorUpdates.length ||
                prepared.newMarkers.length || prepared.deletedDoorIds.length;
            if (!hasMutations) {
                if (svgEl)
                    clearSavedMarkerMetadata(svgEl);
                return {
                    noChanges: true,
                    revision: floorplan?.revision,
                    createdDoorIds: [],
                    updatedDoorIds: [],
                    deletedDoorIds: [],
                };
            }
            if (!svgEl)
                throw C.workerError(400, 'Geen SVG gevonden.');
            const expectedRevision = String(svgEl.getAttribute('data-fd-source-revision') || '');
            if (!expectedRevision || !F.revisionsMatch(expectedRevision, floorplan?.revision)) {
                throw C.workerError(409, 'De zichtbare plattegrond is verouderd. Ververs en probeer opnieuw.');
            }
            const clientMutationId = String(options.clientMutationId || createMarkerSaveId());
            const result = await saveFloorMarkerBatchRequest(config, floorId, prepared, {
                ...options,
                expectedRevision,
                clientMutationId,
                includeSecurityLevel,
                baseMarkerRevisions: B.baseMarkerRevisions(floorplan, prepared),
                baseMarkerStates: B.baseMarkerStates(floorplan, prepared, svgEl, options.editChanges),
            });
            applyCreatedDoorMetadataToRoot(svgEl, Array.isArray(result?.created_doors) ? result.created_doors : []);
            svgEl.setAttribute('data-fd-source-revision', String(result?.revision || expectedRevision));
            clearSavedMarkerMetadata(svgEl);
            C.floorplanCache.delete(floorId);
            return {
                ...result,
                clientMutationId,
                createdDoorIds: (result?.created_doors || []).map((door) => Number(door.id)),
                updatedDoorIds: prepared.doorUpdates.map((update) => update.doorId),
                deletedDoorIds: prepared.deletedDoorIds,
            };
        }
        catch (err) {
            if (err?.code !== 'marker_save_unknown' && err?.code !== 'marker_save_offline') {
                C.floorplanCache.delete(floorId);
            }
            throw err;
        }
    }
    FD.DataServiceMarkerBatch = { createMarkerSaveId, saveFloorplanMarkers };
})(window);
