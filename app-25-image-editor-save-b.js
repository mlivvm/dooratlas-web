async function saveEditorChanges({ confirmedOutsideDoors = false } = {}) {
    if (editorSaving)
        return;
    const fp = getCurrentFloorplanObj();
    if (!fp) {
        showToast('Geen plattegrond geselecteerd', 'error');
        return;
    }
    const rotatedPlan = normalizeEditorRotation(editorCropRotation) ? getRotatedCropSavePlan() : null;
    const plan = rotatedPlan || getCropSavePlan();
    if (!plan) {
        showToast('Geen geldige uitsnede', 'error');
        return;
    }
    if (plan.outsideDoorCodes.length && !confirmedOutsideDoors) {
        showCropOutsideConfirm(plan.outsideDoorCodes, () => saveEditorChanges({ confirmedOutsideDoors: true }));
        return;
    }
    const btnSave = document.getElementById('img-editor-save');
    btnSave.disabled = true;
    btnSave.textContent = 'Opslaan...';
    editorSaving = true;
    appMode.enter(AppModes.IMAGE_EDITOR_SAVING);
    busyOverlay.show({
        title: 'Afbeelding opslaan',
        subtitle: 'Bewerkte plattegrond wordt opgeslagen...',
    });
    let imageResult = null;
    let svgTextForSave = '';
    try {
        const outputCanvas = editorCropper.getCroppedCanvas({
            width: Math.max(1, Math.round(plan.cropW)),
            height: Math.max(1, Math.round(plan.cropH)),
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        const fileUrl = CONFIG.svgUploadsUrl + encodeURIComponent(fp.file);
        const saveTargets = [
            FD.ImageEditorService.MAX_IMAGE_EDITOR_DATA_URL_LENGTH || 1560000,
            1120000,
            1040000,
            900000,
        ];
        let updateResult = null;
        let lastSaveError = null;
        for (let attempt = 0; attempt < saveTargets.length; attempt += 1) {
            const maxLength = saveTargets[attempt];
            imageResult = {
                ...FD.ImageEditorService.canvasToLimitedJPEGResult(outputCanvas, { maxLength }),
                maxLength,
                attempt: attempt + 1,
            };
            svgTextForSave = buildEditorSaveSVG({
                imageDataUrl: imageResult.dataUrl,
                rotatedPlan,
                plan,
            });
            try {
                updateResult = await FD.DataService.saveFloorplanSVG(fileUrl, svgTextForSave, {
                    config: CONFIG,
                    customerName: currentCustomer,
                    floorplanName: currentFloorplan,
                    message: 'Afbeelding bewerkt: ' + currentCustomer + ' - ' + currentFloorplan,
                    fetchErrorMessage: 'Kon bestand niet ophalen ({status})',
                    saveErrorMessage: 'Opslaan mislukt ({status})',
                });
                lastSaveError = null;
                break;
            }
            catch (err) {
                lastSaveError = err;
                if (attempt >= saveTargets.length - 1 || !isRetryableEditorSaveSizeError(err))
                    throw err;
                busyOverlay.update({
                    title: 'Afbeelding verkleinen',
                    subtitle: 'Bestand is te groot voor opslaan; kleinere versie wordt geprobeerd...',
                });
            }
        }
        if (!updateResult)
            throw lastSaveError || new Error('Opslaan mislukt');
        await updateCachedSVGAfterSave(fileUrl, updateResult, svgTextForSave);
        btnSave.textContent = 'Bijwerken...';
        busyOverlay.update({
            title: 'Plattegrond bijwerken',
            subtitle: 'Nieuwe versie wordt geladen...',
        });
        const { customerIndex, floorplanIndex, floorplan } = getSelectedFloorplan();
        if (customerIndex !== null && floorplanIndex !== null && floorplan) {
            await loadFloorplan(customerIndex, floorplanIndex);
        }
        closeImageEditor();
        showToast('Afbeelding opgeslagen', 'success');
    }
    catch (err) {
        const duplicateMessage = duplicateDoorCodeMessage(err);
        editorSaving = false;
        if (appMode.is(AppModes.IMAGE_EDITOR_SAVING))
            appMode.enter(AppModes.IMAGE_EDITOR);
        btnSave.disabled = false;
        btnSave.textContent = '\uD83D\uDCBE Opslaan';
        busyOverlay.hide();
        showImageEditorSaveError(duplicateMessage ? new Error(duplicateMessage) : err, {
            fp,
            plan,
            imageResult,
            svgText: svgTextForSave,
        });
    }
    finally {
        if (!editorSaving || !appMode.is(AppModes.IMAGE_EDITOR_SAVING)) {
            busyOverlay.hide();
        }
    }
}
// Editor cancel confirmation popup
const editorCancelOverlay = document.getElementById('editor-cancel-overlay');
const editorCancelPopup = document.getElementById('editor-cancel-popup');
function showEditorCancelConfirm() {
    editorCancelOverlay.style.display = 'block';
    editorCancelPopup.style.display = 'block';
}
function hideEditorCancelConfirm() {
    editorCancelOverlay.style.display = 'none';
    editorCancelPopup.style.display = 'none';
}
// Event wiring — editor
btnEditImage.addEventListener('click', openImageEditor);
document.getElementById('img-editor-cancel').addEventListener('click', () => {
    if (editorUndoStack.length > 0) {
        showEditorCancelConfirm();
    }
    else {
        closeImageEditor();
    }
});
document.getElementById('editor-cancel-confirm').addEventListener('click', () => {
    hideEditorCancelConfirm();
    closeImageEditor();
});
document.getElementById('editor-cancel-back').addEventListener('click', hideEditorCancelConfirm);
editorCancelOverlay.addEventListener('click', hideEditorCancelConfirm);
document.getElementById('crop-outside-cancel').addEventListener('click', hideCropOutsideConfirm);
document.getElementById('crop-outside-overlay').addEventListener('click', hideCropOutsideConfirm);
document.getElementById('crop-outside-confirm').addEventListener('click', () => {
    const next = pendingCropSave;
    hideCropOutsideConfirm();
    if (next)
        next();
});
imageEditorSaveErrorClose?.addEventListener('click', hideImageEditorSaveError);
imageEditorSaveErrorOverlay?.addEventListener('click', hideImageEditorSaveError);
imageEditorSaveErrorCopy?.addEventListener('click', copyImageEditorSaveErrorDetails);
document.getElementById('img-editor-undo').addEventListener('click', editorUndo);
document.getElementById('img-editor-tool-pan').addEventListener('click', () => setEditorTool('pan'));
document.getElementById('img-editor-tool-crop').addEventListener('click', () => showToast('Sleep de hoeken om de uitsnede aan te passen', 'success'));
document.getElementById('img-editor-tool-erase').addEventListener('click', () => setEditorTool('erase'));
document.getElementById('img-editor-tool-rotate-left').addEventListener('click', () => rotateEditorImage90(-1));
document.getElementById('img-editor-tool-rotate-right').addEventListener('click', () => rotateEditorImage90(1));
document.getElementById('img-editor-apply-crop').addEventListener('click', applyEditorCrop);
document.getElementById('img-editor-save').addEventListener('click', saveEditorChanges);
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (document.getElementById('img-editor-overlay').style.display !== 'none') {
            e.preventDefault();
            editorUndo();
        }
    }
});
document.getElementById('img-editor-brush-slider').addEventListener('input', (e) => {
    eraseBrushSize = parseInt(e.target.value, 10);
    document.getElementById('img-editor-brush-val').textContent = String(eraseBrushSize);
});
editorStage = document.getElementById('img-editor-stage');
editorCanvas = document.getElementById('img-editor-canvas');
editorCanvas.addEventListener('pointerdown', editorPointerDown, { passive: false });
editorCanvas.addEventListener('pointermove', editorPointerMove, { passive: false });
editorCanvas.addEventListener('pointerup', editorPointerUp);
editorCanvas.addEventListener('pointercancel', editorPointerUp);
editorCanvas.addEventListener('lostpointercapture', () => {
    editorIsPanning = false;
    editorDragMode = null;
    erasePointerDown = false;
    eraseLastPt = null;
    activeCropHandle = null;
    applyEditorViewport();
});
document.getElementById('img-editor-canvas-wrap').addEventListener('wheel', (e) => {
    if (editorCropper)
        return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomEditorAt(e.clientX, e.clientY, factor);
}, { passive: false });
window.addEventListener('resize', () => {
    if (document.getElementById('img-editor-overlay').style.display !== 'none') {
        if (editorCropper)
            return;
        fitEditorToScreen();
    }
});
