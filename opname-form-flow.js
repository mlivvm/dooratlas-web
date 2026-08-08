(function (global) {
    const FD = global.FD = global.FD || {};
    const runtime = FD.InspectionContractRuntime;
    const core = runtime?.core;
    const contract = runtime?.contract;
    if (!core || !contract)
        throw new Error('De gedeelde inspectiekern ontbreekt.');
    const form = contract.forms.opname;
    const fields = new Map();
    const photos = new Map();
    (form.sections || []).forEach((section) => {
        (section.fields || []).forEach((item) => fields.set(item.name, item));
        (section.photos || []).forEach((item) => photos.set(item.kind, { ...item, multiple: Number(item.maxFiles || 1) > 1 }));
    });
    const triggers = core.formVisibilityTriggers(contract, 'opname');
    function officeStep(step) {
        return {
            ...step,
            sections: (step.sections || []).map((section) => ({
                ...section,
                columns: 2,
                fields: [...(section.fields || [])],
                photos: [...(section.photos || [])],
            })).filter((section) => section.fields.length || section.photos.length || section.context || section.emptyCopy),
        };
    }
    function stepsFor(state) {
        return core.visibleSteps(contract, 'opname', state.fields || {}, {}).map(officeStep);
    }
    function previewStepsFor(state) {
        return stepsFor({
            ...state,
            fields: core.previewRouteFields(contract, 'opname', state.fields || {}, {
                isEdit: Boolean(state.isEdit),
                stepId: state.stepId,
            }),
        });
    }
    function allSteps() {
        return (form.routes || []).map((step) => officeStep({
            ...step,
            sections: (step.sections || []).map((section) => ({
                ...section,
                fields: (section.fields || []).map((item) => typeof item === 'string' ? item : item.name),
                photos: [...(section.photos || [])],
            })),
        }));
    }
    function mutateClear(state, trigger) {
        const names = core.transitionClearFields(contract, 'opname', trigger);
        names.forEach(name => delete state.fields?.[name]);
    }
    function validationErrors(step, state) {
        const resolved = stepsFor(state).find(item => item.id === step.id) || officeStep(step);
        return core.validationErrors(contract, 'opname', resolved, state, {});
    }
    FD.OpnameFormFlow = {
        allSteps,
        clearAccessConfiguration: (state) => mutateClear(state, 'toegang'),
        clearSolutionFollowUps: (state) => mutateClear(state, 'oplossing'),
        field: (name) => fields.get(name) || null,
        hasStepAnswers: (step, state) => core.stepHasAnswers(step, state),
        hasValue: core.hasValue,
        helperText: (name) => fields.get(name)?.helpText || '',
        isFieldVisible: (item, state) => core.fieldIsVisible(item, state.fields || {}, {}),
        isReadOnly: (name) => Boolean(fields.get(name)?.readOnlyOnCreate),
        isVisibilityTrigger: (name) => triggers.has(name),
        isWindow: (state) => String(state.fields?.type_object_opname || '') === 'Raam / ruit',
        photo: (kind) => photos.get(kind) || null,
        previewStepsFor,
        stepsFor,
        validationErrors,
    };
})(window);
