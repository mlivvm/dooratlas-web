function canManageUploads() {
    return FD.DataService.canManageUploads(CONFIG);
}
function isAdminUser() {
    return currentUser?.role === 'admin';
}
function canUseAdminDashboard() {
    return isAdminUser() && FD.DataService.isAdminOverviewEnabled?.(CONFIG);
}
function canUseExcelExport() {
    return currentUser?.role === 'admin' || currentUser?.role === 'viewer';
}
function isTestCustomerName(customerName) {
    return String(customerName || '') === CONFIG.workerStatusWriteTestCustomer;
}
function currentFloorplanPermissionTarget() {
    const selection = getSelectedFloorplan();
    const customer = selection.customer || customers.find(item => item?.customer === currentCustomer) || null;
    const floorplan = selection.floorplan || (customer?.floorplans || [])
        .find(item => item?.name === currentFloorplan) || null;
    return {
        tenantId: Number(floorplan?.tenantId || customer?.tenantId || 0),
    };
}
function canEditMarkersCurrentFloorplan() {
    return FD.DataService.canEditMarkers(CONFIG, currentFloorplanPermissionTarget());
}
function canCreateInspectionCurrentFloorplan() {
    return FD.DataService.canCreateInspection(CONFIG, currentFloorplanPermissionTarget());
}
function isViewerReadOnlyFloorplan(customer, floorplan) {
    return FD.DataService.isViewerReadOnlyFloorplan(CONFIG, customer, floorplan);
}
function floorplanPickerLabel(customer, floorplan) {
    if (!floorplan)
        return '';
    return FD.SelectSheetService.floorplanDisplayName(floorplan);
}
function getFloorplanLocationDetails(customer, floorplan) {
    return FD.SelectSheetService.getFloorplanLocationDetails(customer, floorplan);
}
function floorplanAddressMeta(customer, floorplan) {
    return formatLocationMeta(getFloorplanLocationDetails(customer, floorplan));
}
function formatLocationMeta(details) {
    if (!details)
        return '';
    const address = String(details.address || '').trim();
    const note = String(details.note || '').trim();
    return [
        address,
        note ? `Notitie: ${note}` : '',
    ].filter(Boolean).join(' · ');
}
const LOCATION_DETAILS_SAVE_ERROR = 'location_details_not_persisted';
function locationDetailsSaveError() {
    const error = new Error('Adresgegevens zijn niet opgeslagen. Vernieuw de app en probeer opnieuw.');
    error.code = LOCATION_DETAILS_SAVE_ERROR;
    return error;
}
function normalizeLocationDetailsKey(value) {
    return String(value || '').trim().toLowerCase();
}
function getPersistedCustomerLocationDetails(customersList, customerName, locationName) {
    const customerKey = String(customerName || '');
    const locationKey = normalizeLocationDetailsKey(locationName);
    if (!customerKey || !locationKey || !Array.isArray(customersList))
        return null;
    const customer = customersList.find(item => String(item?.customer || '') === customerKey);
    if (!customer || !Array.isArray(customer.locations))
        return null;
    const location = customer.locations.find(item => normalizeLocationDetailsKey(item?.name) === locationKey);
    if (!location)
        return null;
    return {
        address: String(location.address || '').trim(),
        note: String(location.note || '').trim(),
        street: String(location.street || '').trim(),
        postalCode: String(location.postalCode || '').trim(),
        city: String(location.city || '').trim(),
        notes: String(location.notes || location.note || '').trim(),
    };
}
function assertStructuredMetadataPersisted(customersList, customerName, locationName, expected) {
    const details = getPersistedCustomerLocationDetails(customersList, customerName, locationName);
    if (!details ||
        details.street !== String(expected.street || '').trim() ||
        details.postalCode !== String(expected.postalCode || '').trim().toUpperCase() ||
        details.city !== String(expected.city || '').trim() ||
        details.notes !== String(expected.notes || '').trim()) {
        throw locationDetailsSaveError();
    }
}
function assertLocationDetailsPersisted(customersList, customerName, locationName, expectedAddress, expectedNote) {
    if (!String(locationName || '').trim())
        return;
    const address = String(expectedAddress || '').trim();
    const note = String(expectedNote || '').trim();
    const details = getPersistedCustomerLocationDetails(customersList, customerName, locationName);
    if (!address && !note) {
        if (details && (details.address || details.note))
            throw locationDetailsSaveError();
        return;
    }
    if (!details || details.address !== address || details.note !== note) {
        throw locationDetailsSaveError();
    }
}
function metadataSaveErrorText(err, duplicateMessage) {
    if (err?.code === LOCATION_DETAILS_SAVE_ERROR)
        return err.message;
    if (err?.status === 409)
        return duplicateMessage;
    return 'Opslaan mislukt: ' + (err?.message || 'onbekende fout');
}
function floorplanPermissionMeta(customer, floorplan) {
    if (!floorplan)
        return '';
    if (isViewerReadOnlyFloorplan(customer?.customer || customer, floorplan.name)) {
        return 'Alleen kijken';
    }
    return currentUser?.role === 'viewer' ? 'Testen toegestaan' : '';
}
function floorplanPickerMetaText(customer, floorplan) {
    return [
        floorplanAddressMeta(customer, floorplan),
        floorplanPermissionMeta(customer, floorplan),
    ].filter(Boolean).join(' · ');
}
function renderLocationAddressBar(customer, floorplan) {
    if (!locationAddressBar)
        return;
    const details = getFloorplanLocationDetails(customer, floorplan);
    if (!details) {
        locationAddressBar.hidden = true;
        if (locationAddressName)
            locationAddressName.textContent = '';
        if (locationAddressText)
            locationAddressText.textContent = '';
        if (locationAddressNote)
            locationAddressNote.textContent = '';
        return;
    }
    locationAddressBar.hidden = false;
    const address = details.address || '';
    const note = details.note || '';
    if (locationAddressName)
        locationAddressName.textContent = details.name || floorplan?.building || 'Locatie';
    if (locationAddressText) {
        locationAddressText.textContent = address;
        locationAddressText.hidden = !address;
    }
    if (locationAddressNote) {
        locationAddressNote.textContent = note ? `Notitie: ${note}` : '';
        locationAddressNote.hidden = !note;
    }
    locationAddressBar.title = [details.name, address, note].filter(Boolean).join(' · ');
}
function hideLocationAddressBar() {
    renderLocationAddressBar(null, null);
}
function getSelectedTopbarFloorplanRecord() {
    const { customer, floorplan } = getSelectedFloorplan();
    const locationDetails = getFloorplanLocationDetails(customer, floorplan);
    if (!customer || !floorplan)
        return null;
    return {
        customer: customer.customer,
        name: floorplan.name,
        displayName: FD.SelectSheetService.floorplanDisplayName(floorplan),
        floorId: floorplan.floorId || floorplan.id || floorplan.file || floorplan.name || '',
        building: floorplan.building || '',
        floorLabel: floorplan.floorLabel || '',
        levelOrder: Number(floorplan.levelOrder ?? 0),
        floorNotes: floorplan.floorNotes || '',
        locationStreet: locationDetails?.street || floorplan.locationStreet || '',
        locationPostalCode: locationDetails?.postalCode || floorplan.locationPostalCode || '',
        locationCity: locationDetails?.city || floorplan.locationCity || '',
        locationNotes: locationDetails?.notes || floorplan.locationNotes || '',
        locationAddress: locationDetails?.address || '',
        locationNote: locationDetails?.note || '',
        repo: floorplan.repo === 'uploads' ? 'uploads' : 'gallery',
        file: floorplan.file || '',
        uploaded: Boolean(floorplan.uploaded || floorplan.repo === 'uploads'),
    };
}
function updateTopbarMetadataButton() {
    if (!btnTopbarMetadata)
        return;
    const selected = getSelectedTopbarFloorplanRecord();
    const visible = isAdminUser() && FD.DataService.isFloorplanMetadataWriteEnabled?.(CONFIG);
    btnTopbarMetadata.hidden = !visible;
    btnTopbarMetadata.disabled = !visible || !selected;
    btnTopbarMetadata.title = selected
        ? `Gegevens aanpassen van ${selected.displayName || selected.name}`
        : 'Kies eerst een plattegrond';
}
function applyDoorActionPermissions() {
    if (!selectedDoor)
        return;
    const allowed = canCreateInspectionCurrentFloorplan();
    Object.values(btnJotforms).forEach(button => {
        if (!button)
            return;
        const jotformPending = button.dataset.jotformPending === '1';
        const jotformUnavailable = button.dataset.jotformUnavailable === '1';
        const jotformLocked = button.dataset.jotformLocked === '1';
        button.classList.toggle('disabled', !allowed || jotformPending || jotformUnavailable || jotformLocked);
        button.title = jotformUnavailable
            ? 'Opname formulier nog niet beschikbaar'
            : (jotformLocked
                ? (button.dataset.jotformLockedTitle || 'Er hangt al een ander formulier aan deze deur')
                : (!allowed
                    ? 'Alleen kijken op deze plattegrond'
                    : (jotformPending ? 'Formulierstatus controleren...' : '')));
    });
}
function hasCurrentFloorplanView() {
    return Boolean(currentCustomer && currentFloorplan && svgContainer.querySelector('svg'));
}
function topbarSelectionMatchesCurrentFloorplan() {
    const { customer, floorplan } = getSelectedFloorplan();
    if (!customer || !floorplan || !currentCustomer || !currentFloorplan)
        return false;
    return customer.customer === currentCustomer && floorplan.name === currentFloorplan;
}
function canUseTopbarFloorplanActions() {
    const { customer, floorplan } = getSelectedFloorplan();
    if (!customer || !floorplan || adminDashboardState.visible || !hasCurrentFloorplanView())
        return false;
    return topbarFloorplanActionsLocked || topbarSelectionMatchesCurrentFloorplan();
}
function restoreTopbarToCurrentFloorplan() {
    if (!currentCustomer || !currentFloorplan)
        return false;
    const customerIndex = customers.findIndex(customer => customer.customer === currentCustomer);
    if (customerIndex < 0)
        return false;
    const floorplanIndex = (customers[customerIndex].floorplans || [])
        .findIndex(floorplan => floorplan.name === currentFloorplan);
    if (floorplanIndex < 0)
        return false;
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    return true;
}
function updateRoleActionButtons() {
    const uploadButton = document.getElementById('btn-upload');
    if (uploadButton)
        uploadButton.style.display = canManageUploads() ? 'block' : 'none';
    if (btnDashboard) {
        btnDashboard.style.display = canUseAdminDashboard() ? 'inline-block' : 'none';
        btnDashboard.classList.toggle('active', adminDashboardState.visible);
        const canReturnToFloorplan = adminDashboardState.visible && hasCurrentFloorplanView();
        btnDashboard.textContent = canReturnToFloorplan ? 'Plattegrond' : 'Dashboard';
        btnDashboard.title = canReturnToFloorplan
            ? 'Terug naar geselecteerde plattegrond'
            : 'Dashboard openen';
        btnDashboard.setAttribute('aria-pressed', adminDashboardState.visible ? 'true' : 'false');
    }
    updateTopbarMetadataButton();
    const canUseFloorplanActions = canUseTopbarFloorplanActions();
    const canEditMarkers = canUseFloorplanActions && canEditMarkersCurrentFloorplan();
    if (btnReset) {
        btnReset.style.display = canUseFloorplanActions ? 'inline-block' : 'none';
        btnReset.disabled = !canUseFloorplanActions;
        btnReset.title = canUseFloorplanActions ? '' : 'Kies eerst een plattegrond';
    }
    if (btnPrintFloorplan) {
        const canPrint = canUseFloorplanActions && appMode.isInteractiveView();
        btnPrintFloorplan.disabled = !canPrint;
        btnPrintFloorplan.title = canPrint ? '' : 'Kies eerst een plattegrond';
    }
    if (btnExportExcel) {
        const exportAllowed = canUseExcelExport();
        const canExport = exportAllowed && canUseFloorplanActions && appMode.isInteractiveView();
        btnExportExcel.style.display = exportAllowed ? 'block' : 'none';
        btnExportExcel.disabled = !canExport;
        btnExportExcel.title = canExport ? '' : 'Kies eerst een plattegrond';
    }
    const editButton = document.getElementById('btn-edit');
    if (editButton) {
        editButton.style.display = canEditMarkers ? 'inline-block' : 'none';
        editButton.disabled = !canEditMarkers;
        editButton.title = canEditMarkers ? '' : (canUseFloorplanActions ? 'Geen markerbewerkingsrechten voor deze plattegrond' : 'Kies eerst een plattegrond');
    }
    applyDoorActionPermissions();
}
function duplicateDoorCodeMessage(err) {
    return FD.DoorCodeConflictService.duplicateDoorCodeMessage(err);
}
function normalizeDoorCodeForIndex(value) {
    return String(value || '').trim().toLocaleLowerCase();
}
function rebuildDoorCodeIndexMap(entries) {
    const byCode = new Map();
    (Array.isArray(entries) ? entries : []).forEach(entry => {
        const code = normalizeDoorCodeForIndex(entry?.code);
        if (!code)
            return;
        if (!byCode.has(code))
            byCode.set(code, []);
        byCode.get(code).push({
            code,
            customer: String(entry.customer || ''),
            floorplan: String(entry.floorplan || ''),
            repo: entry.repo === 'uploads' ? 'uploads' : 'gallery',
            file: String(entry.file || ''),
            doorId: String(entry.doorId || entry.door_id || ''),
        });
    });
    return byCode;
}
function resetDoorCodeIndexState() {
    doorCodeIndexState.requestId += 1;
    doorCodeIndexState = {
        ready: false,
        loading: false,
        entries: [],
        byCode: new Map(),
        requestId: doorCodeIndexState.requestId,
        pending: null,
        error: null,
    };
}
