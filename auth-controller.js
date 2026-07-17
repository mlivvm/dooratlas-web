(function (global) {
    const FD = global.FD = global.FD || {};
    const S = FD.AuthSession;
    const N = FD.AuthNotifications;
    function createAuthController({ loginConfig, appConfig, elements, logoutControls, modeController, modes, emailConfig = {}, emailjsClient = global.emailjs, hideTopbarMenu = () => { }, showToast = () => { }, onShowApp = () => { }, onLogout = () => { }, onSessionExpired = () => { }, logger = console, }) {
        let bound = false;
        let lockoutTimer = null;
        const logoutDialog = FD.UIShellService.createPopupPair({
            overlayEl: logoutControls.overlay,
            popupEl: logoutControls.popup,
        });
        function initEmail() {
            if (emailConfig.enabled === false)
                return;
            if (emailConfig.publicKey && emailjsClient?.init) {
                emailjsClient.init(emailConfig.publicKey);
            }
        }
        function notifyLogin(type, attempts) {
            if (emailConfig.enabled === false)
                return;
            N.sendLoginNotification({
                emailjsClient,
                serviceId: emailConfig.serviceId,
                templateId: emailConfig.templateId,
                type,
                attempts,
                timeZone: appConfig?.appTimeZone || 'Europe/Amsterdam',
                logger,
            });
        }
        function hideSplash() {
            if (elements.splashScreen)
                elements.splashScreen.style.display = 'none';
        }
        function restoreRememberSession() {
            const keys = S.authKeys(loginConfig);
            elements.rememberCheckbox.checked = S.isRememberSessionEnabled(loginConfig);
            if (elements.usernameInput) {
                elements.usernameInput.value = global.localStorage.getItem(keys.lastUsernameKey) ||
                    (loginConfig.allowLegacyMigration === false ? '' : global.localStorage.getItem(S.LAST_USERNAME_KEY)) ||
                    'admin';
            }
        }
        function setLoginEnabled(enabled) {
            elements.loginButton.disabled = !enabled;
            elements.passwordInput.disabled = !enabled;
            if (elements.passwordToggleButton)
                elements.passwordToggleButton.disabled = !enabled;
            if (elements.usernameInput)
                elements.usernameInput.disabled = !enabled;
        }
        function setPasswordVisible(visible) {
            if (!elements.passwordInput || !elements.passwordToggleButton)
                return;
            elements.passwordInput.type = visible ? 'text' : 'password';
            elements.passwordToggleButton.classList.toggle('is-visible', visible);
            elements.passwordToggleButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
            const label = visible ? 'Wachtwoord verbergen' : 'Wachtwoord tonen';
            elements.passwordToggleButton.setAttribute('aria-label', label);
            elements.passwordToggleButton.title = label;
        }
        function togglePasswordVisibility() {
            setPasswordVisible(elements.passwordInput?.type === 'password');
            elements.passwordInput?.focus();
        }
        function clearLockoutTimer() {
            if (lockoutTimer)
                global.clearTimeout(lockoutTimer);
            lockoutTimer = null;
        }
        function needsWorkerSession() {
            return FD.DataService?.isWorkerSessionAuthEnabled?.(appConfig) ||
                FD.DataService?.isWorkerStatusWriteEnabled?.(appConfig) ||
                FD.DataService?.isWorkerFloorplanWriteEnabled?.(appConfig) ||
                FD.DataService?.isWorkerUploadWriteEnabled?.(appConfig);
        }
        function hasValidWorkerSession() {
            const keys = S.authKeys(loginConfig);
            S.migrateLegacyWorkerSession(loginConfig);
            try {
                const sessions = [global.localStorage, global.sessionStorage];
                return sessions.some(storage => {
                    const token = storage.getItem(keys.workerSessionTokenKey);
                    const expiresAt = storage.getItem(keys.workerSessionExpiresKey);
                    if (!token || !expiresAt)
                        return false;
                    const expiresTime = Date.parse(expiresAt);
                    return Number.isFinite(expiresTime) && expiresTime > Date.now() + 60000;
                });
            }
            catch {
                return false;
            }
        }
        function hasPersistentStoredLogin() {
            try {
                return global.localStorage.getItem(loginConfig.tokenKey) === S.AUTHENTICATED &&
                    S.isRememberSessionEnabled(loginConfig);
            }
            catch {
                return false;
            }
        }
        async function ensureWorkerSessionForStoredLogin() {
            if (!needsWorkerSession())
                return true;
            if (!hasPersistentStoredLogin())
                return hasValidWorkerSession();
            if (global.navigator?.onLine === false && hasValidWorkerSession())
                return true;
            try {
                await FD.DataService.refreshWorkerSessionUser(appConfig, { persistent: true });
                await FD.DataService.renewWorkerSession(appConfig, { persistent: true });
                return true;
            }
            catch (err) {
                logger.warn('Worker sessie hernieuwen mislukt:', err);
                return false;
            }
        }
        function checkLockoutState() {
            clearLockoutTimer();
            if (!S.isLockedOut(loginConfig)) {
                setLoginEnabled(true);
                return;
            }
            elements.errorEl.textContent = `Geblokkeerd. Probeer opnieuw over ${S.getLockoutMinutes(loginConfig)} minuten.`;
            setLoginEnabled(false);
            lockoutTimer = global.setTimeout(() => {
                if (!S.isLockedOut(loginConfig)) {
                    setLoginEnabled(true);
                    elements.errorEl.textContent = '';
                }
                else {
                    checkLockoutState();
                }
            }, 30000);
        }
        function showLoginScreen({ message = '', clearPassword = false, restoreRemember = false } = {}) {
            hideSplash();
            modeController.enter(modes.LOGIN);
            elements.appContainer.style.display = 'none';
            elements.loginScreen.style.display = 'flex';
            if (clearPassword)
                elements.passwordInput.value = '';
            elements.errorEl.textContent = message;
            elements.loginButton.disabled = false;
            elements.loginButton.textContent = 'Inloggen';
            elements.passwordInput.disabled = false;
            if (elements.usernameInput)
                elements.usernameInput.disabled = false;
            if (restoreRemember)
                restoreRememberSession();
            checkLockoutState();
        }
        async function handleLogin() {
            if (S.isLockedOut(loginConfig)) {
                elements.errorEl.textContent = `Geblokkeerd. Probeer opnieuw over ${S.getLockoutMinutes(loginConfig)} minuten.`;
                return;
            }
            const username = (elements.usernameInput?.value || '').trim().toLowerCase();
            const password = elements.passwordInput.value;
            if (!username || !password) {
                elements.errorEl.textContent = 'Vul gebruiker en wachtwoord in.';
                return;
            }
            elements.loginButton.disabled = true;
            elements.loginButton.textContent = 'Controleren...';
            const rememberSession = elements.rememberCheckbox.checked;
            if (needsWorkerSession()) {
                if (global.navigator?.onLine === false) {
                    if (!hasValidWorkerSession()) {
                        elements.loginButton.disabled = false;
                        elements.loginButton.textContent = 'Inloggen';
                        elements.errorEl.textContent = 'Maak eerst online verbinding om een server-sessie te starten.';
                        return;
                    }
                }
                else {
                    try {
                        await FD.DataService.loginWorkerSession(appConfig, username, password, { persistent: rememberSession });
                    }
                    catch (err) {
                        elements.loginButton.disabled = false;
                        elements.loginButton.textContent = 'Inloggen';
                        if (err?.status === 429)
                            elements.errorEl.textContent = 'Te veel loginpogingen via server. Probeer later opnieuw.';
                        else if (err?.status === 403)
                            elements.errorEl.textContent = 'Account is uitgeschakeld.';
                        else
                            elements.errorEl.textContent = 'Onjuiste gebruiker of wachtwoord.';
                        logger.warn('Worker sessie-login mislukt:', err);
                        return;
                    }
                }
            }
            else if (global.navigator?.onLine === false) {
                showToast('Offline ingelogd', 'success');
            }
            const { priorAttempts } = S.recordSuccessfulLogin(loginConfig, rememberSession);
            global.localStorage.setItem(S.authKeys(loginConfig).lastUsernameKey, username);
            elements.loginButton.textContent = 'Inloggen';
            notifyLogin('Succesvol ingelogd', priorAttempts > 0 ? priorAttempts + ' foute pogingen vooraf' : '0');
            onShowApp();
        }
        async function resumeStoredSession() {
            hideSplash();
            if (!(await ensureWorkerSessionForStoredLogin())) {
                await clearInvalidSession();
                showLoginScreen({ message: 'Log opnieuw in voor server-sessie.', restoreRemember: true });
                return;
            }
            onShowApp();
        }
        async function clearInvalidSession() {
            S.clearSession(loginConfig);
            FD.DataService?.clearWorkerSession?.(appConfig);
            try {
                await onSessionExpired();
            }
            catch (err) {
                logger.error?.('Sessie-cleanup mislukt:', err);
            }
        }
        function showLogoutConfirm() {
            hideTopbarMenu();
            logoutDialog.show();
        }
        function hideLogoutConfirm() {
            logoutDialog.hide();
        }
        async function logout() {
            try {
                await FD.DataService?.logoutWorkerSession?.(appConfig);
            }
            catch (err) {
                logger.warn?.('Serversessie intrekken mislukt:', err);
            }
            finally {
                S.clearSession(loginConfig);
                FD.DataService?.clearWorkerSession?.(appConfig);
                clearLockoutTimer();
                hideLogoutConfirm();
                notifyLogin('Uitgelogd', '-');
                try {
                    await onLogout();
                }
                catch (err) {
                    logger.error?.('Uitlog-cleanup mislukt:', err);
                }
                finally {
                    showLoginScreen({ clearPassword: true, restoreRemember: true });
                }
            }
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            initEmail();
            restoreRememberSession();
            elements.loginButton.addEventListener('click', handleLogin);
            elements.passwordToggleButton?.addEventListener('click', togglePasswordVisibility);
            if (elements.usernameInput) {
                elements.usernameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter')
                        handleLogin();
                });
            }
            elements.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter')
                    handleLogin();
            });
            logoutControls.openButton.addEventListener('click', showLogoutConfirm);
            logoutControls.confirmButton.addEventListener('click', logout);
            logoutControls.cancelButton.addEventListener('click', hideLogoutConfirm);
            logoutControls.overlay.addEventListener('click', hideLogoutConfirm);
            checkLockoutState();
        }
        async function start() {
            if (S.isSessionValid(loginConfig)) {
                await resumeStoredSession();
            }
            else {
                await clearInvalidSession();
                showLoginScreen({ restoreRemember: true });
            }
        }
        return { bind, start, showLoginScreen, logout };
    }
    FD.AuthController = {
        createAuthController,
    };
})(window);
