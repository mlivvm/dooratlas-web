(function (global) {
    const FD = global.FD = global.FD || {};
    const location = global.location || {};
    const hostname = String(location.hostname || '');
    const isLocalHost = !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
    const LIVE_API = 'https://api.datasidekick.nl';
    const LOCAL_API = 'http://127.0.0.1:8000';
    const defaults = {
        environment: isLocalHost ? 'local' : 'live',
        storagePrefix: isLocalHost ? 'da_local_' : 'da_live_',
        cachePrefix: isLocalHost ? 'da-local-v' : 'da-live-v',
        workerApiBaseUrl: isLocalHost ? LOCAL_API : LIVE_API,
        workerApiHostname: isLocalHost ? '127.0.0.1' : 'api.datasidekick.nl',
        jotformMode: 'disabled',
        jotformForms: {
            inspection: { label: 'Opname', formId: 'dooratlas-m0-opname', disabled: false },
            maintenance: { label: 'Onderhoud', formId: 'dooratlas-m0-onderhoud', disabled: false },
        },
        loginEmailNotificationsEnabled: false,
    };
    const existing = global.FD_ENV_CONFIG && typeof global.FD_ENV_CONFIG === 'object'
        ? global.FD_ENV_CONFIG
        : {};
    const config = { ...defaults, ...existing };
    function storageKey(key) {
        const text = String(key || '');
        const prefix = String(config.storagePrefix || '');
        if (!prefix || !text)
            return text;
        if (text.startsWith(prefix))
            return text;
        if (text.startsWith('fd_'))
            return `${prefix}${text.slice(3)}`;
        return `${prefix}${text}`;
    }
    function cacheNameForVersion(version) {
        const value = String(version || '').trim();
        return value ? `${String(config.cachePrefix || 'da-v')}${value}` : '';
    }
    function cacheVersionToVersion(cacheName) {
        const match = String(cacheName || '').match(/^da(?:-[a-z0-9-]+)?-v(\d+\.\d+\.\d+)$/i);
        return match ? match[1] : '';
    }
    config.storageKey = storageKey;
    config.cacheNameForVersion = cacheNameForVersion;
    config.cacheVersionToVersion = cacheVersionToVersion;
    global.FD_ENV_CONFIG = config;
    FD.Env = {
        config,
        storageKey,
        cacheNameForVersion,
        cacheVersionToVersion,
    };
})(typeof self !== 'undefined'
    ? self
    : window);
