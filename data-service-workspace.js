(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    function customersFromCatalog(rows) {
        return rows.map(tenant => {
            const locations = new Map();
            const floorplans = (Array.isArray(tenant.floors) ? tenant.floors : []).map(floor => {
                if (!locations.has(floor.location_id)) {
                    locations.set(floor.location_id, {
                        id: floor.location_id, name: floor.location_name,
                        street: String(floor.location_street || ''), postalCode: String(floor.location_postal_code || ''),
                        city: String(floor.location_city || ''), notes: String(floor.location_notes || ''),
                        address: String(floor.location_street || ''), note: String(floor.location_notes || ''),
                        revision: String(floor.location_revision || floor.locationRevision || ''),
                    });
                }
                return F.floorplanSummaryFromRow({ ...floor, tenant_id: floor.tenant_id || tenant.id });
            });
            return {
                customer: tenant.tenant_name, tenantId: tenant.id, tenantCode: tenant.tenant_code,
                shortName: tenant.short_name || '', notes: tenant.notes || '', role: tenant.role,
                locations: Array.from(locations.values()), floorplans,
            };
        });
    }
    async function loadCustomers(config) {
        try {
            const catalog = await C.requestJson(config, '/api/workspace/catalog');
            return customersFromCatalog(Array.isArray(catalog) ? catalog : []);
        }
        catch (err) {
            if (Number(err?.status) !== 404)
                throw err;
            const tenants = await C.requestJson(config, '/api/tenants');
            return Promise.all((Array.isArray(tenants) ? tenants : []).map(async (tenant) => {
                const floors = await C.requestJson(config, `/api/floors?tenant_id=${tenant.id}`);
                return customersFromCatalog([{ ...tenant, floors }])[0];
            }));
        }
    }
    async function searchWorkspaceDoors(config, query, options = {}) {
        const value = String(query || '').trim();
        if (value.length < 2)
            return [];
        const path = `/api/workspace/doors/search?q=${encodeURIComponent(value)}`;
        const rows = await C.requestJson(config, path, options);
        return Array.isArray(rows) ? rows : [];
    }
    async function loadRecentFloors(config) {
        const rows = await C.requestJson(config, '/api/workspace/recent-floors?limit=6');
        return Array.isArray(rows) ? rows : [];
    }
    async function recordRecentFloor(config, floorId) {
        const id = Number(floorId || 0);
        if (!Number.isInteger(id) || id < 1)
            return null;
        return C.requestJson(config, `/api/workspace/recent-floors/${id}`, { method: 'POST', csrf: true });
    }
    FD.DataServiceWorkspace = {
        customersFromCatalog, loadCustomers, loadRecentFloors, recordRecentFloor, searchWorkspaceDoors,
    };
})(window);
