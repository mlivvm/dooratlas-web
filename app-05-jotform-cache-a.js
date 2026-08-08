async function refreshSelectedJotFormSubmission(target, key) {
    const doorId = selectedDoor;
    if (!doorId || !getDoorStatus(doorId)) {
        resetJotFormSubmissionCache();
        return null;
    }
    const requestId = jotformSubmissionCache.requestId + 1;
    const previousSubmissions = jotformSubmissionCache.key === key
        ? { ...(jotformSubmissionCache.submissions || {}) }
        : {};
    const previousCheckedDoors = jotformSubmissionCache.key === key
        ? { ...(jotformSubmissionCache.checkedDoors || {}) }
        : {};
    jotformSubmissionCache = {
        key,
        ready: false,
        loading: true,
        submissions: previousSubmissions,
        checkedDoors: previousCheckedDoors,
        allChecked: false,
        requestId,
        pending: null,
    };
    if (doorActionController?.updateJotFormButton) {
        doorActionController.updateJotFormButton();
        applyDoorActionPermissions();
    }
    const selectedFormTypes = jotFormFormTypes();
    const pending = Promise.all(selectedFormTypes.map(formType => (FD.DataService.findJotFormSubmission(CONFIG, {
        ...target,
        doorId,
        formType,
    }, {
        diagnostics: {
            purpose: 'jotform_submission_selected_lookup',
            background: true,
        },
    }).then(response => ({ formType, response }))))).then(results => {
        if (jotformSubmissionCache.requestId !== requestId || jotformSubmissionCache.key !== key)
            return null;
        const submissions = {
            ...(jotformSubmissionCache.submissions || {}),
        };
        const checkedDoors = {
            ...(jotformSubmissionCache.checkedDoors || {}),
        };
        let foundAny = false;
        let foundFocusForm = false;
        results.forEach(({ formType, response }) => {
            const type = normalizeJotFormFormType(response?.formType || formType);
            const submission = normalizeJotFormSubmission({ ...response, formType: type });
            if (response?.found && submission?.editUrl) {
                foundAny = true;
                if (type === jotformFocusRefreshFormType)
                    foundFocusForm = true;
                markJotFormChecked(checkedDoors, doorId, type);
                setJotFormSubmissionInMap(submissions, doorId, type, submission);
            }
            else {
                setJotFormSubmissionInMap(submissions, doorId, type, null);
                if (doorId === jotformFocusRefreshDoorId &&
                    type === jotformFocusRefreshFormType &&
                    Date.now() <= jotformFocusRefreshUntil) {
                    // Keep this one pending while the webhook catches up.
                }
                else {
                    markJotFormChecked(checkedDoors, doorId, type);
                }
            }
        });
        const waitingForFocusForm = doorId === jotformFocusRefreshDoorId && Date.now() <= jotformFocusRefreshUntil;
        if (foundFocusForm || !waitingForFocusForm) {
            clearJotFormSubmissionLookupRetry();
        }
        else if (!foundAny || !foundFocusForm) {
            scheduleJotFormSubmissionLookupRetry(doorId);
        }
        jotformSubmissionCache = {
            key,
            ready: true,
            loading: false,
            submissions,
            checkedDoors,
            allChecked: false,
            requestId,
            pending: null,
        };
        if (doorActionController?.updateJotFormButton) {
            doorActionController.updateJotFormButton();
            applyDoorActionPermissions();
        }
        refreshAllDoorColors();
        updateDoneButton();
        return jotformSubmissionCache.submissions;
    }).catch(err => {
        if (jotformSubmissionCache.requestId === requestId && jotformSubmissionCache.key === key) {
            jotformSubmissionCache = {
                key,
                ready: false,
                loading: false,
                submissions: previousSubmissions,
                checkedDoors: previousCheckedDoors,
                allChecked: false,
                requestId,
                pending: null,
            };
            if (doorActionController?.updateJotFormButton) {
                doorActionController.updateJotFormButton();
                applyDoorActionPermissions();
            }
            refreshAllDoorColors();
            updateDoneButton();
        }
        console.warn('JotForm editlink voor geselecteerde deur laden mislukt:', err);
        return null;
    });
    jotformSubmissionCache.pending = pending;
    return pending;
}
async function refreshJotFormSubmissionCache({ force = false } = {}) {
    if (!isJotFormLookupEnabled()) {
        resetJotFormSubmissionCache();
        return null;
    }
    const target = currentJotFormLookupTarget();
    const key = jotformSubmissionCacheKey(target);
    if (!target || !key || navigator.onLine === false || !canCreateInspectionCurrentFloorplan()) {
        resetJotFormSubmissionCache();
        return null;
    }
    if (!force && jotformSubmissionCache.key === key) {
        if (jotformSubmissionCache.ready)
            return jotformSubmissionCache.submissions;
        if (jotformSubmissionCache.pending)
            return jotformSubmissionCache.pending;
    }
    const supportsBatchLookup = await FD.DataService.supportsJotFormSubmissionBatch(CONFIG);
    if (!supportsBatchLookup) {
        return refreshSelectedJotFormSubmission(target, key);
    }
    const requestId = jotformSubmissionCache.requestId + 1;
    const previousSubmissions = jotformSubmissionCache.key === key
        ? { ...(jotformSubmissionCache.submissions || {}) }
        : {};
    const previousCheckedDoors = jotformSubmissionCache.key === key
        ? { ...(jotformSubmissionCache.checkedDoors || {}) }
        : {};
    jotformSubmissionCache = {
        key,
        ready: false,
        loading: true,
        submissions: previousSubmissions,
        checkedDoors: previousCheckedDoors,
        allChecked: false,
        requestId,
        pending: null,
    };
    if (doorActionController?.updateJotFormButton) {
        doorActionController.updateJotFormButton();
        applyDoorActionPermissions();
    }
    const pending = FD.DataService.findJotFormSubmissions(CONFIG, target, {
        diagnostics: {
            purpose: 'jotform_submission_batch_lookup',
            background: true,
        },
    }).then(response => {
        if (jotformSubmissionCache.requestId !== requestId || jotformSubmissionCache.key !== key)
            return null;
        jotformSubmissionCache = {
            key,
            ready: true,
            loading: false,
            submissions: normalizeJotFormSubmissionMap(response),
            checkedDoors: {},
            allChecked: true,
            requestId,
            pending: null,
        };
        if (doorActionController?.updateJotFormButton) {
            doorActionController.updateJotFormButton();
            applyDoorActionPermissions();
        }
        refreshAllDoorColors();
        updateDoneButton();
        return jotformSubmissionCache.submissions;
    }).catch(err => {
        if (jotformSubmissionCache.requestId === requestId && jotformSubmissionCache.key === key) {
            jotformSubmissionCache = {
                key,
                ready: false,
                loading: false,
                submissions: {},
                checkedDoors: {},
                allChecked: false,
                requestId,
                pending: null,
            };
            if (doorActionController?.updateJotFormButton) {
                doorActionController.updateJotFormButton();
                applyDoorActionPermissions();
            }
            refreshAllDoorColors();
            updateDoneButton();
        }
        console.warn('JotForm editlinks vooraf laden mislukt:', err);
        return null;
    });
    jotformSubmissionCache.pending = pending;
    return pending;
}
function markJotFormExternalOpen(context) {
    jotformFocusRefreshDoorId = context?.doorId || null;
    jotformFocusRefreshFormType = normalizeJotFormFormType(context?.formType);
    jotformFocusRefreshUntil = context?.doorId
        ? Date.now() + CONFIG.jotformReturnRefreshMaxDuration
        : 0;
    jotformFocusBaselineSubmission = context?.doorId
        ? getCachedJotFormSubmission(context.doorId, jotformFocusRefreshFormType)
        : null;
}
function saveJotFormReturnContext(openContext = {}) {
    if (!isJotFormLookupEnabled())
        return;
    const context = currentJotFormReturnContext(openContext.formType);
    if (!context)
        return;
    const saved = FD.DoorActionService.saveReturnContext(localStorage, JOTFORM_RETURN_CONTEXT_KEY, context);
    markJotFormExternalOpen(context);
    if (!saved)
        console.warn('JotForm terugkeercontext kon niet worden opgeslagen.');
}
function readJotFormReturnContext() {
    if (!isJotFormLookupEnabled())
        return null;
    return FD.DoorActionService.readReturnContext(localStorage, JOTFORM_RETURN_CONTEXT_KEY);
}
function isJotFormReturnContextForCurrentOrigin(context) {
    return Boolean(context?.appOrigin && context.appOrigin === window.location.origin);
}
function clearJotFormReturnContext() {
    localStorage.removeItem(JOTFORM_RETURN_CONTEXT_KEY);
}
function findCustomerIndexForReturnContext(context) {
    if (!context)
        return -1;
    return customers.findIndex(customer => customer.customer === context.customerName);
}
function stopJotFormReturnFastRefreshTimer() {
    if (!jotformReturnRefreshTimer)
        return;
    clearTimeout(jotformReturnRefreshTimer);
    jotformReturnRefreshTimer = null;
}
function clearJotFormReturnFastRefresh() {
    stopJotFormReturnFastRefreshTimer();
    jotformFocusBaselineSubmission = null;
    jotformFocusRefreshFormType = 'maintenance';
}
function clearJotFormSubmissionLookupRetry() {
    if (!jotformSubmissionLookupRetryTimer)
        return;
    clearTimeout(jotformSubmissionLookupRetryTimer);
    jotformSubmissionLookupRetryTimer = null;
}
function scheduleJotFormSubmissionLookupRetry(doorId) {
    clearJotFormSubmissionLookupRetry();
    if (!doorId || doorId !== jotformFocusRefreshDoorId || Date.now() > jotformFocusRefreshUntil)
        return;
    jotformSubmissionLookupRetryTimer = setTimeout(() => {
        jotformSubmissionLookupRetryTimer = null;
        if (selectedDoor === doorId && getDoorStatus(doorId)) {
            refreshJotFormSubmissionCache({ force: true });
        }
    }, CONFIG.jotformReturnRefreshInterval);
}
function refreshAfterJotFormFocus() {
    if (!jotformFocusRefreshDoorId || Date.now() > jotformFocusRefreshUntil) {
        jotformFocusRefreshDoorId = null;
        jotformFocusRefreshFormType = 'maintenance';
        jotformFocusRefreshUntil = 0;
        jotformFocusBaselineSubmission = null;
        return;
    }
    if (selectedDoor !== jotformFocusRefreshDoorId || navigator.onLine === false)
        return;
    startJotFormReturnFastRefresh(jotformFocusRefreshDoorId, jotformFocusRefreshFormType);
}
function startJotFormReturnFastRefresh(doorId, formType = jotformFocusRefreshFormType) {
    stopJotFormReturnFastRefreshTimer();
    if (!doorId || navigator.onLine === false || typeof statusController?.poll !== 'function')
        return;
    const deadline = Date.now() + CONFIG.jotformReturnRefreshMaxDuration;
    const baselineSubmission = jotformFocusBaselineSubmission;
    const type = normalizeJotFormFormType(formType);
    function submissionChangedAfterExternalOpen() {
        const current = getCachedJotFormSubmission(doorId, type);
        if (!baselineSubmission)
            return Boolean(current?.editUrl);
        if (!current?.editUrl)
            return false;
        if (current.editUrl !== baselineSubmission.editUrl)
            return true;
        if (current.doorCondition !== baselineSubmission.doorCondition)
            return true;
        if (current.doorConditionLabel !== baselineSubmission.doorConditionLabel)
            return true;
        const currentSeen = Date.parse(current.lastSeenAt || '');
        const baselineSeen = Date.parse(baselineSubmission.lastSeenAt || '');
        return Number.isFinite(currentSeen) &&
            (!Number.isFinite(baselineSeen) || currentSeen > baselineSeen);
    }
    const run = async () => {
        if (selectedDoor !== doorId || !currentFloorplan || navigator.onLine === false || isEditModeActive()) {
            clearJotFormReturnFastRefresh();
            return;
        }
        try {
            await statusController.poll();
            if (getDoorStatus(doorId)) {
                await refreshJotFormSubmissionCache({ force: true });
            }
        }
        catch (err) {
            console.warn('JotForm status-refresh mislukt:', err);
        }
        if ((getDoorStatus(doorId) && submissionChangedAfterExternalOpen()) || Date.now() >= deadline) {
            clearJotFormReturnFastRefresh();
            return;
        }
        jotformReturnRefreshTimer = setTimeout(run, CONFIG.jotformReturnRefreshInterval);
    };
    run();
}
