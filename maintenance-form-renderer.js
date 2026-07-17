(function (global) {
    const FD = global.FD = global.FD || {};
    const Flow = FD.MaintenanceFormFlow;
    const Content = FD.MaintenanceFormRendererContent;
    function element(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (value === false || value == null)
                return;
            if (key === 'className')
                node.className = value;
            else if (key === 'text')
                node.textContent = value;
            else
                node.setAttribute(key, value === true ? '' : String(value));
        });
        children.forEach(child => node.append(child));
        return node;
    }
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Foto kon niet worden gelezen.'));
            reader.readAsDataURL(file);
        });
    }
    function displayOption(value) { return value === 'HSD_deur' ? 'HSD-deur' : value; }
    function open(options, helpers) {
        const initialInspection = options.initialInspection || null;
        const state = helpers.createState(initialInspection);
        const doorCode = String(options.door?.doorCode || options.door?.details?.doorCode || '').trim();
        const locationContext = [options.door?.customer, options.door?.location]
            .map((value) => String(value || '').trim())
            .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
            .join(' - ');
        state.stepId = 'general';
        state.isMaintenanceEdit = Boolean(initialInspection);
        if (!initialInspection && doorCode)
            state.fields.deur_nummer = doorCode;
        if (!initialInspection && !Flow.hasValue(state.fields.klant_locatie) && locationContext) {
            state.fields.klant_locatie = locationContext;
        }
        state.maintenancePreservedNotes = initialInspection?.notes || null;
        state.maintenanceInitialNoteFields = {
            controle_interne_opmerking: initialInspection?.fields?.controle_interne_opmerking || '',
            controle_wat_mis: initialInspection?.fields?.controle_wat_mis || '',
        };
        const baseline = helpers.contentSignature(Flow.collectPayload(state));
        const overlay = element('div', { className: 'inspection-modal-backdrop maintenance-modal-backdrop' });
        const modal = element('div', {
            className: 'inspection-modal maintenance-modal', 'data-maintenance-modal': 'true', role: 'dialog',
            'aria-modal': 'true', 'aria-labelledby': 'maintenance-modal-title', tabindex: '-1',
        });
        overlay.append(modal);
        document.body.append(overlay);
        let renderedError = '';
        function steps() {
            const list = (Flow.hasValue(Flow.statusValue(state))
                ? Flow.stepsFor(state)
                : Flow.previewStepsFor(state));
            if (!list.some(step => step.id === state.stepId))
                state.stepId = list[0]?.id || 'general';
            return list;
        }
        let closeConfirm = null;
        let lastCloseTrigger = null;
        let closeConfirmationKeydown = null;
        function close() {
            if (closeConfirmationKeydown)
                document.removeEventListener('keydown', closeConfirmationKeydown, true);
            closeConfirm?.remove();
            helpers.unregisterClose(close);
            overlay.remove();
        }
        helpers.registerClose(close);
        function dismissCloseConfirmation() {
            if (closeConfirmationKeydown)
                document.removeEventListener('keydown', closeConfirmationKeydown, true);
            closeConfirmationKeydown = null;
            closeConfirm?.remove();
            closeConfirm = null;
            modal.removeAttribute('aria-hidden');
            lastCloseTrigger?.focus();
        }
        function requestClose(trigger = null) {
            if (closeConfirm)
                return;
            lastCloseTrigger = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
            modal.setAttribute('aria-hidden', 'true');
            const popup = element('section', {
                className: 'maintenance-close-confirm', role: 'alertdialog', 'aria-modal': 'true',
                'aria-labelledby': 'maintenance-close-confirm-title', 'aria-describedby': 'maintenance-close-confirm-copy',
            });
            const continueButton = element('button', {
                className: 'btn maintenance-secondary-action', type: 'button', text: 'Doorgaan met formulier',
            });
            const exitButton = element('button', {
                className: 'btn maintenance-complete-action', type: 'button', text: 'Formulier afsluiten',
            });
            continueButton.addEventListener('click', dismissCloseConfirmation);
            exitButton.addEventListener('click', close);
            popup.append(element('h3', { id: 'maintenance-close-confirm-title', text: 'Formulier afsluiten?' }), element('p', { id: 'maintenance-close-confirm-copy', text: 'Weet u zeker dat u het onderhoudsformulier wilt afsluiten?' }), element('div', { className: 'maintenance-close-confirm-actions' }, [continueButton, exitButton]));
            closeConfirm = popup;
            closeConfirmationKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    dismissCloseConfirmation();
                    return;
                }
                if (event.key !== 'Tab')
                    return;
                const focusables = Array.from(popup.querySelectorAll('button:not([disabled])'));
                const currentIndex = focusables.indexOf(document.activeElement);
                const nextIndex = event.shiftKey
                    ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
                    : (currentIndex === focusables.length - 1 ? 0 : currentIndex + 1);
                event.preventDefault();
                focusables[nextIndex]?.focus();
            };
            document.addEventListener('keydown', closeConfirmationKeydown, true);
            overlay.append(popup);
            continueButton.focus();
        }
        modal.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            requestClose(document.activeElement instanceof HTMLElement ? document.activeElement : null);
        });
        function setField(name, value, rerender = false) {
            state.fields[name] = value;
            if (rerender)
                render('');
        }
        function selectOption(name, value) {
            if (name === 'nul_beurt')
                Flow.setNulBeurt(state, value);
            else if (name === 'status_deur_voldoende_controle_onderhoud')
                Flow.applyStatus(state, value, Boolean(initialInspection));
            else
                setField(name, value);
            state.otherFields = state.otherFields || {};
            state.otherFields[name] = false;
            render('');
        }
        function fieldRequired(name) {
            const current = steps().find(step => step.id === state.stepId);
            const validationState = {
                ...state,
                fields: { ...state.fields, [name]: '' },
            };
            return Boolean(Flow.validationErrors(current || {}, validationState).find((message) => message.startsWith(`${Flow.field(name)?.label || name} is verplicht.`)));
        }
        const contentRenderer = Content.create({
            Flow, state, options, helpers, element, readFile,
            rerender: (errorText = '') => render(errorText),
        });
        function renderChoiceField(item) {
            const wrap = element('div', { className: 'maintenance-field', 'data-maintenance-field-wrap': item.name });
            const label = `${item.label}${fieldRequired(item.name) ? ' *' : ''}`;
            wrap.append(element('span', { className: 'maintenance-field-label', text: label }));
            const choices = element('div', { className: 'maintenance-choice-grid', role: 'group', 'aria-label': item.label });
            const current = String(state.fields[item.name] || '');
            (item.options || []).forEach((option) => {
                const selected = current === option;
                const button = element('button', {
                    className: `maintenance-choice${selected ? ' is-selected' : ''}`,
                    type: 'button',
                    'aria-pressed': selected ? 'true' : 'false',
                    'data-maintenance-field': item.name,
                    'data-choice-value': option,
                    text: displayOption(option),
                });
                button.addEventListener('click', () => selectOption(item.name, option));
                choices.append(button);
            });
            if (Flow.allowsOther(item.name)) {
                state.otherFields = state.otherFields || {};
                const otherSelected = Flow.isOtherValue(item.name, current) || Boolean(state.otherFields[item.name]);
                const otherButton = element('button', {
                    className: `maintenance-choice maintenance-choice-other${otherSelected ? ' is-selected' : ''}`,
                    type: 'button',
                    'aria-pressed': otherSelected ? 'true' : 'false',
                    'data-maintenance-field': item.name,
                    'data-choice-other': 'true',
                    text: 'Anders',
                });
                otherButton.addEventListener('click', () => {
                    state.otherFields[item.name] = true;
                    if (!Flow.isOtherValue(item.name, current))
                        state.fields[item.name] = '';
                    render('');
                });
                choices.append(otherButton);
                if (otherSelected) {
                    const otherInput = element('input', {
                        className: 'maintenance-input maintenance-other-input',
                        type: 'text',
                        placeholder: 'Vul een andere waarde in',
                        'data-maintenance-other-input': item.name,
                        'aria-label': `${item.label} anders`,
                    });
                    otherInput.value = otherSelected ? current : '';
                    otherInput.addEventListener('input', () => { state.fields[item.name] = otherInput.value; });
                    choices.append(otherInput);
                }
            }
            wrap.append(choices);
            return wrap;
        }
        function renderInputField(item) {
            if (item.options?.length)
                return renderChoiceField(item);
            const wrap = element('label', {
                className: `maintenance-field${item.type === 'textarea' ? ' maintenance-field--wide' : ''}`,
                'data-maintenance-field-wrap': item.name,
            });
            wrap.append(element('span', {
                className: 'maintenance-field-label',
                text: `${item.label}${fieldRequired(item.name) ? ' *' : ''}`,
            }));
            const tag = item.type === 'textarea' ? 'textarea' : 'input';
            const control = element(tag, {
                className: 'maintenance-input',
                type: item.type === 'date' ? 'date' : 'text',
                rows: item.type === 'textarea' ? '3' : null,
                'data-maintenance-field': item.name,
                readonly: item.name === 'deur_nummer',
                'aria-readonly': item.name === 'deur_nummer' ? 'true' : null,
            });
            control.value = state.fields[item.name] || '';
            control.addEventListener('input', () => { state.fields[item.name] = control.value; });
            wrap.append(control);
            return wrap;
        }
        function renderNulBeurt() {
            const wrap = element('div', { className: 'maintenance-field maintenance-nul-beurt' });
            wrap.append(element('span', { className: 'maintenance-field-label', text: 'Nul beurt' }));
            const choices = element('div', { className: 'maintenance-choice-grid maintenance-choice-grid--two', role: 'group', 'aria-label': 'Nul beurt' });
            ['Ja', 'Nee'].forEach(value => {
                const selected = Flow.nulBeurtChoice(state) === value;
                const button = element('button', {
                    className: `maintenance-choice maintenance-choice--large${selected ? ' is-selected' : ''}`,
                    type: 'button',
                    'aria-pressed': selected ? 'true' : 'false',
                    'data-maintenance-field': 'nul_beurt',
                    'data-choice-value': value,
                    text: value,
                });
                button.addEventListener('click', () => selectOption('nul_beurt', value));
                choices.append(button);
            });
            wrap.append(choices);
            return wrap;
        }
        function renderSummary() {
            const list = element('div', { className: 'maintenance-summary' });
            const values = [
                ['Deurcode', String(state.fields.deur_nummer || 'Niet beschikbaar')],
                ['Klant - locatie', String(state.fields.klant_locatie || 'Niet ingevuld')],
                ['Uitvoerbaar', Flow.statusValue(state) || 'Niet ingevuld'],
            ];
            if (Flow.isNulBeurt(state))
                values.push(['Nul beurt', 'Ja']);
            if (Flow.statusValue(state) === 'Ja' && Flow.doorType(state))
                values.push(['Type deur', displayOption(Flow.doorType(state))]);
            if (Flow.hasValue(Flow.endResult(state)))
                values.push(['Eindcontrole', Flow.endResult(state)]);
            if (String(state.fields.controle_meerwerk_gedaan || '') === 'Ja')
                values.push(['Meerwerk', 'Ja']);
            if (Flow.showDeviation(state)) {
                const hasDeviation = ['controle_wat_mis', 'controle_welke_materialen_nodig', 'controle_oplossing_voeren_werkzaamheden']
                    .some(name => Flow.hasValue(state.fields[name]));
                values.push(['Afwijking', hasDeviation ? 'Ingevuld' : 'Geen details']);
                const regie = String(state.fields.controle_regie_uitgevoerd || 'Niet ingevuld');
                const today = String(state.fields.controle_regie_vandaag_uitgevoerd || '');
                values.push(['Regie', regie === 'Ja' && today ? `Ja${today === 'Ja' ? ' (vandaag)' : ' (datum ingevuld)'}` : regie]);
            }
            if (Flow.hasValue(state.fields.controle_interne_opmerking))
                values.push(['Interne notitie', 'Ingevuld']);
            values.forEach(([label, value]) => list.append(element('div', { className: 'maintenance-summary-item' }, [
                element('span', { text: label }), element('strong', { text: value }),
            ])));
            return list;
        }
        function renderProgress(list, index) {
            const progress = element('div', { className: 'maintenance-progress', 'data-maintenance-step-count': list.length });
            progress.append(element('span', { className: 'maintenance-progress-copy', text: `Stap ${index + 1} van ${list.length}` }));
            const dots = element('div', { className: 'maintenance-progress-dots', role: 'img', 'aria-label': `Stap ${index + 1} van ${list.length}` });
            dots.style.setProperty('--maintenance-progress-count', String(Math.max(1, list.length)));
            list.forEach((item, itemIndex) => dots.append(element('span', {
                className: `maintenance-progress-dot${itemIndex < index ? ' is-complete' : ''}${itemIndex === index ? ' is-current' : ''}`,
                'aria-hidden': 'true',
            })));
            progress.append(dots);
            return progress;
        }
        function renderStep(stepInfo) {
            const content = element('div', { className: `maintenance-step maintenance-step--${stepInfo.id}` });
            content.append(element('h3', { className: 'maintenance-step-title', text: stepInfo.title }));
            if (stepInfo.id === 'general')
                content.append(renderNulBeurt());
            if (stepInfo.matrixKey) {
                content.append(contentRenderer.renderMatrix(stepInfo));
                return content;
            }
            if (stepInfo.id === 'summary') {
                content.append(renderSummary());
                return content;
            }
            const names = [...(stepInfo.fields || [])];
            if (stepInfo.id === 'general' && Flow.statusValue(state) !== 'Ja') {
                names.splice(names.indexOf('type_deur'), 1);
            }
            if (stepInfo.id === 'dranger' && String(state.fields.dranger_aanwezig || '') === 'Ja')
                names.push(...(stepInfo.detailFields || []));
            const grid = element('div', { className: `maintenance-field-grid maintenance-field-grid--${stepInfo.id}` });
            names.forEach(name => {
                const item = Flow.field(name);
                if (item)
                    grid.append(renderInputField(item));
            });
            content.append(grid);
            const photoKinds = stepInfo.id === 'dranger' && String(state.fields.dranger_aanwezig || '') !== 'Ja'
                ? [] : (stepInfo.photos || []);
            if (photoKinds.length) {
                const photos = element('div', { className: 'maintenance-photo-grid' });
                photoKinds.forEach((kind) => {
                    const photo = contentRenderer.renderPhoto(kind);
                    if (photo)
                        photos.append(photo);
                });
                content.append(photos);
            }
            return content;
        }
        function validationErrorForCurrent() {
            if (initialInspection && !helpers.hasChanges(Flow.collectPayload(state), baseline))
                return '';
            const current = steps().find(item => item.id === state.stepId) || {};
            return (Flow.validationErrors(current, state)[0] || '');
        }
        async function save() {
            const payload = Flow.collectPayload(state);
            if (initialInspection && !helpers.hasChanges(payload, baseline))
                return close();
            const list = steps();
            for (const stepInfo of list) {
                const error = Flow.validationErrors(stepInfo, state)[0];
                if (error) {
                    state.stepId = stepInfo.id;
                    render(error);
                    return;
                }
            }
            state.saving = true;
            render('');
            try {
                await options.onSubmit?.(payload);
                close();
            }
            catch (err) {
                state.saving = false;
                render(helpers.friendlyError(err));
            }
        }
        function render(errorText = renderedError) {
            renderedError = errorText;
            const list = steps();
            const index = Math.max(0, list.findIndex(item => item.id === state.stepId));
            const stepInfo = list[index] || list[0];
            modal.replaceChildren();
            const context = [options.door?.label || 'Deur', options.door?.customer, options.door?.location || options.door?.building, options.door?.floorLabel]
                .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
                .join(' · ');
            const header = element('div', { className: 'inspection-modal-header maintenance-modal-header' }, [
                element('div', { className: 'maintenance-modal-heading' }, [
                    element('h2', { id: 'maintenance-modal-title', text: initialInspection ? 'Onderhoud bewerken' : 'Onderhoud' }),
                    element('p', { text: context }),
                ]),
                element('button', { className: 'inspection-icon-button maintenance-close', type: 'button', 'aria-label': 'Sluiten', text: 'x' }),
            ]);
            header.querySelector('.maintenance-close')?.addEventListener('click', (event) => requestClose(event.currentTarget));
            modal.append(header, renderProgress(list, index));
            const body = element('div', { className: `inspection-modal-body maintenance-modal-body maintenance-modal-body--${stepInfo.id}` });
            const errorZone = element('div', { className: 'maintenance-error-zone', 'aria-live': 'polite' });
            if (errorText)
                errorZone.append(element('div', { className: 'inspection-error', role: 'alert', text: errorText }));
            body.append(errorZone);
            body.append(renderStep(stepInfo));
            modal.append(body);
            const footer = element('div', { className: 'inspection-modal-actions maintenance-modal-actions' });
            const back = element('button', { className: 'btn maintenance-secondary-action', type: 'button', text: index === 0 ? 'Annuleren' : 'Terug' });
            back.addEventListener('click', () => {
                if (index === 0)
                    requestClose(back);
                else {
                    state.stepId = list[index - 1].id;
                    render('');
                }
            });
            const final = index === list.length - 1;
            const finalLabel = Flow.statusValue(state) === 'Nee' ? 'Onderhoud vastleggen' : '✓ Onderhoud voltooien';
            const next = element('button', {
                className: `btn maintenance-primary-action${final ? ' maintenance-complete-action' : ' maintenance-next-action'}`,
                type: 'button', text: final ? finalLabel : 'Volgende →',
            });
            next.disabled = Boolean(state.saving);
            next.addEventListener('click', async () => {
                const error = validationErrorForCurrent();
                if (error)
                    return render(error);
                if (final)
                    return save();
                state.stepId = list[index + 1].id;
                render('');
            });
            footer.append(back, next);
            modal.append(footer);
        }
        render('');
        requestAnimationFrame(() => modal.querySelector('.maintenance-close')?.focus());
        return { close, collectPayload: () => Flow.collectPayload(state) };
    }
    FD.MaintenanceFormRenderer = { open };
})(window);
