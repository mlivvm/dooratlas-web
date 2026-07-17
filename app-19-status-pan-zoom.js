function handleEditTapOnDoor(doorId) {
    if (!isEditModeActive())
        return;
    if (movingMarker) {
        cancelMoveMode();
        return;
    }
    if (resizingMarker) {
        applyResize();
        return;
    }
    const marker = FD.MarkerService.findMarkerByDoorId(svgContainer, doorId);
    if (!marker)
        return;
    const displayLabel = FD.MarkerService.markerDisplayLabel(marker);
    showEditPopup('Deur: ' + displayLabel, null, [
        {
            text: 'Verplaatsen', color: '#7b1fa2',
            action: () => {
                closeEditPopup();
                const origCx = parseFloat(marker.getAttribute('cx')) || 0;
                const origCy = parseFloat(marker.getAttribute('cy')) || 0;
                startMoveMode(marker, doorId, origCx, origCy);
            }
        },
        {
            text: 'Grootte aanpassen', color: '#e67700',
            action: () => {
                closeEditPopup();
                const currentRx = parseFloat(marker.getAttribute('rx')) || 10;
                startResizeMode(marker, doorId, currentRx);
            }
        },
        {
            text: 'Deurgegevens wijzigen', color: '#1a73e8',
            action: () => {
                closeEditPopup();
                const currentCode = FD.MarkerService.markerDoorCode(marker);
                const currentDescription = FD.MarkerService.markerDoorDescription(marker);
                showDoorMetadataPopup({
                    title: 'Deurgegevens wijzigen',
                    doorCode: currentCode,
                    description: currentDescription,
                    onSubmit: ({ doorCode, description }) => {
                        if (doorCode === currentCode && description === currentDescription) {
                            closeEditPopup();
                            return;
                        }
                        const localMatch = FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode);
                        if (localMatch && localMatch !== marker) {
                            editPopupError.textContent = 'Deze code bestaat al op deze plattegrond.';
                            return;
                        }
                        const loadingMessage = doorCodeIndexLoadingMessage();
                        if (loadingMessage) {
                            editPopupError.textContent = loadingMessage;
                            return;
                        }
                        const conflict = findGlobalDoorCodeConflict(doorCode);
                        if (conflict) {
                            editPopupError.textContent = globalDoorCodeConflictMessage(conflict, doorCode);
                            return;
                        }
                        renameMarker(doorId, doorCode, description);
                        closeEditPopup();
                    },
                });
            }
        },
        {
            text: 'Verwijderen', color: '#d93025',
            action: () => {
                closeEditPopup();
                showEditPopup('Weet je zeker dat je deur ' + displayLabel + ' wilt verwijderen?', null, [
                    { text: 'Ja, verwijderen', color: '#d93025', action: () => { deleteMarker(doorId); closeEditPopup(); } },
                    { text: 'Nee', color: '#e0e0e0', textColor: '#333', action: closeEditPopup }
                ]);
            }
        },
        { text: 'Sluiten', color: '#e0e0e0', textColor: '#333', action: closeEditPopup }
    ]);
}
// ============================================================
// DOOR STATUS UPDATE
// ============================================================
statusSync = FD.StatusSyncService.create(CONFIG, {
    setStatus: (nextStatus) => { doorStatus = nextStatus || {}; },
    isOnline: () => navigator.onLine,
    onQueueChange: () => updateStatusSyncIndicator(),
    onSynced: ({ syncedQueue = [] } = {}) => {
        syncedQueue.forEach(op => {
            if (!op || op.customer !== currentCustomer || op.floorplan !== currentFloorplan)
                return;
            if (op.status === 'done')
                rememberManualNewFormHint(op.doorId);
            if (op.status !== 'done')
                clearManualNewFormHint(op.doorId);
        });
        refreshAllDoorColors();
        updateDoneButton();
    },
    onNetworkUnavailable: () => { },
    onSyncError: (err) => console.error('Status sync queue mislukt:', err),
});
function handleStatusChanged(event = {}) {
    refreshAllDoorColors();
    if (event?.source === 'manual-toggle') {
        if (event.newStatus === 'done')
            rememberManualNewFormHint(event.doorId);
        if (event.newStatus !== 'done')
            clearManualNewFormHint(event.doorId);
        return;
    }
    if (event?.source === 'poll' &&
        jotformFocusRefreshDoorId &&
        selectedDoor === jotformFocusRefreshDoorId &&
        Date.now() <= jotformFocusRefreshUntil) {
        return;
    }
    refreshJotFormSubmissionCache();
}
const statusController = FD.StatusSyncService.createController({
    sync: statusSync,
    intervalMs: CONFIG.pollInterval,
    getStatus: () => doorStatus,
    setStatus: (nextStatus) => { doorStatus = nextStatus || {}; },
    refreshStatus: async () => {
        const { floorplan } = getSelectedFloorplan();
        if (!floorplan || typeof FD.DataService.loadFloorplanStatus !== 'function')
            return doorStatus;
        return FD.DataService.loadFloorplanStatus(CONFIG, getFloorplanApiUrl(floorplan));
    },
    getState: () => ({
        selectedDoor,
        currentCustomer,
        currentFloorplan,
        isEditMode: isEditModeActive(),
        online: navigator.onLine,
    }),
    onStatusChanged: handleStatusChanged,
    updateDoneButton,
    showToast,
    logger: console,
});
async function flushStatusSyncQueue() {
    return statusController.flush();
}
async function toggleDoorStatus() {
    showInfoPopup('Komt in een volgende versie', 'Status wijzigen kan pas met de echte opname- en onderhoudsformulieren.');
    return null;
}
function updateDoneButton() {
    doorActionController.updateDoneButton();
    if (selectedDoor) {
        const isDone = getDoorStatus(selectedDoor);
        const condition = getDoorCondition(selectedDoor);
        const needsAttention = isDone && condition === 'attention';
        const isChecking = isDone && condition === 'checking';
        doorStatusEl.textContent = needsAttention ? '(aandacht nodig)' : (isChecking ? '(controleren...)' : (isDone ? '(afgerond)' : '(nog te doen)'));
        doorStatusEl.style.color = needsAttention ? COLORS.attention : (isChecking ? COLORS.checking : (isDone ? COLORS.done : COLORS.todo));
    }
    applyDoorActionPermissions();
}
// ============================================================
// PAN & ZOOM
// ============================================================
function fitToScreen(svgWidth, svgHeight) {
    const containerRect = svgContainer.getBoundingClientRect();
    // Account for info panel overlay by measuring actual height (0 when hidden)
    const infoPanelHeight = infoPanel.offsetHeight;
    const fit = FD.ViewportService.fitToBounds({
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        overlayHeight: infoPanelHeight,
        contentWidth: svgWidth,
        contentHeight: svgHeight,
    });
    scale = fit.scale;
    panX = fit.panX;
    panY = fit.panY;
    // Save initial view for reset
    savedScale = scale;
    savedPanX = panX;
    savedPanY = panY;
    applyTransform();
    if (showLabels)
        updateEditLabels();
}
function resetZoom() {
    const svgEl = svgContainer.querySelector('svg');
    if (svgEl) {
        const vb = svgEl.viewBox.baseVal;
        if (vb.width && vb.height) {
            fitToScreen(vb.width, vb.height);
            return;
        }
    }
    scale = savedScale;
    panX = savedPanX;
    panY = savedPanY;
    applyTransform();
}
function clampPanToVisibleMap() {
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return;
    const vb = svgEl.viewBox.baseVal;
    if (!vb.width || !vb.height)
        return;
    const containerRect = svgContainer.getBoundingClientRect();
    const infoPanelHeight = infoPanel.offsetHeight || 0;
    const clamped = FD.ViewportService.clampPan({
        panX,
        panY,
        scale,
        contentWidth: vb.width,
        contentHeight: vb.height,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        overlayHeight: infoPanelHeight,
    });
    panX = clamped.panX;
    panY = clamped.panY;
}
function applyTransform() {
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return;
    clampPanToVisibleMap();
    svgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}
