function rotateEditorImage90(direction) {
    if (editorCropper) {
        editorCropRotation = (editorCropRotation + direction * 90 + 360) % 360;
        resetEditorCropperToRotation();
        return;
    }
    rotateCanvas90(direction);
}
function editorUndo() {
    if (editorCropper)
        return;
    if (!editorUndoStack.length)
        return;
    stopCropPreview({ restoreCanvas: false, clearSnapshot: true });
    erasePointerDown = false;
    eraseLastPt = null;
    const dataUrl = editorUndoStack.pop();
    const img = new Image();
    img.onload = () => {
        editorCanvas.width = img.naturalWidth;
        editorCanvas.height = img.naturalHeight;
        editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
        editorCtx.drawImage(img, 0, 0);
        fitEditorToScreen();
        if (editorTool === 'crop')
            setEditorTool('crop');
    };
    img.src = dataUrl;
    document.getElementById('img-editor-undo').disabled = editorUndoStack.length === 0;
}
function applyEditorCrop() {
    if (editorCropper)
        return;
    if (!cropRect)
        return;
    const { x, y, w, h } = cropRect;
    if (w < 10 || h < 10)
        return;
    editorPushUndo();
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d').drawImage(editorSnapshot, x, y, w, h, 0, 0, w, h);
    editorCanvas.width = w;
    editorCanvas.height = h;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(tmp, 0, 0);
    fitEditorToScreen();
    document.getElementById('img-editor-apply-crop').style.display = 'none';
    setEditorTool('pan');
    showToast('Uitsnede toegepast', 'success');
}
function getCropSavePlan() {
    if (!editorCropper || !editorCropContext)
        return null;
    const cropData = editorCropper.getData(true);
    const imageData = editorCropper.getImageData();
    const naturalWidth = imageData.naturalWidth || document.getElementById('img-editor-crop-image').naturalWidth;
    const naturalHeight = imageData.naturalHeight || document.getElementById('img-editor-crop-image').naturalHeight;
    return FD.ImageEditorService.buildCropSavePlan({
        cropData,
        naturalWidth,
        naturalHeight,
        cropContext: editorCropContext,
        markers: svgContainer.querySelectorAll('[data-door-id]'),
    });
}
function rotatedEditorPoint(relX, relY, rotation) {
    const width = editorCropContext.imgW;
    const height = editorCropContext.imgH;
    if (rotation === 90)
        return { x: height - relY, y: relX };
    if (rotation === 180)
        return { x: width - relX, y: height - relY };
    if (rotation === 270)
        return { x: relY, y: width - relX };
    return { x: relX, y: relY };
}
function markerRadii(marker, rotation) {
    const r = parseFloat(marker.getAttribute('r'));
    const rxAttr = parseFloat(marker.getAttribute('rx'));
    const ryAttr = parseFloat(marker.getAttribute('ry'));
    let rx = Number.isFinite(rxAttr) ? rxAttr : (Number.isFinite(r) ? r : 0);
    let ry = Number.isFinite(ryAttr) ? ryAttr : (Number.isFinite(r) ? r : rx);
    if (rotation === 90 || rotation === 270)
        [rx, ry] = [ry, rx];
    return { rx, ry };
}
function rotatedEditorMarkerPlacement(marker, plan) {
    const position = FD.MarkerService.markerPosition(marker);
    if (!position)
        return null;
    const relX = position.x - editorCropContext.imgX;
    const relY = position.y - editorCropContext.imgY;
    const rotated = rotatedEditorPoint(relX, relY, plan.rotation);
    const radii = markerRadii(marker, plan.rotation);
    return {
        x: rotated.x,
        y: rotated.y,
        rx: radii.rx,
        ry: radii.ry,
    };
}
function markerFitsRotatedPlan(marker, plan) {
    const placement = rotatedEditorMarkerPlacement(marker, plan);
    if (!placement)
        return false;
    return placement.x - placement.rx >= plan.cropX &&
        placement.x + placement.rx <= plan.cropX + plan.cropW &&
        placement.y - placement.ry >= plan.cropY &&
        placement.y + placement.ry <= plan.cropY + plan.cropH;
}
function getRotatedCropSavePlan() {
    if (!editorCropper || !editorCropContext)
        return null;
    const cropData = editorCropper.getData(true);
    const rotation = normalizeEditorRotation(cropData.rotate || editorCropRotation);
    if (!rotation)
        return null;
    const imageData = editorCropper.getImageData();
    const naturalWidth = imageData.naturalWidth || document.getElementById('img-editor-crop-image').naturalWidth;
    const naturalHeight = imageData.naturalHeight || document.getElementById('img-editor-crop-image').naturalHeight;
    if (!naturalWidth || !naturalHeight || cropData.width < 10 || cropData.height < 10)
        return null;
    const rotatedNaturalWidth = rotation === 90 || rotation === 270 ? naturalHeight : naturalWidth;
    const rotatedNaturalHeight = rotation === 90 || rotation === 270 ? naturalWidth : naturalHeight;
    const rotatedSvgWidth = rotation === 90 || rotation === 270 ? editorCropContext.imgH : editorCropContext.imgW;
    const rotatedSvgHeight = rotation === 90 || rotation === 270 ? editorCropContext.imgW : editorCropContext.imgH;
    const scaleX = rotatedSvgWidth / rotatedNaturalWidth;
    const scaleY = rotatedSvgHeight / rotatedNaturalHeight;
    const cropX = cropData.x * scaleX;
    const cropY = cropData.y * scaleY;
    const cropW = cropData.width * scaleX;
    const cropH = cropData.height * scaleY;
    const plan = { cropData, rotation, cropX, cropY, cropW, cropH, outsideDoorCodes: [] };
    Array.from(svgContainer.querySelectorAll('[data-door-id]')).forEach(marker => {
        if (!markerFitsRotatedPlan(marker, plan)) {
            plan.outsideDoorCodes.push(FD.ImageEditorService.markerDoorCode(marker));
        }
    });
    return plan;
}
function buildRotatedEditorSVGText({ imageDataUrl, plan }) {
    if (!editorCropContext?.svgEl || !imageDataUrl || !plan) {
        throw new Error('Rotatie-save data is incompleet.');
    }
    const width = Math.max(1, Math.round(plan.cropW));
    const height = Math.max(1, Math.round(plan.cropH));
    const svgClone = editorCropContext.svgEl.cloneNode(true);
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    const cloneImage = svgClone.querySelector('image');
    if (!cloneImage)
        throw new Error('Afbeelding ontbreekt in plattegrond.');
    cloneImage.setAttribute('href', imageDataUrl);
    cloneImage.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
    cloneImage.setAttribute('x', '0');
    cloneImage.setAttribute('y', '0');
    cloneImage.setAttribute('width', width.toString());
    cloneImage.setAttribute('height', height.toString());
    svgClone.querySelectorAll('[data-fd-label]').forEach(el => el.remove());
    svgClone.querySelectorAll('[data-door-id]').forEach(marker => {
        const placement = rotatedEditorMarkerPlacement(marker, plan);
        if (!placement || !markerFitsRotatedPlan(marker, plan)) {
            marker.remove();
            return;
        }
        FD.MarkerService.setMarkerPosition(marker, placement.x - plan.cropX, placement.y - plan.cropY);
        if ((plan.rotation === 90 || plan.rotation === 270) && marker.hasAttribute('rx') && marker.hasAttribute('ry')) {
            const oldRx = marker.getAttribute('rx');
            marker.setAttribute('rx', marker.getAttribute('ry'));
            marker.setAttribute('ry', oldRx);
        }
        FD.MarkerService.clearRuntimeMarkerState(marker);
    });
    return new XMLSerializer().serializeToString(svgClone);
}
function showCropOutsideConfirm(codes, onConfirm) {
    pendingCropSave = onConfirm;
    document.getElementById('crop-outside-codes').textContent = codes.join(', ');
    document.getElementById('crop-outside-overlay').style.display = 'block';
    document.getElementById('crop-outside-popup').style.display = 'block';
}
function hideCropOutsideConfirm() {
    const overlay = document.getElementById('crop-outside-overlay');
    const popup = document.getElementById('crop-outside-popup');
    if (overlay)
        overlay.style.display = 'none';
    if (popup)
        popup.style.display = 'none';
    pendingCropSave = null;
}
function formatEditorSaveSize(length) {
    const value = Number(length || 0);
    if (!Number.isFinite(value) || value <= 0)
        return 'onbekend';
    return `${value.toLocaleString('nl-NL')} tekens`;
}
function imageEditorSaveUserMessage(err) {
    const code = String(err?.code || '').toLowerCase();
    const status = Number(err?.status || 0);
    if (code === 'image_editor_too_large' || code === 'invalid_svg' || code === 'invalid_request_body' || status === 413 || status === 400) {
        return 'Deze plattegrond is te groot om op te slaan. Probeer een iets kleinere uitsnede of meld dit bij Mark.';
    }
    return 'Deze plattegrond kon niet worden opgeslagen. Probeer het opnieuw of meld dit bij Mark.';
}
function buildImageEditorSaveErrorDetails(err, { fp, plan, imageResult, svgText, } = {}) {
    const lines = [
        `Klant: ${currentCustomer || '-'}`,
        `Plattegrond: ${currentFloorplan || '-'}`,
        `Bestand: ${fp?.file || '-'}`,
        `Repo: ${fp?.repo || 'uploads'}`,
        `Geschatte JPEG-grootte: ${formatEditorSaveSize(err?.estimatedLength || imageResult?.dataUrl?.length)}`,
        `SVG-grootte: ${formatEditorSaveSize(svgText?.length)}`,
        `Limiet JPEG: ${formatEditorSaveSize(err?.maxLength || FD.ImageEditorService?.MAX_IMAGE_EDITOR_DATA_URL_LENGTH)}`,
        `Uitsnede: ${Math.round(plan?.cropW || 0)} x ${Math.round(plan?.cropH || 0)}`,
        `Output: ${imageResult?.width || err?.width || '-'} x ${imageResult?.height || err?.height || '-'}`,
        `Schaal: ${imageResult?.scale || err?.scale || '-'}`,
        `Kwaliteit: ${imageResult?.quality || err?.quality || '-'}`,
        `Poginglimiet: ${formatEditorSaveSize(imageResult?.maxLength || err?.maxLength)}`,
        `Pogingen: ${imageResult?.attempt || err?.attempt || '-'}`,
        `Foutcode: ${err?.code || err?.message || 'unknown'}`,
        `HTTP-status: ${err?.status || '-'}`,
        `Appversie: ${APP_VERSION}`,
    ];
    return lines.join('\n');
}
function showImageEditorSaveError(err, context = {}) {
    imageEditorSaveErrorDetailsText = buildImageEditorSaveErrorDetails(err, context);
    if (imageEditorSaveErrorMessage) {
        imageEditorSaveErrorMessage.textContent = imageEditorSaveUserMessage(err);
    }
    if (imageEditorSaveErrorDetails) {
        imageEditorSaveErrorDetails.textContent = imageEditorSaveErrorDetailsText;
    }
    imageEditorSaveErrorDialog.show();
}
function hideImageEditorSaveError() {
    imageEditorSaveErrorDialog.hide();
}
async function copyImageEditorSaveErrorDetails() {
    if (!imageEditorSaveErrorDetailsText)
        return;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(imageEditorSaveErrorDetailsText);
        }
        else {
            const textarea = document.createElement('textarea');
            textarea.value = imageEditorSaveErrorDetailsText;
            textarea.setAttribute('readonly', 'readonly');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        showToast('Details gekopieerd', 'success');
    }
    catch {
        showToast('Kopiëren lukt niet', 'error');
    }
}
function isRetryableEditorSaveSizeError(err) {
    const code = String(err?.code || '').toLowerCase();
    const status = Number(err?.status || 0);
    return code === 'invalid_request_body' ||
        code === 'invalid_svg' ||
        code === 'image_editor_too_large' ||
        status === 413 ||
        status === 400;
}
function buildEditorSaveSVG({ imageDataUrl, rotatedPlan, plan }) {
    return rotatedPlan ? buildRotatedEditorSVGText({
        imageDataUrl,
        plan: rotatedPlan,
    }) : FD.ImageEditorService.buildCroppedSVGText({
        svgEl: editorCropContext.svgEl,
        imageDataUrl,
        plan,
        markerService: FD.MarkerService,
    });
}
