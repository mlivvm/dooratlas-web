function conflictText(value, fallback = 'Onbekend') {
    const text = String(value ?? '').trim();
    return text || fallback;
}
function conflictCountText(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
}
function conflictDate(value) {
    const date = new Date(String(value ?? ''));
    if (Number.isNaN(date.getTime()))
        return 'tijd onbekend';
    return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function conflictNode(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    if (text)
        node.textContent = text;
    return node;
}
function conflictField(label, value) {
    const field = conflictNode('div', 'admin-conflict-field');
    field.append(conflictNode('span', '', label), conflictNode('strong', '', value));
    return field;
}
function conflictFormLabel(formType) {
    return formType === 'onderhoud' ? 'Onderhoud' : formType === 'opname' ? 'Opname' : 'Kaartbewerking';
}
function conflictFieldLabels(conflict) {
    return [...new Set((conflict.marker_details || []).flatMap(detail => (detail.field_conflicts || []).map(field => conflictText(field.label, 'waarde'))))];
}
function renderAdminConflictSummary(conflict) {
    const summary = conflict.summary || {};
    const grid = conflictNode('div', 'admin-conflict-summary-grid');
    if (conflict.kind === 'inspection') {
        grid.append(conflictField('Tabletwerk', `${summary.local_field_count || 0} veld(en) gewijzigd`), conflictField('Foto’s in tabletwerk', String(summary.local_photo_count || 0)), conflictField('Tablet-projectcode', conflictText(summary.local_project_code, 'Niet ingevuld')), conflictField('Centrale versie', summary.current_inspection_id ? `Inspectie #${summary.current_inspection_id}` : 'Nog geen versie'), conflictField('Centrale datum', summary.current_inspection_received_at ? conflictDate(summary.current_inspection_received_at) : 'Nog geen versie'), conflictField('Centrale projectcode', conflictText(summary.current_project_code, 'Niet ingevuld')));
    }
    else {
        const markerCount = Number(summary.local_marker_count || 0);
        grid.append(conflictField('Werk van tablet', conflictCountText(markerCount, 'kaartwijziging', 'kaartwijzigingen')), conflictField('Wijzigingen', conflictText(summary.local_description, 'Kaartwijziging')), conflictField('Centrale kaartversie', summary.current_floor_revision ? conflictDate(summary.current_floor_revision) : 'Onbekend'));
    }
    return grid;
}
function renderAdminConflictCard(conflict) {
    const card = conflictNode('article', 'admin-conflict-card');
    const heading = conflictNode('div', 'admin-conflict-card-heading');
    const title = conflict.kind === 'inspection'
        ? `${conflictFormLabel(conflict.form_type)} · deur ${conflictText(conflict.door_code)}`
        : `Kaartbewerking · ${conflictText(conflict.floor)}`;
    const titleBlock = conflictNode('div');
    titleBlock.append(conflictNode('span', 'admin-conflict-eyebrow', 'Actie nodig op kantoor'), conflictNode('h3', '', title), conflictNode('p', 'admin-conflict-context', `${conflictText(conflict.customer)} · ${conflictText(conflict.location)} · ${conflictText(conflict.floor)}`));
    heading.append(titleBlock, conflictNode('time', 'admin-conflict-time', conflictDate(conflict.created_at)));
    card.append(heading);
    const isFieldConflict = conflict.conflict_code === 'marker_field_conflict';
    if (!isFieldConflict) {
        const details = conflictNode('div', 'admin-conflict-details');
        details.append(conflictField('Monteur', conflictText(conflict.technician)), conflictField('Tablet', conflictText(conflict.device_label)), conflictField('Waarom hier?', conflictText(conflict.conflict_detail)));
        card.append(details, renderAdminConflictSummary(conflict));
    }
    if (conflict.kind === 'marker_batch') {
        const markerDetails = renderAdminConflictMarkerDetails(conflict.marker_details || [], conflictText(conflict.technician), conflictText(conflict.device_label));
        if (markerDetails)
            card.append(markerDetails);
    }
    const explanation = conflictNode('p', 'admin-conflict-explanation', isFieldConflict
        ? 'Alleen de genoemde waarde vraagt een keuze. Andere wijzigingen aan deze deur zijn al automatisch verwerkt.'
        : conflict.kind === 'marker_batch'
            ? 'Dit scherm laat zien welke deur botst en welke wijzigingen veilig kunnen worden toegevoegd. Op de tablet hoeft niets gekozen te worden: het werk is bewaard en kantoor bepaalt hier de uitkomst.'
            : 'De monteur hoeft op de tablet niets te kiezen: het werk is bewaard en kantoor bepaalt hier welke versie leidend is.');
    card.append(explanation, renderAdminConflictActions(conflict));
    return card;
}
function updateAdminConflictChrome() {
    const count = adminDashboardState.conflicts.length;
    if (adminConflictCount) {
        adminConflictCount.textContent = String(count);
        adminConflictCount.hidden = count === 0;
    }
    if (adminConflictNotice)
        adminConflictNotice.hidden = count === 0;
    if (adminConflictNoticeText) {
        adminConflictNoticeText.textContent = count === 1
            ? 'Er staat één opgeslagen tabletwijziging klaar. Controleer de context en kies een oplossing.'
            : `Er staan ${count} opgeslagen tabletwijzigingen klaar. Controleer de context en kies per wijziging een oplossing.`;
    }
}
function renderAdminConflicts() {
    if (!adminConflictInbox)
        return;
    adminConflictInbox.replaceChildren();
    if (adminDashboardState.conflictsLoading && !adminDashboardState.conflicts.length) {
        adminConflictInbox.append(conflictNode('div', 'admin-dashboard-empty', 'Conflicten controleren…'));
        return;
    }
    if (adminDashboardState.conflictsError && !adminDashboardState.conflicts.length) {
        const error = conflictNode('div', 'admin-conflict-error');
        error.append(conflictNode('strong', '', 'Conflicten konden niet worden geladen.'), conflictNode('p', '', 'Vernieuw deze lijst zodra de verbinding met DoorAtlas terug is.'));
        const retry = conflictNode('button', 'admin-dashboard-secondary', 'Opnieuw proberen');
        retry.type = 'button';
        retry.dataset.conflictReload = 'true';
        error.append(retry);
        adminConflictInbox.append(error);
        return;
    }
    if (!adminDashboardState.conflicts.length) {
        adminConflictInbox.append(conflictNode('div', 'admin-conflict-empty', 'Geen open conflicten. Nieuwe tabletwijzigingen verschijnen hier automatisch.'));
        return;
    }
    const intro = conflictNode('div', 'admin-conflict-inbox-intro');
    intro.append(conflictNode('h3', '', 'Openstaande tabletwijzigingen'), conflictNode('p', '', 'Bekijk steeds de lokale wijziging en de centrale versie voordat je een keuze bevestigt.'));
    adminConflictInbox.append(intro, ...adminDashboardState.conflicts.map(renderAdminConflictCard));
}
function openAdminConflictsTab() {
    if (!isAdminUser())
        return;
    adminDashboardState.activeTab = 'conflicts';
    adminDashboardState.conflictConfirm = null;
    renderAdminDashboard();
    void loadAdminConflicts({ force: true });
}
function startAdminConflictPolling() {
    if (adminDashboardState.conflictPollTimer !== null)
        return;
    adminDashboardState.conflictPollTimer = window.setInterval(() => {
        if (adminDashboardState.visible && !adminDashboardState.conflictsLoading)
            void loadAdminConflicts({ force: true });
    }, 60000);
}
function stopAdminConflictPolling() {
    if (adminDashboardState.conflictPollTimer === null)
        return;
    window.clearInterval(adminDashboardState.conflictPollTimer);
    adminDashboardState.conflictPollTimer = null;
}
async function loadAdminConflicts({ force = false } = {}) {
    if (!isAdminUser())
        return;
    startAdminConflictPolling();
    if (adminDashboardState.conflictsLoading)
        return;
    if (!force && adminDashboardState.conflictsLoadedAt && Date.now() - adminDashboardState.conflictsLoadedAt < 30000) {
        updateAdminConflictChrome();
        return;
    }
    adminDashboardState.conflictsLoading = true;
    adminDashboardState.conflictsError = '';
    if (adminDashboardState.activeTab === 'conflicts')
        renderAdminConflicts();
    const generation = FD.DataService.sessionGeneration?.();
    try {
        const data = await FD.DataService.fetchAdminConflicts(CONFIG, {
            diagnostics: { purpose: 'admin_conflicts', background: true },
        });
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        const records = Array.isArray(data?.conflicts) ? data.conflicts : [];
        adminDashboardState.conflicts = records;
        adminDashboardState.conflictsLoadedAt = Date.now();
        updateAdminConflictChrome();
    }
    catch (error) {
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        adminDashboardState.conflictsError = error instanceof Error ? error.message : 'conflicts_failed';
    }
    finally {
        adminDashboardState.conflictsLoading = false;
        if (adminDashboardState.activeTab === 'conflicts')
            renderAdminConflicts();
    }
}
async function resolveSelectedAdminConflict(id, action) {
    adminDashboardState.conflictResolvingId = id;
    renderAdminConflicts();
    try {
        const response = await FD.DataService.resolveAdminConflict(CONFIG, id, action, {
            diagnostics: { purpose: 'admin_conflict_resolve', background: false },
        });
        showToast(conflictText(response?.message, 'Conflict afgehandeld.'), 'success');
        adminDashboardState.conflictConfirm = null;
        await loadAdminConflicts({ force: true });
    }
    catch (error) {
        showToast(error instanceof Error ? error.message : 'Conflict kon niet worden afgehandeld.', 'error');
    }
    finally {
        adminDashboardState.conflictResolvingId = 0;
        renderAdminConflicts();
    }
}
adminConflictOpen?.addEventListener('click', openAdminConflictsTab);
adminConflictInbox?.addEventListener('click', event => {
    const target = event.target;
    const button = target.closest('button[data-conflict-action], button[data-conflict-confirm], button[data-conflict-cancel], button[data-conflict-reload]');
    if (!button)
        return;
    if (button.dataset.conflictReload) {
        void loadAdminConflicts({ force: true });
        return;
    }
    const id = Number(button.dataset.conflictId || 0);
    if (!Number.isInteger(id) || id < 1)
        return;
    if (button.dataset.conflictCancel) {
        adminDashboardState.conflictConfirm = null;
        renderAdminConflicts();
        return;
    }
    const action = button.dataset.conflictAction;
    if (!action)
        return;
    if (button.dataset.conflictConfirm) {
        void resolveSelectedAdminConflict(id, action);
        return;
    }
    adminDashboardState.conflictConfirm = { id, action };
    renderAdminConflicts();
});
