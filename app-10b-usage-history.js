let adminUsageState = {
    loading: false,
    error: '',
    data: null,
    accountFilter: 'all',
    selectedAccount: null,
    detail: null,
    detailLoading: false,
    detailError: '',
    detailKind: 'all',
    detailPeriodDays: 30,
    detailRequest: 0,
    overviewController: null,
    detailController: null,
};
adminOnlinePanel?.setAttribute('aria-label', 'Aanwezigheid en gebruik bekijken');
function adminUsageDateTime(value) {
    if (!value)
        return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '-';
    return date.toLocaleString('nl-NL', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}
function adminUsageSectionTitle(text) {
    const title = document.createElement('div');
    title.className = 'admin-dashboard-label';
    title.textContent = text;
    return title;
}
function adminUsageFilterButton(label, active, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-dashboard-secondary admin-usage-filter';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', onClick);
    return button;
}
function appendAdminUsageSummary(container, data) {
    const users = Array.isArray(data.users) ? data.users : [];
    const summary = document.createElement('article');
    summary.className = 'admin-session-item';
    const grid = document.createElement('div');
    grid.className = 'admin-session-grid';
    const fields = [
        ['Online nu', `${Number(data.onlineNow || 0)} accounts`], ['Geregistreerd', `${users.length} accounts`],
        ['Actief (30 dagen)', `${users.filter(user => Number(user.activeDays30d || 0) > 0).length} accounts`], ['Bewaring', 'Permanent logboek'],
    ];
    fields.forEach(([label, value]) => appendAdminSessionField(grid, label, value));
    summary.appendChild(grid);
    container.appendChild(summary);
}
function appendAdminUsageAccount(container, usage, { compact = false } = {}) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `admin-session-item admin-usage-account${compact ? ' admin-usage-account-compact' : ''}`;
    item.setAttribute('aria-label', `Bekijk activiteit van ${usage.user || 'gebruiker'}`);
    const main = document.createElement('div');
    main.className = 'admin-session-main';
    const user = document.createElement('div');
    user.className = 'admin-session-user';
    user.textContent = usage.user || 'Gebruiker';
    const badges = document.createElement('div');
    badges.className = 'admin-session-badges';
    const role = document.createElement('span');
    role.className = 'admin-session-badge';
    role.textContent = adminSessionRoleLabel(usage.role);
    badges.appendChild(role);
    if (usage.online) {
        const online = document.createElement('span');
        online.className = 'admin-session-badge current';
        online.textContent = 'online';
        badges.appendChild(online);
    }
    main.append(user, badges);
    item.appendChild(main);
    if (!compact) {
        const grid = document.createElement('div');
        grid.className = 'admin-session-grid';
        [['Laatste activiteit', adminUsageDateTime(usage.lastSeenAt || usage.lastActionAt)],
            ['Gebruik (30 dagen)', `${Number(usage.activeDays30d || 0)} dagen · ${adminFormatDuration(usage.activeSeconds30d)}`],
            ['Gebruik', `${Number(usage.floorplanOpens30d || 0)} kaarten · ${Number(usage.inspectionSubmissions30d || 0)} formulieren`],
        ].forEach(([label, value]) => appendAdminSessionField(grid, label, value));
        item.appendChild(grid);
    }
    item.addEventListener('click', () => selectAdminUsageAccount(usage));
    container.appendChild(item);
}
function adminUsageFilteredAccounts() {
    const users = Array.isArray(adminUsageState.data?.users) ? adminUsageState.data.users : [];
    if (adminUsageState.accountFilter === 'online')
        return users.filter(user => user.online);
    if (adminUsageState.accountFilter === 'active')
        return users.filter(user => Number(user.activeDays30d || 0) > 0);
    if (adminUsageState.accountFilter === 'never')
        return users.filter(user => !user.firstLoginAt);
    return users;
}
function appendAdminUsageAccountFilters(container) {
    const filters = document.createElement('div');
    filters.className = 'admin-usage-filters';
    [
        ['all', 'Alle'],
        ['online', 'Online'],
        ['active', 'Actief (30d)'],
        ['never', 'Nog niet ingelogd'],
    ].forEach(([key, label]) => {
        filters.appendChild(adminUsageFilterButton(label, adminUsageState.accountFilter === key, () => {
            adminUsageState.accountFilter = key;
            renderAdminUsageHistory();
        }));
    });
    container.appendChild(filters);
}
function appendAdminUsageOverview(container, data) {
    appendAdminUsageSummary(container, data);
    const online = (Array.isArray(data.users) ? data.users : []).filter(user => user.online);
    container.appendChild(adminUsageSectionTitle('Online nu'));
    if (!online.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Er zijn nu geen accounts online.';
        container.appendChild(empty);
    }
    else {
        online.slice(0, 6).forEach(usage => appendAdminUsageAccount(container, usage, { compact: true }));
        if (online.length > 6) {
            const note = document.createElement('div');
            note.className = 'admin-dashboard-empty';
            note.textContent = `Nog ${online.length - 6} online accounts staan in de volledige accountlijst.`;
            container.appendChild(note);
        }
    }
    container.appendChild(adminUsageSectionTitle('Geregistreerde accounts'));
    appendAdminUsageAccountFilters(container);
    const users = adminUsageFilteredAccounts();
    if (!users.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = adminUsageState.accountFilter === 'never'
            ? 'Elk geregistreerd account heeft al eens ingelogd.'
            : 'Geen accounts voor dit filter.';
        container.appendChild(empty);
        return;
    }
    users.forEach(usage => appendAdminUsageAccount(container, usage));
}
function adminUsageEntryKindLabel(kind) {
    if (kind === 'session')
        return 'sessie';
    if (kind === 'floorplan')
        return 'kaart';
    return 'formulier';
}
function adminUsageSessionEndLabel(entry) {
    if (entry.endReason === 'online')
        return 'Nu online';
    if (entry.endReason === 'logout')
        return `Uitgelogd · ${adminUsageDateTime(entry.endedAt)}`;
    return `Inactief sinds ${adminUsageDateTime(entry.lastSeenAt)}`;
}
function appendAdminUsageEntry(container, entry) {
    const item = document.createElement('article');
    item.className = 'admin-session-item admin-usage-entry';
    const main = document.createElement('div');
    main.className = 'admin-session-main';
    const label = document.createElement('div');
    label.className = 'admin-session-user';
    label.textContent = entry.label || 'Geregistreerde activiteit';
    const badge = document.createElement('div');
    badge.className = 'admin-session-badges';
    const kind = document.createElement('span');
    kind.className = `admin-session-badge${entry.endReason === 'online' ? ' current' : ''}`;
    kind.textContent = adminUsageEntryKindLabel(entry.kind);
    badge.appendChild(kind);
    main.append(label, badge);
    const grid = document.createElement('div');
    grid.className = 'admin-session-grid';
    appendAdminSessionField(grid, 'Tijdstip', adminUsageDateTime(entry.occurredAt));
    if (entry.kind === 'session') {
        appendAdminSessionField(grid, 'Actief gebruikt', adminFormatDuration(entry.activeSeconds));
        appendAdminSessionField(grid, 'Laatste activiteit', adminUsageDateTime(entry.lastSeenAt));
        appendAdminSessionField(grid, 'Sessie-einde', adminUsageSessionEndLabel(entry));
    }
    else {
        appendAdminSessionField(grid, entry.kind === 'floorplan' ? 'Plattegrond' : 'Context', entry.detail || 'Geen aanvullende context');
    }
    item.append(main, grid);
    container.appendChild(item);
}
function appendAdminUsageDetailFilters(container) {
    const period = document.createElement('div');
    period.className = 'admin-usage-filter-group';
    period.appendChild(adminUsageSectionTitle('Periode'));
    const periodButtons = document.createElement('div');
    periodButtons.className = 'admin-usage-filters';
    [[7, '7 dagen'], [30, '30 dagen'], [0, 'Alles']].forEach(([days, label]) => {
        const value = Number(days);
        periodButtons.appendChild(adminUsageFilterButton(label, adminUsageState.detailPeriodDays === value, () => {
            selectAdminUsageAccount(adminUsageState.selectedAccount, value);
        }));
    });
    period.appendChild(periodButtons);
    const type = document.createElement('div');
    type.className = 'admin-usage-filter-group';
    type.appendChild(adminUsageSectionTitle('Toon'));
    const typeButtons = document.createElement('div');
    typeButtons.className = 'admin-usage-filters';
    [['all', 'Alles'], ['session', 'Sessies'], ['floorplan', 'Kaarten'], ['form', 'Formulieren']].forEach(([kind, label]) => {
        typeButtons.appendChild(adminUsageFilterButton(label, adminUsageState.detailKind === kind, () => {
            adminUsageState.detailKind = kind;
            renderAdminUsageHistory();
        }));
    });
    type.appendChild(typeButtons);
    container.append(period, type);
}
function appendAdminUsageDetail(container) {
    const account = adminUsageState.selectedAccount;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'admin-dashboard-secondary admin-usage-back';
    back.textContent = '← Alle accounts';
    back.addEventListener('click', () => {
        adminUsageState.selectedAccount = null;
        adminUsageState.detail = null;
        adminUsageState.detailError = '';
        adminUsageState.detailController?.abort();
        adminUsageState.detailController = null;
        adminUsageState.detailRequest += 1;
        renderAdminUsageHistory();
    });
    container.appendChild(back);
    const heading = document.createElement('article');
    heading.className = 'admin-session-item';
    const main = document.createElement('div');
    main.className = 'admin-session-main';
    const name = document.createElement('div');
    name.className = 'admin-session-user';
    name.textContent = account.user || 'Gebruiker';
    const badges = document.createElement('div');
    badges.className = 'admin-session-badges';
    const role = document.createElement('span');
    role.className = 'admin-session-badge';
    role.textContent = adminSessionRoleLabel(account.role);
    badges.appendChild(role);
    if (account.online) {
        const online = document.createElement('span');
        online.className = 'admin-session-badge current';
        online.textContent = 'online';
        badges.appendChild(online);
    }
    main.append(name, badges);
    heading.appendChild(main);
    container.append(heading, adminUsageSectionTitle('Activiteit'));
    appendAdminUsageDetailFilters(container);
    if (adminUsageState.detailLoading) {
        const loading = document.createElement('div');
        loading.className = 'admin-dashboard-empty';
        loading.textContent = 'Activiteit laden...';
        container.appendChild(loading);
        return;
    }
    if (adminUsageState.detailError) {
        const error = document.createElement('div');
        error.className = 'admin-dashboard-empty';
        error.textContent = 'Activiteit kon niet worden geladen.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'admin-dashboard-secondary admin-usage-retry';
        retry.textContent = 'Opnieuw proberen';
        retry.addEventListener('click', () => selectAdminUsageAccount(account));
        error.appendChild(retry);
        container.appendChild(error);
        return;
    }
    const entries = Array.isArray(adminUsageState.detail?.entries) ? adminUsageState.detail.entries : [];
    const visible = adminUsageState.detailKind === 'all'
        ? entries
        : entries.filter(entry => entry.kind === adminUsageState.detailKind);
    if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Geen geregistreerde activiteit voor dit filter.';
        container.appendChild(empty);
    }
    else {
        visible.forEach(entry => appendAdminUsageEntry(container, entry));
    }
    if (adminUsageState.detail?.truncated) {
        const note = document.createElement('div');
        note.className = 'admin-dashboard-empty';
        note.textContent = 'Toont de nieuwste 100 regels. Kies een kortere periode voor een gerichte review.';
        container.appendChild(note);
    }
}
function renderAdminUsageHistory() {
    if (!adminSessionsList)
        return;
    adminSessionsList.setAttribute('aria-live', 'polite');
    const title = document.getElementById('admin-sessions-title');
    if (title)
        title.textContent = adminUsageState.selectedAccount ? 'Accountactiviteit' : 'Aanwezigheid & gebruik';
    if (adminSessionsSummary) {
        adminSessionsSummary.textContent = adminUsageState.selectedAccount
            ? 'Sessies, kaartopeningen en echte formulierinzendingen van dit account. Browser sluiten wordt als inactief getoond.'
            : 'Klik een account voor sessies, kaartopeningen en echte formulierinzendingen. Browser sluiten wordt als inactief getoond.';
    }
    const content = document.createDocumentFragment();
    if (adminUsageState.selectedAccount) {
        appendAdminUsageDetail(content);
    }
    else if (adminUsageState.loading) {
        const loading = document.createElement('div');
        loading.className = 'admin-dashboard-empty';
        loading.textContent = 'Accountoverzicht laden...';
        content.appendChild(loading);
    }
    else if (adminUsageState.error) {
        const error = document.createElement('div');
        error.className = 'admin-dashboard-empty';
        error.textContent = 'Accountoverzicht kon niet worden geladen. Probeer opnieuw.';
        content.appendChild(error);
    }
    else if (adminUsageState.data) {
        appendAdminUsageOverview(content, adminUsageState.data);
    }
    adminSessionsList.replaceChildren(content);
}
async function selectAdminUsageAccount(account, periodDays = adminUsageState.detailPeriodDays) {
    if (!account?.userId)
        return;
    adminUsageState.detailController?.abort();
    adminUsageState.selectedAccount = account;
    adminUsageState.detailPeriodDays = Number(periodDays);
    adminUsageState.detail = null;
    adminUsageState.detailError = '';
    adminUsageState.detailLoading = true;
    const request = ++adminUsageState.detailRequest;
    const controller = new AbortController();
    adminUsageState.detailController = controller;
    renderAdminUsageHistory();
    const generation = FD.DataService.sessionGeneration?.();
    try {
        const result = await FD.DataService.fetchAdminUsageAccount(CONFIG, account.userId, {
            periodDays: adminUsageState.detailPeriodDays,
            signal: controller.signal,
            diagnostics: { purpose: 'admin_usage_account_activity' },
        });
        if (controller.signal.aborted || generation !== FD.DataService.sessionGeneration?.() || request !== adminUsageState.detailRequest)
            return;
        adminUsageState.detail = result;
    }
    catch (err) {
        if (controller.signal.aborted || generation !== FD.DataService.sessionGeneration?.() || request !== adminUsageState.detailRequest)
            return;
        console.warn('Accountactiviteit laden mislukt:', err);
        adminUsageState.detailError = 'account_activity_failed';
    }
    finally {
        if (adminUsageState.detailController !== controller || request !== adminUsageState.detailRequest)
            return;
        adminUsageState.detailController = null;
        adminUsageState.detailLoading = false;
        renderAdminUsageHistory();
    }
}
async function loadAdminUsageHistory({ reset = false } = {}) {
    if (!isAdminUser() || adminUsageState.loading)
        return;
    adminUsageState.loading = true;
    if (reset) {
        adminUsageState.error = '';
        adminUsageState.data = null;
        adminUsageState.selectedAccount = null;
        adminUsageState.detail = null;
        adminUsageState.detailError = '';
        adminUsageState.detailLoading = false;
        adminUsageState.overviewController?.abort();
        adminUsageState.detailController?.abort();
        adminUsageState.overviewController = null;
        adminUsageState.detailController = null;
        adminUsageState.detailKind = 'all';
        adminUsageState.detailPeriodDays = 30;
        adminUsageState.detailRequest += 1;
    }
    renderAdminUsageHistory();
    const generation = FD.DataService.sessionGeneration?.();
    const controller = new AbortController();
    adminUsageState.overviewController = controller;
    try {
        const result = await FD.DataService.fetchAdminUsageAccounts(CONFIG, {
            signal: controller.signal,
            diagnostics: { purpose: 'admin_usage_history' },
        });
        if (controller.signal.aborted || generation !== FD.DataService.sessionGeneration?.())
            return;
        adminUsageState.data = result;
        adminUsageState.error = '';
    }
    catch (err) {
        if (controller.signal.aborted || generation !== FD.DataService.sessionGeneration?.())
            return;
        console.warn('Accountoverzicht laden mislukt:', err);
        adminUsageState.error = 'usage_history_failed';
    }
    finally {
        if (adminUsageState.overviewController !== controller)
            return;
        adminUsageState.overviewController = null;
        adminUsageState.loading = false;
        renderAdminUsageHistory();
    }
}
function cancelAdminUsageHistory() {
    adminUsageState.overviewController?.abort();
    adminUsageState.detailController?.abort();
    adminUsageState.overviewController = null;
    adminUsageState.detailController = null;
    adminUsageState.loading = false;
    adminUsageState.detailLoading = false;
    adminUsageState.detailRequest += 1;
}
