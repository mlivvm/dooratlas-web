(function (global) {
    const FD = global.FD = global.FD || {};
    function floorId(floorplan) {
        const id = Number(floorplan?.floorId || floorplan?.id || floorplan?.file || 0);
        return Number.isInteger(id) && id > 0 ? id : 0;
    }
    function selectedIds(options) {
        const customerIndex = options.customerSelect.value === '' ? -1 : Number(options.customerSelect.value);
        const customer = Number.isInteger(customerIndex) && customerIndex >= 0
            ? options.getCustomers()[customerIndex]
            : null;
        const floorplanIndex = options.floorplanSelect.value === '' ? -1 : Number(options.floorplanSelect.value);
        const floorplan = customer && Number.isInteger(floorplanIndex) && floorplanIndex >= 0
            ? customer.floorplans?.[floorplanIndex]
            : null;
        return { tenantId: Number(customer?.tenantId || 0), floorId: floorId(floorplan) };
    }
    function restoreSelection(options, selection) {
        const customers = options.getCustomers();
        const customerIndex = customers.findIndex((customer) => (Number(customer?.tenantId || 0) === selection.tenantId));
        if (customerIndex < 0) {
            options.customerSelect.value = '';
            options.resetFloorplanDropdown(true);
            return;
        }
        options.customerSelect.value = String(customerIndex);
        options.populateFloorplanDropdown(customerIndex);
        const floorplanIndex = customers[customerIndex].floorplans.findIndex((floorplan) => floorId(floorplan) === selection.floorId);
        options.floorplanSelect.value = floorplanIndex >= 0 ? String(floorplanIndex) : '';
        options.updatePickerButtons();
    }
    function create(options) {
        let inFlight = null;
        function refresh() {
            if (inFlight || navigator.onLine === false)
                return inFlight || Promise.resolve(false);
            const task = Promise.resolve().then(async () => {
                const selection = selectedIds(options);
                const customers = await options.loadCustomers();
                if (!Array.isArray(customers))
                    return false;
                options.setCustomers(customers);
                options.cacheCustomers();
                options.populateCustomerDropdown();
                restoreSelection(options, selection);
                if (options.isOpen()) {
                    options.renderFilters();
                    options.renderItems();
                }
                return true;
            }).catch((error) => {
                if (navigator.onLine !== false)
                    console.warn('Kon de plattegrondzoeker niet vernieuwen:', error);
                return false;
            }).finally(() => {
                if (inFlight === task)
                    inFlight = null;
            });
            inFlight = task;
            return task;
        }
        return { refresh };
    }
    FD.PickerCatalogRefreshService = { create };
})(window);
