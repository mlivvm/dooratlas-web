(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_COMPACT_NOTE_LENGTH = 72;
    let cleanupFit = null;
    function cleanup() {
        cleanupFit?.();
        cleanupFit = null;
    }
    function detailDialog(title, value, trigger, createElement) {
        FD.DoorInspectorDetailDialog?.open?.({
            title,
            content: createElement('p', 'door-inspector-detail-copy', value),
            trigger,
        });
    }
    function displayValue(input, key, value) {
        if (value === 'Niet ingevuld')
            return 'Niet ingevuld';
        return input.helpers.fieldValue(key, value) || 'Niet ingevuld';
    }
    function fieldRow(input, value, allowDetail = false) {
        const { createElement } = input.helpers;
        const row = createElement('div', 'door-inspector-field');
        if (value.attention)
            row.classList.add('door-inspector-field--attention');
        row.appendChild(createElement('dt', '', value.label));
        const displayed = displayValue(input, value.key, value.value);
        if (allowDetail && displayed.length > MAX_COMPACT_NOTE_LENGTH) {
            const button = createElement('button', 'door-inspector-note-detail', 'Bekijk');
            button.type = 'button';
            button.setAttribute('aria-label', `${value.label} volledig bekijken`);
            button.addEventListener('click', () => detailDialog(value.label, displayed, button, createElement));
            row.appendChild(button);
            return row;
        }
        const answer = createElement('dd', '', displayed);
        if (value.attention)
            answer.classList.add('door-inspector-value--attention');
        answer.title = displayed;
        row.appendChild(answer);
        return row;
    }
    function factSection(input) {
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-maintenance-facts');
        const list = input.helpers.createElement('dl', 'door-inspector-fields door-inspector-fields--summary');
        (FD.DoorInspectorMaintenanceModel?.compactValues?.(input.inspection) || []).forEach((value) => {
            list.appendChild(fieldRow(input, value));
        });
        section.appendChild(list);
        return section;
    }
    function moreworkSection(input) {
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-maintenance-morework');
        section.appendChild(input.helpers.createElement('h3', 'door-inspector-section-title', 'Meerwerk'));
        const list = input.helpers.createElement('dl', 'door-inspector-fields door-inspector-fields--summary');
        (FD.DoorInspectorMaintenanceModel?.moreworkValues?.(input.inspection) || []).forEach((value) => {
            list.appendChild(fieldRow(input, value, true));
        });
        section.appendChild(list);
        return section;
    }
    function attentionRows(answers) {
        const byRow = new Map();
        (FD.DoorInspectorMaintenanceModel?.selectedAnswers?.(answers) || []).forEach((answer) => {
            if (!FD.DoorInspectorMaintenanceModel?.isAttentionMatrix?.(answer))
                return;
            const key = `${answer.matrix_key || ''}|${answer.row_key || answer.row_label || ''}`;
            if (!byRow.has(key))
                byRow.set(key, answer);
        });
        return Array.from(byRow.values());
    }
    function fitChecklist(section) {
        const list = section.querySelector?.('.door-inspector-deviations');
        if (!list || typeof list.querySelectorAll !== 'function')
            return;
        const items = Array.from(list.querySelectorAll('[data-compact-attention]'));
        const more = list.querySelector('[data-compact-attention-more]');
        if (!items.length)
            return;
        const arrange = () => {
            const available = list.clientHeight;
            if (!available)
                return;
            items.forEach(item => { item.hidden = false; });
            if (more)
                more.hidden = true;
            let used = 0;
            let hidden = 0;
            items.forEach(item => {
                const height = Math.ceil(item.getBoundingClientRect().height) + 3;
                if (used + height > available) {
                    item.hidden = true;
                    hidden += 1;
                }
                else {
                    used += height;
                }
            });
            if (!more || !hidden)
                return;
            more.textContent = `+ ${hidden} extra aandachtspunt${hidden === 1 ? '' : 'en'}`;
            more.hidden = false;
            if (used + Math.ceil(more.getBoundingClientRect().height) > available)
                more.hidden = true;
        };
        const schedule = () => {
            const frame = global.requestAnimationFrame;
            if (typeof frame === 'function')
                frame(arrange);
            else
                arrange();
        };
        const ResizeObserverCtor = global.ResizeObserver;
        const observer = typeof ResizeObserverCtor === 'function' ? new ResizeObserverCtor(schedule) : null;
        observer?.observe(section);
        global.addEventListener?.('resize', schedule);
        cleanupFit = () => {
            observer?.disconnect();
            global.removeEventListener?.('resize', schedule);
        };
        schedule();
    }
    function checklistSection(input) {
        const selected = FD.DoorInspectorMaintenanceModel?.selectedAnswers?.(input.inspection.matrix_answers || []) || [];
        const attention = attentionRows(input.inspection.matrix_answers || []);
        const rows = new Set(selected.map((answer) => `${answer.matrix_key || ''}|${answer.row_key || answer.row_label || ''}`));
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-matrix door-inspector-matrix--compact');
        section.appendChild(input.helpers.createElement('h3', 'door-inspector-section-title', 'Controlelijst'));
        const metrics = input.helpers.createElement('div', 'door-inspector-metrics');
        const checked = input.helpers.createElement('div', 'door-inspector-metric');
        checked.append(input.helpers.createElement('strong', '', String(rows.size)), input.helpers.createElement('span', '', 'gecontroleerd'));
        const issues = input.helpers.createElement('div', `door-inspector-metric${attention.length ? ' attention' : ''}`);
        issues.append(input.helpers.createElement('strong', '', String(attention.length)), input.helpers.createElement('span', '', 'aandachtspunten'));
        metrics.append(checked, issues);
        section.appendChild(metrics);
        if (attention.length) {
            const list = input.helpers.createElement('ul', 'door-inspector-deviations');
            attention.forEach((answer) => {
                const item = input.helpers.createElement('li', '', `${answer.row_label || 'Controlepunt'} — ${answer.column_label || 'Aandachtspunt'}`);
                item.setAttribute('data-compact-attention', '');
                list.appendChild(item);
            });
            const more = input.helpers.createElement('li', 'door-inspector-deviation-more');
            more.hidden = true;
            more.setAttribute('data-compact-attention-more', '');
            list.appendChild(more);
            section.appendChild(list);
        }
        return section;
    }
    function photoButton(input, photo) {
        const { createElement, humanizeKey } = input.helpers;
        const label = input.labels.get(String(photo.kind || '')) || humanizeKey(String(photo.kind || 'Foto')) || 'Foto';
        const source = input.photoUrl(Number(photo.id));
        const button = createElement('button', 'door-inspector-photo-button');
        button.type = 'button';
        button.setAttribute('aria-label', `${label} vergroten`);
        button.title = `${label} vergroten`;
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = source;
        image.alt = '';
        image.addEventListener('error', () => button.classList.add('is-unavailable'));
        button.append(image, createElement('span', 'door-inspector-photo-label', label));
        button.addEventListener('click', () => FD.InspectionPhotoViewer?.open?.({ source, label, trigger: button }));
        return button;
    }
    function photoSection(input) {
        const photos = (input.inspection.photos || []).filter((photo) => Number(photo?.id || 0) > 0);
        if (!photos.length)
            return null;
        const section = input.helpers.createElement('section', 'door-inspector-section door-inspector-photos door-inspector-photos--maintenance door-inspector-maintenance-summary-photos');
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
        button.setAttribute('aria-label', 'Alle onderhoudsdetails bekijken');
        button.addEventListener('click', () => FD.DoorInspectorMaintenanceDetails?.open?.({ ...input, trigger: button }));
        return button;
    }
    function render(input) {
        cleanup();
        const content = input.helpers.createElement('div', 'door-inspector-maintenance-summary-content');
        const checklist = checklistSection(input);
        content.append(factSection(input), moreworkSection(input), checklist);
        const photos = photoSection(input);
        if (photos)
            content.appendChild(photos);
        content.appendChild(detailsButton(input));
        input.body.appendChild(content);
        fitChecklist(checklist);
    }
    FD.DoorInspectorMaintenanceSummary = { cleanup, render };
})(window);
