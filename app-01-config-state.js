// ============================================================
// CONFIGURATION
// ============================================================
const APP_VERSION = '1.10.93';
const ENV_CONFIG = window.FD?.Env?.config || window.FD_ENV_CONFIG || {};
const DEFAULT_JOTFORM_FORM_ID = '250122093908351';
const DEFAULT_JOTFORM_FORMS = {
    maintenance: { label: 'Onderhoud', formId: DEFAULT_JOTFORM_FORM_ID, disabled: false },
    inspection: { label: 'Opname', formId: '243196137549364', disabled: false },
};
const envStorageKey = (key) => (typeof ENV_CONFIG.storageKey === 'function'
    ? ENV_CONFIG.storageKey(key)
    : key);
const envCacheNameForVersion = (version) => (typeof ENV_CONFIG.cacheNameForVersion === 'function'
    ? ENV_CONFIG.cacheNameForVersion(version)
    : `fd-v${version}`);
const cacheVersionToVersion = (cacheName) => (typeof ENV_CONFIG.cacheVersionToVersion === 'function'
    ? ENV_CONFIG.cacheVersionToVersion(cacheName)
    : String(cacheName || '').replace(/^fd(?:-[a-z0-9-]+)?-v/i, ''));
function normalizeConfiguredJotFormForms(envForms, fallbackFormId) {
    const source = envForms && typeof envForms === 'object' ? envForms : {};
    const forms = {};
    Object.entries(DEFAULT_JOTFORM_FORMS).forEach(([type, defaults]) => {
        const override = source[type] && typeof source[type] === 'object' ? source[type] : {};
        forms[type] = {
            label: String(override.label || defaults.label),
            formId: String(override.formId || (type === 'maintenance' ? fallbackFormId : '') || defaults.formId || '').trim(),
            disabled: Object.prototype.hasOwnProperty.call(override, 'disabled')
                ? Boolean(override.disabled)
                : Boolean(defaults.disabled),
        };
    });
    return forms;
}
const CONFIGURED_JOTFORM_FORMS = normalizeConfiguredJotFormForms(ENV_CONFIG.jotformForms, ENV_CONFIG.jotformFormId || DEFAULT_JOTFORM_FORM_ID);
const CONFIG = {
    environment: ENV_CONFIG.environment || 'live',
    storagePrefix: ENV_CONFIG.storagePrefix || '',
    svgBaseUrl: 'fd-floorplan://gallery/',
    svgUploadsUrl: 'fd-floorplan://uploads/',
    workerApiBaseUrl: ENV_CONFIG.workerApiBaseUrl || 'https://api.datasidekick.nl',
    workerReadProxyFlagKey: envStorageKey('fd_use_worker_read_proxy'),
    workerReadProxyEnabled: true,
    workerSessionAuthFlagKey: envStorageKey('fd_use_worker_auth'),
    workerSessionTokenKey: envStorageKey('fd_worker_session_token'),
    workerSessionExpiresKey: envStorageKey('fd_worker_session_expires_at'),
    workerSessionUserKey: envStorageKey('fd_worker_session_user'),
    workerStatusWriteFlagKey: envStorageKey('fd_use_worker_status_write'),
    workerStatusWriteEnabled: true,
    workerFloorplanWriteFlagKey: envStorageKey('fd_use_worker_floorplan_write'),
    workerFloorplanWriteEnabled: true,
    workerUploadWriteFlagKey: envStorageKey('fd_use_worker_upload_write'),
    workerUploadWriteEnabled: true,
    workerStatusWriteTestCustomer: '--- TEST ---',
    jotformBaseUrl: 'https://eu.jotform.com/',
    jotformFormId: CONFIGURED_JOTFORM_FORMS.maintenance.formId,
    jotformForms: CONFIGURED_JOTFORM_FORMS,
    jotformMode: ENV_CONFIG.jotformMode || 'live',
    loginEmailNotificationsEnabled: ENV_CONFIG.loginEmailNotificationsEnabled !== false,
    appTimeZone: 'Europe/Amsterdam',
    pollInterval: 30000,
    sessionHeartbeatInterval: 60000,
    adminActiveUsersPollInterval: 60000,
    jotformReturnRefreshInterval: 2000,
    jotformReturnRefreshMaxDuration: 90000,
    versionCheckUrl: 'version.json',
    versionCheckInterval: 15 * 60 * 1000,
    offlineCacheVersion: envCacheNameForVersion(APP_VERSION),
};
const APP_UPDATE_EXPECTED_CACHE_KEY = envStorageKey('fd_app_update_expected_cache'), APP_UPDATE_EXPECTED_VERSION_KEY = envStorageKey('fd_app_update_expected_version');
const APP_UPDATE_MESSAGE = 'FD_SKIP_WAITING';
const APP_SHELL_STYLES = ['app.css', 'admin-dashboard-tokens.css'];
const APP_SHELL_SCRIPTS = ['office.bundle.js'];
const COLORS = {
    todo: '#1a73e8',
    done: '#34a853',
    attention: '#d93025',
    checking: '#b8c0cc',
};
const OPACITY = {
    normal: '0.7',
    dimmed: '0.25',
    selected: '1.0',
};
// ============================================================
// STATE
// ============================================================
let customers = [];
let doorStatus = {};
let currentCustomer = null;
let currentFloorplan = null;
let selectedDoor = null;
let mapMode = 'opname';
let mapModeController = null;
let currentUser = null;
let customersLoading = false;
const AppModes = FD.ModeService.MODES;
const appMode = FD.ModeService.createModeController(AppModes.LOGIN);
const SESSION_CHECK_STALE_MS = 5 * 60 * 1000;
const SESSION_RENEW_WINDOW_MS = 60 * 60 * 1000;
let statusSync = null;
let jotformReturnRefreshTimer = null;
let jotformSubmissionLookupRetryTimer = null;
let sessionHeartbeatTimer = null;
let sessionHeartbeatInFlight = false;
let sessionCheckPromise = null;
let lastSessionCheckAt = 0;
let handlingExpiredSession = false;
let authController = null;
let adminActiveUsersPollTimer = null;
let adminActiveUsersInFlight = false;
let jotformFocusRefreshDoorId = null;
let jotformFocusRefreshFormType = 'maintenance';
let jotformFocusRefreshUntil = 0;
let jotformFocusBaselineSubmission = null;
const jotformManualNewFormHints = new Map();
let serviceWorkerRegistration = null;
let updateCheckTimer = null;
let pendingAppUpdate = null;
let doorActionController = null;
let jotformSubmissionCache = {
    key: '',
    ready: false,
    loading: false,
    submissions: {},
    checkedDoors: {},
    allChecked: false,
    requestId: 0,
    pending: null,
};
let doorCodeIndexState = {
    ready: false,
    loading: false,
    entries: [],
    byCode: new Map(),
    requestId: 0,
    pending: null,
    error: null,
};
let topbarFloorplanLocationFilter = '';
let adminDashboardState = {
    visible: false,
    loading: false,
    data: null,
    selectedKey: '',
    selectedCustomer: '',
    selectedLocation: '',
    searchQuery: '',
    doorQuery: '',
    doorOrder: 'asc',
    doorCustomerFilter: '',
    doorFloorplanFilter: '',
    activeTab: 'overview',
    selectedDoorKey: '',
    overviewMetric: 'attention',
    activity: [],
    activityLoading: false,
    activityError: '',
    activityUnavailable: false,
    activeUsers: null,
    previewKey: '',
    previewRequestId: 0,
    previewController: null,
    metadataRecord: null,
    bulkMode: false,
    bulkSelectedKeys: new Set(),
    lastUpdatedAt: '',
    loadError: '', doorIndexLoaded: false, doorIndexLoading: false, doorIndexError: '',
    conflicts: [],
    conflictsLoading: false,
    conflictsError: '',
    conflictsLoadedAt: 0,
    conflictConfirm: null,
    conflictResolvingId: 0,
    conflictPollTimer: null,
};
function setDocumentAppMode(mode) {
    document.documentElement.dataset.appMode = mode;
    document.body.dataset.appMode = mode;
}
function isEditModeActive() {
    return appMode.is(AppModes.EDIT);
}
setDocumentAppMode(appMode.current);
appMode.onTransition(({ to }) => setDocumentAppMode(to));
let pendingDoor = null;
// Pan & zoom
let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let hasMoved = false;
let startX = 0;
let startY = 0;
let lastPanX = 0;
let lastPanY = 0;
let initialPinchDist = 0;
let initialScale = 1;
let savedScale = 1;
let savedPanX = 0;
let savedPanY = 0;
let topbarFloorplanActionsLocked = false;
// ============================================================
// DOM REFERENCES
// ============================================================
const customerSelect = document.getElementById('customer-select');
const floorplanSelect = document.getElementById('floorplan-select');
const svgContainer = document.getElementById('svg-container');
const appContainer = document.getElementById('app-container');
const topbarEl = document.querySelector('.topbar');
const loadingEl = document.getElementById('loading');
const infoPanel = document.getElementById('info-panel');
const locationAddressBar = document.getElementById('location-address-bar');
const locationAddressName = document.getElementById('location-address-name');
const locationAddressText = document.getElementById('location-address-text');
const locationAddressNote = document.getElementById('location-address-note');
const doorNameEl = document.getElementById('door-name');
const doorStatusEl = document.getElementById('door-status');
const doorMetaEl = document.getElementById('door-detail-meta');
const btnJotformInspection = document.getElementById('btn-jotform-inspection');
const btnJotformMaintenance = document.getElementById('btn-jotform-maintenance');
const btnJotforms = {
    inspection: btnJotformInspection,
    maintenance: btnJotformMaintenance,
};
const btnJotform = btnJotformMaintenance;
const btnDone = document.getElementById('btn-done');
const btnClose = document.getElementById('btn-close');
const btnReset = document.getElementById('btn-reset');
const mapModeControl = document.getElementById('map-mode-control');
const btnMapMode = document.getElementById('btn-map-mode');
const mapModeLabel = document.getElementById('map-mode-label');
const mapModeMenu = document.getElementById('map-mode-menu');
const mapModeOptions = Array.from(document.querySelectorAll('[data-map-mode]'));
const statusCount = document.getElementById('status-count');
const btnPanelToggle = document.getElementById('btn-panel-toggle');
const sidePanel = document.getElementById('side-panel');
const sidePanelList = document.getElementById('side-panel-list');
const sidePanelHeader = document.getElementById('side-panel-header');
const sidePanelListView = document.getElementById('side-panel-list-view');
const sidePanelSecuritySummary = document.getElementById('side-panel-security-summary');
const securityTotalCount = document.getElementById('security-total-count');
const securityHighCount = document.getElementById('security-high-count');
const securityNormalCount = document.getElementById('security-normal-count');
const securityLowCount = document.getElementById('security-low-count');
const doorInspectorView = document.getElementById('door-inspector');
const doorInspectorBack = document.getElementById('door-inspector-back');
const doorInspectorCode = document.getElementById('door-inspector-code');
const doorInspectorName = document.getElementById('door-inspector-name');
const doorInspectorMeta = document.getElementById('door-inspector-meta');
const doorInspectorStatus = document.getElementById('door-inspector-status');
const doorInspectorLatest = document.getElementById('door-inspector-latest');
const doorInspectorActions = Array.from(document.querySelectorAll('[data-inspector-new]'));
const doorInspectorTabs = Array.from(document.querySelectorAll('[data-inspector-tab]'));
const doorInspectorHistory = document.getElementById('door-inspector-history');
const doorInspectorHistoryCount = document.getElementById('door-inspector-history-count');
const doorInspectorHistoryList = document.getElementById('door-inspector-history-list');
const doorInspectorBody = document.getElementById('door-inspector-body');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionLabel = document.getElementById('connection-label');
const accountIndicator = document.getElementById('account-indicator');
const accountLabel = document.getElementById('account-label');
const syncIndicator = document.getElementById('sync-indicator');
const syncLabel = document.getElementById('sync-label');
const appUpdateButton = document.getElementById('btn-app-update');
const appUpdateOverlay = document.getElementById('app-update-overlay');
const appUpdatePopup = document.getElementById('app-update-popup');
const appUpdateMessage = document.getElementById('app-update-message');
const appUpdateConfirmButton = document.getElementById('app-update-confirm');
const appUpdateLaterButton = document.getElementById('app-update-later');
const environmentBadges = [document.getElementById('login-environment-badge'), document.getElementById('topbar-environment-badge')].filter(Boolean);
const busyOverlayEl = document.getElementById('busy-overlay');
const btnDashboard = document.getElementById('btn-dashboard');
const btnTopbarMetadata = document.getElementById('btn-topbar-metadata');
const adminDashboardEl = document.getElementById('admin-dashboard');
const adminDashboardRefresh = document.getElementById('admin-dashboard-refresh');
const adminDashboardFreshness = document.getElementById('admin-dashboard-freshness');
const adminConflictNotice = document.getElementById('admin-conflict-notice');
const adminConflictNoticeText = document.getElementById('admin-conflict-notice-text');
const adminConflictOpen = document.getElementById('admin-conflict-open');
const adminConflictCount = document.getElementById('admin-conflict-count');
const adminConflictInbox = document.getElementById('admin-conflict-inbox');
const adminDashboardTabs = Array.from(document.querySelectorAll('[data-admin-tab]'));
const adminDashboardTabPanels = Array.from(document.querySelectorAll('[data-admin-panel]'));
const adminOverviewAttention = document.getElementById('admin-overview-attention');
const adminOverviewOpen = document.getElementById('admin-overview-open');
const adminOverviewKpiTitle = document.getElementById('admin-overview-kpi-title');
const adminOverviewKpiSubtitle = document.getElementById('admin-overview-kpi-subtitle');
const adminActivityList = document.getElementById('admin-activity-list');
const adminDashboardSearch = document.getElementById('admin-dashboard-search'), adminCustomerFilters = document.getElementById('admin-customer-filters');
