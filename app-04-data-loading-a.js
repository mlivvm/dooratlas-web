window.addEventListener('offline', () => {
    updateConnectionIndicator();
    if (typeof cancelFloorplanCacheWarmup === 'function')
        cancelFloorplanCacheWarmup();
    if (typeof stopSessionHeartbeat === 'function')
        stopSessionHeartbeat();
    if (typeof stopAdminActiveUsersPolling === 'function')
        stopAdminActiveUsersPolling();
    showToast('Offline modus', 'error');
});
// ============================================================
// DATA LOADING
// ============================================================
const CUSTOMERS_CACHE_KEY = envStorageKey('fd_customers_cache');
const JOTFORM_RETURN_CONTEXT_KEY = envStorageKey('fd_jotform_return_context');
function readCachedCustomers() {
    try {
        const cached = JSON.parse(localStorage.getItem(CUSTOMERS_CACHE_KEY) || '[]');
        return Array.isArray(cached) ? cached : [];
    }
    catch {
        return [];
    }
}
function cacheCustomers() {
    try {
        localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
    }
    catch (err) {
        console.warn('Klanten cache kon niet worden opgeslagen:', err);
    }
}
async function clearPrivateOfflineData() {
    try {
        localStorage.removeItem(CUSTOMERS_CACHE_KEY);
        localStorage.removeItem(JOTFORM_RETURN_CONTEXT_KEY);
    }
    catch { }
    FD.StatusService?.clearPrivateData?.();
    FD.DiagnosticsService?.clearPrivateData?.();
    try {
        await Promise.resolve(FD.FloorplanCacheService?.clearPrivateCache?.({
            cacheVersion: CONFIG.offlineCacheVersion,
            config: CONFIG,
        }));
    }
    catch (err) {
        console.warn('Private plattegrondcache kon niet worden gewist:', err);
    }
}
function getFloorplanApiUrl(fp) {
    return FD.FloorplanCacheService.getFloorplanApiUrl(fp, CONFIG);
}
function normalizeJotFormFormType(value) {
    const type = String(value || '').trim();
    return Object.prototype.hasOwnProperty.call(CONFIG.jotformForms || {}, type)
        ? type
        : 'maintenance';
}
function jotFormFormTypes() {
    return Object.entries(CONFIG.jotformForms || {})
        .filter(([, form]) => form?.formId && !form.disabled)
        .map(([type]) => normalizeJotFormFormType(type));
}
function currentJotFormReturnContext(formType = 'maintenance') {
    const { customer, floorplan } = getSelectedFloorplan();
    return FD.DoorActionService.createReturnContext({
        customer: customer || currentCustomer,
        floorplan: floorplan || currentFloorplan,
        doorId: selectedDoor,
        formType,
    });
}
function currentJotFormLookupTarget() {
    const { customer, floorplan } = getSelectedFloorplan();
    const customerName = customer?.customer || currentCustomer || '';
    const floorplanName = floorplan?.name || currentFloorplan || '';
    const file = floorplan?.file || '';
    if (!customerName || !floorplanName || !file)
        return null;
    return {
        customer: customerName,
        floorplan: floorplanName,
        repo: floorplan?.repo === 'uploads' ? 'uploads' : 'gallery',
        file,
    };
}
function isJotFormLookupEnabled() {
    return CONFIG.jotformMode !== 'shared-form-limited' && CONFIG.jotformMode !== 'disabled';
}
function currentFloorplanDoneStatusFingerprint(target = currentJotFormLookupTarget()) {
    if (!target)
        return '';
    const bucket = doorStatus?.[target.customer]?.[target.floorplan];
    if (!bucket || typeof bucket !== 'object')
        return '';
    return Object.entries(bucket)
        .filter(([, value]) => FD.StatusService.isDoneStatusValue(value))
        .map(([doorId, value]) => `${doorId}=${String(value)}`)
        .sort()
        .join('&');
}
function jotformSubmissionCacheKey(target = currentJotFormLookupTarget()) {
    if (!target)
        return '';
    return [
        target.customer,
        target.floorplan,
        target.repo,
        target.file,
        currentFloorplanDoneStatusFingerprint(target),
    ].join('\u001f');
}
function jotformDoorIdentityKey(doorId, target = currentJotFormLookupTarget()) {
    if (!target || !doorId)
        return '';
    return [
        target.customer,
        target.floorplan,
        target.repo,
        target.file,
        doorId,
    ].join('\u001f');
}
function rememberManualNewFormHint(doorId) {
    const key = jotformDoorIdentityKey(doorId);
    if (!key)
        return;
    jotformManualNewFormHints.set(key, Date.now() + 2 * 60 * 1000);
}
function clearManualNewFormHint(doorId) {
    const key = jotformDoorIdentityKey(doorId);
    if (key)
        jotformManualNewFormHints.delete(key);
}
function hasManualNewFormHint(doorId) {
    const key = jotformDoorIdentityKey(doorId);
    if (!key)
        return false;
    const expiresAt = jotformManualNewFormHints.get(key) || 0;
    if (expiresAt > Date.now())
        return true;
    jotformManualNewFormHints.delete(key);
    return false;
}
function resetJotFormSubmissionCache() {
    clearJotFormSubmissionLookupRetry();
    jotformSubmissionCache.requestId += 1;
    jotformSubmissionCache = {
        key: '',
        ready: false,
        loading: false,
        submissions: {},
        checkedDoors: {},
        allChecked: false,
        requestId: jotformSubmissionCache.requestId,
        pending: null,
    };
    if (typeof doorActionController !== 'undefined' && doorActionController?.updateJotFormButton) {
        doorActionController.updateJotFormButton();
        applyDoorActionPermissions();
    }
}
function normalizeJotFormSubmission(item) {
    if (!item?.editUrl)
        return null;
    return {
        editUrl: String(item.editUrl),
        formType: normalizeJotFormFormType(item.formType),
        statusDoneAt: String(item.statusDoneAt || ''),
        lastSeenAt: String(item.lastSeenAt || ''),
        doorCondition: ['ok', 'attention', 'unknown'].includes(item.doorCondition) ? item.doorCondition : 'unknown',
        doorConditionLabel: String(item.doorConditionLabel || ''),
    };
}
function setJotFormSubmissionInMap(submissions, doorId, formType, submission) {
    const type = normalizeJotFormFormType(formType);
    if (!submissions[doorId] || submissions[doorId].editUrl)
        submissions[doorId] = {};
    if (submission?.editUrl) {
        submissions[doorId][type] = {
            ...submission,
            formType: type,
        };
    }
    else if (submissions[doorId]) {
        delete submissions[doorId][type];
        if (Object.keys(submissions[doorId]).length === 0)
            delete submissions[doorId];
    }
}
function markJotFormChecked(checkedDoors, doorId, formType) {
    const type = normalizeJotFormFormType(formType);
    if (!checkedDoors[doorId] || checkedDoors[doorId] === true)
        checkedDoors[doorId] = {};
    checkedDoors[doorId][type] = true;
}
function isJotFormChecked(checkedDoors, doorId, formType) {
    const type = normalizeJotFormFormType(formType);
    return checkedDoors?.[doorId] === true || checkedDoors?.[doorId]?.[type] === true;
}
function normalizeJotFormSubmissionMap(response) {
    const source = response?.submissions && typeof response.submissions === 'object'
        ? response.submissions
        : {};
    const normalized = {};
    Object.entries(source).forEach(([doorId, item]) => {
        if (!doorId || !item || typeof item !== 'object')
            return;
        const direct = normalizeJotFormSubmission(item);
        if (direct) {
            setJotFormSubmissionInMap(normalized, doorId, direct.formType, direct);
        }
        jotFormFormTypes().forEach(formType => {
            const nested = normalizeJotFormSubmission(item[formType]);
            if (nested)
                setJotFormSubmissionInMap(normalized, doorId, formType, nested);
        });
    });
    return normalized;
}
function getCachedJotFormSubmission(doorId, formType = 'maintenance') {
    const key = jotformSubmissionCacheKey();
    if (!doorId || !key || jotformSubmissionCache.key !== key)
        return null;
    const bucket = jotformSubmissionCache.submissions?.[doorId];
    if (!bucket)
        return null;
    if (bucket.editUrl)
        return normalizeJotFormSubmission(bucket);
    return bucket[normalizeJotFormFormType(formType)] || null;
}
function getCachedJotFormSubmissionsForDoor(doorId) {
    const key = jotformSubmissionCacheKey();
    if (!doorId || !key || jotformSubmissionCache.key !== key)
        return [];
    const bucket = jotformSubmissionCache.submissions?.[doorId];
    if (!bucket)
        return [];
    if (bucket.editUrl) {
        const direct = normalizeJotFormSubmission(bucket);
        return direct ? [direct] : [];
    }
    return jotFormFormTypes()
        .map(formType => bucket[formType])
        .filter(Boolean);
}
function getOtherCachedJotFormSubmission(doorId, formType) {
    const type = normalizeJotFormFormType(formType);
    return getCachedJotFormSubmissionsForDoor(doorId)
        .find(submission => submission?.editUrl && normalizeJotFormFormType(submission.formType) !== type) || null;
}
function getJotFormFormLabel(formType) {
    const type = normalizeJotFormFormType(formType);
    return String(CONFIG.jotformForms?.[type]?.label || (type === 'inspection' ? 'Opname' : 'Onderhoud'));
}
function isJotFormConditionChecking(doorId) {
    if (!isJotFormLookupEnabled())
        return false;
    if (!doorId || !getDoorStatus(doorId))
        return false;
    if (navigator.onLine === false || !canCreateInspectionCurrentFloorplan())
        return false;
    if (hasManualNewFormHint(doorId))
        return false;
    const target = currentJotFormLookupTarget();
    const key = jotformSubmissionCacheKey(target);
    if (!key)
        return false;
    if (jotformSubmissionCache.key !== key)
        return true;
    if (jotformSubmissionCache.loading || jotformSubmissionCache.pending)
        return true;
    return false;
}
function getDoorCondition(doorId) {
    if (!doorId || !getDoorStatus(doorId))
        return 'unknown';
    const submissions = getCachedJotFormSubmissionsForDoor(doorId);
    if (submissions.some(submission => submission?.doorCondition === 'attention'))
        return 'attention';
    if (isJotFormConditionChecking(doorId))
        return 'checking';
    return 'unknown';
}
function markerForDoorId(doorId) {
    if (!doorId)
        return null;
    return FD.MarkerService.findMarkerByDoorId(svgContainer, doorId);
}
function markerAttribute(marker, name) {
    return String(marker?.getAttribute?.(name) || '').trim();
}
function formatDoorDateTime(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime()))
        return '';
    return new Intl.DateTimeFormat('nl-NL', {
        timeZone: CONFIG.appTimeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function doorDetailsForMarker(marker, doorId = '') {
    const fallbackId = String(doorId || marker?.dataset?.doorId || '').trim();
    const doorCode = markerAttribute(marker, 'data-dooratlas-door-code') || markerAttribute(marker, 'data-fd-door-code');
    const name = markerAttribute(marker, 'data-dooratlas-door-name') || markerAttribute(marker, 'data-fd-door-name');
    const label = FD.MarkerService.markerDisplayLabel?.(marker) || doorCode || name || 'Deur';
    const latestInspection = markerAttribute(marker, 'data-dooratlas-latest-inspection-at');
    const metaParts = [];
    if (name && name !== label)
        metaParts.push(name);
    if (doorCode && doorCode !== label)
        metaParts.push(`Deurcode ${doorCode}`);
    const formattedInspectionAt = formatDoorDateTime(latestInspection);
    if (formattedInspectionAt)
        metaParts.push(`Laatste inspectie ${formattedInspectionAt}`);
    return {
        id: Number(markerAttribute(marker, 'data-dooratlas-door-id') || markerAttribute(marker, 'data-fd-api-door-id')) || null,
        markerKey: fallbackId,
        label,
        name,
        doorCode,
        latestInspectionAt: latestInspection,
        meta: metaParts.join(' · '),
    };
}
function getDoorDetails(doorId) {
    return doorDetailsForMarker(markerForDoorId(doorId), doorId);
}
function getDoorLabel(doorId) {
    return getDoorDetails(doorId).label || 'Deur';
}
function getSelectedDoorInspectionContext() {
    if (!selectedDoor)
        return null;
    const details = getDoorDetails(selectedDoor);
    if (!details.id)
        return null;
    const { customer, floorplan } = getSelectedFloorplan();
    return {
        apiDoorId: details.id,
        markerKey: selectedDoor,
        label: details.label || selectedDoor,
        doorCode: details.doorCode,
        customer: customer?.customer || currentCustomer || '',
        location: floorplan?.building || floorplan?.locationName || '',
        floorLabel: floorplan?.floorLabel || floorplan?.displayName || floorplan?.name || '',
        details,
    };
}
function getJotFormButtonStateForDoor({ selectedDoor: doorId, isDone, formType = 'maintenance' } = {}) {
    const type = normalizeJotFormFormType(formType);
    if (!doorId || !isDone)
        return { action: 'new' };
    if (!isJotFormLookupEnabled())
        return { action: 'new' };
    const key = jotformSubmissionCacheKey();
    const cached = key && jotformSubmissionCache.key === key
        ? getCachedJotFormSubmission(doorId, type)
        : null;
    if (cached?.editUrl)
        return { action: 'edit', editUrl: cached.editUrl };
    const otherSubmission = key && jotformSubmissionCache.key === key
        ? getOtherCachedJotFormSubmission(doorId, type)
        : null;
    if (otherSubmission?.editUrl) {
        return {
            action: 'locked',
            locked: true,
            lockedByFormType: normalizeJotFormFormType(otherSubmission.formType),
            lockedByLabel: getJotFormFormLabel(otherSubmission.formType),
        };
    }
    if (hasManualNewFormHint(doorId))
        return { action: 'new' };
    if (!key || jotformSubmissionCache.key !== key)
        return { action: 'open', loading: true };
    if (jotformSubmissionCache.loading || !jotformSubmissionCache.ready)
        return { action: 'open', loading: true };
    if (jotformSubmissionCache.allChecked || isJotFormChecked(jotformSubmissionCache.checkedDoors, doorId, type)) {
        return { action: 'new' };
    }
    return { action: 'open', loading: true };
}
