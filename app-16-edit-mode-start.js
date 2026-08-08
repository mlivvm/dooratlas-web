let showLabels = localStorage.getItem(LABELS_STORAGE_KEY) !== '0';
let markerOutlineMode = localStorage.getItem(MARKER_OUTLINE_STORAGE_KEY) === '1';
let editLabelElements = [];
let draftMarkerNumber = 0;
let pendingMarkerSaveId = '';
let editSaveRequiresRefresh = false;
let activeMarkerShape = 'ellipse';
const topbar = document.querySelector('.topbar');
const editBar = document.getElementById('edit-bar');
const btnEdit = document.getElementById('btn-edit');
const editPopup = document.getElementById('edit-popup');
const editOverlay = document.getElementById('edit-overlay');
const editPopupTitle = document.getElementById('edit-popup-title');
const editPopupInput = document.getElementById('edit-popup-input');
const editPopupCustom = document.getElementById('edit-popup-custom');
const editPopupButtons = document.getElementById('edit-popup-buttons');
const editPopupInputRow = document.getElementById('edit-popup-input-row');
const editPopupError = document.getElementById('edit-popup-error');
const btnScanQr = document.getElementById('btn-scan-qr');
let editPopupRequiresExplicitCancel = false;
const markerShapeButtons = {
    ellipse: document.getElementById('edit-shape-circle'),
    rectangle: document.getElementById('edit-shape-rectangle'),
    polygon: document.getElementById('edit-shape-polygon'),
};
function setActiveMarkerShape(shape) {
    cancelPendingShapePlacement();
    clearPolygonDraft();
    activeMarkerShape = shape;
    Object.entries(markerShapeButtons).forEach(([kind, button]) => {
        const active = kind === shape;
        button?.classList.toggle('active', active);
        button?.setAttribute('aria-pressed', String(active));
    });
}
markerShapeButtons.ellipse?.addEventListener('click', () => setActiveMarkerShape('ellipse'));
markerShapeButtons.rectangle?.addEventListener('click', () => setActiveMarkerShape('rectangle'));
markerShapeButtons.polygon?.addEventListener('click', () => setActiveMarkerShape('polygon'));
const editPopupController = FD.EditUIService.createEditPopupController({
    elements: {
        popupEl: editPopup,
        overlayEl: editOverlay,
        titleEl: editPopupTitle,
        inputEl: editPopupInput,
        inputRowEl: editPopupInputRow,
        customEl: editPopupCustom,
        buttonsEl: editPopupButtons,
        errorEl: editPopupError,
    },
    onBeforeHide: () => {
        editPopupRequiresExplicitCancel = false;
        if (resizingMarker)
            cancelResize();
        if (qrScannerController?.isActive())
            qrScannerController.stop();
        clearPendingAddMarker();
        clearPolygonDraft();
    },
});
function getSliderRange() {
    const svgEl = svgContainer.querySelector('svg');
    return FD.MarkerGeometryService.sliderRange(svgEl);
}
function getMarkerRadius(marker) {
    return FD.MarkerService.markerRadius(marker, editMarkerSize || 10);
}
function getSvgPointFromClient(clientX, clientY) {
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return null;
    const vb = svgEl.viewBox.baseVal;
    const containerRect = svgContainer.getBoundingClientRect();
    return FD.ViewportService.clientToSvgPoint({
        clientX,
        clientY,
        containerLeft: containerRect.left,
        containerTop: containerRect.top,
        panX,
        panY,
        scale,
        viewBoxX: vb.x || 0,
        viewBoxY: vb.y || 0,
    });
}
function getEditableBounds() {
    const svgEl = svgContainer.querySelector('svg');
    return FD.MarkerService.editableBounds(svgEl);
}
function clampMarkerPosition(svgX, svgY, radius) {
    const bounds = getEditableBounds();
    return FD.MarkerService.clampPosition(svgX, svgY, radius, bounds);
}
function isPointInsideEditableBounds(svgX, svgY) {
    const bounds = getEditableBounds();
    return FD.MarkerService.pointInsideBounds(svgX, svgY, bounds);
}
function getMaxRadiusAtPosition(marker) {
    const bounds = getEditableBounds();
    return FD.MarkerService.maxRadiusAtPosition(marker, bounds);
}
async function enterEditMode() {
    if (!currentFloorplan)
        return;
    if (!canEditMarkersCurrentFloorplan()) {
        showToast('Alleen kijken op deze plattegrond', 'error');
        return;
    }
    if (appMode.is(AppModes.EDIT))
        return;
    if (!appMode.isInteractiveView()) {
        showToast('Sluit eerst het huidige scherm', 'error');
        return;
    }
    if (!(await ensureActiveSession({
        force: true,
        purpose: 'marker_edit_preflight',
        background: false,
    })))
        return;
    // A second tap can finish its preflight after the first one entered edit mode.
    if (appMode.is(AppModes.EDIT))
        return;
    if (!appMode.isInteractiveView())
        return;
    appMode.enter(AppModes.EDIT);
    loadDoorCodeIndex({ force: true });
    editChanges = [];
    pendingMarkerSaveId = '';
    editSaveRequiresRefresh = false;
    setActiveMarkerShape('ellipse');
    resetShapePlacementSession();
    movingMarker = null;
    isDraggingMove = false;
    topbar.classList.add('edit-mode');
    editBar.style.display = 'flex';
    infoPanel.style.display = 'none';
    deselectDoor();
    document.getElementById('btn-edit-save').disabled = false;
    document.getElementById('btn-edit-save').textContent = 'Opslaan';
    const range = getSliderRange();
    markerSizeSliderController.setRange({ max: range.max, value: range.def });
    document.getElementById('btn-auto-number').classList.remove('active');
    document.getElementById('auto-number-row').style.display = 'none';
    document.getElementById('auto-prefix-input').value = '';
    document.getElementById('auto-next-preview').textContent = '→ (voer prefix in)';
    autoNumbering = false;
    autoPrefix = '';
    autoPadding = parseInt(document.getElementById('auto-padding-select').value, 10);
    btnEdit.style.display = 'none';
    btnReset.style.display = 'none';
    mapModeController?.setVisible(false);
    customerSelect.disabled = true;
    floorplanSelect.disabled = true;
    updatePickerButtons();
    requestAnimationFrame(updateTopbarHeight);
}
function exitEditMode() {
    if (resizingMarker)
        applyResize();
    if (movingMarker)
        cancelMoveMode();
    finishPolygonVertexEdit();
    cancelPendingShapePlacement();
    clearPolygonDraft();
    appMode.enter(AppModes.VIEW);
    topbar.classList.remove('edit-mode');
    editBar.style.display = 'none';
    autoNumbering = false;
    autoPrefix = '';
    document.getElementById('btn-auto-number').classList.remove('active');
    document.getElementById('auto-number-row').style.display = 'none';
    if (showLabels)
        updateEditLabels();
    else
        removeEditLabels();
    infoPanel.style.display = 'flex';
    btnEdit.style.display = canEditMarkersCurrentFloorplan() ? 'inline-block' : 'none';
    btnReset.style.display = 'inline-block';
    customerSelect.disabled = false;
    floorplanSelect.disabled = false;
    updatePickerButtons();
    updateRoleActionButtons();
    mapModeController?.setVisible(true);
    closeEditPopup();
    requestAnimationFrame(updateTopbarHeight);
}
function cancelEditMode() {
    if (resizingMarker)
        cancelResize();
    if (movingMarker)
        cancelMoveMode();
    cancelPolygonVertexEdit();
    cancelPendingShapePlacement();
    clearPolygonDraft();
    FD.MarkerService.revertEditChanges(editChanges, svgContainer, { initMarker: initSingleMarker });
    pendingMarkerSaveId = '';
    editSaveRequiresRefresh = false;
    exitEditMode();
    populateSidePanel();
}
function showEditPopup(title, defaultValue, buttons) {
    editPopupRequiresExplicitCancel = false;
    editPopupController.show(title, defaultValue, buttons);
}
function showDoorMetadataPopup({ title, doorCode = '', description = '', securityLevel = '', submitText = 'Opslaan', lockOverlayDismiss = false, onSubmit }) {
    editPopupRequiresExplicitCancel = lockOverlayDismiss;
    let codeInput;
    let descriptionInput;
    let securityLevelInput;
    const submit = () => {
        const code = String(codeInput?.value || '').trim();
        const detail = String(descriptionInput?.value || '').trim();
        const level = FD.MapModeService.normalizeSecurityLevel(securityLevelInput?.value);
        if (!code)
            return void (editPopupError.textContent = 'Vul een deurcode in.');
        if (/[\r\n]/.test(code) || code.length > 50)
            return void (editPopupError.textContent = 'Deurcode mag maximaal 50 tekens zijn en geen nieuwe regel bevatten.');
        if (/[\r\n]/.test(detail) || detail.length > 100)
            return void (editPopupError.textContent = 'Omschrijving mag maximaal 100 tekens zijn en geen nieuwe regel bevatten.');
        onSubmit({ doorCode: code, description: detail, securityLevel: level });
    };
    editPopupController.showCustom(title, (customEl, documentRef) => {
        const form = documentRef.createElement('div');
        form.className = 'door-metadata-popup';
        const addField = (labelText, input) => {
            const label = documentRef.createElement('label');
            label.textContent = labelText;
            label.appendChild(input);
            form.appendChild(label);
        };
        codeInput = documentRef.createElement('input');
        codeInput.type = 'text';
        codeInput.maxLength = 50;
        codeInput.value = doorCode;
        codeInput.autocomplete = 'off';
        codeInput.placeholder = 'Bijv. D-001';
        descriptionInput = documentRef.createElement('input');
        descriptionInput.type = 'text';
        descriptionInput.maxLength = 100;
        descriptionInput.value = description;
        descriptionInput.autocomplete = 'off';
        descriptionInput.placeholder = 'Optioneel';
        addField('Deurcode', codeInput);
        addField('Omschrijving', descriptionInput);
        securityLevelInput = documentRef.createElement('select');
        [
            ['', 'Niet ingesteld'],
            ['hoog', 'Hoog beveiligingsniveau'],
            ['normaal', 'Normaal beveiligingsniveau'],
            ['laag', 'Laag beveiligingsniveau'],
        ].forEach(([value, label]) => {
            const option = documentRef.createElement('option');
            option.value = value;
            option.textContent = label;
            securityLevelInput.appendChild(option);
        });
        securityLevelInput.value = FD.MapModeService.normalizeSecurityLevel(securityLevel);
        addField('Beveiligingsniveau', securityLevelInput);
        const scan = documentRef.createElement('button');
        scan.type = 'button';
        scan.className = 'door-metadata-scan';
        scan.textContent = 'Scan QR';
        scan.addEventListener('click', () => qrScannerController?.start());
        form.appendChild(scan);
        codeInput.addEventListener('keydown', event => { if (event.key === 'Enter') {
            event.preventDefault();
            submit();
        } });
        customEl.appendChild(form);
        return codeInput;
    }, [
        { text: submitText, color: '#34a853', action: submit },
        { text: 'Annuleren', color: '#e0e0e0', textColor: '#333', action: closeEditPopup },
    ]);
}
function closeEditPopup() {
    editPopupRequiresExplicitCancel = false;
    editPopupController.hide();
}
function initSingleMarker(marker, doorId) {
    FD.MarkerService.prepareInteractiveMarker(marker, doorId);
    const isDone = getDoorStatus(doorId);
    applyDoorColor(marker, isDone);
    marker.addEventListener('pointerdown', (e) => { pendingDoor = e.currentTarget.dataset.doorId; });
}
function addMarkerAtPosition(svgX, svgY, doorCode, description = '', securityLevel = '', geometry = null) {
    const svgEl = svgContainer.querySelector('svg');
    const pos = clampMarkerPosition(svgX, svgY, editMarkerSize);
    const doorId = `door-draft-${Date.now()}-${++draftMarkerNumber}`;
    const marker = FD.MarkerShapeService.createMarker({
        doorId,
        shape: geometry?.shape || activeMarkerShape,
        x: pos.x,
        y: pos.y,
        radius: editMarkerSize,
        width: (geometry?.shape || activeMarkerShape) === 'rectangle' ? editMarkerSize * 2 : undefined,
        height: (geometry?.shape || activeMarkerShape) === 'rectangle' ? editMarkerSize * 2 : undefined,
    });
    if (geometry)
        FD.MarkerShapeService.setGeometry(marker, geometry);
    svgEl.appendChild(marker);
    initSingleMarker(marker, doorId);
    marker.setAttribute('data-dooratlas-draft-key', doorId);
    FD.MarkerService.setMarkerDoorMetadata(marker, { doorCode, description, securityLevel });
    FD.DoorMarkerHoverService?.bind?.(marker);
    editChanges.push(FD.MarkerService.addChange(doorId));
    populateSidePanel();
    if (showLabels)
        updateEditLabels();
}
function clearPendingAddMarker() {
    if (!pendingAddMarker)
        return;
    pendingAddMarker.remove();
    pendingAddMarker = null;
}
function showPendingAddMarker(svgX, svgY) {
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return null;
    clearPendingAddMarker();
    const pos = clampMarkerPosition(svgX, svgY, editMarkerSize);
    const marker = FD.MarkerShapeService.createMarker({
        doorId: '__fd_pending_marker',
        shape: activeMarkerShape,
        x: pos.x,
        y: pos.y,
        radius: editMarkerSize,
        width: activeMarkerShape === 'rectangle' ? editMarkerSize * 2 : undefined,
        height: activeMarkerShape === 'rectangle' ? editMarkerSize * 2 : undefined,
        fill: '#e67700',
        opacity: '0.95',
    });
    marker.removeAttribute('id');
    marker.removeAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label');
    marker.dataset.fdPendingMarker = '1';
    marker.style.pointerEvents = 'none';
    marker.style.stroke = '#fff';
    marker.style.strokeWidth = Math.max(2, editMarkerSize * 0.25).toString();
    marker.style.filter = 'drop-shadow(0 0 5px #e67700)';
    svgEl.appendChild(marker);
    pendingAddMarker = marker;
    return marker;
}
function deleteMarker(doorId) {
    const marker = FD.MarkerService.findMarkerByDoorId(svgContainer, doorId);
    if (!marker)
        return;
    editChanges.push(FD.MarkerService.deleteChange(marker, doorId));
    marker.remove();
    deselectDoor();
    populateSidePanel();
    if (showLabels)
        updateEditLabels();
}
function renameMarker(doorId, doorCode, description = '', securityLevel = '') {
    const marker = FD.MarkerService.findMarkerByDoorId(svgContainer, doorId);
    if (!marker)
        return;
    const oldCode = FD.MarkerService.markerDoorCode(marker);
    const oldDescription = FD.MarkerService.markerDoorDescription(marker);
    const oldSecurityLevel = FD.MapModeService.markerSecurityLevel(marker);
    FD.MarkerService.setMarkerDoorMetadata(marker, { doorCode, description, securityLevel });
    editChanges.push(FD.MarkerService.renameChange(doorId, oldCode, doorCode, oldDescription, description, oldSecurityLevel, securityLevel));
    populateSidePanel();
    if (showLabels)
        updateEditLabels();
}
let resizingMarker = null;
let resizingOldRx = null;
let resizingOldGeometry = null;
function startResizeMode(marker, doorId, currentRx) {
    resizingMarker = { marker, doorId };
    resizingOldRx = currentRx;
    resizingOldGeometry = FD.MarkerService.markerGeometry(marker);
    // Rectangles use direct edge handles and must not alter the circle-size
    // preference that is retained for subsequent new circle markers.
    const rectangle = FD.MarkerShapeService.geometry(marker)?.shape === 'rectangle';
    if (!rectangle) {
        // Set slider to current size, expand max if needed.
        const range = getSliderRange();
        markerSizeSliderController.setRange({
            max: Math.max(range.max, Math.ceil(currentRx)),
            value: Math.round(currentRx),
        });
    }
    // Highlight the marker with uniform glow
    marker.style.opacity = '1';
    marker.style.filter = 'drop-shadow(0 0 4px #e67700) drop-shadow(0 0 2px #e67700)';
    // Keep technical marker IDs out of the visible editing controls.
    document.querySelector('.edit-label').textContent = FD.MarkerService.markerDisplayLabel(marker);
    if (rectangle) {
        beginExistingRectanglePlacement(marker);
        return;
    }
    showResizePopup(marker, doorId);
}
