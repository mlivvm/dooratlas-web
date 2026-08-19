(function (global) {
    const FD = global.FD = global.FD || {};
    function createBulkImportPreview({ getPdfJsLib, ensurePdfLibrary, ensureCropperLibrary, findItem, showToast, onEdited }) {
        const byId = (id) => global.document.getElementById(id);
        const overlay = byId('bulk-import-preview');
        const stage = byId('bulk-import-preview-stage');
        const image = byId('bulk-import-preview-image');
        const loading = byId('bulk-import-preview-loading');
        let activeItem = null;
        let zoom = 1;
        const editor = FD.BulkImportEditor.createBulkImportEditor({
            getPdfJsLib,
            ensureCropperLibrary,
            showToast,
            onSaved: (item) => {
                onEdited(item);
                open(item.id);
            },
        });
        function applyZoom(nextZoom) {
            zoom = Math.max(0.1, Math.min(5, nextZoom));
            const naturalWidth = Math.max(1, image.naturalWidth || 1);
            image.style.width = `${Math.round(naturalWidth * zoom)}px`;
        }
        function fit() {
            if (!image.naturalWidth || !image.naturalHeight)
                return;
            const width = Math.max(1, stage.clientWidth - 36);
            const height = Math.max(1, stage.clientHeight - 36);
            applyZoom(Math.min(1, width / image.naturalWidth, height / image.naturalHeight));
            stage.scrollTo({ left: 0, top: 0 });
        }
        async function open(itemId) {
            const item = findItem(itemId);
            if (!item)
                return;
            activeItem = item;
            overlay.hidden = false;
            image.hidden = true;
            image.removeAttribute('src');
            loading.hidden = false;
            loading.textContent = 'Voorbeeld laden...';
            byId('bulk-import-preview-title').textContent = item.file.name;
            try {
                await ensurePdfLibrary();
                image.onload = () => { image.hidden = false; loading.hidden = true; fit(); };
                image.src = item.editDataUrl || await FD.BulkImportFiles.preview(item.file, getPdfJsLib);
            }
            catch (error) {
                loading.textContent = error?.message || 'Voorbeeld niet beschikbaar.';
            }
        }
        function close() {
            overlay.hidden = true;
            activeItem = null;
            image.removeAttribute('src');
            image.style.width = '';
        }
        function bind() {
            editor.bind();
            byId('btn-bulk-preview-close').addEventListener('click', close);
            byId('btn-bulk-preview-zoom-out').addEventListener('click', () => applyZoom(zoom / 1.25));
            byId('btn-bulk-preview-zoom-fit').addEventListener('click', fit);
            byId('btn-bulk-preview-zoom-in').addEventListener('click', () => applyZoom(zoom * 1.25));
            byId('btn-bulk-preview-edit').addEventListener('click', () => {
                if (!activeItem)
                    return;
                const item = activeItem;
                close();
                editor.open(item);
            });
        }
        return { bind, close, open };
    }
    FD.BulkImportPreview = { createBulkImportPreview };
})(window);
