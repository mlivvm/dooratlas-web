(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Pdf = FD.UploadPdfState;
    const Ui = FD.UploadPdfUi;
    function renderPdfNameRows(elements) {
        const state = elements.pdfState;
        const container = elements.pdfNamesList;
        if (!container)
            return;
        container.innerHTML = '';
        Pdf.selectedPdfPages(state).forEach((page) => {
            const pageLabel = Pdf.pdfPageLabel(page);
            const row = document.createElement('div');
            row.className = 'upload-pdf-name-row';
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'upload-pdf-name-thumb';
            thumb.title = `${pageLabel} vergroot bekijken`;
            thumb.addEventListener('click', () => Ui.showPdfPagePreview(elements, page));
            Ui.blockElementDragging(thumb);
            const number = document.createElement('span');
            number.textContent = Pdf.pdfPageShortLabel(page);
            thumb.appendChild(number);
            if (page.thumbnailDataUrl) {
                const img = document.createElement('img');
                img.src = page.thumbnailDataUrl;
                img.alt = `PDF ${pageLabel}`;
                Ui.blockElementDragging(img);
                thumb.appendChild(img);
            }
            row.appendChild(thumb);
            row.appendChild(nameFields(page, pageLabel));
            container.appendChild(row);
        });
    }
    function nameFields(page, pageLabel) {
        const fieldWrap = document.createElement('div');
        fieldWrap.className = 'upload-pdf-name-fields';
        const source = document.createElement('div');
        source.className = 'upload-pdf-name-source';
        source.textContent = pageLabel;
        source.title = pageLabel;
        fieldWrap.appendChild(source);
        let updateWarning = () => { };
        let levelInput = null;
        const nameField = inputField('Verdieping / naam', 'Bijv. Begane grond', page.floorLabel || '', value => {
            page.floorLabel = value;
            page.floorplanName = value;
            if (!page.levelOrderTouched) {
                page.levelOrder = FD.DataService.expectedLevelOrder(value) ?? '';
                if (levelInput)
                    levelInput.value = String(page.levelOrder);
            }
            updateWarning();
        }, { maxLength: 100 });
        const levelField = inputField('Niveau', 'Bijv. 0', String(page.levelOrder ?? ''), value => {
            page.levelOrder = value;
            page.levelOrderTouched = true;
            updateWarning();
        }, { type: 'number', min: '-50', max: '100' });
        levelInput = levelField.querySelector('input');
        fieldWrap.appendChild(nameField);
        fieldWrap.appendChild(levelField);
        fieldWrap.appendChild(inputField('Plattegrond-notitie', 'Optioneel', page.floorNotes || '', value => { page.floorNotes = value; }, { maxLength: 5000 }));
        const warning = document.createElement('div');
        warning.className = 'upload-level-warning';
        warning.setAttribute('role', 'status');
        updateWarning = () => {
            warning.textContent = FD.DataService.levelOrderWarning(page.floorLabel, page.levelOrder);
            warning.hidden = !warning.textContent;
        };
        updateWarning();
        fieldWrap.appendChild(warning);
        const status = document.createElement('div');
        status.className = 'upload-pdf-page-status';
        status.classList.toggle('is-error', page.status === 'error');
        status.textContent = Ui.pageStatusLabel(page);
        fieldWrap.appendChild(status);
        return fieldWrap;
    }
    function inputField(labelText, placeholder, value, onInput, options = {}) {
        const field = document.createElement('label');
        field.className = 'upload-pdf-name-field';
        const label = document.createElement('span');
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = options.type || 'text';
        if (options.min)
            input.min = options.min;
        if (options.max)
            input.max = options.max;
        if (options.maxLength)
            input.maxLength = Number(options.maxLength);
        input.className = 'upload-input';
        input.value = value;
        input.placeholder = placeholder;
        input.addEventListener('input', () => onInput(input.value));
        field.appendChild(label);
        field.appendChild(input);
        return field;
    }
    function validatePdfBatchForm({ uploadContext, pages, customers }) {
        if (!pages.length)
            return { ok: false, error: 'Selecteer minimaal 1 pagina.' };
        const tenantId = Number(uploadContext?.tenantId || 0);
        const locationId = Number(uploadContext?.locationId || 0);
        const customer = customers.find((item) => Number(item?.tenantId || item?.id) === tenantId);
        if (!tenantId || !customer)
            return { ok: false, error: 'Kies een klant.' };
        if (!locationId)
            return { ok: false, error: 'Kies een pand / locatie.' };
        const seen = new Set();
        for (const page of pages) {
            const cleanFloorLabel = String(page.floorLabel || page.floorplanName || '').trim();
            if (!cleanFloorLabel)
                return { ok: false, error: `Vul een verdieping / naam in voor ${Pdf.pdfPageLabel(page).toLowerCase()}.` };
            const levelText = String(page.levelOrder ?? '').trim();
            const levelOrder = Number(levelText);
            if (!levelText || !Number.isInteger(levelOrder) || levelOrder < -50 || levelOrder > 100) {
                return { ok: false, error: `Vul een geldig niveau in voor ${Pdf.pdfPageLabel(page).toLowerCase()}.` };
            }
            const key = `${cleanFloorLabel.toLocaleLowerCase('nl')}::${levelOrder}`;
            if (seen.has(key))
                return { ok: false, error: `Dubbele verdieping en niveau: "${cleanFloorLabel}" (${levelOrder}).` };
            seen.add(key);
            const existing = (customer.floorplans || []).find((floorplan) => (Number(floorplan.locationId || floorplan.location_id) === locationId &&
                String(floorplan.floorLabel || floorplan.floor_name || '').trim().toLocaleLowerCase('nl') === cleanFloorLabel.toLocaleLowerCase('nl') &&
                Number(floorplan.levelOrder ?? floorplan.level_order) === levelOrder));
            if (existing)
                return { ok: false, error: `Deze verdieping met niveau ${levelOrder} bestaat al op deze locatie.` };
            page.floorLabel = cleanFloorLabel;
            page.floorplanName = cleanFloorLabel;
            page.levelOrder = levelOrder;
            page.floorNotes = String(page.floorNotes || '').trim();
        }
        return { ok: true, tenantId, locationId, customerName: customer.customer, pages };
    }
    FD.UploadPdfForm = {
        renderPdfNameRows,
        validatePdfBatchForm,
    };
})(window);
