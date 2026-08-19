(function (global) {
    const FD = global.FD = global.FD || {};
    function create({ config, elements, hideMenu = () => { }, showToast = () => { }, }) {
        const dialog = FD.UIShellService.createPopupPair({
            overlayEl: elements.overlay,
            popupEl: elements.popup,
            display: 'flex',
        });
        let requestGeneration = 0;
        function setSummary(message) {
            if (elements.summary)
                elements.summary.textContent = message;
        }
        function renderState(message) {
            if (!elements.list)
                return;
            elements.list.textContent = '';
            const state = document.createElement('div');
            state.className = 'admin-dashboard-empty';
            state.textContent = message;
            elements.list.appendChild(state);
        }
        function formatDate(value) {
            const date = new Date(String(value || ''));
            if (!Number.isFinite(date.getTime()))
                return 'Onbekend';
            return new Intl.DateTimeFormat('nl-NL', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        }
        function appendField(container, label, value) {
            const field = document.createElement('div');
            field.className = 'admin-session-field';
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            const valueEl = document.createElement('strong');
            valueEl.textContent = value;
            field.append(labelEl, valueEl);
            container.appendChild(field);
        }
        async function revoke(device, button) {
            const confirmed = global.confirm('Toegang voor deze tablet intrekken? De tablet moet daarna opnieuw online inloggen.');
            if (!confirmed)
                return;
            button.disabled = true;
            button.textContent = 'Intrekken…';
            try {
                await FD.DataService.revokeMobileDevice(config, device.family_id);
                showToast('Tablettoegang is ingetrokken', 'success');
                await load();
            }
            catch (error) {
                button.disabled = false;
                button.textContent = 'Toegang intrekken';
                if (!FD.DataService.isSessionAuthError?.(error)) {
                    showToast(error?.message || 'Tablettoegang kon niet worden ingetrokken.', 'error');
                }
            }
        }
        function renderDevices(devices) {
            if (!elements.list)
                return;
            elements.list.textContent = '';
            setSummary(`${devices.length} actieve ${devices.length === 1 ? 'tablet' : 'tablets'} voor dit account.`);
            if (!devices.length) {
                renderState('Geen actieve tablets gevonden.');
                return;
            }
            devices.forEach(device => {
                const item = document.createElement('article');
                item.className = 'admin-session-item';
                const main = document.createElement('div');
                main.className = 'admin-session-main';
                const title = document.createElement('div');
                title.className = 'admin-session-user';
                const deviceId = String(device.device_id || '');
                title.textContent = deviceId ? `Tablet …${deviceId.slice(-8)}` : 'Tablet';
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'admin-dashboard-danger';
                button.textContent = 'Toegang intrekken';
                button.addEventListener('click', () => revoke(device, button));
                main.append(title, button);
                const grid = document.createElement('div');
                grid.className = 'admin-session-grid';
                appendField(grid, 'App-versie', String(device.app_version || 'Onbekend'));
                appendField(grid, 'Eerste login', formatDate(device.created_at));
                appendField(grid, 'Laatst gezien', formatDate(device.last_seen_at));
                appendField(grid, 'Sessie verloopt', formatDate(device.expires_at));
                item.append(main, grid);
                elements.list.appendChild(item);
            });
        }
        async function load() {
            const generation = ++requestGeneration;
            setSummary('Actieve tablets laden…');
            renderState('Laden…');
            try {
                const response = await FD.DataService.listMobileDevices(config);
                if (generation !== requestGeneration)
                    return;
                renderDevices(Array.isArray(response?.devices) ? response.devices : []);
            }
            catch (error) {
                if (generation !== requestGeneration)
                    return;
                setSummary('Actieve tablets konden niet worden geladen.');
                renderState(error?.message || 'Probeer het opnieuw.');
            }
        }
        function show() {
            hideMenu();
            dialog.show();
            void load();
        }
        function hide() {
            requestGeneration += 1;
            dialog.hide();
        }
        elements.openButton?.addEventListener('click', show);
        elements.closeButton?.addEventListener('click', hide);
        elements.overlay?.addEventListener('click', hide);
        global.addEventListener('keydown', event => {
            if (event.key === 'Escape' && elements.popup?.style.display !== 'none')
                hide();
        });
        return { hide };
    }
    FD.MobileDeviceSessionService = { create };
})(window);
