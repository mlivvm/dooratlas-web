(function (global) {
    const FD = global.FD = global.FD || {};
    const S = FD.SelectSheetCore;
    const D = FD.SelectSheetDom;
    function renderSelectOptions(selectEl, placeholder, items, labelForItem, compareItems) {
        if (!selectEl)
            return;
        selectEl.innerHTML = '';
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        selectEl.appendChild(placeholderOption);
        const sortedItems = S.sortedWithOriginalIndex(items, labelForItem);
        if (typeof compareItems === 'function')
            sortedItems.sort(compareItems);
        sortedItems.forEach(({ index, label }) => {
            const opt = document.createElement('option');
            opt.value = String(index);
            opt.textContent = label;
            selectEl.appendChild(opt);
        });
    }
    function renderCustomerOptions(selectEl, customers) {
        renderSelectOptions(selectEl, '-- Kies klant --', customers || [], customer => customer.customer);
    }
    function renderFloorplanOptions(selectEl, floorplans, options = {}) {
        const labelForItem = typeof options.labelForItem === 'function'
            ? options.labelForItem
            : (floorplan) => floorplan.name;
        renderSelectOptions(selectEl, '-- Kies plattegrond --', floorplans || [], labelForItem, (left, right) => S.compareFloorplanDisplayOrder(left.item, right.item, left.label, right.label) || left.index - right.index);
        if (selectEl)
            selectEl.disabled = false;
    }
    function resetFloorplanOptions(selectEl, { disabled = true } = {}) {
        renderSelectOptions(selectEl, '-- Kies plattegrond --', [], () => '');
        if (selectEl)
            selectEl.disabled = disabled;
    }
    function selectedIndex(selectEl) {
        const index = parseInt(selectEl?.value || '', 10);
        return Number.isNaN(index) ? null : index;
    }
    function getSelectedFloorplan(customers, customerSelect, floorplanSelect) {
        const customerIndex = selectedIndex(customerSelect);
        const floorplanIndex = selectedIndex(floorplanSelect);
        if (customerIndex === null || floorplanIndex === null || !customers?.[customerIndex]) {
            return { customerIndex, floorplanIndex, customer: null, floorplan: null };
        }
        return {
            customerIndex,
            floorplanIndex,
            customer: customers[customerIndex],
            floorplan: customers[customerIndex].floorplans?.[floorplanIndex] || null,
        };
    }
    function createSelectionController(options) {
        const { elements, onFilterChange, onCustomerChange, onFloorplanChange } = options;
        let bound = false;
        const sheetController = D.createController({
            ...options,
            onSelect: (type, item) => {
                if (type === 'customer') {
                    elements.customerSelect.value = String(item.index);
                    handleCustomerChange();
                }
                else if (type === 'floorplan') {
                    const nextCustomerIndex = Number(item.customerIndex);
                    if (Number.isInteger(nextCustomerIndex) && nextCustomerIndex !== selectedIndex(elements.customerSelect)) {
                        elements.customerSelect.value = String(nextCustomerIndex);
                        handleCustomerChange();
                    }
                    elements.floorplanSelect.value = String(item.index);
                    handleFloorplanChange();
                }
                else if (type === 'location') {
                    const filterType = String(item.filterKey || 'floorplan');
                    if (typeof onFilterChange === 'function')
                        onFilterChange(filterType, String(item.value || ''));
                    sheetController.open('floorplan');
                }
            },
        });
        function handleCustomerChange() {
            sheetController.updatePickerButtons();
            if (typeof onCustomerChange === 'function') {
                onCustomerChange({ value: elements.customerSelect.value, customerIndex: selectedIndex(elements.customerSelect) });
            }
        }
        function handleFloorplanChange() {
            sheetController.updatePickerButtons();
            if (typeof onFloorplanChange === 'function') {
                onFloorplanChange({
                    value: elements.floorplanSelect.value,
                    customerIndex: selectedIndex(elements.customerSelect),
                    floorplanIndex: selectedIndex(elements.floorplanSelect),
                });
            }
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            elements.desktopContextPickerBtn?.addEventListener('click', () => sheetController.open('customer'));
            elements.customerPickerBtn.addEventListener('click', () => sheetController.open('customer'));
            elements.floorplanPickerBtn.addEventListener('click', () => sheetController.open('floorplan'));
            elements.search.addEventListener('input', sheetController.renderItems);
            elements.closeButton.addEventListener('click', sheetController.close);
            elements.overlay.addEventListener('click', sheetController.close);
            elements.customerSelect.addEventListener('change', handleCustomerChange);
            elements.floorplanSelect.addEventListener('change', handleFloorplanChange);
        }
        return {
            bind,
            close: sheetController.close,
            getActiveType: sheetController.getActiveType,
            isOpen: sheetController.isOpen,
            open: sheetController.open,
            renderFilters: sheetController.renderFilters,
            renderItems: sheetController.renderItems,
            updatePickerButtons: sheetController.updatePickerButtons,
        };
    }
    FD.SelectSheetService = {
        LOCATION_ALL_VALUE: S.LOCATION_ALL_VALUE,
        LOCATION_NONE_VALUE: S.LOCATION_NONE_VALUE,
        LOCATION_NONE_LABEL: S.LOCATION_NONE_LABEL,
        ORGANIZER_NONE_VALUE: S.ORGANIZER_NONE_VALUE,
        ORGANIZER_NONE_LABEL: S.ORGANIZER_NONE_LABEL,
        DIRECT_LOCATION_FILTER_LIMIT: S.DIRECT_LOCATION_FILTER_LIMIT,
        COLLAPSIBLE_FLOORPLAN_LIMIT: S.COLLAPSIBLE_FLOORPLAN_LIMIT,
        buildLocationFilterOptions: S.buildLocationFilterOptions,
        compareFloorplanDisplayOrder: S.compareFloorplanDisplayOrder,
        floorplanOrganizerLabel: S.floorplanOrganizerLabel,
        floorplanOrganizerValue: S.floorplanOrganizerValue,
        floorplanSortKey: S.floorplanSortKey,
        createController: D.createController,
        createSelectionController,
        floorplanLocationFilterLabel: S.floorplanLocationFilterLabel,
        floorplanLocationFilterValue: S.floorplanLocationFilterValue,
        floorplanLocationName: S.floorplanLocationName,
        getCustomerLocationDetails: S.getCustomerLocationDetails,
        getFloorplanLocationDetails: S.getFloorplanLocationDetails,
        floorplanDisplayName: S.floorplanDisplayName,
        floorplanDisplayParts: S.floorplanDisplayParts,
        getSelectedFloorplan,
        getSelectedOptionText: S.getSelectedOptionText,
        renderCustomerOptions,
        renderFloorplanOptions,
        resetFloorplanOptions,
        selectedIndex,
        sortedWithOriginalIndex: S.sortedWithOriginalIndex,
    };
})(window);
