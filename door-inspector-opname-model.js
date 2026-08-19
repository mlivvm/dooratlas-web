(function (global) {
    const FD = global.FD = global.FD || {};
    const COMPACT_FIELDS = [
        ['ingevuld_door', 'Ingevuld door'],
        ['opname', 'Opname'],
        ['projectcode', 'Projectcode'],
        ['type_object_opname', 'Type object'],
        ['omschrijving_deur', 'Omschrijving deur'],
        ['toegang', 'Toegang'],
    ];
    function hasValue(value) {
        return Array.isArray(value) ? value.some(hasValue) : value != null && String(value).trim() !== '';
    }
    function compactValues(inspection) {
        const fields = inspection?.fields || {};
        const location = [fields.klant, fields.pandnaam].filter(hasValue).map(value => String(value).trim()).join(' · ');
        const values = COMPACT_FIELDS
            .filter(([key]) => hasValue(fields[key]))
            .map(([key, label]) => ({ key, label, value: fields[key] }));
        return location ? [{ key: 'klant_pandnaam', label: 'Klant · locatie', value: location }, ...values] : values;
    }
    function inspectionSteps() {
        return FD.OpnameFormFlow?.allSteps?.() || [];
    }
    FD.DoorInspectorOpnameModel = { compactValues, hasValue, inspectionSteps };
})(window);
