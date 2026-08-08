(function (global) {
    const FD = global.FD = global.FD || {};
    const SessionUser = FD.DataSessionUserService;
    const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
    const state = {
        floorplanCache: new Map(),
        csrfToken: null,
        sessionUserId: 0,
        sessionGeneration: 0,
        sessionExpiredHandler: null,
        sessionExpiredPromise: null,
    };
    function apiBase(config) {
        return String(config?.workerApiBaseUrl || 'https://api.datasidekick.nl').replace(/\/+$/, '');
    }
    function apiUrl(config, path) {
        const value = String(path || '');
        if (/^https?:\/\//i.test(value))
            return value;
        return apiBase(config) + value;
    }
    function workerError(status, code, details = null) {
        const error = new Error(code || 'Aanvraag mislukt.');
        error.status = status;
        error.code = code || '';
        error.details = details;
        return error;
    }
    function responseError(status, payload) {
        if (status === 401)
            return workerError(status, 'invalid_session', payload);
        const detail = payload?.detail || payload?.error || payload?.message;
        const validationMessage = Array.isArray(detail)
            ? detail.find((item) => typeof item?.msg === 'string')?.msg
            : '';
        if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
            const code = String(detail.code || payload?.code || '').trim();
            const message = String(detail.message || payload?.message || detail.detail || code || 'Aanvraag mislukt.');
            const error = workerError(status, message, detail);
            error.code = code || message;
            error.details = detail;
            return error;
        }
        const message = typeof detail === 'string' ? detail : (validationMessage || 'Aanvraag mislukt.');
        return workerError(status, message, payload);
    }
    function sessionKeys(config) {
        return {
            tokenKey: config?.workerSessionTokenKey || 'da_session_token',
            expiresKey: config?.workerSessionExpiresKey || 'da_session_expires_at',
            userKey: config?.workerSessionUserKey || 'da_session_user',
        };
    }
    function storagePair(persistent) {
        return {
            target: persistent === false ? global.sessionStorage : global.localStorage,
            other: persistent === false ? global.localStorage : global.sessionStorage,
        };
    }
    function readStoredSession(config) {
        const keys = sessionKeys(config);
        const stores = [global.localStorage, global.sessionStorage];
        for (const store of stores) {
            try {
                const token = store?.getItem(keys.tokenKey) || '';
                const expiresAt = store?.getItem(keys.expiresKey) || '';
                if (token)
                    return { token, expiresAt, storage: store };
            }
            catch { }
        }
        return { token: '', expiresAt: '', storage: null };
    }
    function isFresh(expiresAt) {
        const expiresTime = Date.parse(String(expiresAt || ''));
        return Number.isFinite(expiresTime) && expiresTime > Date.now() + 60000;
    }
    function storeSession(config, session, options = {}) {
        const keys = sessionKeys(config);
        state.csrfToken = session?.csrf_token || state.csrfToken;
        state.sessionUserId = Number(session?.user_id || state.sessionUserId || 0);
        const persistent = options.persistent !== false;
        const { target, other } = storagePair(persistent);
        const serverExpiresAt = String(session?.expires_at || session?.expiresAt || '');
        const expiresAt = Number.isFinite(Date.parse(serverExpiresAt))
            ? new Date(serverExpiresAt).toISOString()
            : new Date(Date.now() + SESSION_TTL_MS).toISOString();
        const token = `dooratlas:${session?.user_id || 'session'}`;
        const user = SessionUser.sessionUser(session);
        try {
            other?.removeItem(keys.tokenKey);
            other?.removeItem(keys.expiresKey);
            other?.removeItem(keys.userKey);
            target?.setItem(keys.tokenKey, token);
            target?.setItem(keys.expiresKey, expiresAt);
            target?.setItem(keys.userKey, JSON.stringify(user));
        }
        catch { }
        return { token, expiresAt, user };
    }
    function clearWorkerSession(config) {
        const keys = sessionKeys(config);
        state.csrfToken = null;
        state.sessionUserId = 0;
        state.sessionGeneration += 1;
        state.floorplanCache.clear();
        [global.localStorage, global.sessionStorage].forEach(store => {
            try {
                store?.removeItem(keys.tokenKey);
                store?.removeItem(keys.expiresKey);
                store?.removeItem(keys.userKey);
            }
            catch { }
        });
    }
    function getWorkerSessionInfo(config) {
        const session = readStoredSession(config);
        const expiresTime = Date.parse(session.expiresAt || '');
        const hasExpiresTime = Number.isFinite(expiresTime);
        return {
            token: session.token,
            expiresAt: session.expiresAt,
            expiresTime: hasExpiresTime ? expiresTime : 0,
            expiresInMs: hasExpiresTime ? expiresTime - Date.now() : 0,
            storageType: session.storage === global.sessionStorage ? 'session' : (session.storage ? 'local' : ''),
            hasToken: Boolean(session.token),
            fresh: Boolean(session.token && isFresh(session.expiresAt)),
        };
    }
    function getWorkerSessionUser(config) {
        const session = readStoredSession(config);
        if (!session.token || !session.storage || !isFresh(session.expiresAt))
            return null;
        try {
            return JSON.parse(session.storage.getItem(sessionKeys(config).userKey) || 'null');
        }
        catch {
            return null;
        }
    }
    function tenantIdFromTarget(target) {
        if (typeof target === 'number' || typeof target === 'string') {
            const tenantId = Number(target);
            return Number.isInteger(tenantId) && tenantId > 0 ? tenantId : 0;
        }
        if (!target || typeof target !== 'object')
            return 0;
        const source = target;
        const candidates = [
            source.tenantId,
            source.tenant_id,
            source.customer?.tenantId,
            source.customer?.tenant_id,
            source.floorplan?.tenantId,
            source.floorplan?.tenant_id,
        ];
        for (const candidate of candidates) {
            const tenantId = Number(candidate || 0);
            if (Number.isInteger(tenantId) && tenantId > 0)
                return tenantId;
        }
        return 0;
    }
    function hasAnyRole(config, allowedRoles) {
        const user = getWorkerSessionUser(config);
        if (!user)
            return false;
        if (user.isSuperadmin)
            return true;
        const allowed = new Set(allowedRoles);
        return (Array.isArray(user.memberships) ? user.memberships : [])
            .some((membership) => allowed.has(String(membership?.role || '').toLowerCase()));
    }
    function hasTenantRole(config, target, allowedRoles) {
        const user = getWorkerSessionUser(config);
        if (!user)
            return false;
        if (user.isSuperadmin)
            return true;
        const tenantId = tenantIdFromTarget(target);
        if (!tenantId)
            return false;
        const allowed = new Set(allowedRoles);
        return (Array.isArray(user.memberships) ? user.memberships : []).some((membership) => (Number(membership?.tenant_id || membership?.tenantId || 0) === tenantId &&
            allowed.has(String(membership?.role || '').toLowerCase())));
    }
    function canAuthor(config, target) {
        return hasTenantRole(config, target, ['da_admin', 'da_sales']);
    }
    function canStartAuthoring(config) {
        return hasAnyRole(config, ['da_admin', 'da_sales']);
    }
    function canEditMarkers(config, target) {
        return hasTenantRole(config, target, ['da_admin', 'da_sales', 'da_monteur']);
    }
    function canCreateInspection(config, target) {
        return hasTenantRole(config, target, ['da_admin', 'da_sales', 'da_monteur', 'da_beheer']);
    }
    function applyCsrf(headers) {
        if (!state.csrfToken)
            throw workerError(403, 'Beveiligingstoken ontbreekt. Log opnieuw in.');
        headers['X-CSRF-Token'] = state.csrfToken;
    }
    async function readResponsePayload(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : null;
        }
        catch {
            return text ? { detail: text } : null;
        }
    }
    function isSessionAuthError(err) {
        return Number(err?.status) === 401 ||
            ['invalid_session', 'session_required', 'worker_session_required'].includes(String(err?.code || err?.message || ''));
    }
    function setSessionExpiredHandler(handler) {
        state.sessionExpiredHandler = typeof handler === 'function' ? handler : null;
    }
    async function notifySessionExpired(err, context = {}) {
        if (!state.sessionExpiredHandler || !isSessionAuthError(err))
            return;
        if (state.sessionExpiredPromise)
            return state.sessionExpiredPromise;
        const handler = state.sessionExpiredHandler;
        state.sessionExpiredPromise = Promise.resolve().then(() => handler(err, context)).then(() => undefined);
        try {
            await state.sessionExpiredPromise;
        }
        finally {
            state.sessionExpiredPromise = null;
        }
    }
    function staleSessionError() {
        const error = workerError(0, 'session_changed');
        error.name = 'AbortError';
        return error;
    }
    function assertSessionGeneration(generation) {
        if (generation !== state.sessionGeneration)
            throw staleSessionError();
    }
    FD.DataServiceCore = {
        apiUrl,
        canAuthor,
        canStartAuthoring,
        canCreateInspection,
        canEditMarkers,
        clearWorkerSession,
        floorplanCache: state.floorplanCache,
        getWorkerSessionInfo,
        getWorkerSessionUser,
        isSessionAuthError,
        notifySessionExpired,
        sessionGeneration: () => state.sessionGeneration,
        sessionUserId: () => state.sessionUserId,
        setSessionExpiredHandler,
        storeSession,
        requestSupport: { apiUrl, applyCsrf, assertSessionGeneration, readResponsePayload, responseError },
        workerError,
    };
})(window);
