(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Ui = FD.UploadPdfUi;
    const PdfController = FD.UploadPdfController;
    const BatchController = FD.UploadBatchController;
    const BatchImport = FD.UploadBatchImport;
    const WizardController = FD.UploadWizardController;
    function createUploadController({ elements, controls, getCustomers, getCurrentUser = () => null, modeController, modes, isEditMode = () => false, hideTopbarMenu = () => { }, showToast = () => { }, getPdfJsLib = () => global.pdfjsLib, ensureSession = async () => true, onCreateTenant, onListLocations, onCreateLocation, onSave, onSaved = () => { }, }) {
        let generation = 0;
        let saving = false;
        let bound = false;
        let dragDepth = 0;
        let continueFiles = () => { };
        elements.pdfState = elements.pdfState || { pages: [] };
        elements.pdfShowToast = showToast;
        const currentCustomers = () => typeof getCustomers === 'function' ? getCustomers() : [];
        const wizard = WizardController.createUploadWizard({
            elements, controls, currentCustomers, getCurrentUser,
            onCreateTenant, onListLocations, onCreateLocation,
            onContinueFiles: () => continueFiles(),
        });
        function resetAll() {
            Ui.resetPdfState(elements);
            Core.resetPreviewState(elements);
            Core.resetFormState(elements);
            elements.uploadContext = null;
            dragDepth = 0;
            controls.popup.classList.remove('is-dragging-files');
        }
        function canCreateCustomer() {
            const user = getCurrentUser() || {};
            return Boolean(user.isSuperadmin || user.role === 'admin' || (user.memberships || []).some((membership) => membership.role === 'da_admin'));
        }
        function enterModeUI() {
            hideTopbarMenu();
            Core.setPdfImportLayout(controls, false);
            resetAll();
            elements.stepChoose.style.display = 'none';
            elements.stepForm.style.display = 'flex';
            wizard.reset({ allowNewCustomer: canCreateCustomer() });
            Core.setUploadFormLayout(controls, true);
            controls.overlay.style.display = 'block';
            controls.popup.style.display = 'block';
        }
        function exitModeUI() {
            generation++;
            hideCancelConfirmation();
            Core.setUploadFormLayout(controls, false);
            Core.setPdfImportLayout(controls, false);
            controls.overlay.style.display = 'none';
            controls.popup.style.display = 'none';
            controls.fileInput.value = '';
            resetAll();
        }
        function showPopup() {
            if (isEditMode())
                return showToast('Sluit eerst de bewerkingsmodus', 'error');
            if (!modeController.isInteractiveView())
                return showToast('Sluit eerst het huidige scherm', 'error');
            modeController.enter(modes.UPLOAD);
        }
        function forceHidePopup() {
            if (modeController.isAny([modes.UPLOAD, modes.UPLOAD_SAVING]))
                modeController.enter(modes.VIEW);
            else
                exitModeUI();
        }
        function requestCancel() {
            if (saving)
                return;
            controls.cancelOverlay.style.display = 'block';
            controls.cancelPopup.style.display = 'block';
            global.setTimeout(() => controls.cancelStayButton.focus(), 0);
        }
        function hideCancelConfirmation() {
            controls.cancelOverlay.style.display = 'none';
            controls.cancelPopup.style.display = 'none';
        }
        const ctx = {
            controls, currentCustomers, elements, ensureSession, getPdfJsLib,
            hidePopup: forceHidePopup,
            isGenerationCurrent: (value) => value === generation,
            isSaving: () => saving,
            modeController, modes,
            nextGeneration: () => ++generation,
            onSave, onSaved,
            setSaving: (value) => { saving = value; },
            showFileStep: () => wizard.showFileStep(),
            showToast,
        };
        const pdfHandlers = PdfController.createPdfHandlers(ctx);
        const batchHandlers = BatchController.attachBatchHandlers(pdfHandlers, ctx);
        const importer = BatchImport.createBatchImporter({
            elements, controls, getPdfJsLib,
            nextGeneration: () => ++generation,
            isGenerationCurrent: (value) => value === generation,
            showToast,
            onStateChanged: () => wizard.refreshFileState(),
            onEmpty: () => wizard.showFileStep(),
        });
        continueFiles = () => {
            Ui.showPdfStep(elements, controls);
            pdfHandlers.showPdfOverview();
        };
        function chooseFiles() {
            const context = wizard.currentContext();
            if (!context.ok) {
                elements.errorEl.textContent = context.error;
                return;
            }
            elements.uploadContext = context;
            elements.pdfState.uploadContext = context;
            controls.fileInput.value = '';
            controls.fileInput.click();
        }
        async function handleFiles(fileList) {
            if (elements.pdfEditor?.style.display !== 'none') {
                showToast('Sluit eerst de actieve plattegrondbewerking.', 'error');
                return;
            }
            const context = elements.uploadContext || wizard.currentContext();
            if (!context.ok) {
                elements.errorEl.textContent = `${context.error} Kies eerst klant en locatie voordat u bestanden toevoegt.`;
                return;
            }
            elements.uploadContext = context;
            elements.pdfState.uploadContext = context;
            await importer.importFiles(fileList);
        }
        function hasDraggedFiles(event) {
            return Array.from(event.dataTransfer?.types || []).includes('Files');
        }
        function handleDragEnter(event) {
            if (!hasDraggedFiles(event) || saving)
                return;
            event.preventDefault();
            dragDepth++;
            controls.popup.classList.add('is-dragging-files');
        }
        function handleDragOver(event) {
            if (!hasDraggedFiles(event) || saving)
                return;
            event.preventDefault();
            if (event.dataTransfer)
                event.dataTransfer.dropEffect = 'copy';
        }
        function handleDragLeave(event) {
            if (!hasDraggedFiles(event))
                return;
            dragDepth = Math.max(0, dragDepth - 1);
            if (!dragDepth)
                controls.popup.classList.remove('is-dragging-files');
        }
        function handleDrop(event) {
            if (!hasDraggedFiles(event) || saving)
                return;
            event.preventDefault();
            dragDepth = 0;
            controls.popup.classList.remove('is-dragging-files');
            if (event.dataTransfer?.files?.length)
                handleFiles(event.dataTransfer.files);
        }
        function backToFiles() {
            wizard.showFileStep();
            importer.renderSources();
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            wizard.bind();
            controls.openButton.addEventListener('click', showPopup);
            controls.fileButton.addEventListener('click', chooseFiles);
            controls.addFilesButton?.addEventListener('click', chooseFiles);
            controls.fileInput.addEventListener('change', (event) => handleFiles(event.target.files));
            controls.cancelChooseButton.addEventListener('click', requestCancel);
            controls.cancelFormButton.addEventListener('click', requestCancel);
            controls.overlay.addEventListener('click', requestCancel);
            controls.cancelStayButton.addEventListener('click', hideCancelConfirmation);
            controls.cancelOverlay.addEventListener('click', hideCancelConfirmation);
            controls.cancelConfirmButton.addEventListener('click', forceHidePopup);
            controls.popup.addEventListener('dragenter', handleDragEnter);
            controls.popup.addEventListener('dragover', handleDragOver);
            controls.popup.addEventListener('dragleave', handleDragLeave);
            controls.popup.addEventListener('drop', handleDrop);
            bindPdfControls();
        }
        function bindPdfControls() {
            controls.pdfCloseButton?.addEventListener('click', requestCancel);
            controls.pdfRetakeButton?.addEventListener('click', backToFiles);
            controls.pdfSelectAllButton?.addEventListener('click', () => {
                elements.pdfState.pages.forEach((page) => { page.selected = true; });
                Ui.renderPdfPages(elements);
            });
            controls.pdfSelectNoneButton?.addEventListener('click', () => {
                elements.pdfState.pages.forEach((page) => { page.selected = false; });
                Ui.renderPdfPages(elements);
            });
            controls.pdfNextButton?.addEventListener('click', batchHandlers.showPdfFormForCurrentCustomers);
            controls.pdfFormBackButton?.addEventListener('click', pdfHandlers.showPdfOverview);
            controls.pdfEditorBackButton?.addEventListener('click', pdfHandlers.showPdfOverview);
            controls.pdfEditorCancelButton?.addEventListener('click', pdfHandlers.showPdfOverview);
            controls.pdfEditorSaveButton?.addEventListener('click', pdfHandlers.saveActivePdfPageEdit);
            controls.pdfZoomOutButton?.addEventListener('click', () => pdfHandlers.zoomActivePdfPage(1 / 1.2));
            controls.pdfZoomFitButton?.addEventListener('click', pdfHandlers.fitActivePdfPage);
            controls.pdfZoomInButton?.addEventListener('click', () => pdfHandlers.zoomActivePdfPage(1.2));
            controls.pdfRotateLeftButton?.addEventListener('click', () => pdfHandlers.rotateActivePdfPage(-1));
            controls.pdfRotateRightButton?.addEventListener('click', () => pdfHandlers.rotateActivePdfPage(1));
            controls.pdfSaveButton?.addEventListener('click', batchHandlers.savePdfBatchUpload);
        }
        elements.openPdfEditor = pdfHandlers.openPdfEditor;
        return { bind, enterModeUI, exitModeUI, forceHidePopup, isSaving: () => saving, requestCancel, showPopup };
    }
    FD.UploadController = { createUploadController };
})(window);
