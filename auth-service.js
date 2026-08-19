(function (global) {
    const FD = global.FD = global.FD || {};
    const S = FD.AuthSession;
    FD.AuthService = {
        clearLockout: S.clearLockout,
        clearSession: S.clearSession,
        createAuthController: FD.AuthController.createAuthController,
        getAttempts: S.getAttempts,
        getLockoutMinutes: S.getLockoutMinutes,
        isLockedOut: S.isLockedOut,
        isRememberPasswordEnabled: S.isRememberSessionEnabled,
        isRememberSessionEnabled: S.isRememberSessionEnabled,
        isSessionValid: S.isSessionValid,
        recordSuccessfulLogin: S.recordSuccessfulLogin,
    };
})(window);
