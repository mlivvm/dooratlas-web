(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.UploadPdfState;
    function setPdfEditorLoading(elements, loading) {
        if (elements.pdfEditor)
            elements.pdfEditor.classList.toggle('is-loading', Boolean(loading));
        [elements.pdfEditorSaveButton, elements.pdfZoomOutButton, elements.pdfZoomFitButton, elements.pdfZoomInButton].forEach(button => {
            if (button)
                button.disabled = Boolean(loading);
        });
    }
    function setPdfUploadProgress(elements, { visible = true, value = 0, text = '' } = {}) {
        if (!elements.pdfProgress)
            return;
        elements.pdfProgress.style.display = visible ? 'block' : 'none';
        const percent = Math.max(0, Math.min(100, Math.round(value)));
        if (elements.pdfProgressBar)
            elements.pdfProgressBar.style.width = `${percent}%`;
        if (elements.pdfProgressText)
            elements.pdfProgressText.textContent = text || `${percent}%`;
    }
    function resetPdfState(elements) {
        const state = elements.pdfState;
        if (!state)
            return;
        const objectUrls = new Set((state.pages || []).map((page) => page.objectUrl).filter(Boolean));
        objectUrls.forEach(url => global.URL?.revokeObjectURL(url));
        Pdf.destroyPdfCropper(state);
        state.file = null;
        state.pdf = null;
        state.pages = [];
        state.activePage = null;
        state.activeEditorRun = 0;
        state.pdfEditorRotation = 0;
        state.activeOriginalCropData = null;
        state.suppressCropSync = false;
        state.suppressCropSyncTimer = null;
        state.cropSyncRaf = null;
        state.cropSyncIdleTimer = null;
        state.latestResult = null;
        state.latestUploadedPage = null;
        state.batchCustomerName = '';
        state.uploadContext = null;
        state.pdfFitZoomRatio = null;
        state.nextItemId = 1;
        state.nextSourceId = 1;
        Core.hide(elements.pdfProcessing);
        Core.hide(elements.pdfOverview);
        Core.hide(elements.pdfEditor);
        Core.hide(elements.pdfForm);
        if (elements.pdfPages)
            elements.pdfPages.innerHTML = '';
        if (elements.pdfNamesList)
            elements.pdfNamesList.innerHTML = '';
        if (elements.pdfErrorEl)
            elements.pdfErrorEl.textContent = '';
        if (elements.pdfTitle)
            elements.pdfTitle.textContent = "Bestanden en pagina's kiezen";
        if (elements.pdfSummary)
            elements.pdfSummary.textContent = 'Bestanden laden...';
        if (elements.pdfCount)
            elements.pdfCount.textContent = '0 geselecteerd';
        if (elements.pdfEditorImg) {
            elements.pdfEditorImg.onload = null;
            elements.pdfEditorImg.onerror = null;
            elements.pdfEditorImg.removeAttribute('src');
            elements.pdfEditorImg.style.width = '';
            elements.pdfEditorImg.style.height = '';
            elements.pdfEditorImg.style.maxWidth = '';
            elements.pdfEditorImg.style.maxHeight = '';
        }
        setPdfEditorLoading(elements, false);
        setPdfUploadProgress(elements, { visible: false, value: 0 });
    }
    function showPdfStep(elements, controls) {
        elements.stepChoose.style.display = 'none';
        elements.stepPreview.style.display = 'none';
        elements.stepForm.style.display = 'none';
        Core.hide(elements.stepMetadata);
        Core.show(elements.stepPdf, 'flex');
        Core.setUploadFormLayout(controls, false);
        Core.setPdfImportLayout(controls, true);
    }
    function showPdfProcessing(elements, controls, fileName) {
        showPdfStep(elements, controls);
        Core.hide(elements.pdfOverview);
        Core.hide(elements.pdfEditor);
        Core.hide(elements.pdfForm);
        Core.show(elements.pdfProcessing, 'flex');
        elements.pdfTitle.textContent = 'Bestanden verwerken';
        elements.pdfSummary.textContent = fileName || 'Bestanden laden...';
    }
    function updatePdfHeader(elements) {
        const state = elements.pdfState;
        const total = state.pages.length;
        const selected = Pdf.selectedPdfPages(state).length;
        const sourceTotal = new Set(state.pages.map((page) => Pdf.pdfSourceKey(page))).size;
        const fileTotal = new Set(state.pages.map((page) => page.sourceFileKey).filter(Boolean)).size;
        const duplicateTotal = Math.max(0, total - sourceTotal);
        elements.pdfTitle.textContent = "Bestanden en pagina's kiezen";
        elements.pdfSummary.textContent = total && duplicateTotal
            ? `${fileTotal || 1} bestand${fileTotal === 1 ? '' : 'en'}, ${sourceTotal} bron${sourceTotal === 1 ? '' : 'nen'} en ${duplicateTotal} extra uitsnede${duplicateTotal === 1 ? '' : 's'}.`
            : total
                ? `${fileTotal || 1} bestand${fileTotal === 1 ? '' : 'en'} met ${total} plattegrond${total === 1 ? '' : 'en'}. Gebruik Dupliceren voor meerdere uitsneden.`
                : 'Geen plattegronden gevonden.';
        elements.pdfCount.textContent = `${selected} van ${total} geselecteerd`;
        if (elements.pdfNextButton)
            elements.pdfNextButton.disabled = selected === 0;
    }
    function pageStatusLabel(page) {
        if (page.status === 'rendering')
            return 'Voorbeeld laden...';
        if (page.status === 'uploading')
            return 'Uploaden...';
        if (page.status === 'uploaded')
            return 'Geupload';
        if (page.status === 'error')
            return page.error || 'Fout';
        if (page.edited)
            return 'Bewerkt';
        return 'Nog niet bewerkt';
    }
    function blockElementDragging(el) {
        if (!el)
            return;
        el.draggable = false;
        el.addEventListener('dragstart', (event) => event.preventDefault());
    }
    function ensurePdfPreviewOverlay() {
        let overlay = global.document.getElementById('upload-pdf-preview-overlay');
        if (overlay)
            return overlay;
        overlay = global.document.createElement('div');
        overlay.id = 'upload-pdf-preview-overlay';
        overlay.className = 'upload-pdf-preview-overlay';
        overlay.innerHTML = `
      <div class="upload-pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-pdf-preview-title">
        <div class="upload-pdf-preview-head">
          <span id="upload-pdf-preview-title">Pagina bekijken</span>
          <button type="button" class="upload-pdf-preview-close" aria-label="Voorbeeld sluiten">&times;</button>
        </div>
        <div class="upload-pdf-preview-body">
          <span class="upload-pdf-preview-loading">Voorbeeld laden...</span>
          <img alt="PDF pagina vergroot" draggable="false" style="display:none;">
        </div>
      </div>
    `;
        overlay.addEventListener('click', (event) => { if (event.target === overlay)
            overlay.classList.remove('is-open'); });
        overlay.querySelector('.upload-pdf-preview-close')?.addEventListener('click', () => overlay.classList.remove('is-open'));
        global.document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('is-open'))
                overlay.classList.remove('is-open');
        });
        global.document.body.appendChild(overlay);
        return overlay;
    }
    async function showPdfPagePreview(elements, page) {
        const overlay = ensurePdfPreviewOverlay();
        const title = overlay.querySelector('#upload-pdf-preview-title');
        const img = overlay.querySelector('img');
        const loading = overlay.querySelector('.upload-pdf-preview-loading');
        const setImage = (dataUrl) => {
            if (!img || !loading || !dataUrl)
                return;
            img.src = dataUrl;
            img.style.display = '';
            loading.style.display = 'none';
        };
        if (title)
            title.textContent = `${Pdf.pdfPageLabel(page)} bekijken`;
        if (img) {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
        if (loading) {
            loading.textContent = 'Voorbeeld laden...';
            loading.style.display = '';
        }
        overlay.classList.add('is-open');
        const immediatePreview = page.editDataUrl || page.previewDataUrl || page.thumbnailDataUrl;
        if (immediatePreview)
            setImage(immediatePreview);
        const pdfDocument = page.pdfDocument || elements.pdfState?.pdf;
        if (!page.editDataUrl && !page.previewDataUrl && pdfDocument && page.sourceType === 'pdf') {
            try {
                const rendered = await FD.PdfImportService.renderPdfPageToCanvas(pdfDocument, Pdf.pdfSourcePageNumber(page), { scale: FD.PdfImportService.UPLOAD_RENDER_SCALE });
                page.previewDataUrl = rendered.canvas.toDataURL('image/jpeg', 0.82);
                if (overlay.classList.contains('is-open'))
                    setImage(page.previewDataUrl);
            }
            catch {
                if (loading && !immediatePreview)
                    loading.textContent = 'Voorbeeld kon niet worden geladen';
            }
        }
        else if (!immediatePreview && loading) {
            loading.textContent = 'Voorbeeld niet beschikbaar';
        }
    }
    function renderPdfPageCard(elements, page) {
        const state = elements.pdfState;
        const itemId = Pdf.ensurePdfItemId(state, page);
        const sourcePageNumber = Pdf.pdfSourcePageNumber(page);
        const pageLabel = Pdf.pdfPageLabel(page);
        const card = document.createElement('article');
        card.className = 'upload-pdf-page';
        card.classList.toggle('is-selected', page.selected);
        card.classList.toggle('is-error', page.status === 'error');
        card.dataset.pageId = itemId;
        card.dataset.pageNumber = String(sourcePageNumber);
        card.dataset.copyIndex = String(Pdf.pdfCopyIndex(page));
        const thumb = document.createElement('div');
        thumb.className = 'upload-pdf-page-thumb';
        blockElementDragging(thumb);
        const number = document.createElement('span');
        number.className = 'upload-pdf-page-number';
        number.textContent = Pdf.pdfPageShortLabel(page).replace(/^P/, '');
        thumb.appendChild(number);
        if (page.thumbnailDataUrl) {
            const img = document.createElement('img');
            img.src = page.thumbnailDataUrl;
            img.alt = `PDF ${pageLabel}`;
            blockElementDragging(img);
            thumb.appendChild(img);
        }
        else {
            const loading = document.createElement('span');
            loading.style.color = '#5f6368';
            loading.style.fontWeight = '800';
            loading.textContent = 'Laden...';
            thumb.appendChild(loading);
        }
        renderPdfPageCardBody(elements, page, card, thumb, itemId, pageLabel);
        return card;
    }
    function renderPdfPageCardBody(elements, page, card, thumb, itemId, pageLabel) {
        if (Pdf.pdfCopyIndex(page) > 1) {
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'upload-pdf-page-remove';
            removeButton.textContent = '×';
            removeButton.title = `${pageLabel} verwijderen`;
            removeButton.setAttribute('aria-label', `${pageLabel} verwijderen`);
            removeButton.disabled = page.status === 'uploading';
            removeButton.addEventListener('click', event => {
                event.stopPropagation();
                removeDuplicatedPdfPage(elements, page);
            });
            thumb.appendChild(removeButton);
        }
        const body = document.createElement('div');
        body.className = 'upload-pdf-page-body';
        const title = document.createElement('label');
        title.className = 'upload-pdf-page-title';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = page.selected;
        checkbox.addEventListener('click', event => event.stopPropagation());
        checkbox.addEventListener('change', () => {
            page.selected = checkbox.checked;
            updatePdfPageCard(elements, page);
            updatePdfHeader(elements);
        });
        const titleText = document.createElement('span');
        titleText.textContent = pageLabel;
        title.appendChild(checkbox);
        title.appendChild(titleText);
        const actions = document.createElement('div');
        actions.className = 'upload-pdf-page-actions';
        const status = document.createElement('div');
        status.className = 'upload-pdf-page-status';
        status.classList.toggle('is-error', page.status === 'error');
        status.textContent = pageStatusLabel(page);
        const buttons = document.createElement('div');
        buttons.className = 'upload-pdf-page-buttons';
        buttons.appendChild(actionButton('Dupliceren', 'upload-pdf-page-duplicate', ['rendering', 'uploading', 'error'].includes(page.status), event => {
            event.stopPropagation();
            duplicatePdfPage(elements, page);
        }));
        buttons.appendChild(actionButton('Bewerken', 'upload-pdf-page-edit', false, event => {
            event.stopPropagation();
            elements.openPdfEditor(itemId);
        }));
        actions.appendChild(status);
        actions.appendChild(buttons);
        body.appendChild(title);
        body.appendChild(actions);
        card.appendChild(thumb);
        card.appendChild(body);
        card.addEventListener('click', () => togglePdfPageSelection(elements, page));
        card.addEventListener('dragstart', event => event.preventDefault());
    }
    function actionButton(text, className, disabled, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }
    function togglePdfPageSelection(elements, page) {
        if (!page || page.status === 'uploading')
            return;
        page.selected = !page.selected;
        updatePdfPageCard(elements, page);
        updatePdfHeader(elements);
    }
    function updatePdfPageCard(elements, page) {
        const oldCard = elements.pdfPages?.querySelector(`.upload-pdf-page[data-page-id="${Pdf.ensurePdfItemId(elements.pdfState, page)}"]`);
        const newCard = renderPdfPageCard(elements, page);
        if (oldCard)
            oldCard.replaceWith(newCard);
    }
    function duplicatePdfPage(elements, page) {
        const state = elements.pdfState;
        if (!state || !page || ['rendering', 'uploading', 'error'].includes(page.status))
            return;
        const sourcePageNumber = Pdf.pdfSourcePageNumber(page);
        const sourceKey = Pdf.pdfSourceKey(page);
        const duplicateCount = (state.pages || []).filter((item) => (Pdf.pdfSourceKey(item) === sourceKey && Pdf.pdfCopyIndex(item) > 1)).length;
        if (duplicateCount >= Core.MAX_PDF_DUPLICATES_PER_PAGE) {
            (elements.pdfShowToast || (() => { }))(`Maximaal ${Core.MAX_PDF_DUPLICATES_PER_PAGE} duplicaten per PDF-pagina`, 'error');
            return;
        }
        const duplicate = Pdf.createPdfPageItem(state, {
            sourcePageNumber,
            copyIndex: Pdf.nextPdfCopyIndex(state, sourceKey),
            sourceKey,
            sourceFileKey: page.sourceFileKey,
            sourceFileName: page.sourceFileName,
            sourceType: page.sourceType,
            pdfDocument: page.pdfDocument,
            batchIndex: page.batchIndex,
            svgText: page.svgText,
            objectUrl: page.objectUrl,
        });
        duplicate.thumbnailDataUrl = page.thumbnailDataUrl || '';
        duplicate.previewDataUrl = page.previewDataUrl || '';
        duplicate.status = duplicate.thumbnailDataUrl ? 'ready' : 'rendering';
        duplicate.selected = true;
        duplicate.editDataUrl = page.editDataUrl || '';
        duplicate.outputWidth = page.outputWidth || 0;
        duplicate.outputHeight = page.outputHeight || 0;
        const lastSourceIndex = state.pages.reduce((lastIndex, item, index) => (Pdf.pdfSourceKey(item) === sourceKey ? index : lastIndex), -1);
        state.pages.splice(lastSourceIndex + 1, 0, duplicate);
        renderPdfPages(elements);
    }
    function removeDuplicatedPdfPage(elements, page) {
        const state = elements.pdfState;
        if (!state || !page || Pdf.pdfCopyIndex(page) <= 1 || page.status === 'uploading')
            return;
        const itemId = Pdf.ensurePdfItemId(state, page);
        state.pages = (state.pages || []).filter((item) => Pdf.ensurePdfItemId(state, item) !== itemId);
        if (state.activePage && Pdf.ensurePdfItemId(state, state.activePage) === itemId) {
            state.activePage = null;
            state.activeOriginalCropData = null;
        }
        renderPdfPages(elements);
    }
    function renderPdfPages(elements) {
        const container = elements.pdfPages;
        if (!container)
            return;
        container.innerHTML = '';
        elements.pdfState.pages.forEach((page) => container.appendChild(renderPdfPageCard(elements, page)));
        updatePdfHeader(elements);
    }
    FD.UploadPdfUi = {
        blockElementDragging,
        pageStatusLabel,
        renderPdfPages,
        resetPdfState,
        setPdfEditorLoading,
        setPdfUploadProgress,
        showPdfPagePreview,
        showPdfProcessing,
        showPdfStep,
        updatePdfHeader,
        updatePdfPageCard,
    };
})(window);
