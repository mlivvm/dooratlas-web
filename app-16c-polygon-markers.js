let polygonDraftPoints = [];
let polygonDraftGroup = null;
let polygonVertexEditor = null;
let polygonVertexDragIndex = null;
const polygonUndoButton = document.getElementById('btn-polygon-undo');
const polygonCancelButton = document.getElementById('btn-polygon-cancel');
const polygonVertexDoneButton = document.getElementById('btn-polygon-vertices-done');
function polygonSvg() {
    return svgContainer.querySelector('svg');
}
function setPolygonDraftControls() {
    const active = activeMarkerShape === 'polygon';
    const drafting = polygonDraftPoints.length > 0;
    polygonUndoButton.hidden = !active || !drafting;
    polygonCancelButton.hidden = !active || !drafting;
    updateEditorActionVisibility();
}
function renderPolygonDraft() {
    polygonDraftGroup?.remove();
    polygonDraftGroup = null;
    const svgEl = polygonSvg();
    if (!svgEl || !polygonDraftPoints.length)
        return;
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('data-fd-polygon-draft', '1');
    group.setAttribute('pointer-events', 'none');
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', polygonDraftPoints.map(point => `${point.x},${point.y}`).join(' '));
    line.setAttribute('fill', polygonDraftPoints.length > 2 ? 'rgba(230,119,0,0.16)' : 'none');
    line.setAttribute('stroke', '#e67700');
    line.setAttribute('stroke-width', Math.max(2, 3 / scale).toString());
    line.setAttribute('stroke-dasharray', polygonDraftPoints.length > 2 ? '' : `${6 / scale} ${4 / scale}`);
    group.appendChild(line);
    polygonDraftPoints.forEach(point => {
        const vertex = document.createElementNS(ns, 'circle');
        vertex.setAttribute('cx', point.x.toString());
        vertex.setAttribute('cy', point.y.toString());
        vertex.setAttribute('r', Math.max(4, 6 / scale).toString());
        vertex.setAttribute('fill', '#fff');
        vertex.setAttribute('stroke', '#e67700');
        vertex.setAttribute('stroke-width', Math.max(1.5, 2 / scale).toString());
        group.appendChild(vertex);
    });
    svgEl.appendChild(group);
    polygonDraftGroup = group;
}
function clearPolygonDraft() {
    polygonDraftPoints = [];
    polygonDraftGroup?.remove();
    polygonDraftGroup = null;
    setPolygonDraftControls();
}
function hasPolygonDraft() {
    return polygonDraftPoints.length > 0;
}
function addPolygonDraftPoint(svgX, svgY) {
    if (polygonDraftPoints.length >= 12)
        return void showToast('Een polygoon kan maximaal twaalf punten hebben.', 'error');
    if (!isPointInsideEditableBounds(svgX, svgY))
        return;
    const first = polygonDraftPoints[0];
    if (polygonDraftPoints.length >= 3 && first && Math.hypot(svgX - first.x, svgY - first.y) <= 14 / scale) {
        finishPolygonDraft();
        return;
    }
    const last = polygonDraftPoints[polygonDraftPoints.length - 1];
    if (last && Math.hypot(svgX - last.x, svgY - last.y) <= 4 / scale)
        return;
    polygonDraftPoints.push({ x: Math.round(svgX), y: Math.round(svgY) });
    renderPolygonDraft();
    setPolygonDraftControls();
}
function addPolygonMarker(points, doorCode, description = '', securityLevel = '') {
    const svgEl = polygonSvg();
    if (!svgEl)
        return;
    const doorId = `door-draft-${Date.now()}-${++draftMarkerNumber}`;
    const marker = FD.MarkerShapeService.createMarker({ doorId, shape: 'polygon', points });
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
function showPendingPolygon(points) {
    const svgEl = polygonSvg();
    if (!svgEl)
        return null;
    clearPendingAddMarker();
    const marker = FD.MarkerShapeService.createMarker({ doorId: '__fd_pending_marker', shape: 'polygon', points, fill: '#e67700', opacity: '0.95' });
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
function validateNewPolygonDoor(doorCode, onError) {
    if (FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode)) {
        onError('Deze code bestaat al op deze plattegrond.');
        return false;
    }
    const loadingMessage = doorCodeIndexLoadingMessage();
    if (loadingMessage) {
        onError(loadingMessage);
        return false;
    }
    const conflict = findGlobalDoorCodeConflict(doorCode);
    if (conflict) {
        onError(globalDoorCodeConflictMessage(conflict, doorCode));
        return false;
    }
    return true;
}
function finishPolygonDraft() {
    if (!FD.MarkerShapeService.isValidPolygon(polygonDraftPoints))
        return void showToast('Plaats minstens drie punten zonder kruisende lijnen.', 'error');
    const points = polygonDraftPoints.map(point => ({ ...point }));
    clearPolygonDraft();
    const previewMarker = showPendingPolygon(points);
    if (autoNumbering) {
        const code = getNextAutoCode();
        if (!code)
            return void clearPendingAddMarker();
        if (!validateNewPolygonDoor(code, message => showToast(message, 'error')))
            return void clearPendingAddMarker();
        clearPendingAddMarker();
        addPolygonMarker(points, code);
        updateAutoPreview();
        return;
    }
    showDoorMetadataPopup({
        title: 'Nieuwe polygoondeur', submitText: 'Toevoegen', lockOverlayDismiss: true,
        onSubmit: ({ doorCode, description, securityLevel }) => {
            if (!validateNewPolygonDoor(doorCode, message => { editPopupError.textContent = message; }))
                return;
            clearPendingAddMarker();
            addPolygonMarker(points, doorCode, description, securityLevel);
            closeEditPopup();
        },
    });
    if (previewMarker)
        requestAnimationFrame(() => positionEditPopupAwayFromMarker(previewMarker));
}
function finishPolygonDraftFromDoubleClick() {
    if (polygonDraftPoints.length < 3)
        return void showToast('Plaats minstens drie punten.', 'error');
    finishPolygonDraft();
}
function polygonHandleGroup() {
    return polygonSvg()?.querySelector('[data-fd-polygon-handles]');
}
function renderPolygonVertexHandles() {
    polygonHandleGroup()?.remove();
    const svgEl = polygonSvg();
    const geometry = polygonVertexEditor && FD.MarkerShapeService.geometry(polygonVertexEditor.marker);
    if (!svgEl || !geometry || geometry.shape !== 'polygon')
        return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-fd-polygon-handles', '1');
    geometry.points.forEach((point, index) => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', point.x.toString());
        handle.setAttribute('cy', point.y.toString());
        handle.setAttribute('r', Math.max(6, 9 / scale).toString());
        handle.setAttribute('fill', '#fff');
        handle.setAttribute('stroke', '#1a73e8');
        handle.setAttribute('stroke-width', Math.max(1.5, 2.5 / scale).toString());
        handle.setAttribute('data-fd-polygon-handle', String(index));
        handle.style.cursor = 'grab';
        group.appendChild(handle);
    });
    svgEl.appendChild(group);
}
function startPolygonVertexEdit(marker, doorId) {
    const geometry = FD.MarkerShapeService.geometry(marker);
    if (!geometry || geometry.shape !== 'polygon')
        return;
    cancelPolygonVertexEdit();
    polygonVertexEditor = { marker, doorId, oldGeometry: { shape: 'polygon', points: geometry.points.map(point => ({ ...point })) } };
    marker.style.opacity = '1';
    marker.style.filter = 'drop-shadow(0 0 5px #1a73e8)';
    document.querySelector('.edit-label').textContent = 'Punten verplaatsen';
    polygonVertexDoneButton.hidden = false;
    renderPolygonVertexHandles();
}
function finishPolygonVertexEdit() {
    if (!polygonVertexEditor)
        return;
    const { marker, doorId, oldGeometry } = polygonVertexEditor;
    const current = FD.MarkerShapeService.geometry(marker);
    if (JSON.stringify(current) !== JSON.stringify(oldGeometry))
        editChanges.push(FD.MarkerService.resizeChange(doorId, getMarkerRadius(marker), oldGeometry));
    polygonHandleGroup()?.remove();
    applyDoorColor(marker, getDoorStatus(doorId));
    polygonVertexEditor = null;
    polygonVertexDragIndex = null;
    polygonVertexDoneButton.hidden = true;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
    if (showLabels)
        updateEditLabels();
}
function cancelPolygonVertexEdit() {
    if (!polygonVertexEditor)
        return;
    const { marker, doorId, oldGeometry } = polygonVertexEditor;
    FD.MarkerShapeService.setGeometry(marker, oldGeometry);
    polygonHandleGroup()?.remove();
    applyDoorColor(marker, getDoorStatus(doorId));
    polygonVertexEditor = null;
    polygonVertexDragIndex = null;
    polygonVertexDoneButton.hidden = true;
    document.querySelector('.edit-label').textContent = 'Bewerkingsmodus';
    if (showLabels)
        updateEditLabels();
}
function beginPolygonVertexPointer(event) {
    const handle = event.target?.closest?.('[data-fd-polygon-handle]');
    if (!polygonVertexEditor || !handle)
        return false;
    polygonVertexDragIndex = Number(handle.getAttribute('data-fd-polygon-handle'));
    svgContainer.setPointerCapture(event.pointerId);
    event.preventDefault();
    return true;
}
function updatePolygonVertexPointer(event) {
    if (!polygonVertexEditor || polygonVertexDragIndex === null)
        return false;
    const svgPoint = getSvgPointFromClient(event.clientX, event.clientY);
    const geometry = FD.MarkerShapeService.geometry(polygonVertexEditor.marker);
    const bounds = getEditableBounds();
    if (!svgPoint || !geometry || geometry.shape !== 'polygon' || !bounds)
        return true;
    const points = geometry.points.map(point => ({ ...point }));
    points[polygonVertexDragIndex] = {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, svgPoint.x)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, svgPoint.y)),
    };
    if (FD.MarkerShapeService.isValidPolygon(points)) {
        FD.MarkerShapeService.setGeometry(polygonVertexEditor.marker, { shape: 'polygon', points });
        renderPolygonVertexHandles();
    }
    event.preventDefault();
    return true;
}
function endPolygonVertexPointer(event) {
    if (polygonVertexDragIndex === null)
        return false;
    polygonVertexDragIndex = null;
    if (svgContainer.hasPointerCapture(event.pointerId))
        svgContainer.releasePointerCapture(event.pointerId);
    event.preventDefault();
    return true;
}
function clampMarkerMovePosition(marker, x, y) {
    const geometry = FD.MarkerShapeService.geometry(marker);
    const point = FD.MarkerShapeService.center(marker);
    const box = FD.MarkerShapeService.bounds(marker);
    const bounds = getEditableBounds();
    if (!geometry || geometry.shape !== 'polygon' || !point || !box || !bounds)
        return clampMarkerPosition(x, y, getMarkerRadius(marker));
    return {
        x: Math.max(bounds.x - box.left + point.x, Math.min(bounds.x + bounds.width - box.right + point.x, x)),
        y: Math.max(bounds.y - box.top + point.y, Math.min(bounds.y + bounds.height - box.bottom + point.y, y)),
    };
}
polygonUndoButton.addEventListener('click', () => { polygonDraftPoints.pop(); renderPolygonDraft(); setPolygonDraftControls(); });
polygonCancelButton.addEventListener('click', clearPolygonDraft);
polygonVertexDoneButton.addEventListener('click', finishPolygonVertexEdit);
