(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Form = FD.UploadPdfForm;
    FD.UploadService = {
        MAX_IMAGE_UPLOAD_BYTES: Core.MAX_IMAGE_UPLOAD_BYTES,
        MAX_PDF_UPLOAD_BYTES: Core.MAX_PDF_UPLOAD_BYTES,
        MAX_SVG_UPLOAD_BYTES: Core.MAX_SVG_UPLOAD_BYTES,
        MAX_UPLOAD_BYTES: Core.MAX_IMAGE_UPLOAD_BYTES,
        buildUploadSVGText: Core.buildUploadSVGText,
        canvasToUploadJPEG: Core.canvasToUploadJPEG,
        createUploadedFloorplanActionsController: FD.UploadActions.createUploadedFloorplanActionsController,
        createUploadController: FD.UploadController.createUploadController,
        formatUploadError: Core.formatUploadError,
        populateCustomerSelect: Core.populateCustomerSelect,
        readValidSvgUploadFile: Core.readValidSvgUploadFile,
        resetFormState: Core.resetFormState,
        resetPreviewState: Core.resetPreviewState,
        resizeImageToCanvas: Core.resizeImageToCanvas,
        sanitizeFilename: Core.sanitizeFilename,
        showChooseStep: Core.showChooseStep,
        showCustomerSelect: Core.showCustomerSelect,
        showForm: Core.showForm,
        showNewCustomerInput: Core.showNewCustomerInput,
        showPdfProcessing: FD.UploadPdfUi.showPdfProcessing,
        showPreview: Core.showPreview,
        validatePdfBatchForm: Form.validatePdfBatchForm,
        validateNewLocationMetadata: Core.validateNewLocationMetadata,
        validateNewTenantMetadata: Core.validateNewTenantMetadata,
        validateUploadMetadata: Core.validateUploadMetadata,
    };
})(window);
