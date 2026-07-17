function renderAdminFloorplanList() {
    if (!adminFloorplanList)
        return;
    const filtered = getFilteredAdminFloorplans();
    renderAdminBulkControls(filtered);
    if (adminFloorplanCount) {
        const bulkSelected = adminDashboardState.bulkMode ? ` · ${getAdminBulkSelectedRecords().length} geselecteerd` : '';
        adminFloorplanCount.textContent = `${filtered.length} gevonden${bulkSelected}`;
    }
    adminFloorplanList.innerHTML = '';
    if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = adminDashboardState.loading ? 'Dashboard laden...' : 'Geen plattegronden gevonden.';
        adminFloorplanList.appendChild(empty);
        return;
    }
    filtered.forEach(record => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'admin-floorplan-row';
        const key = adminFloorplanKey(record);
        const bulkSelected = adminDashboardState.bulkSelectedKeys.has(key);
        row.classList.toggle('has-bulk-checkbox', adminDashboardState.bulkMode);
        row.classList.toggle('active', !adminDashboardState.bulkMode && key === adminDashboardState.selectedKey);
        row.classList.toggle('is-bulk-selected', bulkSelected);
        if (adminDashboardState.bulkMode) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'admin-bulk-checkbox';
            checkbox.checked = bulkSelected;
            checkbox.tabIndex = -1;
            checkbox.setAttribute('aria-hidden', 'true');
            row.appendChild(checkbox);
        }
        const main = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'admin-floorplan-name';
        name.textContent = record.displayName || record.name || 'Plattegrond';
        const customer = document.createElement('div');
        customer.className = 'admin-floorplan-customer';
        customer.textContent = adminCustomerLabel(record);
        main.append(name, customer);
        const counts = document.createElement('div');
        counts.className = 'admin-floorplan-counts';
        const done = document.createElement('span');
        done.textContent = `${record.done || 0}/${record.doorsTotal || 0} klaar`;
        const attention = document.createElement('span');
        attention.textContent = `${record.attention || 0} aandacht`;
        if (record.attention)
            attention.style.color = COLORS.attention;
        counts.append(done, attention);
        row.append(main, counts);
        row.addEventListener('click', () => {
            if (adminDashboardState.bulkMode) {
                toggleAdminBulkRecord(record);
                return;
            }
            adminDashboardState.selectedKey = adminFloorplanKey(record);
            adminDashboardState.selectedDoorKey = '';
            setAdminTab('details');
            renderAdminDashboard();
        });
        adminFloorplanList.appendChild(row);
    });
}
function setAdminSelectOptions(select, options, value) {
    if (!select)
        return;
    select.innerHTML = '';
    options.forEach(optionData => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        select.appendChild(option);
    });
    select.value = options.some(option => option.value === value) ? value : '';
}
function renderAdminDoorFilterOptions(allDoors) {
    if (adminDoorGroup)
        adminDoorGroup.value = adminDashboardState.doorOrder === 'desc' ? 'desc' : '';
    const customerOptions = getAdminCustomerOptions()
        .filter(option => allDoors.some(door => adminTenantKey(door) === option.value));
    if (adminDashboardState.doorCustomerFilter && !customerOptions.some(option => option.value === adminDashboardState.doorCustomerFilter)) {
        adminDashboardState.doorCustomerFilter = '';
        adminDashboardState.doorFloorplanFilter = '';
    }
    setAdminSelectOptions(adminDoorCustomerFilter, [
        { value: '', label: 'Alle klanten' },
        ...customerOptions,
    ], adminDashboardState.doorCustomerFilter);
    const floorplanOptions = [];
    const floorplanSeen = new Set();
    if (adminDashboardState.doorCustomerFilter) {
        allDoors
            .filter(door => adminTenantKey(door) === adminDashboardState.doorCustomerFilter)
            .forEach(door => {
            const key = adminDoorFloorplanFilterKey(door);
            if (!key || floorplanSeen.has(key))
                return;
            floorplanSeen.add(key);
            floorplanOptions.push({
                value: key,
                label: adminDoorFloorplanLabel(door) || door.floorplan || 'Plattegrond',
            });
        });
    }
    floorplanOptions.sort((a, b) => ADMIN_COLLATOR.compare(a.label, b.label));
    if (!adminDashboardState.doorCustomerFilter || !floorplanSeen.has(adminDashboardState.doorFloorplanFilter)) {
        adminDashboardState.doorFloorplanFilter = '';
    }
    setAdminSelectOptions(adminDoorFloorplanFilter, [
        { value: '', label: adminDashboardState.doorCustomerFilter ? 'Alle plattegronden' : 'Kies eerst een klant' },
        ...floorplanOptions,
    ], adminDashboardState.doorFloorplanFilter);
    if (adminDoorFloorplanFilter) {
        adminDoorFloorplanFilter.disabled = !adminDashboardState.doorCustomerFilter;
    }
}
function compareAdminDoors(left, right) {
    const leftCode = adminDoorCodeLabel(left);
    const rightCode = adminDoorCodeLabel(right);
    const leftFloorplan = adminDoorFloorplanLabel(left);
    const rightFloorplan = adminDoorFloorplanLabel(right);
    const byCode = () => ADMIN_COLLATOR.compare(leftCode, rightCode);
    const byCustomer = () => ADMIN_COLLATOR.compare(left.customer || '', right.customer || '');
    const byFloorplan = () => ADMIN_COLLATOR.compare(leftFloorplan, rightFloorplan);
    const direction = adminDashboardState.doorOrder === 'desc' ? -1 : 1;
    return (byCode() * direction) || byCustomer() || byFloorplan();
}
function renderAdminDoorResults() {
    if (!adminDoorResults)
        return;
    const query = adminNormalizeSearch(adminDashboardState.doorQuery);
    adminDoorResults.innerHTML = '';
    const allDoors = (getAdminData().doors || [])
        .filter(door => adminDoorCodeLabel(door))
        .slice();
    renderAdminDoorFilterOptions(allDoors);
    allDoors.sort(compareAdminDoors);
    if (!allDoors.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = adminDashboardState.loading ? 'Dashboard laden...' : 'Geen deurcodes gevonden.';
        adminDoorResults.appendChild(empty);
        return;
    }
    const results = allDoors.filter(door => {
        if (adminDashboardState.doorCustomerFilter && adminTenantKey(door) !== adminDashboardState.doorCustomerFilter)
            return false;
        if (adminDashboardState.doorFloorplanFilter && adminDoorFloorplanFilterKey(door) !== adminDashboardState.doorFloorplanFilter)
            return false;
        if (query && !adminDoorCodeLabel(door).toLowerCase().includes(query))
            return false;
        return true;
    });
    const summary = document.createElement('div');
    summary.className = 'admin-door-results-summary';
    const scope = adminDashboardState.doorFloorplanFilter
        ? 'op geselecteerde plattegrond'
        : (adminDashboardState.doorCustomerFilter
            ? `bij ${getAdminCustomerOptions().find(option => option.value === adminDashboardState.doorCustomerFilter)?.label || 'klant'}`
            : 'in alle klanten');
    summary.textContent = `${results.length} deurcode${results.length === 1 ? '' : 's'} ${scope}`;
    adminDoorResults.appendChild(summary);
    if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'admin-dashboard-empty';
        empty.textContent = 'Geen deur gevonden.';
        adminDoorResults.appendChild(empty);
        return;
    }
    results.forEach(door => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'admin-door-result';
        const code = document.createElement('div');
        code.className = 'admin-door-code';
        const dot = document.createElement('span');
        dot.className = 'admin-status-dot';
        dot.style.background = adminDoorColor(door);
        const label = document.createElement('span');
        label.textContent = adminDoorCodeLabel(door);
        code.append(dot, label);
        const meta = document.createElement('div');
        meta.className = 'admin-row-meta';
        meta.textContent = `${adminCustomerLabel(door)} · ${door.floorplanDisplayName || door.floorplan}`;
        item.append(code, meta);
        item.addEventListener('click', () => {
            adminDashboardState.selectedCustomer = '';
            adminDashboardState.selectedLocation = '';
            adminDashboardState.selectedKey = adminFloorplanKey(door);
            adminDashboardState.selectedDoorKey = adminDoorKey(door);
            adminDashboardState.bulkMode = false;
            adminDashboardState.bulkSelectedKeys.clear();
            setAdminTab('details');
            renderAdminDashboard();
        });
        adminDoorResults.appendChild(item);
    });
}
function renderAdminCustomerSelect(record) {
    if (!adminDetailCustomer)
        return;
    adminDetailCustomer.innerHTML = '';
    getAdminCustomerOptions().forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        adminDetailCustomer.appendChild(option);
    });
    adminDetailCustomer.value = adminTenantKey(record);
}
function resetAdminPreview(message = 'Preview laden na selectie') {
    adminDashboardState.previewRequestId += 1;
    adminDashboardState.previewKey = '';
    if (adminDetailPreview) {
        adminDetailPreview.textContent = message;
    }
}
function getActiveAdminMetadataRecord() {
    return adminDashboardState.metadataRecord || getSelectedAdminFloorplan();
}
function selectTopbarFloorplanRecord(record) {
    if (!record) {
        updatePickerButtons();
        return false;
    }
    const { customerIndex, floorplanIndex } = findFloorplanSelectionForAdminRecord(record);
    if (customerIndex < 0 || floorplanIndex < 0) {
        updatePickerButtons();
        return false;
    }
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    return true;
}
function getAdminRecordLocationDetails(record) {
    const customer = (getAdminData().customers || customers || [])
        .find(item => adminSameTenant(item, record));
    const details = getFloorplanLocationDetails(customer, {
        building: record?.building || '',
    });
    return {
        street: String(record?.locationStreet || details?.street || record?.locationAddress || '').trim(),
        postalCode: String(record?.locationPostalCode || details?.postalCode || '').trim(),
        city: String(record?.locationCity || details?.city || '').trim(),
        notes: String(record?.locationNotes || details?.notes || record?.locationNote || '').trim(),
    };
}
function renderAdminMetadataForm(record) {
    if (!record)
        return;
    const locationDetails = getAdminRecordLocationDetails(record);
    renderAdminCustomerSelect(record);
    if (adminDetailBuilding)
        adminDetailBuilding.value = record.building || '';
    if (adminDetailFloorLabel)
        adminDetailFloorLabel.value = record.floorLabel || record.displayName || record.name || '';
    if (adminDetailLocationStreet)
        adminDetailLocationStreet.value = locationDetails.street;
    if (adminDetailLocationPostalCode)
        adminDetailLocationPostalCode.value = locationDetails.postalCode;
    if (adminDetailLocationCity)
        adminDetailLocationCity.value = locationDetails.city;
    if (adminDetailLocationNote)
        adminDetailLocationNote.value = locationDetails.notes;
    if (adminDetailLevelOrder)
        adminDetailLevelOrder.value = String(record.levelOrder ?? 0);
    if (adminDetailFloorNotes)
        adminDetailFloorNotes.value = record.floorNotes || '';
    if (adminDetailError)
        adminDetailError.textContent = '';
    if (adminDetailDelete) {
        const canDelete = record.repo === 'uploads' || record.uploadedByApp || record.uploaded;
        adminDetailDelete.disabled = !canDelete;
        adminDetailDelete.textContent = canDelete ? 'Plattegrond verwijderen' : 'Gallery-plattegrond kan niet verwijderd worden';
    }
    if (adminMetadataDialogContext) {
        const repoLabel = record.repo === 'uploads' ? 'upload' : 'gallery';
        adminMetadataDialogContext.textContent = `${record.customer} · ${record.displayName || record.name} · ${repoLabel}`;
    }
}
function openAdminMetadataDialog(record) {
    if (!record || !isAdminUser())
        return;
    adminDashboardState.metadataRecord = record;
    adminDashboardState.selectedKey = adminFloorplanKey(record);
    adminDashboardState.selectedDoorKey = '';
    renderAdminMetadataForm(record);
    if (adminMetadataDialogOverlay)
        adminMetadataDialogOverlay.hidden = false;
    if (adminMetadataDialog)
        adminMetadataDialog.hidden = false;
    requestAnimationFrame(() => adminDetailBuilding?.focus());
}
function hideAdminMetadataDialog() {
    if (adminMetadataDialogOverlay)
        adminMetadataDialogOverlay.hidden = true;
    if (adminMetadataDialog)
        adminMetadataDialog.hidden = true;
    if (adminDetailError)
        adminDetailError.textContent = '';
    adminDashboardState.metadataRecord = null;
}
