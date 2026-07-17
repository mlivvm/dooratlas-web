(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.UploadPdfState;
    const Ui = FD.UploadPdfUi;
    const Form = FD.UploadPdfForm;
    function createPdfHandlers(ctx) {
        const { elements, controls, modeController, modes, getPdfJsLib, ensureSession, onSave, onSaved, showToast } = ctx;
        async function handlePdfChange(event) {
            const file = event.target.files[0];
            if (!file)
                return;
            if (file.size > Core.MAX_PDF_UPLOAD_BYTES) {
                event.target.value = '';
                if (elements.selectedFileEl)
                    elements.selectedFileEl.textContent = 'Nog geen bestanden gekozen';
                showToast('PDF is te groot (max 50 MB)', 'error');
                return;
            }
            try {
                await Core.validatePdfUploadFile(file);
            }
            catch (err) {
                event.target.value = '';
                if (elements.selectedFileEl)
                    elements.selectedFileEl.textContent = 'Nog geen bestanden gekozen';
                showToast(err.message, 'error');
                return;
            }
            const pdfjsLib = getPdfJsLib();
            if (!pdfjsLib) {
                event.target.value = '';
                if (elements.selectedFileEl)
                    elements.selectedFileEl.textContent = 'Nog geen bestanden gekozen';
                showToast('PDF library niet geladen. Gebruik een foto.', 'error');
                return;
            }
            const runGeneration = ctx.nextGeneration();
            const uploadContext = elements.pdfState.uploadContext;
            Ui.resetPdfState(elements);
            elements.pdfState.uploadContext = uploadContext;
            if (elements.selectedFileEl)
                elements.selectedFileEl.textContent = file.name;
            Ui.showPdfProcessing(elements, controls, file.name);
            try {
                const pdfService = FD.PdfImportService;
                const pdf = await pdfService.loadPdfDocument(pdfjsLib, file);
                if (!ctx.isGenerationCurrent(runGeneration))
                    return;
                elements.pdfState.file = file;
                elements.pdfState.pdf = pdf;
                elements.pdfState.nextItemId = 1;
                elements.pdfState.pages = Array.from({ length: pdf.numPages }, (_, index) => (Pdf.createPdfPageItem(elements.pdfState, {
                    sourcePageNumber: index + 1,
                    copyIndex: 1,
                    sourceKey: `legacy:${file.name}:${index + 1}`,
                    sourceFileKey: `legacy:${file.name}`,
                    sourceFileName: file.name,
                    sourceType: 'pdf',
                    pdfDocument: pdf,
                    batchIndex: index + 1,
                })));
                Core.hide(elements.pdfProcessing);
                Core.show(elements.pdfOverview, 'flex');
                Ui.renderPdfPages(elements);
                for (let index = 0; index < elements.pdfState.pages.length; index++) {
                    const page = elements.pdfState.pages[index];
                    if (!ctx.isGenerationCurrent(runGeneration))
                        return;
                    try {
                        const thumb = await pdfService.renderPdfPageToCanvas(pdf, Pdf.pdfSourcePageNumber(page), { scale: pdfService.THUMB_RENDER_SCALE });
                        page.thumbnailDataUrl = thumb.canvas.toDataURL('image/jpeg', 0.7);
                        page.status = 'ready';
                    }
                    catch {
                        page.status = 'error';
                        page.error = 'Voorbeeld mislukt';
                    }
                    Ui.updatePdfPageCard(elements, page);
                    if (index >= 5)
                        await Core.browserYield();
                }
            }
            catch (err) {
                if (!ctx.isGenerationCurrent(runGeneration))
                    return;
                Ui.resetPdfState(elements);
                Core.setPdfImportLayout(controls, false);
                controls.fileInput.value = '';
                ctx.showFileStep();
                showToast(err.message || 'PDF kon niet worden geladen', 'error');
            }
        }
        async function ensurePdfPageUploadImage(page) {
            if (page.editDataUrl && page.outputWidth && page.outputHeight) {
                return { dataUrl: page.editDataUrl, width: page.outputWidth, height: page.outputHeight };
            }
            const pdfService = FD.PdfImportService;
            const pdfDocument = page.pdfDocument || elements.pdfState.pdf;
            const result = await pdfService.renderPdfPageToCanvas(pdfDocument, Pdf.pdfSourcePageNumber(page), { scale: pdfService.UPLOAD_RENDER_SCALE });
            const uploadImage = pdfService.uploadJPEGResult(result.canvas, {
                errorMessage: `${Pdf.pdfPageLabel(page)} is te groot. Crop de pagina kleiner of probeer een lagere kwaliteit PDF.`,
            });
            page.outputWidth = uploadImage.width;
            page.outputHeight = uploadImage.height;
            return { dataUrl: uploadImage.dataUrl, width: uploadImage.width, height: uploadImage.height };
        }
        function restoreActivePdfEditorState() {
            const state = elements.pdfState;
            if (!state.activePage)
                return;
            state.activePage.cropData = Pdf.clonePdfCropData(state.activeOriginalCropData);
        }
        function clearActivePdfEditorState() {
            const state = elements.pdfState;
            state.activePage = null;
            state.activeOriginalCropData = null;
            state.activeEditorPreviewMeta = null;
            state.activeEditorSource = '';
            state.pdfEditorRotation = 0;
        }
        function showPdfOverview({ discardEditorChanges = true } = {}) {
            if (discardEditorChanges)
                restoreActivePdfEditorState();
            Pdf.destroyPdfCropper(elements.pdfState);
            clearActivePdfEditorState();
            Ui.setPdfUploadProgress(elements, { visible: false, value: 0 });
            Core.hide(elements.pdfProcessing);
            Core.hide(elements.pdfEditor);
            Core.hide(elements.pdfForm);
            Core.show(elements.pdfOverview, 'flex');
            elements.pdfTitle.textContent = "Bestanden en pagina's kiezen";
            elements.pdfErrorEl.textContent = '';
            Ui.renderPdfPages(elements);
        }
        function zoomActivePdfPage(multiplier) {
            const state = elements.pdfState;
            if (!state.cropper || !state.activePage)
                return;
            const cropData = state.activePage.cropData || Pdf.currentPdfCropData(state, elements) || Pdf.fullPdfCropData(state.cropper, elements.pdfEditorImg);
            const currentRatio = Pdf.currentPdfZoomRatio(state);
            const fitRatio = state.pdfFitZoomRatio || currentRatio || 1;
            if (!currentRatio)
                return;
            const targetRatio = Math.max(fitRatio, Math.min(fitRatio * 5, currentRatio * multiplier));
            state.activePage.cropData = cropData;
            state.suppressCropSync = true;
            Pdf.clearPdfCropCommitTimers(state);
            if (state.suppressCropSyncTimer)
                clearTimeout(state.suppressCropSyncTimer);
            if (targetRatio < currentRatio)
                Pdf.relaxPdfCropBoxForZoomOut(state);
            state.cropper.zoomTo(targetRatio);
            Pdf.restorePdfCropAfterViewportChange(state, elements, cropData);
        }
        function fitActivePdfPage() {
            const state = elements.pdfState;
            if (!state.cropper || !state.activePage)
                return;
            const cropData = state.activePage.cropData || Pdf.currentPdfCropData(state, elements) || Pdf.fullPdfCropData(state.cropper, elements.pdfEditorImg);
            state.activePage.cropData = cropData;
            state.suppressCropSync = true;
            Pdf.clearPdfCropCommitTimers(state);
            if (state.suppressCropSyncTimer)
                clearTimeout(state.suppressCropSyncTimer);
            state.cropper.reset();
            if (state.pdfEditorRotation && typeof state.cropper.rotateTo === 'function')
                state.cropper.rotateTo(state.pdfEditorRotation);
            Pdf.fitPdfCropperCanvas(state);
            Pdf.applyPdfCropBoxFromData(state, cropData);
            state.pdfFitZoomRatio = Pdf.currentPdfZoomRatio(state);
            state.activePage.cropData = cropData;
            Pdf.setPdfEditorDataset(elements, state);
            requestAnimationFrame(() => {
                if (!state.cropper || !state.activePage)
                    return;
                Pdf.applyPdfCropBoxFromData(state, cropData);
                state.activePage.cropData = cropData;
                Pdf.setPdfEditorDataset(elements, state);
                state.suppressCropSyncTimer = setTimeout(() => {
                    if (state.cropper && state.activePage) {
                        Pdf.applyPdfCropBoxFromData(state, cropData);
                        state.activePage.cropData = cropData;
                        Pdf.setPdfEditorDataset(elements, state);
                    }
                    state.suppressCropSync = false;
                    state.suppressCropSyncTimer = null;
                }, 140);
            });
        }
        async function openPdfEditor(itemId) {
            const CropperClass = global.Cropper;
            if (typeof CropperClass === 'undefined') {
                showToast('Crop-tool kon niet worden geladen', 'error');
                return;
            }
            const state = elements.pdfState;
            const page = state.pages.find((item) => item.itemId === itemId || String(item.pageNumber) === String(itemId));
            if (!page)
                return;
            const pageLabel = Pdf.pdfPageLabel(page);
            const runId = ++state.activeEditorRun;
            state.activePage = page;
            state.pdfEditorRotation = 0;
            state.activeOriginalCropData = Pdf.clonePdfCropData(page.cropData);
            state.activeEditorPreviewMeta = null;
            state.activeEditorSource = '';
            state.suppressCropSync = false;
            Pdf.destroyPdfCropper(state);
            Core.hide(elements.pdfOverview);
            Core.hide(elements.pdfForm);
            Core.show(elements.pdfEditor, 'flex');
            elements.pdfTitle.textContent = `${pageLabel} bewerken`;
            elements.pdfSummary.textContent = 'Crop of roteer de pagina en sla daarna op.';
            elements.pdfEditorTitle.textContent = pageLabel;
            elements.pdfEditorSaveButton.disabled = true;
            elements.pdfEditorSaveButton.textContent = 'Laden...';
            Ui.setPdfEditorLoading(elements, true);
            await loadPdfEditorImage(CropperClass, runId, page, pageLabel);
        }
        async function loadPdfEditorImage(CropperClass, runId, page, pageLabel) {
            const state = elements.pdfState;
            try {
                let dataUrl = page.editDataUrl || (page.sourceType === 'pdf' ? '' : page.previewDataUrl || page.thumbnailDataUrl);
                state.activeEditorSource = page.sourceType === 'pdf' && !page.editDataUrl ? 'pdf-preview' : 'edited-image';
                if (!dataUrl && page.sourceType === 'pdf') {
                    const pdfDocument = page.pdfDocument || state.pdf;
                    const rendered = await FD.PdfImportService.renderPdfPageForEditorPreview(pdfDocument, Pdf.pdfSourcePageNumber(page), { rotation: 0 });
                    page.editorPreviewMeta = {
                        source: 'pdf',
                        sourcePageNumber: Pdf.pdfSourcePageNumber(page),
                        renderScale: rendered.scale,
                        width: rendered.width,
                        height: rendered.height,
                        maxSide: rendered.maxSide,
                        maxPixels: rendered.maxPixels,
                        uploadRenderScale: FD.PdfImportService.UPLOAD_RENDER_SCALE,
                    };
                    state.activeEditorPreviewMeta = page.editorPreviewMeta;
                    dataUrl = FD.PdfImportService.canvasToEditorPreviewJPEG(rendered.canvas, { errorMessage: `${pageLabel} is te groot voor de bewerk-preview.` });
                }
                if (runId !== state.activeEditorRun)
                    return;
                const img = elements.pdfEditorImg;
                img.onload = () => startPdfCropper(CropperClass, runId, img);
                img.onerror = () => {
                    elements.pdfEditorSaveButton.textContent = 'Opslaan';
                    Ui.setPdfEditorLoading(elements, false);
                    showToast('Pagina kon niet worden geopend', 'error');
                    showPdfOverview();
                };
                img.removeAttribute('src');
                img.src = dataUrl;
            }
            catch (err) {
                page.status = 'error';
                page.error = err.message || 'Bewerken mislukt';
                Ui.setPdfEditorLoading(elements, false);
                showToast(page.error, 'error');
                showPdfOverview();
            }
        }
        function startPdfCropper(CropperClass, runId, img) {
            const state = elements.pdfState;
            if (runId !== state.activeEditorRun)
                return;
            Pdf.constrainPdfEditorImageToHandles(elements);
            Pdf.destroyPdfCropper(state);
            state.cropper = new CropperClass(img, {
                viewMode: 1,
                autoCropArea: 1,
                dragMode: 'move',
                background: false,
                movable: true,
                zoomable: true,
                zoomOnWheel: false,
                zoomOnTouch: false,
                scalable: false,
                rotatable: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                responsive: true,
                restore: false,
                guides: true,
                crop() { Pdf.requestPdfCropCommit(state, elements); },
                ready() {
                    if (runId !== state.activeEditorRun || !state.cropper)
                        return;
                    requestAnimationFrame(() => {
                        if (runId !== state.activeEditorRun || !state.cropper)
                            return;
                        Pdf.resetPdfCropperToPage(state, elements);
                        setTimeout(() => {
                            if (runId !== state.activeEditorRun || !state.cropper)
                                return;
                            Ui.setPdfEditorLoading(elements, false);
                            elements.pdfEditorSaveButton.disabled = false;
                            elements.pdfEditorSaveButton.textContent = 'Opslaan';
                        }, 220);
                    });
                },
            });
        }
        function rotateActivePdfPage(direction) {
            const state = elements.pdfState;
            if (!state.cropper || !state.activePage)
                return;
            state.pdfEditorRotation = (state.pdfEditorRotation + direction * 90 + 360) % 360;
            requestAnimationFrame(() => {
                if (!state.cropper || !state.activePage)
                    return;
                Pdf.resetPdfCropperToPage(state, elements);
                showToast('Controleer de uitsnede na roteren', 'success');
            });
        }
        function mapPreviewCropToRender(cropData, meta, rendered) {
            const previewWidth = Math.max(1, Number(meta?.width) || Number(rendered.width) || 1);
            const previewHeight = Math.max(1, Number(meta?.height) || Number(rendered.height) || 1);
            const scaleX = Number(rendered.width) / previewWidth;
            const scaleY = Number(rendered.height) / previewHeight;
            return {
                x: Math.round((Number(cropData.x) || 0) * scaleX),
                y: Math.round((Number(cropData.y) || 0) * scaleY),
                width: Math.round((Number(cropData.width) || previewWidth) * scaleX),
                height: Math.round((Number(cropData.height) || previewHeight) * scaleY),
            };
        }
        function isFullPreviewCrop(cropData, meta) {
            const tolerance = 3;
            const width = Math.max(1, Number(meta?.width) || 1);
            const height = Math.max(1, Number(meta?.height) || 1);
            return Math.abs(Number(cropData.x) || 0) <= tolerance
                && Math.abs(Number(cropData.y) || 0) <= tolerance
                && Math.abs((Number(cropData.width) || 0) - width) <= tolerance
                && Math.abs((Number(cropData.height) || 0) - height) <= tolerance;
        }
        async function highQualityPdfCrop(page, cropData) {
            const state = elements.pdfState;
            const meta = state.activeEditorPreviewMeta || page.editorPreviewMeta;
            const pdfDocument = page.pdfDocument || state.pdf;
            if (!pdfDocument || !meta || meta.source !== 'pdf')
                return null;
            const rotation = Number(state.pdfEditorRotation || 0) % 360;
            if (rotation && !isFullPreviewCrop(cropData, meta)) {
                throw new Error('Roteren met een uitsnede kan nog niet veilig op hoge kwaliteit worden opgeslagen. Sla zonder rotatie op of gebruik een PDF die al goed gedraaid is.');
            }
            const rendered = await FD.PdfImportService.renderPdfPageToCanvas(pdfDocument, Pdf.pdfSourcePageNumber(page), {
                scale: FD.PdfImportService.UPLOAD_RENDER_SCALE,
                rotation,
            });
            const outputCanvas = FD.PdfImportService.cropCanvas(rendered.canvas, mapPreviewCropToRender(cropData, meta, rendered));
            return FD.PdfImportService.uploadJPEGResult(outputCanvas, {
                errorMessage: `${Pdf.pdfPageLabel(page)} is te groot. Maak de uitsnede kleiner.`,
            });
        }
        async function saveActivePdfPageEdit() {
            const state = elements.pdfState;
            const page = state.activePage;
            if (!page || !state.cropper)
                return;
            elements.pdfEditorSaveButton.disabled = true;
            elements.pdfEditorSaveButton.textContent = 'Opslaan...';
            try {
                const cropData = Pdf.commitPdfCropState(state, elements, { force: true }) || page.cropData || Pdf.currentPdfCropData(state, elements) || Pdf.fullPdfCropData(state.cropper, elements.pdfEditorImg);
                Pdf.applyPdfCropData(state, elements, cropData);
                const uploadImage = await highQualityPdfCrop(page, cropData) || FD.PdfImportService.uploadJPEGResult(state.cropper.getCroppedCanvas({ fillColor: '#fff', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' }), { errorMessage: `${Pdf.pdfPageLabel(page)} is te groot. Maak de uitsnede kleiner.` });
                page.editDataUrl = uploadImage.dataUrl;
                page.outputWidth = uploadImage.width;
                page.outputHeight = uploadImage.height;
                page.cropData = { x: 0, y: 0, width: uploadImage.width, height: uploadImage.height };
                page.editorPreviewMeta = null;
                page.thumbnailDataUrl = await FD.PdfImportService.dataUrlToThumbnail(uploadImage.dataUrl);
                page.edited = true;
                page.status = 'ready';
                page.error = '';
                showToast(`${Pdf.pdfPageLabel(page)} bewerkt`, 'success');
                showPdfOverview({ discardEditorChanges: false });
            }
            catch (err) {
                elements.pdfEditorSaveButton.disabled = false;
                elements.pdfEditorSaveButton.textContent = 'Opslaan';
                showToast(err.message || 'Bewerken mislukt', 'error');
            }
        }
        return { ensurePdfPageUploadImage, fitActivePdfPage, handlePdfChange, openPdfEditor, rotateActivePdfPage, saveActivePdfPageEdit, showPdfOverview, zoomActivePdfPage };
    }
    FD.UploadPdfController = { createPdfHandlers };
})(window);
