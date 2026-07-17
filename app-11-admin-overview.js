function renderAdminActivity() {
    if (!adminActivityList)
        return;
    adminActivityList.innerHTML = '';
    if (adminDashboardState.activityLoading) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Activiteit laden...';
        adminActivityList.appendChild(empty);
        return;
    }
    if (adminDashboardState.activityError) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = adminDashboardState.activityUnavailable
            ? 'Activiteit komt beschikbaar na Worker update.'
            : 'Activiteit laden mislukt.';
        adminActivityList.appendChild(empty);
        return;
    }
    if (!adminDashboardState.activity.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Nog geen recente statusactiviteit.';
        adminActivityList.appendChild(empty);
        return;
    }
    adminDashboardState.activity.forEach(row => {
        const door = findAdminDoorForActivity(row);
        const floorplan = findAdminFloorplanForActivity(row);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-activity-item';
        const main = document.createElement('div');
        main.className = 'admin-activity-item-main';
        const label = document.createElement('span');
        label.className = 'admin-activity-label';
        const dot = document.createElement('span');
        dot.className = 'admin-status-dot';
        const rowCondition = adminActivityDoorCondition(row);
        const activityStatus = {
            status: row.newStatus === 'done' || row.new_status === 'done' ? 'done' : 'todo',
            doorCondition: rowCondition === 'attention' || door?.doorCondition === 'attention'
                ? 'attention'
                : rowCondition || door?.doorCondition || 'unknown',
            newStatus: row.newStatus || row.new_status || '',
            new_status: row.new_status || row.newStatus || '',
            result: row.result || '',
        };
        dot.style.background = adminDoorColor(activityStatus);
        const code = adminDoorCodeLabel(row) || adminDoorCodeLabel(door) || 'Deur';
        label.append(dot, document.createTextNode(`${code} · ${adminStatusLabel(activityStatus)}`));
        const time = document.createElement('span');
        time.className = 'admin-activity-time';
        time.textContent = adminFormatDateTime(row.createdAt || row.created_at);
        main.append(label, time);
        const meta = document.createElement('div');
        meta.className = 'admin-activity-item-meta';
        meta.textContent = `${row.customer || door?.customer || '-'} · ${door?.floorplanDisplayName || floorplan?.displayName || row.floorplan || '-'}`;
        button.append(main, meta);
        button.addEventListener('click', () => {
            const targetFloorplan = floorplan || door || row;
            adminDashboardState.selectedCustomer = '';
            adminDashboardState.selectedLocation = '';
            adminDashboardState.selectedKey = adminFloorplanKey(targetFloorplan);
            adminDashboardState.selectedDoorKey = door ? adminDoorKey(door) : adminDoorKey(row);
            adminDashboardState.bulkMode = false;
            adminDashboardState.bulkSelectedKeys.clear();
            setAdminTab('details');
            renderAdminDashboard();
        });
        adminActivityList.appendChild(button);
    });
}
async function loadAdminActivity() {
    if (!isAdminUser())
        return;
    const generation = FD.DataService.sessionGeneration?.();
    adminDashboardState.activityLoading = true;
    adminDashboardState.activityError = '';
    adminDashboardState.activityUnavailable = false;
    renderAdminActivity();
    try {
        const result = await FD.DataService.fetchAdminActivity(CONFIG, {
            diagnostics: {
                purpose: 'admin_activity',
                background: true,
            },
        });
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        adminDashboardState.activity = normalizeAdminActivityRows(result.activity);
    }
    catch (err) {
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        const unavailable = err?.status === 404 || err?.status === 501 || err?.code === 'not_implemented' || err?.message === 'not_implemented';
        if (!unavailable) {
            console.warn('Admin activiteit laden mislukt:', err);
        }
        adminDashboardState.activity = [];
        adminDashboardState.activityError = err.message || 'activity_failed';
        adminDashboardState.activityUnavailable = unavailable;
    }
    finally {
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        adminDashboardState.activityLoading = false;
        renderAdminActivity();
    }
}
function renderAdminCustomerFilters() {
    if (!adminCustomerFilters)
        return;
    adminCustomerFilters.innerHTML = '';
    const data = getAdminData();
    const counts = new Map();
    (data.floorplans || []).forEach(record => {
        const key = adminTenantKey(record);
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    const buttons = [
        { label: 'Alle klanten', value: '', count: data.floorplans?.length || 0 },
        ...getAdminCustomerOptions().map(option => ({ ...option, count: counts.get(option.value) || 0 })),
    ];
    buttons.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-filter-button';
        button.classList.toggle('active', adminDashboardState.selectedCustomer === item.value);
        const label = document.createElement('span');
        label.textContent = item.label;
        const count = document.createElement('span');
        count.textContent = String(item.count);
        button.append(label, count);
        button.addEventListener('click', () => {
            adminDashboardState.selectedCustomer = item.value;
            adminDashboardState.selectedLocation = '';
            adminDashboardState.selectedKey = '';
            adminDashboardState.selectedDoorKey = '';
            adminDashboardState.previewKey = '';
            adminDashboardState.bulkMode = false;
            adminDashboardState.bulkSelectedKeys.clear();
            renderAdminDashboard();
        });
        adminCustomerFilters.appendChild(button);
    });
}
function getAdminBulkSelectedRecords() {
    const selectedKeys = adminDashboardState.bulkSelectedKeys;
    if (!selectedKeys || !selectedKeys.size)
        return [];
    return (getAdminData().floorplans || [])
        .filter(record => selectedKeys.has(adminFloorplanKey(record)) &&
        (!adminDashboardState.selectedCustomer || adminTenantKey(record) === adminDashboardState.selectedCustomer));
}
function pruneAdminBulkSelection() {
    const allKeys = new Set((getAdminData().floorplans || [])
        .filter(record => !adminDashboardState.selectedCustomer || adminTenantKey(record) === adminDashboardState.selectedCustomer)
        .map(adminFloorplanKey));
    Array.from(adminDashboardState.bulkSelectedKeys).forEach(key => {
        if (!allKeys.has(key))
            adminDashboardState.bulkSelectedKeys.delete(key);
    });
}
function setAdminBulkMode(active) {
    if (active && !adminDashboardState.selectedCustomer) {
        showToast('Kies eerst één klant voor bulkbewerking', 'error');
        return;
    }
    adminDashboardState.bulkMode = Boolean(active);
    adminDashboardState.bulkSelectedKeys.clear();
    renderAdminDashboard();
}
function renderAdminBulkControls(filtered) {
    pruneAdminBulkSelection();
    const bulkMode = Boolean(adminDashboardState.bulkMode);
    const selectedCount = getAdminBulkSelectedRecords().length;
    if (adminBulkToggle) {
        adminBulkToggle.hidden = true;
        adminBulkToggle.disabled = !adminDashboardState.selectedCustomer;
        adminBulkToggle.title = adminDashboardState.selectedCustomer
            ? 'Meerdere plattegronden selecteren'
            : 'Kies eerst één klant';
    }
    if (adminBulkSelectVisible) {
        adminBulkSelectVisible.hidden = !bulkMode;
        adminBulkSelectVisible.disabled = !filtered.length;
    }
    if (adminBulkClear) {
        adminBulkClear.hidden = !bulkMode;
        adminBulkClear.disabled = selectedCount === 0;
    }
    if (adminBulkCancel) {
        adminBulkCancel.hidden = !bulkMode;
    }
}
function toggleAdminBulkRecord(record) {
    const key = adminFloorplanKey(record);
    if (!key.trim())
        return;
    if (adminDashboardState.bulkSelectedKeys.has(key)) {
        adminDashboardState.bulkSelectedKeys.delete(key);
    }
    else {
        adminDashboardState.bulkSelectedKeys.add(key);
    }
    renderAdminFloorplanList();
}
function selectVisibleAdminBulkFloorplans() {
    if (!adminDashboardState.bulkMode)
        return;
    getFilteredAdminFloorplans().forEach(record => {
        adminDashboardState.bulkSelectedKeys.add(adminFloorplanKey(record));
    });
    renderAdminFloorplanList();
}
function clearAdminBulkSelection() {
    adminDashboardState.bulkSelectedKeys.clear();
    renderAdminFloorplanList();
}
function renderAdminLocationFilters() {
    if (!adminLocationFilters)
        return;
    adminLocationFilters.innerHTML = '';
    const data = getAdminData();
    const selectedCustomer = adminDashboardState.selectedCustomer;
    const scopedFloorplans = (Array.isArray(data.floorplans) ? data.floorplans : [])
        .filter(record => !selectedCustomer || adminTenantKey(record) === selectedCustomer);
    const options = buildLocationFilterOptions(scopedFloorplans);
    adminDashboardState.selectedLocation = normalizeLocationFilterValue(adminDashboardState.selectedLocation, options);
    if (!options.length) {
        if (adminLocationFilterHeading)
            adminLocationFilterHeading.hidden = true;
        adminLocationFilters.hidden = true;
        adminDashboardState.selectedLocation = '';
        return;
    }
    if (adminLocationFilterHeading)
        adminLocationFilterHeading.hidden = false;
    adminLocationFilters.hidden = false;
    const select = document.createElement('select');
    select.className = 'admin-dashboard-input admin-location-select';
    select.setAttribute('aria-label', 'Locatie');
    options.forEach(item => {
        const value = String(item.value || '');
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${item.label} (${item.count})`;
        select.appendChild(option);
    });
    select.value = adminDashboardState.selectedLocation;
    select.addEventListener('change', () => {
        adminDashboardState.selectedLocation = select.value;
        adminDashboardState.selectedKey = '';
        adminDashboardState.selectedDoorKey = '';
        adminDashboardState.previewKey = '';
        renderAdminDashboard();
    });
    adminLocationFilters.appendChild(select);
}
