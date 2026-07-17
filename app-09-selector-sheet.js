function getSelectSheetFilterGroups(type, context = {}) {
    if (type !== 'floorplan')
        return [];
    const hasContextualIndex = context.customerIndex !== null && context.customerIndex !== undefined;
    const contextualIndex = Number(context.customerIndex);
    const customer = hasContextualIndex && Number.isInteger(contextualIndex)
        ? customers[contextualIndex]
        : null;
    const selected = customer
        ? { customer, floorplans: customer.floorplans || [] }
        : topbarFloorplansForSelectedCustomer();
    const { floorplans } = selected;
    if (!selected.customer)
        return [];
    const locationOptions = customer
        ? buildTopbarLocationFilterOptions(floorplans, selected.customer)
        : syncTopbarFloorplanFilters(selected.customer, floorplans).locationOptions;
    const groups = [];
    if (locationOptions.length) {
        groups.push({
            key: 'location',
            label: 'Pand',
            value: topbarFloorplanLocationFilter,
            options: locationOptions,
        });
    }
    return groups;
}
function getSelectSheetFilterLabel(type) {
    return type === 'floorplan' ? 'Pand' : 'Pand';
}
function getSelectSheetFilterValue(type) {
    if (type === 'location' || type === 'floorplan')
        return topbarFloorplanLocationFilter;
    return '';
}
function getSelectSheetPickerMeta(type) {
    if (type !== 'floorplan')
        return '';
    const { customer, floorplan } = getSelectedFloorplan();
    return floorplanPickerMetaText(customer, floorplan);
}
function handleSelectSheetFilterChange(type, value) {
    if (type === 'location' || type === 'floorplan')
        topbarFloorplanLocationFilter = String(value || '');
}
const ADMIN_COLLATOR = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
const AdminIdentity = FD.AdminIdentityService;
function adminTenantId(record) {
    return AdminIdentity.tenantId(record);
}
function adminTenantKey(record) {
    return AdminIdentity.tenantKey(record);
}
function adminSameTenant(left, right) {
    return AdminIdentity.sameTenant(left, right);
}
function adminFloorplanKey(record) {
    return [
        adminTenantKey(record),
        record?.name || record?.floorplan || '',
        record?.repo === 'uploads' ? 'uploads' : 'gallery',
        record?.file || '',
    ].join('\n');
}
function normalizeAdminDoorId(doorId) {
    const value = String(doorId || '').trim();
    if (!value)
        return '';
    if (value.startsWith('door-'))
        return value;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        return `door-${value}`;
    }
    return value;
}
function adminDoorIdentity(door) {
    return normalizeAdminDoorId(door?.doorId || door?.door_id || '') || String(door?.code || '').trim();
}
function adminDoorKey(door) {
    return [
        adminTenantKey(door),
        door?.floorplan || door?.name || '',
        door?.repo === 'uploads' ? 'uploads' : 'gallery',
        door?.file || '',
        adminDoorIdentity(door),
    ].join('\n');
}
function adminStatusLabel(item) {
    const isDone = item?.status === 'done' || item?.new_status === 'done' || item?.newStatus === 'done';
    if (isDone && item?.doorCondition === 'attention')
        return 'Aandacht nodig';
    if (item?.new_status === 'done' || item?.newStatus === 'done')
        return 'Afgerond';
    if (item?.status === 'done')
        return 'Afgerond';
    if (item?.new_status === 'todo' || item?.newStatus === 'todo' || item?.result === 'todo')
        return 'Open';
    return 'Open';
}
function adminActivityKey(row) {
    return [
        adminTenantKey(row),
        row?.floorplan || row?.name || '',
        row?.doorId || row?.door_id || row?.code || '',
    ].join('\n');
}
function adminActivityDoorCondition(row) {
    const condition = String(row?.doorCondition || row?.door_condition || '').trim();
    return ['ok', 'attention', 'unknown'].includes(condition) ? condition : 'unknown';
}
function isCompletedAdminActivity(row) {
    const result = String(row?.result || '');
    return row?.newStatus === 'done' ||
        row?.new_status === 'done' ||
        result === 'done' ||
        result.startsWith('done_') ||
        result.startsWith('already_done');
}
function normalizeAdminActivityRows(rows) {
    const normalized = [];
    const byKey = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
        if (!isCompletedAdminActivity(row))
            return;
        const key = adminActivityKey(row);
        if (!key.trim())
            return;
        const existing = byKey.get(key);
        const condition = adminActivityDoorCondition(row);
        if (!existing) {
            const copy = { ...row, doorCondition: condition };
            byKey.set(key, copy);
            normalized.push(copy);
            return;
        }
        if (condition === 'attention') {
            existing.doorCondition = 'attention';
            existing.doorConditionLabel = row.doorConditionLabel || row.door_condition_label || existing.doorConditionLabel || '';
        }
    });
    return normalized;
}
function adminFormatDateTime(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime()))
        return '';
    return new Intl.DateTimeFormat('nl-NL', {
        timeZone: CONFIG.appTimeZone,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function adminNormalizeSearch(value) {
    return String(value || '').trim().toLowerCase();
}
function adminDoorColor(door) {
    if (door?.status === 'done' && door?.doorCondition === 'attention')
        return COLORS.attention;
    if (door?.status === 'done')
        return COLORS.done;
    return COLORS.todo;
}
function adminFloorplanSearchText(record) {
    return [
        record.customer,
        record.displayName,
        record.name,
        floorplanLocationLabelForValue(floorplanLocationValue(record)),
        record.building,
        record.floorLabel,
        record.locationAddress,
        record.locationNote,
        record.file,
    ].join(' ').toLowerCase();
}
function adminDoorCodeLabel(door) {
    return String(door?.code || door?.doorCode || door?.door_code || door?.name || 'Deur').trim();
}
function adminDoorFloorplanLabel(door) {
    return String(door?.floorplanDisplayName || door?.floorplan || door?.name || '').trim();
}
function adminDoorFloorplanFilterKey(door) {
    return adminFloorplanKey(door);
}
const ADMIN_OVERVIEW_METRICS = {
    customers: {
        title: 'Klanten',
        subtitle: 'Meeste plattegronden',
        empty: 'Geen klanten gevonden.',
    },
    floorplans: {
        title: 'Plattegronden',
        subtitle: 'Alle beschikbare plattegronden',
        empty: 'Geen plattegronden gevonden.',
    },
    doors: {
        title: 'Deuren',
        subtitle: 'Meeste deurmarkers',
        empty: 'Geen deuren gevonden.',
    },
    open: {
        title: 'Openstaande deuren',
        subtitle: 'Nog te doen',
        empty: 'Geen open deuren gevonden.',
    },
    done: {
        title: 'Afgeronde deuren',
        subtitle: 'Meeste afgerond',
        empty: 'Geen afgeronde deuren gevonden.',
    },
    attention: {
        title: 'Aandacht nodig',
        subtitle: 'Rode status',
        empty: 'Geen deuren die aandacht nodig hebben.',
    },
};
function getAdminData() {
    return adminDashboardState.data || { summary: {}, customers: [], floorplans: [], doors: [] };
}
function findAdminFloorplanForActivity(item) {
    if (!item)
        return null;
    const exactKey = adminFloorplanKey(item);
    const floorplans = getAdminData().floorplans || [];
    const floorId = Number(item.floorId || item.floor_id || 0);
    return (floorId ? floorplans.find(record => Number(record.floorId || record.floor_id || 0) === floorId) : null) ||
        floorplans.find(record => adminFloorplanKey(record) === exactKey) ||
        floorplans.find(record => (adminSameTenant(record, item) &&
            record.name === (item.floorplan || item.name))) ||
        null;
}
function findAdminDoorForActivity(item) {
    if (!item)
        return null;
    const doors = getAdminData().doors || [];
    const exactKey = adminDoorKey(item);
    const floorId = Number(item.floorId || item.floor_id || 0);
    const itemDoorId = adminDoorIdentity(item);
    const itemCode = adminDoorCodeLabel(item);
    return doors.find(door => adminDoorKey(door) === exactKey) ||
        doors.find(door => (floorId &&
            Number(door.floorId || door.floor_id || 0) === floorId &&
            adminDoorIdentity(door) &&
            adminDoorIdentity(door) === itemDoorId)) ||
        doors.find(door => (floorId &&
            Number(door.floorId || door.floor_id || 0) === floorId &&
            itemCode &&
            adminDoorCodeLabel(door) === itemCode)) ||
        doors.find(door => (adminSameTenant(door, item) &&
            door.floorplan === (item.floorplan || item.name) &&
            adminDoorIdentity(door) === itemDoorId)) ||
        null;
}
function getSelectedAdminDoor() {
    if (!adminDashboardState.selectedDoorKey)
        return null;
    return (getAdminData().doors || []).find(door => adminDoorKey(door) === adminDashboardState.selectedDoorKey) || null;
}
function setAdminTab(tabName) {
    const allowed = new Set(['overview', 'door-search', 'floorplans', 'details']);
    const nextTab = allowed.has(tabName) ? tabName : 'overview';
    adminDashboardState.activeTab = nextTab;
    adminDashboardTabs.forEach(button => {
        const active = button.dataset.adminTab === nextTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    adminDashboardTabPanels.forEach(panel => {
        const active = panel.dataset.adminPanel === nextTab;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
    });
}
function getAdminCustomerOptions() {
    const records = [...(getAdminData().customers || []), ...(getAdminData().floorplans || [])];
    return AdminIdentity.customerOptions(records, ADMIN_COLLATOR);
}
function adminCustomerLabel(record) {
    return getAdminCustomerOptions().find(option => option.value === adminTenantKey(record))?.label ||
        record?.customer || 'Onbekende klant';
}
function getFilteredAdminFloorplans() {
    const data = getAdminData();
    const query = adminNormalizeSearch(adminDashboardState.searchQuery);
    const selectedCustomer = adminDashboardState.selectedCustomer;
    const selectedLocation = adminDashboardState.selectedLocation;
    return (Array.isArray(data.floorplans) ? data.floorplans : []).filter(record => {
        if (selectedCustomer && adminTenantKey(record) !== selectedCustomer)
            return false;
        if (selectedLocation && floorplanLocationValue(record) !== selectedLocation)
            return false;
        if (query && !adminFloorplanSearchText(record).includes(query))
            return false;
        return true;
    });
}
function getSelectedAdminFloorplan(filtered = null, { allowFallback = false } = {}) {
    if (adminDashboardState.selectedKey) {
        const selectedFromAll = (getAdminData().floorplans || [])
            .find(record => adminFloorplanKey(record) === adminDashboardState.selectedKey);
        if (selectedFromAll)
            return selectedFromAll;
    }
    if (!allowFallback)
        return null;
    const list = filtered || getFilteredAdminFloorplans();
    if (!list.length)
        return null;
    const selected = list.find(record => adminFloorplanKey(record) === adminDashboardState.selectedKey);
    return selected || list[0];
}
function setAdminDashboardLoading(loading) {
    adminDashboardState.loading = loading;
    if (adminDashboardRefresh) {
        adminDashboardRefresh.disabled = loading;
        adminDashboardRefresh.textContent = loading ? 'Laden...' : 'Vernieuwen';
    }
    renderAdminFreshness();
}
function renderAdminKpis() {
    const summary = getAdminData().summary || {};
    Object.entries(adminKpiEls).forEach(([key, el]) => {
        if (!el)
            return;
        el.textContent = String(Number(summary[key] || 0));
    });
    const activeMetric = getActiveAdminOverviewMetric();
    adminKpiButtons.forEach(button => {
        const active = button.dataset.adminKpi === activeMetric;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}
function renderAdminFreshness() {
    if (!adminDashboardFreshness)
        return;
    if (adminDashboardState.loading) {
        adminDashboardFreshness.textContent = 'Dashboard wordt bijgewerkt...';
        return;
    }
    if (adminDashboardState.loadError && !adminDashboardState.data) {
        adminDashboardFreshness.textContent = 'Laatste update mislukt';
        return;
    }
    if (!adminDashboardState.lastUpdatedAt) {
        adminDashboardFreshness.textContent = 'Nog niet bijgewerkt';
        return;
    }
    const formatted = adminFormatDateTime(adminDashboardState.lastUpdatedAt);
    adminDashboardFreshness.textContent = formatted
        ? `Bijgewerkt ${formatted} (Amsterdam)`
        : 'Bijgewerkt';
}
function renderActiveUsers(counts) {
    Object.entries(adminOnlineEls).forEach(([role, el]) => {
        if (!el)
            return;
        const value = counts && Object.prototype.hasOwnProperty.call(counts, role)
            ? Number(counts[role] || 0)
            : null;
        el.textContent = value === null ? '—' : String(value);
    });
}
function adminSessionRoleLabel(role) {
    if (role === 'admin')
        return 'admin';
    if (role === 'monteur')
        return 'monteur';
    if (role === 'viewer')
        return 'viewer';
    return role || 'sessie';
}
