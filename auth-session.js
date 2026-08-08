(function (global) {
    const FD = global.FD = global.FD || {};
    const AUTHENTICATED = 'authenticated';
    const LEGACY_DIRECT_TOKEN_KEY = ['fd', 'github', 'token'].join('_');
    const REMEMBER_SESSION_KEY = 'fd_remember_session';
    const LEGACY_REMEMBER_KEY = 'fd_remember_pw';
    const SAVED_PASSWORD_KEY = 'fd_saved_password';
    const WORKER_SESSION_TOKEN_KEY = 'fd_worker_session_token';
    const WORKER_SESSION_EXPIRES_KEY = 'fd_worker_session_expires_at';
    const WORKER_SESSION_USER_KEY = 'fd_worker_session_user';
    const LAST_USERNAME_KEY = 'fd_login_username';
    const AUTH_TOKEN_KEY = 'fd_auth_token';
    const AUTH_TOKEN_TIME_KEY = 'fd_auth_time';
    function authKeys(config = {}) {
        return {
            rememberSessionKey: config.rememberSessionKey || REMEMBER_SESSION_KEY,
            legacyRememberKey: config.legacyRememberKey || LEGACY_REMEMBER_KEY,
            savedPasswordKey: config.savedPasswordKey || SAVED_PASSWORD_KEY,
            workerSessionTokenKey: config.workerSessionTokenKey || WORKER_SESSION_TOKEN_KEY,
            workerSessionExpiresKey: config.workerSessionExpiresKey || WORKER_SESSION_EXPIRES_KEY,
            workerSessionUserKey: config.workerSessionUserKey || WORKER_SESSION_USER_KEY,
            lastUsernameKey: config.lastUsernameKey || LAST_USERNAME_KEY,
            legacyTokenKey: config.legacyTokenKey || AUTH_TOKEN_KEY,
            legacyTokenTimeKey: config.legacyTokenTimeKey || AUTH_TOKEN_TIME_KEY,
        };
    }
    function removeStorageItem(storage, key) {
        if (key)
            storage.removeItem(key);
    }
    function isStorageLike(value) {
        return Boolean(value && typeof value.getItem === 'function' && typeof value.setItem === 'function');
    }
    function migrateKey(local, session, fromKey, toKey, { removeSource = true } = {}) {
        if (!fromKey || !toKey || fromKey === toKey)
            return;
        [local, session].forEach(storage => {
            const value = storage.getItem(fromKey);
            if (value !== null && storage.getItem(toKey) === null)
                storage.setItem(toKey, value);
            if (removeSource)
                storage.removeItem(fromKey);
        });
    }
    function getAttempts(config, storage = global.localStorage) {
        return parseInt(storage.getItem(config.attemptsKey) || '0', 10);
    }
    function clearLockout(config, storage = global.localStorage) {
        storage.removeItem(config.lockoutKey);
        storage.removeItem(config.attemptsKey);
    }
    function isLockedOut(config, now = Date.now(), storage = global.localStorage) {
        const lockout = storage.getItem(config.lockoutKey);
        if (!lockout)
            return false;
        const remaining = parseInt(lockout, 10) - now;
        if (remaining <= 0) {
            clearLockout(config, storage);
            return false;
        }
        return true;
    }
    function getLockoutMinutes(config, now = Date.now(), storage = global.localStorage) {
        const lockout = storage.getItem(config.lockoutKey);
        if (!lockout)
            return 0;
        return Math.ceil((parseInt(lockout, 10) - now) / 60000);
    }
    function clearStoredPassword(config = {}, local = global.localStorage, session = global.sessionStorage) {
        const keys = authKeys(config);
        [keys.savedPasswordKey, SAVED_PASSWORD_KEY].forEach(key => {
            removeStorageItem(local, key);
            removeStorageItem(session, key);
        });
    }
    function clearLegacyAuth(config = {}, local = global.localStorage, session = global.sessionStorage) {
        local.removeItem(LEGACY_DIRECT_TOKEN_KEY);
        session.removeItem(LEGACY_DIRECT_TOKEN_KEY);
        clearStoredPassword(config, local, session);
    }
    function migrateLegacyWorkerSession(config, local = global.localStorage, session = global.sessionStorage) {
        if (config.allowLegacyMigration === false)
            return;
        const keys = authKeys(config);
        migrateKey(local, session, WORKER_SESSION_TOKEN_KEY, keys.workerSessionTokenKey);
        migrateKey(local, session, WORKER_SESSION_EXPIRES_KEY, keys.workerSessionExpiresKey);
        migrateKey(local, session, WORKER_SESSION_USER_KEY, keys.workerSessionUserKey);
    }
    function setWorkerSessionStorage(config, persistent, local = global.localStorage, session = global.sessionStorage) {
        const keys = authKeys(config);
        migrateLegacyWorkerSession(config, local, session);
        const localToken = local.getItem(keys.workerSessionTokenKey);
        const localExpiresAt = local.getItem(keys.workerSessionExpiresKey);
        const localUser = local.getItem(keys.workerSessionUserKey);
        const sessionToken = session.getItem(keys.workerSessionTokenKey);
        const sessionExpiresAt = session.getItem(keys.workerSessionExpiresKey);
        const sessionUser = session.getItem(keys.workerSessionUserKey);
        if (persistent) {
            if (!localToken && sessionToken)
                local.setItem(keys.workerSessionTokenKey, sessionToken);
            if (!localExpiresAt && sessionExpiresAt)
                local.setItem(keys.workerSessionExpiresKey, sessionExpiresAt);
            if (!localUser && sessionUser)
                local.setItem(keys.workerSessionUserKey, sessionUser);
            session.removeItem(keys.workerSessionTokenKey);
            session.removeItem(keys.workerSessionExpiresKey);
            session.removeItem(keys.workerSessionUserKey);
            return;
        }
        if (localToken)
            session.setItem(keys.workerSessionTokenKey, localToken);
        if (localExpiresAt)
            session.setItem(keys.workerSessionExpiresKey, localExpiresAt);
        if (localUser)
            session.setItem(keys.workerSessionUserKey, localUser);
        local.removeItem(keys.workerSessionTokenKey);
        local.removeItem(keys.workerSessionExpiresKey);
        local.removeItem(keys.workerSessionUserKey);
    }
    function migrateLegacyRemember(config = {}, local = global.localStorage, session = global.sessionStorage) {
        const keys = authKeys(config);
        if (config.allowLegacyMigration !== false && local.getItem(keys.legacyRememberKey) === '1') {
            local.setItem(keys.rememberSessionKey, '1');
        }
        if (keys.legacyRememberKey !== keys.rememberSessionKey) {
            local.removeItem(keys.legacyRememberKey);
            session.removeItem(keys.legacyRememberKey);
        }
        clearStoredPassword(config, local, session);
    }
    function clearSession(config, local = global.localStorage, session = global.sessionStorage) {
        const keys = authKeys(config);
        local.removeItem(config.tokenKey);
        local.removeItem(config.tokenTimeKey);
        local.removeItem(keys.workerSessionTokenKey);
        local.removeItem(keys.workerSessionExpiresKey);
        local.removeItem(keys.workerSessionUserKey);
        session.removeItem(config.tokenKey);
        session.removeItem(config.tokenTimeKey);
        session.removeItem(keys.workerSessionTokenKey);
        session.removeItem(keys.workerSessionExpiresKey);
        session.removeItem(keys.workerSessionUserKey);
        if (config.allowLegacyMigration !== false) {
            [keys.legacyTokenKey, keys.legacyTokenTimeKey, WORKER_SESSION_TOKEN_KEY, WORKER_SESSION_EXPIRES_KEY, WORKER_SESSION_USER_KEY].forEach(key => {
                local.removeItem(key);
                session.removeItem(key);
            });
        }
        clearLegacyAuth(config, local, session);
    }
    function recordSuccessfulLogin(config, rememberSession, now = Date.now(), local = global.localStorage, session = global.sessionStorage) {
        const priorAttempts = getAttempts(config, local);
        const target = rememberSession ? local : session;
        const other = rememberSession ? session : local;
        target.setItem(config.tokenKey, AUTHENTICATED);
        target.setItem(config.tokenTimeKey, now.toString());
        other.removeItem(config.tokenKey);
        other.removeItem(config.tokenTimeKey);
        clearLegacyAuth(config, local, session);
        clearLockout(config, local);
        setWorkerSessionStorage(config, rememberSession, local, session);
        if (rememberSession)
            local.setItem(authKeys(config).rememberSessionKey, '1');
        else
            local.removeItem(authKeys(config).rememberSessionKey);
        return { priorAttempts };
    }
    function migrateLegacySession(config, local = global.localStorage, session = global.sessionStorage) {
        const keys = authKeys(config);
        if (config.allowLegacyMigration !== false) {
            migrateKey(local, session, keys.legacyTokenKey, config.tokenKey);
            migrateKey(local, session, keys.legacyTokenTimeKey, config.tokenTimeKey);
            migrateKey(local, session, LAST_USERNAME_KEY, keys.lastUsernameKey);
        }
        migrateLegacyRemember(config, local, session);
        migrateLegacyWorkerSession(config, local, session);
        const rememberSession = isRememberSessionEnabled(config, local, session);
        if (local.getItem(config.tokenKey) === AUTHENTICATED && !rememberSession) {
            session.setItem(config.tokenKey, AUTHENTICATED);
            session.setItem(config.tokenTimeKey, local.getItem(config.tokenTimeKey) || Date.now().toString());
            local.removeItem(config.tokenKey);
            local.removeItem(config.tokenTimeKey);
            setWorkerSessionStorage(config, false, local, session);
        }
        else if (local.getItem(config.tokenKey) === AUTHENTICATED) {
            session.removeItem(config.tokenKey);
            session.removeItem(config.tokenTimeKey);
            setWorkerSessionStorage(config, true, local, session);
        }
        else if (session.getItem(config.tokenKey) === AUTHENTICATED) {
            setWorkerSessionStorage(config, false, local, session);
        }
        clearLegacyAuth(config, local, session);
    }
    function isSessionValid(config, local = global.localStorage, session = global.sessionStorage) {
        migrateLegacySession(config, local, session);
        const hasAuth = local.getItem(config.tokenKey) === AUTHENTICATED ||
            session.getItem(config.tokenKey) === AUTHENTICATED;
        clearLegacyAuth(config, local, session);
        if (!hasAuth) {
            clearSession(config, local, session);
            return false;
        }
        return true;
    }
    function isRememberSessionEnabled(config = {}, local = global.localStorage, session = global.sessionStorage) {
        if (isStorageLike(config)) {
            session = local || global.sessionStorage;
            local = config;
            config = {};
        }
        migrateLegacyRemember(config, local, session);
        return local.getItem(authKeys(config).rememberSessionKey) === '1';
    }
    FD.AuthSession = {
        AUTHENTICATED,
        LAST_USERNAME_KEY,
        authKeys,
        clearLockout,
        clearSession,
        getAttempts,
        getLockoutMinutes,
        isLockedOut,
        isRememberSessionEnabled,
        isSessionValid,
        migrateLegacyWorkerSession,
        recordSuccessfulLogin,
    };
})(window);
