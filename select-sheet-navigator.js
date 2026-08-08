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
    function injectCustomerSearchHintStyles() {
        if (document.getElementById?.('select-navigator-customer-search-hint-style'))
            return;
        const style = document.createElement('style');
        style.id = 'select-navigator-customer-search-hint-style';
        style.textContent = `
      .select-navigator-customer-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .select-navigator-customer-head-copy { min-width:0; }
      .select-navigator-customer-search-hint { display:inline-flex; flex:0 0 auto; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:var(--fd-admin-primary-soft,#eaf2ff); color:var(--fd-admin-primary,#155fc6); }
      .select-navigator-customer-search-hint svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; }
      @media ${TABLET_NAVIGATOR_QUERY} and (max-width:859px) { .select-sheet{width:min(820px,calc(100vw - 28px));}.select-sheet-close{width:48px;height:48px;}.select-sheet-list--desktop{padding:0;background:#f8fafc;overflow:hidden;}.select-navigator{height:min(680px,calc(var(--app-height,100dvh) - var(--topbar-h,52px) - 92px));min-height:0;display:grid;grid-template-columns:minmax(230px,.68fr) minmax(0,1fr);background:#fff;}.select-navigator-customers,.select-navigator-floorplans{min-width:0;min-height:0;display:flex;flex-direction:column;}.select-navigator-customers{border-right:1px solid #e5e7eb;background:#f8fafc;}.select-navigator-pane-head{flex:0 0 auto;padding:12px 14px 10px;border-bottom:1px solid #e5e7eb;}.select-navigator-floorplan-head{display:block;}.select-navigator-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:8px;}.select-navigator-search,.select-navigator-filter-select{min-height:46px;width:100%;box-sizing:border-box;border:1px solid #d7dbe0;border-radius:8px;background:#fff;color:#1f2933;font-size:14px;font-weight:700;}.select-navigator-search{margin:0;padding:10px 12px;}.select-navigator-customers>.select-navigator-search{width:calc(100% - 28px);margin:10px 14px 8px;}.select-navigator-filter-select{padding:10px 34px 10px 12px;}.select-navigator-customer-list,.select-navigator-floorplan-list{flex:1;min-height:0;overflow-y:auto;}.select-navigator-customer-list{padding:0 8px 10px;}.select-navigator-floorplan-list{padding:10px 12px 14px;}.select-navigator-customer,.select-navigator-floorplan{width:100%;border:1px solid transparent;border-radius:8px;background:transparent;color:#1f2933;text-align:left;cursor:pointer;}.select-navigator-customer{min-height:50px;display:block;padding:10px;}.select-navigator-customer.selected,.select-navigator-floorplan.selected{border-color:#1a73e8;background:#e8f0fe;color:#174ea6;}.select-navigator-customer-name,.select-navigator-customer-meta,.select-navigator-floorplan-title,.select-navigator-floorplan-location,.select-navigator-floorplan-description{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.select-navigator-customer-name,.select-navigator-floorplan-title{font-size:15px;font-weight:850;line-height:1.25;}.select-navigator-customer-meta,.select-navigator-floorplan-location,.select-navigator-floorplan-description{margin-top:3px;color:#66717f;font-size:12px;font-weight:700;}.select-navigator-floorplan{min-height:74px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-bottom:8px;padding:10px;border-color:#e5e7eb;background:#fff;}.select-navigator-floorplan.readonly{background:#f5f6f7;color:#7a858f;}.select-navigator-floorplan-meta{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:5px;}.select-navigator-floorplan-badge,.select-navigator-open-label{display:inline-flex;align-items:center;min-height:26px;padding:4px 7px;border-radius:999px;background:#eef4ff;color:#174ea6;font-size:12px;font-weight:850;white-space:nowrap;}.select-navigator-open-label{border-radius:8px;background:#155fc6;color:#fff;}.select-navigator-empty{padding:24px 14px;color:#66717f;font-size:14px;font-weight:750;text-align:center;} }
    `;
        document.head.appendChild(style);
    }
    function customerSearchHint() {
        const hint = document.createElement('span');
        hint.className = 'select-navigator-customer-search-hint';
        hint.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '10.8');
        circle.setAttribute('cy', '10.8');
        circle.setAttribute('r', '6.4');
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        handle.setAttribute('d', 'm16 16 4.2 4.2');
        svg.append(circle, handle);
        hint.appendChild(svg);
        return hint;
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
            injectCustomerSearchHintStyles();
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
            head.append(copy, customerSearchHint());
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
                        if (typeof onCustomerFocus === 'function') {
                            void Promise.resolve(onCustomerFocus({ customerIndex: draftCustomerIndex })).catch(() => { });
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
        function syncFloorplanControls() {
            const hasCustomer = draftCustomerIndex !== null;
            if (floorplanSearch) {
                floorplanSearch.hidden = !hasCustomer;
                floorplanSearch.disabled = !hasCustomer;
            }
            if (!hasCustomer && filterSelect) {
                filterSelect.hidden = true;
                return;
            }
            syncFilterSelect();
        }
        function renderFloorplans() {
            if (!floorplanList)
                return;
            floorplanList.innerHTML = '';
            syncFloorplanControls();
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
            if (!isNavigatorViewport() || !['customer', 'floorplan'].includes(String(activeType || ''))) {
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
            if (!root || !isNavigatorViewport())
                return false;
            if (activeType === 'floorplan' && draftCustomerIndex === null)
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