let transformFrame = null;
function scheduleTransform() {
    if (transformFrame !== null)
        return;
    transformFrame = requestAnimationFrame(() => {
        transformFrame = null;
        applyTransform();
    });
}
function getTouchDist(touches) {
    return FD.ViewportService.touchDistance(touches);
}
function getTouchCenter(touches) {
    return FD.ViewportService.touchCenter(touches);
}
// Pan via pointer events
svgContainer.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false)
        return;
    if (movingMarker && pendingDoor === movingMarker.doorId) {
        const svgPoint = getSvgPointFromClient(e.clientX, e.clientY);
        if (svgPoint) {
            const cx = parseFloat(movingMarker.marker.getAttribute('cx')) || 0;
            const cy = parseFloat(movingMarker.marker.getAttribute('cy')) || 0;
            movingMarker.dragOffsetX = cx - svgPoint.x;
            movingMarker.dragOffsetY = cy - svgPoint.y;
        }
        isDraggingMove = true;
        isPanning = false;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        svgContainer.setPointerCapture(e.pointerId);
        return;
    }
    isPanning = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    lastPanX = panX;
    lastPanY = panY;
    svgContainer.setPointerCapture(e.pointerId);
});
svgContainer.addEventListener('pointermove', (e) => {
    if (isDraggingMove) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5)
            return;
        hasMoved = true;
        const svgPoint = getSvgPointFromClient(e.clientX, e.clientY);
        if (!svgPoint)
            return;
        const pos = clampMarkerPosition(svgPoint.x + movingMarker.dragOffsetX, svgPoint.y + movingMarker.dragOffsetY, getMarkerRadius(movingMarker.marker));
        FD.MarkerService.setMarkerPosition(movingMarker.marker, pos.x, pos.y);
        return;
    }
    if (!isPanning)
        return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5)
        return;
    hasMoved = true;
    panX = lastPanX + dx;
    panY = lastPanY + dy;
    scheduleTransform();
});
let wasMultiTouch = false;
let multiTouchTimer = null;
svgContainer.addEventListener('pointerup', (e) => {
    isPanning = false;
    if (wasMultiTouch) {
        if (movingMarker)
            cancelMoveMode();
        pendingDoor = null;
        return;
    }
    if (isDraggingMove) {
        isDraggingMove = false;
        if (hasMoved) {
            confirmMove();
        }
        else {
            cancelMoveMode();
        }
        pendingDoor = null;
        return;
    }
    if (!hasMoved && pendingDoor) {
        if (isEditModeActive()) {
            handleEditTapOnDoor(pendingDoor);
        }
        else {
            selectDoor(pendingDoor);
        }
    }
    else if (!hasMoved && !pendingDoor && isEditModeActive()) {
        handleEditTapOnEmpty(e);
    }
    pendingDoor = null;
});
svgContainer.addEventListener('pointercancel', () => {
    isPanning = false;
    if (movingMarker)
        cancelMoveMode();
    else
        isDraggingMove = false;
    hasMoved = false;
    pendingDoor = null;
});
svgContainer.addEventListener('lostpointercapture', () => {
    isPanning = false;
    if (movingMarker)
        cancelMoveMode();
    else
        isDraggingMove = false;
    hasMoved = false;
    pendingDoor = null;
});
// Pinch-to-zoom
svgContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 2) {
        e.preventDefault();
        isPanning = false;
        wasMultiTouch = true;
        if (multiTouchTimer) {
            clearTimeout(multiTouchTimer);
            multiTouchTimer = null;
        }
        initialPinchDist = getTouchDist(e.touches);
        initialScale = scale;
    }
}, { passive: false });
