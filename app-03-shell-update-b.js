function hideAppUpdateDialog() {
    appUpdateDialog.hide();
    if (appUpdateConfirmButton) {
        appUpdateConfirmButton.disabled = false;
        appUpdateConfirmButton.textContent = 'Bijwerken';
    }
}
function rememberExpectedAppUpdate(update) {
    try {
        sessionStorage.setItem(APP_UPDATE_EXPECTED_CACHE_KEY, update.cache);
        sessionStorage.setItem(APP_UPDATE_EXPECTED_VERSION_KEY, update.version);
    }
    catch (err) {
        console.warn('Updateverwachting opslaan mislukt:', err);
    }
}
function clearExpectedAppUpdate() {
    try {
        sessionStorage.removeItem(APP_UPDATE_EXPECTED_CACHE_KEY);
        sessionStorage.removeItem(APP_UPDATE_EXPECTED_VERSION_KEY);
    }
    catch (err) {
        console.warn('Updateverwachting wissen mislukt:', err);
    }
}
function getExpectedAppUpdate() {
    try {
        const cache = sessionStorage.getItem(APP_UPDATE_EXPECTED_CACHE_KEY) || '';
        const version = sessionStorage.getItem(APP_UPDATE_EXPECTED_VERSION_KEY) || cacheVersionToVersion(cache);
        return cache ? { cache, version } : null;
    }
    catch (err) {
        return null;
    }
}
function removeAppUpdateReloadMarker() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('fd_update'))
        return;
    url.searchParams.delete('fd_update');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, '', nextUrl);
}
function verifyExpectedAppUpdateAfterReload() {
    const expected = getExpectedAppUpdate();
    if (!expected)
        return;
    if (expected.cache === CONFIG.offlineCacheVersion) {
        clearExpectedAppUpdate();
        removeAppUpdateReloadMarker();
        return;
    }
    setAppUpdateAvailable(expected);
    showToast('Update niet afgerond. Herlaad de pagina handmatig als deze knop blijft staan.', 'error');
}
function waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function waitForServiceWorkerState(worker, states, timeoutMs) {
    if (!worker)
        return Promise.resolve('');
    const desiredStates = new Set(states);
    if (desiredStates.has(worker.state))
        return Promise.resolve(worker.state);
    return new Promise(resolve => {
        let settled = false;
        let timer = null;
        const done = state => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            worker.removeEventListener('statechange', onStateChange);
            resolve(state || worker.state || '');
        };
        const onStateChange = () => {
            if (desiredStates.has(worker.state))
                done(worker.state);
        };
        timer = setTimeout(() => done(worker.state), timeoutMs);
        worker.addEventListener('statechange', onStateChange);
    });
}
function waitForServiceWorkerControllerChange(timeoutMs) {
    if (!navigator.serviceWorker?.controller)
        return Promise.resolve(false);
    return new Promise(resolve => {
        let settled = false;
        let timer = null;
        const done = changed => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve(Boolean(changed));
        };
        const onControllerChange = () => done(true);
        timer = setTimeout(() => done(false), timeoutMs);
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    });
}
function requestWaitingServiceWorkerActivation(registration) {
    const waiting = registration?.waiting;
    if (!waiting)
        return false;
    waiting.postMessage({ type: APP_UPDATE_MESSAGE });
    return true;
}
async function activateUpdatedServiceWorker() {
    if (!navigator.serviceWorker)
        return false;
    const controllerChange = waitForServiceWorkerControllerChange(12000);
    let registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration();
    try {
        if (registration?.update) {
            await registration.update();
        }
    }
    catch (err) {
        console.warn('Service worker update-check mislukt:', err);
    }
    registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration() || registration;
    if (!registration)
        return false;
    if (registration.installing) {
        await waitForServiceWorkerState(registration.installing, ['installed', 'activated', 'redundant'], 12000);
    }
    registration = await navigator.serviceWorker.getRegistration() || registration;
    requestWaitingServiceWorkerActivation(registration);
    const changed = await Promise.race([
        controllerChange,
        waitForTimeout(12000).then(() => false),
    ]);
    return changed || Boolean(registration.active);
}
async function applyAppUpdate() {
    if (!pendingAppUpdate)
        return;
    if (!appMode.isInteractiveView()) {
        hideAppUpdateDialog();
        showToast('Rond eerst je bewerking af voordat je bijwerkt', 'error');
        return;
    }
    if (appUpdateConfirmButton) {
        appUpdateConfirmButton.disabled = true;
        appUpdateConfirmButton.textContent = 'Bijwerken...';
    }
    const updateToApply = pendingAppUpdate;
    if (!(await remoteDeploymentReady(updateToApply))) {
        hideAppUpdateDialog();
        setAppUpdateAvailable(null);
        showToast('Update wordt nog klaargezet. Probeer zo opnieuw.', 'error');
        return;
    }
    setAppUpdateAvailable(null);
    rememberExpectedAppUpdate(updateToApply);
    await activateUpdatedServiceWorker();
    const reloadUrl = new URL(window.location.href);
    reloadUrl.searchParams.set('fd_update', String(Date.now()));
    window.location.replace(reloadUrl.toString());
}
function startAppUpdateChecks() {
    checkForAppUpdate();
    if (updateCheckTimer)
        clearInterval(updateCheckTimer);
    updateCheckTimer = setInterval(checkForAppUpdate, CONFIG.versionCheckInterval);
}
function getDiagnosticsContext() {
    const selection = typeof getSelectedFloorplan === 'function'
        ? getSelectedFloorplan()
        : { customer: null, floorplan: null };
    const floorplan = selection.floorplan || {};
    const selectedDoorStatus = selectedDoor && typeof getDoorStatus === 'function'
        ? (getDoorStatus(selectedDoor) ? 'done' : 'todo')
        : '';
    return {
        customer: currentCustomer || selection.customer?.customer || '',
        floorplan: currentFloorplan || floorplan.name || '',
        doorId: selectedDoor || '',
        appMode: appMode.current,
        syncQueueCount: statusSync ? statusSync.getQueueCount() : 0,
        lastToast: lastToast ? `${lastToast.type}: ${lastToast.message}` : '',
        details: {
            floorplanFile: floorplan.file || '',
            floorplanRepo: floorplan.repo || 'gallery',
            selectedDoorStatus,
            locationPath: window.location.pathname,
            locationQueryKeys: Array.from(new URLSearchParams(window.location.search).keys()),
            serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio || 1,
            },
        },
    };
}
const diagnostics = FD.DiagnosticsService.create(CONFIG, {
    getContext: getDiagnosticsContext,
    logger: console,
});
let reportProblemSubmitting = false;
let imageEditorSaveErrorDetailsText = '';
function reportProblemMessage() {
    return String(reportProblemText?.value || '').trim();
}
function updateReportProblemSubmitState() {
    if (!reportProblemSubmit)
        return;
    reportProblemSubmit.disabled = reportProblemSubmitting || !reportProblemMessage();
}
function resetReportProblemForm() {
    reportProblemSubmitting = false;
    if (reportProblemText)
        reportProblemText.value = '';
    if (reportProblemCategory)
        reportProblemCategory.value = 'Anders';
    if (reportProblemError)
        reportProblemError.textContent = '';
    if (reportProblemSubmit) {
        reportProblemSubmit.textContent = 'Versturen';
        reportProblemSubmit.disabled = true;
    }
    if (reportProblemCancel)
        reportProblemCancel.disabled = false;
}
function showReportProblemDialog() {
    hideTopbarMenu();
    resetReportProblemForm();
    reportProblemDialog.show();
    setTimeout(() => reportProblemText?.focus(), 0);
}
function hideReportProblemDialog() {
    if (reportProblemSubmitting)
        return;
    reportProblemDialog.hide();
    resetReportProblemForm();
}
async function submitReportProblem() {
    if (reportProblemSubmitting)
        return;
    const message = reportProblemMessage();
    if (!message) {
        if (reportProblemError)
            reportProblemError.textContent = 'Beschrijf kort wat er misgaat.';
        updateReportProblemSubmitState();
        return;
    }
    reportProblemSubmitting = true;
    if (reportProblemError)
        reportProblemError.textContent = '';
    if (reportProblemSubmit) {
        reportProblemSubmit.disabled = true;
        reportProblemSubmit.textContent = 'Versturen...';
    }
    if (reportProblemCancel)
        reportProblemCancel.disabled = true;
    try {
        const result = await diagnostics.reportManual({
            message,
            category: reportProblemCategory?.value || 'Anders',
        });
        reportProblemDialog.hide();
        resetReportProblemForm();
        if (result?.sent) {
            showToast('Probleemmelding verstuurd', 'success');
        }
        else {
            showToast('Probleemmelding bewaard voor later', 'error');
        }
    }
    catch (err) {
        reportProblemSubmitting = false;
        if (reportProblemSubmit)
            reportProblemSubmit.textContent = 'Versturen';
        if (reportProblemCancel)
            reportProblemCancel.disabled = false;
        updateReportProblemSubmitState();
        if (reportProblemError)
            reportProblemError.textContent = 'Versturen mislukt. Probeer het opnieuw.';
        console.warn('Probleemmelding versturen mislukt:', err);
    }
}
btnReportProblem.addEventListener('click', showReportProblemDialog);
reportProblemText?.addEventListener('input', updateReportProblemSubmitState);
reportProblemSubmit?.addEventListener('click', submitReportProblem);
reportProblemCancel?.addEventListener('click', hideReportProblemDialog);
reportProblemOverlay?.addEventListener('click', hideReportProblemDialog);
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape')
        return;
    if (reportProblemPopup?.style.display !== 'none') {
        hideReportProblemDialog();
        return;
    }
    if (adminSessionsPopup?.style.display !== 'none') {
        if (typeof hideAdminSessionsPopup === 'function')
            hideAdminSessionsPopup();
    }
});
appUpdateButton?.addEventListener('click', showAppUpdateDialog);
appUpdateLaterButton?.addEventListener('click', hideAppUpdateDialog);
appUpdateConfirmButton?.addEventListener('click', applyAppUpdate);
appUpdateOverlay?.addEventListener('click', hideAppUpdateDialog);
adminOnlinePanel?.addEventListener('click', () => showAdminSessionsPopup());
adminOnlinePanel?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ')
        return;
    event.preventDefault();
    showAdminSessionsPopup();
});
adminSessionsClose?.addEventListener('click', () => hideAdminSessionsPopup());
adminSessionsOverlay?.addEventListener('click', () => hideAdminSessionsPopup());
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkForAppUpdate();
        if (typeof startSessionHeartbeat === 'function')
            startSessionHeartbeat();
        if (typeof validateSessionAfterResume === 'function')
            validateSessionAfterResume();
        if (typeof startAdminActiveUsersPolling === 'function')
            startAdminActiveUsersPolling({ refreshNow: true });
    }
    else {
        if (typeof stopSessionHeartbeat === 'function')
            stopSessionHeartbeat();
        if (typeof stopAdminActiveUsersPolling === 'function')
            stopAdminActiveUsersPolling();
    }
});
window.addEventListener('focus', () => {
    if (typeof validateSessionAfterResume === 'function')
        validateSessionAfterResume();
});
function updateConnectionIndicator() {
    const isOnline = navigator.onLine;
    FD.UIShellService.renderConnectionIndicator({
        indicatorEl: connectionIndicator,
        labelEl: connectionLabel,
        isOnline,
    });
    requestAnimationFrame(updateTopbarHeight);
}
function setSidePanelUserOpen(open) {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    sidePanel.dataset.userCollapsed = open ? '0' : '1';
    appContainer.classList.toggle('side-panel-pinned', desktop && open);
    sidePanelController.setOpen(open);
}
function syncSidePanelForViewport() {
    if (!svgContainer.querySelector('svg') || !currentCustomer || !currentFloorplan)
        return;
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const userCollapsed = sidePanel.dataset.userCollapsed === '1';
    btnPanelToggle.style.display = 'grid';
    appContainer.classList.toggle('side-panel-pinned', desktop && !userCollapsed);
    if (desktop) {
        sidePanel.dataset.desktopOpen = '1';
        sidePanelController.setOpen(!userCollapsed);
    }
    else if (sidePanel.dataset.desktopOpen === '1') {
        sidePanel.dataset.desktopOpen = '0';
        sidePanelController.setOpen(false);
    }
}
function updateStatusSyncIndicator() {
    const count = statusSync ? statusSync.getQueueCount() : 0;
    FD.UIShellService.renderStatusSyncIndicator({
        indicatorEl: syncIndicator,
        labelEl: syncLabel,
        count,
    });
    requestAnimationFrame(updateTopbarHeight);
}
window.addEventListener('online', () => {
    updateConnectionIndicator();
    showToast('Je bent weer online', 'success');
    if (statusSync)
        statusSync.markNetworkAvailable();
    if (typeof flushStatusSyncQueue === 'function')
        flushStatusSyncQueue();
    if (typeof scheduleFloorplanCacheWarmup === 'function')
        scheduleFloorplanCacheWarmup();
    checkForAppUpdate();
    if (typeof startSessionHeartbeat === 'function')
        startSessionHeartbeat();
    if (typeof validateSessionAfterResume === 'function')
        validateSessionAfterResume();
    if (typeof startAdminActiveUsersPolling === 'function')
        startAdminActiveUsersPolling({ refreshNow: true });
});
