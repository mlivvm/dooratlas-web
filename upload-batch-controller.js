(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.UploadPdfState;
    const Ui = FD.UploadPdfUi;
    const Form = FD.UploadPdfForm;
    function attachBatchHandlers(pdfHandlers, ctx) {
        const { elements, controls, modeController, modes, ensureSession, onSave, onSaved, showToast, hidePopup, currentCustomers } = ctx;
        function showPdfFormForCurrentCustomers() {
            const pages = Pdf.selectedPdfPages(elements.pdfState);
            if (!pages.length) {
                showToast('Selecteer minimaal 1 pagina', 'error');
                return;
            }
            const context = elements.pdfState.uploadContext || {};
            if (elements.pdfContext)
                elements.pdfContext.textContent = `${context.customerName || 'Klant'} · ${context.locationName || 'Locatie'}`;
            elements.pdfErrorEl.textContent = '';
            Core.hide(elements.pdfOverview);
            Core.hide(elements.pdfEditor);
            Core.show(elements.pdfForm, 'flex');
            Ui.setPdfUploadProgress(elements, { visible: false, value: 0 });
            elements.pdfTitle.textContent = 'Plattegrondgegevens invullen';
            elements.pdfSummary.textContent = `${pages.length} plattegrond${pages.length === 1 ? '' : 'en'} klaar om gegevens in te vullen.`;
            Form.renderPdfNameRows(elements);
        }
        async function savePdfBatchUpload() {
            if (ctx.isSaving())
                return;
            const selectedPages = Pdf.selectedPdfPages(elements.pdfState);
            const pagesToUpload = selectedPages.filter((page) => page.status !== 'uploaded');
            if (!pagesToUpload.length) {
                elements.pdfErrorEl.textContent = 'Alle geselecteerde pagina\'s zijn al geupload.';
                return;
            }
            const form = validateCurrentPdfBatch(pagesToUpload);
            if (!form.ok) {
                elements.pdfErrorEl.textContent = form.error;
                return;
            }
            try {
                const sessionOk = await ensureSession({ purpose: 'pdf_upload' });
                if (!sessionOk) {
                    elements.pdfErrorEl.textContent = 'Sessie verlopen. Log opnieuw in en probeer de upload opnieuw.';
                    return;
                }
            }
            catch (err) {
                elements.pdfErrorEl.textContent = Core.formatUploadError(err);
                return;
            }
            await uploadValidatedPdfBatch(form);
        }
        function validateCurrentPdfBatch(pagesToUpload) {
            return Form.validatePdfBatchForm({
                uploadContext: elements.pdfState.uploadContext,
                pages: pagesToUpload,
                customers: currentCustomers(),
            });
        }
        async function uploadValidatedPdfBatch(form) {
            ctx.setSaving(true);
            modeController.enter(modes.UPLOAD_SAVING);
            controls.pdfSaveButton.disabled = true;
            elements.pdfErrorEl.textContent = '';
            let result = null;
            const totalUnits = Math.max(1, form.pages.length * 4);
            const updateBatchProgress = (pageIndex, phase, text) => {
                const units = Math.min(totalUnits, pageIndex * 4 + phase);
                Ui.setPdfUploadProgress(elements, { visible: true, value: (units / totalUnits) * 100, text });
            };
            updateBatchProgress(0, 0, `Upload voorbereiden (0/${form.pages.length})`);
            try {
                for (let index = 0; index < form.pages.length; index++) {
                    result = await uploadPdfBatchPage(form, index, updateBatchProgress);
                }
            }
            catch (err) {
                handlePdfBatchError(err, form, totalUnits);
                return;
            }
            finally {
                controls.pdfSaveButton.textContent = 'Voltooien';
                controls.pdfSaveButton.disabled = false;
                ctx.setSaving(false);
                if (modeController.is(modes.UPLOAD_SAVING))
                    modeController.enter(modes.UPLOAD);
            }
            finishPdfBatchUpload(form, result);
        }
        async function uploadPdfBatchPage(form, index, updateBatchProgress) {
            const page = form.pages[index];
            page.status = 'uploading';
            page.error = '';
            controls.pdfSaveButton.textContent = `Uploaden ${index + 1}/${form.pages.length}...`;
            updateBatchProgress(index, 0, `Pagina ${index + 1}/${form.pages.length} voorbereiden...`);
            Form.renderPdfNameRows(elements);
            let svgText = page.svgText && !page.edited ? page.svgText : '';
            if (!svgText) {
                const image = await pdfHandlers.ensurePdfPageUploadImage(page);
                updateBatchProgress(index, 1, `Pagina ${index + 1}/${form.pages.length} verwerken...`);
                svgText = FD.PdfImportService.buildUploadSVGText({ imageDataUrl: image.dataUrl, width: image.width, height: image.height });
            }
            const fileName = Core.sanitizeFilename(`${form.customerName} ${page.floorplanName}`, Date.now() + index) + '.svg';
            updateBatchProgress(index, 2, `Pagina ${index + 1}/${form.pages.length} uploaden...`);
            const slowUploadTimer = setTimeout(() => updateBatchProgress(index, 2, `Pagina ${index + 1}/${form.pages.length} opslaan duurt iets langer...`), 4000);
            try {
                const result = await onSave({
                    form: {
                        tenantId: form.tenantId,
                        locationId: form.locationId,
                        customerName: form.customerName,
                        floorName: page.floorLabel,
                        floorplanName: page.floorLabel,
                        floorLabel: page.floorLabel,
                        levelOrder: page.levelOrder,
                        floorNotes: page.floorNotes,
                    },
                    fileName,
                    svgText,
                });
                elements.pdfState.batchCustomerName = form.customerName;
                page.status = 'uploaded';
                page.error = '';
                elements.pdfState.latestResult = result;
                elements.pdfState.latestUploadedPage = page;
                updateBatchProgress(index, 4, `Pagina ${index + 1}/${form.pages.length} klaar`);
                Form.renderPdfNameRows(elements);
                return result;
            }
            finally {
                clearTimeout(slowUploadTimer);
            }
        }
        function handlePdfBatchError(err, form, totalUnits) {
            const failedIndex = form.pages.findIndex((page) => page.status === 'uploading');
            const failed = failedIndex >= 0 ? form.pages[failedIndex] : null;
            if (failed) {
                failed.status = 'error';
                failed.error = Core.formatUploadError(err);
            }
            Ui.setPdfUploadProgress(elements, {
                visible: true,
                value: Math.max(0, (Math.max(0, failedIndex) * 4) / totalUnits * 100),
                text: failed ? `Upload gestopt bij ${Pdf.pdfPageLabel(failed).toLowerCase()}` : 'Upload gestopt',
            });
            elements.pdfErrorEl.textContent = `Upload gestopt: ${Core.formatUploadError(err)} Eerder gelukte pagina's blijven staan.`;
            Form.renderPdfNameRows(elements);
        }
        function finishPdfBatchUpload(form, result) {
            const uploadedCount = form.pages.length;
            Ui.setPdfUploadProgress(elements, { visible: true, value: 100, text: `${uploadedCount} van ${uploadedCount} geupload` });
            const lastUploadedPage = elements.pdfState.latestUploadedPage || form.pages[form.pages.length - 1];
            hidePopup();
            showToast(`${uploadedCount} plattegrond${uploadedCount === 1 ? '' : 'en'} toegevoegd`, 'success');
            onSaved({
                result,
                form: { customerName: form.customerName, floorName: lastUploadedPage.floorLabel, floorplanName: lastUploadedPage.floorLabel },
                batch: true,
                pages: form.pages,
            });
        }
        return { savePdfBatchUpload, showPdfFormForCurrentCustomers };
    }
    FD.UploadBatchController = { attachBatchHandlers };
})(window);
