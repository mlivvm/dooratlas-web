(function (global) {
    const FD = global.FD = global.FD || {};
    const View = FD.DoorInspectorView;
    const TAB_LABELS = { inspection: 'Opname', maintenance: 'Onderhoud' };
    function createElement(tag, className = '', text = '') {
        const node = document.createElement(tag);
        if (className)
            node.className = className;
        if (text)
            node.textContent = text;
        return node;
    }
    function createController(input) {
        const { elements } = input;
        let activeTab = 'inspection';
        let selectedDoorKey = '';
        let inspections = [];
        let loading = false;
        let requestId = 0;
        let requestController = null;
        const viewedInspectionIds = {};
        const cache = new Map();
        function tabRows() {
            return View.formInspections(inspections, activeTab);
        }
        function latestForTab() {
            return View.latestInspection(inspections, activeTab);
        }
        function viewedForTab() {
            const rows = tabRows();
            const viewedId = Number(viewedInspectionIds[activeTab] || 0);
            return rows.find(row => Number(row.id) === viewedId) || rows[0] || null;
        }
        function updateTabs() {
            elements.tabs.forEach(tab => {
                const selected = tab.dataset.inspectorTab === activeTab;
                tab.classList.toggle('active', selected);
                tab.setAttribute('aria-selected', selected ? 'true' : 'false');
                tab.setAttribute('tabindex', selected ? '0' : '-1');
            });
        }
        function updateActions() {
            const latest = latestForTab();
            elements.actions.forEach(action => {
                const formType = (action.dataset.inspectorNew || 'inspection');
                const active = formType === activeTab;
                const allowed = typeof input.canOpenForm === 'function' ? input.canOpenForm(formType) : true;
                action.hidden = !active;
                action.textContent = latest && active
                    ? `${TAB_LABELS[formType]} bewerken`
                    : `+ ${TAB_LABELS[formType]}`;
                action.disabled = !allowed || loading;
                action.title = loading
                    ? 'Inspectiegegevens laden...'
                    : (allowed ? '' : 'Dit formulier is niet beschikbaar voor deze gebruiker.');
            });
        }
        function renderHistory() {
            const rows = tabRows();
            const viewed = viewedForTab();
            elements.history.hidden = rows.length === 0;
            elements.historyCount.textContent = rows.length === 1 ? '1 versie' : `${rows.length} versies`;
            elements.historyList.innerHTML = '';
            rows.forEach((inspection, index) => {
                const button = createElement('button', 'door-inspector-history-item');
                button.type = 'button';
                button.classList.toggle('active', Number(inspection.id) === Number(viewed?.id));
                button.setAttribute('aria-current', Number(inspection.id) === Number(viewed?.id) ? 'true' : 'false');
                const savedAt = View.formatDate(inspection.received_at || inspection.updated_at || inspection.performed_at, true);
                button.appendChild(createElement('strong', '', index === 0 ? 'Actueel' : `Versie ${rows.length - index}`));
                button.appendChild(createElement('span', '', savedAt || 'Datum onbekend'));
                const submitter = String(inspection.submitted_by_name || '').trim();
                if (submitter)
                    button.appendChild(createElement('small', '', submitter));
                button.addEventListener('click', () => {
                    viewedInspectionIds[activeTab] = Number(inspection.id);
                    elements.history.open = false;
                    renderActiveTab();
                });
                elements.historyList.appendChild(button);
            });
        }
        function renderHeader(door, rows = inspections) {
            const code = String(door.doorCode || door.name || door.label || 'Deur');
            const name = String(door.name || '').trim();
            elements.code.textContent = code;
            elements.name.textContent = name && name !== code ? name : '';
            elements.name.hidden = !elements.name.textContent;
            elements.meta.textContent = [door.building, door.floorLabel].filter(Boolean).join(' · ');
            const status = door.isDone
                ? (door.condition === 'attention' ? 'Aandacht' : (door.condition === 'checking' ? 'Controleren' : 'Afgerond'))
                : 'Open';
            elements.status.textContent = status;
            elements.status.dataset.state = door.isDone ? String(door.condition || 'done') : 'open';
            const latest = rows.slice().sort((left, right) => (Date.parse(right.performed_at || '') - Date.parse(left.performed_at || '') ||
                Number(right.id || 0) - Number(left.id || 0)))[0];
            const latestDate = View.formatDate(latest?.performed_at || door.latestInspectionAt);
            elements.latest.textContent = latestDate ? 'Laatste inspectie ' + latestDate : 'Nog geen inspectie';
            updateActions();
        }
        function renderActiveTab() {
            updateTabs();
            updateActions();
            renderHistory();
            const inspection = viewedForTab();
            if (!inspection) {
                View.renderMessage(elements.body, activeTab === 'inspection'
                    ? 'Er is geen opname van deze deur.'
                    : 'Er is nog geen onderhoud gedaan aan deze deur.');
                return;
            }
            const latest = latestForTab();
            View.renderInspection(elements.body, inspection, activeTab, input.photoUrl, Number(inspection.id) !== Number(latest?.id));
        }
        async function showDoor(doorKey, force = false) {
            const door = input.getDoor(doorKey);
            if (!door?.id) {
                showList();
                return;
            }
            if (selectedDoorKey !== doorKey) {
                viewedInspectionIds.inspection = undefined;
                viewedInspectionIds.maintenance = undefined;
            }
            selectedDoorKey = doorKey;
            loading = true;
            elements.listView.hidden = true;
            elements.inspectorView.hidden = false;
            renderHeader(door, []);
            const doorId = Number(door.id);
            if (!force && cache.has(doorId)) {
                loading = false;
                inspections = cache.get(doorId) || [];
                renderHeader(door);
                renderActiveTab();
                return;
            }
            inspections = [];
            View.renderMessage(elements.body, 'Inspectiegegevens laden…', 'door-inspector-loading');
            requestController?.abort();
            requestController = new AbortController();
            const ownRequestId = ++requestId;
            try {
                const rows = await input.loadInspections(doorId, { signal: requestController.signal });
                if (ownRequestId !== requestId || selectedDoorKey !== doorKey)
                    return;
                loading = false;
                inspections = Array.isArray(rows) ? rows : [];
                cache.set(doorId, inspections);
                renderHeader(door);
                renderActiveTab();
            }
            catch (err) {
                if (err?.name === 'AbortError' || ownRequestId !== requestId)
                    return;
                loading = false;
                View.renderMessage(elements.body, 'Inspectiegegevens konden niet worden geladen.');
            }
        }
        function showList() {
            selectedDoorKey = '';
            inspections = [];
            loading = false;
            requestId += 1;
            requestController?.abort();
            requestController = null;
            elements.history.open = false;
            elements.inspectorView.hidden = true;
            elements.listView.hidden = false;
        }
        function setActiveTab(tab) {
            if (tab !== 'inspection' && tab !== 'maintenance')
                return;
            activeTab = tab;
            elements.history.open = false;
            if (loading) {
                updateTabs();
                updateActions();
                return;
            }
            renderActiveTab();
        }
        function refresh() {
            if (!selectedDoorKey)
                return;
            const door = input.getDoor(selectedDoorKey);
            if (door)
                renderHeader(door);
        }
        function clear() {
            cache.clear();
            viewedInspectionIds.inspection = undefined;
            viewedInspectionIds.maintenance = undefined;
            showList();
        }
        function bind() {
            elements.backButton.addEventListener('click', input.deselectDoor);
            elements.tabs.forEach(tab => {
                tab.addEventListener('click', () => setActiveTab(String(tab.dataset.inspectorTab || '')));
            });
            elements.actions.forEach(action => {
                action.addEventListener('click', () => {
                    const formType = (action.dataset.inspectorNew || 'inspection');
                    if (action.disabled)
                        return;
                    input.openForm(formType, View.latestInspection(inspections, formType));
                });
            });
        }
        return {
            bind,
            clear,
            getActiveTab: () => activeTab,
            refresh,
            setActiveTab,
            showDoor,
            showList,
        };
    }
    FD.DoorInspectorService = { createController };
})(window);
