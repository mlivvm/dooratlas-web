(function (global) {
    const FD = global.FD = global.FD || {};
    function setVisible(el, visible, display = 'block') {
        if (el)
            el.style.display = visible ? display : 'none';
    }
    function isVisible(el) {
        return Boolean(el && el.style.display !== 'none');
    }
    const BUILDING_SVG = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">',
        '<rect x="8" y="32" width="74" height="50" rx="5" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2.5"/>',
        '<rect x="18" y="44" width="16" height="16" rx="3" fill="#1a73e8" opacity="0.45"/>',
        '<rect x="56" y="44" width="16" height="16" rx="3" fill="#1a73e8" opacity="0.45"/>',
        '<rect x="37" y="50" width="16" height="32" rx="3" fill="#1a73e8" opacity="0.65"/>',
        '<polygon points="45,6 6,32 84,32" fill="#1a73e8" opacity="0.75"/></svg>',
    ].join('');
    function createTopbarMenu({ toggleButtonEl, menuEl, documentEl = document }) {
        function show() {
            setVisible(menuEl, true);
        }
        function hide() {
            setVisible(menuEl, false);
        }
        function toggle() {
            setVisible(menuEl, !isVisible(menuEl));
        }
        const toggleFromButton = (event) => { event.stopPropagation(); toggle(); };
        const keepMenuOpen = (event) => event.stopPropagation();
        function bind() {
            toggleButtonEl.addEventListener('click', toggleFromButton);
            menuEl.addEventListener('click', keepMenuOpen);
            documentEl.addEventListener('click', hide);
        }
        function destroy() {
            toggleButtonEl.removeEventListener('click', toggleFromButton);
            menuEl.removeEventListener('click', keepMenuOpen);
            documentEl.removeEventListener('click', hide);
        }
        return { bind, destroy, hide, show, toggle };
    }
    function createPopupPair({ overlayEl, popupEl, display = 'block' }) {
        function show() {
            setVisible(overlayEl, true, display);
            setVisible(popupEl, true, display);
        }
        function hide() {
            setVisible(overlayEl, false);
            setVisible(popupEl, false);
        }
        return { hide, show };
    }
    function createToastController(toastEl, { duration = 4000 } = {}) {
        let timer = null;
        function hide() {
            if (!toastEl)
                return;
            toastEl.style.display = 'none';
            if (timer)
                clearTimeout(timer);
            timer = null;
        }
        function show(message, type) {
            if (!toastEl)
                return;
            if (timer)
                clearTimeout(timer);
            toastEl.textContent = message;
            toastEl.style.background = type === 'error' ? '#d93025' : '#34a853';
            toastEl.style.color = 'white';
            toastEl.style.display = 'block';
            timer = setTimeout(hide, duration);
        }
        if (toastEl)
            toastEl.addEventListener('click', hide);
        return { hide, show };
    }
    function renderEmptyState(targetEl, { subtitle, hint, title = 'Kies een plattegrond' }) {
        if (!targetEl)
            return;
        if (FD.HomeMenuService?.renderEmptyState?.(targetEl, { subtitle, hint, title }))
            return;
        targetEl.classList.remove('loading--home');
        targetEl.classList.add('loading--empty');
        targetEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-title">Startscherm kon niet worden geladen</div>
      <div class="empty-state-sub">Ververs DoorAtlas en probeer opnieuw.</div>
    </div>`;
    }
    function renderLoadingState(targetEl) {
        if (!targetEl)
            return;
        targetEl.classList.remove('loading--empty', 'loading--home');
        targetEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon loading-scan-container">${BUILDING_SVG}<div class="loading-scan-line"></div></div>
      <div class="empty-state-title" style="color:#555; font-size:18px; font-weight:600;">Plattegrond laden</div>
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </div>`;
    }
    function createBusyOverlayController({ overlayEl }) {
        function render({ title = 'Bezig', subtitle = 'Even wachten...' } = {}) {
            if (!overlayEl)
                return;
            overlayEl.innerHTML = `<div class="busy-overlay-card" style="background:#fff">
        <div class="empty-state-icon loading-scan-container" style="background:transparent;box-shadow:none">${BUILDING_SVG}<div class="loading-scan-line"></div></div>
        <div class="busy-overlay-title">${title}</div>
        <div class="busy-overlay-subtitle">${subtitle}</div>
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>`;
        }
        function show(options) {
            render(options);
            setVisible(overlayEl, true, 'flex');
        }
        function update(options) {
            render(options);
        }
        function hide() {
            setVisible(overlayEl, false);
        }
        return { hide, show, update };
    }
    function updateViewportHeightProperty({ rootEl, visualViewport, fallbackHeight, property = '--app-height' }) {
        if (!rootEl?.style)
            return;
        const height = visualViewport ? visualViewport.height : fallbackHeight;
        rootEl.style.setProperty(property, Math.round(height) + 'px');
    }
    function installOfficeTabletLayout() {
        const officeTablet = global.matchMedia?.('(hover: none) and (pointer: coarse) and (min-width: 601px)').matches;
        if (!officeTablet && !global.document?.getElementById('tablet-app'))
            return;
        const styleId = 'dooratlas-office-tablet-layout-style';
        if (document.getElementById(styleId))
            return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      @media (hover: none) and (pointer: coarse) and (min-width: 601px) {
        #app-container > .loading.loading--home { position: absolute; top: calc(env(safe-area-inset-top) + var(--topbar-h, 52px)); bottom: auto; height: calc(var(--app-height, 100dvh) - var(--topbar-h, 52px)); }
        #app-container > .loading.loading--home .home-menu { align-items: flex-start; padding: clamp(24px, 5vh, 48px) 0 20px; }
        #app-container > .loading.loading--home .home-menu-content { align-self: flex-start; }
        #app-container > .loading.loading--home .home-menu-results-pane { max-height: min(360px, calc(var(--app-height, 100dvh) - var(--topbar-h, 52px) - 300px)); }
        #app-container > .loading.loading--home .home-menu.home-menu--keyboard-search { padding-top: 16px; }
        #app-container > .loading.loading--home .home-menu.home-menu--keyboard-search .home-menu-hero,
        #app-container > .loading.loading--home .home-menu.home-menu--keyboard-search .home-menu-advanced,
        #app-container > .loading.loading--home .home-menu.home-menu--keyboard-search .home-menu-recent { display: none; }
        #app-container > .loading.loading--home .home-menu.home-menu--keyboard-search .home-menu-results-pane { max-height: min(360px, calc(var(--app-height, 100dvh) - var(--topbar-h, 52px) - 118px)); }
        .select-sheet { top: calc(env(safe-area-inset-top) + var(--topbar-h, 52px) + 12px); transform: translateX(-50%); max-height: calc(var(--app-height, 100dvh) - var(--topbar-h, 52px) - 24px); }
      }
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search { align-items: flex-start; padding: 8px 0 0; }
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-content { align-self: flex-start; }
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-hero,
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-advanced,
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-recent { display: none; }
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-results { top: 68px; height: min(360px, calc(var(--app-height, 100dvh) - var(--tablet-safe-top, 0px) - var(--topbar-h, 52px) - 90px)); }
      .tablet-stage.loading--home .home-menu.home-menu--keyboard-search .home-menu-results-pane { box-sizing: border-box; height: 100%; max-height: none; }
    `;
        document.head.appendChild(style);
        const syncHomeSearchLayout = (target) => {
            const home = target instanceof Element ? target.closest('.home-menu') : null;
            if (!home)
                return;
            const active = document.activeElement;
            home.classList.toggle('home-menu--keyboard-search', active instanceof Element && Boolean(active.closest('.home-menu-search-wrap')));
        };
        document.addEventListener('focusin', event => syncHomeSearchLayout(event.target));
        document.addEventListener('focusout', event => window.setTimeout(() => syncHomeSearchLayout(event.target), 0));
    }
    function updateTopbarHeightProperty({ rootEl, topbarEl, property = '--topbar-h' }) {
        if (!rootEl?.style || !topbarEl)
            return;
        rootEl.style.setProperty(property, topbarEl.offsetHeight + 'px');
    }
    function renderConnectionIndicator({ indicatorEl, labelEl, isOnline }) {
        if (indicatorEl) {
            indicatorEl.classList.toggle('offline', !isOnline);
            indicatorEl.title = isOnline ? 'Online' : 'Offline';
        }
        if (labelEl)
            labelEl.textContent = isOnline ? 'Online' : 'Offline';
    }
    function renderStatusSyncIndicator({ indicatorEl, labelEl, count }) {
        const safeCount = Number.isFinite(count) ? count : 0;
        if (indicatorEl) {
            indicatorEl.style.display = safeCount > 0 ? 'inline-flex' : 'none';
            indicatorEl.title = safeCount === 1 ? '1 statuswijziging wacht op sync' : safeCount + ' statuswijzigingen wachten op sync';
        }
        if (labelEl)
            labelEl.textContent = 'Sync ' + safeCount;
    }
    function setSidePanelOpen({ sidePanelEl, toggleButtonEl, appContainerEl, open }) {
        if (sidePanelEl)
            sidePanelEl.classList.toggle('open', open);
        if (toggleButtonEl) {
            toggleButtonEl.classList.toggle('panel-open', open);
            toggleButtonEl.textContent = open ? '›' : '‹';
            toggleButtonEl.title = open ? 'Deurenpaneel inklappen' : 'Deurenpaneel uitklappen';
            toggleButtonEl.setAttribute('aria-label', toggleButtonEl.title);
            toggleButtonEl.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (appContainerEl)
            appContainerEl.classList.toggle('side-panel-open', open);
    }
    function updateLabelsButton(buttonEl, labelsVisible) {
        if (!buttonEl)
            return;
        buttonEl.textContent = labelsVisible ? 'Labels verbergen' : 'Labels tonen';
        buttonEl.classList.toggle('active', labelsVisible);
    }
    function updateMarkerOutlineButton(buttonEl, outlineEnabled) {
        if (!buttonEl)
            return;
        buttonEl.textContent = outlineEnabled ? 'Bolletjes vullen' : 'Bolletjes als rand';
        buttonEl.classList.toggle('active', outlineEnabled);
    }
    function updateUploadActionButtons({ deleteButtonEl, editImageButtonEl, metadataButtonEl, floorplan }) {
        const isUpload = Boolean(floorplan && (floorplan.uploadedByApp || floorplan.uploaded || floorplan.repo === 'uploads'));
        setVisible(deleteButtonEl, isUpload);
        setVisible(editImageButtonEl, isUpload);
        setVisible(metadataButtonEl, Boolean(floorplan));
        return isUpload;
    }
    FD.UIShellService = {
        createBusyOverlayController,
        createPopupPair,
        createToastController,
        createTopbarMenu,
        renderConnectionIndicator,
        renderEmptyState,
        renderLoadingState,
        renderStatusSyncIndicator,
        setVisible,
        setSidePanelOpen,
        updateLabelsButton,
        updateMarkerOutlineButton,
        updateTopbarHeightProperty,
        updateUploadActionButtons,
        updateViewportHeightProperty,
    };
    installOfficeTabletLayout();
})(window);
