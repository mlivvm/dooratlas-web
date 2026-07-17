(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.InspectionFormConfig;
    const QUESTIONNAIRE_VERSION = Number(C.QUESTIONNAIRE_VERSION || 1);
    const QUESTIONNAIRES = C.QUESTIONNAIRES;
    const backendFormType = C.backendFormType;
    function element(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (value === false || value == null)
                return;
            if (key === 'className')
                node.className = value;
            else if (key === 'text')
                node.textContent = value;
            else if (key === 'html')
                node.innerHTML = value;
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
    function friendlyError(err) {
        const status = Number(err?.status || 0);
        const message = String(err?.message || '');
        if (status === 401 || ['invalid_session', 'session_required'].includes(String(err?.code || ''))) {
            return 'Je sessie is verlopen. Log opnieuw in en probeer het daarna nog een keer.';
        }
        if (status === 403)
            return 'Je hebt geen recht om inspecties op te slaan voor deze klant.';
        if (status === 409)
            return 'Deze inspectie lijkt al te bestaan. Ververs de plattegrond en probeer het opnieuw.';
        if (status === 413)
            return 'Een foto of bestand is te groot.';
        if (status === 422 || status === 400)
            return message || 'Controleer de ingevulde velden.';
        if (status >= 500)
            return 'De server kon de inspectie niet opslaan. Probeer het later opnieuw.';
        if (err instanceof TypeError)
            return 'Netwerkfout. Controleer je verbinding en probeer opnieuw.';
        return message || 'Opslaan is mislukt.';
    }
    function slug(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'waarde';
    }
    function hasValue(value) {
        return Array.isArray(value) ? value.length > 0 : value != null && String(value).trim() !== '';
    }
    function newClientUuid() {
        if (typeof global.crypto?.randomUUID === 'function')
            return global.crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
            const value = Math.floor(Math.random() * 16);
            return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
        });
    }
    function cloneValue(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
    function createState(initialInspection = null) {
        const photos = {};
        (initialInspection?.photos || []).forEach((photo) => {
            const kind = String(photo?.kind || '');
            const id = Number(photo?.id || 0);
            if (!kind || !id)
                return;
            photos[kind] = photos[kind] || [];
            photos[kind].push({ id, kind, existing: true });
        });
        const matrices = {};
        const matrixMeta = {};
        (initialInspection?.matrix_answers || []).forEach((answer) => {
            if (answer?.value === false)
                return;
            const key = [answer.matrix_key, answer.row_key, answer.column_key].map(String).join('|');
            matrices[key] = true;
            matrixMeta[key] = {
                rowLabel: answer.row_label || answer.row_key,
                columnLabel: answer.column_label || answer.column_key,
            };
        });
        return { step: 0, saving: false, clientUuid: newClientUuid(),
            performedAt: initialInspection?.performed_at || new Date().toISOString(),
            fields: cloneValue(initialInspection?.fields || {}), photos, matrices, matrixMeta,
        };
    }
    function valuesInclude(value, expected) {
        if (Array.isArray(value))
            return value.includes(expected);
        return String(value || '') === expected;
    }
    function isConditionMet(condition, state) {
        if (!condition)
            return true;
        const value = state.fields[condition.fieldName];
        if (condition.op === 'value')
            return hasValue(value);
        if (condition.op === 'equals')
            return valuesInclude(value, condition.value);
        if (condition.op === 'includes')
            return valuesInclude(value, condition.value);
        if (condition.op === 'notEquals')
            return hasValue(value) && !valuesInclude(value, condition.value);
        return true;
    }
    function isFieldVisible(item, state) {
        return isConditionMet(item.condition, state);
    }
    function collectPayload(formType, state) {
        if (formType === 'onderhoud' && FD.MaintenanceFormFlow?.collectPayload) {
            return FD.MaintenanceFormFlow.collectPayload(state);
        }
        const questionnaire = QUESTIONNAIRES[formType];
        const fields = {};
        questionnaire.sections.forEach((section) => {
            (section.fields || []).forEach((item) => {
                if (!isFieldVisible(item, state))
                    return;
                const value = state.fields[item.name];
                if (!hasValue(value))
                    return;
                fields[item.name] = Array.isArray(value) ? value.slice() : String(value).trim();
            });
        });
        const photos = [];
        const existing_photo_ids = [];
        Object.entries(state.photos).forEach(([kind, items]) => {
            (items || []).forEach((item, index) => {
                if (Number(item?.id || 0) > 0) {
                    existing_photo_ids.push(Number(item.id));
                    return;
                }
                if (!item?.data_url)
                    return;
                photos.push({
                    kind,
                    data_url: item.data_url,
                    filename: item.filename,
                    content_type: item.content_type,
                    sort_order: index,
                });
            });
        });
        const matrix_answers = [];
        Object.entries(state.matrices).forEach(([key, value]) => {
            if (!value)
                return;
            const [matrixKey, rowKey, columnKey] = key.split('|');
            const meta = state.matrixMeta[key] || {};
            matrix_answers.push({
                matrix_key: matrixKey,
                row_key: rowKey,
                row_label: meta.rowLabel || rowKey,
                column_key: columnKey,
                column_label: meta.columnLabel || columnKey,
                value: true,
                sort_order: matrix_answers.length,
            });
        });
        return {
            form_type: formType,
            questionnaire_version: QUESTIONNAIRE_VERSION,
            client_uuid: state.clientUuid || null,
            performed_at: state.performedAt || new Date().toISOString(),
            notes: fields.controle_interne_opmerking || fields.controle_wat_mis || fields.opmerking_project || fields.opmerking || null,
            fields,
            photos,
            existing_photo_ids,
            matrix_answers,
        };
    }
    function validateSection(section, state) {
        return (section.fields || [])
            .filter((item) => isFieldVisible(item, state))
            .filter((item) => item.required && !hasValue(state.fields[item.name]))
            .map((item) => `${item.label} is verplicht.`);
    }
    function renderField(item, state, onFieldChange = () => { }) {
        const wrap = element('label', { className: 'inspection-field' });
        wrap.append(element('span', { text: `${item.label}${item.required ? ' *' : ''}` }));
        if (item.type === 'text_array') {
            const group = element('div', { className: 'inspection-checks' });
            const values = new Set(state.fields[item.name] || []);
            item.options.forEach((option) => {
                const check = element('input', { type: 'checkbox' });
                check.checked = values.has(option);
                check.addEventListener('change', () => {
                    const next = new Set(state.fields[item.name] || []);
                    if (check.checked)
                        next.add(option);
                    else
                        next.delete(option);
                    state.fields[item.name] = Array.from(next);
                    onFieldChange(item.name);
                });
                group.append(element('label', { className: 'inspection-check' }, [check, document.createTextNode(option)]));
            });
            wrap.append(group);
            return wrap;
        }
        const tag = item.type === 'textarea' ? 'textarea' : (item.options?.length ? 'select' : 'input');
        const input = element(tag, {
            className: 'inspection-input',
            type: item.type === 'numeric' ? 'number' : (item.type === 'date' ? 'date' : 'text'),
            step: item.type === 'numeric' ? 'any' : null,
            rows: item.type === 'textarea' ? '3' : null,
        });
        if (tag === 'select') {
            input.append(element('option', { value: '', text: 'Kies...' }));
            item.options.forEach((option) => input.append(element('option', { value: option, text: option })));
            const existingValue = String(state.fields[item.name] || '');
            if (existingValue && !item.options.includes(existingValue))
                input.append(element('option', { value: existingValue, text: existingValue }));
        }
        input.value = state.fields[item.name] || '';
        input.addEventListener('input', () => { state.fields[item.name] = input.value; });
        input.addEventListener('change', () => { state.fields[item.name] = input.value; onFieldChange(item.name); });
        wrap.append(input);
        return wrap;
    }
    function renderPhotos(section, state, options) {
        if (!section.photos?.length)
            return null;
        const wrap = element('div', { className: 'inspection-photo-grid' });
        section.photos.forEach((item) => {
            const input = element('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: item.multiple });
            const count = element('small');
            const existing = element('div', { className: 'inspection-existing-photos' });
            const updateCount = () => {
                const total = state.photos[item.kind]?.length || 0;
                count.textContent = total ? `${total} foto(s) in deze versie` : '';
            };
            const renderExisting = () => {
                existing.replaceChildren();
                (state.photos[item.kind] || []).filter((photo) => photo?.existing).forEach((photo) => {
                    const preview = element('div', { className: 'inspection-existing-photo' });
                    const image = element('img', { src: options.photoUrl?.(Number(photo.id)) || '', alt: item.label, loading: 'lazy' });
                    const remove = element('button', {
                        type: 'button',
                        className: 'inspection-existing-photo-remove',
                        text: 'x',
                        'aria-label': `${item.label} verwijderen uit nieuwe versie`,
                    });
                    remove.addEventListener('click', () => {
                        state.photos[item.kind] = (state.photos[item.kind] || []).filter((entry) => entry !== photo);
                        renderExisting();
                        updateCount();
                    });
                    preview.append(image, remove);
                    existing.append(preview);
                });
            };
            input.addEventListener('change', async () => {
                const files = Array.from(input.files || []);
                const additions = await Promise.all(files.map(async (file) => ({
                    filename: file.name,
                    content_type: file.type,
                    data_url: await readFile(file),
                })));
                state.photos[item.kind] = [...(state.photos[item.kind] || []), ...additions];
                updateCount();
            });
            renderExisting();
            updateCount();
            wrap.append(element('div', { className: 'inspection-field inspection-file' }, [
                element('span', { text: item.label }),
                existing,
                input,
                count,
            ]));
        });
        return wrap;
    }
    function renderMatrices(section, state) {
        if (!section.matrices?.length)
            return null;
        const wrap = element('div', { className: 'inspection-matrices' });
        section.matrices.forEach((item) => {
            const table = element('div', { className: 'inspection-matrix' });
            table.append(element('h4', { text: item.label }));
            item.rows.forEach((rowLabel, rowIndex) => {
                const rowKey = slug(rowLabel);
                const row = element('div', { className: 'inspection-matrix-row' });
                row.append(element('strong', { text: rowLabel }));
                const choices = element('div', { className: 'inspection-matrix-options' });
                item.columns.forEach((columnLabel) => {
                    const columnKey = slug(columnLabel);
                    const key = `${item.key}|${rowKey}|${columnKey}`;
                    state.matrixMeta[key] = { rowLabel, columnLabel };
                    const check = element('input', { type: 'checkbox' });
                    check.checked = Boolean(state.matrices[key]);
                    check.addEventListener('change', () => { state.matrices[key] = check.checked; });
                    choices.append(element('label', { className: 'inspection-check' }, [check, document.createTextNode(columnLabel)]));
                });
                row.append(choices);
                table.append(row);
                if (rowIndex < item.rows.length - 1)
                    table.append(element('div', { className: 'inspection-divider' }));
            });
            wrap.append(table);
        });
        return wrap;
    }
    const activeForms = new Set();
    function open(options = {}) {
        const formType = backendFormType(options.formType);
        if (formType === 'onderhoud' && FD.MaintenanceFormRenderer?.open) {
            return FD.MaintenanceFormRenderer.open(options, {
                contentSignature: FD.InspectionFormDiff.contentSignature,
                createState,
                friendlyError,
                hasChanges: FD.InspectionFormDiff.hasChanges,
                registerClose: (close) => activeForms.add(close),
                unregisterClose: (close) => activeForms.delete(close),
            });
        }
        return openGeneric(options, formType);
    }
    function openGeneric(options, formType) {
        const questionnaire = QUESTIONNAIRES[formType];
        if (!questionnaire)
            throw new Error('Formulier niet gevonden.');
        const initialInspection = options.initialInspection || null;
        const state = createState(initialInspection);
        const baseline = FD.InspectionFormDiff.contentSignature(collectPayload(formType, state));
        const overlay = element('div', { className: 'inspection-modal-backdrop', role: 'dialog', 'aria-modal': 'true' });
        const modal = element('div', { className: 'inspection-modal' });
        overlay.append(modal);
        document.body.append(overlay);
        const visibilityTriggers = new Set();
        questionnaire.sections.forEach((section) => {
            (section.fields || []).forEach((item) => {
                if (item.condition?.fieldName)
                    visibilityTriggers.add(item.condition.fieldName);
            });
        });
        function close() {
            activeForms.delete(close);
            overlay.remove();
        }
        activeForms.add(close);
        function onFieldChange(fieldName) {
            if (visibilityTriggers.has(fieldName))
                render('');
        }
        async function save() {
            const errors = questionnaire.sections.flatMap((section) => validateSection(section, state));
            if (errors.length) {
                render(errors[0]);
                return;
            }
            state.saving = true;
            render('');
            try {
                const payload = collectPayload(formType, state);
                if (initialInspection && !FD.InspectionFormDiff.hasChanges(payload, baseline))
                    return close();
                await options.onSubmit?.(payload);
                close();
            }
            catch (err) {
                state.saving = false;
                render(friendlyError(err));
            }
        }
        function render(errorText = '') {
            const section = questionnaire.sections[state.step];
            modal.replaceChildren();
            modal.append(element('div', { className: 'inspection-modal-header' }, [
                element('div', {}, [
                    element('h2', { text: initialInspection ? `${questionnaire.title} bewerken` : questionnaire.title }),
                    element('p', { text: `${options.door?.label || 'Deur'} - stap ${state.step + 1} van ${questionnaire.sections.length}` }),
                ]),
                element('button', { className: 'inspection-icon-button', type: 'button', 'aria-label': 'Sluiten', text: 'x' }),
            ]));
            modal.querySelector('.inspection-icon-button')?.addEventListener('click', close);
            const body = element('div', { className: 'inspection-modal-body' }, [element('h3', { text: section.title })]);
            if (errorText)
                body.append(element('div', { className: 'inspection-error', text: errorText }));
            (section.fields || [])
                .filter((item) => isFieldVisible(item, state))
                .forEach((item) => body.append(renderField(item, state, onFieldChange)));
            const photos = renderPhotos(section, state, options);
            if (photos)
                body.append(photos);
            const matrices = renderMatrices(section, state);
            if (matrices)
                body.append(matrices);
            modal.append(body);
            const footer = element('div', { className: 'inspection-modal-actions' });
            const back = element('button', { className: 'btn', type: 'button', text: state.step === 0 ? 'Annuleren' : 'Terug' });
            back.addEventListener('click', () => {
                if (state.step === 0)
                    close();
                else {
                    state.step -= 1;
                    render('');
                }
            });
            const next = element('button', { className: 'btn btn-done', type: 'button', text: state.step === questionnaire.sections.length - 1 ? 'Opslaan' : 'Volgende' });
            next.disabled = state.saving;
            next.addEventListener('click', async () => {
                const errors = validateSection(section, state);
                if (errors.length) {
                    render(errors[0]);
                    return;
                }
                if (state.step < questionnaire.sections.length - 1) {
                    state.step += 1;
                    render('');
                }
                else {
                    await save();
                }
            });
            footer.append(back, next);
            modal.append(footer);
        }
        render('');
        return { close, collectPayload: () => collectPayload(formType, state) };
    }
    FD.InspectionFormService = {
        QUESTIONNAIRE_VERSION,
        backendFormType,
        collectPayload,
        createState,
        friendlyError,
        getQuestionnaire: (formType) => QUESTIONNAIRES[backendFormType(formType)],
        isFieldVisible,
        closeAll: () => Array.from(activeForms).forEach(close => close()),
        open,
    };
})(window);
