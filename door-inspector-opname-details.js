(function (global) {
    const FD = global.FD = global.FD || {};
    function detailRow(input, key, value) {
        const row = input.helpers.createElement('div', 'door-inspector-detail-field');
        row.append(input.helpers.createElement('dt', '', input.labels.get(key) || input.helpers.humanizeKey(key)), input.helpers.createElement('dd', '', input.helpers.fieldValue(key, value)));
        return row;
    }
    function appendFields(input, section, keys, consumed) {
        const fields = input.inspection.fields || {};
        const present = keys.filter(key => FD.DoorInspectorOpnameModel?.hasValue?.(fields[key]));
        if (!present.length)
            return false;
        const list = input.helpers.createElement('dl', 'door-inspector-detail-fields');
        present.forEach(key => {
            consumed.add(key);
            list.appendChild(detailRow(input, key, fields[key]));
        });
        section.appendChild(list);
        return true;
    }
    function photoButton(input, photo) {
        const label = input.labels.get(String(photo.kind || '')) || input.helpers.humanizeKey(String(photo.kind || 'Foto')) || 'Foto';
        const source = input.photoUrl(Number(photo.id));
        const button = input.helpers.createElement('button', 'door-inspector-photo-button');
        button.type = 'button';
        button.setAttribute('aria-label', `${label} vergroten`);
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = source;
        image.alt = '';
        button.append(image, input.helpers.createElement('span', 'door-inspector-photo-label', label));
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
    function appendStep(input, content, step, consumedFields, consumedPhotos) {
        const section = input.helpers.createElement('section', 'door-inspector-detail-section');
        let populated = false;
        (step.sections || []).forEach((group) => {
            const nested = input.helpers.createElement('div', 'door-inspector-detail-subsection');
            const fieldsAdded = appendFields(input, nested, group.fields || [], consumedFields);
            const photosAdded = appendPhotos(input, nested, group.photos || [], consumedPhotos);
            if (!fieldsAdded && !photosAdded)
                return;
            nested.insertBefore(input.helpers.createElement('h5', 'door-inspector-detail-subsection-title', group.title), nested.firstChild);
            section.appendChild(nested);
            populated = true;
        });
        if (!populated)
            return;
        section.insertBefore(input.helpers.createElement('h4', 'door-inspector-detail-section-title', step.title), section.firstChild);
        content.appendChild(section);
    }
    function appendRemaining(input, content, consumedFields, consumedPhotos) {
        const fields = input.inspection.fields || {};
        const remainingFields = Object.keys(fields).filter(key => !consumedFields.has(key) && FD.DoorInspectorOpnameModel?.hasValue?.(fields[key]));
        if (remainingFields.length) {
            const section = input.helpers.createElement('section', 'door-inspector-detail-section');
            section.appendChild(input.helpers.createElement('h4', 'door-inspector-detail-section-title', 'Overige ingevulde gegevens'));
            appendFields(input, section, remainingFields, consumedFields);
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
        (FD.DoorInspectorOpnameModel?.inspectionSteps?.() || []).forEach((step) => {
            if (step.id !== 'summary')
                appendStep(input, content, step, consumedFields, consumedPhotos);
        });
        appendRemaining(input, content, consumedFields, consumedPhotos);
        if (!content.children.length)
            content.appendChild(input.helpers.createElement('p', 'door-inspector-detail-copy', 'Er zijn geen opnamedetails ingevuld.'));
        FD.DoorInspectorDetailDialog?.open?.({ title: 'Alle opnamedetails', content, trigger: input.trigger });
    }
    FD.DoorInspectorOpnameDetails = { open };
})(window);
