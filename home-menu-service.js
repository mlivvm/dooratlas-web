(function (global) {
    const FD = global.FD = global.FD || {};
    const styleId = 'dooratlas-home-menu-style';
    let options = null;
    let renderVersion = 0;
    let recentRequest = null;
    function element(tag, className = '', value = '') {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = value;
        return node;
    }
    function icon(name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.8');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('d', name === 'search'
            ? 'm20 20-4-4m1-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'
            : name === 'building' ? 'M4 20V6l7-3v17m0-11h7v11M2 20h20'
                : 'm9 18 6-6-6-6');
        svg.append(path);
        return svg;
    }
    function installStyles() {
        if (document.getElementById(styleId))
            return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .loading.loading--home { display: block; padding: 0; background: linear-gradient(135deg, #e9f1fd 0%, #f8fbff 46%, #fdf2e5 100%); }
      .loading.loading--home::before { background: repeating-linear-gradient(90deg, rgba(21,96,200,.05) 0 1px, transparent 1px 72px), repeating-linear-gradient(0deg, rgba(21,96,200,.05) 0 1px, transparent 1px 72px); animation: none; }
      .loading.loading--home::after { display: none; }
      .home-menu { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; overflow: auto; padding: clamp(22px, 5vh, 58px) 0; color: #12294d; font: inherit; }
      .home-menu-content { position: relative; z-index: 2; display: grid; justify-items: center; width: min(920px, calc(100% - 40px)); text-align: center; }
      .home-menu-hero { display: grid; justify-items: center; max-width: 610px; }
      .home-menu-logo { display: block; width: min(154px, 54%); height: auto; margin-bottom: 15px; }
      .home-menu-title { margin: 0; color: #12294d; font-size: clamp(29px, 3.1vw, 40px); font-weight: 850; letter-spacing: -.035em; line-height: 1.14; }
      .home-menu-subtitle { max-width: 480px; margin: 10px 0 0; color: #5b6b80; font-size: 16px; line-height: 1.55; }
      .home-menu-advanced { min-height: 40px; margin-top: 15px; padding: 0 18px; border: 1px solid #bfd3ed; border-radius: 9px;
        background: rgba(255,255,255,.8); color: #1560c8; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease; }
      .home-menu-advanced:hover { border-color: #1560c8; background: #fff; }
      .home-menu-search-wrap { position: relative; z-index: 3; width: min(720px, 100%); margin-top: 10px; }
      .home-menu-search { box-sizing: border-box; min-height: 62px; width: 100%; display: flex; align-items: center; gap: 14px; padding: 0 17px; border: 1px solid #dfe7f2; border-radius: 14px;
        background: #fff; box-shadow: 0 14px 36px rgba(18,41,77,.14); text-align: left; transition: border-color 140ms ease, box-shadow 140ms ease; }
      .home-menu-search:focus-within { border-color: #1560c8; box-shadow: 0 17px 40px rgba(18,41,77,.19); }
      .home-menu-search svg { width: 21px; height: 21px; flex: 0 0 auto; color: #1560c8; }
      .home-menu-search-input { min-width: 0; flex: 1; border: 0; outline: 0; appearance: none; background: transparent; color: #12294d; font: inherit; font-size: 17px; }
      .home-menu-search-input::-webkit-search-cancel-button { appearance: none; }
      .home-menu-search-input::placeholder { color: #98a4b3; opacity: 1; }
      .home-menu-search-input:focus-visible { outline: none; }
      .home-menu-results { position: absolute; top: 76px; left: 0; z-index: 4; display: grid; grid-template-columns: minmax(330px, 1.08fr) minmax(300px, .92fr); width: 100%; overflow: hidden; border: 1px solid #e3eaf4; border-radius: 14px;
        background: #fff; box-shadow: 0 22px 54px rgba(18,41,77,.22); text-align: left; }
      .home-menu-results[hidden] { display: none; }
      .home-menu-results-pane { display: flex; min-width: 0; max-height: min(360px, calc(100vh - 230px)); flex-direction: column; padding: 10px 0 12px; }
      .home-menu-results-pane + .home-menu-results-pane { border-left: 1px solid #eef1f5; background: #fbfcfe; }
      .home-menu-results-kicker { padding: 8px 18px 10px; color: #8a97a8; font-size: 11px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
      .home-menu-results-list { min-height: 0; flex: 1; overflow: auto; }
      .home-menu-customer, .home-menu-floor { width: 100%; display: flex; align-items: center; gap: 11px; padding: 10px 18px; border: 0; border-left: 3px solid transparent;
        background: transparent; color: #12294d; font: inherit; text-align: left; cursor: pointer; }
      .home-menu-customer:hover, .home-menu-floor:hover { background: #f4f8fd; }
      .home-menu-customer.is-active { border-left-color: #1560c8; background: #eaf2fe; }
      .home-menu-customer svg { width: 17px; height: 17px; flex: 0 0 auto; color: #1560c8; }
      .home-menu-customer .home-menu-customer-arrow { width: 14px; height: 14px; margin-left: 3px; color: #aebdce; }
      .home-menu-result-copy { display: grid; min-width: 0; gap: 2px; }
      .home-menu-result-name { overflow: hidden; min-width: 0; font-size: 14px; line-height: 1.32; text-overflow: ellipsis; white-space: nowrap; }
      .home-menu-result-meta { overflow: hidden; color: #7b8798; font-size: 12px; line-height: 1.32; text-overflow: ellipsis; white-space: nowrap; }
      .home-menu-customer-count { color: #9aa5b4; font-size: 11px; line-height: 1.32; }
      .home-menu-customer .home-menu-result-name { overflow: visible; text-overflow: clip; white-space: normal; }
      .home-menu-customer .home-menu-result-meta { overflow: visible; white-space: normal; }
      .home-menu-floor { gap: 13px; }
      .home-menu-floor-preview { width: 46px; height: 46px; flex: 0 0 auto; border: 1px solid #e2e9f3; border-radius: 7px; background-color: #eef3fa;
        background-image: linear-gradient(rgba(21,96,200,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(21,96,200,.16) 1px, transparent 1px); background-size: 12px 12px; }
      .home-menu-floor .home-menu-result-name { font-weight: 800; }
      .home-menu-floor-action { margin-left: auto; color: #1560c8; font-size: 12px; font-weight: 750; white-space: nowrap; }
      .home-menu-floor > svg { width: 17px; height: 17px; flex: 0 0 auto; color: #b3bfcd; }
      .home-menu-results-empty { margin: 6px 18px 14px; color: #7b8798; font-size: 13px; line-height: 1.45; }
      .home-menu-recent { width: 100%; margin-top: 30px; }
      .home-menu-recent[hidden] { display: none; }
      .home-menu-recent-title { margin: 0; color: #8a97a8; font-size: 11.5px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
      .home-menu-all { min-height: 32px; padding: 0; border: 0; background: transparent; color: #1560c8; font: inherit; font-size: 13px; cursor: pointer; }
      .home-menu-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
      .home-menu-card { min-width: 0; min-height: 76px; display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e6eaf0; border-radius: 12px;
        background: #fff; color: #12294d; font: inherit; text-align: left; cursor: pointer; animation: homeMenuCardIn 180ms ease-out both; transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease; }
      .home-menu-card:hover { border-color: #c3d4ea; box-shadow: 0 8px 22px rgba(18,41,77,.12); transform: translateY(-2px); }
      .home-menu-card:disabled { cursor: wait; opacity: .7; }
      .home-menu-preview { position: relative; width: 58px; height: 58px; flex: 0 0 auto; overflow: hidden; border: 1px solid #e2e9f3; border-radius: 8px; background-color: #eef3fa;
        background-image: linear-gradient(rgba(21,96,200,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(21,96,200,.16) 1px, transparent 1px); background-size: 14px 14px; }
      .home-menu-preview img { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: contain; background: #fff; }
      .home-menu-card-copy { display: grid; min-width: 0; gap: 3px; }
      .home-menu-card-title { overflow: hidden; color: #12294d; font-size: 14px; font-weight: 800; line-height: 1.32; text-overflow: ellipsis; white-space: nowrap; }
      .home-menu-card-meta { overflow: hidden; color: #7b8798; font-size: 12px; line-height: 1.38; text-overflow: ellipsis; white-space: nowrap; }
      .home-menu-card-time { padding-bottom: 1px; color: #9aa5b4; font-size: 12px; line-height: 1.42; white-space: nowrap; }
      .home-menu-recent-skeleton { grid-column: 1 / -1; height: 76px; border: 1px solid #e6eaf0; border-radius: 12px; background: linear-gradient(100deg, #eef3f9 28%, #f8fbff 45%, #eef3f9 62%); background-size: 220% 100%; animation: homeMenuSkeleton 1.15s ease-in-out infinite; }
      @keyframes homeMenuCardIn { from { opacity: 0; transform: translateY(4px); } }
      @keyframes homeMenuSkeleton { to { background-position: -120% 0; } }
      .home-menu-advanced:focus-visible, .home-menu-card:focus-visible, .home-menu-all:focus-visible, .home-menu-customer:focus-visible, .home-menu-floor:focus-visible { outline: 3px solid rgba(21,96,200,.32); outline-offset: 2px; }
      @media (max-width: 760px) {
        .home-menu-content { width: min(690px, calc(100% - 32px)); }
        .home-menu-results { grid-template-columns: minmax(280px, 1.05fr) minmax(260px, .95fr); }
        .home-menu-grid { gap: 10px; }
        .home-menu-card { gap: 9px; padding: 11px; }
        .home-menu-preview { width: 52px; height: 52px; }
        .home-menu-title { font-size: 36px; }
        .home-menu-recent { margin-top: 26px; }
      }
      @media (max-width: 600px) {
        .home-menu { align-items: flex-start; overflow: auto; padding: 24px 0; }
        .home-menu-content { align-self: start; }
        .home-menu-results { grid-template-columns: 1fr; }
        .home-menu-results-pane { max-height: 220px; }
        .home-menu-results-pane + .home-menu-results-pane { border-top: 1px solid #eef1f5; border-left: 0; }
        .home-menu-grid { grid-template-columns: 1fr; }
        .home-menu-recent { margin-bottom: 18px; }
        .home-menu-advanced { width: 100%; }
        .home-menu-subtitle { font-size: 15px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .home-menu-search, .home-menu-card, .home-menu-advanced { animation: none; transition: none; }
        .home-menu-card:hover { transform: none; }
        .home-menu-recent-skeleton { animation: none; }
      }
    `;
        document.head.append(style);
    }
    function normalize(value) {
        return String(value || '').trim().toLocaleLowerCase('nl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    }
    function floorId(floorplan) {
        const value = Number(floorplan?.floorId || floorplan?.id || floorplan?.file || floorplan?.name || 0);
        return Number.isInteger(value) && value > 0 ? value : 0;
    }
    function floorplanTitle(floorplan) {
        return String(FD.SelectSheetService?.floorplanDisplayName?.(floorplan) || floorplan?.displayName || floorplan?.name || 'Plattegrond');
    }
    function doorCountText(value) {
        const count = Number(value || 0);
        return `${Number.isInteger(count) ? count : 0} ${count === 1 ? 'deur' : 'deuren'}`;
    }
    function relativeTime(value) {
        const date = new Date(String(value || ''));
        if (Number.isNaN(date.getTime()))
            return 'Recent geopend';
        const days = Math.floor((Date.now() - date.getTime()) / 86400000);
        return days <= 0 ? 'Vandaag geopend' : days === 1 ? 'Gisteren geopend' : days < 7 ? `${days} dagen geleden` : 'Eerder geopend';
    }
    function recentItems(rows) {
        const customers = Array.isArray(options?.getCustomers?.()) ? options?.getCustomers?.() : [];
        const found = new Set();
        return rows.reduce((items, row) => {
            const id = Number(row?.floor_id || row?.floorId || 0);
            if (!Number.isInteger(id) || id < 1 || found.has(id))
                return items;
            for (let customerIndex = 0; customerIndex < customers.length; customerIndex += 1) {
                const customer = customers[customerIndex];
                const floorplanIndex = (customer?.floorplans || []).findIndex((item) => floorId(item) === id);
                if (floorplanIndex < 0)
                    continue;
                found.add(id);
                items.push({ customer, customerIndex, floorplan: customer.floorplans[floorplanIndex], floorplanIndex, recent: row });
                break;
            }
            return items;
        }, []);
    }
    async function hydratePreview(preview, item, version) {
        try {
            const svgText = FD.HomeMenuPreviewService?.read?.(floorId(item.floorplan)) ||
                await options?.loadCachedPreview?.(item.floorplan);
            if (!svgText || version !== renderVersion || !preview.isConnected || typeof URL.createObjectURL !== 'function')
                return;
            const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
            const image = document.createElement('img');
            image.alt = '';
            image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
            image.addEventListener('error', () => { URL.revokeObjectURL(objectUrl); image.remove(); }, { once: true });
            image.src = objectUrl;
            preview.replaceChildren(image);
        }
        catch { }
    }
    function recentCard(item, version) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'home-menu-card';
        const preview = element('span', 'home-menu-preview');
        const copy = element('span', 'home-menu-card-copy');
        copy.append(element('span', 'home-menu-card-title', floorplanTitle(item.floorplan)), element('span', 'home-menu-card-meta', [String(item.customer?.customer || ''), doorCountText(item.floorplan?.doorCount ?? item.floorplan?.doorsTotal)].filter(Boolean).join(' · ')), element('span', 'home-menu-card-time', relativeTime(item.recent?.opened_at || item.recent?.openedAt)));
        card.append(preview, copy);
        card.setAttribute('aria-label', `${String(item.customer?.customer || 'Klant')}, ${floorplanTitle(item.floorplan)}`);
        card.addEventListener('click', async () => {
            card.disabled = true;
            try {
                await options?.openFloorplan?.(item);
            }
            finally {
                card.disabled = false;
            }
        });
        return card;
    }
    function catalogMatches(query) {
        const customers = Array.isArray(options?.getCustomers?.()) ? options?.getCustomers?.() : [];
        const needle = normalize(query);
        return customers.reduce((matches, customer, customerIndex) => {
            const floors = Array.isArray(customer?.floorplans) ? customer.floorplans : [];
            const customerText = [customer?.customer, customer?.shortName, ...(customer?.locations || []).flatMap((location) => [location?.city, location?.street, location?.postalCode])].map(normalize).join(' ');
            const customerMatch = !needle || customerText.includes(needle);
            const floorMatches = floors.map((floorplan, floorplanIndex) => ({ floorplan, floorplanIndex }))
                .filter(({ floorplan }) => normalize([floorplanTitle(floorplan), floorplan?.locationCity, floorplan?.locationStreet, floorplan?.locationPostalCode].join(' ')).includes(needle));
            if (!customerMatch && !floorMatches.length)
                return matches;
            matches.push({ customer, customerIndex, floors: customerMatch && !floorMatches.length ? floors.map((floorplan, floorplanIndex) => ({ floorplan, floorplanIndex })) : floorMatches });
            return matches;
        }, []);
    }
    function renderSearchResults(input, panel, state) {
        const query = input.value.trim();
        const rows = catalogMatches(query);
        if (!state.open || !rows.length) {
            panel.hidden = !state.open;
            panel.replaceChildren();
            if (state.open && query)
                panel.append(element('p', 'home-menu-results-empty', 'Geen klant of plattegrond gevonden.'));
            return;
        }
        const selected = rows.find(row => row.customerIndex === state.customerIndex) || rows[0];
        state.customerIndex = selected.customerIndex;
        const customerPane = element('section', 'home-menu-results-pane');
        customerPane.append(element('div', 'home-menu-results-kicker', '1. Kies een klant'));
        const customerList = element('div', 'home-menu-results-list');
        rows.forEach(row => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `home-menu-customer${row.customerIndex === selected.customerIndex ? ' is-active' : ''}`;
            const place = String(row.customer?.locations?.[0]?.city || row.customer?.floorplans?.[0]?.locationCity || '').trim();
            const copy = element('span', 'home-menu-result-copy');
            copy.append(element('span', 'home-menu-result-name', String(row.customer?.customer || 'Klant')));
            if (place)
                copy.append(element('span', 'home-menu-result-meta', place));
            copy.append(element('span', 'home-menu-customer-count', `${(row.customer?.floorplans || []).length} plattegronden`));
            const selectArrow = icon('arrow');
            selectArrow.classList.add('home-menu-customer-arrow');
            button.setAttribute('aria-label', `Plattegronden van ${String(row.customer?.customer || 'deze klant')} tonen`);
            button.setAttribute('aria-pressed', row.customerIndex === selected.customerIndex ? 'true' : 'false');
            button.append(icon('building'), copy, selectArrow);
            button.addEventListener('click', () => { state.customerIndex = row.customerIndex; renderSearchResults(input, panel, state); });
            customerList.append(button);
        });
        const all = document.createElement('button');
        all.type = 'button';
        all.className = 'home-menu-all';
        all.textContent = `Alle ${(options?.getCustomers?.() || []).length} klanten bekijken`;
        all.addEventListener('click', () => { state.closeResults?.(); options?.openPicker?.(); });
        customerPane.append(customerList, all);
        const floorPane = element('section', 'home-menu-results-pane');
        floorPane.append(element('div', 'home-menu-results-kicker', `2. Open een plattegrond van ${String(selected.customer?.customer || '')}`));
        const floorList = element('div', 'home-menu-results-list');
        state.floor = selected.floors[0] || null;
        if (!selected.floors.length)
            floorList.append(element('p', 'home-menu-results-empty', 'Geen plattegronden gevonden.'));
        selected.floors.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'home-menu-floor';
            const info = { customer: selected.customer, customerIndex: selected.customerIndex, floorplan: item.floorplan, floorplanIndex: item.floorplanIndex };
            const copy = element('span', 'home-menu-result-copy');
            copy.append(element('span', 'home-menu-result-name', floorplanTitle(item.floorplan)));
            copy.append(element('span', 'home-menu-result-meta', [doorCountText(item.floorplan?.doorCount ?? item.floorplan?.doorsTotal), String(item.floorplan?.locationCity || '').trim()].filter(Boolean).join(' · ')));
            button.setAttribute('aria-label', `${floorplanTitle(item.floorplan)} openen`);
            button.append(element('span', 'home-menu-floor-preview'), copy, element('span', 'home-menu-floor-action', 'Openen'), icon('arrow'));
            button.addEventListener('mouseenter', () => { state.floor = info; });
            button.addEventListener('focus', () => { state.floor = info; });
            button.addEventListener('click', () => void options?.openFloorplan?.(info));
            floorList.append(button);
        });
        floorPane.append(floorList);
        panel.replaceChildren(customerPane, floorPane);
        panel.hidden = false;
    }
    function loadRecentRows() {
        if (!recentRequest)
            recentRequest = Promise.resolve(options?.loadRecentFloors?.()).finally(() => { recentRequest = null; });
        return recentRequest;
    }
    async function populateRecent(section, grid, version) {
        section.setAttribute('aria-busy', 'true');
        section.hidden = false;
        grid.replaceChildren(element('div', 'home-menu-recent-skeleton'));
        try {
            const rows = await loadRecentRows();
            if (version !== renderVersion || !section.isConnected)
                return;
            section.dataset.recentLoaded = 'true';
            const items = recentItems(Array.isArray(rows) ? rows : []);
            section.removeAttribute('aria-busy');
            if (!items.length) {
                section.hidden = true;
                return;
            }
            const cards = items.slice(0, Number(options?.recentLimit || 6)).map(item => ({ item, card: recentCard(item, version) }));
            grid.replaceChildren(...cards.map(({ card }) => card));
            section.hidden = false;
            cards.forEach(({ item, card }) => {
                const preview = card.querySelector('.home-menu-preview');
                if (preview)
                    void hydratePreview(preview, item, version);
            });
        }
        catch {
            section.hidden = true;
        }
    }
    function renderHome(target) {
        if (!options || !options.canRender?.())
            return false;
        installStyles();
        if (!target.classList.contains('hidden') && target.querySelector('.home-menu')) {
            target.classList.add('loading--empty', 'loading--home');
            const recent = target.querySelector('.home-menu-recent');
            const grid = target.querySelector('.home-menu-grid');
            if (recent && grid && recent.dataset.recentLoaded !== 'true' && (options.getCustomers?.() || []).length)
                void populateRecent(recent, grid, renderVersion);
            else if (recent && !(options.getCustomers?.() || []).length)
                recent.hidden = true;
            target.classList.remove('hidden');
            return true;
        }
        const version = ++renderVersion;
        target.classList.add('loading--empty', 'loading--home');
        target.classList.remove('hidden');
        target.textContent = '';
        const home = element('section', 'home-menu');
        const content = element('div', 'home-menu-content');
        const hero = element('header', 'home-menu-hero');
        const logo = document.createElement('img');
        logo.className = 'home-menu-logo';
        logo.src = options.logoSrc || `dooratlas-logo-transparent.png?v=${encodeURIComponent(String(options.appVersion || ''))}`;
        logo.alt = 'DoorAtlas';
        hero.append(logo, element('h1', 'home-menu-title', 'Kies een plattegrond'), element('p', 'home-menu-subtitle', 'Typ een klantnaam of adres. We laten meteen de bijbehorende plattegronden zien.'));
        const advanced = document.createElement('button');
        advanced.type = 'button';
        advanced.className = 'home-menu-advanced';
        advanced.textContent = 'Geavanceerde plattegrondzoeker';
        advanced.addEventListener('click', () => options?.openPicker?.());
        const searchWrap = element('div', 'home-menu-search-wrap');
        const search = element('div', 'home-menu-search');
        const input = document.createElement('input');
        input.className = 'home-menu-search-input';
        input.type = 'search';
        input.autocomplete = 'off';
        input.placeholder = 'Zoek een klant of plattegrond';
        input.setAttribute('aria-label', 'Zoek een klant of plattegrond');
        input.setAttribute('aria-controls', 'home-menu-results');
        search.append(icon('search'), input);
        const panel = element('div', 'home-menu-results');
        panel.id = 'home-menu-results';
        panel.hidden = true;
        const state = { open: false, customerIndex: null, floor: null };
        const updateResults = () => {
            input.setAttribute('aria-expanded', state.open ? 'true' : 'false');
            renderSearchResults(input, panel, state);
        };
        const closeResults = () => { state.open = false; state.customerIndex = null; state.floor = null; updateResults(); };
        state.closeResults = closeResults;
        input.addEventListener('input', () => { state.open = Boolean(input.value.trim()); state.customerIndex = null; updateResults(); });
        input.addEventListener('focus', () => { if (input.value.trim()) {
            state.open = true;
            updateResults();
        } });
        input.addEventListener('keydown', event => {
            if (event.key === 'Escape' && state.open) {
                event.preventDefault();
                closeResults();
            }
            if (event.key === 'Enter' && state.open && state.floor) {
                event.preventDefault();
                void options?.openFloorplan?.(state.floor);
            }
        });
        searchWrap.append(search, panel);
        const recent = element('section', 'home-menu-recent');
        recent.hidden = false;
        const grid = element('div', 'home-menu-grid');
        grid.replaceChildren(element('div', 'home-menu-recent-skeleton'));
        recent.append(element('h2', 'home-menu-recent-title', 'Verder waar je gebleven was'), grid);
        content.append(hero, advanced, searchWrap, recent);
        home.append(content);
        home.addEventListener('pointerdown', event => {
            const target = event.target instanceof Element ? event.target : null;
            if (state.open && !target?.closest('.home-menu-search-wrap'))
                closeResults();
        });
        target.append(home);
        if ((options?.getCustomers?.() || []).length)
            void populateRecent(recent, grid, version);
        return true;
    }
    function renderEmptyState(target, _state) {
        return renderHome(target);
    }
    function showStartHome(target) {
        return target instanceof HTMLElement && renderHome(target);
    }
    function refreshCurrentStartState() {
        const target = document.getElementById('loading');
        if (!(target instanceof HTMLElement))
            return false;
        const current = target.querySelector('.home-menu');
        if (current) {
            const recent = current.querySelector('.home-menu-recent');
            const grid = current.querySelector('.home-menu-grid');
            if (recent && grid)
                void populateRecent(recent, grid, renderVersion);
            return true;
        }
        return renderHome(target);
    }
    function configure(nextOptions) { recentRequest = null; options = nextOptions; }
    function recordFloorOpened(value) {
        const id = Number(value || 0);
        if (!options?.canRender?.() || !Number.isInteger(id) || id < 1)
            return Promise.resolve(null);
        FD.HomeMenuPreviewService?.remember?.(id, document.querySelector('#svg-container svg')?.outerHTML);
        return Promise.resolve(options.recordRecentFloor?.(id)).catch(() => null);
    }
    FD.HomeMenuService = { configure, recordFloorOpened, refreshCurrentStartState, renderEmptyState, showStartHome };
})(window);
