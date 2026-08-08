(function (global) {
    const FD = global.FD = global.FD || {};
    const Flow = FD.OpnameFormFlow;
    const Content = FD.OpnameFormRendererContent;
    const ProjectCodePrefill = FD.OpnameProjectCodePrefill;
    const Ui = FD.OpnameFormRendererUi;
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
    function open(options, helpers) {
        const initialInspection = options.initialInspection || null;
        const state = options.draftState ? structuredClone(options.draftState) : helpers.createState(initialInspection);
        const doorCode = String(options.door?.doorCode || options.door?.details?.doorCode || '').trim();
        const customer = String(options.door?.customer || '').trim();
        const location = String(options.door?.location || options.door?.building || '').trim();
        state.stepId = 'general';
        state.isEdit = Boolean(initialInspection);
        if (!initialInspection) {
            const runtime = FD.InspectionContractRuntime;
            state.fields = runtime.core.directPrefill(state.fields, { deurcode: doorCode, klant: customer, pandnaam: location }, new Set(runtime.contract.forms.opname.prefillFields || []));
            const sharedProjectCode = String(ProjectCodePrefill?.get?.(options.projectCodeScope) || '').trim();
            if (!Flow.hasValue(state.fields.projectcode) && sharedProjectCode)
                state.fields.projectcode = sharedProjectCode;
            if (!Flow.hasValue(state.fields.aantal_identieke_deuren))
                state.fields.aantal_identieke_deuren = '1';
        }
        const baseline = helpers.contentSignature(helpers.collectPayload('opname', state));
        const overlay = element('div', { className: 'inspection-modal-backdrop opname-modal-backdrop' });
        const modal = element('div', {
            className: 'inspection-modal opname-modal', 'data-opname-modal': 'true', role: 'dialog', 'aria-modal': 'true',
            'aria-labelledby': 'opname-modal-title', tabindex: '-1',
        });
        overlay.append(modal);
        document.body.append(overlay);
        let draftTimer = null;
        let renderedErrors = [];
        let renderedError = '';
        let closeConfirm = null;
        let lastCloseTrigger = null;
        let closeConfirmationKeydown = null;
        function steps() {
            const list = Flow.previewStepsFor(state);
            if (!list.some(step => step.id === state.stepId))
                state.stepId = list[0]?.id || 'general';
            return list;
        }
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
                syncVisibleInputs();
                options.onDraft?.(structuredClone(state));
            }, 250);
        }
        if (options.onDraft) {
            modal.addEventListener('input', queueDraft);
            modal.addEventListener('change', queueDraft);
            modal.addEventListener('click', queueDraft);
        }
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
                className: `maintenance-close-confirm opname-close-confirm${details.className ? ` ${details.className}` : ''}`,
                role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'opname-confirm-title', 'aria-describedby': 'opname-confirm-copy',
            });
            const cancel = element('button', { className: 'btn maintenance-action maintenance-secondary-action', type: 'button', text: details.cancelLabel });
            const confirm = element('button', { className: `btn maintenance-action ${details.confirmClass || 'maintenance-next-action'}`, type: 'button', text: details.confirmLabel });
            const cancelConfirmation = () => { dismissCloseConfirmation(); details.onCancel?.(); };
            cancel.addEventListener('click', cancelConfirmation);
            confirm.addEventListener('click', () => { dismissCloseConfirmation(); details.onConfirm?.(); });
            popup.append(element('h3', { id: 'opname-confirm-title', text: details.title }), element('p', { id: 'opname-confirm-copy', text: details.copy }), element('div', { className: 'maintenance-close-confirm-actions' }, [cancel, confirm]));
            closeConfirm = popup;
            closeConfirmationKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelConfirmation();
                    return;
                }
                if (event.key !== 'Tab')
                    return;
                const buttons = Array.from(popup.querySelectorAll('button:not([disabled])'));
                const current = buttons.indexOf(document.activeElement);
                const next = event.shiftKey ? (current <= 0 ? buttons.length - 1 : current - 1) : (current === buttons.length - 1 ? 0 : current + 1);
                event.preventDefault();
                buttons[next]?.focus();
            };
            document.addEventListener('keydown', closeConfirmationKeydown, true);
            overlay.append(popup);
            cancel.focus();
        }
        function requestClose(trigger = null) {
            syncVisibleInputs();
            if (!helpers.hasChanges(helpers.collectPayload('opname', state), baseline))
                return close();
            requestConfirmation(trigger, {
                title: 'Formulier afsluiten?', copy: 'Niet-opgeslagen wijzigingen gaan verloren. Weet u zeker dat u wilt afsluiten?',
                cancelLabel: 'Doorgaan met formulier', confirmLabel: 'Formulier afsluiten', confirmClass: 'maintenance-destructive-action',
                onConfirm: () => { options.onDraft?.(null); close(); },
            });
        }
        function requestProjectCodeConfirmation(projectCode) {
            return new Promise(resolve => requestConfirmation(document.activeElement, {
                title: 'Geldt de projectcode bij alle deuren op deze plattegrond?',
                copy: `Projectcode: ${projectCode}. Deze wordt dan vooraf ingevuld bij nieuwe opnames op deze plattegrond.`,
                cancelLabel: 'Nee', confirmLabel: 'Ja', confirmClass: 'maintenance-complete-action',
                onCancel: () => resolve(false), onConfirm: () => resolve(true),
            }));
        }
        function promptProjectCodeForNewDoor() {
            const scope = String(options.projectCodeScope || '').trim();
            const projectCode = String(ProjectCodePrefill?.candidate?.(scope) || '').trim();
            if (initialInspection || !scope || !projectCode || !ProjectCodePrefill?.shouldPrompt?.(scope))
                return;
            void requestProjectCodeConfirmation(projectCode).then(apply => {
                ProjectCodePrefill?.choose?.(scope, apply);
                if (apply && !Flow.hasValue(state.fields.projectcode)) {
                    state.fields.projectcode = projectCode;
                    render('');
                }
            });
        }
        modal.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            requestClose(document.activeElement instanceof HTMLElement ? document.activeElement : null);
        });
        function setField(name, value, shouldRerender = false) {
            if (name === 'oplossing' && state.fields[name] !== value)
                Flow.clearSolutionFollowUps(state);
            if (name === 'toegang' && state.fields[name] !== value)
                Flow.clearAccessConfiguration(state);
            state.fields[name] = value;
            queueDraft();
            if (shouldRerender)
                render('');
        }
        function fieldRequired(name) { return Boolean(Flow.field(name)?.required); }
        function fieldError(name) {
            return renderedErrors.find(error => error === `${Flow.field(name)?.label || name} is verplicht.`) || '';
        }
        function renderSummary() {
            const value = (name) => String(state.fields[name] || 'Niet ingevuld');
            const fieldCount = Object.values(state.fields || {}).filter(Flow.hasValue).length;
            const photoCount = Object.values(state.photos || {}).reduce((total, entries) => total + (entries || []).length, 0);
            const rows = [
                ['Opname', value('opname')], ['Projectcode', value('projectcode')], ['Type object', value('type_object_opname')],
                ['Ingevuld door', value('ingevuld_door')], ['Velden ingevuld', String(fieldCount)], ['Foto’s toegevoegd', String(photoCount)],
            ];
            const list = element('div', { className: 'maintenance-summary opname-summary' });
            rows.forEach(([label, answer]) => {
                const row = element('div', { className: 'maintenance-summary-item opname-summary-item' });
                row.append(element('span', { text: label }), element('strong', { text: answer }));
                list.append(row);
            });
            return list;
        }
        const contentRenderer = Content.create({
            Flow, Ui, state, options, helpers, element, readFile, fieldRequired, getFieldError: fieldError, setField,
            rerender: (errorText = '') => render(errorText), renderSummary,
        });
        function syncVisibleInputs() {
            const controls = Array.from(modal.querySelectorAll('input[data-opname-field], select[data-opname-field], textarea[data-opname-field]'));
            controls.forEach(control => {
                const name = String(control.dataset.opnameField || '');
                if (name)
                    state.fields[name] = control.value;
            });
        }
        function validationErrorsForCurrent() {
            syncVisibleInputs();
            const current = steps().find(step => step.id === state.stepId) || {};
            return Flow.validationErrors(current, state);
        }
        function renderValidation(errors) {
            renderedErrors = errors;
            render('', true);
            Ui.focusFirstInvalid(modal);
        }
        async function commitSave(payload) {
            if (draftTimer !== null)
                window.clearTimeout(draftTimer);
            state.saving = true;
            render('');
            try {
                await options.onSubmit?.(payload);
                options.onDraft?.(null);
                const projectCode = String(payload.fields?.projectcode || '').trim();
                if (!initialInspection && projectCode && options.projectCodeScope)
                    ProjectCodePrefill?.setCandidate?.(options.projectCodeScope, projectCode);
                close();
            }
            catch (error) {
                state.saving = false;
                render(helpers.friendlyError(error));
            }
        }
        async function save() {
            syncVisibleInputs();
            const payload = helpers.collectPayload('opname', state);
            if (initialInspection && !helpers.hasChanges(payload, baseline))
                return close();
            for (const stepInfo of steps()) {
                const errors = Flow.validationErrors(stepInfo, state);
                if (errors.length) {
                    state.stepId = stepInfo.id;
                    renderValidation(errors);
                    return;
                }
            }
            if (initialInspection) {
                requestConfirmation(document.activeElement instanceof HTMLElement ? document.activeElement : null, {
                    title: 'Bestaand opnameformulier wijzigen?',
                    copy: 'Weet u zeker dat u het bestaande formulier wilt veranderen? De bestaande versie blijft bewaard; na bevestigen wordt een nieuwe versie opgeslagen.',
                    cancelLabel: 'Wijzigingen controleren', confirmLabel: 'Nieuwe versie opslaan', confirmClass: 'maintenance-complete-action',
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
            modal.setAttribute('data-opname-step', String(stepInfo.id || 'general'));
            modal.replaceChildren();
            const context = [options.door?.label || 'Deur', options.door?.customer, options.door?.location || options.door?.building, options.door?.floorLabel]
                .filter((value, itemIndex, values) => Boolean(value) && values.indexOf(value) === itemIndex)
                .join(' · ');
            const header = element('div', { className: 'inspection-modal-header opname-modal-header' }, [
                element('div', { className: 'opname-modal-heading' }, [
                    element('h2', { id: 'opname-modal-title', text: initialInspection ? 'Opname bewerken' : 'Opname' }),
                    element('p', { text: context }),
                ]),
                element('button', { className: 'inspection-icon-button opname-close', type: 'button', 'aria-label': 'Sluiten', text: '×' }),
            ]);
            header.querySelector('.opname-close')?.addEventListener('click', (event) => requestClose(event.currentTarget));
            modal.append(header, Ui.renderProgress({ element, index, initialInspection, list, state, rerender: () => render('') }));
            const body = element('div', { className: `inspection-modal-body opname-modal-body opname-modal-body--${stepInfo.id}${errorText ? ' opname-modal-body--has-error' : ''}` });
            const errorZone = element('div', { className: 'opname-error-zone', 'aria-live': 'polite' });
            if (errorText)
                errorZone.append(element('div', { className: 'inspection-error', role: 'alert', text: errorText }));
            body.append(errorZone, contentRenderer.renderStep(stepInfo));
            modal.append(body);
            const footer = element('div', { className: 'inspection-modal-actions opname-modal-actions' });
            const back = element('button', { className: 'btn maintenance-action maintenance-secondary-action', type: 'button', text: index === 0 ? 'Annuleren' : '← Terug' });
            back.addEventListener('click', () => {
                if (index === 0)
                    requestClose(back);
                else {
                    state.stepId = list[index - 1].id;
                    render('');
                }
            });
            const final = index === list.length - 1;
            const next = element('button', {
                className: `btn maintenance-action maintenance-primary-action${final ? ' maintenance-complete-action' : ' maintenance-next-action'}`,
                type: 'button', text: final ? '✓ Opname voltooien' : 'Volgende →',
            });
            next.disabled = Boolean(state.saving);
            next.addEventListener('click', async () => {
                const errors = validationErrorsForCurrent();
                if (errors.length)
                    return renderValidation(errors);
                if (final)
                    return save();
                state.stepId = list[index + 1].id;
                render('');
            });
            footer.append(back, next);
            modal.append(footer);
        }
        render('');
        requestAnimationFrame(() => {
            modal.querySelector('.opname-close')?.focus();
            promptProjectCodeForNewDoor();
        });
        return { close, collectPayload: () => helpers.collectPayload('opname', state) };
    }
    FD.OpnameFormRenderer = { open };
})(window);
