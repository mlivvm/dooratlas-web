const floorplanLoadController = FD.FloorplanViewService.createLoadController({
    elements: {
        svgContainer,
        loadingEl,
    },
    getSelection: () => ({
        customerIndex: customerSelect.value,
        floorplanIndex: floorplanSelect.value,
    }),
    fetchSvg: async ({ floorplan }, options) => {
        await refreshFloorplanStatusFromServer(floorplan, options);
        return fetchFloorplanSVGCacheFirst(getFloorplanApiUrl(floorplan), options);
    },
    setLoadingState,
    onBeforeLoad: () => {
        const keepTopbarActionsStable = Boolean(svgContainer.querySelector('svg'));
        topbarFloorplanActionsLocked = keepTopbarActionsStable;
        stopPolling();
        resetJotFormSubmissionCache();
        resetDoorCodeIndexState();
        deselectDoor();
        if (!keepTopbarActionsStable) {
            btnReset.style.display = 'none';
            btnEdit.style.display = 'none';
        }
        hideLocationAddressBar();
        infoPanel.style.display = 'none';
        btnPanelToggle.style.display = 'none';
        closeSidePanel();
        sidePanelController.clear();
        doorInspectorController.clear();
        loadingEl.classList.add('hidden');
    },
    onSvgReady: ({ svgEl, context }) => {
        initDoorMarkers(svgEl);
        deselectDoor();
        updateStatusBar();
        if (showLabels)
            updateEditLabels();
        infoPanel.style.display = 'flex';
        btnReset.style.display = 'inline-block';
        topbarFloorplanActionsLocked = false;
        populateSidePanel();
        doorInspectorController.showList();
        syncSidePanelForViewport();
        updateDeleteButton();
        updateRoleActionButtons();
        refreshJotFormSubmissionCache();
        startPolling();
    },
    onBeforeReveal: ({ size }) => fitToScreen(size.width, size.height),
    onRevalidated: () => showToast('Plattegrond bijgewerkt', 'success'),
    onError: (err) => {
        topbarFloorplanActionsLocked = false;
        btnReset.style.display = 'none';
        btnEdit.style.display = 'none';
        loadingEl.textContent = 'Fout: ' + err.message;
    },
});
function closeSidePanel() {
    sidePanelController.close();
}
function resetFloorplanUI() {
    floorplanLoadController.cancel();
    stopPolling();
    resetJotFormSubmissionCache();
    deselectDoor();
    floorplanLoadController.clearContent();
    statusCount.textContent = '';
    hideLocationAddressBar();
    btnReset.style.display = 'none';
    infoPanel.style.display = 'none';
    btnPanelToggle.style.display = 'none';
    btnEdit.style.display = 'none';
    topbarFloorplanActionsLocked = false;
    closeSidePanel();
    sidePanelController.clear();
    doorInspectorController.clear();
}
async function resetAppToStartScreen() {
    cancelFloorplanCacheWarmup();
    const privateCleanup = clearPrivateOfflineData();
    FD.InspectionFormService?.closeAll?.();
    if (isEditModeActive())
        exitEditMode();
    closeSelectSheet();
    customers = [];
    doorStatus = {};
    currentCustomer = null;
    currentFloorplan = null;
    refreshCurrentUser();
    pendingDoor = null;
    adminDashboardState.visible = false;
    adminDashboardState.data = null;
    adminDashboardState.selectedKey = '';
    adminDashboardState.selectedCustomer = '';
    adminDashboardState.selectedLocation = '';
    adminDashboardState.searchQuery = '';
    adminDashboardState.doorQuery = '';
    adminDashboardState.doorOrder = 'asc';
    adminDashboardState.doorCustomerFilter = '';
    adminDashboardState.doorFloorplanFilter = '';
    adminDashboardState.activeTab = 'overview';
    adminDashboardState.selectedDoorKey = '';
    adminDashboardState.overviewMetric = 'attention';
    adminDashboardState.activity = [];
    adminDashboardState.activityLoading = false;
    adminDashboardState.activityError = '';
    adminDashboardState.activityUnavailable = false;
    adminDashboardState.previewKey = '';
    adminDashboardState.previewRequestId += 1;
    adminDashboardState.metadataRecord = null;
    adminDashboardState.bulkMode = false;
    adminDashboardState.bulkSelectedKeys.clear();
    adminDashboardState.lastUpdatedAt = '';
    adminDashboardState.loadError = '';
    if (adminDashboardSearch)
        adminDashboardSearch.value = '';
    if (adminDoorSearch)
        adminDoorSearch.value = '';
    if (adminDoorGroup)
        adminDoorGroup.value = '';
    if (adminDoorCustomerFilter)
        adminDoorCustomerFilter.value = '';
    if (adminDoorFloorplanFilter)
        adminDoorFloorplanFilter.value = '';
    stopAdminActiveUsersPolling();
    renderActiveUsers(null);
    if (adminDashboardEl)
        adminDashboardEl.style.display = 'none';
    appContainer.classList.remove('admin-dashboard-active');
    customerSelect.disabled = false;
    FD.SelectSheetService.renderCustomerOptions(customerSelect, []);
    resetFloorplanDropdown(true);
    resetFloorplanUI();
    statusCount.textContent = '';
    hideTopbarMenu();
    hideExportExcelDialog();
    updatePickerButtons();
    updateDeleteButton();
    updateRoleActionButtons();
    setEmptyState('Kies een klant en plattegrond<br>om te beginnen.');
    loadingEl.classList.remove('hidden');
    await privateCleanup;
}
// ============================================================
// SVG LOADING & DOOR DETECTION
// ============================================================
async function loadFloorplan(customerIndex, floorplanIndex) {
    const c = customers[customerIndex];
    const fp = c.floorplans[floorplanIndex];
    currentCustomer = c.customer;
    currentFloorplan = fp.name;
    return floorplanLoadController.load({ customerIndex, floorplanIndex, customer: c, floorplan: fp });
}
async function refreshFloorplanStatusFromServer(floorplan, options = {}) {
    if (typeof FD.DataService.loadFloorplanStatus !== 'function')
        return;
    try {
        const nextStatus = await FD.DataService.loadFloorplanStatus(CONFIG, getFloorplanApiUrl(floorplan), options);
        if (nextStatus && typeof nextStatus === 'object') {
            doorStatus = nextStatus;
            updateStatusBar();
        }
    }
    catch (err) {
        if (FD.DataService.isSessionAuthError?.(err))
            throw err;
        console.warn('Kon plattegrondstatus niet laden:', err);
    }
}
function getDoorId(el) {
    return FD.MarkerService.getDoorId(el);
}
function isResolvedDoorMarker(marker) {
    return FD.DataServiceFloorplan.hasResolvedDoorBinding(marker);
}
function initDoorMarkers(svgEl) {
    const markers = svgEl.querySelectorAll('ellipse, circle');
    markers.forEach(marker => {
        // Drafts use initSingleMarker in edit mode. Loaded map markers need a
        // runtime DB binding, so decorative SVG circles remain inert.
        if (!isResolvedDoorMarker(marker))
            return;
        const doorId = getDoorId(marker);
        if (FD.MarkerService.isIgnoredDoorId(doorId))
            return;
        FD.MarkerService.prepareInteractiveMarker(marker, doorId);
        const details = doorDetailsForMarker(marker, doorId);
        marker.setAttribute('role', 'button');
        marker.setAttribute('aria-label', `Deur ${details.label}`);
        marker.setAttribute('tabindex', '0');
        const isDone = getDoorStatus(doorId);
        applyDoorColor(marker, isDone);
        // Track door target on pointerdown (read from dataset so renames are picked up)
        marker.addEventListener('pointerdown', (e) => {
            pendingDoor = e.currentTarget.dataset.doorId;
        });
        marker.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ')
                return;
            e.preventDefault();
            selectDoor(e.currentTarget.dataset.doorId);
        });
    });
}
function applyDoorColor(marker, isDone) {
    const isSelected = marker.dataset.doorId === selectedDoor;
    const hasSelection = selectedDoor !== null;
    const condition = getDoorCondition(marker.dataset.doorId);
    let color = COLORS.todo;
    let filter = 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.28))';
    if (isDone && condition === 'attention') {
        color = COLORS.attention;
        filter = 'drop-shadow(0 0 6px rgba(217, 48, 37, 0.62)) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.22))';
    }
    else if (isDone && condition === 'checking') {
        color = COLORS.checking;
        filter = 'drop-shadow(0 0 5px rgba(95, 99, 104, 0.38)) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.18))';
    }
    else if (isDone) {
        color = COLORS.done;
        filter = 'drop-shadow(0 0 5px rgba(52, 168, 83, 0.40)) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.20))';
    }
    if (markerOutlineMode) {
        marker.style.fill = 'transparent';
        marker.style.stroke = color;
        marker.style.strokeWidth = '5';
    }
    else {
        marker.style.fill = color;
        marker.style.stroke = 'transparent';
        marker.style.strokeWidth = '20';
    }
    marker.style.vectorEffect = 'non-scaling-stroke';
    if (isSelected) {
        marker.style.opacity = OPACITY.selected;
        marker.style.filter = 'drop-shadow(0 0 9px rgba(26, 115, 232, 0.95)) drop-shadow(0 0 3px rgba(255, 255, 255, 0.98))';
    }
    else if (hasSelection) {
        marker.style.opacity = OPACITY.dimmed;
        marker.style.filter = 'drop-shadow(0 1px 1px rgba(15, 23, 42, 0.16))';
    }
    else {
        marker.style.opacity = OPACITY.normal;
        marker.style.filter = filter;
    }
}
function doorPrintColor(doorId) {
    const isDone = getDoorStatus(doorId);
    const condition = getDoorCondition(doorId);
    if (isDone && condition === 'attention')
        return COLORS.attention;
    if (isDone && condition === 'checking')
        return COLORS.checking;
    if (isDone)
        return COLORS.done;
    return COLORS.todo;
}
function applyPrintDoorMarkerStyle(marker) {
    const doorId = marker?.dataset?.doorId;
    if (!doorId)
        return;
    const color = doorPrintColor(doorId);
    if (markerOutlineMode) {
        marker.style.fill = 'transparent';
        marker.style.stroke = color;
        marker.style.strokeWidth = '5';
    }
    else {
        marker.style.fill = color;
        marker.style.stroke = 'transparent';
        marker.style.strokeWidth = '20';
    }
    marker.style.opacity = OPACITY.normal;
    marker.style.filter = 'none';
    marker.style.pointerEvents = 'none';
    marker.style.cursor = 'default';
    marker.style.transition = 'none';
    marker.style.vectorEffect = 'non-scaling-stroke';
}
function getDoorStatus(doorId) {
    if (!currentCustomer || !currentFloorplan)
        return false;
    return FD.StatusService.isDoorDone(doorStatus, currentCustomer, currentFloorplan, doorId);
}
function refreshAllDoorColors() {
    const markers = svgContainer.querySelectorAll('[data-door-id]');
    markers.forEach(marker => {
        applyDoorColor(marker, getDoorStatus(marker.dataset.doorId));
    });
    updateStatusBar();
    refreshSidePanel();
}
// ============================================================
// DOOR SELECTION
// ============================================================
function selectDoor(doorId) {
    doorActionController.selectDoor(doorId);
    applyDoorActionPermissions();
    if (selectedDoor) {
        doorInspectorController.showDoor(selectedDoor);
    }
    else {
        doorInspectorController.showList();
    }
    const key = jotformSubmissionCacheKey();
    refreshJotFormSubmissionCache({
        force: Boolean(key && jotformSubmissionCache.key === key && !jotformSubmissionCache.allChecked),
    });
}
function deselectDoor() {
    doorActionController.deselectDoor();
    doorInspectorController.showList();
}
// ============================================================
// JOTFORM LINK
// ============================================================
async function openJotForm(formType = 'maintenance', initialInspection = null) {
    const type = normalizeJotFormFormType(formType);
    if (!canCreateInspectionCurrentFloorplan()) {
        showToast('Geen rechten om een formulier in te vullen op deze plattegrond.', 'error');
        return;
    }
    const door = getSelectedDoorInspectionContext();
    if (!door) {
        showToast('Kies eerst een opgeslagen deur.', 'error');
        return;
    }
    if (!String(door.doorCode || '').trim()) {
        showToast('Deze deur heeft geen geldige deurcode. Corrigeer de deurcode voordat u een formulier invult.', 'error');
        return;
    }
    if (!FD.InspectionFormService?.open) {
        showInfoPopup('Niet beschikbaar', 'Het formulier kon niet worden geladen. Ververs de app en probeer opnieuw.');
        return;
    }
    FD.InspectionFormService.open({
        formType: type,
        door,
        initialInspection,
        photoUrl: photoId => FD.DataService.inspectionPhotoUrl(CONFIG, photoId),
        onSubmit: async (payload) => {
            await FD.DataService.createInspection(CONFIG, door.apiDoorId, payload, {
                diagnostics: { purpose: 'inspection_create', formType: payload.form_type },
            });
            const { customerIndex, floorplanIndex, floorplan } = getSelectedFloorplan();
            if (customerIndex !== null && floorplanIndex !== null && floorplan) {
                await loadFloorplan(customerIndex, floorplanIndex);
                if (FD.MarkerService.markerExists(svgContainer, door.markerKey)) {
                    selectDoor(door.markerKey);
                }
            }
            else {
                refreshAllDoorColors();
                populateSidePanel();
            }
            const label = type === 'inspection' ? 'Opname' : 'Onderhoud';
            showToast(initialInspection ? `${label} bijgewerkt` : `${label} opgeslagen`, 'success');
        },
    });
}
// ============================================================
// EDIT MODE
// ============================================================
let editChanges = [];
let editSaving = false;
let editMarkerSize = 15;
let qrScannerController = null;
let markerSizeSliderController = null;
let movingMarker = null; // { marker, doorId, origCx, origCy, dragOffsetX, dragOffsetY }
let isDraggingMove = false;
let pendingAddMarker = null;
let autoNumbering = false;
let autoPrefix = '';
let autoPadding = 3;
const LABELS_STORAGE_KEY = envStorageKey('fd_show_labels');
const LABELS_DEFAULT_MIGRATION_KEY = envStorageKey('fd_show_labels_default_on_v1');
const MARKER_OUTLINE_STORAGE_KEY = envStorageKey('fd_marker_outline');
if (localStorage.getItem(LABELS_DEFAULT_MIGRATION_KEY) !== '1') {
    localStorage.setItem(LABELS_STORAGE_KEY, '1');
    localStorage.setItem(LABELS_DEFAULT_MIGRATION_KEY, '1');
}
