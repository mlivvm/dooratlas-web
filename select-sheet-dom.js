(function (global) {
    const FD = global.FD = global.FD || {};
    const S = FD.SelectSheetCore;
    const N = FD.SelectSheetNavigator;
    function setSheetDisplay(elements, visible) {
        elements.overlay.style.display = visible ? 'block' : 'none';
        elements.sheet.style.display = visible ? 'flex' : 'none';
    }
    function appendEmpty(listEl, text) {
        const empty = document.createElement('div');
        empty.className = 'select-sheet-empty';
        empty.textContent = text;
        listEl.appendChild(empty);
    }
    function appendGroupHeader(listEl, text) {
        const header = document.createElement('div');
        header.className = 'select-sheet-group-header';
        header.textContent = text;
        listEl.appendChild(header);
    }
    function setOptionalText(el, text) {
        if (!el)
            return;
        const value = String(text || '').trim();
        el.textContent = value;
        el.hidden = !value;
    }
    function appendCollapseButton(listEl, group, expanded, onToggle) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'select-sheet-collapse-button';
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const label = document.createElement('span');
        label.className = 'select-sheet-collapse-label';
        label.textContent = group.label;
        const meta = document.createElement('span');
        meta.className = 'select-sheet-collapse-meta';
        meta.textContent = `${group.items.length} plattegrond${group.items.length === 1 ? '' : 'en'}`;
        button.append(label, meta);
        button.addEventListener('click', onToggle);
        listEl.appendChild(button);
    }
    function createController(options) {
        const { elements, getState, getItems, getFilters, getFilterGroups, getFilterLabel, getFilterValue, getPickerMeta, onFilterChange, onSelect } = options;
        let activeType = null;
        let activeFilterKey = '';
        const expandedGroups = new Set();
        const state = () => typeof getState === 'function' ? getState() : {};
        const filterValueForType = (type) => typeof getFilterValue === 'function' ? String(getFilterValue(type) || '') : '';
        const desktopNavigator = N?.createController?.({ ...options, close: () => close() });
        function filterGroupsForType(type) {
            if (typeof getFilterGroups !== 'function')
                return [];
            return (getFilterGroups(type) || [])
                .map((group) => {
                const key = String(group?.key || group?.type || '').trim();
                const options = Array.isArray(group?.options) ? group.options : [];
                if (!key || !options.length)
                    return null;
                const value = group.value !== undefined ? String(group.value || '') : filterValueForType(key);
                const current = options.find((option) => String(option.value || '') === value) || options[0];
                return { key, label: String(group.label || '').trim() || 'Filter', value, current, options };
            })
                .filter(Boolean);
        }
        function activeFilterGroup() {
            const groups = filterGroupsForType('floorplan');
            return groups.find(group => group.key === activeFilterKey) || groups[0] || null;
        }
        function updatePickerButtons() {
            const { customerSelect, floorplanSelect, customerPickerBtn, floorplanPickerBtn, customerPickerValue, floorplanPickerValue } = elements;
            const { customersLoading = false } = state();
            const customerValue = customersLoading ? 'Klanten laden...' : S.getSelectedOptionText(customerSelect, 'Kies klant');
            const floorplanValue = S.getSelectedOptionText(floorplanSelect, 'Kies plattegrond');
            customerPickerValue.textContent = customerValue;
            floorplanPickerValue.textContent = floorplanValue;
            setOptionalText(elements.customerPickerMeta, typeof getPickerMeta === 'function' ? getPickerMeta('customer') : '');
            setOptionalText(elements.floorplanPickerMeta, typeof getPickerMeta === 'function' ? getPickerMeta('floorplan') : '');
            setOptionalText(elements.desktopContextCustomerValue, customerSelect.value ? customerValue : 'Klant en plattegrond kiezen');
            setOptionalText(elements.desktopContextFloorplanValue, floorplanSelect.value ? floorplanValue : (customerSelect.value ? 'Kies plattegrond' : ''));
            customerPickerBtn.disabled = customerSelect.disabled || customersLoading;
            floorplanPickerBtn.disabled = floorplanSelect.disabled || !customerSelect.value;
            if (elements.desktopContextPickerBtn)
                elements.desktopContextPickerBtn.disabled = customerPickerBtn.disabled;
        }
        function renderFilterChip(filterEl, filter, currentValue, onClick) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-sheet-filter-chip';
            button.classList.toggle('active', String(filter.value || '') === currentValue);
            const label = document.createElement('span');
            label.textContent = filter.label;
            const count = document.createElement('span');
            count.className = 'select-sheet-filter-count';
            count.textContent = String(filter.count || 0);
            button.append(label, count);
            button.addEventListener('click', onClick);
            filterEl.appendChild(button);
        }
        function renderFilterButton(filterEl, group, onClick) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-sheet-location-button';
            const label = document.createElement('span');
            label.className = 'select-sheet-location-label';
            label.textContent = group.label;
            const value = document.createElement('span');
            value.className = 'select-sheet-location-value';
            value.textContent = `${group.current?.label || 'Alles'} (${group.current?.count || 0})`;
            button.append(label, value);
            if (group.current?.description) {
                const description = document.createElement('span');
                description.className = 'select-sheet-location-description';
                description.textContent = group.current.description;
                button.appendChild(description);
            }
            button.addEventListener('click', onClick);
            filterEl.appendChild(button);
        }
        function renderFilters() {
            const filterEl = elements.filters;
            if (!filterEl)
                return;
            filterEl.innerHTML = '';
            if (activeType !== 'floorplan') {
                filterEl.hidden = true;
                filterEl.classList.remove('select-sheet-filters--chips', 'select-sheet-filters--buttons');
                return;
            }
            const filterGroups = filterGroupsForType(activeType);
            if (filterGroups.length) {
                const hasSpecificFilter = filterGroups.some(group => Boolean(group.value));
                const visibleFilterGroups = hasSpecificFilter ? filterGroups : filterGroups.filter(group => Boolean(group.value));
                if (!visibleFilterGroups.length) {
                    filterEl.hidden = true;
                    filterEl.classList.remove('select-sheet-filters--chips', 'select-sheet-filters--buttons');
                    return;
                }
                filterEl.hidden = false;
                filterEl.classList.remove('select-sheet-filters--chips');
                filterEl.classList.add('select-sheet-filters--buttons');
                visibleFilterGroups.forEach(group => renderFilterButton(filterEl, group, () => {
                    activeFilterKey = group.key;
                    open('location');
                }));
                return;
            }
            const filters = typeof getFilters === 'function' ? (getFilters(activeType) || []) : [];
            if (!filters.length) {
                filterEl.hidden = true;
                filterEl.classList.remove('select-sheet-filters--chips', 'select-sheet-filters--buttons');
                return;
            }
            const currentValue = filterValueForType(activeType);
            const currentFilter = filters.find((filter) => String(filter.value || '') === currentValue) || filters[0];
            const filterLabel = typeof getFilterLabel === 'function' ? getFilterLabel(activeType) : 'Locatie';
            if (!currentValue && filters.length > S.DIRECT_LOCATION_FILTER_LIMIT) {
                filterEl.hidden = true;
                filterEl.classList.remove('select-sheet-filters--chips', 'select-sheet-filters--buttons');
                return;
            }
            filterEl.hidden = false;
            filterEl.classList.toggle('select-sheet-filters--chips', filters.length <= S.DIRECT_LOCATION_FILTER_LIMIT);
            filterEl.classList.remove('select-sheet-filters--buttons');
            if (filters.length <= S.DIRECT_LOCATION_FILTER_LIMIT) {
                filters.forEach((filter) => renderFilterChip(filterEl, filter, currentValue, () => {
                    if (typeof onFilterChange === 'function')
                        onFilterChange(activeType || '', String(filter.value || ''));
                    renderFilters();
                    renderItems();
                }));
                return;
            }
            renderFilterButton(filterEl, { key: 'floorplan', label: filterLabel || 'Locatie', value: currentValue, current: currentFilter, options: filters }, () => open('location'));
        }
        function renderItems() {
            const { customerSelect, floorplanSelect, search, list } = elements;
            if (!activeType)
                return;
            if (desktopNavigator?.render(activeType))
                return;
            desktopNavigator?.destroy();
            list.innerHTML = '';
            const { customersLoading = false } = state();
            if (activeType === 'customer' && customersLoading) {
                appendEmpty(list, 'Klanten laden...');
                return;
            }
            const query = search.value.trim().toLowerCase();
            const locationFilterGroup = activeType === 'location' ? activeFilterGroup() : null;
            const legacyLocationFilters = activeType === 'location' && !locationFilterGroup && typeof getFilters === 'function'
                ? (getFilters('floorplan') || [])
                : [];
            const rawLocationFilterOptions = locationFilterGroup?.options || legacyLocationFilters;
            const currentValue = activeType === 'customer'
                ? customerSelect.value
                : (activeType === 'floorplan'
                    ? floorplanSelect.value
                    : (locationFilterGroup?.value ?? filterValueForType('floorplan')));
            const locationFilterOptions = activeType === 'location' && currentValue === ''
                ? rawLocationFilterOptions.filter((option) => String(option.value || '') !== '')
                : rawLocationFilterOptions;
            const typeAtRender = activeType;
            const filterGroups = typeAtRender === 'floorplan' ? filterGroupsForType(typeAtRender) : [];
            const hasSpecificFilter = filterGroups.some(group => Boolean(group.value));
            const activeFilter = typeAtRender === 'floorplan' && !filterGroups.length ? filterValueForType(typeAtRender) : '';
            const baseItems = typeAtRender === 'location' && locationFilterOptions.length
                ? locationFilterOptions.map((option, index) => ({
                    index,
                    value: option.value,
                    label: option.label,
                    meta: `${option.count || 0} plattegrond${option.count === 1 ? '' : 'en'}`,
                    description: option.description || '',
                    searchText: [option.label, option.description].filter(Boolean).join(' '),
                    filterKey: locationFilterGroup?.key || '',
                }))
                : (typeof getItems === 'function' ? getItems(typeAtRender) : []);
            const items = baseItems.filter((item) => {
                if (typeAtRender === 'floorplan' && filterGroups.length) {
                    const filterValues = item.filterValues || {};
                    const matchesAll = filterGroups.every(group => !group.value || String(filterValues[group.key] || '') === group.value);
                    if (!matchesAll)
                        return false;
                }
                if (activeFilter && item.filterValue !== activeFilter)
                    return false;
                const searchText = String(item.searchText || `${item.label || ''} ${item.meta || ''}`).toLowerCase();
                return !query || searchText.includes(query);
            });
            if (!items.length) {
                appendEmpty(list, 'Geen resultaten');
                return;
            }
            renderGroupedItems(items, typeAtRender, currentValue, activeFilter, hasSpecificFilter, query);
        }
        function renderGroupedItems(items, typeAtRender, currentValue, activeFilter, hasSpecificFilter, query) {
            const collapsibleItemCount = items.filter(item => item.collapsibleGroupKey).length;
            const canCollapseGroups = typeAtRender === 'floorplan' &&
                !query &&
                !activeFilter &&
                !hasSpecificFilter &&
                collapsibleItemCount > S.COLLAPSIBLE_FLOORPLAN_LIMIT &&
                items.some(item => item.collapsibleGroupKey);
            if (canCollapseGroups) {
                const groups = [];
                const groupByKey = new Map();
                items.forEach(item => {
                    const key = String(item.collapsibleGroupKey || '');
                    const label = String(item.collapsibleGroupLabel || item.groupLabel || '').trim();
                    if (!key || !label) {
                        renderItemButton(item, typeAtRender, currentValue);
                        return;
                    }
                    if (!groupByKey.has(key)) {
                        const group = { key, label, items: [] };
                        groupByKey.set(key, group);
                        groups.push(group);
                    }
                    groupByKey.get(key)?.items.push(item);
                });
                groups.forEach(group => {
                    const expanded = expandedGroups.has(group.key);
                    appendCollapseButton(elements.list, group, expanded, () => {
                        if (expandedGroups.has(group.key))
                            expandedGroups.delete(group.key);
                        else
                            expandedGroups.add(group.key);
                        renderItems();
                    });
                    if (expanded)
                        group.items.forEach((item) => renderItemButton(item, typeAtRender, currentValue));
                });
                return;
            }
            let lastGroupLabel = null;
            items.forEach(item => {
                if (typeAtRender === 'floorplan' && !activeFilter && item.groupLabel && item.groupLabel !== lastGroupLabel) {
                    lastGroupLabel = item.groupLabel;
                    appendGroupHeader(elements.list, item.groupLabel);
                }
                renderItemButton(item, typeAtRender, currentValue);
            });
        }
        function renderItemButton(item, typeAtRender, currentValue) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'select-sheet-item';
            const itemValue = typeAtRender === 'location' ? String(item.value || '') : String(item.index);
            if (itemValue === currentValue)
                btn.classList.add('selected');
            if (item.readOnly)
                btn.classList.add('readonly');
            const label = document.createElement('span');
            label.textContent = item.label || '';
            btn.appendChild(label);
            if (item.description) {
                const description = document.createElement('span');
                description.className = 'select-sheet-item-description';
                description.textContent = item.description;
                btn.appendChild(description);
            }
            if (item.meta) {
                const meta = document.createElement('span');
                meta.className = 'select-sheet-item-meta';
                meta.textContent = item.meta;
                btn.appendChild(meta);
            }
            btn.addEventListener('click', () => {
                try {
                    if (typeof onSelect === 'function')
                        onSelect(typeAtRender, item);
                }
                finally {
                    if (activeType === typeAtRender)
                        close();
                }
            });
            elements.list.appendChild(btn);
        }
        function open(type) {
            updatePickerButtons();
            const { customerPickerBtn, floorplanPickerBtn, eyebrow, title, search } = elements;
            const { customersLoading = false } = state();
            if (type === 'customer' && (customersLoading || customerPickerBtn.disabled))
                return;
            if (type === 'floorplan' && floorplanPickerBtn.disabled)
                return;
            if (type === 'location' && !filterGroupsForType('floorplan').length &&
                !(typeof getFilters === 'function' && (getFilters('floorplan') || []).length))
                return;
            if (activeType !== type)
                expandedGroups.clear();
            activeType = type;
            const activeGroup = type === 'location' ? activeFilterGroup() : null;
            const filterLabel = activeGroup?.label || (typeof getFilterLabel === 'function' ? getFilterLabel('floorplan') : 'Locatie');
            const normalizedFilterLabel = String(filterLabel || 'locatie').toLowerCase();
            eyebrow.textContent = type === 'customer' ? 'Klant' : (type === 'location' ? filterLabel : 'Plattegrond');
            title.textContent = type === 'customer' ? 'Kies klant' : (type === 'location' ? `Kies ${normalizedFilterLabel}` : 'Kies plattegrond');
            search.value = '';
            search.placeholder = type === 'location' ? `Zoek ${normalizedFilterLabel}...` : 'Zoeken...';
            setSheetDisplay(elements, true);
            renderFilters();
            renderItems();
            setTimeout(() => {
                if (!desktopNavigator?.focusSearch(activeType))
                    search.focus();
            }, 0);
        }
        function close() {
            desktopNavigator?.destroy();
            setSheetDisplay(elements, false);
            if (elements.filters) {
                elements.filters.hidden = true;
                elements.filters.innerHTML = '';
                elements.filters.classList.remove('select-sheet-filters--chips', 'select-sheet-filters--buttons');
            }
            activeType = null;
            activeFilterKey = '';
            expandedGroups.clear();
        }
        function isOpen(type) {
            return type ? activeType === type : Boolean(activeType);
        }
        return {
            close,
            getActiveType: () => activeType,
            isOpen,
            open,
            renderFilters,
            renderItems,
            updatePickerButtons,
        };
    }
    FD.SelectSheetDom = {
        createController,
        setOptionalText,
    };
})(window);
