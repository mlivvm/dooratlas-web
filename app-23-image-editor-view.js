function exitImageEditorModeUI() {
    stopCropPreview({ restoreCanvas: false, clearSnapshot: true });
    if (editorCropper) {
        editorCropper.destroy();
        editorCropper = null;
    }
    const cropImage = document.getElementById('img-editor-crop-image');
    if (cropImage) {
        cropImage.onload = null;
        cropImage.onerror = null;
        cropImage.removeAttribute('src');
    }
    document.getElementById('img-editor-overlay').style.display = 'none';
    editorUndoStack = [];
    cropRect = null;
    activeCropHandle = null;
    editorSaving = false;
    editorCropContext = null;
    editorCropRotation = 0;
    pendingCropSave = null;
    editorTool = 'pan';
    if (editorCanvas)
        editorCanvas.dataset.tool = 'pan';
    editorIsPanning = false;
    editorDragMode = null;
    activeEditorPointers.clear();
    editorIsPinching = false;
    editorPinchDist = null;
    hideCropOutsideConfirm();
}
appMode.setHooks(AppModes.IMAGE_EDITOR, {
    enter({ from, context }) {
        if (from === AppModes.IMAGE_EDITOR_SAVING)
            return;
        enterImageEditorModeUI(context.imageHref);
    },
    exit({ to }) {
        if (to === AppModes.IMAGE_EDITOR_SAVING)
            return;
        exitImageEditorModeUI();
    },
});
appMode.setHooks(AppModes.IMAGE_EDITOR_SAVING, {
    exit({ to }) {
        if (to === AppModes.IMAGE_EDITOR)
            return;
        exitImageEditorModeUI();
    },
});
function closeImageEditor() {
    if (appMode.isAny([AppModes.IMAGE_EDITOR, AppModes.IMAGE_EDITOR_SAVING]))
        appMode.enter(AppModes.VIEW);
    else
        exitImageEditorModeUI();
    updateRoleActionButtons();
}
function setEditorTool(tool) {
    if (editorCropper)
        return;
    editorTool = tool;
    document.getElementById('img-editor-tool-pan').classList.toggle('active', tool === 'pan');
    document.getElementById('img-editor-tool-crop').classList.toggle('active', tool === 'crop');
    document.getElementById('img-editor-tool-erase').classList.toggle('active', tool === 'erase');
    document.getElementById('img-editor-brush-row').style.display = tool === 'erase' ? 'flex' : 'none';
    document.getElementById('img-editor-apply-crop').style.display = tool === 'crop' ? '' : 'none';
    stopCropPreview({ restoreCanvas: true, clearSnapshot: true });
    erasePointerDown = false;
    eraseLastPt = null;
    editorIsPanning = false;
    editorDragMode = null;
    editorCanvas.dataset.tool = tool;
    applyEditorViewport();
    if (tool === 'crop') {
        editorSnapshot = document.createElement('canvas');
        editorSnapshot.width = editorCanvas.width;
        editorSnapshot.height = editorCanvas.height;
        editorSnapshot.getContext('2d').drawImage(editorCanvas, 0, 0);
        cropRect = { x: 0, y: 0, w: editorCanvas.width, h: editorCanvas.height };
        activeCropHandle = null;
        editorRafId = requestAnimationFrame(renderEditorFrame);
    }
}
function renderEditorFrame() {
    if (editorTool !== 'crop' || !editorSnapshot || !cropRect) {
        editorRafId = null;
        return;
    }
    if (!editorBaseScale) {
        fitEditorToScreen();
        editorRafId = requestAnimationFrame(renderEditorFrame);
        return;
    }
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(editorSnapshot, 0, 0);
    const { x, y, w, h } = cropRect;
    const lw = Math.max(1, 1.5 / editorScale);
    const hs = Math.max(12, 22 / editorScale); // corner bracket arm length
    // dim outside crop area
    editorCtx.fillStyle = 'rgba(0,0,0,0.45)';
    editorCtx.fillRect(0, 0, editorCanvas.width, y);
    editorCtx.fillRect(0, y + h, editorCanvas.width, editorCanvas.height - y - h);
    editorCtx.fillRect(0, y, x, h);
    editorCtx.fillRect(x + w, y, editorCanvas.width - x - w, h);
    editorCtx.save();
    editorCtx.shadowColor = 'rgba(0,0,0,0.85)';
    editorCtx.shadowBlur = Math.max(3, 6 / editorScale);
    // thin border
    editorCtx.strokeStyle = 'rgba(255,140,0,0.9)';
    editorCtx.lineWidth = lw;
    editorCtx.strokeRect(x, y, w, h);
    // corner brackets
    editorCtx.strokeStyle = '#ff8c00';
    editorCtx.lineWidth = Math.max(2, 3.5 / editorScale);
    editorCtx.lineCap = 'square';
    const corners = [
        [x, y, hs, 0, 0, hs],
        [x + w, y, -hs, 0, 0, hs],
        [x, y + h, hs, 0, 0, -hs],
        [x + w, y + h, -hs, 0, 0, -hs],
    ];
    corners.forEach(([cx, cy, dx1, dy1, dx2, dy2]) => {
        editorCtx.beginPath();
        editorCtx.moveTo(cx + dx1, cy + dy1);
        editorCtx.lineTo(cx, cy);
        editorCtx.lineTo(cx + dx2, cy + dy2);
        editorCtx.stroke();
    });
    // edge handles (small filled squares)
    const es = Math.max(5, 8 / editorScale);
    editorCtx.fillStyle = '#ff8c00';
    [[x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]].forEach(([hx, hy]) => {
        editorCtx.fillRect(hx - es / 2, hy - es / 2, es, es);
    });
    editorCtx.restore();
    editorRafId = requestAnimationFrame(renderEditorFrame);
}
function zoomEditorAt(clientX, clientY, factor) {
    if (!editorBaseScale || !editorScale)
        return;
    const wrap = document.getElementById('img-editor-canvas-wrap');
    const rect = wrap.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const newScale = Math.max(0.02, Math.min(10, editorScale * factor));
    editorPanX = cx - (cx - editorPanX) * (newScale / editorScale);
    editorPanY = cy - (cy - editorPanY) * (newScale / editorScale);
    editorScale = newScale;
    applyEditorViewport();
}
function startEditorPan(e) {
    editorIsPanning = true;
    editorStartX = e.clientX;
    editorStartY = e.clientY;
    editorStartPanX = editorPanX;
    editorStartPanY = editorPanY;
    applyEditorViewport();
}
function editorClientToCanvas(e) {
    const rect = editorCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const sx = rect.width > 0 ? editorCanvas.width / rect.width : 1;
    const sy = rect.height > 0 ? editorCanvas.height / rect.height : 1;
    return {
        x: Math.round((src.clientX - rect.left) * sx),
        y: Math.round((src.clientY - rect.top) * sy),
    };
}
function getCropHandle(pt) {
    const { x, y, w, h } = cropRect;
    const r = Math.max(18, 28 / editorScale);
    const hits = {
        tl: [x, y], tr: [x + w, y],
        bl: [x, y + h], br: [x + w, y + h],
        tm: [x + w / 2, y], bm: [x + w / 2, y + h],
        lm: [x, y + h / 2], rm: [x + w, y + h / 2],
    };
    for (const [name, [hx, hy]] of Object.entries(hits)) {
        if (Math.abs(pt.x - hx) < r && Math.abs(pt.y - hy) < r)
            return name;
    }
    return null;
}
function moveCropHandle(handle, pt) {
    const MIN = 20;
    let { x, y, w, h } = cropRect;
    const cW = editorCanvas.width, cH = editorCanvas.height;
    if (handle === 'tl' || handle === 'lm' || handle === 'bl') {
        const nx = Math.max(0, Math.min(pt.x, x + w - MIN));
        w += x - nx;
        x = nx;
    }
    if (handle === 'tr' || handle === 'rm' || handle === 'br') {
        w = Math.max(MIN, Math.min(pt.x - x, cW - x));
    }
    if (handle === 'tl' || handle === 'tm' || handle === 'tr') {
        const ny = Math.max(0, Math.min(pt.y, y + h - MIN));
        h += y - ny;
        y = ny;
    }
    if (handle === 'bl' || handle === 'bm' || handle === 'br') {
        h = Math.max(MIN, Math.min(pt.y - y, cH - y));
    }
    cropRect = { x, y, w, h };
}
function eraseAt(from, to) {
    editorCtx.save();
    editorCtx.strokeStyle = 'white';
    editorCtx.lineWidth = eraseBrushSize;
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';
    editorCtx.beginPath();
    editorCtx.moveTo(from.x, from.y);
    editorCtx.lineTo(to.x, to.y);
    editorCtx.stroke();
    editorCtx.restore();
}
function editorPointerDown(e) {
    if (editorCropper)
        return;
    e.preventDefault();
    editorCanvas.setPointerCapture(e.pointerId);
    activeEditorPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activeEditorPointers.size >= 2) {
        // entering pinch mode — cancel any active tool operation
        editorIsPinching = true;
        erasePointerDown = false;
        eraseLastPt = null;
        activeCropHandle = null;
        const pts = [...activeEditorPointers.values()];
        const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
        editorPinchDist = Math.sqrt(dx * dx + dy * dy);
        editorPinchMidX = (pts[0].x + pts[1].x) / 2;
        editorPinchMidY = (pts[0].y + pts[1].y) / 2;
        return;
    }
    if (editorIsPinching)
        return;
    const pt = editorClientToCanvas(e);
    editorDragMode = null;
    if (editorTool === 'crop') {
        activeCropHandle = getCropHandle(pt);
        if (activeCropHandle) {
            editorDragMode = 'crop';
        }
        else {
            startEditorPan(e);
            editorDragMode = 'pan';
        }
    }
    else if (editorTool === 'erase') {
        erasePointerDown = true;
        editorPushUndo();
        eraseLastPt = pt;
        eraseAt(pt, pt);
        editorDragMode = 'erase';
    }
    else {
        startEditorPan(e);
        editorDragMode = 'pan';
    }
}
function editorPointerMove(e) {
    if (editorCropper)
        return;
    e.preventDefault();
    activeEditorPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activeEditorPointers.size >= 2 && editorIsPinching) {
        const pts = [...activeEditorPointers.values()];
        const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        if (editorPinchDist > 0) {
            zoomEditorAt(midX, midY, dist / editorPinchDist);
        }
        editorPinchDist = dist;
        editorPinchMidX = midX;
        editorPinchMidY = midY;
        return;
    }
    if (editorIsPinching)
        return;
    if (editorDragMode === 'crop' && activeCropHandle) {
        const pt = editorClientToCanvas(e);
        moveCropHandle(activeCropHandle, pt);
    }
    else if (editorDragMode === 'erase' && erasePointerDown) {
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of events) {
            const pt = editorClientToCanvas(ev);
            eraseAt(eraseLastPt, pt);
            eraseLastPt = pt;
        }
    }
    else if (editorDragMode === 'pan' && editorIsPanning) {
        editorPanX = editorStartPanX + (e.clientX - editorStartX);
        editorPanY = editorStartPanY + (e.clientY - editorStartY);
        applyEditorViewport();
    }
}
function editorPointerUp(e) {
    if (editorCropper)
        return;
    if (e && editorCanvas.hasPointerCapture(e.pointerId)) {
        editorCanvas.releasePointerCapture(e.pointerId);
    }
    activeEditorPointers.delete(e.pointerId);
    if (editorIsPinching) {
        if (activeEditorPointers.size === 0) {
            editorIsPinching = false;
            editorPinchDist = null;
        }
        return;
    }
    if (editorDragMode === 'crop') {
        activeCropHandle = null;
    }
    else if (editorDragMode === 'erase' && erasePointerDown) {
        erasePointerDown = false;
        eraseLastPt = null;
    }
    editorIsPanning = false;
    editorDragMode = null;
    applyEditorViewport();
}
function editorPushUndo() {
    const sourceCanvas = editorSnapshot || editorCanvas;
    editorUndoStack.push(sourceCanvas.toDataURL('image/jpeg', 0.8));
    if (editorUndoStack.length > 10)
        editorUndoStack.shift();
    document.getElementById('img-editor-undo').disabled = false;
}
function rotateCanvas90(direction) {
    if (editorCropper)
        return;
    stopCropPreview({ restoreCanvas: true, clearSnapshot: true });
    editorPushUndo();
    const w = editorCanvas.width, h = editorCanvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = h;
    tmp.height = w;
    const tctx = tmp.getContext('2d');
    tctx.translate(h / 2, w / 2);
    tctx.rotate(direction * Math.PI / 2);
    tctx.drawImage(editorCanvas, -w / 2, -h / 2);
    editorCanvas.width = h;
    editorCanvas.height = w;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(tmp, 0, 0);
    fitEditorToScreen();
    if (editorTool === 'crop')
        setEditorTool('crop');
}
