(function (global) {
    const FD = global.FD = global.FD || {};
    function floorId(record) {
        const value = Number(record?.floorId || record?.id || record?.file || record?.name || 0);
        return Number.isFinite(value) ? value : 0;
    }
    function recordForCustomerFloorplan(customer, floorplan, details = {}) {
        return {
            customer: customer.customer,
            name: floorplan.name,
            floorplan: floorplan.name,
            displayName: details.displayName || floorplan.displayName || floorplan.name || '',
            floorId: floorplan.floorId || floorplan.id || floorplan.file || floorplan.name || '',
            building: floorplan.building || '',
            floorLabel: floorplan.floorLabel || '',
            locationAddress: details.locationAddress || '',
            locationNote: details.locationNote || '',
            repo: floorplan.repo === 'uploads' ? 'uploads' : 'gallery',
            file: floorplan.file || String(floorplan.floorId || floorplan.name || ''),
            uploaded: Boolean(floorplan.uploaded || floorplan.repo === 'uploads'),
            doorsTotal: Number(floorplan.doorCount || floorplan.doorsTotal || 0),
        };
    }
    function matches(left, right, keyForRecord) {
        const leftFloorId = floorId(left);
        const rightFloorId = floorId(right);
        if (leftFloorId && rightFloorId && leftFloorId === rightFloorId)
            return true;
        if (keyForRecord(left) && keyForRecord(left) === keyForRecord(right))
            return true;
        if (left?.customer !== right?.customer)
            return false;
        if (left?.file && right?.file && left.file === right.file)
            return true;
        const leftName = String(left?.displayName || left?.name || left?.floorplan || '').trim();
        const rightName = String(right?.displayName || right?.name || right?.floorplan || '').trim();
        return Boolean(leftName && rightName && leftName === rightName);
    }
    function findRecord(record, floorplans, keyForRecord) {
        if (!record)
            return null;
        const floorIdValue = floorId(record);
        if (floorIdValue) {
            const byFloorId = floorplans.find(item => floorId(item) === floorIdValue);
            if (byFloorId)
                return byFloorId;
        }
        return floorplans.find(item => matches(record, item, keyForRecord)) || null;
    }
    function doorCode(door) {
        return String(door?.door_code || door?.doorCode || '').trim();
    }
    async function loadFloorplanData(options) {
        const sourceFloorplans = Array.isArray(options?.floorplans) ? options.floorplans : [];
        const exportFloorplans = [];
        const exportDoors = [];
        const fetchFloorplan = options?.fetchFloorplan;
        for (const record of sourceFloorplans) {
            const floorIdValue = floorId(record);
            if (!floorIdValue || typeof fetchFloorplan !== 'function') {
                exportFloorplans.push(record);
                continue;
            }
            const floorplanData = await fetchFloorplan(options.config, floorIdValue, {});
            const doors = Array.isArray(floorplanData?.doors) ? floorplanData.doors : [];
            const exportRecord = { ...record, doorsTotal: doors.length };
            exportFloorplans.push(exportRecord);
            doors.forEach((door) => {
                const code = doorCode(door);
                if (!code)
                    return;
                exportDoors.push({
                    ...exportRecord,
                    floorplan: exportRecord.name,
                    floorplanDisplayName: exportRecord.displayName,
                    doorId: String(door?.id || door?.marker_uuid || code),
                    code,
                });
            });
        }
        return { floorplans: exportFloorplans, doors: exportDoors };
    }
    FD.ExportFlowService = {
        doorCode,
        findRecord,
        floorId,
        loadFloorplanData,
        recordForCustomerFloorplan,
    };
})(window);
