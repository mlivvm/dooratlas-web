(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    const S = C.requestSupport;
    function isCsrfInvalid(error) {
        return Number(error?.status) === 403 && error?.code === 'csrf_invalid';
    }
    async function recoverCsrfSession(config) {
        const priorUserId = Number(C.sessionUserId?.() || 0);
        const session = await requestJson(config, '/api/session/me', {
            notifySessionExpired: false,
            csrfRecovery: false,
        });
        const nextUserId = Number(session?.user_id || 0);
        if (!nextUserId || (priorUserId && priorUserId !== nextUserId)) {
            throw C.workerError(401, 'session_changed');
        }
        const info = C.getWorkerSessionInfo(config);
        C.storeSession(config, session, { persistent: info.storageType !== 'session' });
    }
    async function failedRequest(config, path, method, options, error, retry) {
        let nextError = error;
        if (isCsrfInvalid(error) && options.csrf) {
            if (options.csrfRecovery === false) {
                nextError = C.workerError(401, 'session_changed');
            }
            else {
                try {
                    await recoverCsrfSession(config);
                    return retry();
                }
                catch (recoveryError) {
                    nextError = recoveryError;
                }
            }
        }
        if (path !== '/api/auth/login' && options.notifySessionExpired !== false) {
            await C.notifySessionExpired(nextError, { path, method });
        }
        throw nextError;
    }
    async function requestJson(config, path, options = {}) {
        const generation = C.sessionGeneration();
        const method = String(options.method || 'GET');
        const headers = { Accept: 'application/json', ...(options.headers || {}) };
        const init = { method, cache: 'no-store', credentials: 'include', signal: options.signal, headers };
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }
        if (options.csrf)
            S.applyCsrf(headers);
        const response = await fetch(S.apiUrl(config, path), init);
        const payload = await S.readResponsePayload(response);
        S.assertSessionGeneration(generation);
        if (!response.ok)
            return failedRequest(config, path, method, options, S.responseError(response.status, payload), () => requestJson(config, path, { ...options, csrfRecovery: false }));
        return payload;
    }
    async function requestTextResponse(config, path, options = {}) {
        const generation = C.sessionGeneration();
        const response = await fetch(S.apiUrl(config, path), {
            method: 'GET', cache: 'no-store', credentials: 'include', signal: options.signal,
            headers: { Accept: 'image/svg+xml,text/plain' },
        });
        const text = await response.text();
        S.assertSessionGeneration(generation);
        if (!response.ok)
            return failedRequest(config, path, 'GET', options, S.responseError(response.status, text ? { detail: text } : null), () => requestTextResponse(config, path, { ...options, csrfRecovery: false }));
        return { text, headers: response.headers };
    }
    async function requestText(config, path, options = {}) {
        return (await requestTextResponse(config, path, options)).text;
    }
    async function requestRawJson(config, path, options = {}) {
        const generation = C.sessionGeneration();
        const method = String(options.method || 'PUT');
        const headers = { Accept: 'application/json', 'Content-Type': options.contentType || 'application/octet-stream', ...(options.headers || {}) };
        if (options.csrf)
            S.applyCsrf(headers);
        const init = { method, cache: 'no-store', credentials: 'include', signal: options.signal, headers, body: options.body };
        const response = await fetch(S.apiUrl(config, path), init);
        const payload = await S.readResponsePayload(response);
        S.assertSessionGeneration(generation);
        if (!response.ok)
            return failedRequest(config, path, method, options, S.responseError(response.status, payload), () => requestRawJson(config, path, { ...options, csrfRecovery: false }));
        return payload;
    }
    async function loginWorkerSession(config, username, password, options = {}) {
        const session = await requestJson(config, '/api/auth/login', { method: 'POST', body: { email: username, password }, signal: options.signal });
        C.storeSession(config, session, { persistent: options.persistent !== false });
        return session;
    }
    async function logoutWorkerSession(config, options = {}) {
        return requestJson(config, '/api/auth/logout', { method: 'POST', csrf: true, signal: options.signal, notifySessionExpired: false });
    }
    async function refreshWorkerSessionUser(config, options = {}) {
        try {
            const session = await requestJson(config, '/api/session/me', { signal: options.signal, notifySessionExpired: false });
            const info = C.getWorkerSessionInfo(config);
            C.storeSession(config, session, { persistent: info.storageType !== 'session' });
            return session;
        }
        catch (error) {
            await C.notifySessionExpired(error, { path: '/api/session/me', method: 'GET' });
            throw error;
        }
    }
    async function renewWorkerSession(config, options = {}) {
        const session = await requestJson(config, '/api/auth/refresh', { method: 'POST', csrf: true, signal: options.signal });
        const info = C.getWorkerSessionInfo(config);
        C.storeSession(config, session, { persistent: info.storageType !== 'session' });
        return session;
    }
    async function saveMapModePreference(config, mapMode) {
        const session = await requestJson(config, '/api/session/map-mode', { method: 'PUT', csrf: true, body: { map_mode: mapMode } });
        const info = C.getWorkerSessionInfo(config);
        C.storeSession(config, session, { persistent: info.storageType !== 'session' });
        return session;
    }
    Object.assign(C, { requestJson, requestRawJson, requestText, requestTextResponse });
    FD.DataServiceRequests = { loginWorkerSession, logoutWorkerSession, refreshWorkerSessionUser, renewWorkerSession, saveMapModePreference };
})(window);
