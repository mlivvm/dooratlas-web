(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    function floorIdFromUrl(fileUrl) {
        const text = decodeURIComponent(String(fileUrl || ''));
        const match = text.match(/(?:fd-floorplan:\/\/(?:gallery|uploads)\/|\/api\/floors\/)(\d+)/);
        return match ? Number(match[1]) : 0;
    }
    function markerKey(door) {
        const uuid = String(door?.marker_uuid || '').trim();
        return uuid ? `door-${uuid}` : '';
    }
    function markerUuidFromKey(value) {
        const match = String(value || '').trim().match(/^door-([0-9a-f-]{36})$/i);
        return match ? match[1].toLowerCase() : '';
    }
    function doorDisplayLabel(door) {
        return String(door?.door_code || door?.name || 'Deur').trim();
    }
    function normalizeName(value) {
        return String(value || '').trim();
    }
    function normalizeLookup(value) {
        return normalizeName(value).toLowerCase();
    }
    function revisionsMatch(left, right) {
        const leftTime = Date.parse(String(left || ''));
        const rightTime = Date.parse(String(right || ''));
        return Number.isFinite(leftTime) && leftTime === rightTime;
    }
    const DUTCH_ORDINAL_LEVELS = {
        eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5,
        zesde: 6, zevende: 7, achtste: 8, negende: 9, tiende: 10,
    };
    function expectedLevelOrder(value) {
        const text = normalizeLookup(value);
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
    function hasResolvedDoorBinding(marker) {
        const runtimeKey = String(marker?.getAttribute('data-fd-marker-key') || '').trim();
        const apiDoorId = String(marker?.getAttribute('data-fd-api-door-id') || '').trim();
        return Boolean(runtimeKey && /^\d+$/.test(apiDoorId));
    }
    function updateStatusCache(floorplan) {
        const tenant = String(floorplan?.tenant_name || '').trim();
        const floorKey = String(floorplan?.floor_id || '');
        if (!tenant || !floorKey)
            return;
        const status = FD.StatusService?.readCachedDoorStatus?.() || {};
        const tenantBucket = status[tenant] && typeof status[tenant] === 'object' ? status[tenant] : {};
        const floorBucket = {};
        (floorplan.doors || []).forEach((door) => {
            if (door.status !== 'groen')
                return;
            const key = markerKey(door);
            if (!key)
                return;
            floorBucket[key] = 'done';
        });
        tenantBucket[floorKey] = floorBucket;
        status[tenant] = tenantBucket;
        FD.StatusService?.cacheDoorStatus?.(status);
    }
    function decorateSvg(svgText, floorplan, sourceRevision = '') {
        if (!svgText)
            return svgText;
        try {
            const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
            if (doc.querySelector('parsererror'))
                return svgText;
            if (sourceRevision) {
                doc.documentElement.setAttribute('data-fd-source-revision', sourceRevision);
            }
            const markers = Array.from(doc.querySelectorAll(FD.MarkerShapeService?.markerSelector || 'ellipse, circle'));
            (floorplan?.doors || []).forEach((door) => {
                const key = markerKey(door);
                if (!key)
                    return;
                const label = doorDisplayLabel(door);
                const marker = doc.getElementById(key) || markers.find(el => {
                    if (el.getAttribute('data-dooratlas-marker-uuid') === String(door.marker_uuid))
                        return true;
                    if (el.getAttribute('data-dooratlas-door-id') === String(door.id))
                        return true;
                    const pgCode = String(door.pg_code || '').trim();
                    const markerPgCode = String(el.getAttribute('data-dooratlas-pg-code') || '').trim();
                    const markerId = String(el.getAttribute('id') || '').trim();
                    if (!pgCode)
                        return false;
                    if (markerPgCode === pgCode || markerId === pgCode)
                        return true;
                    // Old SVGs linked a row through an id equal to its historical technical
                    // pg_code. This remains a lookup-only fallback, never a human code.
                    return pgCode !== `door-${String(door.marker_uuid || '')}` && (normalizeLookup(markerPgCode) === normalizeLookup(pgCode) ||
                        normalizeLookup(markerId) === normalizeLookup(pgCode));
                });
                if (!marker)
                    return;
                const technicalPgCode = `door-${String(door.marker_uuid || '')}`;
                const technicalAnchor = String(door.pg_code || '') === technicalPgCode;
                // These attributes are runtime-only and are stripped before an authoring save.
                marker.setAttribute('data-fd-marker-key', key);
                marker.setAttribute('data-fd-api-door-id', String(door.id));
                if (door.door_code)
                    marker.setAttribute('data-fd-door-code', String(door.door_code));
                if (door.name)
                    marker.setAttribute('data-fd-door-name', String(door.name));
                marker.setAttribute('data-fd-opname-status', String(door.opname_status || 'blauw'));
                marker.setAttribute('data-fd-onderhoud-status', String(door.onderhoud_status || 'blauw'));
                marker.setAttribute('data-fd-has-opname', door.has_opname ? '1' : '0');
                marker.setAttribute('data-fd-has-onderhoud', door.has_onderhoud ? '1' : '0');
                if (door.security_level)
                    marker.setAttribute('data-fd-security-level', String(door.security_level));
                else
                    marker.removeAttribute('data-fd-security-level');
                if (!technicalAnchor)
                    return;
                marker.setAttribute('id', key);
                marker.setAttribute('data-dooratlas-door-id', String(door.id));
                marker.setAttribute('data-dooratlas-marker-uuid', String(door.marker_uuid));
                marker.setAttribute('data-dooratlas-door-label', label);
                marker.setAttribute('data-dooratlas-status', String(door.status || 'blauw'));
                marker.setAttribute('data-dooratlas-pg-code', technicalPgCode);
                if (door.door_code)
                    marker.setAttribute('data-dooratlas-door-code', String(door.door_code));
                if (door.name)
                    marker.setAttribute('data-dooratlas-door-name', String(door.name));
                const description = String(door.name || '').trim() === String(door.door_code || '').trim()
                    ? ''
                    : String(door.name || '').trim();
                if (description)
                    marker.setAttribute('data-dooratlas-door-description', description);
                else
                    marker.removeAttribute('data-dooratlas-door-description');
                const inspectionAt = door.latest_inspection_at || door.latest_inspection?.performed_at || door.latest_inspection?.received_at || '';
                if (inspectionAt)
                    marker.setAttribute('data-dooratlas-latest-inspection-at', String(inspectionAt));
            });
            return new XMLSerializer().serializeToString(doc.documentElement);
        }
        catch {
            return svgText;
        }
    }
    async function decorateFloorplanSVG(fileUrl, svgText, options = {}) {
        const floorId = floorIdFromUrl(fileUrl);
        if (!floorId || !svgText)
            return svgText;
        try {
            const floorplan = await resolveFloorplan(options.config, floorId, options);
            return decorateSvg(svgText, floorplan, String(options.sourceRevision || ''));
        }
        catch (err) {
            if (err?.name === 'AbortError')
                throw err;
            return svgText;
        }
    }
    async function fetchFloorplan(config, floorId, options = {}) {
        if (!floorId)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const cacheGeneration = FD.FloorplanCacheService?.privateCacheGeneration?.();
        const floorplan = await C.requestJson(config, `/api/floors/${floorId}/map`, options);
        C.floorplanCache.set(floorId, floorplan);
        updateStatusCache(floorplan);
        void FD.FloorplanCacheService?.cacheFloorplanSummary?.(floorplan, { cacheVersion: config?.offlineCacheVersion, config, cacheGeneration, signal: options.signal });
        return floorplan;
    }
    async function resolveFloorplan(config, floorId, options = {}, refresh = false) {
        if (Number(options.floorplan?.floor_id) === floorId)
            return options.floorplan;
        try {
            const snapshot = await options.floorplanPromise;
            const floorplan = snapshot?.floorplan || snapshot;
            if (Number(floorplan?.floor_id) === floorId)
                return floorplan;
        }
        catch (err) {
            if (err?.name === 'AbortError')
                throw err;
        }
        if (options.skipSharedSnapshotRetry) {
            const cached = C.floorplanCache.get(floorId);
            if (cached)
                return cached;
            const persisted = await FD.FloorplanCacheService?.readCachedFloorplanSummary?.(floorId, options.sourceRevision, { cacheVersion: config?.offlineCacheVersion, config });
            if (persisted) {
                C.floorplanCache.set(floorId, persisted);
                updateStatusCache(persisted);
                return persisted;
            }
            throw C.workerError(503, 'Plattegrondgegevens zijn offline niet beschikbaar.');
        }
        if (!refresh) {
            const cached = C.floorplanCache.get(floorId);
            if (cached)
                return cached;
        }
        return fetchFloorplan(config, floorId, options);
    }
    function floorplanSummaryFromRow(floor) {
        const uploaded = Boolean(floor.uploaded_by_app || floor.uploadedByApp);
        const doorCount = Number(floor.door_count ?? floor.doorCount ?? 0);
        return {
            name: String(floor.id),
            displayName: `${floor.location_name} - ${floor.name}`,
            file: String(floor.id),
            repo: uploaded ? 'uploads' : 'gallery',
            tenantId: Number(floor.tenant_id),
            locationId: Number(floor.location_id),
            floorId: Number(floor.id),
            building: floor.location_name,
            floorLabel: floor.name,
            levelOrder: Number(floor.level_order),
            floorNotes: String(floor.notes || ''),
            doorCount,
            doorsTotal: doorCount,
            revision: String(floor.revision || floor.updated_at || ''),
            locationRevision: String(floor.location_revision || floor.locationRevision || ''),
            locationStreet: String(floor.location_street || ''),
            locationPostalCode: String(floor.location_postal_code || ''),
            locationCity: String(floor.location_city || ''),
            locationNotes: String(floor.location_notes || ''),
            locationAddress: String(floor.location_street || ''),
            locationNote: String(floor.location_notes || ''),
            uploaded,
            uploadedByApp: uploaded,
        };
    }
    async function loadFloorplanSummaries(config, tenantId, options = {}) {
        const normalizedTenantId = Number(tenantId);
        if (!Number.isInteger(normalizedTenantId) || normalizedTenantId < 1) {
            throw C.workerError(400, 'Klant ontbreekt.');
        }
        const floors = await C.requestJson(config, `/api/floors?tenant_id=${normalizedTenantId}`, options);
        return Array.isArray(floors) ? floors.map(floorplanSummaryFromRow) : [];
    }
    async function loadStatus() {
        return FD.StatusService?.readCachedDoorStatus?.() || {};
    }
    async function loadFloorplanSnapshot(config, fileUrl, options = {}) {
        const floorId = floorIdFromUrl(fileUrl);
        if (!floorId)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const floorplan = await fetchFloorplan(config, floorId, options);
        return {
            floorplan,
            status: FD.StatusService?.readCachedDoorStatus?.() || {},
        };
    }
    async function saveStatus(_config, statusData) {
        FD.StatusService?.cacheDoorStatus?.(statusData || {});
        return { status: statusData || {}, readOnly: true };
    }
    function getWorkerFloorplanUrl(config, fileUrl) {
        const floorId = floorIdFromUrl(fileUrl);
        return floorId ? C.apiUrl(config, `/api/floors/${floorId}/svg`) : null;
    }
    async function loadFloorplanSvgResponse(fileUrl, options = {}, refreshFloorplan = false) {
        const floorId = floorIdFromUrl(fileUrl);
        const svgUrl = getWorkerFloorplanUrl(options.config, fileUrl);
        if (!svgUrl)
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        const [initialFloorplan, initialResponse] = await Promise.all([
            resolveFloorplan(options.config, floorId, options, refreshFloorplan),
            C.requestTextResponse(options.config, svgUrl, options),
        ]);
        let floorplan = initialFloorplan;
        let response = initialResponse;
        let revision = String(response.headers?.get?.('X-DoorAtlas-Revision') || '');
        for (let attempt = 0; attempt < 1 && !revisionsMatch(revision, floorplan?.revision); attempt += 1) {
            floorplan = await fetchFloorplan(options.config, floorId, options);
            response = await C.requestTextResponse(options.config, svgUrl, options);
            revision = String(response.headers?.get?.('X-DoorAtlas-Revision') || '');
        }
        if (!floorplan.svg_url || !revisionsMatch(revision, floorplan.revision)) {
            throw C.workerError(409, 'Plattegrond is gewijzigd. Ververs en probeer opnieuw.');
        }
        return {
            floorplan,
            revision,
            status: FD.StatusService?.readCachedDoorStatus?.() || {},
            rawSvgText: response.text,
            svgText: decorateSvg(response.text, floorplan, revision),
        };
    }
    async function loadFloorplanSVG(fileUrl, options = {}) {
        return (await loadFloorplanSvgResponse(fileUrl, options)).svgText;
    }
    async function revalidateFloorplanSVG(fileUrl, cachedRevision, options) {
        const floorId = floorIdFromUrl(fileUrl);
        const floorplan = await resolveFloorplan(options.config, floorId, options, !options.floorplanPromise);
        if (revisionsMatch(cachedRevision, floorplan?.revision)) {
            return { changed: false, svgText: '', revision: cachedRevision, floorplan };
        }
        const result = await loadFloorplanSvgResponse(fileUrl, { ...options, floorplan }, false);
        if (!revisionsMatch(result.revision, result.floorplan?.revision)) {
            const refreshedFloorplan = await fetchFloorplan(options.config, floorId, options);
            if (!revisionsMatch(result.revision, refreshedFloorplan?.revision)) {
                return { changed: false, svgText: '', revision: result.revision };
            }
            result.floorplan = refreshedFloorplan;
            result.status = FD.StatusService?.readCachedDoorStatus?.() || {};
            result.svgText = decorateSvg(result.rawSvgText, refreshedFloorplan, result.revision);
        }
        return { ...result, changed: !revisionsMatch(cachedRevision, result.revision) };
    }
    async function warmFloorplanSVG(fileUrl, options) {
        return { text: await loadFloorplanSVG(fileUrl, options), sha: '' };
    }
    async function fetchFloorplanTreeMap() {
        return null;
    }
    FD.DataServiceFloorplan = {
        decorateFloorplanSVG,
        decorateSvg,
        doorDisplayLabel,
        expectedLevelOrder,
        fetchFloorplan,
        fetchFloorplanTreeMap,
        floorIdFromUrl,
        floorplanSummaryFromRow,
        getWorkerFloorplanUrl,
        hasResolvedDoorBinding,
        loadFloorplanSnapshot,
        loadFloorplanSummaries,
        loadFloorplanSVG,
        loadStatus,
        levelOrderWarning,
        markerKey,
        markerUuidFromKey,
        normalizeLookup,
        normalizeName,
        revisionsMatch,
        revalidateFloorplanSVG,
        resolveFloorplan,
        saveStatus,
        suggestLevelOrder,
        updateStatusCache,
        warmFloorplanSVG,
    };
})(window);
