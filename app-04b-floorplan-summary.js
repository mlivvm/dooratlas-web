const floorplanSummaryRefreshes = new Map();
let floorplanSummaryController = null;
let floorplanSummaryGeneration = 0;
function cancelFloorplanSummaryRefreshes() {
    floorplanSummaryGeneration += 1;
    floorplanSummaryController?.abort();
    floorplanSummaryController = null;
    floorplanSummaryRefreshes.clear();
}
function floorplanSummaryId(value) {
    const source = value && typeof value === 'object' ? value : {};
    const candidates = [source.floorId, source.floor_id, source.id, source.file, source.name];
    for (const candidate of candidates) {
        const id = Number(candidate || 0);
        if (Number.isInteger(id) && id > 0)
            return id;
    }
    return 0;
}
function floorplanSummaryDoorCount(value) {
    const source = value && typeof value === 'object' ? value : {};
    const count = Number(source.doorCount ?? source.door_count ?? source.doorsTotal);
    return Number.isInteger(count) && count >= 0 ? count : null;
}
function floorplanSummaryRevision(value) {
    const revision = String(value || '').trim();
    const timestamp = Date.parse(revision);
    return { revision, timestamp: Number.isFinite(timestamp) ? timestamp : null };
}
function applyFloorplanSummary(item, summary) {
    const incomingId = floorplanSummaryId(summary);
    if (!incomingId || floorplanSummaryId(item) !== incomingId)
        return false;
    const currentRevision = floorplanSummaryRevision(item?.revision);
    const incomingRevision = floorplanSummaryRevision(summary?.revision);
    if (currentRevision.timestamp !== null && (incomingRevision.timestamp === null || incomingRevision.timestamp < currentRevision.timestamp))
        return false;
    const count = floorplanSummaryDoorCount(summary);
    let changed = false;
    if (count !== null && (item.doorCount !== count || item.doorsTotal !== count)) {
        item.doorCount = count;
        item.doorsTotal = count;
        changed = true;
    }
    if (incomingRevision.revision && item.revision !== incomingRevision.revision) {
        item.revision = incomingRevision.revision;
        changed = true;
    }
    return changed;
}
function refreshFloorplanSummaryUI() {
    if (selectionController?.isOpen?.())
        renderSelectSheetItems();
    updatePickerButtons();
}
function syncFloorplanSummary(summary, options = {}) {
    const incomingId = floorplanSummaryId(summary);
    if (!incomingId)
        return false;
    let changed = false;
    customers.forEach(customer => {
        (customer?.floorplans || []).forEach(item => {
            if (applyFloorplanSummary(item, summary))
                changed = true;
        });
    });
    if (!changed)
        return false;
    if (options.persist !== false)
        cacheCustomers();
    if (options.render !== false)
        refreshFloorplanSummaryUI();
    return true;
}
function syncFloorplanSummaryFromSnapshot(floorplan) {
    return syncFloorplanSummary({
        floorId: floorplanSummaryId(floorplan),
        doorCount: Array.isArray(floorplan?.doors) ? floorplan.doors.length : floorplanSummaryDoorCount(floorplan),
        revision: floorplan?.revision,
    });
}
function syncFloorplanSummaryFromMutation(floorplan, mutation) {
    return syncFloorplanSummary({
        floorId: floorplanSummaryId(mutation) || floorplanSummaryId(floorplan),
        doorCount: floorplanSummaryDoorCount(mutation),
        revision: mutation?.revision,
    });
}
function refreshFloorplanSummariesForCustomer(customerIndex) {
    const index = Number(customerIndex);
    const customer = Number.isInteger(index) ? customers[index] : null;
    const tenantId = Number(customer?.tenantId || 0);
    if (!customer || !Number.isInteger(tenantId) || tenantId < 1 || navigator.onLine === false ||
        typeof FD.DataService.loadFloorplanSummaries !== 'function')
        return Promise.resolve(false);
    const activeRefresh = floorplanSummaryRefreshes.get(tenantId);
    if (activeRefresh)
        return activeRefresh;
    cancelFloorplanSummaryRefreshes();
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const generation = ++floorplanSummaryGeneration;
    floorplanSummaryController = controller;
    const refresh = Promise.resolve().then(async () => {
        const summaries = await FD.DataService.loadFloorplanSummaries(CONFIG, tenantId, { signal: controller?.signal });
        if (controller?.signal.aborted || generation !== floorplanSummaryGeneration)
            return false;
        let changed = false;
        (Array.isArray(summaries) ? summaries : []).forEach(summary => {
            if (syncFloorplanSummary(summary, { persist: false, render: false }))
                changed = true;
        });
        if (changed && !controller?.signal.aborted && generation === floorplanSummaryGeneration) {
            cacheCustomers();
            refreshFloorplanSummaryUI();
        }
        return changed;
    }).catch(err => {
        if (err?.name !== 'AbortError' && navigator.onLine !== false) {
            console.warn('Kon plattegrondtellers niet verversen:', err);
        }
        return false;
    }).finally(() => {
        if (floorplanSummaryRefreshes.get(tenantId) === refresh)
            floorplanSummaryRefreshes.delete(tenantId);
        if (floorplanSummaryController === controller)
            floorplanSummaryController = null;
    });
    floorplanSummaryRefreshes.set(tenantId, refresh);
    return refresh;
}
