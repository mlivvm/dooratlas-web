(function (global) {
    const FD = global.FD = global.FD || {};
    const runtime = FD.InspectionContractRuntime;
    if (!runtime?.contract)
        throw new Error('Het gedeelde inspectiecontract ontbreekt.');
    const contract = runtime.contract;
    function sectionForOffice(section) {
        return {
            ...section,
            fields: (section.fields || []).map((item) => ({ ...item })),
            photos: (section.photos || []).map((item) => ({
                ...item,
                multiple: Number(item.maxFiles || 1) > 1,
            })),
            matrices: (section.matrices || []).map((item) => ({ ...item })),
        };
    }
    const QUESTIONNAIRES = Object.fromEntries(Object.entries(contract.forms).map(([formType, definition]) => [formType, {
            ...definition,
            sections: (definition.sections || []).map(sectionForOffice),
        }]));
    function backendFormType(formType) {
        return String(formType || '') === 'inspection' ? 'opname' : 'onderhoud';
    }
    FD.InspectionFormConfig = {
        QUESTIONNAIRE_VERSION: Number(contract.questionnaireVersion),
        QUESTIONNAIRES,
        backendFormType,
    };
})(window);
