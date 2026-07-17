async function loadDoorCodeIndex({ force = false } = {}) {
    if (!canEditMarkersCurrentFloorplan())
        return null;
    if (!force) {
        if (doorCodeIndexState.ready)
            return doorCodeIndexState.entries;
        if (doorCodeIndexState.pending)
            return doorCodeIndexState.pending;
    }
    const requestId = doorCodeIndexState.requestId + 1;
    doorCodeIndexState = {
        ready: false,
        loading: true,
        entries: [],
        byCode: new Map(),
        requestId,
        pending: null,
        error: null,
    };
    const pending = FD.DataService.fetchDoorCodeIndex(CONFIG, {
        diagnostics: {
            purpose: 'door_code_index_lookup',
            background: true,
        },
    }).then(response => {
        if (doorCodeIndexState.requestId !== requestId)
            return null;
        const entries = Array.isArray(response?.entries) ? response.entries : [];
        doorCodeIndexState = {
            ready: true,
            loading: false,
            entries,
            byCode: rebuildDoorCodeIndexMap(entries),
            requestId,
            pending: null,
            error: null,
        };
        return entries;
    }).catch(err => {
        if (doorCodeIndexState.requestId === requestId) {
            doorCodeIndexState = {
                ready: false,
                loading: false,
                entries: [],
                byCode: new Map(),
                requestId,
                pending: null,
                error: err,
            };
        }
        console.warn('Globale deurcode-index laden mislukt:', err);
        return null;
    });
    doorCodeIndexState.pending = pending;
    return pending;
}
function findGlobalDoorCodeConflict(code) {
    const normalized = normalizeDoorCodeForIndex(code);
    if (!normalized || !doorCodeIndexState.ready)
        return null;
    const target = currentJotFormLookupTarget();
    if (!target)
        return null;
    return (doorCodeIndexState.byCode.get(normalized) || [])
        .find(entry => !(entry.repo === target.repo && entry.file === target.file)) || null;
}
function globalDoorCodeConflictMessage(conflict, code) {
    const visibleCode = String(code || conflict?.code || '').trim();
    const where = [conflict?.customer, conflict?.floorplan].filter(Boolean).join(' - ');
    const door = conflict?.doorId ? `, deur ${conflict.doorId}` : '';
    return where
        ? `Code ${visibleCode} is al in gebruik bij ${where}${door}.`
        : `Code ${visibleCode} is al ergens anders in DoorAtlas in gebruik.`;
}
function doorCodeIndexLoadingMessage() {
    if (doorCodeIndexState.loading)
        return 'Globale deurcodecontrole wordt nog geladen. Probeer het over een paar seconden opnieuw.';
    return '';
}
const customerPickerBtn = document.getElementById('customer-picker-btn');
const floorplanPickerBtn = document.getElementById('floorplan-picker-btn');
const customerPickerValue = document.getElementById('customer-picker-value');
const floorplanPickerValue = document.getElementById('floorplan-picker-value');
const floorplanPickerMeta = document.getElementById('floorplan-picker-meta');
const desktopContextPickerBtn = document.getElementById('desktop-context-picker-btn');
const desktopContextCustomerValue = document.getElementById('desktop-context-customer-value');
const desktopContextFloorplanValue = document.getElementById('desktop-context-floorplan-value');
const selectSheetOverlay = document.getElementById('select-sheet-overlay');
const selectSheet = document.getElementById('select-sheet');
const selectSheetEyebrow = document.getElementById('select-sheet-eyebrow');
const selectSheetTitle = document.getElementById('select-sheet-title');
const selectSheetSearch = document.getElementById('select-sheet-search');
const selectSheetLocationFilters = document.getElementById('select-sheet-location-filters');
const selectSheetList = document.getElementById('select-sheet-list');
const selectSheetClose = document.getElementById('select-sheet-close');
const LOCATION_COLLATOR = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
function floorplanLocationValue(floorplan) {
    return FD.SelectSheetService.floorplanLocationFilterValue(floorplan);
}
function floorplanLocationLabelForValue(value) {
    return FD.SelectSheetService.floorplanLocationFilterLabel(value);
}
function compareFloorplanLocationValues(left, right) {
    const noneValue = FD.SelectSheetService.LOCATION_NONE_VALUE;
    const leftNone = left === noneValue;
    const rightNone = right === noneValue;
    if (leftNone !== rightNone)
        return leftNone ? 1 : -1;
    return LOCATION_COLLATOR.compare(floorplanLocationLabelForValue(left), floorplanLocationLabelForValue(right));
}
function compareFloorplanSheetItems(left, right) {
    if ((left.organizerNone ? 1 : 0) !== (right.organizerNone ? 1 : 0)) {
        return left.organizerNone ? 1 : -1;
    }
    const organizerCompare = LOCATION_COLLATOR.compare(left.organizerLabel || '', right.organizerLabel || '');
    if (organizerCompare)
        return organizerCompare;
    const displayCompare = FD.SelectSheetService.compareFloorplanDisplayOrder(left.floorplan, right.floorplan, left.label, right.label);
    if (displayCompare)
        return displayCompare;
    const labelCompare = LOCATION_COLLATOR.compare(left.label, right.label);
    return labelCompare || left.index - right.index;
}
function floorplanOrganizerMeta(floorplan) {
    const location = FD.SelectSheetService.floorplanLocationName(floorplan);
    if (location) {
        return {
            key: `location:${location}`,
            label: location,
            kind: 'location',
            none: false,
        };
    }
    return {
        key: FD.SelectSheetService.ORGANIZER_NONE_VALUE,
        label: FD.SelectSheetService.ORGANIZER_NONE_LABEL,
        kind: 'none',
        none: true,
    };
}
function floorplanSheetSearchText(floorplan, label, meta = '') {
    return [
        label,
        meta,
        floorplanLocationLabelForValue(floorplanLocationValue(floorplan)),
        floorplan?.name,
        floorplan?.building,
        floorplan?.floorLabel,
        floorplan?.file,
    ].join(' ').toLowerCase();
}
function normalizeLocationFilterValue(value, options) {
    const allowed = new Set((options || []).map(option => String(option.value || '')));
    const normalized = String(value || '');
    return allowed.has(normalized) ? normalized : '';
}
function locationOptionDescription(customer, value) {
    if (!customer || !value || value === FD.SelectSheetService.LOCATION_NONE_VALUE)
        return '';
    return formatLocationMeta(FD.SelectSheetService.getCustomerLocationDetails(customer, value));
}
function buildLocationFilterOptions(items, customer = null) {
    const options = FD.SelectSheetService.buildLocationFilterOptions(items);
    if (options.length <= 1)
        return [];
    if (!customer)
        return options;
    return options.map(option => ({
        ...option,
        description: locationOptionDescription(customer, option.value),
    }));
}
function topbarFloorplansForSelectedCustomer() {
    const ci = FD.SelectSheetService.selectedIndex(customerSelect);
    if (ci === null || !customers[ci])
        return { customer: null, floorplans: [] };
    return {
        customer: customers[ci],
        floorplans: customers[ci].floorplans || [],
    };
}
function buildTopbarLocationFilterOptions(floorplans, customer) {
    return buildLocationFilterOptions(floorplans, customer);
}
function syncTopbarFloorplanFilters(customer, floorplans) {
    const locationOptions = buildTopbarLocationFilterOptions(floorplans, customer);
    topbarFloorplanLocationFilter = normalizeLocationFilterValue(topbarFloorplanLocationFilter, locationOptions);
    return { locationOptions };
}
function getSelectSheetItems(type, context = {}) {
    if (type === 'customer') {
        return FD.SelectSheetService
            .sortedWithOriginalIndex(customers, customer => customer.customer)
            .map(({ item, index, label }) => {
            const count = (item?.floorplans || []).length;
            return { index, label, meta: `${count} plattegrond${count === 1 ? '' : 'en'}` };
        });
    }
    const hasContextualIndex = context.customerIndex !== null && context.customerIndex !== undefined;
    const contextualIndex = Number(context.customerIndex);
    const ci = hasContextualIndex && Number.isInteger(contextualIndex)
        ? contextualIndex
        : FD.SelectSheetService.selectedIndex(customerSelect);
    if (ci === null || !customers[ci])
        return [];
    const customer = customers[ci];
    const floorplans = customer.floorplans || [];
    if (!hasContextualIndex)
        syncTopbarFloorplanFilters(customer, floorplans);
    if (type === 'location')
        return [];
    const hasOrganizerBlocks = floorplans.some(floorplan => FD.SelectSheetService.floorplanLocationName(floorplan));
    const locationFilterActive = Boolean(!topbarFloorplanLocationFilter);
    const toSheetItem = (fp, index, label, overrides = {}) => {
        const readOnly = isViewerReadOnlyFloorplan(customer.customer, fp.name);
        const locationValue = floorplanLocationValue(fp);
        const description = floorplanAddressMeta(customer, fp);
        const meta = floorplanPermissionMeta(customer, fp);
        const organizer = floorplanOrganizerMeta(fp);
        const groupLabel = overrides.groupLabel !== undefined
            ? overrides.groupLabel
            : (locationFilterActive ? floorplanLocationLabelForValue(locationValue) : organizer.label);
        return {
            index,
            label,
            meta,
            description,
            filterValues: {
                location: locationValue,
            },
            floorplan: fp,
            locationValue,
            organizerKey: organizer.key,
            organizerLabel: organizer.label,
            organizerKind: organizer.kind,
            organizerNone: organizer.none,
            collapsibleGroupKey: hasOrganizerBlocks ? organizer.key : '',
            collapsibleGroupLabel: hasOrganizerBlocks ? organizer.label : '',
            groupLabel,
            searchText: floorplanSheetSearchText(fp, label, [description, meta].filter(Boolean).join(' ')),
            readOnly,
            ...overrides,
        };
    };
    const sortedItems = FD.SelectSheetService
        .sortedWithOriginalIndex(customers[ci].floorplans, floorplan => FD.SelectSheetService.floorplanDisplayName(floorplan))
        .map(({ item: fp, index, label }) => toSheetItem(fp, index, label))
        .sort(compareFloorplanSheetItems);
    return sortedItems;
}
function getSelectSheetFilters(type) {
    if (type !== 'floorplan')
        return [];
    const ci = FD.SelectSheetService.selectedIndex(customerSelect);
    if (ci === null || !customers[ci])
        return [];
    const { locationOptions } = syncTopbarFloorplanFilters(customers[ci], customers[ci].floorplans || []);
    return locationOptions;
}
