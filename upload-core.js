(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
    const MAX_SVG_UPLOAD_BYTES = 5 * 1024 * 1024;
    const MAX_PDF_UPLOAD_BYTES = 50 * 1024 * 1024;
    const MAX_UPLOAD_DATA_URL_LENGTH = 1560000;
    const MAX_PDF_DUPLICATES_PER_PAGE = 10;
    function hide(el) {
        if (el)
            el.style.display = 'none';
    }
    function show(el, display = 'block') {
        if (el)
            el.style.display = display;
    }
    function isNetworkUploadError(err) {
        const message = String(err?.message || '');
        return err?.name === 'TypeError' ||
            /Failed to fetch|NetworkError|Load failed|ERR_INTERNET_DISCONNECTED/i.test(message) ||
            (Number(err?.status) >= 502 && Number(err?.status) <= 504);
    }
    function isSessionUploadError(err) {
        const code = String(err?.code || err?.message || '');
        return Number(err?.status) === 401 && (code === 'session_required' ||
            code === 'invalid_session' ||
            code === 'worker_session_required');
    }
    function formatUploadError(err) {
        const code = String(err?.code || err?.message || '');
        if (isSessionUploadError(err))
            return 'Sessie verlopen. Log opnieuw in en probeer de upload opnieuw.';
        if (Number(err?.status) === 403)
            return 'Geen uploadrechten voor dit account. Log in met een admin-account.';
        if (Number(err?.status) === 409)
            return err?.message || 'Deze plattegrond of deurcode bestaat al.';
        if (Number(err?.status) === 413)
            return 'Bestand is te groot. Maak de uitsnede kleiner of kies een kleiner bestand.';
        if (Number(err?.status) === 415)
            return 'Gebruik een SVG-bestand.';
        if (Number(err?.status) >= 500)
            return 'Serverfout tijdens uploaden. Probeer opnieuw; als dit blijft gebeuren, meld dit met klant en plattegrondnaam.';
        if (isNetworkUploadError(err))
            return 'Uploadserver tijdelijk niet bereikbaar. De PDF/foto is waarschijnlijk niet het probleem. Controleer internet/VPN en probeer opnieuw.';
        if (code === 'github_content_put_failed' && Number(err?.status) === 409) {
            return 'Opslag was tijdelijk bezig door een andere wijziging. Automatisch opnieuw geprobeerd, maar nog niet gelukt. Probeer opnieuw.';
        }
        if (code === 'github_content_put_failed')
            return 'Opslaan in de online opslag is niet gelukt. Probeer opnieuw; als dit blijft gebeuren, meld dit met klant en plattegrondnaam.';
        if (code === 'uploaded_floorplan_already_exists' || code === 'uploaded_floorplan_file_exists') {
            return 'Deze plattegrond lijkt al te bestaan. Ververs de app en controleer de klantlijst voordat je opnieuw uploadt.';
        }
        if (code === 'customer_not_found')
            return 'Klant niet gevonden. Ververs de app en kies de klant opnieuw.';
        if (code === 'customer_already_exists')
            return 'Deze klant bestaat al. Ververs de app en selecteer de bestaande klant.';
        return err?.message || 'Upload mislukt.';
    }
    function resetPreviewState(elements) {
        if (elements.imageState.previewObjectUrl)
            global.URL?.revokeObjectURL(elements.imageState.previewObjectUrl);
        elements.imageState.dataUrl = null;
        elements.imageState.svgText = null;
        elements.imageState.previewObjectUrl = null;
        elements.imageState.width = 0;
        elements.imageState.height = 0;
        elements.previewImg.src = '';
        if (elements.metadataPreviewImg)
            elements.metadataPreviewImg.src = '';
        elements.previewImg.style.display = '';
        elements.previewTitle.textContent = 'Voorbeeld';
        elements.previewRetakeBtn.style.display = '';
        elements.previewAcceptBtn.style.display = '';
        elements.stepChoose.style.display = 'block';
        elements.stepPreview.style.display = 'none';
        elements.stepForm.style.display = 'none';
        hide(elements.stepMetadata);
        hide(elements.stepPdf);
        elements.errorEl.textContent = '';
    }
    function resetFormState(elements) {
        elements.customerSelect.style.display = '';
        elements.customerSelect.value = '';
        elements.newCustomerWrapper.style.display = 'none';
        elements.newCustomerInput.value = '';
        if (elements.newCustomerShortNameInput)
            elements.newCustomerShortNameInput.value = '';
        if (elements.newCustomerNotesInput)
            elements.newCustomerNotesInput.value = '';
        if (elements.customerSearchInput)
            elements.customerSearchInput.value = '';
        if (elements.locationSearchInput)
            elements.locationSearchInput.value = '';
        if (elements.locationSelect) {
            elements.locationSelect.innerHTML = '<option value="">Kies eerst een klant</option>';
            elements.locationSelect.disabled = true;
        }
        if (elements.newLocationButton)
            elements.newLocationButton.disabled = true;
        if (elements.newLocationWrapper)
            elements.newLocationWrapper.style.display = 'none';
        ['locationNameInput', 'locationStreetInput', 'locationPostalCodeInput', 'locationCityInput', 'locationNotesInput']
            .forEach(key => { if (elements[key])
            elements[key].value = ''; });
        elements.floorplanNameInput.value = '';
        if (elements.levelOrderInput)
            elements.levelOrderInput.value = '';
        if (elements.floorNotesInput)
            elements.floorNotesInput.value = '';
        if (elements.selectedFileEl)
            elements.selectedFileEl.textContent = 'Nog geen bestanden gekozen';
    }
    function showPreview(elements, dataUrl, width, height) {
        if (elements.imageState.previewObjectUrl)
            global.URL?.revokeObjectURL(elements.imageState.previewObjectUrl);
        elements.imageState.dataUrl = dataUrl;
        elements.imageState.svgText = null;
        elements.imageState.previewObjectUrl = null;
        elements.imageState.width = width;
        elements.imageState.height = height;
        elements.previewImg.src = dataUrl;
        elements.previewImg.style.display = '';
        elements.previewTitle.textContent = 'Voorbeeld';
        elements.previewRetakeBtn.style.display = '';
        elements.previewAcceptBtn.style.display = '';
        elements.stepChoose.style.display = 'none';
        elements.stepPreview.style.display = 'block';
        elements.stepForm.style.display = 'none';
        hide(elements.stepMetadata);
    }
    function showChooseStep(elements) {
        elements.stepPreview.style.display = 'none';
        elements.stepChoose.style.display = 'block';
        elements.stepForm.style.display = 'none';
        hide(elements.stepMetadata);
        hide(elements.stepPdf);
    }
    function populateCustomerSelect(selectEl, customers) {
        selectEl.innerHTML = '<option value="">-- Kies klant --</option>';
        const sortedCustomers = FD.SelectSheetService?.sortedWithOriginalIndex
            ? FD.SelectSheetService.sortedWithOriginalIndex(customers, (customer) => customer.customer)
            : (customers || []).map((customer, index) => ({ item: customer, index, label: String(customer?.customer || '').trim() }));
        sortedCustomers.forEach(({ item, label }) => {
            const opt = document.createElement('option');
            opt.value = String(item?.tenantId || item?.id || '');
            opt.textContent = label;
            selectEl.appendChild(opt);
        });
    }
    function showForm(elements, customers, { allowNewCustomer = false } = {}) {
        populateCustomerSelect(elements.customerSelect, customers);
        resetFormState(elements);
        if (elements.newCustomerButton)
            elements.newCustomerButton.hidden = !allowNewCustomer;
        elements.errorEl.textContent = '';
        elements.stepChoose.style.display = 'none';
        elements.stepPreview.style.display = 'none';
        hide(elements.stepMetadata);
        elements.stepForm.style.display = 'block';
    }
    function showNewCustomerInput(elements) {
        elements.newCustomerWrapper.style.display = 'block';
        elements.newCustomerInput.focus();
    }
    function showCustomerSelect(elements) {
        elements.newCustomerWrapper.style.display = 'none';
        elements.newCustomerInput.value = '';
        if (elements.newCustomerShortNameInput)
            elements.newCustomerShortNameInput.value = '';
        if (elements.newCustomerNotesInput)
            elements.newCustomerNotesInput.value = '';
    }
    function singleLineError(value, label, minimum, maximum = 100) {
        const text = String(value || '').trim();
        if (text.includes('\n') || text.includes('\r'))
            return `${label} mag geen nieuwe regel bevatten.`;
        if (text.length < minimum)
            return `${label} moet minimaal ${minimum} teken${minimum === 1 ? '' : 's'} bevatten.`;
        if (text.length > maximum)
            return `${label} mag maximaal ${maximum} tekens bevatten.`;
        return '';
    }
    function validateUploadMetadata({ tenantId, locationId, floorName, levelOrder, floorNotes = '', customers = [] }) {
        const numericTenantId = Number(tenantId || 0);
        const customer = customers.find((item) => Number(item?.tenantId || item?.id) === numericTenantId);
        if (!numericTenantId || !customer)
            return { ok: false, error: 'Kies een klant.' };
        const numericLocationId = Number(locationId || 0);
        if (!numericLocationId)
            return { ok: false, error: 'Kies een pand / locatie.' };
        const cleanFloorName = String(floorName || '').trim();
        const nameError = singleLineError(cleanFloorName, 'Verdieping / naam', 1, 100);
        if (nameError)
            return { ok: false, error: nameError };
        const levelText = String(levelOrder ?? '').trim();
        const numericLevel = Number(levelText);
        if (!levelText || !Number.isInteger(numericLevel) || numericLevel < -50 || numericLevel > 100) {
            return { ok: false, error: 'Niveau moet een geheel getal van -50 t/m 100 zijn.' };
        }
        const cleanNotes = String(floorNotes || '').trim();
        if (cleanNotes.length > 5000)
            return { ok: false, error: 'Plattegrond-notitie mag maximaal 5000 tekens bevatten.' };
        const duplicate = (customer.floorplans || []).find((floorplan) => (Number(floorplan.locationId || floorplan.location_id) === numericLocationId &&
            normalizeFloorplanName(floorplan.floorLabel || floorplan.floor_name) === normalizeFloorplanName(cleanFloorName) &&
            Number(floorplan.levelOrder ?? floorplan.level_order) === numericLevel));
        if (duplicate) {
            return { ok: false, error: `Deze verdieping met niveau ${numericLevel} bestaat al op deze locatie.` };
        }
        return {
            ok: true,
            tenantId: numericTenantId,
            customerName: customer.customer,
            locationId: numericLocationId,
            floorName: cleanFloorName,
            floorLabel: cleanFloorName,
            floorplanName: cleanFloorName,
            levelOrder: numericLevel,
            floorNotes: cleanNotes,
        };
    }
    function optionalSingleLineError(value, label, maximum) {
        const text = String(value || '').trim();
        return text ? singleLineError(text, label, 1, maximum) : '';
    }
    function validateNewTenantMetadata({ tenantName, shortName = '', notes = '' }) {
        const error = singleLineError(tenantName, 'Klantnaam', 2, 100) ||
            optionalSingleLineError(shortName, 'Korte naam', 20);
        if (error)
            return { ok: false, error };
        if (String(notes || '').trim().length > 5000)
            return { ok: false, error: 'Notitie mag maximaal 5000 tekens bevatten.' };
        return { ok: true, tenant_name: String(tenantName).trim(), short_name: String(shortName).trim() || null, notes: String(notes).trim() || null };
    }
    function validateNewLocationMetadata({ tenantId, name, street = '', postalCode = '', city = '', notes = '' }) {
        const error = !Number(tenantId) ? 'Kies eerst een klant.' :
            singleLineError(name, 'Pand / locatie naam', 2, 100) ||
                optionalSingleLineError(street, 'Straat + huisnummer', 100) ||
                optionalSingleLineError(postalCode, 'Postcode', 10) ||
                optionalSingleLineError(city, 'Plaats', 100);
        if (error)
            return { ok: false, error };
        if (String(notes || '').trim().length > 5000)
            return { ok: false, error: 'Locatie-notitie mag maximaal 5000 tekens bevatten.' };
        return { ok: true, tenant_id: Number(tenantId), name: String(name).trim(), street: String(street).trim() || null, postal_code: String(postalCode).trim().toUpperCase() || null, city: String(city).trim() || null, notes: String(notes).trim() || null };
    }
    function setUploadFormLayout(controls, active) {
        controls.popup.classList.toggle('upload-form-active', active);
        if (active)
            controls.popup.scrollTop = 0;
    }
    function setPdfImportLayout(controls, active) {
        controls.popup.classList.toggle('upload-pdf-active', active);
        if (active)
            controls.popup.scrollTop = 0;
    }
    function prepareCustomerSelectInteraction(elements, controls) {
        const activeEl = global.document.activeElement;
        if (activeEl && activeEl !== elements.customerSelect && controls.popup.contains(activeEl)) {
            if (/^(INPUT|TEXTAREA)$/i.test(activeEl.tagName))
                activeEl.blur();
        }
        controls.popup.scrollTop = 0;
        elements.customerSelect.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    function resizeImageToCanvas(img, maxSize, documentRef = document) {
        const canvas = documentRef.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round(height * maxSize / width);
                width = maxSize;
            }
            else {
                width = Math.round(width * maxSize / height);
                height = maxSize;
            }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        return { canvas, width, height };
    }
    function canvasToUploadJPEG(canvas, { maxLength = MAX_UPLOAD_DATA_URL_LENGTH, startQuality = 0.8, minQuality = 0.2, qualityStep = 0.1, errorMessage = 'Bestand is te groot.', } = {}) {
        let quality = startQuality;
        let dataUrl;
        do {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            quality -= qualityStep;
        } while (dataUrl.length > maxLength && quality > minQuality);
        if (dataUrl.length > maxLength)
            throw new Error(errorMessage);
        return dataUrl;
    }
    function normalizeFloorplanName(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    }
    function sanitizeFilename(name, now = Date.now()) {
        const slug = name.toLowerCase().replace(/[^a-z0-9\-_ ]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 60);
        return slug ? `${now}-${slug}` : String(now);
    }
    function escapeSvgAttribute(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    function buildUploadSVGText({ imageDataUrl, width, height }) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n  <image href="${escapeSvgAttribute(imageDataUrl)}" width="${width}" height="${height}"/>\n</svg>`;
    }
    async function fileHeader(file, length = 16) {
        const buffer = await file.slice(0, length).arrayBuffer();
        return new Uint8Array(buffer);
    }
    function detectImageMime(bytes) {
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
            return 'image/jpeg';
        if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A)
            return 'image/png';
        if (bytes.length >= 6) {
            const header = String.fromCharCode(...bytes.slice(0, 6));
            if (header === 'GIF87a' || header === 'GIF89a')
                return 'image/gif';
        }
        if (bytes.length >= 12) {
            const riff = String.fromCharCode(...bytes.slice(0, 4));
            const webp = String.fromCharCode(...bytes.slice(8, 12));
            if (riff === 'RIFF' && webp === 'WEBP')
                return 'image/webp';
        }
        if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4D)
            return 'image/bmp';
        return '';
    }
    async function validateImageUploadFile(file) {
        const type = String(file?.type || '').toLowerCase();
        if (type && !type.startsWith('image/'))
            throw new Error('Gebruik een afbeeldingbestand.');
        if (type === 'image/svg+xml')
            throw new Error('Gebruik een geldig afbeeldingbestand.');
        const detectedType = detectImageMime(await fileHeader(file));
        if (!detectedType)
            throw new Error('Gebruik een geldig afbeeldingbestand.');
        const acceptedTypes = type === 'image/pjpeg' ? new Set(['image/jpeg']) : type === 'image/x-ms-bmp' ? new Set(['image/bmp']) : new Set([type]);
        if (type && !acceptedTypes.has(detectedType))
            throw new Error('Gebruik een geldig afbeeldingbestand.');
    }
    async function readValidSvgUploadFile(file) {
        if (Number(file?.size || 0) > MAX_SVG_UPLOAD_BYTES)
            throw new Error('SVG-bestand is te groot (max 5 MB).');
        const type = String(file?.type || '').toLowerCase();
        if (type && type !== 'image/svg+xml')
            throw new Error('Gebruik een SVG-bestand.');
        const svgText = await file.text();
        const head = svgText.replace(/^\uFEFF/, '').trimStart().slice(0, 512).toLowerCase();
        if (!(head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg')))) {
            throw new Error('Gebruik een geldig SVG-bestand.');
        }
        return svgText;
    }
    async function validatePdfUploadFile(file) {
        const type = String(file?.type || '').toLowerCase();
        if (type && type !== 'application/pdf')
            throw new Error('Gebruik een PDF-bestand.');
        const header = String.fromCharCode(...await fileHeader(file, 5));
        if (!header.startsWith('%PDF-'))
            throw new Error('Gebruik een geldig PDF-bestand.');
    }
    function browserYield() {
        return new Promise(resolve => {
            if (typeof requestAnimationFrame === 'function')
                requestAnimationFrame(() => resolve());
            else
                setTimeout(resolve, 0);
        });
    }
    FD.UploadCore = {
        MAX_IMAGE_UPLOAD_BYTES,
        MAX_PDF_DUPLICATES_PER_PAGE,
        MAX_PDF_UPLOAD_BYTES,
        MAX_SVG_UPLOAD_BYTES,
        MAX_UPLOAD_DATA_URL_LENGTH,
        browserYield,
        buildUploadSVGText,
        canvasToUploadJPEG,
        formatUploadError,
        hide,
        populateCustomerSelect,
        prepareCustomerSelectInteraction,
        resetFormState,
        resetPreviewState,
        readValidSvgUploadFile,
        resizeImageToCanvas,
        sanitizeFilename,
        setPdfImportLayout,
        setUploadFormLayout,
        show,
        showChooseStep,
        showCustomerSelect,
        showForm,
        showNewCustomerInput,
        showPreview,
        validateImageUploadFile,
        validateNewLocationMetadata,
        validateNewTenantMetadata,
        validatePdfUploadFile,
        validateUploadMetadata,
    };
})(window);
