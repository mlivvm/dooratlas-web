(function (global) {
    const FD = global.FD = global.FD || {};
    function create(deps) {
        const { Flow, state, options, helpers, element, readFile, rerender } = deps;
        function renderPhoto(kind) {
            const item = Flow.photo(kind);
            if (!item)
                return null;
            const entry = (state.photos[kind] || [])[0];
            const wrap = element('div', { className: 'maintenance-photo-field', 'data-maintenance-photo': kind });
            wrap.append(element('span', { className: 'maintenance-field-label', text: item.label }));
            const controls = element('div', { className: 'maintenance-photo-controls' });
            if (entry) {
                const preview = element('div', { className: 'maintenance-photo-preview' });
                const source = entry.existing ? options.photoUrl?.(Number(entry.id)) : entry.data_url;
                if (source)
                    preview.append(element('img', { src: source, alt: item.label, loading: 'lazy' }));
                else
                    preview.append(element('span', { className: 'maintenance-photo-placeholder', text: 'Bestaande foto' }));
                controls.append(element('div', { className: 'maintenance-photo-previews' }, [preview]));
            }
            const upload = element('button', {
                className: 'maintenance-photo-upload', type: 'button',
                'data-maintenance-photo-action': entry ? 'replace' : 'add', text: entry ? 'Foto vervangen' : 'Foto toevoegen',
            });
            const input = element('input', {
                className: 'maintenance-photo-input', type: 'file', accept: 'image/jpeg,image/png,image/webp', 'data-maintenance-photo-input': kind,
                'aria-label': `${item.label} ${entry ? 'vervangen' : 'toevoegen'}`,
            });
            upload.addEventListener('click', () => input.click());
            input.addEventListener('change', async () => {
                const file = Array.from(input.files || [])[0];
                if (!file)
                    return;
                try {
                    const dataUrl = await readFile(file);
                    state.photos[kind] = [{ filename: file.name, content_type: file.type, data_url: dataUrl }];
                    rerender('');
                }
                catch (error) {
                    rerender(helpers.friendlyError(error));
                }
            });
            controls.append(upload, input);
            if (entry) {
                const remove = element('button', {
                    className: 'maintenance-photo-remove', type: 'button', 'data-maintenance-photo-action': 'remove',
                    'aria-label': `${item.label} verwijderen uit nieuwe versie`, text: 'Verwijderen',
                });
                remove.addEventListener('click', () => { state.photos[kind] = []; rerender(''); });
                controls.append(remove);
            }
            wrap.append(controls);
            return wrap;
        }
        function renderMatrix(stepInfo) {
            const definition = Flow.matrix(stepInfo.matrixKey);
            const matrix = element('div', { className: 'maintenance-matrix', 'data-maintenance-matrix': stepInfo.matrixKey });
            matrix.append(element('p', { className: 'maintenance-matrix-helper', text: 'Kies per regel een status. Acties verschijnen alleen bij Nee.' }));
            const actions = (definition?.columns || []).filter((column) => !Flow.statusColumns.includes(column));
            (stepInfo.rows || []).forEach((rowLabel) => {
                const row = element('section', { className: 'maintenance-matrix-row', 'data-maintenance-row': rowLabel });
                row.append(element('strong', { className: 'maintenance-matrix-label', text: rowLabel }));
                const controls = element('div', { className: 'maintenance-matrix-controls' });
                const selected = Flow.matrixStatus(state, stepInfo.matrixKey, rowLabel);
                const statuses = element('div', { className: 'maintenance-matrix-statuses', role: 'group', 'aria-label': `${rowLabel} status` });
                Flow.statusColumns.forEach((column) => {
                    const button = element('button', {
                        className: `maintenance-matrix-choice${selected === column ? ' is-selected' : ''}`,
                        type: 'button', 'aria-pressed': selected === column ? 'true' : 'false', 'data-matrix-status': column, text: column,
                    });
                    button.addEventListener('click', () => {
                        Flow.setMatrixStatus(state, stepInfo.matrixKey, rowLabel, selected === column ? '' : column);
                        rerender('');
                    });
                    statuses.append(button);
                });
                controls.append(statuses);
                if (selected === 'Nee') {
                    const actionButtons = element('div', { className: 'maintenance-matrix-actions', role: 'group', 'aria-label': `${rowLabel} actie` });
                    actions.forEach((column) => {
                        const active = Flow.matrixActionSelected(state, stepInfo.matrixKey, rowLabel, column);
                        const button = element('button', {
                            className: `maintenance-matrix-action${active ? ' is-selected' : ''}`,
                            type: 'button', 'aria-pressed': active ? 'true' : 'false', 'data-matrix-action': column, text: column,
                        });
                        button.addEventListener('click', () => {
                            Flow.toggleMatrixAction(state, stepInfo.matrixKey, rowLabel, column);
                            rerender('');
                        });
                        actionButtons.append(button);
                    });
                    controls.append(actionButtons);
                }
                row.append(controls);
                matrix.append(row);
            });
            return matrix;
        }
        return { renderMatrix, renderPhoto };
    }
    FD.MaintenanceFormRendererContent = { create };
})(window);
