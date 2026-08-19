(function (global) {
    const FD = global.FD = global.FD || {};
    const candidatePrefix = 'dooratlas-opname-projectcode-candidate';
    const decisionPrefix = 'dooratlas-opname-projectcode-decision';
    function keyFor(prefix, scope) {
        const value = String(scope || '').trim();
        return value ? `${prefix}:${encodeURIComponent(value)}` : '';
    }
    function browserStorage() {
        return {
            candidate(scope) {
                const key = keyFor(candidatePrefix, scope);
                if (!key)
                    return '';
                try {
                    return global.localStorage.getItem(key) || '';
                }
                catch {
                    return '';
                }
            },
            setCandidate(scope, projectCode) {
                const key = keyFor(candidatePrefix, scope);
                if (!key)
                    return;
                try {
                    global.localStorage.setItem(key, projectCode);
                }
                catch { /* opslag is optioneel */ }
            },
            decision(scope) {
                const key = keyFor(decisionPrefix, scope);
                if (!key)
                    return '';
                try {
                    return global.sessionStorage.getItem(key) || '';
                }
                catch {
                    return '';
                }
            },
            choose(scope, apply) {
                const key = keyFor(decisionPrefix, scope);
                if (!key)
                    return;
                try {
                    global.sessionStorage.setItem(key, apply ? 'yes' : 'no');
                }
                catch { /* opslag is optioneel */ }
            },
        };
    }
    let storage = browserStorage();
    function scopeValue(scope) {
        return String(scope || '').trim();
    }
    function candidate(scope) {
        const value = scopeValue(scope);
        if (!value)
            return '';
        try {
            return String(storage.candidate(value) || '').trim();
        }
        catch {
            return '';
        }
    }
    function setCandidate(scope, projectCode) {
        const value = scopeValue(scope);
        if (!value)
            return;
        try {
            storage.setCandidate(value, String(projectCode || '').trim());
        }
        catch { /* opslag is optioneel */ }
    }
    function decision(scope) {
        const value = scopeValue(scope);
        if (!value)
            return '';
        try {
            return String(storage.decision(value) || '').trim();
        }
        catch {
            return '';
        }
    }
    function choose(scope, apply) {
        const value = scopeValue(scope);
        if (!value)
            return;
        try {
            storage.choose(value, apply);
        }
        catch { /* opslag is optioneel */ }
    }
    function configureStorage(next) {
        storage = next || browserStorage();
    }
    function get(scope) { return decision(scope) === 'yes' ? candidate(scope) : ''; }
    function shouldPrompt(scope) { return Boolean(candidate(scope)) && !decision(scope); }
    FD.OpnameProjectCodePrefill = {
        candidate, choose, configureStorage, get, setCandidate, shouldPrompt,
    };
})(window);
