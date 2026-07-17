(function (global) {
    const FD = global.FD = global.FD || {};
    const MIN_DESKTOP_WIDTH = 860;
    function text(value) {
        return String(value || '').trim();
    }
    function isDesktopViewport() {
        if (typeof global.matchMedia === 'function')
            return global.matchMedia(`(min-width: ${MIN_DESKTOP_WIDTH}px)`).matches;
        return Number(global.innerWidth || 0) >= MIN_DESKTOP_WIDTH;
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
        const { elements, getItems, getFilterGroups, onSelect, close } = options;
        let root = null;
        let customerList = null;
        let floorplanList = null;
        let customerSearch = null;
        let floorplanSearch = null;
        let filterSelect = null;
        let customerQuery = '';
        let floorplanQuery = '';
        let draftCustomerIndex = null;
        let draftFilterValue = '';
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
                ? (getFilterGroups('floorplan', { customerIndex: draftCustomerIndex }) || [])
                : [];
            const group = groups.find((item) => item?.key === 'location') || groups[0];
            if (!group || !Array.isArray(group.options) || !group.options.length)
                return null;
            return {
                key: String(group.key || 'location'),
                label: text(group.label || 'Pand'),
                value: draftFilterValue,
                options: group.options,
            };
        }
        function buildRoot() {
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
            head.className = 'select-navigator-pane-head';
            appendText(head, 'select-navigator-pane-title', 'Klanten');
            appendText(head, 'select-navigator-pane-subtitle', 'Zoek en kies een klant');
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
            appendText(titleWrap, 'select-navigator-pane-title', 'Plattegronden');
            appendText(titleWrap, 'select-navigator-pane-subtitle', 'Zoek op naam, verdieping, pand of adres');
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
                draftFilterValue = filterSelect?.value || '';
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
                button.classList.toggle('selected', Number(item.index) === draftCustomerIndex);
                appendText(button, 'select-navigator-customer-name', item.label);
                appendText(button, 'select-navigator-customer-meta', item.meta);
                button.addEventListener('click', () => {
                    try {
                        draftCustomerIndex = Number(item.index);
                        draftFilterValue = '';
                        floorplanQuery = '';
                        if (floorplanSearch)
                            floorplanSearch.value = '';
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
                ? getItems('floorplan', { customerIndex: draftCustomerIndex })
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
            filterSelect.hidden = false;
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
        function renderFloorplans() {
            if (!floorplanList)
                return;
            floorplanList.innerHTML = '';
            syncFilterSelect();
            if (draftCustomerIndex === null) {
                appendEmpty(floorplanList, 'Kies links een klant om plattegronden te zien');
                return;
            }
            const items = floorplanItems();
            if (!items.length) {
                appendEmpty(floorplanList, floorplanQuery ? 'Geen plattegronden gevonden' : 'Geen plattegronden beschikbaar');
                return;
            }
            items.forEach(item => floorplanList?.appendChild(createFloorplanButton(item)));
        }
        function createFloorplanButton(item) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-navigator-floorplan';
            button.classList.toggle('selected', draftCustomerIndex === currentCustomerIndex() && Number(item.index) === currentFloorplanIndex());
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
            appendText(meta, 'select-navigator-floorplan-badge', item.meta);
            const doorCount = Number(item.floorplan?.doorCount || 0);
            if (doorCount)
                appendText(meta, 'select-navigator-floorplan-badge', `${doorCount} deuren`);
            appendText(meta, 'select-navigator-open-label', 'Open');
            button.appendChild(meta);
            button.addEventListener('click', () => {
                try {
                    if (typeof onSelect === 'function') {
                        onSelect('floorplan', { ...item, customerIndex: draftCustomerIndex });
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
            if (!isDesktopViewport() || !['customer', 'floorplan'].includes(String(activeType || ''))) {
                destroy();
                return false;
            }
            elements.search.hidden = true;
            elements.filters.hidden = true;
            elements.filters.innerHTML = '';
            if (!root) {
                draftCustomerIndex = currentCustomerIndex();
                draftFilterValue = '';
                buildRoot();
            }
            renderContent();
            return true;
        }
        function focusSearch(activeType) {
            if (!root || !isDesktopViewport())
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
            customerQuery = '';
            floorplanQuery = '';
            draftCustomerIndex = null;
            draftFilterValue = '';
            elements.search.hidden = false;
        }
        return { destroy, focusSearch, render };
    }
    FD.SelectSheetNavigator = { createController };
})(window);
