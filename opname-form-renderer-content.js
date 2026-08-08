(function (global) {
    const FD = global.FD = global.FD || {};
    const PhotoViewer = FD.InspectionPhotoViewer;
    function create(deps) {
        const { Flow, state, options, helpers, element, readFile, getFieldError, fieldRequired, setField, rerender, renderSummary, Ui } = deps;
        const persist = () => options.onDraft?.(structuredClone(state));
        function fieldLabel(item) {
            return `${item.label}${fieldRequired(item.name) ? ' *' : ''}`;
        }
        function appendHelper(wrap, item) {
            const copy = String(Flow.helperText?.(item.name) || '');
            if (copy)
                wrap.append(element('span', { className: 'opname-field-help', text: copy }));
        }
        function useChoiceTiles(item) {
            const options = item.options || [];
            return item.name === 'type_schoot' || (options.length > 0 && options.length <= 3 && options.every((option) => String(option).length <= 24));
        }
        function renderChoiceField(item, forceSelect = false) {
            const error = getFieldError(item.name);
            const label = fieldLabel(item);
            const wrap = element('div', {
                className: `opname-field opname-field--choice${error ? ' opname-field--invalid' : ''}`,
                'data-opname-field-wrap': item.name,
            });
            wrap.append(element('span', { className: 'opname-field-label', text: label }));
            const current = state.fields[item.name];
            if (item.type === 'text_array') {
                const values = new Set(Array.isArray(current) ? current : []);
                const choices = element('div', { className: 'opname-choice-grid opname-choice-grid--array', role: 'group', 'aria-label': label });
                choices.style.setProperty('--opname-choice-count', String(Math.max(1, (item.options || []).length)));
                (item.options || []).forEach((option) => {
                    const selected = values.has(option);
                    const button = element('button', {
                        className: `opname-choice${selected ? ' is-selected' : ''}`, type: 'button',
                        'aria-pressed': selected ? 'true' : 'false', 'data-opname-field': item.name, 'data-choice-value': option,
                        text: Ui.displayOption(option),
                    });
                    button.addEventListener('click', () => {
                        const next = new Set(Array.isArray(state.fields[item.name]) ? state.fields[item.name] : []);
                        if (next.has(option))
                            next.delete(option);
                        else
                            next.add(option);
                        setField(item.name, Array.from(next), true);
                    });
                    choices.append(button);
                });
                wrap.append(choices);
            }
            else if (!forceSelect && useChoiceTiles(item)) {
                const choices = element('div', {
                    className: `opname-choice-grid opname-choice-grid--${Math.max(1, (item.options || []).length)}`,
                    role: 'group', 'aria-label': label,
                });
                choices.style.setProperty('--opname-choice-count', String(Math.max(1, (item.options || []).length)));
                (item.options || []).forEach((option) => {
                    const selected = String(current || '') === option;
                    const button = element('button', {
                        className: `opname-choice${selected ? ' is-selected' : ''}`, type: 'button',
                        'aria-pressed': selected ? 'true' : 'false', 'data-opname-field': item.name, 'data-choice-value': option,
                        text: Ui.displayOption(option),
                    });
                    button.addEventListener('click', () => setField(item.name, selected ? '' : option, true));
                    choices.append(button);
                });
                wrap.append(choices);
            }
            else {
                const control = element('select', {
                    className: 'opname-input', 'data-opname-field': item.name, 'aria-invalid': error ? 'true' : null,
                    'aria-describedby': error ? `opname-field-error-${item.name}` : null,
                });
                control.append(element('option', { value: '', text: 'Kies...' }));
                (item.options || []).forEach((option) => control.append(element('option', { value: option, text: Ui.displayOption(option) })));
                const existing = String(current || '');
                if (existing && !(item.options || []).includes(existing)) {
                    control.append(element('option', { value: existing, text: existing }));
                }
                control.value = existing;
                control.addEventListener('change', () => setField(item.name, control.value, true));
                wrap.append(control);
            }
            appendHelper(wrap, item);
            if (error)
                wrap.append(element('span', { className: 'opname-field-error', id: `opname-field-error-${item.name}`, role: 'alert', text: error }));
            return wrap;
        }
        function renderInputField(item, forceSelect = false) {
            if (item.options?.length)
                return renderChoiceField(item, forceSelect);
            const error = getFieldError(item.name);
            const label = fieldLabel(item);
            const wrap = element('label', {
                className: `opname-field${item.type === 'textarea' ? ' opname-field--wide' : ''}${error ? ' opname-field--invalid' : ''}`,
                'data-opname-field-wrap': item.name,
            });
            wrap.append(element('span', { className: 'opname-field-label', text: label }));
            const tag = item.type === 'textarea' ? 'textarea' : 'input';
            const isDoorCount = item.name === 'aantal_identieke_deuren';
            const control = element(tag, {
                className: 'opname-input', type: item.type === 'numeric' ? 'number' : (item.type === 'date' ? 'date' : 'text'),
                inputmode: item.type === 'numeric' ? 'numeric' : null,
                step: isDoorCount ? '1' : (item.type === 'numeric' ? 'any' : null), min: isDoorCount ? '1' : null,
                rows: item.type === 'textarea' ? '3' : null, 'data-opname-field': item.name,
                readonly: Flow.isReadOnly?.(item.name), 'aria-readonly': Flow.isReadOnly?.(item.name) ? 'true' : null,
                'aria-invalid': error ? 'true' : null, 'aria-describedby': error ? `opname-field-error-${item.name}` : null,
            });
            control.value = state.fields[item.name] || '';
            control.addEventListener('input', () => { state.fields[item.name] = control.value; });
            control.addEventListener('change', () => setField(item.name, control.value, Boolean(Flow.isVisibilityTrigger?.(item.name))));
            wrap.append(control);
            appendHelper(wrap, item);
            if (error)
                wrap.append(element('span', { className: 'opname-field-error', id: `opname-field-error-${item.name}`, role: 'alert', text: error }));
            return wrap;
        }
        function renderPhoto(kind) {
            const item = Flow.photo(kind);
            if (!item)
                return null;
            const entries = state.photos[kind] || [];
            const wrap = element('section', { className: 'opname-photo-field', 'data-opname-photo': kind });
            wrap.append(element('span', { className: 'opname-field-label', text: item.label }));
            const input = element('input', {
                className: 'opname-photo-input', type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: item.multiple ? true : null,
                'data-opname-photo-input': kind, 'aria-hidden': 'true', tabindex: '-1',
            });
            input.addEventListener('change', async () => {
                const files = Array.from(input.files || []);
                if (!files.length)
                    return;
                try {
                    const additions = await Promise.all(files.map(async (file) => ({ filename: file.name, content_type: file.type, data_url: await readFile(file) })));
                    const current = state.photos[kind] || [];
                    const maximum = Math.max(1, Number(item.maxFiles || 1));
                    const next = item.multiple ? [...current, ...additions] : additions.slice(0, 1);
                    if (next.length > maximum) {
                        rerender(`${item.label} mag maximaal ${maximum} foto('s) bevatten.`);
                        return;
                    }
                    state.photos[kind] = next;
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
                    const photo = await adapter.capture({ allowGallery: kind === 'vooraf_genomen_fotos' });
                    if (!photo)
                        return;
                    const current = state.photos[kind] || [];
                    const maximum = Math.max(1, Number(item.maxFiles || 1));
                    const next = item.multiple ? [...current, photo] : [photo];
                    if (next.length > maximum)
                        return rerender(`${item.label} mag maximaal ${maximum} foto('s) bevatten.`);
                    state.photos[kind] = next;
                    persist();
                    rerender('');
                }
                catch (error) {
                    rerender(helpers.friendlyError(error));
                }
            };
            const gallery = element('div', { className: 'opname-photo-gallery' });
            entries.forEach((entry) => {
                const source = entry.existing ? options.photoUrl?.(Number(entry.id)) : (entry.preview_url || entry.data_url);
                const card = element('div', { className: 'opname-photo-entry' });
                const preview = element('button', {
                    className: 'opname-photo-preview', type: 'button', 'aria-label': `${item.label} vergroten`, title: `${item.label} vergroten`, disabled: !source,
                });
                if (source)
                    preview.append(element('img', { src: source, alt: item.label, loading: 'lazy' }));
                else
                    preview.append(element('span', { className: 'opname-photo-placeholder', text: 'Bestaande foto' }));
                preview.addEventListener('click', () => PhotoViewer?.open?.({ source, label: item.label, trigger: preview }));
                const remove = element('button', {
                    className: 'opname-photo-remove', type: 'button', text: 'Verwijderen',
                    'aria-label': `${item.label} verwijderen uit nieuwe versie`,
                });
                remove.addEventListener('click', () => {
                    state.photos[kind] = (state.photos[kind] || []).filter((candidate) => candidate !== entry);
                    persist();
                    rerender('');
                });
                card.append(preview, remove);
                gallery.append(card);
            });
            const add = element('button', {
                className: `opname-photo-add${entries.length ? ' opname-photo-add--secondary' : ''}`, type: 'button',
                'data-opname-photo-action': entries.length && !item.multiple ? 'replace' : 'add',
                'aria-label': `${item.label} ${entries.length && !item.multiple ? 'vervangen' : 'toevoegen'}`,
                text: entries.length && !item.multiple ? 'Foto vervangen' : 'Foto toevoegen',
            });
            add.addEventListener('click', () => { void addNativePhoto(); });
            wrap.append(gallery, add, input);
            return wrap;
        }
        function renderSection(section) {
            const card = element('section', {
                className: `opname-form-section${section.context ? ' opname-form-section--context' : ''}${section.layout ? ` opname-form-section--${section.layout}` : ''}`,
                'data-opname-section': section.layout || section.title,
            });
            if (section.layout) {
                card.style.height = 'auto';
                card.style.alignSelf = 'start';
            }
            card.append(element('h4', { className: 'opname-section-title', text: section.title }));
            if (section.context === 'floorplan') {
                const floorLabel = String(options.door?.floorLabel || '').trim() || 'Niet beschikbaar';
                const context = element('div', { className: 'opname-map-context' }, [
                    element('span', { text: 'Geselecteerde plattegrond' }),
                    element('strong', { text: floorLabel }),
                ]);
                card.append(context);
            }
            if ((section.fields || []).length) {
                const grid = element('div', { className: 'opname-field-grid' });
                grid.style.setProperty('--opname-field-columns', String(section.columns || 2));
                if (section.layout === 'solution-options')
                    grid.style.gridTemplateColumns = 'minmax(0, 1fr)';
                if (section.layout === 'solution-details')
                    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(126px, 1fr))';
                if (section.layout === 'solution-parts')
                    grid.style.gridTemplateColumns = 'minmax(0, 1fr)';
                (section.fields || []).forEach((name) => {
                    const item = Flow.field(name);
                    if (item) {
                        const field = renderInputField(item, section.layout === 'solution-details');
                        if (section.layout === 'solution-options') {
                            field.querySelector('.opname-choice-grid')?.style.setProperty('grid-template-columns', 'minmax(0, 1fr)');
                        }
                        if (['toegang', 'merk_elektronisch', 'merk_mechanisch', 'type_schoot'].includes(name)) {
                            field.style.gridColumn = '1 / -1';
                        }
                        if (section.layout === 'solution-details' && !['toegang', 'merk_elektronisch', 'merk_mechanisch'].includes(name)) {
                            const label = field.querySelector('.opname-field-label');
                            if (label) {
                                label.style.minHeight = '2.5em';
                                label.style.display = 'flex';
                                label.style.flexDirection = 'column';
                                label.style.justifyContent = 'flex-end';
                            }
                        }
                        grid.append(field);
                    }
                });
                card.append(grid);
            }
            if (section.emptyCopy) {
                card.append(element('p', {
                    className: 'opname-solution-empty-copy', text: section.emptyCopy,
                    style: 'margin:0; color:var(--maintenance-muted); font-size:13px; line-height:1.45;',
                }));
            }
            if ((section.photos || []).length) {
                const photos = element('div', { className: 'opname-photo-grid' });
                (section.photos || []).forEach((kind) => {
                    const field = renderPhoto(kind);
                    if (field)
                        photos.append(field);
                });
                card.append(photos);
            }
            return card;
        }
        function renderStep(stepInfo) {
            const content = element('div', { className: `opname-step opname-step--${stepInfo.id}` });
            content.append(element('h3', { className: 'opname-step-title', text: stepInfo.title }));
            const surface = element('div', { className: `opname-work-surface opname-work-surface--${stepInfo.id}` });
            if (stepInfo.id === 'summary')
                surface.append(renderSummary());
            else {
                const layout = element('div', { className: 'opname-step-layout' });
                if (stepInfo.id === 'solution') {
                    layout.classList.add('opname-solution-layout');
                    layout.style.gridTemplateColumns = 'minmax(200px, 0.85fr) minmax(0, 1.55fr) minmax(160px, 0.55fr)';
                    layout.style.height = 'auto';
                    layout.style.alignItems = 'start';
                    layout.style.alignContent = 'start';
                }
                (stepInfo.sections || []).forEach((section) => layout.append(renderSection(section)));
                if (stepInfo.id === 'solution') {
                    const firstCard = layout.firstElementChild;
                    if (firstCard)
                        firstCard.style.gridColumn = '1';
                }
                surface.append(layout);
            }
            content.append(surface);
            return content;
        }
        return { renderInputField, renderStep };
    }
    FD.OpnameFormRendererContent = { create };
})(window);
