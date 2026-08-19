(function (global) {
    const FD = global.FD = global.FD || {};
    const MIN_NAVIGATOR_WIDTH = 860;
    const TABLET_NAVIGATOR_QUERY = '(hover: none) and (pointer: coarse) and (min-width: 601px)';
    function text(value) {
        return String(value || '').trim();
    }
    function isNavigatorViewport() {
        if (typeof global.matchMedia === 'function')
            return global.matchMedia(`(min-width: ${MIN_NAVIGATOR_WIDTH}px), ${TABLET_NAVIGATOR_QUERY}`).matches;
        return Number(global.innerWidth || 0) >= MIN_NAVIGATOR_WIDTH;
    }
    function appendText(parent, className, value) {
        const content = text(value);
        if (!content)
            return null;
        const el = document.createElement('span');
        el.className = className;
        el.textContent = content;
        parent.appendChild(el);
        return el;
    }
    function debounceRender(callback) {
        let timer;
        return () => {
            if (timer)
                window.clearTimeout(timer);
            timer = window.setTimeout(callback, 90);
        };
    }
    function createController(options) {
        const { elements, getItems, getFilterGroups, onCustomerFocus, onSelect, close } = options;
        let root = null;
        let customerList = null;
        let floorplanList = null;
        let customerSearch = null;
        let floorplanSearch = null;
        let filterSelect = null;
        let floorplanTitle = null;
        let floorplanSubtitle = null;
        let floorplanVirtualList = null;
        let customerQuery = '';
        let floorplanQuery = '';
        const navigatorState = FD.SelectSheetNavigatorState.create({ getItems, getItemKey: options.getItemKey });
        const scheduleContentRender = debounceRender(renderContent);
        function currentCustomerIndex() {
            const index = parseInt(elements.customerSelect?.value || '', 10);
            return Number.isNaN(index) ? null : index;
        }
        function currentFloorplanIndex() {
            const index = parseInt(elements.floorplanSelect?.value || '', 10);
            return Number.isNaN(index) ? null : index;
        }
        function floorplanFilterGroup() {
            const groups = typeof getFilterGroups === 'function'
                ? (getFilterGroups('floorplan', { customerIndex: navigatorState.customerIndex }) || [])
                : [];
            const group = groups.find((item) => item?.key === 'location') || groups[0];
            if (!group || !Array.isArray(group.options) || !group.options.length)
                return null;
            return {
                key: String(group.key || 'location'),
                label: text(group.label || 'Pand'),
                value: navigatorState.filterValue,
                options: group.options,
            };
        }
        function buildRoot() {
            FD.SelectSheetNavigatorLocationStep.injectStyles(TABLET_NAVIGATOR_QUERY);
            elements.list.innerHTML = '';
            elements.list.classList.add('select-sheet-list--desktop');
            root = document.createElement('div');
            root.className = 'select-navigator';
            root.appendChild(buildCustomerPane());
            root.appendChild(buildFloorplanPane());
            elements.list.appendChild(root);
        }
        function buildCustomerPane() {
            const pane = document.createElement('aside');
            pane.className = 'select-navigator-customers';
            const head = document.createElement('div');
            head.className = 'select-navigator-pane-head select-navigator-customer-head';
            const copy = document.createElement('div');
            copy.className = 'select-navigator-customer-head-copy';
            appendText(copy, 'select-navigator-pane-title', 'Klanten');
            appendText(copy, 'select-navigator-pane-subtitle', 'Zoek en kies een klant');
            head.append(copy, FD.SelectSheetNavigatorLocationStep.customerSearchHint());
            customerSearch = document.createElement('input');
            customerSearch.type = 'search';
            customerSearch.className = 'select-navigator-search';
            customerSearch.placeholder = 'Klant zoeken...';
            customerSearch.autocomplete = 'off';
            customerSearch.setAttribute('aria-label', 'Klant zoeken');
            customerSearch.addEventListener('input', () => {
                customerQuery = customerSearch?.value || '';
                scheduleContentRender();
            });
            customerList = document.createElement('div');
            customerList.className = 'select-navigator-customer-list';
            pane.append(head, customerSearch, customerList);
            return pane;
        }
        function buildFloorplanPane() {
            const pane = document.createElement('section');
            pane.className = 'select-navigator-floorplans';
            const head = document.createElement('div');
            head.className = 'select-navigator-pane-head select-navigator-floorplan-head';
            const titleWrap = document.createElement('div');
            floorplanTitle = appendText(titleWrap, 'select-navigator-pane-title', 'Plattegronden');
            floorplanSubtitle = appendText(titleWrap, 'select-navigator-pane-subtitle', 'Zoek op naam, verdieping, pand of adres');
            const controls = document.createElement('div');
            controls.className = 'select-navigator-controls';
            floorplanSearch = document.createElement('input');
            floorplanSearch.type = 'search';
            floorplanSearch.className = 'select-navigator-search';
            floorplanSearch.placeholder = 'Plattegrond zoeken...';
            floorplanSearch.autocomplete = 'off';
            floorplanSearch.setAttribute('aria-label', 'Plattegrond zoeken');
            floorplanSearch.addEventListener('input', () => {
                floorplanQuery = floorplanSearch?.value || '';
                scheduleContentRender();
            });
            filterSelect = document.createElement('select');
            filterSelect.className = 'select-navigator-filter-select';
            filterSelect.addEventListener('change', () => {
                navigatorState.setFilterValue(filterSelect?.value || '');
                renderContent();
            });
            controls.append(floorplanSearch, filterSelect);
            head.append(titleWrap, controls);
            floorplanList = document.createElement('div');
            floorplanList.className = 'select-navigator-floorplan-list';
            pane.append(head, floorplanList);
            return pane;
        }
        function customerItems() {
            const query = customerQuery.trim().toLowerCase();
            return (typeof getItems === 'function' ? getItems('customer') : [])
                .filter((item) => !query || [item.label, item.meta].join(' ').toLowerCase().includes(query));
        }
        function renderCustomers() {
            if (!customerList)
                return;
            customerList.innerHTML = '';
            const items = customerItems();
            if (!items.length) {
                appendEmpty(customerList, customerQuery ? 'Geen klanten gevonden' : 'Geen klanten beschikbaar');
                return;
            }
            items.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'select-navigator-customer';
                button.classList.toggle('selected', Number(item.index) === navigatorState.customerIndex);
                appendText(button, 'select-navigator-customer-name', item.label);
                appendText(button, 'select-navigator-customer-meta', item.meta);
                button.addEventListener('click', () => {
                    try {
                        navigatorState.setCustomer(Number(item.index), true);
                        navigatorState.setFilterValue('');
                        floorplanQuery = '';
                        if (floorplanSearch)
                            floorplanSearch.value = '';
                        if (typeof onCustomerFocus === 'function') {
                            void Promise.resolve(onCustomerFocus({ customerIndex: navigatorState.customerIndex })).catch(() => { });
                        }
                        renderContent();
                    }
                    catch (err) {
                        if (typeof close === 'function')
                            close();
                        throw err;
                    }
                });
                customerList?.appendChild(button);
            });
        }
        function floorplanItems() {
            const query = floorplanQuery.trim().toLowerCase();
            const filterGroup = floorplanFilterGroup();
            const filterValue = String(filterGroup?.value || '');
            return (typeof getItems === 'function'
                ? getItems('floorplan', { customerIndex: navigatorState.customerIndex })
                : [])
                .filter((item) => {
                if (filterValue && String(item.filterValues?.[filterGroup?.key || 'location'] || '') !== filterValue)
                    return false;
                const searchText = String(item.searchText || `${item.label || ''} ${item.meta || ''} ${item.description || ''}`).toLowerCase();
                return !query || searchText.includes(query);
            });
        }
        function syncFilterSelect() {
            if (!filterSelect)
                return;
            const group = floorplanFilterGroup();
            filterSelect.innerHTML = '';
            if (!group) {
                filterSelect.hidden = true;
                return;
            }
            const locationStep = FD.SelectSheetNavigatorLocationStep;
            filterSelect.hidden = locationStep.choosing(group, navigatorState.filterValue)
                || locationStep.options(group).length <= 1;
            if (filterSelect.hidden)
                return;
            filterSelect.setAttribute('aria-label', 'Pand/Locatie-filter');
            filterSelect.title = 'Pand/Locatie-filter';
            group.options.forEach((option) => {
                const opt = document.createElement('option');
                opt.value = String(option.value || '');
                opt.textContent = option.count ? `${option.label} (${option.count})` : String(option.label || '');
                filterSelect?.appendChild(opt);
            });
            filterSelect.value = group.value;
        }
        function syncFloorplanControls() {
            const hasCustomer = navigatorState.customerIndex !== null;
            const locationStep = hasCustomer && FD.SelectSheetNavigatorLocationStep.choosing(floorplanFilterGroup(), navigatorState.filterValue);
            if (floorplanSearch) {
                floorplanSearch.hidden = !hasCustomer || locationStep;
                floorplanSearch.disabled = !hasCustomer || locationStep;
            }
            if ((!hasCustomer || locationStep) && filterSelect) {
                filterSelect.hidden = true;
                return;
            }
            syncFilterSelect();
        }
        function renderFloorplans() {
            if (!floorplanList)
                return;
            const scrollTop = navigatorState.takeScrollTop(floorplanList);
            floorplanVirtualList?.destroy();
            floorplanVirtualList = null;
            floorplanList.innerHTML = '';
            syncFloorplanControls();
            if (navigatorState.customerIndex === null) {
                if (floorplanTitle)
                    floorplanTitle.textContent = 'Plattegronden';
                if (floorplanSubtitle)
                    floorplanSubtitle.textContent = 'Zoek op naam, verdieping, pand of adres';
                appendEmpty(floorplanList, 'Kies links een klant om plattegronden te zien');
                return;
            }
            if (FD.SelectSheetNavigatorLocationStep.choosing(floorplanFilterGroup(), navigatorState.filterValue)) {
                if (floorplanTitle)
                    floorplanTitle.textContent = 'Kies een locatie';
                if (floorplanSubtitle)
                    floorplanSubtitle.textContent = 'Kies eerst de locatie van deze klant';
                FD.SelectSheetNavigatorLocationStep.render(floorplanList, floorplanFilterGroup(), (value) => {
                    navigatorState.setFilterValue(value);
                    floorplanQuery = '';
                    if (floorplanSearch)
                        floorplanSearch.value = '';
                    renderContent();
                });
                return;
            }
            if (floorplanTitle)
                floorplanTitle.textContent = 'Plattegronden';
            if (floorplanSubtitle)
                floorplanSubtitle.textContent = 'Zoek op naam, verdieping, pand of adres';
            const items = floorplanItems();
            if (!items.length) {
                appendEmpty(floorplanList, floorplanQuery ? 'Geen plattegronden gevonden' : 'Geen plattegronden beschikbaar');
                return;
            }
            const virtualList = FD.SelectSheetVirtualList;
            if (items.length >= 48 && virtualList) {
                floorplanVirtualList = virtualList.create({
                    container: floorplanList,
                    items,
                    renderItem: (item) => createFloorplanButton(item),
                });
                navigatorState.restoreScroll(floorplanList, scrollTop);
                return;
            }
            items.forEach(item => floorplanList?.appendChild(createFloorplanButton(item)));
            navigatorState.restoreScroll(floorplanList, scrollTop);
        }
        function createFloorplanButton(item) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-navigator-floorplan';
            button.classList.toggle('selected', navigatorState.customerIndex === currentCustomerIndex() && Number(item.index) === currentFloorplanIndex());
            if (item.readOnly)
                button.classList.add('readonly');
            const main = document.createElement('span');
            main.className = 'select-navigator-floorplan-main';
            appendText(main, 'select-navigator-floorplan-title', item.label);
            appendText(main, 'select-navigator-floorplan-location', item.groupLabel || item.organizerLabel);
            appendText(main, 'select-navigator-floorplan-description', item.description);
            button.appendChild(main);
            const meta = document.createElement('span');
            meta.className = 'select-navigator-floorplan-meta';
            const availabilityBadge = appendText(meta, 'select-navigator-floorplan-badge', item.meta);
            if (availabilityBadge && typeof item.localState === 'boolean') {
                availabilityBadge.classList.add(item.localState ? 'is-local' : 'is-remote');
            }
            const doorCount = Number(item.floorplan?.doorCount || 0);
            if (doorCount)
                appendText(meta, 'select-navigator-floorplan-badge', `${doorCount} ${doorCount === 1 ? 'deur' : 'deuren'}`);
            appendText(meta, 'select-navigator-open-label', 'Open');
            button.appendChild(meta);
            button.addEventListener('click', () => {
                try {
                    if (typeof onSelect === 'function') {
                        onSelect('floorplan', { ...item, customerIndex: navigatorState.customerIndex });
                    }
                }
                finally {
                    if (typeof close === 'function')
                        close();
                }
            });
            return button;
        }
        function appendEmpty(parent, message) {
            const empty = document.createElement('div');
            empty.className = 'select-navigator-empty';
            empty.textContent = message;
            parent.appendChild(empty);
        }
        function renderContent() {
            renderCustomers();
            renderFloorplans();
        }
        function render(activeType) {
            if (!isNavigatorViewport() || !['customer', 'floorplan'].includes(String(activeType || ''))) {
                destroy();
                return false;
            }
            elements.search.hidden = true;
            elements.filters.hidden = true;
            elements.filters.innerHTML = '';
            if (!root) {
                navigatorState.setCustomer(currentCustomerIndex(), true);
                navigatorState.setFilterValue('');
                buildRoot();
            }
            else
                navigatorState.restoreCustomer();
            renderContent();
            return true;
        }
        function focusSearch(activeType) {
            if (!root || !isNavigatorViewport())
                return false;
            if (activeType === 'floorplan' && navigatorState.customerIndex === null)
                return false;
            const search = activeType === 'customer'
                ? customerSearch
                : (activeType === 'floorplan' ? floorplanSearch : null);
            if (!search)
                return false;
            search.focus();
            return true;
        }
        function destroy() {
            floorplanVirtualList?.destroy();
            floorplanVirtualList = null;
            if (root) {
                elements.list.innerHTML = '';
                elements.list.classList.remove('select-sheet-list--desktop');
                root = null;
            }
            customerList = null;
            floorplanList = null;
            customerSearch = null;
            floorplanSearch = null;
            filterSelect = null;
            floorplanTitle = null;
            floorplanSubtitle = null;
            customerQuery = '';
            floorplanQuery = '';
            navigatorState.reset();
            elements.search.hidden = false;
        }
        return { destroy, focusSearch, render };
    }
    FD.SelectSheetNavigator = { createController };
})(window);
