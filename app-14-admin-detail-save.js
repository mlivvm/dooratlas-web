async function saveAdminDetail() {
    const record = getActiveAdminMetadataRecord();
    if (!record)
        return;
    const nextCustomerName = record.customer;
    const buildingName = adminDetailBuilding?.value.trim() || '';
    const floorLabel = adminDetailFloorLabel?.value.trim() || '';
    const locationStreet = adminDetailLocationStreet?.value.trim() || '';
    const locationPostalCode = adminDetailLocationPostalCode?.value.trim().toUpperCase() || '';
    const locationCity = adminDetailLocationCity?.value.trim() || '';
    const locationNotes = adminDetailLocationNote?.value.trim() || '';
    const levelOrder = Number(adminDetailLevelOrder?.value);
    const floorNotes = adminDetailFloorNotes?.value.trim() || '';
    const editingCurrentFloorplan = currentCustomer === record.customer && currentFloorplan === record.name;
    if (!floorLabel) {
        if (adminDetailError)
            adminDetailError.textContent = 'Vul een verdieping of naam in.';
        return;
    }
    if (!buildingName) {
        if (adminDetailError)
            adminDetailError.textContent = 'Vul een pand in.';
        return;
    }
    if (!Number.isInteger(levelOrder) || levelOrder < -50 || levelOrder > 100) {
        if (adminDetailError)
            adminDetailError.textContent = 'Niveau moet een geheel getal van -50 t/m 100 zijn.';
        return;
    }
    if (adminDetailSave) {
        adminDetailSave.disabled = true;
        adminDetailSave.textContent = 'Opslaan...';
    }
    if (adminDetailError)
        adminDetailError.textContent = '';
    busyOverlay.show({
        title: 'Gegevens opslaan',
        subtitle: nextCustomerName !== record.customer ? 'Plattegrond wordt verplaatst...' : 'Plattegrondgegevens worden bijgewerkt...',
    });
    try {
        const result = await FD.DataService.updateFloorplanRecord(CONFIG, {
            customerName: record.customer,
            floorplanName: record.name,
            repo: record.repo,
            fileName: record.file,
            nextCustomerName,
            buildingName,
            floorName: floorLabel,
            locationStreet,
            locationPostalCode,
            locationCity,
            locationNotes,
            levelOrder,
            floorNotes,
        });
        assertStructuredMetadataPersisted(result.customers, nextCustomerName, buildingName, {
            street: locationStreet,
            postalCode: locationPostalCode,
            city: locationCity,
            notes: locationNotes,
        });
        if (Array.isArray(result.customers)) {
            customers = result.customers;
            cacheCustomers();
            populateCustomerDropdown();
        }
        if (result.status) {
            doorStatus = result.status;
            FD.StatusService.cacheDoorStatus(doorStatus);
        }
        const nextRecord = result.record || {
            customer: nextCustomerName,
            name: record.name,
            displayName: buildingName ? `${buildingName} - ${floorLabel}` : floorLabel,
            building: buildingName,
            floorLabel,
            levelOrder,
            floorNotes,
            locationStreet,
            locationPostalCode,
            locationCity,
            locationNotes,
            locationAddress: locationStreet,
            locationNote: locationNotes,
            repo: record.repo,
            file: record.file,
            uploaded: record.uploaded,
        };
        if (editingCurrentFloorplan) {
            currentCustomer = nextCustomerName;
            updateStatusBar();
            refreshAllDoorColors();
        }
        selectTopbarFloorplanRecord(nextRecord);
        adminDashboardState.selectedCustomer = adminTenantKey(nextRecord);
        adminDashboardState.selectedLocation = '';
        adminDashboardState.selectedKey = adminFloorplanKey(nextRecord);
        adminDashboardState.previewKey = '';
        await loadAdminDashboard({ force: true });
        hideAdminMetadataDialog();
        showToast('Plattegrondgegevens opgeslagen', 'success');
    }
    catch (err) {
        if (adminDetailError) {
            adminDetailError.textContent = metadataSaveErrorText(err, 'Deze klant heeft al een plattegrond met deze naam of dit bestand.');
        }
    }
    finally {
        if (adminDetailSave) {
            adminDetailSave.disabled = false;
            adminDetailSave.textContent = 'Gegevens opslaan';
        }
        busyOverlay.hide();
    }
}
function floorplanIdentityMatches(floorplan, target) {
    if (!floorplan || !target)
        return false;
    return floorplan.name === target.name &&
        floorplan.file === target.file &&
        (floorplan.repo === 'uploads' ? 'uploads' : 'gallery') === (target.repo === 'uploads' ? 'uploads' : 'gallery');
}
function adminRecordToUploadedFloorplanTarget(record) {
    const customer = customers.find(item => adminSameTenant(item, record)) || {
        customer: record.customer,
        floorplans: [],
    };
    const floorplan = (customer.floorplans || []).find(fp => floorplanIdentityMatches(fp, record)) || {
        name: record.name,
        file: record.file,
        repo: record.repo === 'uploads' ? 'uploads' : 'gallery',
        uploaded: true,
        uploadedByApp: Boolean(record.uploadedByApp || record.uploaded || record.repo === 'uploads'),
        building: record.building || '',
        floorLabel: record.floorLabel || '',
    };
    return { customer, floorplan };
}
async function deleteAdminDetailFloorplan() {
    const record = getActiveAdminMetadataRecord();
    if (!record)
        return;
    if (!(record.repo === 'uploads' || record.uploadedByApp || record.uploaded)) {
        showToast('Gallery-plattegronden kunnen niet vanuit het dashboard verwijderd worden', 'error');
        return;
    }
    hideAdminMetadataDialog();
    uploadActionsController.showDeleteConfirm(adminRecordToUploadedFloorplanTarget(record));
}
const selectionController = FD.SelectSheetService.createSelectionController({
    elements: {
        customerSelect,
        floorplanSelect,
        customerPickerBtn,
        floorplanPickerBtn,
        customerPickerValue,
        floorplanPickerValue,
        floorplanPickerMeta,
        desktopContextPickerBtn,
        desktopContextCustomerValue,
        desktopContextFloorplanValue,
        overlay: selectSheetOverlay,
        sheet: selectSheet,
        eyebrow: selectSheetEyebrow,
        title: selectSheetTitle,
        search: selectSheetSearch,
        filters: selectSheetLocationFilters,
        list: selectSheetList,
        closeButton: selectSheetClose,
    },
    getState: () => ({ customersLoading }),
    getItems: getSelectSheetItems,
    getFilters: getSelectSheetFilters,
    getFilterGroups: getSelectSheetFilterGroups,
    getFilterLabel: getSelectSheetFilterLabel,
    getFilterValue: getSelectSheetFilterValue,
    getPickerMeta: getSelectSheetPickerMeta,
    onFilterChange: handleSelectSheetFilterChange,
    onCustomerChange: ({ value }) => {
        topbarFloorplanLocationFilter = '';
        if (isEditModeActive())
            exitEditMode();
        if (adminDashboardState.visible) {
            if (value === '') {
                resetFloorplanDropdown(true);
            }
            else {
                populateFloorplanDropdown(parseInt(value, 10));
            }
            updateRoleActionButtons();
            return;
        }
        resetFloorplanUI();
        currentCustomer = null;
        currentFloorplan = null;
        updateDeleteButton();
        updatePickerButtons();
        if (value === '') {
            resetFloorplanDropdown(true);
            setEmptyState('Kies een klant en plattegrond<br>om te beginnen.');
            loadingEl.classList.remove('hidden');
            return;
        }
        setEmptyState('Kies een plattegrond<br>uit het dropdown menu.');
        loadingEl.classList.remove('hidden');
        populateFloorplanDropdown(parseInt(value, 10));
    },
    onFloorplanChange: () => {
        updatePickerButtons();
        const { customerIndex, floorplanIndex, floorplan } = getSelectedFloorplan();
        if (customerIndex === null || floorplanIndex === null || !floorplan) {
            if (isEditModeActive())
                exitEditMode();
            resetFloorplanUI();
            currentCustomer = null;
            currentFloorplan = null;
            setEmptyState('Kies een plattegrond<br>uit het dropdown menu.');
            loadingEl.classList.remove('hidden');
            updateDeleteButton();
            updateRoleActionButtons();
            return;
        }
        if (adminDashboardState.visible)
            hideAdminDashboard();
        loadFloorplan(customerIndex, floorplanIndex);
    },
});
function updatePickerButtons() {
    selectionController.updatePickerButtons();
    updateTopbarMetadataButton();
    requestAnimationFrame(updateTopbarHeight);
}
function renderSelectSheetItems() {
    selectionController.renderItems();
}
function closeSelectSheet() {
    selectionController.close();
}
const sidePanelController = FD.SidePanelService.createController({
    elements: {
        panelEl: sidePanel,
        listEl: sidePanelList,
        headerEl: sidePanelHeader,
    },
    getDoorIds: () => FD.MarkerService.allMarkers(svgContainer).map(marker => marker.dataset.doorId),
    getSelectedDoor: () => selectedDoor,
    getDoorStatus: doorId => getDoorStatus(doorId),
    getDoorCondition: doorId => getDoorCondition(doorId),
    getDoorLabel: doorId => getDoorLabel(doorId),
    colors: { done: COLORS.done, todo: COLORS.todo, attention: COLORS.attention, checking: COLORS.checking },
    onSelect: doorId => selectDoor(doorId),
    setShellOpen: (open) => FD.UIShellService.setSidePanelOpen({
        sidePanelEl: sidePanel,
        toggleButtonEl: btnPanelToggle,
        appContainerEl: appContainer,
        open,
    }),
});
const doorInspectorController = FD.DoorInspectorService.createController({
    elements: {
        listView: sidePanelListView,
        inspectorView: doorInspectorView,
        backButton: doorInspectorBack,
        code: doorInspectorCode,
        name: doorInspectorName,
        meta: doorInspectorMeta,
        status: doorInspectorStatus,
        latest: doorInspectorLatest,
        actions: doorInspectorActions,
        tabs: doorInspectorTabs,
        history: doorInspectorHistory,
        historyCount: doorInspectorHistoryCount,
        historyList: doorInspectorHistoryList,
        body: doorInspectorBody,
    },
    getDoor: doorKey => {
        const details = getDoorDetails(doorKey);
        const { customer, floorplan } = getSelectedFloorplan();
        return details?.id ? {
            ...details,
            customer: customer?.customer || currentCustomer || '',
            building: floorplan?.building || '',
            floorLabel: floorplan?.floorLabel || floorplan?.displayName || '',
            isDone: getDoorStatus(doorKey),
            condition: getDoorCondition(doorKey),
        } : null;
    },
    loadInspections: (doorId, options) => FD.DataService.loadDoorInspections(CONFIG, doorId, options),
    photoUrl: photoId => FD.DataService.inspectionPhotoUrl(CONFIG, photoId),
    openForm: (formType, inspection) => openJotForm(formType, inspection),
    deselectDoor: () => deselectDoor(),
    canOpenForm: formType => {
        const button = btnJotforms[formType];
        return Boolean(button &&
            !button.classList.contains('disabled') &&
            button.dataset.jotformUnavailable !== '1' &&
            button.dataset.jotformLocked !== '1');
    },
});
doorActionController = FD.DoorActionService.createController({
    elements: {
        doorNameEl,
        doorStatusEl,
        doorMetaEl,
        btnJotform,
        btnJotforms,
        btnClose,
        btnDone,
    },
    config: {
        baseUrl: CONFIG.jotformBaseUrl,
        formId: CONFIG.jotformFormId,
        forms: CONFIG.jotformForms,
    },
    colors: { done: COLORS.done, todo: COLORS.todo, attention: COLORS.attention, checking: COLORS.checking },
    getState: () => {
        const selection = getSelectedFloorplan();
        return {
            selectedDoor,
            currentCustomer: selection.customer || currentCustomer,
            currentFloorplan: selection.floorplan || currentFloorplan,
            online: navigator.onLine,
        };
    },
    setSelectedDoor: (doorId) => { selectedDoor = doorId; },
    getDoorStatus: doorId => getDoorStatus(doorId),
    getDoorCondition: doorId => getDoorCondition(doorId),
    getDoorDetails: doorId => getDoorDetails(doorId),
    refreshAllDoorColors: () => refreshAllDoorColors(),
    scrollToDoor: (doorId) => sidePanelController.scrollToDoor(doorId),
    showToast,
    openWindow: (url, target) => window.open(url, target),
    onBeforeOpenJotForm: saveJotFormReturnContext,
    getJotFormButtonState: getJotFormButtonStateForDoor,
    findJotFormSubmission: isJotFormLookupEnabled() ? (({ selectedDoor, currentCustomer, currentFloorplan, formType = 'maintenance' }) => {
        const type = normalizeJotFormFormType(formType);
        const cached = getCachedJotFormSubmission(selectedDoor, type);
        if (cached?.editUrl) {
            return Promise.resolve({ ok: true, found: true, formType: type, editUrl: cached.editUrl });
        }
        const target = {
            customer: currentCustomer.customer || currentCustomer,
            floorplan: currentFloorplan.name || currentFloorplan,
            repo: currentFloorplan.repo === 'uploads' ? 'uploads' : 'gallery',
            file: currentFloorplan.file,
            doorId: selectedDoor,
            formType: type,
        };
        return FD.DataService.findJotFormSubmission(CONFIG, target, {
            diagnostics: {
                purpose: 'jotform_submission_lookup',
            },
        });
    }) : null,
    prepareJotFormContext: ({ selectedDoor, currentCustomer, currentFloorplan, formType = 'maintenance' }) => {
        if (!isJotFormLookupEnabled())
            return Promise.resolve(null);
        return FD.DataService.createJotFormContext(CONFIG, {
            customer: currentCustomer.customer || currentCustomer,
            floorplan: currentFloorplan.name || currentFloorplan,
            repo: currentFloorplan.repo === 'uploads' ? 'uploads' : 'gallery',
            file: currentFloorplan.file,
            doorId: selectedDoor,
            formType: normalizeJotFormFormType(formType),
        });
    },
});
