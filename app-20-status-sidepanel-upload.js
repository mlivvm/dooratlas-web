svgContainer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const center = getTouchCenter(e.touches);
        const containerRect = svgContainer.getBoundingClientRect();
        const newScale = initialScale * (dist / initialPinchDist);
        const clampedScale = Math.max(0.02, Math.min(10, newScale));
        const cx = center.x - containerRect.left;
        const cy = center.y - containerRect.top;
        const nextView = FD.ViewportService.zoomAtPoint({
            pointX: cx,
            pointY: cy,
            panX,
            panY,
            scale,
            nextScale: clampedScale,
        });
        panX = nextView.panX;
        panY = nextView.panY;
        scale = nextView.scale;
        scheduleTransform();
        if (showLabels)
            scheduleEditLabelsUpdate();
    }
}, { passive: false });
svgContainer.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && wasMultiTouch) {
        if (multiTouchTimer)
            clearTimeout(multiTouchTimer);
        multiTouchTimer = setTimeout(() => { wasMultiTouch = false; }, 400);
    }
});
// Mouse wheel zoom
svgContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const containerRect = svgContainer.getBoundingClientRect();
    const cx = e.clientX - containerRect.left;
    const cy = e.clientY - containerRect.top;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.02, Math.min(10, scale * zoomFactor));
    const nextView = FD.ViewportService.zoomAtPoint({
        pointX: cx,
        pointY: cy,
        panX,
        panY,
        scale,
        nextScale: newScale,
    });
    panX = nextView.panX;
    panY = nextView.panY;
    scale = nextView.scale;
    scheduleTransform();
    if (showLabels)
        scheduleEditLabelsUpdate();
}, { passive: false });
// ============================================================
// STATUS POLLING
// ============================================================
function startPolling() {
    statusController.startPolling();
}
function stopPolling() {
    clearJotFormReturnFastRefresh();
    statusController.stopPolling();
}
function updateStatusBar() {
    const markers = svgContainer.querySelectorAll('[data-door-id]');
    if (markers.length === 0) {
        statusCount.textContent = '';
        return;
    }
    let done = 0;
    let attention = 0;
    markers.forEach(m => {
        const isDone = getDoorStatus(m.dataset.doorId);
        if (isDone)
            done++;
        if (isDone && getDoorCondition(m.dataset.doorId) === 'attention')
            attention++;
    });
    statusCount.textContent = `${done} / ${markers.length} deuren afgerond${attention ? `, ${attention} aandacht nodig` : ''}`;
}
// ============================================================
// SIDE PANEL
// ============================================================
function toggleSidePanel() {
    setSidePanelUserOpen(!sidePanel.classList.contains('open'));
}
function populateSidePanel() {
    sidePanelController.render();
}
function refreshSidePanel() {
    sidePanelController.refresh();
    doorInspectorController.refresh();
}
// ============================================================
// UPLOAD FLOORPLAN
// ============================================================
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
const uploadController = FD.UploadService.createUploadController({
    elements: {
        imageState: { dataUrl: null, svgText: null, previewObjectUrl: null, width: 0, height: 0 },
        stepChoose: document.getElementById('upload-step-choose'), stepPreview: document.getElementById('upload-step-preview'),
        stepForm: document.getElementById('upload-step-form'),
        stepMetadata: document.getElementById('upload-step-metadata'),
        stepPdf: document.getElementById('upload-step-pdf'),
        previewImg: document.getElementById('upload-preview-img'),
        previewContext: document.getElementById('upload-preview-context'),
        singlePreviewButton: document.getElementById('upload-single-preview-button'),
        metadataPreviewButton: document.getElementById('upload-metadata-preview-button'),
        metadataPreviewImg: document.getElementById('upload-metadata-preview-img'),
        metadataContext: document.getElementById('upload-metadata-context'),
        metadataErrorEl: document.getElementById('upload-metadata-error'),
        previewTitle: document.querySelector('#upload-step-preview h3'),
        previewRetakeBtn: document.getElementById('btn-upload-retake'),
        previewAcceptBtn: document.getElementById('btn-upload-accept'),
        customerSelect: document.getElementById('upload-customer-select'),
        customerSearchInput: document.getElementById('upload-customer-search'),
        customerComboboxTrigger: document.getElementById('btn-upload-customer-options'), customerComboboxLabel: document.getElementById('upload-customer-label'),
        customerComboboxDropdown: document.getElementById('upload-customer-dropdown'), customerComboboxOptions: document.getElementById('upload-customer-options'),
        newCustomerButton: document.getElementById('btn-upload-new-customer'),
        newCustomerWrapper: document.getElementById('upload-new-customer-wrapper'),
        newCustomerInput: document.getElementById('upload-new-customer'),
        newCustomerShortNameInput: document.getElementById('upload-new-customer-short-name'),
        newCustomerNotesInput: document.getElementById('upload-new-customer-notes'),
        createCustomerButton: document.getElementById('btn-upload-create-customer'),
        locationSearchInput: document.getElementById('upload-location-search'),
        locationSelect: document.getElementById('upload-location-select'),
        locationComboboxTrigger: document.getElementById('btn-upload-location-options'), locationComboboxLabel: document.getElementById('upload-location-label'),
        locationComboboxDropdown: document.getElementById('upload-location-dropdown'), locationComboboxOptions: document.getElementById('upload-location-options'),
        newLocationButton: document.getElementById('btn-upload-new-location'),
        newLocationWrapper: document.getElementById('upload-new-location-wrapper'),
        locationNameInput: document.getElementById('upload-location-name'),
        locationStreetInput: document.getElementById('upload-location-street'),
        locationPostalCodeInput: document.getElementById('upload-location-postal-code'),
        locationCityInput: document.getElementById('upload-location-city'),
        locationNotesInput: document.getElementById('upload-location-notes'),
        wizardCustomer: document.getElementById('upload-wizard-customer'),
        wizardLocation: document.getElementById('upload-wizard-location'),
        wizardFile: document.getElementById('upload-wizard-file'),
        wizardTitle: document.getElementById('upload-wizard-title'),
        wizardProgress: Array.from(document.querySelectorAll('[data-upload-progress]')),
        wizardBack: document.getElementById('btn-upload-wizard-back'),
        wizardNext: document.getElementById('btn-upload-wizard-next'),
        createLocationButton: document.getElementById('btn-upload-create-location'),
        cancelLocationButton: document.getElementById('btn-upload-cancel-location'),
        floorplanNameInput: document.getElementById('upload-floorplan-name'),
        levelOrderInput: document.getElementById('upload-level-order'),
        floorNotesInput: document.getElementById('upload-floor-notes'),
        selectedFileEl: document.getElementById('upload-selected-file'),
        sourceList: document.getElementById('upload-source-list'), pdfSourceList: document.getElementById('upload-pdf-source-list'),
        errorEl: document.getElementById('upload-error'),
        pdfState: { pages: [] },
        pdfTitle: document.getElementById('upload-pdf-title'),
        pdfSummary: document.getElementById('upload-pdf-summary'),
        pdfProcessing: document.getElementById('upload-pdf-processing'),
        pdfOverview: document.getElementById('upload-pdf-overview'),
        pdfEditor: document.getElementById('upload-pdf-editor'),
        pdfForm: document.getElementById('upload-pdf-form'),
        pdfPages: document.getElementById('upload-pdf-pages'),
        pdfCount: document.getElementById('upload-pdf-count'),
        pdfNextButton: document.getElementById('btn-upload-pdf-next'),
        pdfEditorTitle: document.getElementById('upload-pdf-editor-title'),
        pdfEditorImg: document.getElementById('upload-pdf-editor-img'),
        pdfEditorLoading: document.getElementById('upload-pdf-editor-loading'),
        pdfEditorSaveButton: document.getElementById('btn-upload-pdf-editor-save'),
        pdfZoomOutButton: document.getElementById('btn-upload-pdf-zoom-out'),
        pdfZoomFitButton: document.getElementById('btn-upload-pdf-zoom-fit'),
        pdfZoomInButton: document.getElementById('btn-upload-pdf-zoom-in'),
        pdfContext: document.getElementById('upload-pdf-context'),
        pdfNamesList: document.getElementById('upload-pdf-names-list'),
        pdfProgress: document.getElementById('upload-pdf-progress'),
        pdfProgressBar: document.getElementById('upload-pdf-progress-bar'),
        pdfProgressText: document.getElementById('upload-pdf-progress-text'),
        pdfErrorEl: document.getElementById('upload-pdf-error'),
    },
    controls: {
        overlay: document.getElementById('upload-overlay'),
        popup: document.getElementById('upload-popup'),
        fileInput: document.getElementById('upload-file-input'),
        openButton: document.getElementById('btn-upload'),
        fileButton: document.getElementById('btn-upload-file'),
        addFilesButton: document.getElementById('btn-upload-add-files'),
        cancelChooseButton: document.getElementById('btn-upload-cancel-1'),
        retakeButton: document.getElementById('btn-upload-retake'),
        acceptButton: document.getElementById('btn-upload-accept'),
        metadataBackButton: document.getElementById('btn-upload-metadata-back'),
        saveButton: document.getElementById('btn-upload-save'),
        cancelFormButton: document.getElementById('btn-upload-cancel-3'),
        cancelOverlay: document.getElementById('upload-cancel-overlay'), cancelPopup: document.getElementById('upload-cancel-popup'),
        cancelStayButton: document.getElementById('btn-upload-cancel-stay'), cancelConfirmButton: document.getElementById('btn-upload-cancel-confirm'),
        backToSelectButton: document.getElementById('btn-back-to-select'),
        pdfCloseButton: document.getElementById('btn-upload-pdf-close'),
        pdfRetakeButton: document.getElementById('btn-upload-pdf-retake'),
        pdfSelectAllButton: document.getElementById('btn-upload-pdf-select-all'),
        pdfSelectNoneButton: document.getElementById('btn-upload-pdf-select-none'),
        pdfNextButton: document.getElementById('btn-upload-pdf-next'),
        pdfFormBackButton: document.getElementById('btn-upload-pdf-form-back'),
        pdfEditorBackButton: document.getElementById('btn-upload-pdf-editor-back'),
        pdfEditorCancelButton: document.getElementById('btn-upload-pdf-editor-cancel'),
        pdfEditorSaveButton: document.getElementById('btn-upload-pdf-editor-save'),
        pdfZoomOutButton: document.getElementById('btn-upload-pdf-zoom-out'),
        pdfZoomFitButton: document.getElementById('btn-upload-pdf-zoom-fit'),
        pdfZoomInButton: document.getElementById('btn-upload-pdf-zoom-in'),
        pdfRotateLeftButton: document.getElementById('btn-upload-pdf-rotate-left'),
        pdfRotateRightButton: document.getElementById('btn-upload-pdf-rotate-right'),
        pdfBackToSelectButton: document.getElementById('btn-upload-pdf-back-to-select'),
        pdfSaveButton: document.getElementById('btn-upload-pdf-save'),
        fullscreenImage: document.getElementById('img-fullscreen-img'),
        fullscreenOverlay: document.getElementById('img-fullscreen-overlay'),
        fullscreenCloseButton: document.getElementById('img-fullscreen-close'),
    },
    getCustomers: () => customers,
    getCurrentUser: () => currentUser,
    modeController: appMode,
    modes: AppModes,
    isEditMode: isEditModeActive,
    hideTopbarMenu,
    showToast,
    getPdfJsLib: () => window.pdfjsLib,
    ensureSession: () => ensureActiveSession({
        purpose: 'upload_preflight',
        background: false,
    }),
    onCreateTenant: async (body) => {
        const tenant = await FD.DataService.createTenant(CONFIG, body);
        customers = await FD.DataService.loadCustomers(CONFIG);
        cacheCustomers();
        populateCustomerDropdown();
        return { tenant };
    },
    onListLocations: tenantId => FD.DataService.listLocations(CONFIG, tenantId),
    onCreateLocation: body => FD.DataService.createLocation(CONFIG, body),
    onSave: async ({ form, fileName, svgText }) => {
        const result = await FD.DataService.addUploadedFloorplan(CONFIG, {
            tenantId: form.tenantId,
            locationId: form.locationId,
            customerName: form.customerName,
            floorName: form.floorName || form.floorLabel,
            floorplanName: form.floorplanName,
            floorLabel: form.floorLabel,
            levelOrder: form.levelOrder,
            floorNotes: form.floorNotes,
            fileName,
            svgText,
        });
        const currentCustomers = result.customers;
        customers = currentCustomers;
        cacheCustomers();
        populateCustomerDropdown();
        return result;
    },
    onSaved: ({ result, form }) => {
        const currentCustomers = result.customers;
        const newCi = currentCustomers.findIndex(c => c.customer === form.customerName);
        if (newCi < 0)
            return;
        customerSelect.value = newCi;
        populateFloorplanDropdown(newCi);
        const floorplans = currentCustomers[newCi].floorplans || [];
        const newFi = FD.UploadSaveSelectionService.findSavedFloorplanIndex(floorplans, result.floorplan || {}, form);
        if (newFi < 0)
            return;
        floorplanSelect.value = newFi;
        updatePickerButtons();
        if (adminDashboardState.visible)
            hideAdminDashboard();
        loadFloorplan(newCi, newFi);
    },
});
appMode.setHooks(AppModes.UPLOAD, {
    enter({ from }) {
        if (from === AppModes.UPLOAD_SAVING)
            return;
        uploadController.enterModeUI();
    },
    exit({ to }) {
        if (to === AppModes.UPLOAD_SAVING)
            return;
        uploadController.exitModeUI();
    },
});
appMode.setHooks(AppModes.UPLOAD_SAVING, {
    exit({ to }) {
        if (to === AppModes.UPLOAD)
            return;
        uploadController.exitModeUI();
    },
});
uploadController.bind();
// ============================================================
// DELETE UPLOADED FLOORPLAN
// ============================================================
const btnEditImage = document.getElementById('btn-edit-image');
const btnEditMetadata = document.getElementById('btn-edit-fp-metadata');
const metadataFpOverlay = document.getElementById('metadata-fp-overlay');
const metadataFpPopup = document.getElementById('metadata-fp-popup');
const metadataFpContext = document.getElementById('metadata-fp-context');
const metadataBuildingInput = document.getElementById('metadata-building-name');
const metadataFloorLabelInput = document.getElementById('metadata-floor-label');
const metadataLocationStreetInput = document.getElementById('metadata-location-street');
const metadataLocationPostalCodeInput = document.getElementById('metadata-location-postal-code');
const metadataLocationCityInput = document.getElementById('metadata-location-city');
const metadataLocationNoteInput = document.getElementById('metadata-location-note');
const metadataLevelOrderInput = document.getElementById('metadata-level-order');
const metadataFloorNotesInput = document.getElementById('metadata-floor-notes');
const metadataFpError = document.getElementById('metadata-fp-error');
const metadataFpSave = document.getElementById('metadata-fp-save');
const metadataFpCancel = document.getElementById('metadata-fp-cancel');
const metadataDialog = FD.UIShellService.createPopupPair({
    overlayEl: metadataFpOverlay,
    popupEl: metadataFpPopup,
});
function selectDeletedFloorplanCustomer(customerName, currentCustomers) {
    const remainingCi = currentCustomers.findIndex(customer => customer.customer === customerName);
    if (remainingCi >= 0) {
        customerSelect.value = String(remainingCi);
        populateFloorplanDropdown(remainingCi);
        floorplanSelect.value = '';
        updatePickerButtons();
        setEmptyState('Kies een plattegrond<br>uit het dropdown menu.');
        loadingEl.classList.remove('hidden');
        return;
    }
    customerSelect.value = '';
    resetFloorplanDropdown(true);
    updatePickerButtons();
    setEmptyState('Kies een klant en plattegrond<br>om te beginnen.');
    loadingEl.classList.remove('hidden');
}
function restoreTopbarSelectionAfterCustomerRefresh(selection) {
    if (!selection?.customer || !selection?.floorplan)
        return;
    selectTopbarFloorplanRecord({
        customer: selection.customer.customer,
        name: selection.floorplan.name,
        repo: selection.floorplan.repo === 'uploads' ? 'uploads' : 'gallery',
        file: selection.floorplan.file || '',
    });
}
async function deleteUploadedFloorplanAndReset({ customer, floorplan: fp }) {
    const customerName = customer.customer;
    const selectedBeforeDelete = getSelectedFloorplan();
    const deletingCurrentFloorplan = selectedBeforeDelete.customer?.customer === customerName &&
        floorplanIdentityMatches(selectedBeforeDelete.floorplan, fp);
    busyOverlay.show({
        title: 'Plattegrond verwijderen',
        subtitle: 'Uploadbestand en klantkoppeling worden verwijderd...',
    });
    try {
        floorplanLoadController.cancel();
        stopPolling();
        const { customers: currentCustomers } = await FD.DataService.deleteUploadedFloorplan(CONFIG, {
            customerName,
            floorplan: fp,
        });
        customers = currentCustomers;
        cacheCustomers();
        populateCustomerDropdown();
        if (deletingCurrentFloorplan) {
            currentFloorplan = null;
            currentCustomer = null;
            resetFloorplanUI();
            selectDeletedFloorplanCustomer(customerName, currentCustomers);
        }
        else {
            restoreTopbarSelectionAfterCustomerRefresh(selectedBeforeDelete);
        }
        if (adminDashboardState.visible || adminDashboardState.data) {
            adminDashboardState.selectedKey = '';
            adminDashboardState.selectedDoorKey = '';
            adminDashboardState.previewKey = '';
            await loadAdminDashboard({ force: true });
        }
    }
    finally {
        busyOverlay.hide();
    }
}
