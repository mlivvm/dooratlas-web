(function (global) {
    const FD = global.FD = global.FD || {};
    const config = FD.InspectionFormConfig;
    const questionnaire = config.QUESTIONNAIRES?.onderhoud;
    const statusColumns = ['Ja', 'Nee', 'N.v.t.'];
    const nonGoodResults = new Set([
        'Ja, maar werk nodig (Status: geadviseerd)',
        'Nee, niet spoed (Status: Defecten)',
        'Nee, spoed (Status: Afkeur)',
    ]);
    const otherFieldNames = new Set([
        'door_wie_ingevuld',
        'slot_pc_doorn_maat',
        'beslag_type_greep',
        'beslag_pc_maat',
        'beslag_materiaal',
    ]);
    const fieldByName = {};
    const photoByKind = {};
    const matrixByKey = {};
    (questionnaire?.sections || []).forEach((section) => {
        (section.fields || []).forEach((item) => { fieldByName[item.name] = item; });
        (section.photos || []).forEach((item) => { photoByKind[item.kind] = item; });
        (section.matrices || []).forEach((item) => { matrixByKey[item.key] = item; });
    });
    function hasValue(value) {
        return Array.isArray(value) ? value.length > 0 : value != null && String(value).trim() !== '';
    }
    function slug(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'waarde';
    }
    function isNulBeurt(state) {
        return String(state.fields?.nul_beurt || '') === 'Ja';
    }
    function nulBeurtChoice(state) {
        if (isNulBeurt(state))
            return 'Ja';
        return state.maintenanceNulBeurtChosen ? 'Nee' : '';
    }
    function setNulBeurt(state, value) {
        state.maintenanceNulBeurtChosen = true;
        if (value === 'Ja')
            state.fields.nul_beurt = 'Ja';
        else
            delete state.fields.nul_beurt;
    }
    function statusValue(state) {
        return String(state.fields?.status_deur_voldoende_controle_onderhoud || '');
    }
    function doorType(state) {
        return String(state.fields?.type_deur || '');
    }
    function endResult(state) {
        return String(state.fields?.controle_eindcontrole_werking_deur_goed || '');
    }
    function showDeviation(state) {
        return statusValue(state) === 'Nee' || nonGoodResults.has(endResult(state));
    }
    function step(id, title, options = {}) {
        return { id, title, fields: [], photos: [], ...options };
    }
    function deviationSteps() {
        return [
            step('deviation', 'Afwijking', {
                fields: [
                    'controle_wat_mis', 'controle_welke_materialen_nodig',
                    'controle_oplossing_voeren_werkzaamheden',
                ],
            }),
            step('deviation-photos', "Defectfoto's", {
                photos: [
                    'controle_foto_1_defect', 'controle_foto_2_defect',
                    'controle_foto_3_defect', 'controle_foto_4_defect',
                ],
            }),
        ];
    }
    function regieFields(state) {
        const fields = ['controle_regie_uitgevoerd'];
        if (String(state.fields?.controle_regie_uitgevoerd || '') === 'Ja') {
            fields.push('controle_regie_vandaag_uitgevoerd');
            if (String(state.fields?.controle_regie_vandaag_uitgevoerd || '') === 'Nee') {
                fields.push('controle_regie_uitgevoerd_datum');
            }
        }
        fields.push('controle_interne_opmerking');
        return fields;
    }
    function matrixSteps(type) {
        if (type === 'Deur') {
            const rows = matrixByKey.controle_lijst_deur?.rows || [];
            return [
                step('matrix-deur-1', 'Deurcontrole 1/3', { matrixKey: 'controle_lijst_deur', rows: rows.slice(0, 6) }),
                step('matrix-deur-2', 'Deurcontrole 2/3', { matrixKey: 'controle_lijst_deur', rows: rows.slice(6, 12) }),
                step('matrix-deur-3', 'Deurcontrole 3/3', { matrixKey: 'controle_lijst_deur', rows: rows.slice(12, 16) }),
            ];
        }
        if (type === 'Kluisdeur') {
            return [step('matrix-kluisdeur', 'Kluisdeurcontrole', {
                    matrixKey: 'controle_lijst_kluisdeur',
                    rows: matrixByKey.controle_lijst_kluisdeur?.rows || [],
                })];
        }
        if (type === 'HSD_deur') {
            return [step('matrix-hsd', 'HSD-deurcontrole', {
                    matrixKey: 'controle_lijst_hsd_deur',
                    rows: matrixByKey.controle_lijst_hsd_deur?.rows || [],
                })];
        }
        return [];
    }
    function stepsFor(state) {
        const steps = [step('general', 'Algemeen', {
                fields: [
                    'klant_locatie', 'deur_nummer', 'door_wie_ingevuld',
                    'status_deur_voldoende_controle_onderhoud', 'type_deur',
                ],
                photos: ['foto_deur_1', 'foto_deur_2'],
            })];
        if (isNulBeurt(state)) {
            steps.push(step('slot-1', 'Slot 1/2', {
                fields: [
                    'slot_merk_type', 'slot_mechaniek', 'slot_pc_doorn_maat',
                ],
            }), step('slot-2', 'Slot 2/2', {
                fields: [
                    'slot_antipaniek_zelfvergrendelend', 'slot_anti_flipper',
                    'slot_meerpuntsluiting', 'slot_meerpuntsluiting_kom', 'slot_opmerking',
                ],
                photos: ['slot_foto'],
            }), step('beslag-1', 'Beslag 1/2', {
                fields: [
                    'beslag_type_greep', 'beslag_pc_maat', 'beslag_maat',
                    'beslag_beslagsoort', 'beslag_kerntrekbeslag',
                ],
            }), step('beslag-2', 'Beslag 2/2', {
                fields: [
                    'beslag_skg', 'beslag_type', 'beslag_afwerking',
                    'beslag_materiaal', 'beslag_opmerking',
                ],
                photos: ['beslag_foto'],
            }), step('dranger', 'Dranger', {
                fields: ['dranger_aanwezig'],
                detailFields: ['dranger_type', 'dranger_montage', 'dranger_merk_type_automaat'],
                photos: ['dranger_foto'],
            }));
        }
        if (statusValue(state) === 'Ja') {
            steps.push(...matrixSteps(doorType(state)));
            if (doorType(state)) {
                steps.push(step('control', 'Controle & meerwerk', {
                    fields: [
                        'controle_dranger_verzegeld', 'controle_sticker_geplakt',
                        'controle_meerwerk_gedaan', 'controle_tijd_besteed_meerwerk',
                    ],
                }));
                if (String(state.fields?.controle_meerwerk_gedaan || '') === 'Ja') {
                    steps.push(step('morework', 'Meerwerk', {
                        fields: [
                            'controle_welke_werkzaamheden_waren_meerwerk',
                            'controle_welke_materialen_gebruikt_meerwerk',
                        ],
                    }));
                }
            }
            steps.push(step('end', 'Eindcontrole', { fields: ['controle_eindcontrole_werking_deur_goed'] }));
        }
        else if (statusValue(state) === 'Nee') {
            steps.push(...deviationSteps());
            steps.push(step('regie', 'Regie & interne notitie', {
                fields: regieFields(state),
            }));
            steps.push(step('end', 'Eindcontrole', { fields: ['controle_eindcontrole_werking_deur_goed'] }));
        }
        if (showDeviation(state) && !steps.some(item => item.id === 'deviation')) {
            steps.push(...deviationSteps());
            steps.push(step('regie', 'Regie & interne notitie', {
                fields: regieFields(state),
            }));
        }
        if (statusValue(state))
            steps.push(step('summary', 'Afronding'));
        return steps;
    }
    function previewStepsFor(state) {
        const fields = { ...(state.fields || {}) };
        if (!hasValue(fields.status_deur_voldoende_controle_onderhoud)) {
            fields.status_deur_voldoende_controle_onderhoud = 'Ja';
        }
        if (fields.status_deur_voldoende_controle_onderhoud === 'Ja' && !hasValue(fields.type_deur)) {
            fields.type_deur = 'Deur';
        }
        return stepsFor({ ...state, fields });
    }
    function field(name) {
        return fieldByName[name] || null;
    }
    function photo(kind) {
        return photoByKind[kind] || null;
    }
    function matrix(key) {
        return matrixByKey[key] || null;
    }
    function allowsOther(name) {
        return otherFieldNames.has(name);
    }
    function isOtherValue(name, value) {
        const item = field(name);
        return allowsOther(name) && hasValue(value) && !(item?.options || []).includes(String(value));
    }
    function matrixKey(matrixKey, rowLabel, columnLabel) {
        return `${matrixKey}|${slug(rowLabel)}|${slug(columnLabel)}`;
    }
    function matrixStatus(state, matrixKeyName, rowLabel) {
        return statusColumns.find(column => Boolean(state.matrices?.[matrixKey(matrixKeyName, rowLabel, column)])) || '';
    }
    function setMatrixStatus(state, matrixKeyName, rowLabel, columnLabel) {
        state.matrices = state.matrices || {};
        state.matrixMeta = state.matrixMeta || {};
        statusColumns.forEach(column => { delete state.matrices[matrixKey(matrixKeyName, rowLabel, column)]; });
        if (columnLabel !== 'Nee') {
            (matrix(matrixKeyName)?.columns || [])
                .filter((column) => !statusColumns.includes(column))
                .forEach((column) => { delete state.matrices[matrixKey(matrixKeyName, rowLabel, column)]; });
        }
        if (!columnLabel)
            return;
        const key = matrixKey(matrixKeyName, rowLabel, columnLabel);
        state.matrices[key] = true;
        state.matrixMeta[key] = { rowLabel, columnLabel };
    }
    function matrixActionSelected(state, matrixKeyName, rowLabel, columnLabel) {
        return Boolean(state.matrices?.[matrixKey(matrixKeyName, rowLabel, columnLabel)]);
    }
    function toggleMatrixAction(state, matrixKeyName, rowLabel, columnLabel) {
        const key = matrixKey(matrixKeyName, rowLabel, columnLabel);
        state.matrices = state.matrices || {};
        state.matrixMeta = state.matrixMeta || {};
        state.matrices[key] = !state.matrices[key];
        state.matrixMeta[key] = { rowLabel, columnLabel };
    }
    function maxPhotos(state, kind) {
        const current = state.photos?.[kind] || [];
        return Math.max(0, 1 - current.length);
    }
    function noteFieldsChanged(state) {
        const initial = state.maintenanceInitialNoteFields;
        if (!initial)
            return false;
        return ['controle_interne_opmerking', 'controle_wat_mis']
            .some(name => String(initial[name] || '') !== String(state.fields?.[name] || ''));
    }
    function collectPayload(state) {
        const fields = {};
        Object.entries(state.fields || {}).forEach(([name, value]) => {
            if (!hasValue(value))
                return;
            fields[name] = Array.isArray(value) ? value.slice() : String(value).trim();
        });
        const photos = [];
        const existingPhotoIds = [];
        Object.entries(state.photos || {}).forEach(([kind, values]) => {
            (values || []).forEach((item, index) => {
                if (Number(item?.id || 0) > 0) {
                    existingPhotoIds.push(Number(item.id));
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
        const matrixAnswers = [];
        Object.entries(state.matrices || {}).forEach(([key, value]) => {
            if (!value)
                return;
            const [matrixKeyName, rowKey, columnKey] = key.split('|');
            const meta = state.matrixMeta?.[key] || {};
            matrixAnswers.push({
                matrix_key: matrixKeyName,
                row_key: rowKey,
                row_label: meta.rowLabel || rowKey,
                column_key: columnKey,
                column_label: meta.columnLabel || columnKey,
                value: true,
                sort_order: matrixAnswers.length,
            });
        });
        return {
            form_type: 'onderhoud',
            questionnaire_version: Number(config.QUESTIONNAIRE_VERSION || 1),
            client_uuid: state.clientUuid || null,
            performed_at: state.performedAt || new Date().toISOString(),
            notes: !noteFieldsChanged(state) && hasValue(state.maintenancePreservedNotes)
                ? state.maintenancePreservedNotes
                : fields.controle_interne_opmerking || fields.controle_wat_mis || null,
            fields,
            photos,
            existing_photo_ids: existingPhotoIds,
            matrix_answers: matrixAnswers,
        };
    }
    function validationErrors(stepInfo, state) {
        const errors = [];
        const required = new Set();
        if (stepInfo.id === 'general') {
            ['klant_locatie', 'deur_nummer', 'status_deur_voldoende_controle_onderhoud'].forEach(name => required.add(name));
        }
        if (stepInfo.id === 'end' && statusValue(state) === 'Ja')
            required.add('controle_eindcontrole_werking_deur_goed');
        if (stepInfo.id === 'deviation' && nonGoodResults.has(endResult(state))) {
            required.add('controle_wat_mis');
            required.add('controle_oplossing_voeren_werkzaamheden');
        }
        if (stepInfo.id === 'regie') {
            required.add('controle_regie_uitgevoerd');
            if (String(state.fields?.controle_regie_uitgevoerd || '') === 'Ja') {
                required.add('controle_regie_vandaag_uitgevoerd');
                if (String(state.fields?.controle_regie_vandaag_uitgevoerd || '') === 'Nee') {
                    required.add('controle_regie_uitgevoerd_datum');
                }
            }
        }
        required.forEach(name => {
            if (!hasValue(state.fields?.[name]))
                errors.push(`${field(name)?.label || name} is verplicht.`);
        });
        return errors;
    }
    function applyStatus(state, value, isEditing) {
        state.fields.status_deur_voldoende_controle_onderhoud = value;
        if (value === 'Ja' && !isEditing && !hasValue(state.fields.type_deur))
            state.fields.type_deur = 'Deur';
    }
    FD.MaintenanceFormFlow = {
        allowsOther,
        applyStatus,
        collectPayload,
        doorType,
        endResult,
        field,
        hasValue,
        isNulBeurt,
        isOtherValue,
        matrix,
        matrixActionSelected,
        matrixStatus,
        maxPhotos,
        nonGoodResults,
        nulBeurtChoice,
        photo,
        previewStepsFor,
        regieFields,
        setMatrixStatus,
        setNulBeurt,
        showDeviation,
        statusColumns,
        statusValue,
        stepsFor,
        toggleMatrixAction,
        validationErrors,
    };
})(window);
