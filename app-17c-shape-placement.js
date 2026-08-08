let shapePlacement = null;
let reusableRectangle = null;
let reuseRectangleSize = false;
const placementControls = document.getElementById('edit-shape-placement-controls');
const placementLabel = document.getElementById('edit-shape-placement-label');
const placementReuse = document.getElementById('edit-shape-placement-reuse');
const placementReuseRow = document.getElementById('edit-shape-placement-reuse-row');
const placementUndo = document.getElementById('btn-placement-undo');
const placementCancel = document.getElementById('btn-placement-cancel');
const placementApprove = document.getElementById('btn-placement-approve');
const placementActions = document.getElementById('edit-placement-actions');
const shapePicker = document.getElementById('edit-shape-picker');
const sizeControls = document.getElementById('edit-size-controls');
const editActions = document.getElementById('edit-mode-actions');
const autoNumberButton = document.getElementById('btn-auto-number');
function isShapePlacementActive() { return Boolean(shapePlacement); }
function updateEditorActionVisibility() {
    const polygonDrawing = hasPolygonDraft();
    const placementActive = isShapePlacementActive();
    const busy = polygonDrawing || placementActive;
    editActions.hidden = busy;
    shapePicker.hidden = busy;
    autoNumberButton.hidden = busy;
    sizeControls.hidden = busy;
    placementControls.hidden = !placementActive;
    placementActions.hidden = !placementActive;
    requestAnimationFrame(updateTopbarHeight);
}
function resetShapePlacementSession() {
    cancelPendingShapePlacement();
    reusableRectangle = null;
    reuseRectangleSize = false;
}
function constrainRectangleGeometry(geometry) {
    if (geometry.shape !== 'rectangle')
        return null;
    const bounds = getEditableBounds();
    if (!bounds)
        return null;
    const width = Math.min(Math.max(2, geometry.width), bounds.width);
    const height = Math.min(Math.max(2, geometry.height), bounds.height);
    return {
        shape: 'rectangle', width, height,
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, geometry.x)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, geometry.y)),
    };
}
function newRectangleGeometry(marker) {
    const center = FD.MarkerShapeService.center(marker);
    if (!center)
        return null;
    const size = reusableRectangle || { width: editMarkerSize * 2, height: editMarkerSize * 2 };
    return constrainRectangleGeometry({ shape: 'rectangle', x: center.x - size.width / 2, y: center.y - size.height / 2, ...size });
}
function shapePlacementHandles() {
    return svgContainer.querySelector('[data-fd-shape-placement-handles]');
}
function renderShapePlacementHandles() {
    shapePlacementHandles()?.remove();
    const placement = shapePlacement;
    const svg = svgContainer.querySelector('svg');
    const geometry = placement && FD.MarkerShapeService.geometry(placement.marker);
    if (!placement || !svg || geometry?.shape !== 'rectangle')
        return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-fd-shape-placement-handles', '1');
    const length = Math.max(14 / scale, Math.min(geometry.width, geometry.height) * 0.44);
    const offset = Math.max(7 / scale, 2);
    const touchTargetPadding = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ? 24 / scale : 0;
    const addHandle = (side, x1, y1, x2, y2) => {
        if (touchTargetPadding) {
            const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hitArea.setAttribute('x1', String(x1));
            hitArea.setAttribute('y1', String(y1));
            hitArea.setAttribute('x2', String(x2));
            hitArea.setAttribute('y2', String(y2));
            hitArea.setAttribute('data-fd-placement-handle', side);
            hitArea.setAttribute('stroke', '#1a73e8');
            hitArea.setAttribute('stroke-opacity', '0.001');
            hitArea.setAttribute('stroke-width', String(Math.max(48 / scale, 8)));
            hitArea.setAttribute('pointer-events', 'stroke');
            group.appendChild(hitArea);
        }
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        handle.setAttribute('x1', String(x1));
        handle.setAttribute('y1', String(y1));
        handle.setAttribute('x2', String(x2));
        handle.setAttribute('y2', String(y2));
        handle.setAttribute('data-fd-placement-handle', side);
        handle.setAttribute('stroke', '#1a73e8');
        handle.setAttribute('stroke-width', String(Math.max(5 / scale, 2)));
        handle.setAttribute('stroke-linecap', 'round');
        handle.style.cursor = side === 'top' || side === 'bottom' ? 'ns-resize' : 'ew-resize';
        group.appendChild(handle);
    };
    const midX = geometry.x + geometry.width / 2;
    const midY = geometry.y + geometry.height / 2;
    if (touchTargetPadding) {
        const moveHit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        moveHit.setAttribute('x', String(geometry.x - touchTargetPadding));
        moveHit.setAttribute('y', String(geometry.y - touchTargetPadding));
        moveHit.setAttribute('width', String(geometry.width + touchTargetPadding * 2));
        moveHit.setAttribute('height', String(geometry.height + touchTargetPadding * 2));
        moveHit.setAttribute('fill', 'transparent');
        moveHit.setAttribute('pointer-events', 'all');
        moveHit.setAttribute('data-fd-placement-move-hit', '1');
        moveHit.style.cursor = 'move';
        group.appendChild(moveHit);
    }
    addHandle('top', midX - length / 2, geometry.y - offset, midX + length / 2, geometry.y - offset);
    addHandle('right', geometry.x + geometry.width + offset, midY - length / 2, geometry.x + geometry.width + offset, midY + length / 2);
    addHandle('bottom', midX - length / 2, geometry.y + geometry.height + offset, midX + length / 2, geometry.y + geometry.height + offset);
    addHandle('left', geometry.x - offset, midY - length / 2, geometry.x - offset, midY + length / 2);
    svg.appendChild(group);
}
function setPlacementControls(placement) {
    placementControls.dataset.placementMode = placement.isNew ? 'new' : 'existing';
    placementLabel.textContent = 'Rechthoek aanpassen';
    placementReuseRow.hidden = !placement.isNew;
    placementReuse.checked = reuseRectangleSize;
    placementReuse.disabled = !placement.isNew;
    placementUndo.disabled = placement.undo.length === 0;
    renderShapePlacementHandles();
    updateEditorActionVisibility();
}
function beginNewShapePlacement(svgX, svgY) {
    if (activeMarkerShape !== 'rectangle')
        return false;
    const marker = showPendingAddMarker(svgX, svgY);
    if (!marker)
        return true;
    const geometry = newRectangleGeometry(marker);
    if (!geometry) {
        clearPendingAddMarker();
        return true;
    }
    FD.MarkerShapeService.setGeometry(marker, geometry);
    marker.style.pointerEvents = 'auto';
    marker.style.cursor = 'move';
    if (reuseRectangleSize && reusableRectangle) {
        openPlacedShapeMetadata(marker, geometry);
        return true;
    }
    shapePlacement = { marker, isNew: true, undo: [], pointer: null };
    setPlacementControls(shapePlacement);
    return true;
}
function beginExistingRectanglePlacement(marker) {
    if (FD.MarkerShapeService.geometry(marker)?.shape !== 'rectangle')
        return false;
    shapePlacement = { marker, isNew: false, undo: [], pointer: null };
    setPlacementControls(shapePlacement);
    return true;
}
function rememberPlacementUndo() {
    const placement = shapePlacement;
    const geometry = placement && FD.MarkerShapeService.geometry(placement.marker);
    if (!placement || !geometry)
        return;
    placement.undo.push(JSON.parse(JSON.stringify(geometry)));
    if (placement.undo.length > 12)
        placement.undo.shift();
    placementUndo.disabled = placement.undo.length === 0;
}
function undoShapePlacement() {
    const placement = shapePlacement;
    const geometry = placement?.undo.pop();
    if (!placement || !geometry)
        return;
    FD.MarkerShapeService.setGeometry(placement.marker, geometry);
    placementUndo.disabled = placement.undo.length === 0;
    renderShapePlacementHandles();
}
function cancelPendingShapePlacement() {
    const placement = shapePlacement;
    shapePlacementHandles()?.remove();
    shapePlacement = null;
    if (placement?.isNew)
        clearPendingAddMarker();
    if (placement && !placement.isNew)
        cancelResize();
    updateEditorActionVisibility();
}
function openPlacedShapeMetadata(marker, geometry) {
    shapePlacementHandles()?.remove();
    shapePlacement = null;
    marker.style.pointerEvents = 'none';
    marker.style.cursor = '';
    updateEditorActionVisibility();
    const validate = (doorCode, onError) => {
        if (FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode))
            return void onError('Deze code bestaat al op deze plattegrond.');
        const loadingMessage = doorCodeIndexLoadingMessage();
        if (loadingMessage)
            return void onError(loadingMessage);
        const conflict = findGlobalDoorCodeConflict(doorCode);
        if (conflict)
            return void onError(globalDoorCodeConflictMessage(conflict, doorCode));
        clearPendingAddMarker();
        addMarkerAtPosition(0, 0, doorCode, '', '', geometry);
        updateAutoPreview();
    };
    if (autoNumbering) {
        const code = getNextAutoCode();
        if (!code)
            return void clearPendingAddMarker();
        return void validate(code, message => showToast(message, 'error'));
    }
    showDoorMetadataPopup({
        title: 'Nieuwe rechthoekdeur', submitText: 'Toevoegen', lockOverlayDismiss: true,
        onSubmit: ({ doorCode, description, securityLevel }) => {
            if (FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode))
                return void (editPopupError.textContent = 'Deze code bestaat al op deze plattegrond.');
            const loadingMessage = doorCodeIndexLoadingMessage();
            if (loadingMessage)
                return void (editPopupError.textContent = loadingMessage);
            const conflict = findGlobalDoorCodeConflict(doorCode);
            if (conflict)
                return void (editPopupError.textContent = globalDoorCodeConflictMessage(conflict, doorCode));
            clearPendingAddMarker();
            addMarkerAtPosition(0, 0, doorCode, description, securityLevel, geometry);
            closeEditPopup();
        },
    });
    requestAnimationFrame(() => positionEditPopupAwayFromMarker(marker));
}
function approveShapePlacement() {
    const placement = shapePlacement;
    const geometry = placement && FD.MarkerShapeService.geometry(placement.marker);
    if (!placement || !geometry)
        return;
    if (!placement.isNew) {
        shapePlacementHandles()?.remove();
        shapePlacement = null;
        applyResize();
        updateEditorActionVisibility();
        return;
    }
    if (geometry.shape !== 'rectangle')
        return;
    reuseRectangleSize = placementReuse.checked;
    reusableRectangle = reuseRectangleSize ? { width: geometry.width, height: geometry.height } : null;
    openPlacedShapeMetadata(placement.marker, geometry);
}
function updatePendingShapePlacementSize(_value) { return false; }
function beginShapePlacementPointer(event) {
    const placement = shapePlacement;
    const point = getSvgPointFromClient(event.clientX, event.clientY);
    if (!placement || !point)
        return false;
    const target = event.target;
    const handle = target?.closest?.('[data-fd-placement-handle]');
    const onMarker = event.target === placement.marker || Boolean(target?.closest?.('[data-fd-placement-move-hit]'));
    if (!handle && !onMarker)
        return false;
    const geometry = FD.MarkerShapeService.geometry(placement.marker);
    if (geometry?.shape !== 'rectangle')
        return false;
    rememberPlacementUndo();
    placement.pointer = { mode: handle ? 'edge' : 'move', side: handle?.getAttribute('data-fd-placement-handle') || '', start: point, geometry };
    svgContainer.setPointerCapture(event.pointerId);
    event.preventDefault();
    return true;
}
function updateShapePlacementPointer(event) {
    const placement = shapePlacement;
    const pointer = placement?.pointer;
    const point = getSvgPointFromClient(event.clientX, event.clientY);
    if (!placement || !pointer || !point || pointer.geometry.shape !== 'rectangle')
        return false;
    const original = pointer.geometry;
    let next = original;
    if (pointer.mode === 'move') {
        next = { ...original, x: original.x + point.x - pointer.start.x, y: original.y + point.y - pointer.start.y };
    }
    else {
        const right = original.x + original.width;
        const bottom = original.y + original.height;
        if (pointer.side === 'top')
            next = { ...original, y: point.y, height: bottom - point.y };
        if (pointer.side === 'right')
            next = { ...original, width: point.x - original.x };
        if (pointer.side === 'bottom')
            next = { ...original, height: point.y - original.y };
        if (pointer.side === 'left')
            next = { ...original, x: point.x, width: right - point.x };
    }
    const constrained = constrainRectangleGeometry(next);
    if (constrained)
        FD.MarkerShapeService.setGeometry(placement.marker, constrained);
    renderShapePlacementHandles();
    event.preventDefault();
    return true;
}
function endShapePlacementPointer(event) {
    if (!shapePlacement?.pointer)
        return false;
    shapePlacement.pointer = null;
    if (svgContainer.hasPointerCapture(event.pointerId))
        svgContainer.releasePointerCapture(event.pointerId);
    event.preventDefault();
    return true;
}
placementReuse.addEventListener('change', () => { if (shapePlacement?.isNew)
    reuseRectangleSize = placementReuse.checked; });
placementUndo.addEventListener('click', undoShapePlacement);
placementCancel.addEventListener('click', cancelPendingShapePlacement);
placementApprove.addEventListener('click', approveShapePlacement);
