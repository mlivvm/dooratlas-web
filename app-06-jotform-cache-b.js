async function restoreJotFormReturnIfNeeded() {
    if (!FD.DoorActionService.hasReturnParam(window.location)) {
        clearJotFormReturnContext();
        return false;
    }
    const context = readJotFormReturnContext();
    FD.DoorActionService.clearReturnParam(window.history, window.location);
    clearJotFormReturnContext();
    if (!context) {
        showToast('Terug uit JotForm, vorige selectie niet gevonden', 'error');
        return false;
    }
    if (!isJotFormReturnContextForCurrentOrigin(context)) {
        showToast('Terug uit JotForm, vorige selectie niet gevonden', 'error');
        return false;
    }
    const customerIndex = findCustomerIndexForReturnContext(context);
    const customer = customers[customerIndex];
    const floorplanIndex = FD.DoorActionService.findFloorplanIndex(customer?.floorplans, context);
    if (customerIndex < 0 || floorplanIndex < 0) {
        showToast('Terug uit JotForm, vorige selectie niet gevonden', 'error');
        return false;
    }
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    await loadFloorplan(customerIndex, floorplanIndex);
    if (FD.MarkerService.markerExists(svgContainer, context.doorId)) {
        selectDoor(context.doorId);
        jotformFocusRefreshFormType = normalizeJotFormFormType(context.formType);
        startJotFormReturnFastRefresh(context.doorId, jotformFocusRefreshFormType);
        showToast('Terug uit JotForm', 'success');
    }
    else {
        showToast('Terug uit JotForm, deur niet gevonden', 'error');
    }
    return true;
}
window.addEventListener('focus', refreshAfterJotFormFocus);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
        refreshAfterJotFormFocus();
});
const floorplanCache = FD.FloorplanCacheService.createWarmupController({
    config: CONFIG,
    getCustomers: () => customers,
    isOnline: () => navigator.onLine,
    logger: console,
});
function fetchFloorplanSVGCacheFirst(fileUrl, ..._args) {
    return FD.FloorplanCacheService.fetchSVGCacheFirst(fileUrl, {
        cacheVersion: CONFIG.offlineCacheVersion,
        config: CONFIG,
    });
}
function updateCachedSVGAfterSave(fileUrl, updateResult, svgText) {
    return FD.FloorplanCacheService.updateCachedSVGAfterSave(fileUrl, updateResult, svgText, {
        cacheVersion: CONFIG.offlineCacheVersion,
        config: CONFIG,
    });
}
function cancelFloorplanCacheWarmup() {
    floorplanCache.cancel();
}
function scheduleFloorplanCacheWarmup() {
    floorplanCache.schedule();
}
function loadCachedCustomersOffline() {
    const cachedCustomers = readCachedCustomers();
    if (!cachedCustomers.length)
        return false;
    customers = cachedCustomers;
    customerSelect.disabled = false;
    populateCustomerDropdown();
    if (selectionController.isOpen('customer'))
        renderSelectSheetItems();
    setEmptyState('Offline klantgegevens geladen.<br>Kies een klant en plattegrond.', 'Controleer later online of alles actueel is');
    return true;
}
async function loadCustomers() {
    customersLoading = true;
    customerSelect.disabled = true;
    floorplanSelect.disabled = true;
    updatePickerButtons();
    try {
        if (navigator.onLine === false && loadCachedCustomersOffline())
            return;
        customers = await FD.DataService.loadCustomers(CONFIG);
        cacheCustomers();
        customerSelect.disabled = false;
        populateCustomerDropdown();
        if (selectionController.isOpen('customer'))
            renderSelectSheetItems();
        scheduleFloorplanCacheWarmup();
    }
    catch (err) {
        if (loadCachedCustomersOffline()) {
            console.warn('Kon klanten niet online laden, lokale cache gebruikt:', err);
        }
        else {
            console.warn('Kon klanten niet laden:', err);
            loadingEl.textContent = 'Fout bij laden van klantgegevens.';
        }
    }
    finally {
        customersLoading = false;
        customerSelect.disabled = customers.length === 0;
        updatePickerButtons();
        if (selectionController.isOpen('customer'))
            renderSelectSheetItems();
    }
}
async function loadStatus() {
    const result = await statusSync.loadStatusLocalFirst({
        onCachedStatus: (cachedStatus) => {
            doorStatus = cachedStatus;
            updateStatusBar();
        },
    });
    if (result.error) {
        console.warn('Kon status niet laden:', result.error);
    }
    doorStatus = result.status || {};
    updateStatusBar();
}
function populateCustomerDropdown() {
    FD.SelectSheetService.renderCustomerOptions(customerSelect, customers);
    updatePickerButtons();
}
function populateFloorplanDropdown(customerIndex) {
    const c = customers[customerIndex];
    FD.SelectSheetService.renderFloorplanOptions(floorplanSelect, c.floorplans, {
        labelForItem: floorplan => floorplanPickerLabel(c, floorplan),
    });
    updatePickerButtons();
}
function resetFloorplanDropdown(disabled = true) {
    FD.SelectSheetService.resetFloorplanOptions(floorplanSelect, { disabled });
    updatePickerButtons();
}
function getSelectedFloorplan() {
    return FD.SelectSheetService.getSelectedFloorplan(customers, customerSelect, floorplanSelect);
}
function updateAccountIndicator() {
    if (!accountIndicator || !accountLabel)
        return;
    const role = String(currentUser?.role || '').toLowerCase();
    const displayName = String(currentUser?.displayName || currentUser?.display_name || currentUser?.username || '').trim();
    const label = displayName || (['admin', 'monteur', 'viewer'].includes(role) ? role : '');
    accountLabel.textContent = label;
    accountIndicator.hidden = !label;
    accountIndicator.title = label
        ? `Ingelogd als ${label}${role ? ` (${role})` : ''}`
        : 'Ingelogd account';
    accountIndicator.dataset.role = role;
}
function refreshCurrentUser() {
    currentUser = FD.DataService.getWorkerSessionUser(CONFIG);
    updateAccountIndicator();
    return currentUser;
}
function isSessionAuthError(err) {
    if (FD.DataService.isSessionAuthError?.(err))
        return true;
    const code = String(err?.code || err?.message || '');
    return Number(err?.status) === 401 && (code === 'session_required' ||
        code === 'invalid_session' ||
        code === 'worker_session_required');
}
async function handleExpiredSession(err, context = {}) {
    if (handlingExpiredSession || appMode.is(AppModes.LOGIN))
        return false;
    if (!isSessionAuthError(err))
        return false;
    handlingExpiredSession = true;
    try {
        lastSessionCheckAt = 0;
        sessionCheckPromise = null;
        stopSessionHeartbeat();
        stopAdminActiveUsersPolling();
        stopPolling();
        hideTopbarMenu();
        FD.AuthService.clearSession(LOGIN_CONFIG);
        FD.DataService.clearWorkerSession(CONFIG);
        currentUser = null;
        updateAccountIndicator();
        try {
            await resetAppToStartScreen();
        }
        catch (cleanupErr) {
            console.error('Sessie-cleanup mislukt:', cleanupErr);
        }
        authController?.showLoginScreen?.({
            message: 'Sessie verlopen. Log opnieuw in om verder te gaan.',
            clearPassword: true,
            restoreRemember: true,
        });
        showToast('Sessie verlopen. Log opnieuw in.', 'error');
        return true;
    }
    finally {
        handlingExpiredSession = false;
    }
}
function getWorkerSessionInfo() {
    return FD.DataService.getWorkerSessionInfo?.(CONFIG) || {
        hasToken: false,
        expiresInMs: 0,
        fresh: false,
    };
}
function shouldRenewWorkerSession(info) {
    return Boolean(info?.hasToken) &&
        Number(info.expiresInMs || 0) > 0 &&
        Number(info.expiresInMs || 0) <= SESSION_RENEW_WINDOW_MS;
}
async function ensureActiveSession({ force = false, purpose = 'session_check', background = false, allowRenew = true, } = {}) {
    if (appMode.is(AppModes.LOGIN))
        return false;
    if (navigator.onLine === false)
        return Boolean(refreshCurrentUser());
    const info = getWorkerSessionInfo();
    if (!info.hasToken || Number(info.expiresInMs || 0) <= 0) {
        await handleExpiredSession(Object.assign(new Error('invalid_session'), {
            status: 401,
            code: 'invalid_session',
        }), { purpose });
        return false;
    }
    const shouldRenew = allowRenew && shouldRenewWorkerSession(info);
    if (!force && !shouldRenew && Date.now() - lastSessionCheckAt < SESSION_CHECK_STALE_MS) {
        return true;
    }
    if (sessionCheckPromise)
        return sessionCheckPromise;
    sessionCheckPromise = (async () => {
        try {
            if (shouldRenew) {
                await FD.DataService.renewWorkerSession(CONFIG, {
                    diagnostics: {
                        suppress: true,
                        background: true,
                        expireSessionOnAuthError: true,
                        purpose: `${purpose}_renew`,
                    },
                });
            }
            else {
                await FD.DataService.refreshWorkerSessionUser(CONFIG, {
                    diagnostics: {
                        suppress: background,
                        level: 'warn',
                        background,
                        expireSessionOnAuthError: true,
                        purpose,
                    },
                });
            }
            lastSessionCheckAt = Date.now();
            refreshCurrentUser();
            updateRoleActionButtons();
            if (selectionController.isOpen('floorplan'))
                renderSelectSheetItems();
            return true;
        }
        catch (err) {
            if (await handleExpiredSession(err, { purpose }))
                return false;
            if (!background && navigator.onLine !== false)
                throw err;
            if (navigator.onLine !== false)
                console.warn('Sessiecontrole mislukt:', err);
            return false;
        }
        finally {
            sessionCheckPromise = null;
        }
    })();
    return sessionCheckPromise;
}
function refreshCurrentUserFromWorker() {
    refreshCurrentUser();
    if (navigator.onLine === false || typeof FD.DataService.refreshWorkerSessionUser !== 'function')
        return;
    ensureActiveSession({
        force: true,
        purpose: 'refresh session user metadata',
        background: true,
    }).catch(err => {
        console.warn('Worker gebruiker/rechten verversen mislukt:', err);
    });
}
function isPageVisibleAndOnline() {
    return document.visibilityState !== 'hidden' && navigator.onLine !== false;
}
function shouldRunSessionHeartbeat() {
    if (!isPageVisibleAndOnline())
        return false;
    if (appMode.is(AppModes.LOGIN))
        return false;
    if (typeof FD.DataService.refreshWorkerSessionUser !== 'function')
        return false;
    if (!currentUser)
        refreshCurrentUser();
    return Boolean(currentUser || getWorkerSessionInfo().hasToken);
}
async function runSessionHeartbeat() {
    if (!shouldRunSessionHeartbeat() || sessionHeartbeatInFlight)
        return;
    sessionHeartbeatInFlight = true;
    try {
        await ensureActiveSession({
            force: true,
            purpose: 'session_heartbeat',
            background: true,
        });
    }
    catch (err) {
        if (navigator.onLine !== false) {
            console.warn('Sessie heartbeat mislukt:', err);
        }
    }
    finally {
        sessionHeartbeatInFlight = false;
    }
}
function sessionHeartbeatTick() {
    return runSessionHeartbeat();
}
function startSessionHeartbeat() {
    if (sessionHeartbeatTimer || !shouldRunSessionHeartbeat())
        return;
    sessionHeartbeatTimer = window.setInterval(sessionHeartbeatTick, CONFIG.sessionHeartbeatInterval);
}
function stopSessionHeartbeat() {
    if (!sessionHeartbeatTimer)
        return;
    window.clearInterval(sessionHeartbeatTimer);
    sessionHeartbeatTimer = null;
}
function validateSessionAfterResume() {
    if (!shouldRunSessionHeartbeat())
        return;
    ensureActiveSession({
        purpose: 'resume_session_check',
        background: true,
    }).catch(err => {
        if (navigator.onLine !== false)
            console.warn('Sessie hervatten mislukt:', err);
    });
}
