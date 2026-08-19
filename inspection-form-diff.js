(function (global) {
    const FD = global.FD = global.FD || {};
    const core = FD.InspectionContractRuntime?.core;
    if (!core)
        throw new Error('De gedeelde inspectiekern ontbreekt.');
    FD.InspectionFormDiff = {
        contentSignature: core.contentSignature,
        hasChanges: core.hasChanges,
    };
})(window);
