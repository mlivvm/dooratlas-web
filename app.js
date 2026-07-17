// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================
verifyExpectedAppUpdateAfterReload();
startAppUpdateChecks();
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then(reg => {
        serviceWorkerRegistration = reg;
        reg.onupdatefound = () => {
            const installing = reg.installing;
            if (!installing)
                return;
            installing.onstatechange = () => {
                if (installing.state === 'activated' && navigator.serviceWorker.controller)
                    checkForAppUpdate();
            };
        };
    })
        .catch(err => console.warn('SW registration failed:', err));
}
Promise.resolve(authController?.start?.()).catch(err => {
    console.error('App-start mislukt:', err);
    authController?.showLoginScreen?.({ restoreRemember: true });
});
