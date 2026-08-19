(function (global) {
    const FD = global.FD = global.FD || {};
    const Parser = FD.BulkImportParser;
    const Files = FD.BulkImportFiles;
    const Api = FD.BulkImportApi;
    const Review = FD.BulkImportReview;
    function createBulkImportController({ config, getCustomers, getCurrentUser, getPdfJsLib, ensurePdfLibrary = async () => getPdfJsLib(), ensureCropperLibrary, ensureSession, showToast, onCreateTenant, onCatalogChanged = async () => { }, onClose = () => { }, }) {
        const el = (id) => global.document.getElementById(id);
        const shell = el('bulk-import-shell');
        const source = el('bulk-import-source');
        const review = el('bulk-import-review');
        const progress = el('bulk-import-progress');
        const customerSelect = el('bulk-import-customer');
        const folderInput = el('bulk-import-folder-input');
        const filesInput = el('bulk-import-files-input');
        const sourceError = el('bulk-import-source-error');
        const reviewError = el('bulk-import-review-error');
        const progressError = el('bulk-import-progress-error');
        const itemsEl = el('bulk-import-items');
        const progressItems = el('bulk-import-progress-items');
        let concept = null;
        let journal = null;
        let locations = [];
        let fileByItemId = new Map();
        let stopRequested = false;
        let running = false;
        const customerManager = FD.BulkImportCustomer.createBulkImportCustomer({
            config, getCustomers, getCurrentUser, onCreateTenant, sourceError,
        });
        const previewController = FD.BulkImportPreview.createBulkImportPreview({
            getPdfJsLib, ensurePdfLibrary, ensureCropperLibrary, showToast,
            findItem,
            onEdited: () => { if (concept)
                Review.refreshItems(itemsEl, concept); },
        });
        function selectedCustomer() { return customerManager.selected(); }
        function setStep(name) {
            source.hidden = name !== 'source';
            review.hidden = name !== 'review';
            progress.hidden = name !== 'progress';
        }
        function showNormalUpload(visible) {
            const popup = el('upload-popup');
            const overlay = el('upload-overlay');
            popup.style.display = visible ? 'block' : 'none';
            overlay.style.display = visible ? 'block' : 'none';
        }
        async function loadResumable() {
            const list = await Api.list(config);
            const active = list.filter((item) => item.state === 'active');
            el('bulk-import-resume').hidden = !active.length;
            Review.renderResume(el('bulk-import-resume-list'), active);
        }
        async function open() {
            if (!await ensureSession())
                return;
            concept = null;
            journal = null;
            fileByItemId.clear();
            stopRequested = false;
            customerSelect.disabled = false;
            shell.querySelector('.bulk-import-source-grid').classList.remove('is-resume');
            showNormalUpload(false);
            shell.hidden = false;
            setStep('source');
            sourceError.textContent = '';
            reviewError.textContent = '';
            progressError.textContent = '';
            el('btn-bulk-done').hidden = true;
            el('btn-bulk-cancel').hidden = false;
            el('bulk-import-progress-title').textContent = 'Import voorbereiden';
            customerManager.reset();
            try {
                await loadResumable();
            }
            catch {
                el('bulk-import-resume').hidden = true;
            }
            global.setTimeout(() => customerSelect.focus(), 0);
        }
        function close(exitUpload = true) {
            if (running)
                stopRequested = true;
            shell.hidden = true;
            previewController.close();
            if (exitUpload)
                onClose();
        }
        function targetKey() {
            return `target-${global.crypto.randomUUID().replace(/-/g, '')}`;
        }
        async function prepareConcept(fileList) {
            const customer = selectedCustomer();
            if (!customer) {
                sourceError.textContent = 'Kies eerst een klant.';
                return;
            }
            sourceError.textContent = '';
            try {
                const nextConcept = Parser.buildConcept(fileList);
                concept = nextConcept;
                const tenantId = customerManager.tenantId(customer);
                locations = tenantId > 0 ? await FD.DataService.listLocations(config, tenantId) : [];
                nextConcept.targets.forEach((target) => {
                    const existing = locations.find(location => String(location.name).trim().toLocaleLowerCase() === String(target.name).trim().toLocaleLowerCase());
                    if (existing) {
                        target.kind = 'existing';
                        target.existingLocationId = Number(existing.id);
                    }
                });
                locations.forEach(location => {
                    if (!nextConcept.targets.some((target) => Number(target.existingLocationId) === Number(location.id))) {
                        nextConcept.targets.push({ key: targetKey(), name: location.name, kind: 'existing', existingLocationId: Number(location.id) });
                    }
                });
                nextConcept.tenantId = tenantId;
                nextConcept.customer = customer;
                renderReview();
                setStep('review');
            }
            catch (error) {
                sourceError.textContent = error?.message || 'De gekozen bestanden konden niet worden gelezen.';
            }
            finally {
                folderInput.value = '';
                filesInput.value = '';
            }
        }
        function renderReview() {
            if (!concept)
                return;
            Review.renderItems(itemsEl, concept);
            updateReviewSummary();
        }
        function updateReviewSummary() {
            if (!concept)
                return;
            const included = concept.items.filter((item) => item.include).length;
            el('bulk-import-review-count').textContent = `${included} van ${concept.items.length} kaarten opnemen`;
            el('bulk-import-structure-note').textContent = concept.structure.usable ? `Hoofdmap: ${concept.structure.rootName}` : concept.structure.warning;
        }
        function findItem(itemId) {
            return concept?.items.find((item) => item.id === itemId) || null;
        }
        function assignTarget(item, targetKey) {
            item.targetKey = targetKey;
            item.warning = targetKey ? item.proposalWarning : 'Gebouw kiezen voordat deze kaart kan worden geïmporteerd.';
        }
        function handleItemChange(event) {
            const control = event.target;
            const item = findItem(String(control.dataset.itemId || ''));
            if (!item)
                return;
            const field = String(control.dataset.field || '');
            if (field === 'include')
                item.include = control.checked;
            else if (field === 'levelOrder')
                item.levelOrder = Number(control.value);
            else if (field === 'targetKey') {
                assignTarget(item, control.value);
                renderReview();
                return;
            }
            else
                item[field] = control.value;
            Review.refreshItems(itemsEl, concept);
            updateReviewSummary();
        }
        function validateReview() {
            if (!concept)
                return 'Importvoorstel ontbreekt.';
            const included = concept.items.filter((item) => item.include);
            if (!included.length)
                return 'Selecteer minimaal één kaart.';
            if (included.some((item) => !item.targetKey))
                return 'Kies voor iedere opgenomen kaart een gebouw.';
            if (included.some((item) => !String(item.mapName).trim() || String(item.mapName).trim().length > 100))
                return 'Controleer alle kaartnamen.';
            if (included.some((item) => !Number.isInteger(item.levelOrder) || item.levelOrder < -50 || item.levelOrder > 100))
                return 'Controleer alle sorteervolgordes.';
            if (Parser.duplicateKeys(included).size)
                return 'Los dubbele kaartnamen en verdiepingen binnen hetzelfde gebouw op.';
            const customer = concept.customer;
            const targetByKey = new Map(concept.targets.map((target) => [target.key, target]));
            const exists = included.some((item) => {
                const target = targetByKey.get(item.targetKey);
                if (!target || target.kind !== 'existing')
                    return false;
                return (customer.floorplans || []).some((floor) => Number(floor.locationId) === Number(target.existingLocationId) && String(floor.floorLabel || floor.name).trim().toLocaleLowerCase() === String(item.mapName).trim().toLocaleLowerCase() && Number(floor.levelOrder) === Number(item.levelOrder));
            });
            return exists ? 'Minimaal één kaart bestaat al op de gekozen locatie. Bulkimport overschrijft nooit bestaande kaarten.' : '';
        }
        function createPayload() {
            const included = concept.items.filter((item) => item.include);
            const usedKeys = new Set(included.map((item) => item.targetKey));
            return {
                client_token: concept.clientToken || (concept.clientToken = global.crypto.randomUUID()), tenant_id: concept.tenantId,
                targets: concept.targets.filter((target) => usedKeys.has(target.key)).map((target) => target.kind === 'existing'
                    ? { key: target.key, existing_location_id: target.existingLocationId }
                    : { key: target.key, name: target.name }),
                items: included.map((item) => ({
                    id: item.id, target_key: item.targetKey, source_name: item.file.name,
                    relative_path: item.relativePath, source_sha256: item.hash, source_bytes: item.file.size,
                    floor_name: String(item.mapName).trim(), level_order: item.levelOrder,
                })),
            };
        }
        function progressModel() {
            return (journal?.items || []).map((item) => ({ ...item, file: fileByItemId.get(item.id) }));
        }
        function renderProgress() {
            const items = progressModel();
            Review.renderProgress(progressItems, items);
            const completed = items.filter(item => item.state === 'completed').length;
            const failed = items.filter(item => item.state === 'failed').length;
            el('bulk-import-progress-summary').textContent = `${completed} van ${items.length} gereed${failed ? ` · ${failed} mislukt` : ''}`;
            el('bulk-import-progress-bar').style.width = `${items.length ? completed / items.length * 100 : 0}%`;
        }
        async function uploadItem(item, file) {
            item.state = 'converting';
            renderProgress();
            let svgText;
            const conceptItem = findItem(item.id);
            try {
                await ensurePdfLibrary();
                svgText = await Files.convert(conceptItem || file, getPdfJsLib);
            }
            catch (error) {
                await Api.failItem(config, journal.id, item.id, error?.message || 'Converteren mislukt.');
                throw error;
            }
            item.state = 'uploading';
            renderProgress();
            try {
                await Api.uploadSvg(config, journal.id, item.id, item.source_sha256, svgText);
            }
            catch (firstError) {
                if (Number(firstError?.status || 0) > 0)
                    throw firstError;
                const current = await Api.get(config, journal.id);
                if (current.items.find((entry) => entry.id === item.id)?.state === 'completed')
                    return;
                await Api.uploadSvg(config, journal.id, item.id, item.source_sha256, svgText);
            }
        }
        async function createJournal(payload) {
            try {
                return await Api.create(config, payload);
            }
            catch (error) {
                if (Number(error?.status || 0) > 0)
                    throw error;
                return Api.create(config, payload);
            }
        }
        async function runImport() {
            if (!journal || running)
                return;
            running = true;
            stopRequested = false;
            progressError.textContent = '';
            setStep('progress');
            renderProgress();
            for (const item of journal.items) {
                if (stopRequested || item.state === 'completed' || item.state === 'cancelled')
                    continue;
                const file = fileByItemId.get(item.id);
                if (!file) {
                    item.state = 'failed';
                    item.error = 'Kies de bronmap opnieuw om dit item te hervatten.';
                    continue;
                }
                try {
                    await uploadItem(item, file);
                    item.state = 'completed';
                    item.error = '';
                }
                catch (error) {
                    item.state = 'failed';
                    item.error = error?.message || 'Importeren mislukt.';
                }
                renderProgress();
            }
            try {
                journal = await Api.get(config, journal.id);
                await onCatalogChanged();
            }
            catch (error) {
                progressError.textContent = error?.message || 'De eindstatus kon niet worden geladen.';
            }
            running = false;
            renderProgress();
            el('btn-bulk-done').hidden = false;
            el('btn-bulk-cancel').hidden = journal?.state !== 'active';
            el('bulk-import-progress-title').textContent = journal?.state === 'completed' ? 'Bulkimport gereed' : 'Bulkimport onderbroken';
        }
        async function retryItem(itemId) {
            if (!journal || running)
                return;
            const item = journal.items.find((entry) => entry.id === itemId);
            const file = fileByItemId.get(itemId);
            if (!item || !file)
                return;
            running = true;
            progressError.textContent = '';
            try {
                await uploadItem(item, file);
            }
            catch (error) {
                progressError.textContent = error?.message || 'Opnieuw proberen is mislukt.';
            }
            try {
                journal = await Api.get(config, journal.id);
            }
            catch (error) {
                progressError.textContent = error?.message || 'De bijgewerkte status kon niet worden geladen.';
            }
            running = false;
            renderProgress();
            if (journal?.state === 'completed') {
                el('bulk-import-progress-title').textContent = 'Bulkimport gereed';
                await onCatalogChanged();
            }
        }
        async function confirm() {
            const error = validateReview();
            reviewError.textContent = error;
            if (error || !concept)
                return;
            el('bulk-import-progress-title').textContent = 'Bronbestanden controleren';
            setStep('progress');
            const tempItems = concept.items.filter((item) => item.include);
            journal = { items: tempItems.map((item) => ({ ...item, source_name: item.file.name, floor_name: item.mapName, location_name: item.buildingName, state: 'hashing' })) };
            fileByItemId = new Map(tempItems.map((item) => [item.id, item.file]));
            renderProgress();
            try {
                await Files.hashItems(concept.items, (done, total) => { el('bulk-import-progress-summary').textContent = `${done} van ${total} bestanden gecontroleerd`; });
                const customer = await customerManager.materialize();
                if (!customer)
                    throw new Error('Kies eerst een klant.');
                concept.customer = customer;
                concept.tenantId = customerManager.tenantId(customer);
                journal = await createJournal(createPayload());
                await runImport();
            }
            catch (err) {
                const message = err?.message || 'Import kon niet worden gestart.';
                if (!journal?.id) {
                    if (Number(err?.status || 0) > 0)
                        concept.clientToken = '';
                    reviewError.textContent = message;
                    setStep('review');
                }
                else {
                    progressError.textContent = message;
                    el('btn-bulk-done').hidden = false;
                }
            }
        }
        async function resume(importId) {
            const resumed = await Api.get(config, importId);
            journal = resumed;
            customerSelect.value = String(resumed.tenant_id);
            customerSelect.disabled = true;
            sourceError.textContent = 'Kies dezelfde hoofdmap opnieuw. Bestanden worden op pad, grootte en SHA-256 gecontroleerd.';
            shell.querySelector('.bulk-import-source-grid').classList.add('is-resume');
        }
        async function resumeWithFiles(fileList) {
            const files = Array.from(fileList || []);
            const matched = await Files.matchResumeFiles(journal.items, files, (done, total) => { sourceError.textContent = `${done} van ${total} bronbestanden gecontroleerd`; });
            if (matched.mismatches.length) {
                sourceError.textContent = `${matched.mismatches.length} bestand(en) ontbreken of wijken af. Kies de oorspronkelijke bronmap.`;
                return;
            }
            fileByItemId = matched.matches;
            await runImport();
        }
        async function handleFiles(fileList) {
            if (journal && !concept)
                await resumeWithFiles(fileList);
            else
                await prepareConcept(fileList);
        }
        function bind() {
            el('btn-bulk-upload').addEventListener('click', open);
            el('btn-bulk-close').addEventListener('click', () => close());
            el('btn-bulk-done').addEventListener('click', () => close());
            el('btn-bulk-folder').addEventListener('click', () => folderInput.click());
            el('btn-bulk-files').addEventListener('click', () => filesInput.click());
            folderInput.addEventListener('change', () => handleFiles(folderInput.files || []));
            filesInput.addEventListener('change', () => handleFiles(filesInput.files || []));
            el('btn-bulk-back').addEventListener('click', () => { concept = null; journal = null; customerSelect.disabled = false; setStep('source'); });
            el('btn-bulk-confirm').addEventListener('click', confirm);
            el('btn-bulk-add-target').addEventListener('click', () => {
                const input = el('bulk-import-new-target-name');
                const name = input.value.trim();
                if (!concept || name.length < 2)
                    return;
                const existing = locations.find(location => String(location.name).trim().toLocaleLowerCase() === name.toLocaleLowerCase());
                const duplicate = concept.targets.some((target) => String(target.name).trim().toLocaleLowerCase() === name.toLocaleLowerCase());
                if (!duplicate)
                    concept.targets.push(existing ? { key: targetKey(), name: existing.name, kind: 'existing', existingLocationId: Number(existing.id) } : { key: targetKey(), name, kind: 'new' });
                input.value = '';
                renderReview();
            });
            itemsEl.addEventListener('change', handleItemChange);
            itemsEl.addEventListener('click', event => { const button = event.target.closest('[data-action="preview"]'); if (button)
                previewController.open(String(button.dataset.itemId)); });
            el('bulk-import-resume-list').addEventListener('click', event => { const button = event.target.closest('[data-resume-id]'); if (button)
                resume(String(button.dataset.resumeId)).catch(error => { sourceError.textContent = error.message; }); });
            progressItems.addEventListener('click', event => { const button = event.target.closest('[data-retry-id]'); if (button)
                retryItem(String(button.dataset.retryId)); });
            el('btn-bulk-cancel').addEventListener('click', async () => { if (!journal)
                return; stopRequested = true; journal = await Api.cancel(config, journal.id); renderProgress(); });
            const dropzone = el('bulk-import-dropzone');
            ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-dragging'); }));
            ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-dragging'); }));
            dropzone.addEventListener('drop', event => { const files = event.dataTransfer?.files; if (files?.length)
                handleFiles(files); });
            customerManager.bind();
            previewController.bind();
        }
        return { bind, close, open };
    }
    FD.BulkImportController = { createBulkImportController };
})(window);
