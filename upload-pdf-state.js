(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    function selectedPdfPages(state) {
        return (state.pages || []).filter((page) => page.selected);
    }
    function clearPdfCropCommitTimers(state) {
        if (state.cropSyncRaf) {
            cancelAnimationFrame(state.cropSyncRaf);
            state.cropSyncRaf = null;
        }
        if (state.cropSyncIdleTimer) {
            clearTimeout(state.cropSyncIdleTimer);
            state.cropSyncIdleTimer = null;
        }
    }
    function destroyPdfCropper(state) {
        clearPdfCropCommitTimers(state);
        if (state.suppressCropSyncTimer) {
            clearTimeout(state.suppressCropSyncTimer);
            state.suppressCropSyncTimer = null;
        }
        state.suppressCropSync = false;
        if (state.cropper) {
            state.cropper.destroy();
            state.cropper = null;
        }
    }
    function clonePdfCropData(cropData) {
        return cropData ? { ...cropData } : null;
    }
    function pdfSourcePageNumber(page) {
        return Number(page?.sourcePageNumber || page?.pageNumber || 1);
    }
    function pdfCopyIndex(page) {
        return Math.max(1, Number(page?.copyIndex || 1));
    }
    function pdfSourceKey(page) {
        return String(page?.sourceKey || `legacy:${pdfSourcePageNumber(page)}`);
    }
    function pdfPageLabel(page) {
        const sourcePage = pdfSourcePageNumber(page);
        const copyIndex = pdfCopyIndex(page);
        const sourceFileName = String(page?.sourceFileName || '').trim();
        if (sourceFileName && page?.sourceType !== 'pdf') {
            return copyIndex > 1 ? `${sourceFileName} - uitsnede ${copyIndex}` : sourceFileName;
        }
        if (sourceFileName) {
            const base = `${sourceFileName} · pagina ${sourcePage}`;
            return copyIndex > 1 ? `${base} - uitsnede ${copyIndex}` : base;
        }
        return copyIndex > 1 ? `Pagina ${sourcePage} - uitsnede ${copyIndex}` : `Pagina ${sourcePage}`;
    }
    function pdfPageShortLabel(page) {
        const sourcePage = pdfSourcePageNumber(page);
        const copyIndex = pdfCopyIndex(page);
        const base = page?.batchIndex ? `B${page.batchIndex}` : `P${sourcePage}`;
        return copyIndex > 1 ? `${base}.${copyIndex}` : base;
    }
    function nextPdfItemId(state, sourcePageNumber) {
        const nextId = Math.max(1, Number(state.nextItemId || 1));
        state.nextItemId = nextId + 1;
        return `pdf-page-${sourcePageNumber}-${nextId}`;
    }
    function ensurePdfItemId(state, page) {
        if (!page.itemId)
            page.itemId = nextPdfItemId(state, pdfSourcePageNumber(page));
        return page.itemId;
    }
    function nextPdfCopyIndex(state, sourceKey) {
        const used = new Set((state.pages || [])
            .filter((page) => pdfSourceKey(page) === sourceKey)
            .map((page) => pdfCopyIndex(page)));
        for (let copyIndex = 2; copyIndex <= Core.MAX_PDF_DUPLICATES_PER_PAGE + 1; copyIndex += 1) {
            if (!used.has(copyIndex))
                return copyIndex;
        }
        return Core.MAX_PDF_DUPLICATES_PER_PAGE + 2;
    }
    function createPdfPageItem(state, { sourcePageNumber, copyIndex = 1, sourceKey = '', sourceFileName = '', sourceType = 'pdf', pdfDocument = null, batchIndex = 0, svgText = '', objectUrl = '', sourceFileKey = '', }) {
        return {
            itemId: nextPdfItemId(state, sourcePageNumber),
            pageNumber: sourcePageNumber,
            sourcePageNumber,
            copyIndex,
            sourceKey: sourceKey || `legacy:${sourcePageNumber}`,
            sourceFileKey: sourceFileKey || sourceKey || `legacy:${sourcePageNumber}`,
            sourceFileName,
            sourceType,
            pdfDocument,
            batchIndex,
            svgText,
            objectUrl,
            selected: true,
            thumbnailDataUrl: '',
            previewDataUrl: '',
            editDataUrl: '',
            outputWidth: 0,
            outputHeight: 0,
            floorplanName: '',
            floorLabel: '',
            levelOrder: '',
            levelOrderTouched: false,
            floorNotes: '',
            edited: false,
            status: 'rendering',
            error: '',
        };
    }
    function normalizePdfCropData(data) {
        const x = Math.round(Number(data?.x) || 0);
        const y = Math.round(Number(data?.y) || 0);
        const width = Math.max(1, Math.round(Number(data?.width) || 0));
        const height = Math.max(1, Math.round(Number(data?.height) || 0));
        return { x, y, width, height };
    }
    function fullPdfCropData(cropper, img) {
        const imageData = cropper?.getImageData ? cropper.getImageData() : {};
        const naturalWidth = Math.round(imageData.naturalWidth || img?.naturalWidth || 1);
        const naturalHeight = Math.round(imageData.naturalHeight || img?.naturalHeight || 1);
        return { x: 0, y: 0, width: Math.max(1, naturalWidth), height: Math.max(1, naturalHeight) };
    }
    function currentPdfCropData(state, elements) {
        if (!state.cropper)
            return null;
        return normalizePdfCropData(state.cropper.getData(true) || fullPdfCropData(state.cropper, elements.pdfEditorImg));
    }
    function setPdfEditorDataset(elements, state) {
        if (!elements.pdfEditor)
            return;
        elements.pdfEditor.dataset.mode = 'crop';
        if (state.activePage?.cropData)
            elements.pdfEditor.dataset.cropData = JSON.stringify(state.activePage.cropData);
        else
            delete elements.pdfEditor.dataset.cropData;
        state.cropDatasetWriteCount = Number(state.cropDatasetWriteCount || 0) + 1;
    }
    function commitPdfCropState(state, elements, { force = false } = {}) {
        if (!state.cropper || !state.activePage || (!force && state.suppressCropSync))
            return null;
        const cropData = currentPdfCropData(state, elements);
        if (!cropData)
            return null;
        state.activePage.cropData = cropData;
        setPdfEditorDataset(elements, state);
        return cropData;
    }
    function requestPdfCropCommit(state, elements) {
        if (state.suppressCropSync)
            return;
        if (!state.cropSyncRaf) {
            state.cropSyncRaf = requestAnimationFrame(() => {
                state.cropSyncRaf = null;
                commitPdfCropState(state, elements);
            });
        }
        if (state.cropSyncIdleTimer)
            clearTimeout(state.cropSyncIdleTimer);
        state.cropSyncIdleTimer = setTimeout(() => {
            state.cropSyncIdleTimer = null;
            commitPdfCropState(state, elements, { force: true });
        }, 120);
    }
    function applyPdfCropData(state, elements, cropData) {
        if (!state.cropper || !cropData)
            return;
        state.suppressCropSync = true;
        clearPdfCropCommitTimers(state);
        if (state.suppressCropSyncTimer)
            clearTimeout(state.suppressCropSyncTimer);
        state.cropper.setData(cropData);
        setPdfEditorDataset(elements, state);
        state.suppressCropSyncTimer = setTimeout(() => {
            state.suppressCropSync = false;
            state.suppressCropSyncTimer = null;
        }, 80);
    }
    function currentPdfZoomRatio(state) {
        if (!state.cropper?.getImageData || !state.cropper?.getCanvasData)
            return null;
        const imageData = state.cropper.getImageData();
        const canvasData = state.cropper.getCanvasData();
        const naturalWidth = canvasData.naturalWidth || imageData.naturalWidth || imageData.width || 1;
        return canvasData.width / naturalWidth;
    }
    function fitPdfCropperCanvas(state) {
        if (!state.cropper?.getContainerData || !state.cropper?.getCanvasData || !state.cropper?.setCanvasData || !state.cropper?.getImageData)
            return;
        const containerData = state.cropper.getContainerData();
        const canvasData = state.cropper.getCanvasData();
        const imageData = state.cropper.getImageData();
        const naturalWidth = canvasData.naturalWidth || imageData.naturalWidth || canvasData.width || 1;
        const naturalHeight = canvasData.naturalHeight || imageData.naturalHeight || canvasData.height || 1;
        if (!containerData.width || !containerData.height || !naturalWidth || !naturalHeight)
            return;
        const safeSpace = global.matchMedia?.('(pointer: coarse)')?.matches ? 72 : 56;
        const maxWidth = Math.max(1, containerData.width - safeSpace);
        const maxHeight = Math.max(1, containerData.height - safeSpace);
        const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
        const width = naturalWidth * scale;
        const height = naturalHeight * scale;
        state.cropper.setCanvasData({ left: (containerData.width - width) / 2, top: (containerData.height - height) / 2, width, height });
    }
    function preparePdfCropBoxForFullFit(state) {
        if (!state.cropper?.getContainerData || !state.cropper?.setCropBoxData)
            return;
        const containerData = state.cropper.getContainerData();
        if (!containerData.width || !containerData.height)
            return;
        const width = Math.max(24, Math.min(96, containerData.width * 0.2));
        const height = Math.max(24, Math.min(96, containerData.height * 0.2));
        state.cropper.setCropBoxData({ left: (containerData.width - width) / 2, top: (containerData.height - height) / 2, width, height });
    }
    function pdfCropBoxForVisibleCanvas(canvasData) {
        return { left: canvasData.left, top: canvasData.top, width: canvasData.width, height: canvasData.height };
    }
    function fitPdfCropperToFullPage(state, elements) {
        if (!state.cropper || !state.activePage)
            return;
        preparePdfCropBoxForFullFit(state);
        fitPdfCropperCanvas(state);
        if (typeof state.cropper.setCropBoxData === 'function')
            state.cropper.setCropBoxData(pdfCropBoxForVisibleCanvas(state.cropper.getCanvasData()));
        state.activePage.cropData = currentPdfCropData(state, elements) || fullPdfCropData(state.cropper, elements.pdfEditorImg);
        setPdfEditorDataset(elements, state);
        state.pdfFitZoomRatio = currentPdfZoomRatio(state);
    }
    function applyPdfCropBoxFromData(state, cropData) {
        if (!state.cropper?.setCropBoxData || !state.cropper?.getCanvasData || !state.cropper?.getImageData || !state.cropper?.getContainerData || !cropData)
            return;
        if ((state.pdfEditorRotation || 0) % 180 !== 0)
            return;
        const containerData = state.cropper.getContainerData();
        const canvasData = state.cropper.getCanvasData();
        const imageData = state.cropper.getImageData();
        const naturalWidth = imageData.naturalWidth || imageData.width || 1;
        const naturalHeight = imageData.naturalHeight || imageData.height || 1;
        if (!canvasData.width || !canvasData.height || !naturalWidth || !naturalHeight)
            return;
        const scaleX = canvasData.width / naturalWidth;
        const scaleY = canvasData.height / naturalHeight;
        let left = canvasData.left + cropData.x * scaleX;
        let top = canvasData.top + cropData.y * scaleY;
        let width = cropData.width * scaleX;
        let height = cropData.height * scaleY;
        if (left < 0) {
            width += left;
            left = 0;
        }
        if (top < 0) {
            height += top;
            top = 0;
        }
        if (left + width > containerData.width)
            width = containerData.width - left;
        if (top + height > containerData.height)
            height = containerData.height - top;
        if (width <= 0 || height <= 0)
            return;
        state.cropper.setCropBoxData({ left, top, width, height });
    }
    function deferUnsuppressed(state, fn, ms) {
        state.suppressCropSyncTimer = setTimeout(() => {
            fn();
            state.suppressCropSync = false;
            state.suppressCropSyncTimer = null;
        }, ms);
    }
    function restorePdfCropAfterViewportChange(state, elements, cropData) {
        if (!state.cropper || !state.activePage || !cropData)
            return;
        state.suppressCropSync = true;
        clearPdfCropCommitTimers(state);
        if (state.suppressCropSyncTimer)
            clearTimeout(state.suppressCropSyncTimer);
        const applyCropData = () => {
            if (!state.cropper || !state.activePage)
                return false;
            state.activePage.cropData = cropData;
            state.cropper.setData(cropData);
            setPdfEditorDataset(elements, state);
            return true;
        };
        requestAnimationFrame(() => {
            if (!applyCropData())
                return;
            requestAnimationFrame(() => {
                if (!state.cropper || !state.activePage)
                    return;
                applyPdfCropBoxFromData(state, cropData);
                state.activePage.cropData = cropData;
                setPdfEditorDataset(elements, state);
                deferUnsuppressed(state, () => {
                    if (state.cropper && state.activePage) {
                        applyPdfCropBoxFromData(state, cropData);
                        state.activePage.cropData = cropData;
                        setPdfEditorDataset(elements, state);
                    }
                }, 140);
            });
        });
    }
    function resetPdfCropperToPage(state, elements) {
        if (!state.cropper || !state.activePage)
            return;
        const rotation = state.pdfEditorRotation || 0;
        state.suppressCropSync = true;
        clearPdfCropCommitTimers(state);
        if (state.suppressCropSyncTimer)
            clearTimeout(state.suppressCropSyncTimer);
        state.cropper.reset();
        if (rotation && typeof state.cropper.rotateTo === 'function')
            state.cropper.rotateTo(rotation);
        preparePdfCropBoxForFullFit(state);
        requestAnimationFrame(() => {
            if (!state.cropper || !state.activePage)
                return;
            fitPdfCropperToFullPage(state, elements);
            requestAnimationFrame(() => {
                if (!state.cropper || !state.activePage)
                    return;
                fitPdfCropperToFullPage(state, elements);
                deferUnsuppressed(state, () => {
                    if (state.cropper && state.activePage)
                        fitPdfCropperToFullPage(state, elements);
                }, 160);
            });
        });
    }
    function relaxPdfCropBoxForZoomOut(state) {
        preparePdfCropBoxForFullFit(state);
    }
    function constrainPdfEditorImageToHandles(elements) {
        const img = elements.pdfEditorImg;
        const wrap = elements.pdfEditor?.querySelector?.('.upload-pdf-crop-stage');
        if (!img || !wrap)
            return;
        const safeSpace = 56;
        const minSize = 160;
        const maxWidth = Math.max(minSize, wrap.clientWidth - safeSpace);
        const maxHeight = Math.max(minSize, wrap.clientHeight - safeSpace);
        const naturalWidth = img.naturalWidth || maxWidth;
        const naturalHeight = img.naturalHeight || maxHeight;
        const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
        img.style.width = `${Math.max(1, Math.round(naturalWidth * scale))}px`;
        img.style.height = `${Math.max(1, Math.round(naturalHeight * scale))}px`;
        img.style.maxWidth = `${maxWidth}px`;
        img.style.maxHeight = `${maxHeight}px`;
    }
    FD.UploadPdfState = {
        applyPdfCropBoxFromData,
        applyPdfCropData,
        clearPdfCropCommitTimers,
        clonePdfCropData,
        commitPdfCropState,
        constrainPdfEditorImageToHandles,
        createPdfPageItem,
        currentPdfCropData,
        currentPdfZoomRatio,
        destroyPdfCropper,
        ensurePdfItemId,
        fitPdfCropperCanvas,
        fitPdfCropperToFullPage,
        fullPdfCropData,
        nextPdfCopyIndex,
        pdfCopyIndex,
        pdfPageLabel,
        pdfPageShortLabel,
        pdfSourcePageNumber,
        pdfSourceKey,
        relaxPdfCropBoxForZoomOut,
        requestPdfCropCommit,
        resetPdfCropperToPage,
        restorePdfCropAfterViewportChange,
        selectedPdfPages,
        setPdfEditorDataset,
    };
})(window);
