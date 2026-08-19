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
let floorplanStatusRevision = '';
function resetFloorplanStatusRevision() { floorplanStatusRevision = ''; }
function applyFloorplanStatusAttributes(rows) {
    const changedDoorIds = [];
    (rows || []).forEach(row => {
        const doorId = row?.marker_uuid ? `door-${row.marker_uuid}` : '';
        const marker = doorId ? FD.MarkerService.findMarkerByDoorId(svgContainer, doorId) : null;
        if (!marker)
            return;
        const attributes = [
            ['data-fd-opname-status', row.opname_status || 'blauw'],
            ['data-fd-onderhoud-status', row.onderhoud_status || 'blauw'],
            ['data-fd-has-opname', row.has_opname ? '1' : '0'],
            ['data-fd-has-onderhoud', row.has_onderhoud ? '1' : '0'],
            ['data-dooratlas-status', row.status || 'blauw'],
        ];
        if (!attributes.some(([name, value]) => marker.getAttribute(name) !== value))
            return;
        attributes.forEach(([name, value]) => marker.setAttribute(name, value));
        changedDoorIds.push(doorId);
    });
    return changedDoorIds;
}
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
            return { status: doorStatus, changed: false };
        const result = await FD.DataService.loadFloorplanStatus(CONFIG, getFloorplanApiUrl(floorplan), { statusRevision: floorplanStatusRevision });
        floorplanStatusRevision = result?.revision || floorplanStatusRevision;
        const doorIds = result?.changed ? applyFloorplanStatusAttributes(result.rows || []) : [];
        return { status: result?.status || doorStatus, changed: doorIds.length > 0, event: { doorIds } };
    },
    getState: () => ({
        selectedDoor,
        currentCustomer,
        currentFloorplan,
        isEditMode: isEditModeActive(),
        isVisible: document.visibilityState !== 'hidden',
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
const mapCamera = FD.SvgViewportCameraService.create();
const mapViewport = FD.MapViewportController.create({
    containerEl: svgContainer,
    getSvg: () => svgContainer.querySelector('svg'),
    getContentBounds: svgEl => mapCamera.contentBounds(svgEl),
    getOverlayHeight: () => infoPanel.offsetHeight || 0,
    getState: () => ({ scale, panX, panY }),
    setState: (next) => { scale = next.scale; panX = next.panX; panY = next.panY; },
    applyTransform: (next, metrics) => {
        if (!mapCamera.apply({ state: next, metrics })) {
            metrics.svgEl.style.transform = `translate3d(${next.panX}px, ${next.panY}px, 0) scale(${next.scale})`;
        }
    },
});
function refreshPanMetrics() { return mapViewport.refreshMetrics(); }
function getPanMetrics(refresh = false) { return mapViewport.getMetrics(refresh); }
function fitToScreen(svgWidth, svgHeight) {
    const metrics = refreshPanMetrics();
    if (!metrics)
        return;
    const fit = mapViewport.fit(svgWidth, svgHeight);
    if (!fit)
        return;
    // Save initial view for reset
    savedScale = fit.scale;
    savedPanX = fit.panX;
    savedPanY = fit.panY;
    if (showLabels)
        updateEditLabels();
}
function resetZoom() {
    const metrics = refreshPanMetrics();
    if (metrics) {
        fitToScreen(metrics.contentWidth, metrics.contentHeight);
        return;
    }
    scale = savedScale;
    panX = savedPanX;
    panY = savedPanY;
    applyTransform();
}
function applyTransform(refresh = true) {
    mapViewport.apply(refresh);
}
function finishMapTransformInteraction() {
    mapViewport.finishInteraction();
}
function scheduleTransform() {
    mapViewport.scheduleApply();
}
// Pan via pointer events
svgContainer.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false)
        return;
    if (beginPolygonVertexPointer(e)) {
        isPanning = false;
        hasMoved = false;
        pendingDoor = null;
        return;
    }
    if (beginShapePlacementPointer(e)) {
        isPanning = false;
        hasMoved = false;
        pendingDoor = null;
        return;
    }
    if (movingMarker && pendingDoor === movingMarker.doorId) {
        const svgPoint = getSvgPointFromClient(e.clientX, e.clientY);
        if (svgPoint) {
            const position = FD.MarkerService.markerPosition(movingMarker.marker);
            movingMarker.dragOffsetX = (position?.x || 0) - svgPoint.x;
            movingMarker.dragOffsetY = (position?.y || 0) - svgPoint.y;
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
    mapViewport.startInteraction();
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    lastPanX = panX;
    lastPanY = panY;
    svgContainer.setPointerCapture(e.pointerId);
});
svgContainer.addEventListener('pointermove', (e) => {
    if (updatePolygonVertexPointer(e))
        return;
    if (updateShapePlacementPointer(e))
        return;
    if (isDraggingMove) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5)
            return;
        hasMoved = true;
        const svgPoint = getSvgPointFromClient(e.clientX, e.clientY);
        if (!svgPoint)
            return;
        const pos = clampMarkerMovePosition(movingMarker.marker, svgPoint.x + movingMarker.dragOffsetX, svgPoint.y + movingMarker.dragOffsetY);
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
    mapViewport.panFrom(lastPanX, lastPanY, dx, dy);
});
let wasMultiTouch = false;
const mapTouchGesture = FD.MapTouchGestureService.bind({
    containerEl: svgContainer,
    getScale: () => scale,
    zoomAtClient: (clientX, clientY, nextScale) => mapViewport.zoomAtClient(clientX, clientY, nextScale),
    onStart: () => {
        isPanning = false;
        wasMultiTouch = true;
    },
    onZoom: () => {
        if (showLabels)
            scheduleEditLabelsUpdate();
    },
    onSettled: () => { wasMultiTouch = false; },
});
svgContainer.addEventListener('pointerup', (e) => {
    isPanning = false;
    finishMapTransformInteraction();
    if (endPolygonVertexPointer(e)) {
        hasMoved = false;
        pendingDoor = null;
        return;
    }
    if (endShapePlacementPointer(e)) {
        hasMoved = false;
        pendingDoor = null;
        return;
    }
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
svgContainer.addEventListener('dblclick', (e) => {
    if (!isEditModeActive() || activeMarkerShape !== 'polygon' || !hasPolygonDraft())
        return;
    const point = getSvgPointFromClient(e.clientX, e.clientY);
    if (!point || !isPointInsideEditableBounds(point.x, point.y))
        return;
    e.preventDefault();
    finishPolygonDraftFromDoubleClick();
});
svgContainer.addEventListener('pointercancel', () => {
    isPanning = false;
    finishMapTransformInteraction();
    polygonVertexDragIndex = null;
    if (shapePlacement)
        shapePlacement.pointer = null;
    if (movingMarker)
        cancelMoveMode();
    else
        isDraggingMove = false;
    hasMoved = false;
    pendingDoor = null;
});
svgContainer.addEventListener('lostpointercapture', () => {
    isPanning = false;
    finishMapTransformInteraction();
    if (shapePlacement)
        shapePlacement.pointer = null;
    if (movingMarker)
        cancelMoveMode();
    else
        isDraggingMove = false;
    hasMoved = false;
    pendingDoor = null;
});
