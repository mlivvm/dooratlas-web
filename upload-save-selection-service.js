(function (global) {
    const FD = global.FD = global.FD || {};
    function normalize(value) {
        return String(value || '').trim().toLowerCase();
    }
    function findSavedFloorplanIndex(floorplans, resultFloorplan = {}, form = {}) {
        const createdFloorId = Number(resultFloorplan?.floorId || resultFloorplan?.id || 0);
        const normalizedBuilding = normalize(form.buildingName || resultFloorplan.building);
        const normalizedFloorLabel = normalize(form.floorLabel || form.floorplanName || resultFloorplan.floorLabel || resultFloorplan.name);
        const normalizedDisplayName = normalize(resultFloorplan.displayName);
        const normalizedFile = String(resultFloorplan.file || resultFloorplan.svg_path || '').trim();
        const list = Array.isArray(floorplans) ? floorplans : [];
        let index = createdFloorId
            ? list.findIndex(fp => Number(fp.floorId || fp.file || fp.name) === createdFloorId)
            : -1;
        if (index >= 0)
            return index;
        if (normalizedFile) {
            index = list.findIndex(fp => String(fp.file || fp.name || '').trim() === normalizedFile);
            if (index >= 0)
                return index;
        }
        if (normalizedBuilding && normalizedFloorLabel) {
            index = list.findIndex(fp => (normalize(fp.building) === normalizedBuilding &&
                normalize(fp.floorLabel || fp.name) === normalizedFloorLabel));
            if (index >= 0)
                return index;
        }
        if (normalizedDisplayName) {
            index = list.findIndex(fp => normalize(fp.displayName || fp.name) === normalizedDisplayName);
            if (index >= 0)
                return index;
        }
        return list.length === 1 ? 0 : -1;
    }
    FD.UploadSaveSelectionService = {
        findSavedFloorplanIndex,
    };
})(window);
