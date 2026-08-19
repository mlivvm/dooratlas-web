(function (global) {
    const FD = global.FD = global.FD || {};
    const PhotoViewer = FD.InspectionPhotoViewer;
    function create(deps) {
        const { Flow, state, options, helpers, element, readFile, renderInputField, renderNulBeurt, renderSummary, matrixError, persistDraft, rerender, } = deps;
        const persist = () => persistDraft();
        const persistBeforePhoto = () => persistDraft(true);
        function renderPhoto(kind) {
            const item = Flow.photo(kind);
            if (!item)
                return null;
            const entry = (state.photos[kind] || [])[0];
            const wrap = element('div', { className: 'maintenance-photo-field', 'data-maintenance-photo': kind });
            wrap.append(element('span', { className: 'maintenance-field-label', text: item.label }));
            const controls = element('div', { className: 'maintenance-photo-controls' });
            const input = element('input', {
                className: 'maintenance-photo-input', type: 'file', accept: 'image/jpeg,image/png,image/webp', 'data-maintenance-photo-input': kind,
                'aria-hidden': 'true', tabindex: '-1',
            });
            input.addEventListener('change', async () => {
                const file = Array.from(input.files || [])[0];
                if (!file)
                    return;
                try {
                    const dataUrl = await readFile(file);
                    state.photos[kind] = [{ filename: file.name, content_type: file.type, data_url: dataUrl }];
                    persist();
                    rerender('');
                }
                catch (error) {
                    rerender(helpers.friendlyError(error));
                }
            });
            const addNativePhoto = async () => {
                const adapter = options.tabletPhotoAdapter;
                if (!adapter?.capture)
                    return input.click();
                try {
                    await persistBeforePhoto();
                    const photo = await adapter.capture({ allowGallery: kind === 'vooraf_genomen_fotos', photoKind: kind });
                    if (!photo)
                        return;
                    state.photos[kind] = [photo];
                    persist();
                    rerender('');
                }
                catch (error) {
                    rerender(helpers.friendlyError(error));
                }
            };
            if (entry) {
                const source = entry.existing ? options.photoUrl?.(Number(entry.id)) : (entry.preview_url || entry.data_url);
                const preview = element('button', {
                    className: 'maintenance-photo-preview', type: 'button',
                    'aria-label': `${item.label} vergroten`, title: `${item.label} vergroten`, disabled: !source,
                });
                if (source)
                    preview.append(element('img', { src: source, alt: item.label, loading: 'lazy' }));
                else
                    preview.append(element('span', { className: 'maintenance-photo-placeholder', text: 'Bestaande foto' }));
                preview.addEventListener('click', () => PhotoViewer?.open?.({ source, label: item.label, trigger: preview }));
                controls.append(preview);
                const actions = element('div', { className: 'maintenance-photo-actions' });
                const upload = element('button', {
                    className: 'maintenance-photo-upload', type: 'button',
                    'data-maintenance-photo-action': 'replace', text: 'Foto vervangen',
                });
                upload.addEventListener('click', () => { void addNativePhoto(); });
                actions.append(upload);
                const remove = element('button', {
                    className: 'maintenance-photo-remove', type: 'button', 'data-maintenance-photo-action': 'remove',
                    'aria-label': `${item.label} verwijderen uit nieuwe versie`, text: 'Verwijderen',
                });
                remove.addEventListener('click', () => {
                    const nativeRef = String(entry.native_ref || '');
                    if (nativeRef)
                        void options.tabletPhotoAdapter?.discard?.(nativeRef);
                    state.photos[kind] = [];
                    persist();
                    rerender('');
                });
                actions.append(remove);
                controls.append(actions);
            }
            else {
                const add = element('button', {
                    className: 'maintenance-photo-preview maintenance-photo-preview--empty', type: 'button',
                    'data-maintenance-photo-action': 'add', 'aria-label': `${item.label} toevoegen`, text: 'Foto toevoegen',
                });
                add.addEventListener('click', () => { void addNativePhoto(); });
                controls.append(add);
            }
            controls.append(input);
            wrap.append(controls);
            return wrap;
        }
        function renderMatrix(stepInfo) {
            const definition = Flow.matrix(stepInfo.matrixKey);
            const matrix = element('div', { className: 'maintenance-matrix', 'data-maintenance-matrix': stepInfo.matrixKey });
            matrix.append(element('p', { className: 'maintenance-matrix-helper', text: 'Kies per regel een status. Acties verschijnen alleen bij Nee.' }));
            const actions = (definition?.columns || []).filter((column) => !Flow.statusColumns.includes(column));
            (stepInfo.rows || []).forEach((rowLabel) => {
                const error = matrixError(rowLabel);
                const errorId = `maintenance-matrix-error-${Flow.slug(rowLabel)}`;
                const row = element('section', {
                    className: `maintenance-matrix-row${error ? ' maintenance-matrix-row--invalid' : ''}`,
                    'data-maintenance-row': rowLabel, 'aria-invalid': error ? 'true' : null,
                    'aria-describedby': error ? errorId : null,
                });
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
                        persist();
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
                            persist();
                            rerender('');
                        });
                        actionButtons.append(button);
                    });
                    controls.append(actionButtons);
                }
                row.append(controls);
                if (error)
                    row.append(element('span', {
                        className: 'maintenance-matrix-error', id: errorId, role: 'alert', text: error,
                    }));
                matrix.append(row);
            });
            return matrix;
        }
        function renderCombinedSections(sections) {
            const wrap = element('div', { className: 'maintenance-combined-sections' });
            sections.forEach(section => {
                const group = element('section', { className: `maintenance-combined-section${section.kind ? ` maintenance-combined-section--${section.kind}` : ''}` });
                group.append(element('h4', { className: 'maintenance-section-title', text: section.title }));
                const grid = element('div', { className: 'maintenance-field-grid maintenance-combined-field-grid' });
                (section.fields || []).forEach((name) => {
                    const item = Flow.field(name);
                    if (item && Flow.fieldVisible(name, state))
                        grid.append(renderInputField(item));
                });
                group.append(grid);
                wrap.append(group);
            });
            return wrap;
        }
        function renderStep(stepInfo) {
            const content = element('div', { className: `maintenance-step maintenance-step--${stepInfo.id}` });
            content.append(element('h3', { className: 'maintenance-step-title', text: stepInfo.title }));
            const surface = element('div', { className: `maintenance-work-surface maintenance-work-surface--${stepInfo.id}` });
            let detailGrid = null;
            if (stepInfo.matrixKey) {
                surface.append(renderMatrix(stepInfo));
                if ((stepInfo.sections || []).length)
                    surface.append(renderCombinedSections(stepInfo.sections));
            }
            else if (stepInfo.id === 'summary') {
                surface.append(renderSummary());
            }
            else {
                const names = [...(stepInfo.fields || [])];
                if (stepInfo.id === 'general') {
                    const context = element('section', { className: 'maintenance-general-section maintenance-general-section--context' });
                    context.append(element('h4', { className: 'maintenance-section-title', text: 'Basisgegevens' }));
                    const contextGrid = element('div', { className: 'maintenance-field-grid maintenance-general-context-grid' });
                    ['klant_locatie', 'deur_nummer', 'door_wie_ingevuld'].forEach(name => {
                        const item = Flow.field(name);
                        if (!item || !Flow.fieldVisible(name, state))
                            return;
                        const field = renderInputField(item);
                        if (name === 'door_wie_ingevuld')
                            field.classList.add('maintenance-field--wide');
                        contextGrid.append(field);
                    });
                    context.append(contextGrid);
                    const assessment = element('section', { className: 'maintenance-general-section maintenance-general-section--assessment' });
                    assessment.append(element('h4', { className: 'maintenance-section-title', text: 'Uitvoerbaarheid' }));
                    const assessmentGrid = element('div', { className: 'maintenance-field-grid maintenance-general-assessment-grid' });
                    ['status_deur_voldoende_controle_onderhoud', 'type_deur'].forEach(name => {
                        const item = Flow.field(name);
                        if (item && Flow.fieldVisible(name, state))
                            assessmentGrid.append(renderInputField(item));
                    });
                    assessmentGrid.append(renderNulBeurt());
                    assessment.append(assessmentGrid);
                    surface.append(element('div', { className: 'maintenance-general-layout' }, [context, assessment]));
                }
                else {
                    const grid = element('div', { className: `maintenance-field-grid maintenance-field-grid--${stepInfo.id}` });
                    names.forEach(name => {
                        const item = Flow.field(name);
                        if (item && Flow.fieldVisible(name, state))
                            grid.append(renderInputField(item));
                    });
                    detailGrid = grid;
                    surface.append(grid);
                }
                const photoKinds = stepInfo.photos || [];
                if (photoKinds.length) {
                    if (detailGrid && ['slot', 'beslag-2', 'dranger'].includes(stepInfo.id)) {
                        photoKinds.forEach((kind) => {
                            const photo = renderPhoto(kind);
                            if (photo)
                                detailGrid?.append(photo);
                        });
                    }
                    else {
                        const photos = element('div', { className: 'maintenance-photo-grid' });
                        photoKinds.forEach((kind) => {
                            const photo = renderPhoto(kind);
                            if (photo)
                                photos.append(photo);
                        });
                        if (stepInfo.id === 'general') {
                            const photoSection = element('section', { className: 'maintenance-general-photo-section' }, [
                                element('h4', { className: 'maintenance-section-title', text: "Foto's (optioneel)" }),
                            ]);
                            photoSection.append(photos);
                            surface.append(photoSection);
                        }
                        else
                            surface.append(photos);
                    }
                }
            }
            content.append(surface);
            return content;
        }
        return { renderMatrix, renderPhoto, renderStep };
    }
    FD.MaintenanceFormRendererContent = { create };
})(window);
