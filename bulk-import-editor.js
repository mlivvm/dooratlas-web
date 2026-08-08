(function (global) {
    const FD = global.FD = global.FD || {};
    function createBulkImportEditor({ getPdfJsLib, ensureCropperLibrary, showToast, onSaved }) {
        const byId = (id) => global.document.getElementById(id);
        const shell = byId('bulk-import-editor-shell');
        const state = { pages: [], nextItemId: 1, activeEditorRun: 0 };
        const dummy = () => {
            const element = global.document.createElement('div');
            element.style.display = 'none';
            return element;
        };
        const elements = {
            pdfState: state,
            pdfEditor: shell,
            pdfEditorTitle: byId('bulk-import-editor-title'),
            pdfEditorImg: byId('bulk-import-editor-image'),
            pdfEditorLoading: byId('bulk-import-editor-loading'),
            pdfEditorSaveButton: byId('btn-bulk-editor-save'),
            pdfTitle: byId('bulk-import-editor-title'),
            pdfSummary: dummy(),
            pdfOverview: dummy(),
            pdfForm: dummy(),
            pdfProcessing: dummy(),
            pdfErrorEl: dummy(),
            pdfProgress: dummy(),
            pdfProgressBar: dummy(),
            pdfProgressText: dummy(),
        };
        let item = null;
        let pdf = null;
        async function releasePdf() {
            const current = pdf;
            pdf = null;
            if (current)
                await current.destroy?.();
        }
        const handlers = FD.UploadPdfController.createPdfHandlers({
            elements,
            controls: {},
            getPdfJsLib,
            ensureCropperLibrary,
            showToast,
            onEditorClosed: async ({ discardEditorChanges }) => {
                shell.hidden = true;
                const page = state.pages[0];
                if (!discardEditorChanges && item && page?.edited) {
                    Object.assign(item, {
                        editDataUrl: page.editDataUrl,
                        outputWidth: page.outputWidth,
                        outputHeight: page.outputHeight,
                        thumbnailDataUrl: page.thumbnailDataUrl,
                        edited: true,
                    });
                    onSaved(item);
                }
                item = null;
                state.pages = [];
                await releasePdf();
            },
        });
        async function open(nextItem) {
            await releasePdf();
            item = nextItem;
            try {
                pdf = await FD.BulkImportFiles.loadOnePage(nextItem.file, getPdfJsLib);
                const page = FD.UploadPdfState.createPdfPageItem(state, {
                    sourcePageNumber: 1,
                    sourceKey: `bulk:${nextItem.id}`,
                    sourceFileName: nextItem.file.name,
                    sourceType: 'pdf',
                    pdfDocument: pdf,
                    batchIndex: 1,
                });
                Object.assign(page, {
                    editDataUrl: nextItem.editDataUrl || '',
                    outputWidth: nextItem.outputWidth || 0,
                    outputHeight: nextItem.outputHeight || 0,
                    thumbnailDataUrl: nextItem.thumbnailDataUrl || '',
                    edited: Boolean(nextItem.edited),
                    status: 'ready',
                });
                state.pages = [page];
                shell.hidden = false;
                await handlers.openPdfEditor(page.itemId);
            }
            catch (error) {
                shell.hidden = true;
                item = null;
                await releasePdf();
                showToast(error?.message || 'Deze plattegrond kon niet worden bewerkt.', 'error');
            }
        }
        function bind() {
            byId('btn-bulk-editor-cancel').addEventListener('click', () => handlers.showPdfOverview());
            byId('btn-bulk-editor-save').addEventListener('click', handlers.saveActivePdfPageEdit);
            byId('btn-bulk-editor-zoom-out').addEventListener('click', () => handlers.zoomActivePdfPage(1 / 1.2));
            byId('btn-bulk-editor-zoom-fit').addEventListener('click', handlers.fitActivePdfPage);
            byId('btn-bulk-editor-zoom-in').addEventListener('click', () => handlers.zoomActivePdfPage(1.2));
            byId('btn-bulk-editor-rotate-left').addEventListener('click', () => handlers.rotateActivePdfPage(-1));
            byId('btn-bulk-editor-rotate-right').addEventListener('click', () => handlers.rotateActivePdfPage(1));
        }
        return { bind, open };
    }
    FD.BulkImportEditor = { createBulkImportEditor };
})(window);
