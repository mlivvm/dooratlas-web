(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.PdfImportService;
    function hex(buffer) {
        return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    async function hashFile(file) {
        return hex(await global.crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
    }
    async function loadOnePage(file, getPdfJsLib) {
        if (file.size > Core.MAX_PDF_UPLOAD_BYTES)
            throw new Error('PDF is te groot (max 50 MB).');
        await Core.validatePdfUploadFile(file);
        const pdf = await Pdf.loadPdfDocument(getPdfJsLib(), file);
        if (pdf.numPages !== 1) {
            await pdf.destroy?.();
            throw new Error(`Deze PDF heeft ${pdf.numPages} pagina's. Bulkimport verwacht één kaart per PDF.`);
        }
        return pdf;
    }
    async function preview(file, getPdfJsLib) {
        const pdf = await loadOnePage(file, getPdfJsLib);
        try {
            const rendered = Pdf.renderPdfPageForEditorPreview
                ? await Pdf.renderPdfPageForEditorPreview(pdf, 1)
                : await Pdf.renderPdfPageToCanvas(pdf, 1, { scale: 2 });
            const dataUrl = rendered.canvas.toDataURL('image/jpeg', 0.86);
            rendered.canvas.width = 1;
            rendered.canvas.height = 1;
            return dataUrl;
        }
        finally {
            await pdf.destroy?.();
        }
    }
    async function convert(source, getPdfJsLib) {
        if (source?.editDataUrl) {
            const item = source;
            return Pdf.buildUploadSVGText({ imageDataUrl: item.editDataUrl, width: item.outputWidth, height: item.outputHeight });
        }
        const file = source?.file || source;
        const pdf = await loadOnePage(file, getPdfJsLib);
        try {
            const rendered = await Pdf.renderPdfPageToCanvas(pdf, 1);
            const jpeg = Pdf.uploadJPEGResult(rendered.canvas);
            rendered.canvas.width = 1;
            rendered.canvas.height = 1;
            return Pdf.buildUploadSVGText({ imageDataUrl: jpeg.dataUrl, width: jpeg.width, height: jpeg.height });
        }
        finally {
            await pdf.destroy?.();
        }
    }
    async function hashItems(items, onProgress = () => { }) {
        const selected = items.filter(item => item.include);
        for (let index = 0; index < selected.length; index++) {
            const item = selected[index];
            if (!item.hash)
                item.hash = await hashFile(item.file);
            onProgress(index + 1, selected.length, item);
            await Core.browserYield();
        }
    }
    async function matchResumeFiles(journalItems, files, onProgress = () => { }) {
        const Parser = FD.BulkImportParser;
        const candidates = files.map(file => ({ file, path: Parser.relativePath(file) || file.name, hash: '', used: false }));
        const matches = new Map();
        const mismatches = [];
        for (let index = 0; index < journalItems.length; index++) {
            const item = journalItems[index];
            if (item.state === 'completed' || item.state === 'cancelled')
                continue;
            const exact = candidates.find(entry => !entry.used && entry.path === item.relative_path && entry.file.size === item.source_bytes);
            const possible = exact ? [exact] : candidates.filter(entry => !entry.used && entry.file.name === item.source_name && entry.file.size === item.source_bytes);
            let candidate;
            for (const entry of possible) {
                if (!entry.hash)
                    entry.hash = await hashFile(entry.file);
                if (entry.hash === item.source_sha256) {
                    candidate = entry;
                    break;
                }
            }
            if (!candidate)
                mismatches.push(item.relative_path);
            else {
                candidate.used = true;
                matches.set(item.id, candidate.file);
            }
            onProgress(index + 1, journalItems.length);
            await Core.browserYield();
        }
        return { matches, mismatches };
    }
    FD.BulkImportFiles = { convert, hashFile, hashItems, loadOnePage, matchResumeFiles, preview };
})(window);
