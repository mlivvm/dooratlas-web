(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_PHOTOS = 3;
    const OPNAME_GROUPS = [
        {
            title: 'Deur en toegang',
            keys: ['type_object_opname', 'omschrijving_deur', 'toevoeging_omschrijving_deur', 'toegang',
                'draairichting_raam', 'type_cilinder', 'merk_cilinder', 'merk_type_slot', 'mechaniek_slot', 'type_schoot'],
        },
        {
            title: 'Beslag en functie',
            keys: ['type_greep', 'beslagsoort', 'type_beslag', 'skg', 'antipaniek',
                'zelfvergrendelend', 'meerpuntsluiting', 'dranger_aanwezig', 'merk_type_dranger'],
        },
        {
            title: 'Maatvoering',
            keys: ['cilinder_binnen', 'cilinder_buiten', 'e_cilinder_binnen', 'e_cilinder_buiten',
                'pc_doorn_maat_slot', 'pc_maat_beslag', 'breedte_voorplaat', 'lengte_voorplaat'],
        },
        {
            title: 'Opmerkingen',
            keys: ['opmerking', 'opmerking_cilinder', 'opmerking_slot', 'opmerking_beslag',
                'opmerking_project', 'opmerking_raam', 'opmerking_ruit'],
        },
    ];
    function createElement(tag, className = '', text = '') {
        const node = document.createElement(tag);
        if (className)
            node.className = className;
        if (text)
            node.textContent = text;
        return node;
    }
    function hasValue(value) {
        if (Array.isArray(value))
            return value.some(hasValue);
        if (typeof value === 'boolean')
            return true;
        return value !== null && value !== undefined && String(value).trim() !== '';
    }
    function displayValue(value) {
        if (Array.isArray(value))
            return value.filter(hasValue).map(displayValue).join(', ');
        if (typeof value === 'boolean')
            return value ? 'Ja' : 'Nee';
        return String(value ?? '').trim();
    }
    function formatDate(value, includeTime = false) {
        const date = new Date(String(value || ''));
        if (!Number.isFinite(date.getTime()))
            return '';
        return new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        }).format(date);
    }
    function formatMinutes(value) {
        const raw = String(value || '').trim();
        if (!raw)
            return raw;
        const number = raw.replace(/\s*min(?:uut|uten)?\.?\s*$/i, '').trim();
        return number ? `${number} min` : raw;
    }
    function fieldValue(key, value) {
        const raw = displayValue(value);
        if (key === 'controle_tijd_besteed_meerwerk')
            return formatMinutes(raw);
        return /datum$/i.test(key) ? (formatDate(raw) || raw) : raw;
    }
    function humanizeKey(value) {
        const text = String(value || '').replace(/_/g, ' ').trim();
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
    }
    function fieldLabels() {
        const labels = new Map();
        const questionnaires = FD.InspectionFormConfig?.QUESTIONNAIRES || {};
        Object.values(questionnaires).forEach((questionnaire) => {
            (questionnaire?.sections || []).forEach((section) => {
                (section?.fields || []).forEach((field) => {
                    if (field?.name && field?.label)
                        labels.set(String(field.name), String(field.label));
                });
                (section?.photos || []).forEach((photo) => {
                    if (photo?.kind && photo?.label)
                        labels.set(String(photo.kind), String(photo.label));
                });
            });
        });
        return labels;
    }
    function formInspections(inspections, tab) {
        const backendType = tab === 'inspection' ? 'opname' : 'onderhoud';
        return inspections.filter(item => item?.form_type === backendType).sort((left, right) => {
            const dateDifference = Date.parse(right.performed_at || '') - Date.parse(left.performed_at || '');
            return dateDifference || Number(right.id || 0) - Number(left.id || 0);
        });
    }
    function latestInspection(inspections, tab) { return formInspections(inspections, tab)[0] || null; }
    function renderMessage(body, message, className = 'door-inspector-empty') {
        closeDetailDialog();
        FD.DoorInspectorMaintenanceSummary?.cleanup?.();
        FD.DoorInspectorOpnameSummary?.cleanup?.();
        body.classList.remove('door-inspector-body--maintenance-summary', 'door-inspector-body--opname-summary');
        body.innerHTML = '';
        body.appendChild(createElement('div', className, message));
    }
    function closeDetailDialog() { FD.DoorInspectorDetailDialog?.close?.(); }
    function renderMeta(inspection, historical) {
        const wrap = createElement('div', 'door-inspector-inspection-meta');
        const date = formatDate(inspection.performed_at, true);
        if (date)
            wrap.appendChild(createElement('span', '', date));
        const submitter = String(inspection.submitted_by_name || '').trim();
        if (submitter)
            wrap.appendChild(createElement('span', '', submitter));
        if (historical)
            wrap.appendChild(createElement('strong', 'door-inspector-version-badge', 'Historische versie'));
        return wrap;
    }
    function renderFieldGroup(fields, group, labels) {
        const rows = group.keys.filter(key => hasValue(fields[key])).map(key => ({
            label: labels.get(key) || humanizeKey(key),
            value: fieldValue(key, fields[key]),
        }));
        if (!rows.length)
            return null;
        const section = createElement('section', 'door-inspector-section');
        section.appendChild(createElement('h3', 'door-inspector-section-title', group.title));
        const list = createElement('dl', 'door-inspector-fields');
        rows.forEach(row => {
            const item = createElement('div', 'door-inspector-field');
            item.appendChild(createElement('dt', '', row.label));
            const value = createElement('dd', '', row.value);
            value.title = row.value;
            item.appendChild(value);
            list.appendChild(item);
        });
        section.appendChild(list);
        return section;
    }
    function renderPhotos(photos, labels, photoUrl) {
        const visible = (photos || []).filter(photo => Number(photo?.id || 0) > 0).slice(0, MAX_PHOTOS);
        if (!visible.length)
            return null;
        const section = createElement('section', 'door-inspector-section door-inspector-photos');
        section.appendChild(createElement('h3', 'door-inspector-section-title', 'Foto’s'));
        const grid = createElement('div', 'door-inspector-photo-grid');
        visible.forEach(photo => {
            const image = document.createElement('img');
            image.loading = 'lazy';
            image.src = photoUrl(Number(photo.id));
            image.alt = labels.get(String(photo.kind || '')) || humanizeKey(String(photo.kind || 'Foto'));
            image.title = image.alt;
            image.addEventListener('error', () => image.remove());
            grid.appendChild(image);
        });
        section.appendChild(grid);
        return section;
    }
    function renderInspection(body, inspection, tab, photoUrl, historical = false) {
        closeDetailDialog();
        FD.DoorInspectorMaintenanceSummary?.cleanup?.();
        FD.DoorInspectorOpnameSummary?.cleanup?.();
        body.innerHTML = '';
        body.classList.toggle('door-inspector-body--maintenance-summary', tab === 'maintenance');
        body.classList.toggle('door-inspector-body--opname-summary', tab === 'inspection');
        const labels = fieldLabels();
        if (tab === 'maintenance') {
            FD.DoorInspectorMaintenanceSummary?.render?.({
                body,
                inspection,
                labels,
                photoUrl,
                helpers: { createElement, fieldValue, humanizeKey },
            });
            return;
        }
        if (tab === 'inspection' && FD.DoorInspectorOpnameSummary?.render) {
            FD.DoorInspectorOpnameSummary.render({
                body, inspection, labels, photoUrl, historical,
                helpers: { createElement, fieldValue, formatDate, humanizeKey },
            });
            return;
        }
        body.appendChild(renderMeta(inspection, historical));
        OPNAME_GROUPS.forEach(group => {
            const section = renderFieldGroup(inspection.fields || {}, group, labels);
            if (section)
                body.appendChild(section);
        });
        if (hasValue(inspection.notes)) {
            const notes = renderFieldGroup({ notes: inspection.notes }, { title: 'Notitie', keys: ['notes'] }, new Map([['notes', 'Algemene notitie']]));
            if (notes)
                body.appendChild(notes);
        }
        const photos = renderPhotos(inspection.photos || [], labels, photoUrl);
        if (photos)
            body.appendChild(photos);
    }
    FD.DoorInspectorView = {
        displayValue,
        formInspections,
        formatDate,
        latestInspection,
        renderInspection,
        renderMessage,
    };
})(window);
