(function (global) {
    const FD = global.FD = global.FD || {};
    const SEARCH_DELAY_MS = 180;
    const LOCAL_RESULT_LIMIT = 4;
    function normalize(value) {
        return String(value || '').trim().toLocaleLowerCase('nl-NL');
    }
    function matches(query, values) {
        return values.some(value => normalize(value).includes(query));
    }
    function appendText(parent, tag, className, value) {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = value;
        parent.appendChild(node);
        return node;
    }
    function injectStyles() {
        if (document.getElementById('global-search-style'))
            return;
        const style = document.createElement('style');
        style.id = 'global-search-style';
        style.textContent = `
      .topbar-global-search-btn { display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; width:44px; min-height:44px; padding:0; border:1px solid rgba(255,255,255,.88); border-radius:8px; background:rgba(255,255,255,.08); color:#fff; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(255,255,255,.10); transition:background 120ms ease,border-color 120ms ease,box-shadow 120ms ease,transform 120ms ease; }
      .topbar-global-search-btn:hover,.topbar-global-search-btn:focus-visible { background:var(--fd-topbar-control-hover,rgba(255,255,255,.17)); border-color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 2px 8px rgba(0,0,0,.18); transform:translateY(-1px); outline:none; }
      .topbar-global-search-btn svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; }
      .global-search-popover { position:fixed; z-index:620; width:min(500px,calc(100vw - 24px)); max-height:min(560px,calc(100vh - 24px)); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--fd-admin-border,#d9e2ed); border-radius:12px; background:var(--fd-admin-surface,#fff); color:var(--fd-admin-text,#182230); box-shadow:0 18px 42px rgba(15,23,42,.24); }
      .global-search-popover[hidden] { display:none; }
      .global-search-head { padding:14px 14px 10px; border-bottom:1px solid var(--fd-admin-border,#e5eaf1); background:var(--fd-admin-surface,#fff); }
      .global-search-input-wrap { display:flex; align-items:center; gap:10px; min-height:46px; padding:0 12px; border:1px solid var(--fd-admin-border,#cbd5e1); border-radius:8px; background:var(--fd-admin-surface-muted,#f8fafc); color:var(--fd-admin-muted,#5f6b7a); }
      .global-search-input-wrap:focus-within { border-color:var(--fd-admin-primary,#155fc6); box-shadow:0 0 0 3px color-mix(in srgb,var(--fd-admin-primary,#155fc6) 18%,transparent); }
      .global-search-icon { font-size:20px; line-height:1; }
      .global-search-input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:inherit; font:inherit; font-size:15px; font-weight:650; }
      .global-search-input::placeholder { color:var(--fd-admin-muted,#64748b); font-weight:500; }
      .global-search-close { border:0; padding:6px; border-radius:6px; background:transparent; color:var(--fd-admin-muted,#64748b); font:inherit; cursor:pointer; }
      .global-search-close:hover,.global-search-close:focus-visible { background:var(--fd-admin-primary-soft,#eaf2ff); color:var(--fd-admin-primary,#155fc6); outline:none; }
      .global-search-results { min-height:0; overflow:auto; padding:8px; }
      .global-search-help { padding:20px 12px; color:var(--fd-admin-muted,#64748b); font-size:14px; line-height:1.45; text-align:center; }
      .global-search-group + .global-search-group { margin-top:8px; padding-top:8px; border-top:1px solid var(--fd-admin-border,#edf1f5); }
      .global-search-group-title { padding:4px 8px 6px; color:var(--fd-admin-muted,#64748b); font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
      .global-search-result { width:100%; display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center; padding:10px 8px; border:0; border-radius:8px; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
      .global-search-result:hover,.global-search-result.is-active,.global-search-result:focus-visible { background:var(--fd-admin-primary-soft,#eaf2ff); outline:none; }
      .global-search-result-mark { width:10px; height:10px; border-radius:999px; background:var(--fd-admin-primary,#155fc6); }
      .global-search-result[data-kind="floorplan"] .global-search-result-mark { border-radius:3px; background:var(--fd-admin-info,#64748b); }
      .global-search-result[data-kind="customer"] .global-search-result-mark { border-radius:2px; background:var(--fd-admin-success,#259961); }
      .global-search-result[data-status="groen"] .global-search-result-mark { background:var(--fd-admin-success,#259961); }
      .global-search-result-main { min-width:0; }
      .global-search-result-label { display:block; overflow:hidden; color:var(--fd-admin-text,#182230); font-size:15px; font-weight:760; text-overflow:ellipsis; white-space:nowrap; }
      .global-search-result-meta { display:block; overflow:hidden; margin-top:2px; color:var(--fd-admin-muted,#64748b); font-size:12px; font-weight:560; text-overflow:ellipsis; white-space:nowrap; }
      .global-search-result-kind { color:var(--fd-admin-muted,#64748b); font-size:11px; font-weight:760; white-space:nowrap; }
      @media (max-width:720px) { .global-search-popover { width:calc(100vw - 16px); max-height:calc(100vh - 16px); } }
    `;
        document.head.appendChild(style);
    }
    function create(input) {
        let open = false;
        let selectedIndex = -1;
        let queryTimer = null;
        let searchController = null;
        let searchGeneration = 0;
        let results = [];
        let remoteDoors = [];
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'topbar-global-search-btn';
        trigger.setAttribute('aria-label', 'Zoeken in DoorAtlas (Ctrl+K)');
        trigger.title = 'Zoeken in DoorAtlas (Ctrl+K)';
        trigger.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.4"></circle><path d="m16 16 4.2 4.2"></path></svg>';
        input.anchor.insertAdjacentElement('afterend', trigger);
        const popover = document.createElement('section');
        popover.className = 'global-search-popover';
        popover.hidden = true;
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'DoorAtlas doorzoeker');
        const head = document.createElement('div');
        head.className = 'global-search-head';
        const inputWrap = document.createElement('div');
        inputWrap.className = 'global-search-input-wrap';
        const icon = document.createElement('span');
        icon.className = 'global-search-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⌕';
        const field = document.createElement('input');
        field.type = 'search';
        field.className = 'global-search-input';
        field.placeholder = 'Zoek klant, plattegrond of deur…';
        field.autocomplete = 'off';
        field.setAttribute('aria-label', 'Zoek klant, plattegrond of deur');
        field.setAttribute('role', 'combobox');
        field.setAttribute('aria-expanded', 'false');
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'global-search-close';
        closeButton.textContent = 'Sluiten';
        inputWrap.append(icon, field, closeButton);
        head.appendChild(inputWrap);
        const resultList = document.createElement('div');
        resultList.className = 'global-search-results';
        resultList.setAttribute('role', 'listbox');
        popover.append(head, resultList);
        document.body.appendChild(popover);
        function position() {
            if (!open)
                return;
            const box = trigger.getBoundingClientRect();
            const width = Math.min(500, window.innerWidth - 24);
            const left = Math.max(12, Math.min(box.right - width, window.innerWidth - width - 12));
            const below = box.bottom + 8;
            const top = below + 260 < window.innerHeight ? below : Math.max(12, box.top - 8);
            popover.style.left = `${Math.round(left)}px`;
            popover.style.top = `${Math.round(top)}px`;
            if (top !== below)
                popover.style.transform = 'translateY(-100%)';
            else
                popover.style.transform = '';
        }
        function localResults(query) {
            const customers = input.getCustomers() || [];
            // A local query may only use text rendered in its result. `name` is the
            // internal floor ID in the scoped catalog and shortName is not shown here.
            const customerMatches = customers
                .filter(customer => matches(query, [customer.customer]))
                .slice(0, LOCAL_RESULT_LIMIT)
                .map(customer => ({
                kind: 'customer',
                key: `customer:${customer.tenantId || customer.customer}`,
                label: String(customer.customer || 'Klant'),
                meta: `${(customer.floorplans || []).length} plattegrond${(customer.floorplans || []).length === 1 ? '' : 'en'}`,
                data: customer,
            }));
            const floorMatches = customers.flatMap(customer => (customer.floorplans || []).map((floorplan) => ({ customer, floorplan })))
                .filter(({ customer, floorplan }) => matches(query, [customer.customer, floorplan.displayName || floorplan.name]))
                .slice(0, LOCAL_RESULT_LIMIT)
                .map(({ customer, floorplan }) => ({
                kind: 'floorplan',
                key: `floorplan:${customer.tenantId}:${floorplan.floorId || floorplan.id || floorplan.name}`,
                label: String(floorplan.displayName || floorplan.name || 'Plattegrond'),
                meta: String(customer.customer || ''),
                data: { customer, floorplan, tenant_id: customer.tenantId, floor_id: floorplan.floorId || floorplan.id },
            }));
            return [...customerMatches, ...floorMatches];
        }
        function doorResults(rows) {
            return rows.map(row => ({
                kind: 'door',
                key: `door:${row.door_id}`,
                label: String(row.door_code || row.name || 'Deur'),
                meta: [row.name && row.name !== row.door_code ? row.name : '', row.tenant_name, row.location_name, row.floor_name].filter(Boolean).join(' · '),
                data: row,
            }));
        }
        function render() {
            const value = normalize(field.value);
            results = value ? [...localResults(value), ...doorResults(remoteDoors)] : [];
            if (selectedIndex >= results.length)
                selectedIndex = results.length - 1;
            resultList.innerHTML = '';
            field.setAttribute('aria-expanded', open && results.length ? 'true' : 'false');
            field.removeAttribute('aria-activedescendant');
            if (!value) {
                appendText(resultList, 'p', 'global-search-help', 'Zoek op klant, pand, plattegrond, deurcode of omschrijving.');
                return;
            }
            if (value.length < 2) {
                appendText(resultList, 'p', 'global-search-help', 'Typ minimaal twee tekens om deuren te zoeken.');
            }
            const groups = [
                ['customer', 'Klanten'], ['floorplan', 'Plattegronden'], ['door', 'Deuren'],
            ];
            groups.forEach(([kind, title]) => {
                const groupResults = results.filter(result => result.kind === kind);
                if (!groupResults.length)
                    return;
                const group = document.createElement('section');
                group.className = 'global-search-group';
                appendText(group, 'div', 'global-search-group-title', title);
                groupResults.forEach(result => {
                    const index = results.indexOf(result);
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.id = `global-search-result-${index}`;
                    button.className = 'global-search-result';
                    button.dataset.kind = result.kind;
                    button.dataset.status = String(result.data.status || '');
                    button.setAttribute('role', 'option');
                    button.setAttribute('aria-selected', selectedIndex === index ? 'true' : 'false');
                    button.classList.toggle('is-active', selectedIndex === index);
                    const mark = document.createElement('span');
                    mark.className = 'global-search-result-mark';
                    mark.setAttribute('aria-hidden', 'true');
                    const main = document.createElement('span');
                    main.className = 'global-search-result-main';
                    appendText(main, 'span', 'global-search-result-label', result.label);
                    if (result.meta)
                        appendText(main, 'span', 'global-search-result-meta', result.meta);
                    const kindLabel = result.kind === 'door' ? 'Deur' : (result.kind === 'floorplan' ? 'Plattegrond' : 'Klant');
                    appendText(button, 'span', 'global-search-result-kind', kindLabel);
                    button.prepend(mark, main);
                    button.addEventListener('mousemove', () => {
                        if (selectedIndex === index)
                            return;
                        selectedIndex = index;
                        render();
                    });
                    button.addEventListener('click', () => void selectResult(index));
                    group.appendChild(button);
                });
                resultList.appendChild(group);
            });
            if (!results.length && value.length >= 2) {
                appendText(resultList, 'p', 'global-search-help', 'Geen klant, plattegrond of deur gevonden.');
            }
            if (selectedIndex >= 0)
                field.setAttribute('aria-activedescendant', `global-search-result-${selectedIndex}`);
        }
        async function runSearch() {
            const value = String(field.value || '').trim();
            searchController?.abort();
            searchController = null;
            remoteDoors = [];
            if (!open || value.length < 2 || navigator.onLine === false) {
                render();
                return;
            }
            const generation = ++searchGeneration;
            const controller = new AbortController();
            searchController = controller;
            render();
            try {
                const rows = await FD.DataService.searchWorkspaceDoors(input.config, value, {
                    signal: controller.signal,
                    diagnostics: { purpose: 'global_door_search', background: false },
                });
                if (!open || controller.signal.aborted || generation !== searchGeneration)
                    return;
                remoteDoors = Array.isArray(rows) ? rows : [];
            }
            catch (error) {
                if (error?.name !== 'AbortError' && generation === searchGeneration) {
                    remoteDoors = [];
                }
            }
            finally {
                if (generation === searchGeneration)
                    render();
            }
        }
        function scheduleSearch() {
            if (queryTimer)
                clearTimeout(queryTimer);
            remoteDoors = [];
            selectedIndex = -1;
            render();
            queryTimer = setTimeout(() => void runSearch(), SEARCH_DELAY_MS);
        }
        async function selectResult(index) {
            const result = results[index];
            if (!result)
                return;
            close();
            try {
                await input.onSelect(result);
            }
            catch (error) {
                console.warn('DoorAtlas zoekresultaat openen mislukt:', error);
            }
        }
        function openSearch() {
            if (!input.canOpen()) {
                input.onBlocked();
                return;
            }
            open = true;
            popover.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            position();
            render();
            requestAnimationFrame(() => field.focus());
        }
        function close() {
            if (!open)
                return;
            open = false;
            if (queryTimer)
                clearTimeout(queryTimer);
            queryTimer = null;
            searchGeneration += 1;
            searchController?.abort();
            searchController = null;
            remoteDoors = [];
            selectedIndex = -1;
            field.value = '';
            popover.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
        function bind() {
            trigger.addEventListener('click', () => open ? close() : openSearch());
            closeButton.addEventListener('click', close);
            field.addEventListener('input', scheduleSearch);
            field.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                    trigger.focus();
                }
                else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    if (!results.length)
                        return;
                    event.preventDefault();
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    selectedIndex = (selectedIndex + delta + results.length) % results.length;
                    render();
                }
                else if (event.key === 'Enter' && selectedIndex >= 0) {
                    event.preventDefault();
                    void selectResult(selectedIndex);
                }
            });
            document.addEventListener('pointerdown', event => {
                if (open && !popover.contains(event.target) && !trigger.contains(event.target))
                    close();
            });
            document.addEventListener('keydown', event => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                    event.preventDefault();
                    if (open)
                        field.focus();
                    else
                        openSearch();
                }
            });
            window.addEventListener('resize', position);
            window.addEventListener('scroll', position, true);
        }
        return { bind, close, open: openSearch, trigger };
    }
    injectStyles();
    FD.GlobalSearchService = { create };
})(window);
