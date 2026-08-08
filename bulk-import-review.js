(function (global) {
    const FD = global.FD = global.FD || {};
    function option(value, label, selected = false) {
        const element = global.document.createElement('option');
        element.value = value;
        element.textContent = label;
        element.selected = selected;
        return element;
    }
    function targetLabel(target) {
        return `${target.name}${target.kind === 'existing' ? ' · bestaand' : ' · nieuw'}`;
    }
    function fillTargetSelect(select, targets, selectedKey = '', includeEmpty = true) {
        select.innerHTML = '';
        if (includeEmpty)
            select.appendChild(option('', 'Gebouw kiezen', !selectedKey));
        targets.forEach(target => select.appendChild(option(target.key, targetLabel(target), target.key === selectedKey)));
    }
    function field(labelText, input) {
        const label = global.document.createElement('label');
        const text = global.document.createElement('span');
        text.textContent = labelText;
        label.appendChild(text);
        label.appendChild(input);
        return label;
    }
    function makeInput(type, value, fieldName, itemId) {
        const input = global.document.createElement('input');
        input.type = type;
        input.value = value;
        input.className = 'bulk-import-control';
        input.dataset.itemId = itemId;
        input.dataset.field = fieldName;
        if (fieldName === 'mapName')
            input.maxLength = 100;
        if (fieldName === 'levelOrder') {
            input.min = '-50';
            input.max = '100';
            input.step = '1';
        }
        return input;
    }
    function statusText(item, duplicate) {
        if (!item.include)
            return 'Overgeslagen';
        const edited = item.edited ? ' · uitsnede aangepast' : '';
        if (!item.targetKey)
            return `Actie nodig · gebouw kiezen${edited}`;
        if (duplicate)
            return `Actie nodig · dubbele kaartnaam en verdieping${edited}`;
        if (item.warning)
            return `Controle nodig · ${item.warning}${edited}`;
        return item.edited ? 'Voorstel gereed · uitsnede aangepast' : 'Voorstel gereed';
    }
    function createItemRow(item, targets, duplicate) {
        const row = global.document.createElement('article');
        row.className = `bulk-import-item is-${item.include ? (duplicate || item.warning || !item.targetKey ? 'warning' : 'ready') : 'excluded'}`;
        row.dataset.itemId = item.id;
        const selection = global.document.createElement('div');
        selection.className = 'bulk-import-item-select';
        const include = makeInput('checkbox', '', 'include', item.id);
        include.checked = Boolean(item.include);
        include.setAttribute('aria-label', `${item.file.name} importeren`);
        include.title = 'Deze plattegrond opnemen';
        selection.append(include);
        const preview = global.document.createElement('button');
        preview.type = 'button';
        preview.className = 'bulk-import-thumb';
        preview.dataset.action = 'preview';
        preview.dataset.itemId = item.id;
        preview.setAttribute('aria-label', `Voorbeeld van ${item.file.name}`);
        preview.innerHTML = '<span aria-hidden="true">PDF</span><small>Voorbeeld</small>';
        const source = global.document.createElement('div');
        source.className = 'bulk-import-item-source';
        const name = global.document.createElement('strong');
        name.textContent = item.file.name;
        name.title = item.relativePath;
        const path = global.document.createElement('span');
        path.textContent = item.relativePath;
        source.append(name, path);
        const controls = global.document.createElement('div');
        controls.className = 'bulk-import-item-fields';
        const nameInput = makeInput('text', item.mapName, 'mapName', item.id);
        const levelInput = makeInput('number', String(item.levelOrder), 'levelOrder', item.id);
        const targetSelect = global.document.createElement('select');
        targetSelect.className = 'bulk-import-control';
        targetSelect.dataset.itemId = item.id;
        targetSelect.dataset.field = 'targetKey';
        fillTargetSelect(targetSelect, targets, item.targetKey);
        controls.append(field('Kaartnaam / verdiepingslabel', nameInput), field('Sorteervolgorde', levelInput), field('Gebouw / locatie', targetSelect));
        const status = global.document.createElement('div');
        status.className = 'bulk-import-item-status';
        status.textContent = statusText(item, duplicate);
        row.append(selection, preview, source, controls, status);
        return row;
    }
    function groupName(key, targets) {
        return targets.find(target => target.key === key)?.name || 'Gebouw kiezen';
    }
    function renderItems(container, concept) {
        container.innerHTML = '';
        const duplicateKeys = FD.BulkImportParser.duplicateKeys(concept.items);
        const groups = new Map();
        concept.items.forEach((item) => {
            const key = item.targetKey || '';
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(item);
        });
        Array.from(groups).sort(([a], [b]) => groupName(a, concept.targets).localeCompare(groupName(b, concept.targets), 'nl')).forEach(([key, items]) => {
            const section = global.document.createElement('section');
            section.className = 'bulk-import-group';
            section.dataset.targetKey = key;
            const header = global.document.createElement('header');
            const title = global.document.createElement('strong');
            title.textContent = groupName(key, concept.targets);
            const count = global.document.createElement('span');
            count.textContent = `${items.filter(item => item.include).length} van ${items.length} opnemen`;
            header.append(title, count);
            section.appendChild(header);
            items.forEach(item => {
                const duplicateKey = `${item.targetKey}|${String(item.mapName).trim().toLocaleLowerCase()}|${Number(item.levelOrder)}`;
                section.appendChild(createItemRow(item, concept.targets, duplicateKeys.has(duplicateKey)));
            });
            container.appendChild(section);
        });
    }
    function refreshItems(container, concept) {
        const duplicateKeys = FD.BulkImportParser.duplicateKeys(concept.items);
        container.querySelectorAll('.bulk-import-item').forEach(row => {
            const item = concept.items.find((entry) => entry.id === row.dataset.itemId);
            if (!item)
                return;
            const key = `${item.targetKey}|${String(item.mapName).trim().toLocaleLowerCase()}|${Number(item.levelOrder)}`;
            const duplicate = duplicateKeys.has(key);
            row.className = `bulk-import-item is-${item.include ? (duplicate || item.warning || !item.targetKey ? 'warning' : 'ready') : 'excluded'}`;
            const status = row.querySelector('.bulk-import-item-status');
            if (status)
                status.textContent = statusText(item, duplicate);
        });
        container.querySelectorAll('.bulk-import-group').forEach(section => {
            const items = concept.items.filter((item) => String(item.targetKey || '') === String(section.dataset.targetKey || ''));
            const count = section.querySelector('header span');
            if (count)
                count.textContent = `${items.filter((item) => item.include).length} van ${items.length} opnemen`;
        });
    }
    function renderResume(container, imports) {
        container.innerHTML = '';
        imports.filter(item => item.state === 'active').forEach(item => {
            const button = global.document.createElement('button');
            button.type = 'button';
            button.className = 'bulk-import-resume-item';
            button.dataset.resumeId = item.id;
            button.innerHTML = `<strong>${item.completed} van ${item.total} gereed</strong><span>${item.failed ? `${item.failed} mislukt · ` : ''}${new Date(item.updated_at).toLocaleString('nl-NL')}</span>`;
            container.appendChild(button);
        });
    }
    function renderProgress(container, items) {
        container.innerHTML = '';
        items.forEach(item => {
            const row = global.document.createElement('div');
            row.className = `bulk-import-progress-item is-${item.state || 'pending'}`;
            const copy = global.document.createElement('div');
            const name = global.document.createElement('strong');
            name.textContent = item.source_name || item.file?.name || item.mapName;
            const location = global.document.createElement('span');
            location.textContent = `${item.location_name || item.buildingName || 'Locatie'} · ${item.floor_name || item.mapName}`;
            copy.append(name, location);
            const status = global.document.createElement('span');
            status.className = 'bulk-import-progress-status';
            status.textContent = item.statusLabel || { pending: 'Wachten', hashing: 'Controleren', converting: 'Converteren', uploading: 'Uploaden', completed: 'Gereed', failed: 'Mislukt', cancelled: 'Gestopt' }[item.state] || item.state;
            row.append(copy, status);
            if (item.error) {
                const error = global.document.createElement('small');
                error.textContent = item.error;
                row.appendChild(error);
            }
            if (item.state === 'failed' && item.file) {
                const retry = global.document.createElement('button');
                retry.type = 'button';
                retry.className = 'bulk-import-secondary bulk-import-retry';
                retry.dataset.retryId = item.id;
                retry.textContent = 'Opnieuw proberen';
                row.appendChild(retry);
            }
            container.appendChild(row);
        });
    }
    FD.BulkImportReview = { fillTargetSelect, refreshItems, renderItems, renderProgress, renderResume };
})(window);
