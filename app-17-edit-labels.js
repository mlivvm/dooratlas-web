function positionEditPopupAwayFromMarker(marker) {
    const margin = 14;
    const horizontalMargin = 28;
    const markerRect = marker.getBoundingClientRect();
    const popupRect = editPopup.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const centerX = markerRect.left + markerRect.width / 2;
    const centerY = markerRect.top + markerRect.height / 2;
    const candidates = [
        {
            fits: viewportW - markerRect.right >= popupRect.width + horizontalMargin,
            left: markerRect.right + horizontalMargin,
            top: clamp(centerY - popupRect.height / 2, margin, viewportH - popupRect.height - margin)
        },
        {
            fits: markerRect.left >= popupRect.width + horizontalMargin,
            left: markerRect.left - popupRect.width - horizontalMargin,
            top: clamp(centerY - popupRect.height / 2, margin, viewportH - popupRect.height - margin)
        },
        {
            fits: viewportH - markerRect.bottom >= popupRect.height + margin,
            left: clamp(centerX - popupRect.width / 2, margin, viewportW - popupRect.width - margin),
            top: markerRect.bottom + margin
        },
        {
            fits: markerRect.top >= popupRect.height + margin,
            left: clamp(centerX - popupRect.width / 2, margin, viewportW - popupRect.width - margin),
            top: markerRect.top - popupRect.height - margin
        }
    ];
    const rooms = [
        viewportW - markerRect.right,
        markerRect.left,
        viewportH - markerRect.bottom,
        markerRect.top
    ];
    const fallbackIndex = rooms.indexOf(Math.max(...rooms));
    const chosen = candidates.find(c => c.fits) || candidates[fallbackIndex];
    editPopup.style.transform = 'none';
    editPopup.style.left = Math.round(chosen.left) + 'px';
    editPopup.style.top = Math.round(chosen.top) + 'px';
}
function showResizePopup(marker, doorId) {
    const slider = document.getElementById('edit-marker-size');
    const currentValue = parseInt(slider.value, 10);
    editPopupTitle.textContent = 'Grootte aanpassen';
    editPopupError.textContent = '';
    editPopupInputRow.style.display = 'none';
    editPopupCustom.innerHTML = '';
    editPopupCustom.style.display = 'block';
    editPopupButtons.innerHTML = '';
    const control = document.createElement('div');
    control.className = 'resize-popup-control';
    const label = document.createElement('label');
    label.textContent = FD.MarkerService.markerDisplayLabel(marker);
    const valueEl = document.createElement('span');
    valueEl.textContent = currentValue.toString();
    label.appendChild(valueEl);
    const popupSlider = document.createElement('input');
    popupSlider.id = 'resize-popup-slider';
    label.htmlFor = popupSlider.id;
    popupSlider.type = 'range';
    popupSlider.min = slider.min;
    popupSlider.max = slider.max;
    popupSlider.value = currentValue.toString();
    popupSlider.addEventListener('input', () => {
        const value = parseInt(popupSlider.value, 10);
        updateSliderValue(value);
        popupSlider.value = marker.getAttribute('rx') || value.toString();
        valueEl.textContent = popupSlider.value;
        if (showLabels)
            updateEditLabels();
    });
    control.appendChild(label);
    control.appendChild(popupSlider);
    editPopupCustom.appendChild(control);
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuleren';
    cancelBtn.style.background = '#e0e0e0';
    cancelBtn.style.color = '#333';
    cancelBtn.addEventListener('click', () => {
        cancelResize();
        closeEditPopup();
    });
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Klaar';
    doneBtn.style.background = '#34a853';
    doneBtn.style.color = 'white';
    doneBtn.addEventListener('click', () => {
        applyResize();
        closeEditPopup();
    });
    editPopupButtons.appendChild(cancelBtn);
    editPopupButtons.appendChild(doneBtn);
    editPopup.style.display = 'block';
    editOverlay.style.display = 'block';
    requestAnimationFrame(() => positionEditPopupAwayFromMarker(marker));
}
function clearResizeHighlight(marker) {
    if (!marker)
        return;
    applyDoorColor(marker, getDoorStatus(marker.dataset.doorId));
}
function applyResize() {
    if (!resizingMarker)
        return;
    editChanges.push(FD.MarkerService.resizeChange(resizingMarker.doorId, resizingOldRx));
    clearResizeHighlight(resizingMarker.marker);
    resizingMarker = null;
    resizingOldRx = null;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
    if (showLabels)
        updateEditLabels();
}
function cancelResize() {
    if (!resizingMarker)
        return;
    FD.MarkerService.setMarkerRadius(resizingMarker.marker, resizingOldRx);
    clearResizeHighlight(resizingMarker.marker);
    resizingMarker = null;
    resizingOldRx = null;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
    if (showLabels)
        updateEditLabels();
}
// ============================================================
// MOVE MODE
// ============================================================
function startMoveMode(marker, doorId, origCx, origCy) {
    movingMarker = { marker, doorId, origCx, origCy, dragOffsetX: 0, dragOffsetY: 0 };
    marker.style.opacity = '1';
    marker.style.filter = 'drop-shadow(0 0 6px #7b1fa2) drop-shadow(0 0 3px #7b1fa2)';
    document.querySelector('.edit-label').textContent = FD.MarkerService.markerDisplayLabel(marker);
}
function clearMoveHighlight(marker) {
    marker.style.filter = '';
}
function confirmMove() {
    if (!movingMarker)
        return;
    editChanges.push(FD.MarkerService.moveChange(movingMarker.doorId, movingMarker.origCx, movingMarker.origCy));
    clearMoveHighlight(movingMarker.marker);
    movingMarker = null;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
    if (showLabels)
        updateEditLabels();
}
function cancelMoveMode() {
    if (!movingMarker)
        return;
    FD.MarkerService.setMarkerPosition(movingMarker.marker, movingMarker.origCx, movingMarker.origCy);
    clearMoveHighlight(movingMarker.marker);
    movingMarker = null;
    isDraggingMove = false;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
}
// ============================================================
// AUTO-NUMBERING
// ============================================================
function getNextAutoCode() {
    return FD.MarkerService.nextAutoCode(svgContainer.querySelectorAll('[data-door-id]'), autoPrefix, autoPadding);
}
function updateAutoPreview() {
    const preview = document.getElementById('auto-next-preview');
    if (!autoPrefix) {
        preview.textContent = '→ (voer prefix in)';
        return;
    }
    preview.textContent = '→ ' + getNextAutoCode();
}
function toggleAutoNumbering() {
    autoNumbering = !autoNumbering;
    document.getElementById('btn-auto-number').classList.toggle('active', autoNumbering);
    const row = document.getElementById('auto-number-row');
    row.style.display = autoNumbering ? 'flex' : 'none';
    if (autoNumbering) {
        document.getElementById('auto-prefix-input').focus();
        updateAutoPreview();
    }
    requestAnimationFrame(updateTopbarHeight);
}
// ============================================================
// EDIT LABELS
// ============================================================
function createEditLabelUpdateScheduler({ run, shouldRun, setDelay, clearDelay, idleDelay = 90, }) {
    let idleId = null;
    const runIfNeeded = () => {
        if (typeof shouldRun === 'function' && !shouldRun())
            return;
        run();
    };
    function schedule() {
        if (idleId !== null)
            clearDelay(idleId);
        idleId = setDelay(() => {
            idleId = null;
            runIfNeeded();
        }, idleDelay);
    }
    function cancel() {
        if (idleId !== null) {
            clearDelay(idleId);
            idleId = null;
        }
    }
    return { schedule, cancel };
}
function updateEditLabels() {
    removeEditLabels();
    if (!showLabels)
        return;
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return;
    const ns = 'http://www.w3.org/2000/svg';
    const activeDoorId = movingMarker?.doorId || resizingMarker?.doorId || selectedDoor;
    const labels = FD.MarkerService.labelPlacements(svgContainer.querySelectorAll('[data-door-id]'), {
        scale,
        activeDoorId,
        bounds: FD.MarkerService.labelBounds(svgEl),
    });
    labels.forEach(label => {
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', label.x.toString());
        text.setAttribute('y', label.y.toString());
        text.setAttribute('font-size', label.fontSize.toString());
        text.setAttribute('fill', '#222');
        text.setAttribute('stroke', '#fff');
        text.setAttribute('stroke-width', label.strokeWidth.toString());
        text.setAttribute('paint-order', 'stroke');
        text.setAttribute('text-anchor', label.anchor);
        text.setAttribute('data-fd-label', '1');
        text.setAttribute('pointer-events', 'none');
        text.style.userSelect = 'none';
        text.textContent = label.text;
        svgEl.appendChild(text);
        editLabelElements.push(text);
    });
}
const editLabelUpdateScheduler = createEditLabelUpdateScheduler({
    run: updateEditLabels,
    shouldRun: () => showLabels,
    setDelay: (callback, delay) => setTimeout(callback, delay),
    clearDelay: id => clearTimeout(id),
});
function scheduleEditLabelsUpdate() {
    editLabelUpdateScheduler.schedule();
}
function removeEditLabels() {
    editLabelElements.forEach(el => el.remove());
    editLabelElements = [];
}
function toggleLabels() {
    showLabels = !showLabels;
    localStorage.setItem(LABELS_STORAGE_KEY, showLabels ? '1' : '0');
    updateLabelsMenuButton();
    if (showLabels)
        updateEditLabels();
    else
        removeEditLabels();
    hideTopbarMenu();
}
function updateLabelsMenuButton() {
    FD.UIShellService.updateLabelsButton(btnMenuLabels, showLabels);
}
function toggleMarkerOutlineMode() {
    markerOutlineMode = !markerOutlineMode;
    localStorage.setItem(MARKER_OUTLINE_STORAGE_KEY, markerOutlineMode ? '1' : '0');
    updateMarkerOutlineMenuButton();
    refreshAllDoorColors();
    hideTopbarMenu();
}
function updateMarkerOutlineMenuButton() {
    FD.UIShellService.updateMarkerOutlineButton(btnMenuMarkerOutline, markerOutlineMode);
}
function getExportBaseRecord() {
    if (adminDashboardState.visible) {
        const adminRecord = getSelectedAdminFloorplan();
        if (adminRecord)
            return adminRecord;
    }
    return getSelectedTopbarFloorplanRecord();
}
function setExportExcelBusy(busy) {
    [exportExcelCurrent, exportExcelSelect, exportExcelConfirm].forEach(button => {
        if (button)
            button.disabled = busy;
    });
}
function setExportExcelError(message) {
    if (exportExcelError)
        exportExcelError.textContent = message || '';
}
function hideExportExcelDialog() {
    exportExcelBaseRecord = null;
    if (exportExcelSelection)
        exportExcelSelection.hidden = true;
    setExportExcelError('');
    exportExcelDialog.hide();
}
async function ensureAdminOverviewForExport() {
    if (adminDashboardState.data)
        return adminDashboardState.data;
    const data = await FD.DataService.fetchAdminOverview(CONFIG, {
        diagnostics: {
            purpose: 'admin_export_excel',
        },
    });
    adminDashboardState.data = data;
    adminDashboardState.lastUpdatedAt = new Date().toISOString();
    return data;
}
