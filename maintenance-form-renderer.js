(function (global) {
    const FD = global.FD = global.FD || {};
    const Flow = FD.MaintenanceFormFlow;
    const Content = FD.MaintenanceFormRendererContent;
    const Ui = FD.MaintenanceFormRendererUi;
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
        const state = options.draftState ? structuredClone(options.draftState) : helpers.createState(initialInspection);
        const doorCode = String(options.door?.doorCode || options.door?.details?.doorCode || '').trim();
        const locationContext = [options.door?.customer, options.door?.location].map((value) => String(value || '').trim()).filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(' - ');
        state.stepId = 'general';
        state.isMaintenanceEdit = Boolean(initialInspection);
        if (!initialInspection) {
            const runtime = FD.InspectionContractRuntime;
            state.fields = runtime.core.directPrefill(state.fields, { deur_nummer: doorCode, klant_locatie: locationContext }, new Set(runtime.contract.forms.onderhoud.prefillFields || []));
        }
        state.maintenancePreservedNotes = initialInspection?.notes || null;
        state.maintenanceInitialNoteFields = { controle_interne_opmerking: initialInspection?.fields?.controle_interne_opmerking || '', controle_wat_mis: initialInspection?.fields?.controle_wat_mis || '' };
        const baseline = helpers.contentSignature(Flow.collectPayload(state));
        const overlay = element('div', { className: 'inspection-modal-backdrop maintenance-modal-backdrop' });
        const modal = element('div', {
            className: 'inspection-modal maintenance-modal', 'data-maintenance-modal': 'true', role: 'dialog',
            'aria-modal': 'true', 'aria-labelledby': 'maintenance-modal-title', tabindex: '-1',
        });
        overlay.append(modal);
        document.body.append(overlay);
        let draftTimer = null;
        let renderedErrors = [];
        let renderedError = '';
        function steps() {
            const list = Flow.previewStepsFor(state);
            if (!list.some(step => step.id === state.stepId))
                state.stepId = list[0]?.id || 'general';
            return list;
        }
        let closeConfirm = null;
        let lastCloseTrigger = null;
        let closeConfirmationKeydown = null;
        function close() {
            if (draftTimer !== null)
                window.clearTimeout(draftTimer);
            if (closeConfirmationKeydown)
                document.removeEventListener('keydown', closeConfirmationKeydown, true);
            closeConfirm?.remove();
            helpers.unregisterClose(close);
            overlay.remove();
        }
        helpers.registerClose(close);
        function queueDraft() {
            if (!options.onDraft)
                return;
            if (draftTimer !== null)
                window.clearTimeout(draftTimer);
            draftTimer = window.setTimeout(() => {
                draftTimer = null;
                options.onDraft?.(structuredClone(state));
            }, 250);
        }
        if (options.onDraft)
            ['input', 'change', 'click'].forEach(event => modal.addEventListener(event, queueDraft));
        function dismissCloseConfirmation() {
            if (closeConfirmationKeydown)
                document.removeEventListener('keydown', closeConfirmationKeydown, true);
            closeConfirmationKeydown = null;
            closeConfirm?.remove();
            closeConfirm = null;
            modal.removeAttribute('aria-hidden');
            modal.removeAttribute('inert');
            lastCloseTrigger?.focus();
        }
        function requestConfirmation(trigger, details) {
            if (closeConfirm)
                return;
            lastCloseTrigger = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
            modal.setAttribute('aria-hidden', 'true');
            modal.setAttribute('inert', '');
            const popup = element('section', {
                className: `maintenance-close-confirm${details.className ? ` ${details.className}` : ''}`, role: 'alertdialog', 'aria-modal': 'true',
                'aria-labelledby': 'maintenance-confirm-title', 'aria-describedby': 'maintenance-confirm-copy',
            });
            const continueButton = element('button', {
                className: 'btn maintenance-action maintenance-secondary-action', type: 'button', text: details.cancelLabel,
            });
            const confirmButton = element('button', {
                className: `btn maintenance-action ${details.confirmClass || 'maintenance-next-action'}`, type: 'button', text: details.confirmLabel,
            });
            continueButton.addEventListener('click', dismissCloseConfirmation);
            confirmButton.addEventListener('click', () => { dismissCloseConfirmation(); details.onConfirm?.(); });
            popup.append(element('h3', { id: 'maintenance-confirm-title', text: details.title }), element('p', { id: 'maintenance-confirm-copy', text: details.copy }), element('div', { className: 'maintenance-close-confirm-actions' }, [continueButton, confirmButton]));
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
        function requestClose(trigger = null) {
            if (!helpers.hasChanges(Flow.collectPayload(state), baseline))
                return close();
            requestConfirmation(trigger, {
                title: 'Formulier afsluiten?', copy: 'Niet-opgeslagen wijzigingen gaan verloren. Weet u zeker dat u wilt afsluiten?',
                cancelLabel: 'Doorgaan met formulier', confirmLabel: 'Formulier afsluiten',
                confirmClass: 'maintenance-destructive-action',
                onConfirm: () => { options.onDraft?.(null); close(); },
            });
        }
        modal.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            requestClose(document.activeElement instanceof HTMLElement ? document.activeElement : null);
        });
        function setField(name, value, rerender = false) {
            state.fields[name] = value;
            queueDraft();
            if (rerender)
                render('');
        }
        function selectOption(name, value) {
            if (name === 'nul_beurt')
                Flow.setNulBeurt(state, Flow.nulBeurtChoice(state) === value ? '' : value);
            else if (name === 'status_deur_voldoende_controle_onderhoud')
                Flow.applyStatus(state, Flow.statusValue(state) === value ? '' : value);
            else
                setField(name, String(state.fields[name] || '') === value ? '' : value);
            state.otherFields = state.otherFields || {};
            state.otherFields[name] = false;
            queueDraft();
            render('');
        }
        function fieldRequired(name) {
            const current = steps().find(step => step.id === state.stepId);
            const validationState = { ...state, fields: { ...state.fields, [name]: '' } };
            return Boolean(Flow.validationErrors(current || {}, validationState).find((message) => message.startsWith(`${Flow.field(name)?.label || name} is verplicht.`)));
        }
        function fieldError(name) {
            return renderedErrors.find(error => error === `${Flow.field(name)?.label || name} is verplicht.`) || '';
        }
        const contentRenderer = Content.create({ Flow, state, options, helpers, element, readFile, renderInputField, renderNulBeurt, renderSummary, rerender: (errorText = '') => render(errorText) });
        function renderChoiceField(item) {
            const error = fieldError(item.name);
            const wrap = element('div', { className: `maintenance-field${error ? ' maintenance-field--invalid' : ''}`, 'data-maintenance-field-wrap': item.name });
            const label = `${item.label}${fieldRequired(item.name) ? ' *' : ''}`;
            wrap.append(element('span', { className: 'maintenance-field-label', text: label }));
            const choiceCount = (item.options || []).length + (Flow.allowsOther(item.name) ? 1 : 0);
            const choices = element('div', { className: `maintenance-choice-grid maintenance-choice-grid--${choiceCount}${choiceCount === 2 ? ' maintenance-choice-grid--two' : ''}`, role: 'group', 'aria-label': label, 'aria-invalid': error ? 'true' : null, 'aria-describedby': error ? `maintenance-field-error-${item.name}` : null });
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
                    if (otherSelected) {
                        state.otherFields[item.name] = false;
                        state.fields[item.name] = '';
                    }
                    else {
                        state.otherFields[item.name] = true;
                        if (!Flow.isOtherValue(item.name, current))
                            state.fields[item.name] = '';
                    }
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
            if (error)
                wrap.append(element('span', { className: 'maintenance-field-error', id: `maintenance-field-error-${item.name}`, role: 'alert', text: error }));
            return wrap;
        }
        function renderInputField(item) {
            if (item.options?.length)
                return renderChoiceField(item);
            const error = fieldError(item.name);
            const wrap = element('label', {
                className: `maintenance-field${item.type === 'textarea' ? ' maintenance-field--wide' : ''}${error ? ' maintenance-field--invalid' : ''}`,
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
                'aria-invalid': error ? 'true' : null, 'aria-describedby': error ? `maintenance-field-error-${item.name}` : null,
            });
            control.value = state.fields[item.name] || '';
            control.addEventListener('input', () => { state.fields[item.name] = control.value; });
            wrap.append(Ui.wrapInputWithSuffix({ control, element, item }));
            if (error)
                wrap.append(element('span', { className: 'maintenance-field-error', id: `maintenance-field-error-${item.name}`, role: 'alert', text: error }));
            return wrap;
        }
        function renderNulBeurt() {
            return Ui.renderNulBeurt({ Flow, element, selectOption, state });
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
            if (Flow.doorType(state))
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
        function validationErrorsForCurrent() {
            if (initialInspection && !helpers.hasChanges(Flow.collectPayload(state), baseline))
                return [];
            const current = steps().find(item => item.id === state.stepId) || {};
            return Flow.validationErrors(current, state);
        }
        function renderValidation(errors) { renderedErrors = errors; render('', true); }
        async function commitSave(payload) {
            if (draftTimer !== null)
                window.clearTimeout(draftTimer);
            state.saving = true;
            render('');
            try {
                await options.onSubmit?.(payload);
                options.onDraft?.(null);
                close();
            }
            catch (err) {
                state.saving = false;
                render(helpers.friendlyError(err));
            }
        }
        async function save() {
            const payload = Flow.collectPayload(state);
            if (initialInspection && !helpers.hasChanges(payload, baseline))
                return close();
            const list = steps();
            for (const stepInfo of list) {
                const errors = Flow.validationErrors(stepInfo, state);
                if (errors.length) {
                    state.stepId = stepInfo.id;
                    renderValidation(errors);
                    return;
                }
            }
            if (initialInspection) {
                requestConfirmation(document.activeElement instanceof HTMLElement ? document.activeElement : null, {
                    title: 'Bestaand formulier wijzigen?',
                    copy: 'Weet u zeker dat u het bestaande formulier wilt veranderen? De bestaande versie blijft bewaard; na bevestigen wordt een nieuwe versie opgeslagen.',
                    cancelLabel: 'Wijzigingen controleren',
                    confirmLabel: 'Nieuwe versie opslaan',
                    confirmClass: 'maintenance-complete-action',
                    onConfirm: () => { void commitSave(payload); },
                });
                return;
            }
            await commitSave(payload);
        }
        function render(errorText = renderedError, retainValidation = false) {
            renderedError = errorText;
            if (!retainValidation)
                renderedErrors = [];
            const list = steps();
            const index = Math.max(0, list.findIndex(item => item.id === state.stepId));
            const stepInfo = list[index] || list[0];
            modal.setAttribute('data-maintenance-step', String(stepInfo.id || 'general'));
            modal.replaceChildren();
            const context = [options.door?.label || 'Deur', options.door?.customer, options.door?.location || options.door?.building, options.door?.floorLabel]
                .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
                .join(' · ');
            const header = element('div', { className: 'inspection-modal-header maintenance-modal-header' }, [
                element('div', { className: 'maintenance-modal-heading' }, [
                    element('h2', { id: 'maintenance-modal-title', text: initialInspection ? 'Onderhoud bewerken' : 'Onderhoud' }),
                    element('p', { text: context }),
                ]),
                element('button', { className: 'inspection-icon-button maintenance-close', type: 'button', 'aria-label': 'Sluiten', text: '×' }),
            ]);
            header.querySelector('.maintenance-close')?.addEventListener('click', (event) => requestClose(event.currentTarget));
            modal.append(header, Ui.renderProgress({
                element, index, initialInspection, list, state, rerender: () => render(''),
            }));
            const body = element('div', {
                className: `inspection-modal-body maintenance-modal-body maintenance-modal-body--${stepInfo.id}${errorText ? ' maintenance-modal-body--has-error' : ''}`,
            });
            const errorZone = element('div', { className: 'maintenance-error-zone', 'aria-live': 'polite' });
            if (errorText)
                errorZone.append(element('div', { className: 'inspection-error', role: 'alert', text: errorText }));
            body.append(errorZone);
            body.append(contentRenderer.renderStep(stepInfo));
            modal.append(body);
            const footer = element('div', { className: 'inspection-modal-actions maintenance-modal-actions' });
            const back = element('button', {
                className: 'btn maintenance-action maintenance-secondary-action', type: 'button', text: index === 0 ? 'Annuleren' : '← Terug',
            });
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
                className: `btn maintenance-action maintenance-primary-action${final ? ' maintenance-complete-action' : ' maintenance-next-action'}`,
                type: 'button', text: final ? finalLabel : 'Volgende →',
            });
            next.disabled = Boolean(state.saving);
            next.addEventListener('click', async () => {
                const errors = validationErrorsForCurrent();
                if (errors.length)
                    return renderValidation(errors);
                if (final)
                    return save();
                if (stepInfo.matrixKey && !Flow.hasStepAnswers(stepInfo, state)) {
                    return requestConfirmation(next, {
                        className: 'maintenance-empty-page-confirm', title: 'Niets ingevuld?',
                        copy: 'Er is niks ingevuld. Weet u zeker dat u naar de volgende pagina wilt gaan?',
                        cancelLabel: 'Op pagina blijven', confirmLabel: 'Toch doorgaan',
                        onConfirm: () => { state.stepId = list[index + 1].id; render(''); },
                    });
                }
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
