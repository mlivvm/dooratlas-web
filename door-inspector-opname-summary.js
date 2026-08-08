(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_COMPACT_NOTE_LENGTH = 72;
    function cleanup() { }
    function openTextDetail(input, title, value, trigger) {
        FD.DoorInspectorDetailDialog?.open?.({
            title,
            content: input.helpers.createElement('p', 'door-inspector-detail-copy', value),
            trigger,
        });
    }
    function renderMeta(input) {
        const date = input.helpers.formatDate(input.inspection.performed_at, true);
        const submitter = String(input.inspection.submitted_by_name || '').trim();
        if (!date && !submitter && !input.historical)
            return null;
        const meta = input.helpers.createElement('div', 'door-inspector-inspection-meta');
        if (date)
            meta.appendChild(input.helpers.createElement('span', '', date));
        if (submitter)
            meta.appendChild(input.helpers.createElement('span', '', submitter));
        if (input.historical)
            meta.appendChild(input.helpers.createElement('strong', 'door-inspector-version-badge', 'Historische versie'));
        return meta;
    }
    function fieldRow(input, value) {
        const row = input.helpers.createElement('div', 'door-inspector-field');
        row.appendChild(input.helpers.createElement('dt', '', value.label));
        const displayed = input.helpers.fieldValue(value.key, value.value) || 'Niet ingevuld';
        if (displayed.length > MAX_COMPACT_NOTE_LENGTH) {
            const button = input.helpers.createElement('button', 'door-inspector-note-detail', 'Bekijk');
            button.type = 'button';
            button.setAttribute('aria-label', `${value.label} volledig bekijken`);
            button.addEventListener('click', () => openTextDetail(input, value.label, displayed, button));
            row.appendChild(button);
            return row;
        }
        const answer = input.helpers.createElement('dd', '', displayed);
        answer.title = displayed;
        row.appendChild(answer);
        return row;
    }
    function factSection(input) {
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-opname-facts');
        const values = FD.DoorInspectorOpnameModel?.compactValues?.(input.inspection) || [];
        if (!values.length) {
            section.appendChild(input.helpers.createElement('p', 'door-inspector-opname-empty', 'Nog geen kerngegevens ingevuld.'));
            return section;
        }
        const list = input.helpers.createElement('dl', 'door-inspector-fields door-inspector-fields--summary');
        values.forEach((value) => list.appendChild(fieldRow(input, value)));
        section.appendChild(list);
        return section;
    }
    function photoButton(input, photo) {
        const label = input.labels.get(String(photo.kind || '')) || input.helpers.humanizeKey(String(photo.kind || 'Foto')) || 'Foto';
        const source = input.photoUrl(Number(photo.id));
        const button = input.helpers.createElement('button', 'door-inspector-photo-button');
        button.type = 'button';
        button.setAttribute('aria-label', `${label} vergroten`);
        button.title = `${label} vergroten`;
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = source;
        image.alt = '';
        image.addEventListener('error', () => button.classList.add('is-unavailable'));
        button.append(image, input.helpers.createElement('span', 'door-inspector-photo-label', label));
        button.addEventListener('click', () => FD.InspectionPhotoViewer?.open?.({ source, label, trigger: button }));
        return button;
    }
    function photoSection(input) {
        const photos = (input.inspection.photos || []).filter((photo) => Number(photo?.id || 0) > 0);
        if (!photos.length)
            return null;
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-photos door-inspector-photos--opname door-inspector-opname-summary-photos');
        section.appendChild(input.helpers.createElement('h3', 'door-inspector-section-title', `Foto’s (${photos.length})`));
        const grid = input.helpers.createElement('div', 'door-inspector-photo-grid door-inspector-photo-grid--buttons');
        grid.dataset.photoCount = String(photos.length);
        grid.dataset.photoLayout = photos.length <= 4 ? 'spacious' : 'compact';
        photos.forEach((photo) => grid.appendChild(photoButton(input, photo)));
        section.appendChild(grid);
        return section;
    }
    function detailsButton(input) {
        const button = input.helpers.createElement('button', 'door-inspector-all-details', 'Alle details');
        button.type = 'button';
        button.setAttribute('aria-label', 'Alle opnamedetails bekijken');
        button.addEventListener('click', () => FD.DoorInspectorOpnameDetails?.open?.({ ...input, trigger: button }));
        return button;
    }
    function render(input) {
        const content = input.helpers.createElement('div', 'door-inspector-opname-summary-content');
        const meta = renderMeta(input);
        if (meta)
            content.appendChild(meta);
        content.append(factSection(input));
        const photos = photoSection(input);
        if (photos)
            content.appendChild(photos);
        content.appendChild(detailsButton(input));
        input.body.appendChild(content);
    }
    FD.DoorInspectorOpnameSummary = { cleanup, render };
})(window);
