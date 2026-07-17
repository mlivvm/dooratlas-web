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
    function decorateSvg(svgText, floorplan) {
        if (!svgText || !floorplan?.doors?.length)
            return svgText;
        try {
            const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
            if (doc.querySelector('parsererror'))
                return svgText;
            const markers = Array.from(doc.querySelectorAll('ellipse, circle'));
            floorplan.doors.forEach((door) => {
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
                const inspectionAt = door.latest_inspection?.performed_at || door.latest_inspection?.received_at || '';
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
            const floorplan = C.floorplanCache.get(floorId) || await fetchFloorplan(options.config, floorId, options);
            return decorateSvg(svgText, floorplan);
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
        const floorplan = await C.requestJson(config, `/api/floors/${floorId}/floorplan`, options);
        C.floorplanCache.set(floorId, floorplan);
        updateStatusCache(floorplan);
        return floorplan;
    }
    async function loadCustomers(config) {
        const tenants = await C.requestJson(config, '/api/tenants');
        return Promise.all(tenants.map(async (tenant) => {
            const floors = await C.requestJson(config, `/api/floors?tenant_id=${tenant.id}`);
            const locations = new Map();
            const floorplans = floors.map((floor) => {
                const uploaded = Boolean(floor.uploaded_by_app || floor.uploadedByApp);
                if (!locations.has(floor.location_id)) {
                    locations.set(floor.location_id, {
                        id: floor.location_id,
                        name: floor.location_name,
                        street: String(floor.location_street || ''),
                        postalCode: String(floor.location_postal_code || ''),
                        city: String(floor.location_city || ''),
                        notes: String(floor.location_notes || ''),
                        address: String(floor.location_street || ''),
                        note: String(floor.location_notes || ''),
                    });
                }
                return {
                    name: String(floor.id),
                    displayName: `${floor.location_name} - ${floor.name}`,
                    file: String(floor.id),
                    repo: uploaded ? 'uploads' : 'gallery',
                    tenantId: tenant.id,
                    locationId: floor.location_id,
                    floorId: floor.id,
                    building: floor.location_name,
                    floorLabel: floor.name,
                    levelOrder: Number(floor.level_order),
                    floorNotes: String(floor.notes || ''),
                    doorCount: floor.door_count,
                    locationStreet: String(floor.location_street || ''),
                    locationPostalCode: String(floor.location_postal_code || ''),
                    locationCity: String(floor.location_city || ''),
                    locationNotes: String(floor.location_notes || ''),
                    locationAddress: String(floor.location_street || ''),
                    locationNote: String(floor.location_notes || ''),
                    uploaded,
                    uploadedByApp: uploaded,
                };
            });
            return { customer: tenant.tenant_name, tenantId: tenant.id, tenantCode: tenant.tenant_code, shortName: tenant.short_name || '', notes: tenant.notes || '', role: tenant.role, locations: Array.from(locations.values()), floorplans };
        }));
    }
    async function loadStatus() {
        return FD.StatusService?.readCachedDoorStatus?.() || {};
    }
    async function loadFloorplanStatus(config, fileUrl, options = {}) {
        const floorId = floorIdFromUrl(fileUrl);
        if (floorId)
            await fetchFloorplan(config, floorId, options);
        return FD.StatusService?.readCachedDoorStatus?.() || {};
    }
    async function saveStatus(_config, statusData) {
        FD.StatusService?.cacheDoorStatus?.(statusData || {});
        return { status: statusData || {}, readOnly: true };
    }
    function getWorkerFloorplanUrl(config, fileUrl) {
        const floorId = floorIdFromUrl(fileUrl);
        return floorId ? C.apiUrl(config, `/api/floors/${floorId}/svg`) : null;
    }
    async function loadFloorplanSVG(fileUrl, options = {}) {
        const floorId = floorIdFromUrl(fileUrl);
        const floorplan = C.floorplanCache.get(floorId) || await fetchFloorplan(options.config, floorId, options);
        if (!floorplan.svg_url)
            throw C.workerError(404, 'SVG niet gevonden.');
        const svgText = await C.requestText(options.config, floorplan.svg_url, options);
        return decorateSvg(svgText, floorplan);
    }
    async function revalidateFloorplanSVG(fileUrl, _cachedSha, options) {
        return loadFloorplanSVG(fileUrl, options);
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
        fetchFloorplan,
        fetchFloorplanTreeMap,
        floorIdFromUrl,
        getWorkerFloorplanUrl,
        hasResolvedDoorBinding,
        loadCustomers,
        loadFloorplanStatus,
        loadFloorplanSVG,
        loadStatus,
        markerKey,
        markerUuidFromKey,
        normalizeLookup,
        normalizeName,
        revalidateFloorplanSVG,
        saveStatus,
        warmFloorplanSVG,
    };
})(window);
