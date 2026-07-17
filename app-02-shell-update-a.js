const adminLocationFilterHeading = document.getElementById('admin-location-filter-heading');
const adminLocationFilters = document.getElementById('admin-location-filters');
const adminBulkToggle = document.getElementById('admin-bulk-toggle');
const adminBulkSelectVisible = document.getElementById('admin-bulk-select-visible');
const adminBulkClear = document.getElementById('admin-bulk-clear');
const adminBulkCancel = document.getElementById('admin-bulk-cancel');
const adminDoorSearch = document.getElementById('admin-door-search');
const adminDoorGroup = document.getElementById('admin-door-group');
const adminDoorCustomerFilter = document.getElementById('admin-door-customer-filter');
const adminDoorFloorplanFilter = document.getElementById('admin-door-floorplan-filter');
const adminDoorResults = document.getElementById('admin-door-results');
const adminMetadataDialogOverlay = document.getElementById('admin-metadata-dialog-overlay');
const adminMetadataDialog = document.getElementById('admin-metadata-dialog');
const adminMetadataDialogContext = document.getElementById('admin-metadata-dialog-context');
const adminDetailCancel = document.getElementById('admin-detail-cancel');
const adminFloorplanList = document.getElementById('admin-floorplan-list');
const adminFloorplanCount = document.getElementById('admin-floorplan-count');
const adminDetailEmpty = document.getElementById('admin-detail-empty');
const adminDetailContent = document.getElementById('admin-detail-content');
const adminDetailPreview = document.getElementById('admin-detail-preview');
const adminDetailTitle = document.getElementById('admin-detail-title');
const adminDetailMeta = document.getElementById('admin-detail-meta');
const adminDetailOpen = document.getElementById('admin-detail-open');
const adminDetailStats = document.getElementById('admin-detail-stats');
const adminDetailCustomer = document.getElementById('admin-detail-customer');
const adminDetailBuilding = document.getElementById('admin-detail-building');
const adminDetailFloorLabel = document.getElementById('admin-detail-floor-label');
const adminDetailLocationStreet = document.getElementById('admin-detail-location-street');
const adminDetailLocationPostalCode = document.getElementById('admin-detail-location-postal-code');
const adminDetailLocationCity = document.getElementById('admin-detail-location-city');
const adminDetailLocationNote = document.getElementById('admin-detail-location-note');
const adminDetailLevelOrder = document.getElementById('admin-detail-level-order');
const adminDetailFloorNotes = document.getElementById('admin-detail-floor-notes');
const adminDetailError = document.getElementById('admin-detail-error');
const adminDetailSave = document.getElementById('admin-detail-save');
const adminDetailDelete = document.getElementById('admin-detail-delete');
const adminDoorDetailCard = document.getElementById('admin-door-detail-card');
const adminDoorDetailDot = document.getElementById('admin-door-detail-dot');
const adminDoorDetailCode = document.getElementById('admin-door-detail-code');
const adminDoorDetailStatus = document.getElementById('admin-door-detail-status');
const adminDoorDetailMeta = document.getElementById('admin-door-detail-meta');
const adminDoorDetailOpen = document.getElementById('admin-door-detail-open');
const adminKpiEls = {
    customers: document.getElementById('admin-kpi-customers'),
    floorplans: document.getElementById('admin-kpi-floorplans'),
    doors: document.getElementById('admin-kpi-doors'),
    open: document.getElementById('admin-kpi-open'),
    done: document.getElementById('admin-kpi-done'),
    attention: document.getElementById('admin-kpi-attention'),
};
const adminKpiButtons = Array.from(document.querySelectorAll('[data-admin-kpi]'));
const adminOnlinePanel = document.getElementById('admin-online-panel');
const adminOnlineEls = {
    admin: document.getElementById('admin-online-admin'),
    monteur: document.getElementById('admin-online-monteur'),
    viewer: document.getElementById('admin-online-viewer'),
};
const adminSessionsOverlay = document.getElementById('admin-sessions-overlay');
const adminSessionsPopup = document.getElementById('admin-sessions-popup');
const adminSessionsClose = document.getElementById('admin-sessions-close');
const adminSessionsSummary = document.getElementById('admin-sessions-summary');
const adminSessionsList = document.getElementById('admin-sessions-list');
const topbarMenu = document.getElementById('topbar-menu');
const btnTopbarMenu = document.getElementById('btn-menu');
const btnMenuLabels = document.getElementById('btn-menu-labels');
const btnMenuMarkerOutline = document.getElementById('btn-menu-marker-outline');
const btnPrintFloorplan = document.getElementById('btn-print-floorplan');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnReportProblem = document.getElementById('btn-report-problem');
const reportProblemOverlay = document.getElementById('report-problem-overlay');
const reportProblemPopup = document.getElementById('report-problem-popup');
const reportProblemCategory = document.getElementById('report-problem-category');
const reportProblemText = document.getElementById('report-problem-text');
const reportProblemError = document.getElementById('report-problem-error');
const reportProblemSubmit = document.getElementById('report-problem-submit');
const reportProblemCancel = document.getElementById('report-problem-cancel');
const exportExcelOverlay = document.getElementById('export-excel-overlay');
const exportExcelPopup = document.getElementById('export-excel-popup');
const exportExcelContext = document.getElementById('export-excel-context');
const exportExcelClose = document.getElementById('export-excel-close');
const exportExcelCurrent = document.getElementById('export-excel-current');
const exportExcelSelect = document.getElementById('export-excel-select');
const exportExcelSelection = document.getElementById('export-excel-selection');
const exportExcelList = document.getElementById('export-excel-list');
const exportExcelConfirm = document.getElementById('export-excel-confirm');
const exportExcelError = document.getElementById('export-excel-error');
const imageEditorSaveErrorOverlay = document.getElementById('image-editor-save-error-overlay');
const imageEditorSaveErrorPopup = document.getElementById('image-editor-save-error-popup');
const imageEditorSaveErrorMessage = document.getElementById('image-editor-save-error-message');
const imageEditorSaveErrorDetails = document.getElementById('image-editor-save-error-details');
const imageEditorSaveErrorCopy = document.getElementById('image-editor-save-error-copy');
const imageEditorSaveErrorClose = document.getElementById('image-editor-save-error-close');
const topbarMenuController = FD.UIShellService.createTopbarMenu({
    toggleButtonEl: btnTopbarMenu,
    menuEl: topbarMenu,
    documentEl: document,
});
function renderEnvironmentBadges() {
    const isStaging = CONFIG.environment === 'staging';
    environmentBadges.forEach(badge => {
        badge.hidden = !isStaging;
        if (isStaging)
            badge.textContent = 'STAGING';
    });
}
renderEnvironmentBadges();
const appUpdateDialog = FD.UIShellService.createPopupPair({
    overlayEl: appUpdateOverlay,
    popupEl: appUpdatePopup,
});
const adminSessionsDialog = FD.UIShellService.createPopupPair({
    overlayEl: adminSessionsOverlay,
    popupEl: adminSessionsPopup,
});
const busyOverlay = FD.UIShellService.createBusyOverlayController({
    overlayEl: busyOverlayEl,
});
const reportProblemDialog = FD.UIShellService.createPopupPair({
    overlayEl: reportProblemOverlay,
    popupEl: reportProblemPopup,
});
const exportExcelDialog = FD.UIShellService.createPopupPair({
    overlayEl: exportExcelOverlay,
    popupEl: exportExcelPopup,
});
const imageEditorSaveErrorDialog = FD.UIShellService.createPopupPair({
    overlayEl: imageEditorSaveErrorOverlay,
    popupEl: imageEditorSaveErrorPopup,
});
let exportExcelBaseRecord = null;
function hideTopbarMenu() {
    topbarMenuController.hide();
}
// ============================================================
// SHARED UI HELPERS
// ============================================================
function setEmptyState(subtitle, hint) {
    FD.UIShellService.renderEmptyState(loadingEl, { subtitle, hint });
}
function setLoadingState() {
    FD.UIShellService.renderLoadingState(loadingEl);
}
// ============================================================
// LAYOUT — measure topbar, handle resize/orientation
// ============================================================
function updateViewportMetrics() {
    FD.UIShellService.updateViewportHeightProperty({
        rootEl: document.documentElement,
        visualViewport: window.visualViewport,
        fallbackHeight: window.innerHeight,
    });
}
function updateTopbarHeight() {
    FD.UIShellService.updateTopbarHeightProperty({
        rootEl: document.documentElement,
        topbarEl,
    });
}
function handleResize() {
    updateViewportMetrics();
    updateTopbarHeight();
    if (typeof syncSidePanelForViewport === 'function')
        syncSidePanelForViewport();
    const svgEl = svgContainer.querySelector('svg');
    if (svgEl) {
        applyTransform();
        if (showLabels)
            scheduleEditLabelsUpdate();
    }
}
window.addEventListener('resize', handleResize);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
}
updateViewportMetrics();
// Warn before closing with unsaved edit mode changes
window.addEventListener('beforeunload', (e) => {
    if (isEditModeActive() || appMode.isBusy()) {
        e.preventDefault();
        e.returnValue = '';
    }
});
// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
const toastEl = document.getElementById('toast');
const toastController = FD.UIShellService.createToastController(toastEl);
let lastToast = null;
function showToast(message, type) {
    lastToast = { message: String(message || ''), type: String(type || ''), at: new Date().toISOString() };
    toastController.show(message, type);
}
function showInfoPopup(title, message) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.42);z-index:900;';
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 32px));background:#fff;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);z-index:901;padding:22px;text-align:center;';
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.cssText = 'margin:0 0 10px;font-size:20px;line-height:1.25;color:#1f2933;';
    const body = document.createElement('p');
    body.textContent = message;
    body.style.cssText = 'margin:0 0 18px;font-size:15px;line-height:1.45;color:#4b5563;';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Sluiten';
    button.style.cssText = 'border:0;border-radius:8px;background:#1a73e8;color:#fff;font-weight:700;font-size:16px;padding:10px 22px;cursor:pointer;';
    const close = () => {
        overlay.remove();
        popup.remove();
    };
    button.addEventListener('click', close);
    overlay.addEventListener('click', close);
    popup.append(heading, body, button);
    document.body.append(overlay, popup);
    button.focus();
}
function normalizeRemoteVersion(data) {
    const version = String(data?.version || '').trim();
    const cache = String(data?.cache || '').trim();
    const normalizedVersion = version || cacheVersionToVersion(cache);
    const normalizedCache = normalizedVersion ? envCacheNameForVersion(normalizedVersion) : cache;
    if (!normalizedCache || !normalizedVersion)
        return null;
    return {
        version: normalizedVersion,
        cache: normalizedCache,
    };
}
function setAppUpdateAvailable(update) {
    pendingAppUpdate = update || null;
    if (!appUpdateButton)
        return;
    appUpdateButton.hidden = !pendingAppUpdate;
    appUpdateButton.title = pendingAppUpdate
        ? `Nieuwe versie ${pendingAppUpdate.version} beschikbaar`
        : '';
    requestAnimationFrame(updateTopbarHeight);
}
function appUpdateCheckUrl() {
    const url = new URL(CONFIG.versionCheckUrl, window.location.href);
    url.searchParams.set('_', String(Date.now()));
    return url.toString();
}
function appVersionPattern(version) {
    const escapedVersion = String(version || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`APP_VERSION\\s*=\\s*['"]${escapedVersion}['"]`);
}
function cacheVersionPattern(name, version) {
    const escapedVersion = String(version || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${name}\\s*(?::|=)\\s*['"]fd(?:-[a-z0-9-]+)?-v${escapedVersion}['"]`, 'i');
}
function assetVersionReady(source, cacheName, version) {
    return appVersionPattern(version).test(source || '') ||
        cacheVersionPattern(cacheName, version).test(source || '');
}
function appAssetCheckUrl(path, version) {
    const url = new URL(path, window.location.href);
    if (version && path !== 'index.html' && path !== 'sw.js') {
        url.searchParams.set('v', version);
    }
    url.searchParams.set('_', String(Date.now()));
    return url.toString();
}
function indexHtmlReady(indexText, version) {
    if (!indexText || !version)
        return false;
    if (!indexText.includes(`v${version}`))
        return false;
    if (!indexText.includes(`app.css?v=${version}`))
        return false;
    return APP_SHELL_SCRIPTS.every(script => indexText.includes(`${script}?v=${version}`));
}
function appCssReady(cssText, version) {
    return Boolean(cssText && version && cssText.includes(`admin-dashboard-tokens.css?v=${version}`));
}
async function remoteDeploymentReady(remote) {
    if (!remote?.cache || !remote?.version)
        return false;
    try {
        const assets = [
            'index.html',
            ...APP_SHELL_STYLES,
            ...APP_SHELL_SCRIPTS,
            'sw.js',
        ];
        const responses = await Promise.all(assets.map(asset => fetch(appAssetCheckUrl(asset, remote.version), {
            cache: 'no-store',
            credentials: 'same-origin',
        })));
        if (responses.some(response => !response.ok))
            return false;
        const texts = await Promise.all(responses.map(response => response.text()));
        const textByAsset = new Map(assets.map((asset, index) => [asset, texts[index]]));
        return indexHtmlReady(textByAsset.get('index.html'), remote.version) &&
            appCssReady(textByAsset.get('app.css'), remote.version) &&
            assetVersionReady(textByAsset.get('app-01-config-state.js'), 'offlineCacheVersion', remote.version) &&
            assetVersionReady(textByAsset.get('sw.js'), 'CACHE_NAME', remote.version);
    }
    catch (err) {
        return false;
    }
}
async function checkForAppUpdate() {
    if (navigator.onLine === false)
        return false;
    try {
        const response = await fetch(appUpdateCheckUrl(), {
            cache: 'no-store',
            credentials: 'same-origin',
        });
        if (!response.ok)
            return false;
        const remote = normalizeRemoteVersion(await response.json());
        const available = Boolean(remote && remote.cache !== CONFIG.offlineCacheVersion);
        const ready = available ? await remoteDeploymentReady(remote) : false;
        setAppUpdateAvailable(ready ? remote : null);
        return ready;
    }
    catch (err) {
        return false;
    }
}
function showAppUpdateDialog() {
    if (!pendingAppUpdate)
        return;
    if (!appMode.isInteractiveView()) {
        showToast('Rond eerst je bewerking af voordat je bijwerkt', 'error');
        return;
    }
    if (appUpdateMessage) {
        appUpdateMessage.textContent = `Versie ${pendingAppUpdate.version} is beschikbaar. Bijwerken duurt een paar seconden.`;
    }
    appUpdateDialog.show();
}
