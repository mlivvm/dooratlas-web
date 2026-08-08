(function (global) {
    const FD = global.FD = global.FD || {};
    const GOOD_END_RESULT = 'Ja (Status: Goed)';
    const MATRIX_ATTENTION = /(^|\b)nee\b|afkeur|defect|vervanging geadviseerd/i;
    const ATTENTION_FIELDS = new Set([
        'controle_dranger_verzegeld',
        'controle_sticker_geplakt',
    ]);
    const compactRows = [
        ['klant_locatie', 'Klant - Locatie'],
        ['door_wie_ingevuld', 'Door wie ingevuld'],
        ['status_deur_voldoende_controle_onderhoud', 'Onderhoud mogelijk?'],
        ['type_deur', 'Type deur'],
        ['nul_beurt', 'Nulbeurt'],
        ['controle_eindcontrole_werking_deur_goed', 'Eindcontrole'],
    ];
    const moreworkRows = [
        ['controle_meerwerk_gedaan', 'Meerwerk gedaan'],
        ['controle_tijd_besteed_meerwerk', 'Tijd besteed aan meerwerk?'],
        ['controle_welke_werkzaamheden_waren_meerwerk', 'Welke werkzaamheden waren meerwerk'],
        ['controle_welke_materialen_gebruikt_meerwerk', 'Materialenverbruik meerwerk'],
    ];
    function hasValue(value) {
        if (Array.isArray(value))
            return value.some(hasValue);
        if (typeof value === 'boolean')
            return value;
        return value !== null && value !== undefined && String(value).trim() !== '';
    }
    function normalized(value) {
        return String(value || '').trim().toLocaleLowerCase('nl-NL');
    }
    function isAttentionField(key, value) {
        if (!hasValue(value))
            return false;
        const answer = normalized(value);
        if (key === 'status_deur_voldoende_controle_onderhoud')
            return answer === 'nee';
        if (key === 'controle_eindcontrole_werking_deur_goed')
            return answer !== normalized(GOOD_END_RESULT);
        return ATTENTION_FIELDS.has(key) && answer === 'nee';
    }
    function isAttentionMatrix(answer) {
        return MATRIX_ATTENTION.test(String(answer?.column_label || ''));
    }
    function fieldValue(fields, inspection, key) {
        if (key === 'nul_beurt')
            return String(fields.nul_beurt || '') === 'Ja' ? 'Ja' : 'Nee';
        if (key === 'door_wie_ingevuld')
            return fields[key] || inspection.submitted_by_name || 'Niet ingevuld';
        return hasValue(fields[key]) ? fields[key] : 'Niet ingevuld';
    }
    function compactValues(inspection) {
        const fields = inspection.fields || {};
        return compactRows.map(([key, label]) => ({
            key,
            label,
            value: fieldValue(fields, inspection, key),
            attention: isAttentionField(key, fields[key]),
        }));
    }
    function moreworkValues(inspection) {
        const fields = inspection.fields || {};
        if (String(fields.controle_meerwerk_gedaan || '') !== 'Ja') {
            return [{ key: 'controle_meerwerk_gedaan', label: 'Meerwerk', value: 'Nee', attention: false }];
        }
        return moreworkRows.map(([key, label]) => ({
            key,
            label,
            value: fieldValue(fields, inspection, key),
            attention: isAttentionField(key, fields[key]),
        }));
    }
    function inspectionSteps(inspection) {
        const flow = FD.MaintenanceFormFlow;
        const fields = { ...(inspection.fields || {}) };
        if (typeof flow?.stepsFor === 'function') {
            return flow.stepsFor({ fields, isMaintenanceEdit: true, maintenanceNulBeurtChosen: true });
        }
        return [{
                id: 'general',
                title: 'Algemeen',
                fields: Object.keys(fields),
                photos: [],
            }];
    }
    function selectedAnswers(answers) {
        return (answers || []).filter(answer => answer?.value !== false);
    }
    FD.DoorInspectorMaintenanceModel = {
        GOOD_END_RESULT,
        compactValues,
        hasValue,
        inspectionSteps,
        isAttentionField,
        isAttentionMatrix,
        moreworkValues,
        selectedAnswers,
    };
})(window);
