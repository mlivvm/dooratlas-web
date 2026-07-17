function adminFormatDuration(seconds) {
    const total = Math.max(0, Number(seconds || 0));
    if (total < 60)
        return '< 1 min';
    const minutes = Math.floor(total / 60);
    if (minutes < 60)
        return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours < 24)
        return rest ? `${hours}u ${rest}m` : `${hours}u`;
    const days = Math.floor(hours / 24);
    const restHours = hours % 24;
    return restHours ? `${days}d ${restHours}u` : `${days}d`;
}
function adminSessionLocationLabel(session) {
    return session.locationLabel || (session.cfColo ? `Cloudflare ${session.cfColo}` : 'Onbekend');
}
function adminSessionIpLabel(session) {
    if (session.ipAddress)
        return session.ipAddress;
    if (session.ipHash)
        return `hash ${session.ipHash}`;
    return 'Onbekend';
}
function appendAdminSessionField(container, label, value) {
    const field = document.createElement('div');
    field.className = 'admin-session-field';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value || '-';
    field.append(labelEl, valueEl);
    container.appendChild(field);
}
function renderAdminSessionsPopup() {
    if (!adminSessionsList)
        return;
    const activeUsers = adminDashboardState.activeUsers || {};
    const sessions = Array.isArray(activeUsers.sessions) ? activeUsers.sessions : [];
    const windowMinutes = Number(activeUsers.windowMinutes || 10);
    if (adminSessionsSummary) {
        const total = sessions.length;
        adminSessionsSummary.textContent = `${total} actieve ${total === 1 ? 'sessie' : 'sessies'} in de laatste ${windowMinutes} minuten.`;
    }
    adminSessionsList.innerHTML = '';
    if (!sessions.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Geen actieve sessies gevonden.';
        adminSessionsList.appendChild(empty);
        return;
    }
    sessions.forEach(session => {
        const item = document.createElement('article');
        item.className = 'admin-session-item';
        const main = document.createElement('div');
        main.className = 'admin-session-main';
        const user = document.createElement('div');
        user.className = 'admin-session-user';
        user.textContent = session.displayName || session.username || 'Gebruiker';
        const badges = document.createElement('div');
        badges.className = 'admin-session-badges';
        const roleBadge = document.createElement('span');
        roleBadge.className = 'admin-session-badge';
        roleBadge.textContent = adminSessionRoleLabel(session.role);
        badges.appendChild(roleBadge);
        if (session.current) {
            const currentBadge = document.createElement('span');
            currentBadge.className = 'admin-session-badge current';
            currentBadge.textContent = 'dit scherm';
            badges.appendChild(currentBadge);
        }
        main.append(user, badges);
        const grid = document.createElement('div');
        grid.className = 'admin-session-grid';
        appendAdminSessionField(grid, 'IP', adminSessionIpLabel(session));
        appendAdminSessionField(grid, 'Locatie', adminSessionLocationLabel(session));
        appendAdminSessionField(grid, 'Verbonden', adminFormatDuration(session.connectedSeconds));
        appendAdminSessionField(grid, 'Laatste hartslag', `${adminFormatDuration(session.idleSeconds)} geleden`);
        appendAdminSessionField(grid, 'Apparaat', session.deviceLabel || 'Browser');
        appendAdminSessionField(grid, 'Sessie', session.id || '-');
        item.append(main, grid);
        adminSessionsList.appendChild(item);
    });
}
function showAdminSessionsPopup() {
    if (!isAdminUser())
        return;
    renderAdminSessionsPopup();
    adminSessionsDialog.show();
    loadActiveUsers({ refreshNow: true });
}
function hideAdminSessionsPopup() {
    adminSessionsDialog.hide();
}
async function loadActiveUsers(..._args) {
    if (!isAdminUser() || adminActiveUsersInFlight)
        return;
    adminActiveUsersInFlight = true;
    const generation = FD.DataService.sessionGeneration?.();
    try {
        const result = await FD.DataService.fetchActiveUsers(CONFIG, {
            diagnostics: {
                purpose: 'admin_active_users',
                background: true,
            },
        });
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        adminDashboardState.activeUsers = result;
        renderActiveUsers(result.counts);
        if (adminSessionsPopup?.style.display !== 'none')
            renderAdminSessionsPopup();
    }
    catch (err) {
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        console.warn('Online gebruikers laden mislukt:', err);
        adminDashboardState.activeUsers = null;
        renderActiveUsers(null);
        if (adminSessionsPopup?.style.display !== 'none')
            renderAdminSessionsPopup();
    }
    finally {
        adminActiveUsersInFlight = false;
    }
}
function shouldPollAdminActiveUsers() {
    return Boolean(adminDashboardState.visible && isAdminUser() && isPageVisibleAndOnline());
}
function adminActiveUsersPollTick() {
    if (!shouldPollAdminActiveUsers()) {
        stopAdminActiveUsersPolling();
        return;
    }
    return loadActiveUsers();
}
function startAdminActiveUsersPolling({ refreshNow = false } = {}) {
    if (!shouldPollAdminActiveUsers())
        return;
    if (refreshNow)
        loadActiveUsers();
    if (adminActiveUsersPollTimer)
        return;
    adminActiveUsersPollTimer = window.setInterval(adminActiveUsersPollTick, CONFIG.adminActiveUsersPollInterval);
}
function stopAdminActiveUsersPolling() {
    if (!adminActiveUsersPollTimer)
        return;
    window.clearInterval(adminActiveUsersPollTimer);
    adminActiveUsersPollTimer = null;
}
function getActiveAdminOverviewMetric() {
    return ADMIN_OVERVIEW_METRICS[adminDashboardState.overviewMetric]
        ? adminDashboardState.overviewMetric
        : 'attention';
}
function adminPlural(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
}
function adminFloorplanDisplayName(record) {
    return record?.displayName || record?.name || 'Plattegrond';
}
function createAdminFloorplanMetricItem(record, badge) {
    return {
        type: 'floorplan',
        record,
        label: adminFloorplanDisplayName(record),
        meta: record.customer || 'Onbekende klant',
        badge,
    };
}
function sortAdminFloorplansByMetric(records, metric) {
    return records.slice().sort((left, right) => {
        const byCount = Number(right[metric] || 0) - Number(left[metric] || 0);
        if (byCount)
            return byCount;
        const byCustomer = ADMIN_COLLATOR.compare(left.customer || '', right.customer || '');
        if (byCustomer)
            return byCustomer;
        return ADMIN_COLLATOR.compare(adminFloorplanDisplayName(left), adminFloorplanDisplayName(right));
    });
}
function getAdminCustomerMetricItems() {
    const data = getAdminData();
    const byCustomer = new Map();
    const ensureCustomer = record => {
        const key = adminTenantKey(record);
        if (!byCustomer.has(key)) {
            byCustomer.set(key, {
                type: 'customer',
                customer: record?.customer || 'Onbekende klant',
                customerKey: key,
                label: adminCustomerLabel(record),
                floorplans: 0,
                doors: 0,
                open: 0,
                done: 0,
                attention: 0,
            });
        }
        return byCustomer.get(key);
    };
    (data.customers || customers || []).forEach(customer => {
        if (customer?.customer)
            ensureCustomer(customer);
    });
    (data.floorplans || []).forEach(record => {
        const item = ensureCustomer(record);
        item.floorplans += 1;
        item.doors += Number(record.doorsTotal || 0);
        item.open += Number(record.open || 0);
        item.done += Number(record.done || 0);
        item.attention += Number(record.attention || 0);
    });
    return Array.from(byCustomer.values())
        .sort((left, right) => {
        const byFloorplans = right.floorplans - left.floorplans;
        if (byFloorplans)
            return byFloorplans;
        return ADMIN_COLLATOR.compare(left.customer, right.customer);
    })
        .slice(0, 6)
        .map(item => ({
        ...item,
        meta: `${adminPlural(item.floorplans, 'plattegrond', 'plattegronden')} · ${adminPlural(item.doors, 'deur', 'deuren')}`,
        badge: item.attention > 0 ? `${item.attention} aandacht` : `${item.open} open`,
    }));
}
function getAdminOverviewMetricItems(metric) {
    const floorplans = getAdminData().floorplans || [];
    if (metric === 'customers')
        return getAdminCustomerMetricItems();
    if (metric === 'floorplans') {
        return floorplans
            .slice()
            .sort((left, right) => {
            const byCustomer = ADMIN_COLLATOR.compare(left.customer || '', right.customer || '');
            if (byCustomer)
                return byCustomer;
            return ADMIN_COLLATOR.compare(adminFloorplanDisplayName(left), adminFloorplanDisplayName(right));
        })
            .slice(0, 6)
            .map(record => createAdminFloorplanMetricItem(record, adminPlural(Number(record.doorsTotal || 0), 'deur', 'deuren')));
    }
    if (metric === 'doors') {
        return sortAdminFloorplansByMetric(floorplans, 'doorsTotal')
            .filter(record => Number(record.doorsTotal || 0) > 0)
            .slice(0, 6)
            .map(record => createAdminFloorplanMetricItem(record, adminPlural(Number(record.doorsTotal || 0), 'deur', 'deuren')));
    }
    if (metric === 'open') {
        return sortAdminFloorplansByMetric(floorplans, 'open')
            .filter(record => Number(record.open || 0) > 0)
            .slice(0, 6)
            .map(record => createAdminFloorplanMetricItem(record, `${record.open || 0} open`));
    }
    if (metric === 'done') {
        return sortAdminFloorplansByMetric(floorplans, 'done')
            .filter(record => Number(record.done || 0) > 0)
            .slice(0, 6)
            .map(record => createAdminFloorplanMetricItem(record, `${record.done || 0} klaar`));
    }
    return sortAdminFloorplansByMetric(floorplans, 'attention')
        .filter(record => Number(record.attention || 0) > 0)
        .slice(0, 6)
        .map(record => createAdminFloorplanMetricItem(record, `${record.attention || 0} rood`));
}
function renderAdminOverviewList(container, items, emptyText) {
    if (!container)
        return;
    container.innerHTML = '';
    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }
    items.forEach(record => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-overview-item';
        const main = document.createElement('div');
        main.className = 'admin-overview-item-main';
        const title = document.createElement('span');
        title.textContent = record.label || adminFloorplanDisplayName(record.record || record);
        const badge = document.createElement('span');
        badge.className = 'admin-overview-badge';
        badge.textContent = record.badge || '';
        main.append(title, badge);
        const meta = document.createElement('div');
        meta.className = 'admin-overview-item-meta';
        meta.textContent = record.meta || record.customer || 'Onbekende klant';
        button.append(main, meta);
        button.addEventListener('click', () => {
            if (record.type === 'customer') {
                adminDashboardState.selectedCustomer = record.customerKey || '';
                adminDashboardState.selectedLocation = '';
                adminDashboardState.selectedKey = '';
                adminDashboardState.selectedDoorKey = '';
                adminDashboardState.previewKey = '';
                adminDashboardState.bulkMode = false;
                adminDashboardState.bulkSelectedKeys.clear();
                setAdminTab('floorplans');
                renderAdminDashboard();
                return;
            }
            const target = record.record || record;
            adminDashboardState.selectedLocation = '';
            adminDashboardState.selectedKey = adminFloorplanKey(target);
            adminDashboardState.selectedDoorKey = '';
            adminDashboardState.bulkMode = false;
            adminDashboardState.bulkSelectedKeys.clear();
            setAdminTab('details');
            renderAdminDashboard();
        });
        container.appendChild(button);
    });
}
function renderAdminOverview() {
    const activeMetric = getActiveAdminOverviewMetric();
    const metricConfig = ADMIN_OVERVIEW_METRICS[activeMetric] || ADMIN_OVERVIEW_METRICS.attention;
    const metricItems = getAdminOverviewMetricItems(activeMetric);
    const floorplans = getAdminData().floorplans || [];
    const open = floorplans
        .filter(record => Number(record.open || 0) > 0)
        .sort((left, right) => Number(right.open || 0) - Number(left.open || 0))
        .slice(0, 6);
    if (adminOverviewKpiTitle)
        adminOverviewKpiTitle.textContent = metricConfig.title;
    if (adminOverviewKpiSubtitle)
        adminOverviewKpiSubtitle.textContent = metricConfig.subtitle;
    renderAdminOverviewList(adminOverviewAttention, metricItems, adminDashboardState.loading ? 'Dashboard laden...' : metricConfig.empty);
    renderAdminOverviewList(adminOverviewOpen, open.map(record => createAdminFloorplanMetricItem(record, `${record.open || 0} open`)), adminDashboardState.loading ? 'Dashboard laden...' : 'Geen open deuren gevonden.');
}
