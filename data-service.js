(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const F = FD.DataServiceFloorplan;
    const S = FD.DataServiceFloorplanStatus;
    const W = FD.DataServiceWorkspace;
    const A = FD.DataServiceAuthoring;
    const B = FD.DataServiceMarkerBatch;
    const R = FD.DataServiceRequests;
    function floorIdFromPayload(payload) {
        const source = payload?.floorId || payload?.floorplan?.floorId || payload?.floorplan?.id ||
            payload?.fileName || payload?.floorplanName || payload?.floorplan?.file || payload?.floorplan?.name;
        const floorId = Number(source || 0);
        if (!Number.isFinite(floorId) || floorId <= 0) {
            throw C.workerError(400, 'Plattegrond ontbreekt.');
        }
        return floorId;
    }
    function metadataBody(payload) {
        const expectedFloorRevision = String(payload?.expectedFloorRevision || payload?.floorplan?.revision || '').trim();
        const expectedLocationRevision = String(payload?.expectedLocationRevision || payload?.floorplan?.locationRevision || '').trim();
        if (!expectedFloorRevision || !expectedLocationRevision) {
            throw C.workerError(409, 'Plattegrondgegevens zijn verouderd. Vernieuw de app en probeer opnieuw.');
        }
        const body = {
            buildingName: F.normalizeName(payload?.buildingName || payload?.floorplan?.building),
            floorName: F.normalizeName(payload?.floorName || payload?.floorLabel || payload?.floorplan?.floorLabel || payload?.floorplan?.name),
            expectedFloorRevision,
            expectedLocationRevision,
        };
        if ('locationStreet' in payload || 'locationAddress' in payload) {
            body.locationStreet = F.normalizeName(payload?.locationStreet ?? payload?.locationAddress ?? '');
        }
        if ('locationPostalCode' in payload)
            body.locationPostalCode = F.normalizeName(payload.locationPostalCode || '').toUpperCase();
        if ('locationCity' in payload)
            body.locationCity = F.normalizeName(payload.locationCity || '');
        if ('locationNotes' in payload || 'locationNote' in payload) {
            body.locationNotes = F.normalizeName(payload?.locationNotes ?? payload?.locationNote ?? '');
        }
        const levelOrder = payload?.levelOrder ?? payload?.floorplan?.levelOrder;
        if (levelOrder !== undefined && levelOrder !== null && levelOrder !== '')
            body.levelOrder = Number(levelOrder);
        if ('floorNotes' in payload)
            body.floorNotes = F.normalizeName(payload.floorNotes || '');
        return body;
    }
    function floorplanRecord(row, payload = {}) {
        const floorId = Number(row?.id || row?.floorId || 0);
        const uploaded = Boolean(row?.uploaded_by_app || row?.uploadedByApp || payload?.floorplan?.uploaded || payload?.floorplan?.repo === 'uploads');
        const building = String(row?.location_name || row?.building || '').trim();
        const floorLabel = String(row?.name || row?.floorLabel || '').trim();
        return {
            customer: payload?.nextCustomerName || payload?.customerName || '',
            name: String(floorId || ''),
            floorplan: String(floorId || ''),
            displayName: building ? `${building} - ${floorLabel}` : floorLabel,
            floorId,
            file: String(floorId || ''),
            repo: uploaded ? 'uploads' : 'gallery',
            uploaded,
            uploadedByApp: uploaded,
            building,
            floorLabel,
            levelOrder: Number(row?.level_order ?? row?.levelOrder ?? payload?.floorplan?.levelOrder),
            floorNotes: String(row?.notes || row?.floorNotes || ''),
            locationStreet: String(row?.location_street || row?.locationStreet || ''),
            locationPostalCode: String(row?.location_postal_code || row?.locationPostalCode || ''),
            locationCity: String(row?.location_city || row?.locationCity || ''),
            locationNotes: String(row?.location_notes || row?.locationNotes || ''),
            locationAddress: String(row?.location_street || row?.locationStreet || ''),
            locationNote: String(row?.location_notes || row?.locationNotes || ''),
            doorCount: Number(row?.door_count || 0),
            doorsTotal: Number(row?.door_count || 0),
            revision: String(row?.revision || row?.updated_at || ''),
            locationRevision: String(row?.location_revision || row?.locationRevision || ''),
        };
    }
    async function reloadCustomers(config) {
        C.floorplanCache.clear();
        return W.loadCustomers(config);
    }
    async function updateFloorplanRecord(config, payload, options = {}) {
        const floorId = floorIdFromPayload(payload);
        let row;
        try {
            row = await C.requestJson(config, `/api/floors/${floorId}/metadata`, {
                ...options,
                method: 'PATCH',
                csrf: true,
                body: metadataBody(payload),
            });
        }
        catch (err) {
            if (err?.status === 409 && /intussen gewijzigd/i.test(String(err?.message || ''))) {
                try {
                    err.customers = await reloadCustomers(config);
                }
                catch { }
            }
            throw err;
        }
        const customers = await reloadCustomers(config);
        return { customers, record: floorplanRecord(row, payload), floorplan: floorplanRecord(row, payload) };
    }
    async function updateUploadedFloorplanMetadata(config, payload, options = {}) {
        return updateFloorplanRecord(config, {
            ...payload,
            floorId: floorIdFromPayload(payload),
            floorplan: payload?.floorplan,
            customerName: payload?.customerName,
        }, options);
    }
    async function deleteUploadedFloorplan(config, payload, options = {}) {
        const floorId = floorIdFromPayload(payload);
        await C.requestJson(config, `/api/floors/${floorId}`, { ...options, method: 'DELETE', csrf: true });
        const customers = await reloadCustomers(config);
        return { customers, floorId };
    }
    async function fetchDoorcodeExport(config, payload, options = {}) {
        const source = Array.isArray(payload?.floor_ids) ? payload.floor_ids : payload?.floorIds;
        const floorIds = (Array.isArray(source) ? source : [])
            .map((value) => Number(value || 0))
            .filter((value) => Number.isFinite(value) && value > 0);
        if (!floorIds.length)
            throw C.workerError(400, 'Selecteer minimaal een plattegrond.');
        return C.requestJson(config, '/api/exports/doorcodes', {
            ...options,
            method: 'POST',
            body: { floor_ids: Array.from(new Set(floorIds)) },
        });
    }
    async function loadDoorInspections(config, doorId, options = {}) {
        const id = Number(doorId || 0);
        if (!id)
            throw C.workerError(400, 'Kies eerst een deur.');
        return C.requestJson(config, `/api/doors/${id}/inspections`, options);
    }
    function inspectionPhotoUrl(config, photoId) {
        const id = Number(photoId || 0);
        return id ? C.apiUrl(config, `/api/inspection-photos/${id}`) : '';
    }
    function fetchAdminUsage(config, options = {}) {
        const params = new URLSearchParams();
        const limit = Number(options.limit || 40);
        if (Number.isFinite(limit) && limit > 0)
            params.set('limit', String(Math.min(100, Math.floor(limit))));
        if (options.before && options.beforeId) {
            params.set('before', String(options.before));
            params.set('beforeId', String(options.beforeId));
        }
        const query = params.toString();
        return C.requestJson(config, `/api/admin/usage${query ? `?${query}` : ''}`, options);
    }
    function fetchAdminUsageAccounts(config, options = {}) {
        return C.requestJson(config, '/api/admin/usage/accounts', options);
    }
    function listMobileDevices(config, options = {}) {
        return C.requestJson(config, '/api/session/mobile-devices', options);
    }
    function revokeMobileDevice(config, familyId, options = {}) {
        const id = String(familyId || '').trim().toLowerCase();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
            throw C.workerError(400, 'Kies een geldige tabletsessie.');
        }
        return C.requestJson(config, `/api/session/mobile-devices/${id}/revoke`, {
            ...options,
            method: 'POST',
            csrf: true,
        });
    }
    function fetchAdminUsageAccount(config, userId, options = {}) {
        const accountId = Number(userId || 0);
        if (!Number.isInteger(accountId) || accountId < 1) {
            throw C.workerError(400, 'Kies een geldig account.');
        }
        const days = Number(options.periodDays ?? 30);
        const periodDays = Number.isFinite(days) ? Math.max(0, Math.min(365, Math.floor(days))) : 30;
        const params = new URLSearchParams({ periodDays: String(periodDays) });
        return C.requestJson(config, `/api/admin/usage/accounts/${accountId}?${params}`, options);
    }
    function fetchAdminConflicts(config, options = {}) {
        return C.requestJson(config, '/api/admin/conflicts', options);
    }
    function resolveAdminConflict(config, conflictId, action, options = {}) {
        const id = Number(conflictId || 0);
        if (!Number.isInteger(id) || id < 1)
            throw C.workerError(400, 'Kies een geldig conflict.');
        return C.requestJson(config, `/api/admin/conflicts/${id}/resolve`, {
            ...options,
            method: 'POST',
            csrf: true,
            body: { action },
        });
    }
    FD.DataService = {
        canManageUploads: C.canAuthor,
        canStartAuthoring: C.canStartAuthoring,
        canCreateInspection: C.canCreateInspection,
        canEditMarkers: C.canEditMarkers,
        canWriteFloorplan: C.canEditMarkers,
        clearWorkerSession: C.clearWorkerSession,
        createJotFormContext: async () => null,
        findJotFormSubmission: async () => ({ ok: false, found: false }),
        findJotFormSubmissions: async () => ({ ok: false, submissions: {} }),
        fetchAdminOverview: (config, options = {}) => C.requestJson(config, '/api/admin/overview', options),
        fetchAdminDoorIndex: (config, options = {}) => C.requestJson(config, '/api/admin/doors', options),
        fetchAdminActivity: (config, options = {}) => C.requestJson(config, '/api/admin/activity', options),
        fetchActiveUsers: (config, options = {}) => C.requestJson(config, '/api/admin/active-users', options),
        fetchAdminUsage,
        fetchAdminUsageAccounts,
        fetchAdminUsageAccount,
        fetchAdminConflicts,
        resolveAdminConflict,
        listMobileDevices,
        revokeMobileDevice,
        fetchDoorcodeExport,
        inspectionPhotoUrl,
        fetchDoorCodeIndex: async () => ({ entries: [], count: 0 }),
        isAdminOverviewEnabled: () => true,
        isFloorplanMetadataWriteEnabled: () => true,
        getWorkerSessionInfo: C.getWorkerSessionInfo,
        updateFloorplanRecord,
        supportsJotFormSubmissionBatch: async () => false,
        getWorkerSessionUser: C.getWorkerSessionUser,
        isViewerReadOnlyFloorplan: () => false,
        loadCustomers: W.loadCustomers,
        loadRecentFloors: W.loadRecentFloors,
        recordRecentFloor: W.recordRecentFloor,
        searchWorkspaceDoors: W.searchWorkspaceDoors,
        loadStatus: F.loadStatus,
        loadFloorplanSnapshot: F.loadFloorplanSnapshot,
        loadFloorplanStatus: S.loadFloorplanStatus,
        loadFloorplanSummaries: F.loadFloorplanSummaries,
        loadDoorInspections,
        saveStatus: F.saveStatus,
        saveMapModePreference: R.saveMapModePreference,
        decorateFloorplanSVG: F.decorateFloorplanSVG,
        loadFloorplanSVG: F.loadFloorplanSVG,
        revalidateFloorplanSVG: F.revalidateFloorplanSVG,
        warmFloorplanSVG: F.warmFloorplanSVG,
        createMarkerSaveId: B.createMarkerSaveId,
        saveFloorplanSVG: A.saveFloorplanSVG,
        saveFloorplanMarkers: B.saveFloorplanMarkers,
        createInspection: A.createInspection,
        addUploadedFloorplan: A.addUploadedFloorplan,
        createLocation: A.createLocation,
        createTenant: A.createTenant,
        expectedLevelOrder: A.expectedLevelOrder,
        listLocations: A.listLocations,
        suggestLevelOrder: A.suggestLevelOrder,
        levelOrderWarning: A.levelOrderWarning,
        deleteUploadedFloorplan,
        updateUploadedFloorplanMetadata,
        fetchFloorplanTreeMap: F.fetchFloorplanTreeMap,
        getWorkerFloorplanUrl: F.getWorkerFloorplanUrl,
        isWorkerReadProxyEnabled: () => true,
        isWorkerFloorplanWriteEnabled: () => true,
        isWorkerUploadWriteEnabled: () => true,
        isWorkerStatusReadEnabled: () => true,
        isWorkerSessionAuthEnabled: () => true,
        isWorkerStatusWriteEnabled: () => false,
        loginWorkerSession: R.loginWorkerSession,
        logoutWorkerSession: R.logoutWorkerSession,
        refreshWorkerSessionUser: R.refreshWorkerSessionUser,
        renewWorkerSession: R.renewWorkerSession,
        sessionGeneration: C.sessionGeneration,
        setSessionExpiredHandler: C.setSessionExpiredHandler,
        isSessionAuthError: C.isSessionAuthError,
    };
})(window);
