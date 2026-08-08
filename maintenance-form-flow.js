(function (global) {
    const FD = global.FD = global.FD || {};
    const runtime = FD.InspectionContractRuntime;
    const core = runtime?.core;
    const contract = runtime?.contract;
    if (!core || !contract)
        throw new Error('De gedeelde inspectiekern ontbreekt.');
    const form = contract.forms.onderhoud;
    const fields = new Map();
    const photos = new Map();
    const matrices = new Map();
    (form.sections || []).forEach((section) => {
        (section.fields || []).forEach((item) => fields.set(item.name, item));
        (section.photos || []).forEach((item) => photos.set(item.kind, { ...item, multiple: Number(item.maxFiles || 1) > 1 }));
        (section.matrices || []).forEach((item) => matrices.set(item.key, item));
    });
    const statusColumns = [...(matrices.get('controle_lijst_deur')?.statusColumns || [])];
    const goodResult = String(contract.status.maintenanceGoodValue || '');
    const nonGoodResults = new Set((fields.get('controle_eindcontrole_werking_deur_goed')?.options || [])
        .filter((value) => value !== goodResult));
    function contextFor(state) {
        return { isEdit: Boolean(state.isMaintenanceEdit) };
    }
    function officeState(state) {
        return {
            ...state,
            fields: state.fields || {},
            photos: state.photos || {},
            matrices: state.matrices || {},
            matrixMeta: state.matrixMeta || {},
            preservedNotes: state.maintenancePreservedNotes ?? state.preservedNotes ?? null,
            initialNoteFields: state.maintenanceInitialNoteFields ?? state.initialNoteFields,
        };
    }
    function officeStep(step) {
        const fieldsFlat = (step.sections || []).flatMap((section) => section.fields || [])
            .filter((name) => name !== 'nul_beurt');
        const photosFlat = (step.sections || []).flatMap((section) => section.photos || []);
        return {
            ...step,
            fields: step.matrixKey ? [] : fieldsFlat,
            photos: step.matrixKey ? [] : photosFlat,
            sections: step.matrixKey ? step.sections : [],
        };
    }
    function rawSteps(state) {
        return core.visibleSteps(contract, 'onderhoud', state.fields || {}, contextFor(state));
    }
    function resolvedSteps(state) {
        return rawSteps(state).map(officeStep);
    }
    function stepsFor(state) {
        return resolvedSteps(state);
    }
    function previewStepsFor(state) {
        const preview = core.previewRouteFields(contract, 'onderhoud', state.fields || {}, {
            ...contextFor(state),
            stepId: state.stepId,
        });
        return resolvedSteps({ ...state, fields: preview });
    }
    function collectPayload(state) {
        return core.collectPayload(contract, 'onderhoud', officeState(state), contextFor(state));
    }
    function validationErrors(step, state) {
        const resolved = rawSteps(state).find(item => item.id === step.id) || step;
        return core.validationErrors(contract, 'onderhoud', resolved, officeState(state), contextFor(state));
    }
    function setNulBeurt(state, value) {
        state.maintenanceNulBeurtChosen = Boolean(value);
        if (value === 'Ja')
            state.fields.nul_beurt = 'Ja';
        else
            delete state.fields.nul_beurt;
    }
    function matrixStatus(state, matrix, row) {
        return core.matrixStatus(contract, 'onderhoud', state, matrix, row);
    }
    function hasStepAnswers(step, state) {
        const resolved = rawSteps(state).find(item => item.id === step.id);
        return resolved ? core.stepHasAnswers(resolved, state) : false;
    }
    FD.MaintenanceFormFlow = {
        allowsOther: (name) => Boolean(fields.get(name)?.allowOther),
        applyStatus: (state, value) => { state.fields.status_deur_voldoende_controle_onderhoud = value; },
        collectPayload,
        doorType: (state) => String(state.fields?.type_deur || ''),
        endResult: (state) => String(state.fields?.controle_eindcontrole_werking_deur_goed || ''),
        field: (name) => fields.get(name) || null,
        hasValue: core.hasValue,
        hasStepAnswers,
        isNulBeurt: (state) => String(state.fields?.nul_beurt || '') === 'Ja',
        isOtherValue: (name, value) => Boolean(fields.get(name)?.allowOther)
            && core.hasValue(value) && !(fields.get(name)?.options || []).includes(String(value)),
        matrix: (key) => matrices.get(key) || null,
        matrixActionSelected: (state, matrix, row, column) => Boolean(state.matrices?.[core.matrixKey(matrix, row, column)]),
        matrixStatus,
        maxPhotos: (state, kind) => Math.max(0, Number(photos.get(kind)?.maxFiles || 1) - (state.photos?.[kind] || []).length),
        nonGoodResults,
        nulBeurtChoice: (state) => String(state.fields?.nul_beurt || '') === 'Ja'
            ? 'Ja' : (state.maintenanceNulBeurtChosen ? 'Nee' : ''),
        photo: (kind) => photos.get(kind) || null,
        previewStepsFor,
        regieFields: (state) => (resolvedSteps(state).find(item => item.id === 'regie')?.fields || []),
        setMatrixStatus: (state, matrix, row, column) => core.setMatrixStatus(contract, 'onderhoud', state, matrix, row, column),
        setNulBeurt,
        showDeviation: (state) => resolvedSteps(state).some(item => item.id === 'deviation'),
        statusColumns,
        statusValue: (state) => String(state.fields?.status_deur_voldoende_controle_onderhoud || ''),
        stepsFor,
        toggleMatrixAction: (state, matrix, row, column) => core.toggleMatrixAction(state, matrix, row, column),
        validationErrors,
    };
})(window);
