(function (global) {
    const FD = global.FD = global.FD || {};
    const LABEL_OVERRIDES = {
        status_deur_voldoende_controle_onderhoud: 'Onderhoud mogelijk?',
    };
    function detailRow(input, key, value) {
        const { createElement, fieldValue } = input.helpers;
        const row = createElement('div', 'door-inspector-detail-field');
        const attention = FD.DoorInspectorMaintenanceModel?.isAttentionField?.(key, value);
        if (attention)
            row.classList.add('door-inspector-detail-field--attention');
        const label = LABEL_OVERRIDES[key] || input.labels.get(key) ||
            (key === 'nul_beurt' ? 'Nulbeurt' : input.helpers.humanizeKey(key));
        const answer = fieldValue(key, value);
        const valueNode = createElement('dd', '', answer);
        if (attention)
            valueNode.classList.add('door-inspector-value--attention');
        row.append(createElement('dt', '', label), valueNode);
        return row;
    }
    function appendFields(input, section, keys, consumed) {
        const fields = input.inspection.fields || {};
        const present = keys.filter(key => key === 'nul_beurt' || FD.DoorInspectorMaintenanceModel?.hasValue?.(fields[key]));
        if (!present.length)
            return false;
        const list = input.helpers.createElement('dl', 'door-inspector-detail-fields');
        present.forEach(key => {
            consumed.add(key);
            list.appendChild(detailRow(input, key, key === 'nul_beurt' && !fields[key] ? 'Nee' : fields[key]));
        });
        section.appendChild(list);
        return true;
    }
    function photoButton(input, photo) {
        const { createElement, humanizeKey } = input.helpers;
        const label = input.labels.get(String(photo.kind || '')) || humanizeKey(String(photo.kind || 'Foto')) || 'Foto';
        const source = input.photoUrl(Number(photo.id));
        const button = createElement('button', 'door-inspector-photo-button');
        button.type = 'button';
        button.setAttribute('aria-label', `${label} vergroten`);
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = source;
        image.alt = '';
        button.append(image, createElement('span', 'door-inspector-photo-label', label));
        button.addEventListener('click', () => FD.InspectionPhotoViewer?.open?.({ source, label, trigger: button }));
        return button;
    }
    function appendPhotos(input, section, kinds, consumed) {
        const photos = (input.inspection.photos || []).filter((photo) => (Number(photo?.id || 0) > 0 && kinds.includes(String(photo.kind || ''))));
        if (!photos.length)
            return false;
        const grid = input.helpers.createElement('div', 'door-inspector-photo-grid door-inspector-photo-grid--buttons door-inspector-detail-photo-grid');
        photos.forEach((photo) => {
            consumed.add(Number(photo.id));
            grid.appendChild(photoButton(input, photo));
        });
        section.appendChild(grid);
        return true;
    }
    function appendMatrix(input, section, step, consumed) {
        if (!step.matrixKey)
            return false;
        const allowedRows = new Set((step.rows || []).map((row) => String(row)));
        const selected = (FD.DoorInspectorMaintenanceModel?.selectedAnswers?.(input.inspection.matrix_answers || []) || [])
            .filter((answer) => (String(answer.matrix_key || '') === String(step.matrixKey)
            && (!allowedRows.size || allowedRows.has(String(answer.row_label || '')))));
        if (!selected.length)
            return false;
        const order = new Map((step.rows || []).map((row, index) => [row, index]));
        const grouped = new Map();
        selected.forEach((answer) => {
            const key = String(answer.row_key || answer.row_label || '');
            grouped.set(key, [...(grouped.get(key) || []), answer]);
            consumed.add(answer);
        });
        const rows = Array.from(grouped.values()).sort((left, right) => {
            const leftIndex = order.get(String(left[0].row_label || '')) ?? Number.MAX_SAFE_INTEGER;
            const rightIndex = order.get(String(right[0].row_label || '')) ?? Number.MAX_SAFE_INTEGER;
            return leftIndex - rightIndex;
        });
        const list = input.helpers.createElement('dl', 'door-inspector-detail-fields door-inspector-detail-fields--matrix');
        rows.forEach(group => {
            const first = group[0];
            const row = input.helpers.createElement('div', 'door-inspector-detail-field');
            if (group.some(answer => FD.DoorInspectorMaintenanceModel?.isAttentionMatrix?.(answer))) {
                row.classList.add('door-inspector-detail-field--attention');
            }
            const answer = group.map(item => String(item.column_label || '')).filter(Boolean).join(' · ');
            const value = input.helpers.createElement('dd', '', answer);
            if (row.classList.contains('door-inspector-detail-field--attention'))
                value.classList.add('door-inspector-value--attention');
            row.append(input.helpers.createElement('dt', '', String(first.row_label || 'Controlepunt')), value);
            list.appendChild(row);
        });
        section.appendChild(list);
        return true;
    }
    function appendStep(input, content, step, consumedFields, consumedPhotos, consumedMatrix) {
        const section = input.helpers.createElement('section', 'door-inspector-detail-section');
        const fieldKeys = [...(step.fields || [])];
        if (step.id === 'general')
            fieldKeys.push('nul_beurt', 'onderhoudsdatum');
        let populated = appendFields(input, section, fieldKeys, consumedFields);
        (step.sections || []).forEach((group) => {
            const nested = input.helpers.createElement('div', 'door-inspector-detail-subsection');
            if (!appendFields(input, nested, group.fields || [], consumedFields))
                return;
            nested.insertBefore(input.helpers.createElement('h5', 'door-inspector-detail-subsection-title', group.title), nested.firstChild);
            section.appendChild(nested);
            populated = true;
        });
        populated = appendMatrix(input, section, step, consumedMatrix) || populated;
        populated = appendPhotos(input, section, step.photos || [], consumedPhotos) || populated;
        if (!populated)
            return;
        section.insertBefore(input.helpers.createElement('h4', 'door-inspector-detail-section-title', step.title), section.firstChild);
        content.appendChild(section);
    }
    function appendRemaining(input, content, consumedFields, consumedPhotos, consumedMatrix) {
        const fields = input.inspection.fields || {};
        const remainingFields = Object.keys(fields).filter(key => !consumedFields.has(key) && FD.DoorInspectorMaintenanceModel?.hasValue?.(fields[key]));
        if (remainingFields.length) {
            const section = input.helpers.createElement('section', 'door-inspector-detail-section');
            section.appendChild(input.helpers.createElement('h4', 'door-inspector-detail-section-title', 'Overige ingevulde gegevens'));
            appendFields(input, section, remainingFields, consumedFields);
            content.appendChild(section);
        }
        const remainingMatrix = (FD.DoorInspectorMaintenanceModel?.selectedAnswers?.(input.inspection.matrix_answers || []) || [])
            .filter((answer) => !consumedMatrix.has(answer));
        if (remainingMatrix.length) {
            const section = input.helpers.createElement('section', 'door-inspector-detail-section');
            section.appendChild(input.helpers.createElement('h4', 'door-inspector-detail-section-title', 'Overige controlepunten'));
            const list = input.helpers.createElement('dl', 'door-inspector-detail-fields door-inspector-detail-fields--matrix');
            remainingMatrix.forEach((answer) => {
                const row = input.helpers.createElement('div', 'door-inspector-detail-field');
                if (FD.DoorInspectorMaintenanceModel?.isAttentionMatrix?.(answer))
                    row.classList.add('door-inspector-detail-field--attention');
                const value = input.helpers.createElement('dd', '', String(answer.column_label || ''));
                if (row.classList.contains('door-inspector-detail-field--attention'))
                    value.classList.add('door-inspector-value--attention');
                row.append(input.helpers.createElement('dt', '', String(answer.row_label || 'Controlepunt')), value);
                list.appendChild(row);
            });
            section.appendChild(list);
            content.appendChild(section);
        }
        const remainingPhotos = (input.inspection.photos || []).filter((photo) => (Number(photo?.id || 0) > 0 && !consumedPhotos.has(Number(photo.id))));
        if (remainingPhotos.length) {
            const section = input.helpers.createElement('section', 'door-inspector-detail-section');
            section.appendChild(input.helpers.createElement('h4', 'door-inspector-detail-section-title', 'Overige foto’s'));
            const grid = input.helpers.createElement('div', 'door-inspector-photo-grid door-inspector-photo-grid--buttons door-inspector-detail-photo-grid');
            remainingPhotos.forEach((photo) => grid.appendChild(photoButton(input, photo)));
            section.appendChild(grid);
            content.appendChild(section);
        }
        const note = String(input.inspection.notes || '').trim();
        if (note && !Object.values(fields).some(value => String(value || '').trim() === note)) {
            const section = input.helpers.createElement('section', 'door-inspector-detail-section');
            section.appendChild(input.helpers.createElement('h4', 'door-inspector-detail-section-title', 'Algemene notitie'));
            section.appendChild(input.helpers.createElement('p', 'door-inspector-detail-copy', note));
            content.appendChild(section);
        }
    }
    function open(input) {
        const content = input.helpers.createElement('div', 'door-inspector-detail-content');
        const consumedFields = new Set();
        const consumedPhotos = new Set();
        const consumedMatrix = new Set();
        (FD.DoorInspectorMaintenanceModel?.inspectionSteps?.(input.inspection) || []).forEach((step) => {
            if (step.id !== 'summary')
                appendStep(input, content, step, consumedFields, consumedPhotos, consumedMatrix);
        });
        appendRemaining(input, content, consumedFields, consumedPhotos, consumedMatrix);
        if (!content.children.length)
            content.appendChild(input.helpers.createElement('p', 'door-inspector-detail-copy', 'Er zijn geen onderhoudsdetails ingevuld.'));
        FD.DoorInspectorDetailDialog?.open?.({ title: 'Alle onderhoudsdetails', content, trigger: input.trigger });
    }
    FD.DoorInspectorMaintenanceDetails = { open };
})(window);
