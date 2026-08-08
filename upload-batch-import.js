(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.UploadPdfState;
    const Ui = FD.UploadPdfUi;
    const MAX_SOURCE_FILES = 20;
    const MAX_BATCH_ITEMS = 100;
    function createBatchImporter({ elements, controls, getPdfJsLib, nextGeneration, isGenerationCurrent, showToast, onStateChanged = () => { }, onEmpty = () => { }, }) {
        let importing = false;
        function sourceFiles() {
            const sources = new Map();
            (elements.pdfState.pages || []).forEach((page) => {
                if (!sources.has(page.sourceFileKey)) {
                    sources.set(page.sourceFileKey, {
                        key: page.sourceFileKey,
                        name: page.sourceFileName || 'Bestand',
                        objectUrl: page.objectUrl || '',
                    });
                }
            });
            return Array.from(sources.values());
        }
        function renderSourceList(container) {
            if (!container)
                return;
            container.innerHTML = '';
            sourceFiles().forEach(source => {
                const chip = global.document.createElement('div');
                chip.className = 'upload-source-chip';
                const label = global.document.createElement('span');
                label.textContent = source.name;
                const remove = global.document.createElement('button');
                remove.type = 'button';
                remove.className = 'upload-source-remove';
                remove.setAttribute('aria-label', `${source.name} verwijderen`);
                remove.title = `${source.name} verwijderen`;
                remove.textContent = '×';
                remove.addEventListener('click', () => removeSource(source.key));
                chip.appendChild(label);
                chip.appendChild(remove);
                container.appendChild(chip);
            });
        }
        function renderSources() {
            const sources = sourceFiles();
            renderSourceList(elements.sourceList);
            renderSourceList(elements.pdfSourceList);
            if (elements.selectedFileEl) {
                elements.selectedFileEl.textContent = sources.length
                    ? `${sources.length} bestand${sources.length === 1 ? '' : 'en'} gekozen`
                    : 'Nog geen bestanden gekozen';
            }
            onStateChanged({ sources, pages: elements.pdfState.pages || [] });
        }
        function removeSource(sourceFileKey) {
            const pages = elements.pdfState.pages || [];
            if (pages.some((page) => page.sourceFileKey === sourceFileKey && page.status === 'uploading')) {
                showToast('Dit bestand wordt al opgeslagen.', 'error');
                return;
            }
            const objectUrls = new Set(pages
                .filter((page) => page.sourceFileKey === sourceFileKey)
                .map((page) => page.objectUrl)
                .filter(Boolean));
            objectUrls.forEach(url => global.URL?.revokeObjectURL(url));
            elements.pdfState.pages = pages.filter((page) => page.sourceFileKey !== sourceFileKey);
            Ui.renderPdfPages(elements);
            renderSources();
            if (!elements.pdfState.pages.length)
                onEmpty();
        }
        function fileKind(file) {
            const type = String(file.type || '').toLowerCase();
            const name = String(file.name || '').toLowerCase();
            if (type === 'application/pdf' || name.endsWith('.pdf'))
                return 'pdf';
            if (type === 'image/svg+xml' || name.endsWith('.svg'))
                return 'svg';
            return 'image';
        }
        function nextSource(file) {
            const state = elements.pdfState;
            state.nextSourceId = Math.max(1, Number(state.nextSourceId || 1));
            const id = state.nextSourceId++;
            return { key: `source-${id}`, name: file.name, kind: fileKind(file) };
        }
        function nextBatchIndex() {
            return (elements.pdfState.pages || []).reduce((max, page) => Math.max(max, Number(page.batchIndex || 0)), 0) + 1;
        }
        async function importPdf(file, source, runGeneration) {
            if (file.size > Core.MAX_PDF_UPLOAD_BYTES)
                throw new Error('PDF is te groot (max 50 MB).');
            await Core.validatePdfUploadFile(file);
            const pdfDocument = await FD.PdfImportService.loadPdfDocument(getPdfJsLib(), file);
            if (!isGenerationCurrent(runGeneration))
                return;
            if (elements.pdfState.pages.length + pdfDocument.numPages > MAX_BATCH_ITEMS) {
                throw new Error(`Maximaal ${MAX_BATCH_ITEMS} plattegronden per upload.`);
            }
            if (!elements.pdfState.pdf)
                elements.pdfState.pdf = pdfDocument;
            for (let index = 0; index < pdfDocument.numPages; index++) {
                if (!isGenerationCurrent(runGeneration))
                    return;
                const sourcePageNumber = index + 1;
                const page = Pdf.createPdfPageItem(elements.pdfState, {
                    sourcePageNumber,
                    sourceKey: `${source.key}:page-${sourcePageNumber}`,
                    sourceFileName: source.name,
                    sourceType: 'pdf',
                    sourceFileKey: source.key,
                    pdfDocument,
                    batchIndex: nextBatchIndex(),
                });
                page.sourceFileKey = source.key;
                elements.pdfState.pages.push(page);
                try {
                    const thumb = await FD.PdfImportService.renderPdfPageToCanvas(pdfDocument, sourcePageNumber, { scale: FD.PdfImportService.THUMB_RENDER_SCALE });
                    page.thumbnailDataUrl = thumb.canvas.toDataURL('image/jpeg', 0.7);
                }
                catch {
                    page.error = 'Voorbeeld niet beschikbaar';
                }
                page.status = 'ready';
                if (index >= 5)
                    await Core.browserYield();
            }
        }
        function loadImage(file) {
            return new Promise((resolve, reject) => {
                const objectUrl = global.URL?.createObjectURL(file);
                const image = new global.Image();
                image.onload = () => {
                    global.URL?.revokeObjectURL(objectUrl);
                    resolve(image);
                };
                image.onerror = () => {
                    global.URL?.revokeObjectURL(objectUrl);
                    reject(new Error('Afbeelding kon niet worden geopend.'));
                };
                image.src = objectUrl;
            });
        }
        async function importImage(file, source, runGeneration) {
            if (file.size > Core.MAX_IMAGE_UPLOAD_BYTES)
                throw new Error('Bestand is te groot (max 20 MB).');
            await Core.validateImageUploadFile(file);
            if (elements.pdfState.pages.length >= MAX_BATCH_ITEMS)
                throw new Error(`Maximaal ${MAX_BATCH_ITEMS} plattegronden per upload.`);
            const image = await loadImage(file);
            if (!isGenerationCurrent(runGeneration))
                return;
            const resized = Core.resizeImageToCanvas(image, 2000);
            const dataUrl = Core.canvasToUploadJPEG(resized.canvas, { errorMessage: 'Afbeelding te groot. Probeer een kleinere afbeelding.' });
            const page = Pdf.createPdfPageItem(elements.pdfState, {
                sourcePageNumber: 1,
                sourceKey: `${source.key}:image`,
                sourceFileName: source.name,
                sourceType: 'image',
                sourceFileKey: source.key,
                batchIndex: nextBatchIndex(),
            });
            page.sourceFileKey = source.key;
            page.editDataUrl = dataUrl;
            page.outputWidth = resized.width;
            page.outputHeight = resized.height;
            page.thumbnailDataUrl = await FD.PdfImportService.dataUrlToThumbnail(dataUrl);
            if (!isGenerationCurrent(runGeneration))
                return;
            page.status = 'ready';
            elements.pdfState.pages.push(page);
        }
        async function importSvg(file, source, runGeneration) {
            if (elements.pdfState.pages.length >= MAX_BATCH_ITEMS)
                throw new Error(`Maximaal ${MAX_BATCH_ITEMS} plattegronden per upload.`);
            const svgText = await Core.readValidSvgUploadFile(file);
            if (!isGenerationCurrent(runGeneration))
                return;
            const objectUrl = global.URL?.createObjectURL(file);
            const page = Pdf.createPdfPageItem(elements.pdfState, {
                sourcePageNumber: 1,
                sourceKey: `${source.key}:svg`,
                sourceFileName: source.name,
                sourceType: 'svg',
                sourceFileKey: source.key,
                svgText,
                objectUrl,
                batchIndex: nextBatchIndex(),
            });
            page.sourceFileKey = source.key;
            page.thumbnailDataUrl = objectUrl;
            page.previewDataUrl = objectUrl;
            page.status = 'ready';
            elements.pdfState.pages.push(page);
        }
        async function importFiles(fileList) {
            if (importing)
                return;
            const files = Array.from(fileList || []);
            if (!files.length)
                return;
            const existingSources = sourceFiles().length;
            if (existingSources + files.length > MAX_SOURCE_FILES) {
                showToast(`Maximaal ${MAX_SOURCE_FILES} bestanden per upload.`, 'error');
                return;
            }
            importing = true;
            const runGeneration = nextGeneration();
            const errors = [];
            Ui.showPdfProcessing(elements, controls, `${files.length} bestand${files.length === 1 ? '' : 'en'}`);
            try {
                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    const file = files[fileIndex];
                    if (!isGenerationCurrent(runGeneration))
                        return;
                    elements.pdfSummary.textContent = `${fileIndex + 1} van ${files.length}: ${file.name}`;
                    const source = nextSource(file);
                    try {
                        if (source.kind === 'pdf')
                            await importPdf(file, source, runGeneration);
                        else if (source.kind === 'svg')
                            await importSvg(file, source, runGeneration);
                        else
                            await importImage(file, source, runGeneration);
                    }
                    catch (err) {
                        errors.push(`${file.name}: ${err.message || 'kon niet worden geladen'}`);
                    }
                }
            }
            finally {
                importing = false;
                controls.fileInput.value = '';
            }
            if (!isGenerationCurrent(runGeneration))
                return;
            renderSources();
            if (elements.pdfState.pages.length) {
                Core.hide(elements.pdfProcessing);
                Core.show(elements.pdfOverview, 'flex');
                Ui.renderPdfPages(elements);
            }
            else
                onEmpty();
            if (errors.length)
                showToast(errors.length === 1 ? errors[0] : `${errors.length} bestanden zijn overgeslagen. ${errors[0]}`, 'error');
        }
        return { importFiles, isImporting: () => importing, removeSource, renderSources, sourceFiles };
    }
    FD.UploadBatchImport = { createBatchImporter, MAX_BATCH_ITEMS, MAX_SOURCE_FILES };
})(window);
