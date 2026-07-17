(function (global) {
    const FD = global.FD = global.FD || {};
    const QUESTIONNAIRE_VERSION = 1;
    function field(name, label, type = 'text', options = [], required = false, condition = null) {
        return { name, label, type, options, required, condition };
    }
    function whenValue(fieldName) {
        return { fieldName, op: 'value' };
    }
    function whenEquals(fieldName, value) {
        return { fieldName, op: 'equals', value };
    }
    function whenIncludes(fieldName, value) {
        return { fieldName, op: 'includes', value };
    }
    function whenNotEquals(fieldName, value) {
        return { fieldName, op: 'notEquals', value };
    }
    function photo(kind, label, multiple = false) {
        return { kind, label, multiple };
    }
    function matrix(key, label, rows, columns) {
        return { key, label, rows, columns };
    }
    const yesNo = ['Ja', 'Nee'];
    const OPname = [
        {
            title: 'Opname formulier',
            fields: [
                field('ingevuld_door', 'Ingevuld door', 'text', ['EE', 'EB', 'AT', 'CL'], true),
                field('opname', 'Opname', 'text', ['1e opname', 'detailopname'], true),
                field('opdrachtgever', 'Opdrachtgever'),
                field('klant', 'Klant'),
                field('projectcode', 'Projectcode', 'text', [], true),
                field('pandnaam', 'Pandnaam'),
                field('huisnr', 'Huisnr'),
                field('huisnummer', 'Huisnummer', 'numeric', [], false, whenValue('huisnr')),
                field('type_object_opname', 'Type object opname', 'text', ['Deur', 'Raam / ruit'], true),
                field('plattegrond_aanwezig_qr_code', 'Plattegrond aanwezig met QR-code', 'text', yesNo),
                field('oplossing', 'Oplossing', 'text', ['Mechanisch Sluitplan', 'Elektronisch sluitplan', 'Beveiliging']),
                field('merk_elektronisch', 'Merk elektronisch', 'text', ['Airkey', 'Xesar', 'iLOQ S5', 'iLOQ S50', 'Salto', 'Medeco']),
                field('merk_mechanisch', 'Merk mechanisch', 'text', ['Mauer', 'Wilka**', 'Wilka***', 'EVVA 4KS']),
            ],
        },
        {
            title: 'Deur',
            fields: [
                field('deurcode', 'Deurcode'),
                field('plattegrondcode', 'Plattegrondcode'),
                field('omschrijving_deur', 'Omschrijving deur', 'text', ['Voordeur', 'Achterdeur', 'Appartement', 'Berging', 'Bijkeuken', 'CV ruimte', 'Dak', 'Elektra', 'Fietsenhok', 'Hekwerk', 'Kantoor', 'Lift ruimte', 'Medicijnkast', 'Nooduitgang', 'Opslag', 'Schoonmaak', 'Scoot mobiel ruimte', 'Sleutelkast', 'Strongroom', 'Technische ruimte', 'Tussendeur', 'Tuindeur', 'Vuilnis']),
                field('toevoeging_omschrijving_deur', 'Toevoeging omschrijving deur'),
                field('toegang', 'Toegang', 'text', ['Cilinder enkel', 'Cilinder knop', 'Cilinder dubbel', 'Cilinder hybride', 'Wandlezer', 'Wandlezer 2 - zijdig', 'Hangslot', 'Beslagset elekt.', 'Dummy']),
                field('e_cilinder_binnen', 'E-Cilinder binnen (mm)'),
                field('e_cilinder_buiten', 'E-Cilinder buiten (mm)'),
                field('verlengde_buitenknopas', 'Verlengde buitenknopas', 'text', yesNo),
                field('beschermkap_beslag', 'Beschermkap op beslag', 'text', yesNo),
                field('afwerking_wandlezer_buiten', 'Afwerking - wandlezer buiten', 'text', ['Opbouw', 'Inbouw']),
                field('afwerking_wandlezer_binnen', 'Afwerking - wandlezer binnen', 'text', ['Opbouw', 'Inbouw']),
                field('offline_online', 'Offline / online', 'text', ['Offline', 'Online']),
                field('wifi_versterker_nodig', 'WIFI versterker nodig', 'text', ['Ja']),
                field('regenkap', 'Regenkap', 'text', ['Ja']),
                field('mechanische_cilinder_toevoegen', 'Mechanische cilinder toevoegen', 'text', yesNo),
                field('aansturing_wandlezer', 'Aansturing wandlezer', 'text', ['Slot', 'Elek. sluitplaat', 'Deurautomaat']),
                field('230v_aanwezig', '230V aanwezig', 'text', yesNo),
                field('opmerking', 'Opmerking', 'textarea'),
            ],
            photos: [
                photo('qr_code_lezer_deurcode', 'QR Code lezer voor deurcode'),
                photo('qr_code_plattegrond', 'QR Code plattegrond'),
                photo('foto_deur_1', 'Foto deur 1'),
                photo('foto_deur_2', 'Foto deur 2'),
                photo('foto_deur_3', 'Foto deur 3'),
                photo('foto_deur_4', 'Foto deur 4'),
                photo('upload_hier_alle_vooraf_genomen_foto_s', "Upload hier alle vooraf genomen foto's", true),
            ],
        },
        {
            title: 'Cilinder en slot',
            fields: [
                field('merk_cilinder', 'Merk cilinder', 'text', ['Mauer', 'Wilka**', 'Wilka***', 'EVVA 4KS']),
                field('type_cilinder', 'Type cilinder', 'text', ['Enkel', 'Dubbel', 'Knop']),
                field('cilinder_binnen', 'Cilinder binnen (mm)', 'numeric'),
                field('cilinder_buiten', 'Cilinder buiten (mm)', 'numeric'),
                field('vrijloopfunctie', 'Vrijloopfunctie', 'text', yesNo),
                field('opmerking_cilinder', 'Opmerking - cilinder', 'textarea'),
                field('overig_toevoegen', 'Overig toevoegen', 'text_array', ['Slot', 'Beslag', 'Deurdranger', 'Sluitplaat/kleefmagneet']),
                field('sluitplaat_kleefmagneet_toevoegen', 'Sluitplaat of kleefmagneet toevoegen', 'text', ['Sluitplaat', 'Kleefmagneet']),
                field('merk_type_slot', 'Merk / type slot'),
                field('mechaniek_slot', 'Mechaniek slot', 'text', ['Mechanisch', 'Spoel', 'Motor']),
                field('pc_maat_slot', 'PC maat - slot', 'text', ['PC55', 'PC72', 'PC92'], false, whenIncludes('overig_toevoegen', 'Slot')),
                field('pc_doorn_maat_slot', 'PC/doorn maat - slot', 'text', ['PC55/D50', 'PC55/D55', 'PC55/D60', 'PC72/D30', 'PC72/D50', 'PC72/D55', 'PC72/D60', 'PC92/D30', 'PC92/D50', 'PC92/D55', 'PC92/D60']),
                field('antipaniek', 'Antipaniek', 'text', ['Ja']),
                field('zelfvergrendelend', 'zelfvergrendelend', 'text', ['Ja']),
                field('anti_flipper', 'Anti flipper', 'text', ['Ja']),
                field('meerpuntsluiting', 'Meerpuntsluiting', 'text', ['Ja']),
                field('meerpuntsluiting_kom', 'Meerpuntsluiting kom', 'text', ['Opbouw', 'Inbouw']),
                field('breedte_voorplaat', 'Breedte voorplaat', 'numeric'),
                field('lengte_voorplaat', 'Lengte voorplaat', 'numeric'),
                field('spanningsloos_optie', 'Spanningsloos optie', 'text', ['spl-vergrendeld', 'spl-ontgrendeld', 'spl-n.v.t.']),
                field('sluitkom', 'Sluitkom', 'text', ['Sluitkom', 'Sluitplaat', 'Geen']),
                field('type_schoot', 'Type schoot', 'text', ['Dagschoot', 'Bijzetslot', 'Dag/nachtslot', 'Motor', 'Valschoot-haakslot']),
                field('opmerking_slot', 'Opmerking - slot', 'textarea'),
            ],
            photos: [photo('foto_slot', 'Foto slot')],
        },
        {
            title: 'Beslag en dranger',
            fields: [
                field('type_greep', 'Type greep', 'text', ['Kruk/kruk', 'Greep/kruk', 'Blind/kruk', 'Elektronisch']),
                field('pc_maat_beslag', 'PC maat - beslag', 'text', ['PC55', 'PC72', 'PC92']),
                field('maat', 'Maat', 'text', ['Breed', 'Smal']),
                field('beslagsoort', 'Beslagsoort', 'text', ['Veiligheidsbeslag', 'Binnendeurbeslag']),
                field('kerntrekbeslag', 'Kerntrekbeslag', 'text', yesNo),
                field('skg', 'SKG', 'text', ['SKG**', 'SKG***', 'Geen']),
                field('type_beslag', 'Type beslag', 'text', ['Lang Schild', 'Rozet']),
                field('afwerking', 'Afwerking', 'text', ['Afgerond', 'Rechthoekig']),
                field('materiaal', 'Materiaal', 'text', ['Aluminium F1', 'RVS', 'Messing']),
                field('opmerking_beslag', 'Opmerking - beslag', 'textarea'),
                field('dranger_aanwezig', 'Dranger aanwezig', 'text', yesNo),
                field('type_dranger', 'Type dranger', 'text', ['Mechanisch', 'Automaat']),
                field('montage_dranger', 'Montage dranger', 'text', ['Deur', 'Kozijn']),
                field('merk_type_dranger', 'Merk/type dranger'),
            ],
            photos: [photo('foto_beslag', 'Foto beslag'), photo('foto_dranger_1', 'Foto dranger 1')],
        },
        {
            title: 'Raam, ruit en project',
            fields: [
                field('enkel_dubbel', 'Enkel/dubbel', 'text', ['Enkel', 'Dubbel']),
                field('raam_hoogte', 'Raam hoogte'),
                field('raam_breedte', 'Raam breedte'),
                field('raam_dikte', 'Raam dikte'),
                field('raam_inbouw_diepte', 'Raam inbouw diepte'),
                field('draairichting_raam', 'Draairichting raam', 'text', ['Din links', 'Din rechts']),
                field('kruk_midden', 'Kruk in midden', 'text', yesNo),
                field('sluitkomen_verspringen', 'Sluitkomen verspringen', 'text', yesNo),
                field('dievenklauwen', 'Dievenklauwen', 'text', yesNo),
                field('soort_kruk', 'Soort kruk'),
                field('axa_30_12_raam_bijzetslot_kleur', 'Axa 30/12 raam bijzetslot kleur', 'text', ['Wit', 'Grijs', 'Bruin', 'n.v.t.']),
                field('opmerking_raam', 'Opmerking raam', 'textarea'),
                field('opmerking_ruit', 'Opmerking ruit', 'textarea'),
                field('aantal_identieke_deuren', 'Aantal identieke deuren', 'numeric'),
                field('opmerking_project', 'Opmerking project', 'textarea'),
            ],
            photos: [photo('foto_raam', 'Foto raam'), photo('ruit_hoogte_x_breedte', 'Ruit hoogte (mm) x breedte (mm)'), photo('link', 'LINK')],
        },
    ];
    const maintenanceColumns = ['Ja', 'Nee', 'N.v.t.', 'Gesmeerd / afgesteld', 'Probleem ter plekke opgelost', 'Component vervangen', 'vervanging geadviseerd'];
    const QUESTIONNAIRES = {
        opname: { title: 'Opname', sections: OPname },
        onderhoud: {
            title: 'Onderhoud',
            sections: [
                {
                    title: 'Onderhoudsformulier',
                    fields: [
                        field('klant_locatie', 'Klant - Locatie', 'text', [], true),
                        field('nul_beurt', 'Nul beurt', 'text', ['Ja']),
                        field('deur_nummer', 'Deur nummer', 'text', [], true),
                        field('door_wie_ingevuld', 'Door wie ingevuld', 'text', ['AT', 'EB']),
                        field('status_deur_voldoende_controle_onderhoud', 'Status van de deur voldoende om controle en onderhoud uit te voeren?', 'text', yesNo, true),
                        field('type_deur', 'Type deur', 'text', ['Deur', 'Kluisdeur', 'HSD_deur'], false, whenEquals('status_deur_voldoende_controle_onderhoud', 'Ja')),
                    ],
                    photos: [photo('foto_deur_1', 'Foto deur 1'), photo('foto_deur_2', 'Foto deur 2')],
                },
                {
                    title: 'Slot, beslag en dranger',
                    fields: [
                        field('slot_merk_type', 'Merk/type slot'),
                        field('slot_mechaniek', 'Mechaniek slot', 'text', ['Mechanisch', 'Spoel', 'Motor']),
                        field('slot_pc_doorn_maat', 'PC/doorn maat - slot', 'text', ['PC55/D50', 'PC55/D55', 'PC55/D60', 'PC72/D50', 'PC72/D55', 'PC72/D60', 'PC92/D50', 'PC92/D55', 'PC92/D60']),
                        field('slot_antipaniek_zelfvergrendelend', 'Antipaniek/zelfvergrendelend', 'text', ['Ja']),
                        field('slot_anti_flipper', 'Anti flipper', 'text', ['Ja']),
                        field('slot_meerpuntsluiting', 'Meerpuntsluiting', 'text', ['Ja']),
                        field('slot_meerpuntsluiting_kom', 'Meerpuntsluiting kom', 'text', ['Opbouw', 'Inbouw']),
                        field('slot_opmerking', 'Opmerking Slot', 'textarea'),
                        field('beslag_type_greep', 'Type greep', 'text', ['Kruk/kruk', 'Greep/kruk', 'Elektronisch']),
                        field('beslag_pc_maat', 'PC maat - beslag', 'text', ['PC55', 'PC72', 'PC92']),
                        field('beslag_maat', 'Maat', 'text', ['Breed', 'Smal']),
                        field('beslag_beslagsoort', 'Beslagsoort', 'text', ['Veiligheidsbeslag', 'Binnendeurbeslag']),
                        field('beslag_kerntrekbeslag', 'Kerntrekbeslag', 'text', yesNo),
                        field('beslag_skg', 'SKG', 'text', ['SKG**', 'SKG***', 'Geen']),
                        field('beslag_type', 'Type beslag', 'text', ['Lang Schild', 'Rozet']),
                        field('beslag_afwerking', 'Afwerking', 'text', ['Afgerond', 'Rechthoekig']),
                        field('beslag_materiaal', 'Materiaal', 'text', ['Aluminium F1', 'RVS', 'Messing']),
                        field('beslag_opmerking', 'Opmerking - beslag', 'textarea'),
                        field('dranger_aanwezig', 'Dranger aanwezig', 'text', yesNo),
                        field('dranger_type', 'Type', 'text', ['Mechanisch', 'Automaat']),
                        field('dranger_montage', 'Montage', 'text', ['Deur', 'Kozijn']),
                        field('dranger_merk_type_automaat', 'Merk/type Dranger-Automaat'),
                    ],
                    photos: [photo('slot_foto', 'Foto slot'), photo('beslag_foto', 'Foto beslag'), photo('dranger_foto', 'Foto dranger')],
                },
                {
                    title: 'Controle lijst',
                    fields: [
                        field('controle_dranger_verzegeld', 'Dranger verzegeld?', 'text', ['Ja', 'Nee', 'nvt']),
                        field('controle_sticker_geplakt', 'Sticker geplakt?', 'text', yesNo),
                        field('controle_meerwerk_gedaan', 'Meerwerk gedaan?', 'text', yesNo),
                        field('controle_tijd_besteed_meerwerk', 'Tijd besteed aan meerwerk?'),
                        field('controle_welke_werkzaamheden_waren_meerwerk', 'Welke werkzaamheden waren meerwerk?', 'textarea'),
                        field('controle_welke_materialen_gebruikt_meerwerk', 'Welke materialen heb je gebruikt in het meerwerk?', 'textarea'),
                        field('controle_eindcontrole_werking_deur_goed', 'Eindcontrole: werking deur goed?', 'text', ['Ja (Status: Goed)', 'Ja, maar werk nodig (Status: geadviseerd)', 'Nee, niet spoed (Status: Defecten)', 'Nee, spoed (Status: Afkeur)']),
                        field('controle_wat_mis', 'Wat is er mis?', 'textarea', [], false, whenNotEquals('controle_eindcontrole_werking_deur_goed', 'Ja (Status: Goed)')),
                        field('controle_welke_materialen_nodig', 'Welke materialen zijn er nodig?', 'textarea', [], false, whenNotEquals('controle_eindcontrole_werking_deur_goed', 'Ja (Status: Goed)')),
                        field('controle_oplossing_voeren_werkzaamheden', 'Oplossing uit te voeren werkzaamheden', 'textarea', [], false, whenNotEquals('controle_eindcontrole_werking_deur_goed', 'Ja (Status: Goed)')),
                        field('controle_regie_uitgevoerd', 'Regie uitgevoerd?', 'text', yesNo),
                        field('controle_regie_vandaag_uitgevoerd', 'Regie vandaag uitgevoerd?', 'text', yesNo),
                        field('controle_regie_uitgevoerd_datum', 'Regie uitgevoerd datum', 'date'),
                        field('controle_interne_opmerking', 'Interne opmerking', 'textarea'),
                    ],
                    photos: [
                        photo('controle_foto_1_defect', 'Foto 1 - defect'),
                        photo('controle_foto_2_defect', 'Foto 2 - defect'),
                        photo('controle_foto_3_defect', 'Foto 3 - defect'),
                        photo('controle_foto_4_defect', 'Foto 4 - defect'),
                    ],
                    matrices: [
                        matrix('controle_lijst_deur', 'Controle lijst (Deur)', ['Sluiting van deur goed', 'Beslag in goede staat', 'Slot in goede staat', 'Sluitkom in goede staat', 'Goede werking cilinder', 'Schanieren in goede staat', 'Dranger heel / goed bevestigd en goed afgesteld', 'Goede werking ap slot / paniekbalk', 'Tochstrippen/rubber heel / goed bevestigd', 'Brandvertragende band in goede staat', 'Vloerpot heel / goed bevestigd', 'Algehele elektro technische staat', 'Elektronische componenten in goede staat', 'Beschermende maatregelen voor elektronische componenten nodig', 'Batterij vervangen in cilinder of beslag', 'Firmware update uitgevoerd'], maintenanceColumns),
                        matrix('controle_lijst_kluisdeur', 'Controle lijst (Kluisdeur)', ['Sluiting van deur goed', 'Codeslot in goede staat', 'Sleutelslot in goede staat', 'Regelwerk in goede staat', 'Schanieren in goede staat'], ['Ja', 'Nee', 'N.v.t.', 'Gesmeerd / afgesteld', 'Probleem terplekke opgelost']),
                        matrix('controle_lijst_hsd_deur', 'Controle lijst (HSD deur)', ['Sluiting van deur goed', 'Goede werking noodsleutel', 'Goede werking regelwerk', 'Scharnieren goed bevestigd', 'Dranger heel / goed bevestigd (HSD deur)', 'Algehele elektro technische staat'], ['Ja', 'Nee', 'N.v.t.', 'Gesmeerd / afgesteld']),
                    ],
                },
            ],
        },
    };
    function backendFormType(formType) {
        return String(formType || '') === 'inspection' ? 'opname' : 'onderhoud';
    }
    FD.InspectionFormConfig = {
        QUESTIONNAIRE_VERSION,
        QUESTIONNAIRES,
        backendFormType,
    };
})(window);
