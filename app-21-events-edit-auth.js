const uploadActionsController = FD.UploadService.createUploadedFloorplanActionsController({
    controls: {
        deleteButton: document.getElementById('btn-delete-fp'),
        editImageButton: btnEditImage,
        metadataButton: btnEditMetadata,
        deleteOverlay: document.getElementById('delete-fp-overlay'),
        deletePopup: document.getElementById('delete-fp-popup'),
        deleteMessage: document.getElementById('delete-fp-message'),
        deleteConfirmButton: document.getElementById('delete-fp-confirm'),
        deleteCancelButton: document.getElementById('delete-fp-cancel'),
    },
    getSelectedFloorplan,
    modeController: appMode,
    isEditMode: isEditModeActive,
    hideTopbarMenu,
    showToast,
    requestTopbarUpdate: () => requestAnimationFrame(updateTopbarHeight),
    onDelete: deleteUploadedFloorplanAndReset,
});
function showMetadataDialog() {
    if (isEditModeActive()) {
        showToast('Sluit eerst de bewerkingsmodus', 'error');
        return;
    }
    if (!appMode.isInteractiveView()) {
        showToast('Sluit eerst het huidige scherm', 'error');
        return;
    }
    if (!canManageUploads()) {
        showToast('Geen rechten om plattegrondgegevens te bewerken', 'error');
        return;
    }
    hideTopbarMenu();
    const { customer, floorplan } = getSelectedFloorplan();
    if (!customer || !floorplan)
        return;
    const parts = FD.SelectSheetService.floorplanDisplayParts(floorplan);
    const locationDetails = getFloorplanLocationDetails(customer, floorplan);
    metadataBuildingInput.value = parts.building;
    metadataFloorLabelInput.value = parts.floorLabel || floorplan.name || '';
    if (metadataLocationStreetInput)
        metadataLocationStreetInput.value = locationDetails?.street || floorplan.locationStreet || '';
    if (metadataLocationPostalCodeInput)
        metadataLocationPostalCodeInput.value = locationDetails?.postalCode || floorplan.locationPostalCode || '';
    if (metadataLocationCityInput)
        metadataLocationCityInput.value = locationDetails?.city || floorplan.locationCity || '';
    if (metadataLocationNoteInput)
        metadataLocationNoteInput.value = locationDetails?.note || '';
    if (metadataLevelOrderInput)
        metadataLevelOrderInput.value = String(floorplan.levelOrder ?? 0);
    if (metadataFloorNotesInput)
        metadataFloorNotesInput.value = floorplan.floorNotes || '';
    metadataFpError.textContent = '';
    metadataFpContext.textContent = `${customer.customer} · technisch: ${floorplan.name}`;
    metadataFpSave.disabled = false;
    metadataFpSave.textContent = 'Opslaan';
    metadataDialog.show();
    setTimeout(() => metadataBuildingInput.focus(), 0);
}
function hideMetadataDialog() {
    metadataDialog.hide();
}
async function saveMetadataDialog() {
    const { customer, floorplan } = getSelectedFloorplan();
    if (!customer || !floorplan)
        return;
    const floorLabel = metadataFloorLabelInput.value.trim();
    const buildingName = metadataBuildingInput.value.trim();
    const locationStreet = metadataLocationStreetInput?.value.trim() || '';
    const locationPostalCode = metadataLocationPostalCodeInput?.value.trim().toUpperCase() || '';
    const locationCity = metadataLocationCityInput?.value.trim() || '';
    const locationNotes = metadataLocationNoteInput?.value.trim() || '';
    const levelOrder = Number(metadataLevelOrderInput?.value);
    const floorNotes = metadataFloorNotesInput?.value.trim() || '';
    if (!floorLabel) {
        metadataFpError.textContent = 'Vul een verdieping of naam in.';
        return;
    }
    if (!buildingName) {
        metadataFpError.textContent = 'Vul een pand in.';
        return;
    }
    if (!Number.isInteger(levelOrder) || levelOrder < -50 || levelOrder > 100) {
        metadataFpError.textContent = 'Niveau moet een geheel getal van -50 t/m 100 zijn.';
        return;
    }
    metadataFpSave.disabled = true;
    metadataFpSave.textContent = 'Opslaan...';
    metadataFpError.textContent = '';
    busyOverlay.show({
        title: 'Gegevens opslaan',
        subtitle: 'Plattegrondnaam wordt bijgewerkt...',
    });
    try {
        const { customers: currentCustomers } = await FD.DataService.updateUploadedFloorplanMetadata(CONFIG, {
            customerName: customer.customer,
            floorplan,
            buildingName,
            floorName: floorLabel,
            locationStreet,
            locationPostalCode,
            locationCity,
            locationNotes,
            levelOrder,
            floorNotes,
        });
        assertStructuredMetadataPersisted(currentCustomers, customer.customer, buildingName, {
            street: locationStreet,
            postalCode: locationPostalCode,
            city: locationCity,
            notes: locationNotes,
        });
        customers = currentCustomers;
        cacheCustomers();
        const nextCustomerIndex = customers.findIndex(item => item.customer === customer.customer);
        populateCustomerDropdown();
        if (nextCustomerIndex >= 0) {
            customerSelect.value = String(nextCustomerIndex);
            populateFloorplanDropdown(nextCustomerIndex);
            const previousRepo = floorplan.repo === 'uploads' ? 'uploads' : 'gallery';
            const nextFloorplanIndex = customers[nextCustomerIndex].floorplans.findIndex(fp => (fp.name === floorplan.name &&
                fp.file === floorplan.file &&
                (fp.repo === 'uploads' ? 'uploads' : 'gallery') === previousRepo));
            if (nextFloorplanIndex >= 0)
                floorplanSelect.value = String(nextFloorplanIndex);
        }
        updatePickerButtons();
        updateDeleteButton();
        hideMetadataDialog();
        showToast('Plattegrondgegevens opgeslagen', 'success');
    }
    catch (err) {
        metadataFpError.textContent = metadataSaveErrorText(err, 'Deze zichtbare naam bestaat al bij deze klant.');
    }
    finally {
        metadataFpSave.disabled = false;
        metadataFpSave.textContent = 'Opslaan';
        busyOverlay.hide();
    }
}
function updateDeleteButton() {
    uploadActionsController.updateButtons();
    const deleteButton = document.getElementById('btn-delete-fp');
    const editImageButton = document.getElementById('btn-edit-image');
    const metadataButton = document.getElementById('btn-edit-fp-metadata');
    if (deleteButton)
        deleteButton.style.display = 'none';
    if (editImageButton)
        editImageButton.style.display = canManageUploads() ? 'inline-block' : 'none';
    if (metadataButton && (!canManageUploads() || !FD.DataService.isFloorplanMetadataWriteEnabled?.(CONFIG))) {
        metadataButton.style.display = 'none';
    }
}
uploadActionsController.bind();
btnEditMetadata?.addEventListener('click', showMetadataDialog);
metadataFpSave?.addEventListener('click', saveMetadataDialog);
metadataFpCancel?.addEventListener('click', hideMetadataDialog);
metadataFpOverlay?.addEventListener('click', hideMetadataDialog);
// ============================================================
// EVENT LISTENERS
// ============================================================
selectionController.bind();
doorInspectorController.bind();
loadingEl?.addEventListener('click', event => {
    const target = event.target instanceof Element
        ? event.target.closest('[data-empty-state-select]')
        : null;
    if (!target)
        return;
    selectionController.open('customer');
});
Object.entries(btnJotforms).forEach(([formType, button]) => {
    button?.addEventListener('click', () => openJotForm(formType));
});
btnReset.addEventListener('click', () => {
    if (topbarFloorplanActionsLocked)
        return;
    resetZoom();
});
btnPanelToggle.addEventListener('click', toggleSidePanel);
btnEdit.addEventListener('click', () => {
    if (topbarFloorplanActionsLocked)
        return;
    enterEditMode();
});
btnPrintFloorplan?.addEventListener('click', printCurrentFloorplanToPdf);
document.getElementById('btn-edit-save').addEventListener('click', saveEditMode);
document.getElementById('btn-auto-number').addEventListener('click', toggleAutoNumbering);
document.getElementById('auto-prefix-input').addEventListener('input', (e) => {
    autoPrefix = e.target.value.trim();
    updateAutoPreview();
});
document.getElementById('auto-padding-select').addEventListener('change', (e) => {
    autoPadding = parseInt(e.target.value, 10);
    updateAutoPreview();
});
FD.EditUIService.createCancelEditController({
    openButtonEl: document.getElementById('btn-edit-cancel'),
    overlayEl: document.getElementById('cancel-edit-overlay'),
    popupEl: document.getElementById('cancel-edit-popup'),
    confirmButtonEl: document.getElementById('cancel-edit-confirm'),
    cancelButtonEl: document.getElementById('cancel-edit-back'),
    hasPendingChanges: () => editChanges.length > 0 || resizingMarker || movingMarker,
    onCancel: cancelEditMode,
}).bind();
editOverlay.addEventListener('click', closeEditPopup);
const markerSlider = document.getElementById('edit-marker-size');
markerSizeSliderController = FD.EditUIService.createMarkerSizeSliderController({
    sliderEl: markerSlider,
    labelEl: document.getElementById('edit-size-label'),
    getMaxValue: () => resizingMarker ? getMaxRadiusAtPosition(resizingMarker.marker) : Infinity,
    onChange: (value) => {
        editMarkerSize = value;
        if (resizingMarker) {
            FD.MarkerService.setMarkerRadius(resizingMarker.marker, value);
        }
    },
});
function updateSliderValue(value) {
    markerSizeSliderController.setValue(value);
}
markerSizeSliderController.bind();
// ============================================================
// QR CODE SCANNER
// ============================================================
qrScannerController = FD.EditUIService.createQrScannerController({
    scanButtonEl: btnScanQr,
    closeButtonEl: document.getElementById('btn-qr-close'),
    overlayEl: document.getElementById('qr-overlay'),
    statusEl: document.getElementById('qr-status'),
    readerId: 'qr-reader',
    onScan: (decodedText) => {
        const activeInput = editPopupController.getActiveInput();
        if (!activeInput)
            return;
        activeInput.value = decodedText.trim();
        activeInput.focus();
    },
});
qrScannerController.bind();
// ============================================================
// LOGIN
// ============================================================
const LOGIN_CONFIG = {
    lockoutMinutes: 10,
    tokenKey: envStorageKey('fd_auth_token'),
    tokenTimeKey: envStorageKey('fd_auth_time'),
    lockoutKey: envStorageKey('fd_lockout'),
    attemptsKey: envStorageKey('fd_attempts'),
    rememberSessionKey: envStorageKey('fd_remember_session'),
    legacyRememberKey: 'fd_remember_pw',
    savedPasswordKey: envStorageKey('fd_saved_password'),
    workerSessionTokenKey: CONFIG.workerSessionTokenKey,
    workerSessionExpiresKey: CONFIG.workerSessionExpiresKey,
    workerSessionUserKey: CONFIG.workerSessionUserKey,
    lastUsernameKey: envStorageKey('fd_login_username'),
    allowLegacyMigration: CONFIG.environment !== 'staging',
};
function showApp() {
    refreshCurrentUserFromWorker();
    appMode.enter(AppModes.VIEW);
    document.getElementById('login-screen').style.display = 'none';
    appContainer.style.display = 'block';
    updateConnectionIndicator();
    updateStatusSyncIndicator();
    startSessionHeartbeat();
    requestAnimationFrame(updateTopbarHeight);
    init();
}
// Menu toggle
topbarMenuController.bind();
btnDashboard?.addEventListener('click', () => {
    if (!canUseAdminDashboard())
        return;
    if (adminDashboardState.visible) {
        if (!returnToCurrentFloorplanFromDashboard()) {
            loadAdminDashboard({ force: true });
        }
    }
    else {
        showAdminDashboard();
    }
});
adminDashboardTabs.forEach(button => {
    button.addEventListener('click', () => {
        setAdminTab(button.dataset.adminTab || 'overview');
        renderAdminDashboard();
    });
});
adminKpiButtons.forEach(button => {
    button.addEventListener('click', () => {
        const metric = button.dataset.adminKpi || 'attention';
        if (!ADMIN_OVERVIEW_METRICS[metric])
            return;
        adminDashboardState.overviewMetric = metric;
        renderAdminDashboard();
    });
});
adminDashboardRefresh?.addEventListener('click', () => loadAdminDashboard({ force: true }));
adminBulkToggle?.addEventListener('click', () => setAdminBulkMode(true));
adminBulkSelectVisible?.addEventListener('click', selectVisibleAdminBulkFloorplans);
adminBulkClear?.addEventListener('click', clearAdminBulkSelection);
adminBulkCancel?.addEventListener('click', () => setAdminBulkMode(false));
adminDashboardSearch?.addEventListener('input', () => {
    adminDashboardState.searchQuery = adminDashboardSearch.value;
    adminDashboardState.selectedKey = '';
    renderAdminDashboard();
});
adminDoorSearch?.addEventListener('input', () => {
    adminDashboardState.doorQuery = adminDoorSearch.value;
    renderAdminDoorResults();
});
adminDoorGroup?.addEventListener('change', () => {
    adminDashboardState.doorOrder = adminDoorGroup.value === 'desc' ? 'desc' : 'asc';
    renderAdminDoorResults();
});
adminDoorCustomerFilter?.addEventListener('change', () => {
    adminDashboardState.doorCustomerFilter = adminDoorCustomerFilter.value || '';
    adminDashboardState.doorFloorplanFilter = '';
    renderAdminDoorResults();
});
adminDoorFloorplanFilter?.addEventListener('change', () => {
    adminDashboardState.doorFloorplanFilter = adminDoorFloorplanFilter.value || '';
    renderAdminDoorResults();
});
adminDetailOpen?.addEventListener('click', () => openAdminFloorplan(getSelectedAdminFloorplan()));
adminDoorDetailOpen?.addEventListener('click', () => {
    const selectedDoor = getSelectedAdminDoor();
    openAdminFloorplan(getSelectedAdminFloorplan(), selectedDoor?.doorId || selectedDoor?.code || '');
});
btnTopbarMetadata?.addEventListener('click', openSelectedTopbarMetadataDialog);
adminDetailSave?.addEventListener('click', saveAdminDetail);
adminDetailDelete?.addEventListener('click', deleteAdminDetailFloorplan);
adminDetailCancel?.addEventListener('click', hideAdminMetadataDialog);
adminMetadataDialogOverlay?.addEventListener('click', hideAdminMetadataDialog);
btnMenuLabels.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLabels();
});
btnMenuMarkerOutline?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMarkerOutlineMode();
});
btnExportExcel?.addEventListener('click', (e) => {
    e.stopPropagation();
    openExportExcelDialog();
});
exportExcelClose?.addEventListener('click', hideExportExcelDialog);
exportExcelOverlay?.addEventListener('click', hideExportExcelDialog);
exportExcelCurrent?.addEventListener('click', exportCurrentFloorplan);
exportExcelSelect?.addEventListener('click', showExportFloorplanSelection);
exportExcelConfirm?.addEventListener('click', exportSelectedFloorplans);
