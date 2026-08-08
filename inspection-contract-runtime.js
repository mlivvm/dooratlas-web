(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // shared/inspection-contract/v2.json
  var v2_default = {
    schemaVersion: 1,
    questionnaireVersion: 3,
    forms: {
      opname: {
        title: "Opname",
        payloadPolicy: "all-defined",
        routePreview: {
          fields: {
            type_object_opname: "Deur",
            overig_toevoegen: ["Slot"]
          },
          when: {
            op: "all",
            items: [
              { op: "context", key: "isEdit", equals: false },
              { op: "context", key: "stepId", equals: "general" },
              { op: "not", item: { op: "eq", field: "type_object_opname", value: "Raam / ruit" } }
            ]
          }
        },
        sections: [
          {
            title: "Opname formulier",
            fields: [
              {
                name: "ingevuld_door",
                label: "Ingevuld door",
                type: "text",
                options: [
                  "EE",
                  "EB",
                  "AT",
                  "CL"
                ],
                required: true
              },
              {
                name: "opname",
                label: "Opname",
                type: "text",
                options: [
                  "1e opname",
                  "detailopname"
                ],
                required: true,
                helpText: "Deze keuze wordt opgeslagen; Type object bepaalt de vragenroute."
              },
              {
                name: "opdrachtgever",
                label: "Opdrachtgever",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "klant",
                label: "Klant",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "projectcode",
                label: "Projectcode",
                type: "text",
                options: [],
                required: true
              },
              {
                name: "pandnaam",
                label: "Pandnaam",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "huisnummer",
                label: "Huisnummer",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "type_object_opname",
                label: "Type object opname",
                type: "text",
                options: [
                  "Deur",
                  "Raam / ruit"
                ],
                required: true
              },
              {
                name: "plattegrond_aanwezig_qr_code",
                label: "Plattegrond aanwezig met QR-code",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "oplossing",
                label: "Oplossing",
                type: "text",
                options: [
                  "Mechanisch Sluitplan",
                  "Elektronisch sluitplan",
                  "Beveiliging"
                ],
                required: false
              },
              {
                name: "merk_elektronisch",
                label: "Merk elektronisch",
                type: "text",
                options: [
                  "Airkey",
                  "Xesar",
                  "iLOQ S5",
                  "iLOQ S50",
                  "Salto",
                  "Medeco"
                ],
                required: false
              },
              {
                name: "merk_mechanisch",
                label: "Merk mechanisch",
                type: "text",
                options: [
                  "Mauer",
                  "Wilka**",
                  "Wilka***",
                  "EVVA 4KS"
                ],
                required: false
              }
            ]
          },
          {
            title: "Deur",
            fields: [
              {
                name: "deurcode",
                label: "Deurcode",
                type: "text",
                options: [],
                required: false,
                readOnlyOnCreate: true
              },
              {
                name: "omschrijving_deur",
                label: "Omschrijving deur",
                type: "text",
                options: [
                  "Voordeur",
                  "Achterdeur",
                  "Appartement",
                  "Berging",
                  "Bijkeuken",
                  "CV ruimte",
                  "Dak",
                  "Elektra",
                  "Fietsenhok",
                  "Hekwerk",
                  "Kantoor",
                  "Lift ruimte",
                  "Medicijnkast",
                  "Nooduitgang",
                  "Opslag",
                  "Schoonmaak",
                  "Scoot mobiel ruimte",
                  "Sleutelkast",
                  "Strongroom",
                  "Technische ruimte",
                  "Tussendeur",
                  "Tuindeur",
                  "Vuilnis"
                ],
                required: false
              },
              {
                name: "toevoeging_omschrijving_deur",
                label: "Toevoeging omschrijving deur",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "toegang",
                label: "Toegang",
                type: "text",
                options: [
                  "Cilinder enkel",
                  "Cilinder knop",
                  "Cilinder dubbel",
                  "Cilinder hybride",
                  "Wandlezer",
                  "Wandlezer 2 - zijdig",
                  "Hangslot",
                  "Beslagset elekt.",
                  "Dummy"
                ],
                required: false
              },
              {
                name: "e_cilinder_binnen",
                label: "E-Cilinder binnen (mm)",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "e_cilinder_buiten",
                label: "E-Cilinder buiten (mm)",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "verlengde_buitenknopas",
                label: "Verlengde buitenknopas",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "beschermkap_beslag",
                label: "Beschermkap op beslag",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "afwerking_wandlezer_buiten",
                label: "Afwerking - wandlezer buiten",
                type: "text",
                options: [
                  "Opbouw",
                  "Inbouw"
                ],
                required: false
              },
              {
                name: "afwerking_wandlezer_binnen",
                label: "Afwerking - wandlezer binnen",
                type: "text",
                options: [
                  "Opbouw",
                  "Inbouw"
                ],
                required: false
              },
              {
                name: "offline_online",
                label: "Offline / online",
                type: "text",
                options: [
                  "Offline",
                  "Online"
                ],
                required: false
              },
              {
                name: "wifi_versterker_nodig",
                label: "WIFI versterker nodig",
                type: "text",
                options: [
                  "Ja"
                ],
                required: false
              },
              {
                name: "regenkap",
                label: "Regenkap",
                type: "text",
                options: [
                  "Ja"
                ],
                required: false
              },
              {
                name: "mechanische_cilinder_toevoegen",
                label: "Mechanische cilinder toevoegen",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "aansturing_wandlezer",
                label: "Aansturing wandlezer",
                type: "text",
                options: [
                  "Slot",
                  "Elek. sluitplaat",
                  "Deurautomaat"
                ],
                required: false
              },
              {
                name: "230v_aanwezig",
                label: "230V aanwezig",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "opmerking",
                label: "Opmerking",
                type: "textarea",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "qr_code_lezer_deurcode",
                label: "QR Code lezer voor deurcode",
                maxFiles: 1
              },
              {
                kind: "qr_code_plattegrond",
                label: "QR Code plattegrond",
                maxFiles: 1
              },
              {
                kind: "foto_deur_1",
                label: "Foto deur 1",
                maxFiles: 1
              },
              {
                kind: "foto_deur_2",
                label: "Foto deur 2",
                maxFiles: 1
              },
              {
                kind: "foto_deur_3",
                label: "Foto deur 3",
                maxFiles: 1
              },
              {
                kind: "foto_deur_4",
                label: "Foto deur 4",
                maxFiles: 1
              },
              {
                kind: "upload_hier_alle_vooraf_genomen_foto_s",
                label: "Upload hier alle vooraf genomen foto's",
                maxFiles: 10
              }
            ]
          },
          {
            title: "Cilinder en slot",
            fields: [
              {
                name: "merk_cilinder",
                label: "Merk cilinder",
                type: "text",
                options: [
                  "Mauer",
                  "Wilka**",
                  "Wilka***",
                  "EVVA 4KS"
                ],
                required: false
              },
              {
                name: "type_cilinder",
                label: "Type cilinder",
                type: "text",
                options: [
                  "Enkel",
                  "Dubbel",
                  "Knop"
                ],
                required: false
              },
              {
                name: "cilinder_binnen",
                label: "Cilinder binnen (mm)",
                type: "numeric",
                options: [],
                required: false
              },
              {
                name: "cilinder_buiten",
                label: "Cilinder buiten (mm)",
                type: "numeric",
                options: [],
                required: false
              },
              {
                name: "vrijloopfunctie",
                label: "Vrijloopfunctie",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "opmerking_cilinder",
                label: "Opmerking - cilinder",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "overig_toevoegen",
                label: "Overig toevoegen",
                type: "text_array",
                options: [
                  "Slot",
                  "Beslag",
                  "Deurdranger",
                  "Sluitplaat/kleefmagneet"
                ],
                required: false
              },
              {
                name: "sluitplaat_kleefmagneet_toevoegen",
                label: "Sluitplaat of kleefmagneet toevoegen",
                type: "text",
                options: [
                  "Sluitplaat",
                  "Kleefmagneet"
                ],
                required: false
              },
              {
                name: "merk_type_slot",
                label: "Merk / type slot",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "mechaniek_slot",
                label: "Mechaniek slot",
                type: "text",
                options: [
                  "Mechanisch",
                  "Spoel",
                  "Motor"
                ],
                required: false
              },
              {
                name: "pc_doorn_maat_slot",
                label: "PC/doorn maat - slot",
                type: "text",
                options: [
                  "PC55/D50",
                  "PC55/D55",
                  "PC55/D60",
                  "PC72/D30",
                  "PC72/D50",
                  "PC72/D55",
                  "PC72/D60",
                  "PC92/D30",
                  "PC92/D50",
                  "PC92/D55",
                  "PC92/D60"
                ],
                required: false
              },
              {
                name: "antipaniek",
                label: "Antipaniek",
                type: "text",
                options: [
                  "Ja"
                ],
                required: false
              },
              {
                name: "zelfvergrendelend",
                label: "zelfvergrendelend",
                type: "text",
                options: [
                  "Ja"
                ],
                required: false
              },
              {
                name: "anti_flipper",
                label: "Anti flipper",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "meerpuntsluiting",
                label: "Meerpuntsluiting",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "meerpuntsluiting_kom",
                label: "Meerpuntsluiting kom",
                type: "text",
                options: [
                  "Opbouw",
                  "Inbouw"
                ],
                required: false
              },
              {
                name: "breedte_voorplaat",
                label: "Breedte voorplaat",
                type: "numeric",
                options: [],
                required: false
              },
              {
                name: "lengte_voorplaat",
                label: "Lengte voorplaat",
                type: "numeric",
                options: [],
                required: false
              },
              {
                name: "spanningsloos_optie",
                label: "Spanningsloos optie",
                type: "text",
                options: [
                  "spl-vergrendeld",
                  "spl-ontgrendeld",
                  "spl-n.v.t."
                ],
                required: false
              },
              {
                name: "sluitkom",
                label: "Sluitkom",
                type: "text",
                options: [
                  "Sluitkom",
                  "Sluitplaat",
                  "Geen"
                ],
                required: false
              },
              {
                name: "type_schoot",
                label: "Type schoot",
                type: "text",
                options: [
                  "Dagschoot",
                  "Bijzetslot",
                  "Dag/nachtslot",
                  "Motor",
                  "Valschoot-haakslot"
                ],
                required: false
              },
              {
                name: "opmerking_slot",
                label: "Opmerking - slot",
                type: "textarea",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "foto_slot",
                label: "Foto slot",
                maxFiles: 1
              }
            ]
          },
          {
            title: "Beslag en dranger",
            fields: [
              {
                name: "type_greep",
                label: "Type greep",
                type: "text",
                options: [
                  "Kruk/kruk",
                  "Greep/kruk",
                  "Blind/kruk",
                  "Elektronisch"
                ],
                required: false
              },
              {
                name: "pc_maat_beslag",
                label: "PC maat - beslag",
                type: "text",
                options: [
                  "PC55",
                  "PC72",
                  "PC92"
                ],
                required: false
              },
              {
                name: "maat",
                label: "Maat",
                type: "text",
                options: [
                  "Breed",
                  "Smal"
                ],
                required: false
              },
              {
                name: "beslagsoort",
                label: "Beslagsoort",
                type: "text",
                options: [
                  "Veiligheidsbeslag",
                  "Binnendeurbeslag"
                ],
                required: false
              },
              {
                name: "kerntrekbeslag",
                label: "Kerntrekbeslag",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "skg",
                label: "SKG",
                type: "text",
                options: [
                  "SKG**",
                  "SKG***",
                  "Geen"
                ],
                required: false
              },
              {
                name: "type_beslag",
                label: "Type beslag",
                type: "text",
                options: [
                  "Lang Schild",
                  "Rozet"
                ],
                required: false
              },
              {
                name: "afwerking",
                label: "Afwerking",
                type: "text",
                options: [
                  "Afgerond",
                  "Rechthoekig"
                ],
                required: false
              },
              {
                name: "materiaal",
                label: "Materiaal",
                type: "text",
                options: [
                  "Aluminium F1",
                  "RVS",
                  "Messing"
                ],
                required: false
              },
              {
                name: "opmerking_beslag",
                label: "Opmerking - beslag",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "dranger_aanwezig",
                label: "Dranger aanwezig",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "type_dranger",
                label: "Type dranger",
                type: "text",
                options: [
                  "Mechanisch",
                  "Automaat"
                ],
                required: false
              },
              {
                name: "montage_dranger",
                label: "Montage dranger",
                type: "text",
                options: [
                  "Deur",
                  "Kozijn"
                ],
                required: false
              },
              {
                name: "merk_type_dranger",
                label: "Merk/type dranger",
                type: "text",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "foto_beslag",
                label: "Foto beslag",
                maxFiles: 1
              },
              {
                kind: "foto_dranger_1",
                label: "Foto dranger 1",
                maxFiles: 1
              }
            ]
          },
          {
            title: "Raam, ruit en project",
            fields: [
              {
                name: "enkel_dubbel",
                label: "Enkel/dubbel",
                type: "text",
                options: [
                  "Enkel",
                  "Dubbel"
                ],
                required: false
              },
              {
                name: "raam_hoogte",
                label: "Raam hoogte",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "raam_breedte",
                label: "Raam breedte",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "raam_dikte",
                label: "Raam dikte",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "raam_inbouw_diepte",
                label: "Raam inbouw diepte",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "draairichting_raam",
                label: "Draairichting raam",
                type: "text",
                options: [
                  "Din links",
                  "Din rechts"
                ],
                required: false
              },
              {
                name: "kruk_midden",
                label: "Kruk in midden",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "sluitkomen_verspringen",
                label: "Sluitkomen verspringen",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "dievenklauwen",
                label: "Dievenklauwen",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "soort_kruk",
                label: "Soort kruk",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "axa_30_12_raam_bijzetslot_kleur",
                label: "Axa 30/12 raam bijzetslot kleur",
                type: "text",
                options: [
                  "Wit",
                  "Grijs",
                  "Bruin",
                  "n.v.t."
                ],
                required: false
              },
              {
                name: "opmerking_raam",
                label: "Opmerking raam",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "opmerking_ruit",
                label: "Opmerking ruit",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "aantal_identieke_deuren",
                label: "Aantal identieke deuren",
                type: "numeric",
                options: [],
                required: false
              },
              {
                name: "opmerking_project",
                label: "Opmerking project",
                type: "textarea",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "foto_raam",
                label: "Foto raam",
                maxFiles: 1
              },
              {
                kind: "ruit_hoogte_x_breedte",
                label: "Ruit hoogte (mm) x breedte (mm)",
                maxFiles: 1
              }
            ]
          }
        ],
        routes: [
          {
            id: "general",
            title: "Algemeen",
            sections: [
              {
                title: "Opnamegegevens",
                fields: [
                  "ingevuld_door",
                  "opname",
                  "projectcode",
                  "type_object_opname"
                ],
                photos: []
              },
              {
                title: "Deur",
                fields: [
                  {
                    name: "deurcode",
                    when: { op: "eq", field: "type_object_opname", value: "Deur" }
                  },
                  {
                    name: "omschrijving_deur",
                    when: { op: "eq", field: "type_object_opname", value: "Deur" }
                  },
                  {
                    name: "toevoeging_omschrijving_deur",
                    when: { op: "eq", field: "type_object_opname", value: "Deur" }
                  },
                  {
                    name: "plattegrond_aanwezig_qr_code",
                    when: { op: "eq", field: "type_object_opname", value: "Deur" }
                  }
                ],
                photos: []
              },
              {
                title: "Klant & locatie",
                fields: [
                  "opdrachtgever",
                  "klant",
                  "pandnaam",
                  "huisnummer"
                ],
                photos: [],
                context: "floorplan"
              }
            ]
          },
          {
            id: "solution",
            title: "Sluitplan & onderdelen",
            sections: [
              {
                title: "Oplossing",
                fields: [
                  "oplossing"
                ],
                photos: [],
                layout: "solution-options"
              },
              {
                title: "Vervolg",
                fields: [
                  {
                    name: "toegang",
                    when: {
                      op: "any",
                      items: [
                        {
                          op: "eq",
                          field: "oplossing",
                          value: "Elektronisch sluitplan"
                        },
                        {
                          op: "eq",
                          field: "oplossing",
                          value: "Beveiliging"
                        }
                      ]
                    }
                  },
                  {
                    name: "merk_elektronisch",
                    when: {
                      op: "eq",
                      field: "oplossing",
                      value: "Elektronisch sluitplan"
                    }
                  },
                  {
                    name: "merk_mechanisch",
                    when: {
                      op: "eq",
                      field: "oplossing",
                      value: "Mechanisch Sluitplan"
                    }
                  },
                  {
                    name: "e_cilinder_binnen",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "prefix",
                          field: "toegang",
                          value: "Cilinder "
                        }
                      ]
                    }
                  },
                  {
                    name: "e_cilinder_buiten",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "prefix",
                          field: "toegang",
                          value: "Cilinder "
                        }
                      ]
                    }
                  },
                  {
                    name: "verlengde_buitenknopas",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "prefix",
                          field: "toegang",
                          value: "Cilinder "
                        }
                      ]
                    }
                  },
                  {
                    name: "beschermkap_beslag",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "prefix",
                          field: "toegang",
                          value: "Cilinder "
                        }
                      ]
                    }
                  },
                  {
                    name: "afwerking_wandlezer_buiten",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    name: "afwerking_wandlezer_binnen",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "all",
                          items: [
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Elektronisch sluitplan"
                                },
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Beveiliging"
                                }
                              ]
                            },
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer"
                                },
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer 2 - zijdig"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          op: "eq",
                          field: "toegang",
                          value: "Wandlezer 2 - zijdig"
                        }
                      ]
                    }
                  },
                  {
                    name: "offline_online",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    name: "wifi_versterker_nodig",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "all",
                          items: [
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Elektronisch sluitplan"
                                },
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Beveiliging"
                                }
                              ]
                            },
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer"
                                },
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer 2 - zijdig"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          op: "eq",
                          field: "offline_online",
                          value: "Online"
                        }
                      ]
                    }
                  },
                  {
                    name: "regenkap",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    name: "mechanische_cilinder_toevoegen",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    name: "aansturing_wandlezer",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    name: "230v_aanwezig",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer"
                            },
                            {
                              op: "eq",
                              field: "toegang",
                              value: "Wandlezer 2 - zijdig"
                            }
                          ]
                        }
                      ]
                    }
                  }
                ],
                photos: [],
                layout: "solution-details",
                emptyCopy: "Kies een oplossing om de bijbehorende vervolgvelden te tonen."
              },
              {
                title: "Aanvullende onderdelen",
                fields: [
                  "overig_toevoegen"
                ],
                photos: [],
                layout: "solution-parts"
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Deur"
            }
          },
          {
            id: "cylinder",
            title: "Cilinder",
            sections: [
              {
                title: "Cilinder",
                fields: [
                  "merk_cilinder",
                  "type_cilinder",
                  "cilinder_binnen",
                  "cilinder_buiten",
                  "vrijloopfunctie",
                  "opmerking_cilinder"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Mechanisch Sluitplan"
                    },
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "all",
                      items: [
                        {
                          op: "all",
                          items: [
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Elektronisch sluitplan"
                                },
                                {
                                  op: "eq",
                                  field: "oplossing",
                                  value: "Beveiliging"
                                }
                              ]
                            },
                            {
                              op: "any",
                              items: [
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer"
                                },
                                {
                                  op: "eq",
                                  field: "toegang",
                                  value: "Wandlezer 2 - zijdig"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          op: "eq",
                          field: "mechanische_cilinder_toevoegen",
                          value: "Ja"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "lock-base",
            title: "Slot 1/2",
            sections: [
              {
                title: "Slot",
                fields: [
                  "merk_type_slot",
                  "mechaniek_slot",
                  "pc_doorn_maat_slot",
                  "antipaniek",
                  "zelfvergrendelend"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Slot"
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "lock-details",
            title: "Slot 2/2",
            sections: [
              {
                title: "Slotdetails",
                fields: [
                  "anti_flipper",
                  "meerpuntsluiting",
                  "meerpuntsluiting_kom",
                  "breedte_voorplaat",
                  "lengte_voorplaat",
                  "spanningsloos_optie",
                  "sluitkom",
                  "type_schoot"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Slot"
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "lock-note",
            title: "Slotfoto & opmerking",
            sections: [
              {
                title: "Afronding slot",
                fields: [
                  "opmerking_slot"
                ],
                photos: [
                  "foto_slot"
                ]
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Slot"
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "hardware-base",
            title: "Beslag 1/2",
            sections: [
              {
                title: "Beslag",
                fields: [
                  "type_greep",
                  "pc_maat_beslag",
                  "maat",
                  "beslagsoort",
                  "kerntrekbeslag"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Beslag"
                    },
                    {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "eq",
                          field: "toegang",
                          value: "Beslagset elekt."
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "hardware-finish",
            title: "Beslag 2/2",
            sections: [
              {
                title: "Afwerking beslag",
                fields: [
                  "skg",
                  "type_beslag",
                  "afwerking",
                  "materiaal",
                  "opmerking_beslag"
                ],
                photos: [
                  "foto_beslag"
                ]
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Beslag"
                    },
                    {
                      op: "all",
                      items: [
                        {
                          op: "any",
                          items: [
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Elektronisch sluitplan"
                            },
                            {
                              op: "eq",
                              field: "oplossing",
                              value: "Beveiliging"
                            }
                          ]
                        },
                        {
                          op: "eq",
                          field: "toegang",
                          value: "Beslagset elekt."
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "closer",
            title: "Deurdranger",
            sections: [
              {
                title: "Deurdranger",
                fields: [
                  "dranger_aanwezig",
                  "type_dranger",
                  "montage_dranger",
                  "merk_type_dranger"
                ],
                photos: [
                  "foto_dranger_1"
                ]
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "oplossing",
                      value: "Beveiliging"
                    },
                    {
                      op: "includes",
                      field: "overig_toevoegen",
                      value: "Deurdranger"
                    }
                  ]
                }
              ]
            }
          },
          {
            id: "strike-plate",
            title: "Sluitplaat",
            sections: [
              {
                title: "Sluitplaat of kleefmagneet",
                fields: [
                  "sluitplaat_kleefmagneet_toevoegen"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "type_object_opname",
                  value: "Deur"
                },
                {
                  op: "includes",
                  field: "overig_toevoegen",
                  value: "Sluitplaat/kleefmagneet"
                }
              ]
            }
          },
          {
            id: "door-photos",
            title: "Foto's deur",
            sections: [
              {
                title: "Foto's van de deur",
                fields: [],
                photos: [
                  "foto_deur_1",
                  "foto_deur_2",
                  "foto_deur_3",
                  "foto_deur_4",
                  "upload_hier_alle_vooraf_genomen_foto_s"
                ]
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Deur"
            }
          },
          {
            id: "project",
            title: "Project & opmerkingen",
            sections: [
              {
                title: "Project",
                fields: [
                  "aantal_identieke_deuren",
                  "opmerking",
                  "opmerking_project"
                ],
                photos: []
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Deur"
            }
          },
          {
            id: "window-main",
            title: "Raam & ruit",
            sections: [
              {
                title: "Maten",
                fields: [
                  "enkel_dubbel",
                  "raam_hoogte",
                  "raam_breedte",
                  "raam_dikte",
                  "raam_inbouw_diepte"
                ],
                photos: [
                  "foto_raam"
                ]
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Raam / ruit"
            }
          },
          {
            id: "window-details",
            title: "Raamdetails",
            sections: [
              {
                title: "Beslag raam",
                fields: [
                  "draairichting_raam",
                  "kruk_midden",
                  "sluitkomen_verspringen",
                  "dievenklauwen",
                  "soort_kruk",
                  "axa_30_12_raam_bijzetslot_kleur"
                ],
                photos: []
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Raam / ruit"
            }
          },
          {
            id: "window-project",
            title: "Project & opmerkingen",
            sections: [
              {
                title: "Raam, ruit & project",
                fields: [
                  "opmerking_raam",
                  "opmerking_ruit",
                  "aantal_identieke_deuren",
                  "opmerking_project"
                ],
                photos: [
                  "ruit_hoogte_x_breedte"
                ]
              }
            ],
            when: {
              op: "eq",
              field: "type_object_opname",
              value: "Raam / ruit"
            }
          },
          {
            id: "summary",
            title: "Afronding",
            sections: [],
            when: {
              op: "present",
              field: "type_object_opname"
            }
          }
        ],
        validationRules: [],
        serverFields: [],
        prefillFields: [
          "opdrachtgever",
          "klant",
          "pandnaam",
          "huisnummer",
          "deurcode"
        ],
        transitions: [
          {
            field: "oplossing",
            clear: [
              "merk_elektronisch",
              "merk_mechanisch",
              "toegang",
              "e_cilinder_binnen",
              "e_cilinder_buiten",
              "verlengde_buitenknopas",
              "beschermkap_beslag",
              "afwerking_wandlezer_buiten",
              "afwerking_wandlezer_binnen",
              "offline_online",
              "wifi_versterker_nodig",
              "regenkap",
              "mechanische_cilinder_toevoegen",
              "aansturing_wandlezer",
              "230v_aanwezig"
            ]
          },
          {
            field: "toegang",
            clear: [
              "e_cilinder_binnen",
              "e_cilinder_buiten",
              "verlengde_buitenknopas",
              "beschermkap_beslag",
              "afwerking_wandlezer_buiten",
              "afwerking_wandlezer_binnen",
              "offline_online",
              "wifi_versterker_nodig",
              "regenkap",
              "mechanische_cilinder_toevoegen",
              "aansturing_wandlezer",
              "230v_aanwezig"
            ]
          }
        ]
      },
      onderhoud: {
        title: "Onderhoud",
        payloadPolicy: "all-defined",
        routePreview: {
          fields: {
            status_deur_voldoende_controle_onderhoud: "Ja",
            type_deur: "Deur"
          },
          when: {
            op: "any",
            items: [
              { op: "not", item: { op: "present", field: "status_deur_voldoende_controle_onderhoud" } },
              {
                op: "all",
                items: [
                  { op: "context", key: "isEdit", equals: false },
                  { op: "eq", field: "status_deur_voldoende_controle_onderhoud", value: "Ja" },
                  { op: "not", item: { op: "present", field: "type_deur" } }
                ]
              }
            ]
          }
        },
        sections: [
          {
            title: "Onderhoudsformulier",
            fields: [
              {
                name: "klant_locatie",
                label: "Klant - Locatie",
                type: "text",
                options: [],
                required: true
              },
              {
                name: "nul_beurt",
                label: "Nul beurt",
                type: "text",
                options: [
                  "Ja"
                ],
                required: false
              },
              {
                name: "deur_nummer",
                label: "Deur nummer",
                type: "text",
                options: [],
                required: true
              },
              {
                name: "door_wie_ingevuld",
                label: "Door wie ingevuld",
                type: "text",
                options: [
                  "AT",
                  "EB"
                ],
                required: false,
                allowOther: true
              },
              {
                name: "status_deur_voldoende_controle_onderhoud",
                label: "Status van de deur voldoende om controle en onderhoud uit te voeren?",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: true
              },
              {
                name: "type_deur",
                label: "Type deur",
                type: "text",
                options: [
                  "Deur",
                  "Kluisdeur",
                  "HSD_deur"
                ],
                required: false
              }
            ],
            photos: [
              {
                kind: "foto_deur_1",
                label: "Foto deur 1",
                maxFiles: 1
              },
              {
                kind: "foto_deur_2",
                label: "Foto deur 2",
                maxFiles: 1
              }
            ]
          },
          {
            title: "Slot, beslag en dranger",
            fields: [
              {
                name: "slot_merk_type",
                label: "Merk/type slot",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "slot_mechaniek",
                label: "Mechaniek slot",
                type: "text",
                options: [
                  "Mechanisch",
                  "Spoel",
                  "Motor"
                ],
                required: false
              },
              {
                name: "slot_pc_doorn_maat",
                label: "PC/doorn maat - slot",
                type: "text",
                options: [
                  "PC55/D50",
                  "PC55/D55",
                  "PC55/D60",
                  "PC72/D50",
                  "PC72/D55",
                  "PC72/D60",
                  "PC92/D50",
                  "PC92/D55",
                  "PC92/D60"
                ],
                required: false,
                allowOther: true
              },
              {
                name: "slot_antipaniek_zelfvergrendelend",
                label: "Antipaniek/zelfvergrendelend",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "slot_anti_flipper",
                label: "Anti flipper",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "slot_meerpuntsluiting",
                label: "Meerpuntsluiting",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "slot_meerpuntsluiting_kom",
                label: "Meerpuntsluiting kom",
                type: "text",
                options: [
                  "Opbouw",
                  "Inbouw"
                ],
                required: false
              },
              {
                name: "slot_opmerking",
                label: "Opmerking Slot",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "beslag_type_greep",
                label: "Type greep",
                type: "text",
                options: [
                  "Kruk/kruk",
                  "Greep/kruk",
                  "Elektronisch"
                ],
                required: false,
                allowOther: true
              },
              {
                name: "beslag_pc_maat",
                label: "PC maat - beslag",
                type: "text",
                options: [
                  "PC55",
                  "PC72",
                  "PC92"
                ],
                required: false,
                allowOther: true
              },
              {
                name: "beslag_maat",
                label: "Maat",
                type: "text",
                options: [
                  "Breed",
                  "Smal"
                ],
                required: false
              },
              {
                name: "beslag_beslagsoort",
                label: "Beslagsoort",
                type: "text",
                options: [
                  "Veiligheidsbeslag",
                  "Binnendeurbeslag"
                ],
                required: false
              },
              {
                name: "beslag_kerntrekbeslag",
                label: "Kerntrekbeslag",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "beslag_skg",
                label: "SKG",
                type: "text",
                options: [
                  "SKG**",
                  "SKG***",
                  "Geen"
                ],
                required: false
              },
              {
                name: "beslag_type",
                label: "Type beslag",
                type: "text",
                options: [
                  "Lang Schild",
                  "Rozet"
                ],
                required: false
              },
              {
                name: "beslag_afwerking",
                label: "Afwerking",
                type: "text",
                options: [
                  "Afgerond",
                  "Rechthoekig"
                ],
                required: false
              },
              {
                name: "beslag_materiaal",
                label: "Materiaal",
                type: "text",
                options: [
                  "Aluminium F1",
                  "RVS",
                  "Messing"
                ],
                required: false,
                allowOther: true
              },
              {
                name: "beslag_opmerking",
                label: "Opmerking - beslag",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "dranger_aanwezig",
                label: "Dranger aanwezig",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "dranger_type",
                label: "Type",
                type: "text",
                options: [
                  "Mechanisch",
                  "Automaat"
                ],
                required: false
              },
              {
                name: "dranger_montage",
                label: "Montage",
                type: "text",
                options: [
                  "Deur",
                  "Kozijn"
                ],
                required: false
              },
              {
                name: "dranger_merk_type_automaat",
                label: "Merk/type Dranger-Automaat",
                type: "text",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "slot_foto",
                label: "Foto slot",
                maxFiles: 1
              },
              {
                kind: "beslag_foto",
                label: "Foto beslag",
                maxFiles: 1
              },
              {
                kind: "dranger_foto",
                label: "Foto dranger",
                maxFiles: 1
              }
            ]
          },
          {
            title: "Controle lijst",
            fields: [
              {
                name: "controle_dranger_verzegeld",
                label: "Dranger verzegeld?",
                type: "text",
                options: [
                  "Ja",
                  "Nee",
                  "nvt"
                ],
                required: false
              },
              {
                name: "controle_sticker_geplakt",
                label: "Sticker geplakt?",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "controle_meerwerk_gedaan",
                label: "Meerwerk gedaan?",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "controle_tijd_besteed_meerwerk",
                label: "Tijd besteed aan meerwerk?",
                type: "text",
                options: [],
                required: false
              },
              {
                name: "controle_welke_werkzaamheden_waren_meerwerk",
                label: "Welke werkzaamheden waren meerwerk?",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "controle_welke_materialen_gebruikt_meerwerk",
                label: "Welke materialen heb je gebruikt in het meerwerk?",
                type: "textarea",
                options: [],
                required: false
              },
              {
                name: "controle_eindcontrole_werking_deur_goed",
                label: "Eindcontrole: werking deur goed?",
                type: "text",
                options: [
                  "Ja (Status: Goed)",
                  "Ja, maar werk nodig (Status: geadviseerd)",
                  "Nee, niet spoed (Status: Defecten)",
                  "Nee, spoed (Status: Afkeur)"
                ],
                required: false
              },
              {
                name: "controle_wat_mis",
                label: "Wat is er mis?",
                type: "textarea",
                options: [],
                required: false,
                when: {
                  op: "any",
                  items: [
                    { op: "eq", field: "status_deur_voldoende_controle_onderhoud", value: "Nee" },
                    {
                      op: "in",
                      field: "controle_eindcontrole_werking_deur_goed",
                      values: [
                        "Ja, maar werk nodig (Status: geadviseerd)",
                        "Nee, niet spoed (Status: Defecten)",
                        "Nee, spoed (Status: Afkeur)"
                      ]
                    }
                  ]
                }
              },
              {
                name: "controle_welke_materialen_nodig",
                label: "Welke materialen zijn er nodig?",
                type: "textarea",
                options: [],
                required: false,
                when: {
                  op: "any",
                  items: [
                    { op: "eq", field: "status_deur_voldoende_controle_onderhoud", value: "Nee" },
                    {
                      op: "in",
                      field: "controle_eindcontrole_werking_deur_goed",
                      values: [
                        "Ja, maar werk nodig (Status: geadviseerd)",
                        "Nee, niet spoed (Status: Defecten)",
                        "Nee, spoed (Status: Afkeur)"
                      ]
                    }
                  ]
                }
              },
              {
                name: "controle_oplossing_voeren_werkzaamheden",
                label: "Oplossing uit te voeren werkzaamheden",
                type: "textarea",
                options: [],
                required: false,
                when: {
                  op: "any",
                  items: [
                    { op: "eq", field: "status_deur_voldoende_controle_onderhoud", value: "Nee" },
                    {
                      op: "in",
                      field: "controle_eindcontrole_werking_deur_goed",
                      values: [
                        "Ja, maar werk nodig (Status: geadviseerd)",
                        "Nee, niet spoed (Status: Defecten)",
                        "Nee, spoed (Status: Afkeur)"
                      ]
                    }
                  ]
                }
              },
              {
                name: "controle_regie_uitgevoerd",
                label: "Regie uitgevoerd?",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "controle_regie_vandaag_uitgevoerd",
                label: "Regie vandaag uitgevoerd?",
                type: "text",
                options: [
                  "Ja",
                  "Nee"
                ],
                required: false
              },
              {
                name: "controle_regie_uitgevoerd_datum",
                label: "Regie uitgevoerd datum",
                type: "date",
                options: [],
                required: false
              },
              {
                name: "controle_interne_opmerking",
                label: "Interne opmerking",
                type: "textarea",
                options: [],
                required: false
              }
            ],
            photos: [
              {
                kind: "controle_foto_1_defect",
                label: "Foto 1 - defect",
                maxFiles: 1
              },
              {
                kind: "controle_foto_2_defect",
                label: "Foto 2 - defect",
                maxFiles: 1
              },
              {
                kind: "controle_foto_3_defect",
                label: "Foto 3 - defect",
                maxFiles: 1
              },
              {
                kind: "controle_foto_4_defect",
                label: "Foto 4 - defect",
                maxFiles: 1
              }
            ],
            matrices: [
              {
                key: "controle_lijst_deur",
                label: "Controle lijst (Deur)",
                rows: [
                  "Sluiting van deur goed",
                  "Beslag in goede staat",
                  "Slot in goede staat",
                  "Sluitkom in goede staat",
                  "Goede werking cilinder",
                  "Schanieren in goede staat",
                  "Dranger heel / goed bevestigd en goed afgesteld",
                  "Goede werking ap slot / paniekbalk",
                  "Tochstrippen/rubber heel / goed bevestigd",
                  "Brandvertragende band in goede staat",
                  "Vloerpot heel / goed bevestigd",
                  "Algehele elektro technische staat",
                  "Elektronische componenten in goede staat",
                  "Beschermende maatregelen voor elektronische componenten nodig",
                  "Batterij vervangen in cilinder of beslag",
                  "Firmware update uitgevoerd"
                ],
                columns: [
                  "Ja",
                  "Nee",
                  "N.v.t.",
                  "Gesmeerd / afgesteld",
                  "Probleem ter plekke opgelost",
                  "Component vervangen",
                  "vervanging geadviseerd"
                ],
                statusColumns: [
                  "Ja",
                  "Nee",
                  "N.v.t."
                ]
              },
              {
                key: "controle_lijst_kluisdeur",
                label: "Controle lijst (Kluisdeur)",
                rows: [
                  "Sluiting van deur goed",
                  "Codeslot in goede staat",
                  "Sleutelslot in goede staat",
                  "Regelwerk in goede staat",
                  "Schanieren in goede staat"
                ],
                columns: [
                  "Ja",
                  "Nee",
                  "N.v.t.",
                  "Gesmeerd / afgesteld",
                  "Probleem terplekke opgelost"
                ],
                statusColumns: [
                  "Ja",
                  "Nee",
                  "N.v.t."
                ]
              },
              {
                key: "controle_lijst_hsd_deur",
                label: "Controle lijst (HSD deur)",
                rows: [
                  "Sluiting van deur goed",
                  "Goede werking noodsleutel",
                  "Goede werking regelwerk",
                  "Scharnieren goed bevestigd",
                  "Dranger heel / goed bevestigd (HSD deur)",
                  "Algehele elektro technische staat"
                ],
                columns: [
                  "Ja",
                  "Nee",
                  "N.v.t.",
                  "Gesmeerd / afgesteld"
                ],
                statusColumns: [
                  "Ja",
                  "Nee",
                  "N.v.t."
                ]
              }
            ]
          }
        ],
        routes: [
          {
            id: "general",
            title: "Algemeen",
            sections: [
              {
                title: "Algemeen",
                fields: [
                  "klant_locatie",
                  "nul_beurt",
                  "deur_nummer",
                  "door_wie_ingevuld",
                  "status_deur_voldoende_controle_onderhoud",
                  "type_deur"
                ],
                photos: [
                  "foto_deur_1",
                  "foto_deur_2"
                ]
              }
            ]
          },
          {
            id: "slot",
            title: "Slot",
            sections: [
              {
                title: "Slot",
                fields: [
                  "slot_merk_type",
                  "slot_mechaniek",
                  "slot_pc_doorn_maat",
                  "slot_antipaniek_zelfvergrendelend",
                  "slot_anti_flipper",
                  "slot_meerpuntsluiting",
                  "slot_meerpuntsluiting_kom",
                  "slot_opmerking"
                ],
                photos: [
                  "slot_foto"
                ]
              }
            ],
            when: {
              op: "eq",
              field: "nul_beurt",
              value: "Ja"
            }
          },
          {
            id: "beslag-1",
            title: "Beslag 1/2",
            sections: [
              {
                title: "Beslag",
                fields: [
                  "beslag_type_greep",
                  "beslag_pc_maat",
                  "beslag_maat",
                  "beslag_beslagsoort",
                  "beslag_kerntrekbeslag"
                ],
                photos: []
              }
            ],
            when: {
              op: "eq",
              field: "nul_beurt",
              value: "Ja"
            }
          },
          {
            id: "beslag-2",
            title: "Beslag 2/2 & Dranger",
            sections: [
              {
                title: "Beslag & dranger",
                fields: [
                  "beslag_skg",
                  "beslag_type",
                  "beslag_afwerking",
                  "beslag_materiaal",
                  "beslag_opmerking",
                  "dranger_aanwezig"
                ],
                photos: [
                  "beslag_foto"
                ]
              }
            ],
            when: {
              op: "eq",
              field: "nul_beurt",
              value: "Ja"
            }
          },
          {
            id: "dranger",
            title: "Dranger",
            sections: [
              {
                title: "Dranger",
                fields: [
                  "dranger_type",
                  "dranger_montage",
                  "dranger_merk_type_automaat"
                ],
                photos: [
                  "dranger_foto"
                ]
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "nul_beurt",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "dranger_aanwezig",
                  value: "Ja"
                }
              ]
            }
          },
          {
            id: "matrix-deur-1",
            title: "Deurcontrole 1/3",
            sections: [],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "type_deur",
                  value: "Deur"
                }
              ]
            },
            matrix: {
              key: "controle_lijst_deur",
              start: 0,
              end: 6
            }
          },
          {
            id: "matrix-deur-2",
            title: "Deurcontrole 2/3",
            sections: [],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "type_deur",
                  value: "Deur"
                }
              ]
            },
            matrix: {
              key: "controle_lijst_deur",
              start: 6,
              end: 12
            }
          },
          {
            id: "final-checks",
            title: "Afrondende controle",
            sections: [
              {
                title: "Controle & meerwerk",
                fields: [
                  "controle_dranger_verzegeld",
                  "controle_sticker_geplakt",
                  "controle_meerwerk_gedaan",
                  "controle_tijd_besteed_meerwerk"
                ],
                photos: []
              },
              {
                title: "Eindcontrole",
                fields: [
                  "controle_eindcontrole_werking_deur_goed"
                ],
                photos: [],
                kind: "end"
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "type_deur",
                  value: "Deur"
                }
              ]
            },
            matrix: {
              key: "controle_lijst_deur",
              start: 12,
              end: 16
            }
          },
          {
            id: "matrix-kluisdeur",
            title: "Kluisdeurcontrole",
            sections: [],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "type_deur",
                  value: "Kluisdeur"
                }
              ]
            },
            matrix: {
              key: "controle_lijst_kluisdeur"
            }
          },
          {
            id: "matrix-hsd",
            title: "HSD-deurcontrole",
            sections: [],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "type_deur",
                  value: "HSD_deur"
                }
              ]
            },
            matrix: {
              key: "controle_lijst_hsd_deur"
            }
          },
          {
            id: "control",
            title: "Controle & meerwerk",
            sections: [
              {
                title: "Controle & meerwerk",
                fields: [
                  "controle_dranger_verzegeld",
                  "controle_sticker_geplakt",
                  "controle_meerwerk_gedaan",
                  "controle_tijd_besteed_meerwerk"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "in",
                  field: "type_deur",
                  values: [
                    "Kluisdeur",
                    "HSD_deur"
                  ]
                }
              ]
            }
          },
          {
            id: "morework",
            title: "Meerwerk",
            sections: [
              {
                title: "Meerwerk",
                fields: [
                  "controle_welke_werkzaamheden_waren_meerwerk",
                  "controle_welke_materialen_gebruikt_meerwerk"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "present",
                  field: "type_deur"
                },
                {
                  op: "eq",
                  field: "controle_meerwerk_gedaan",
                  value: "Ja"
                }
              ]
            }
          },
          {
            id: "end",
            title: "Eindcontrole",
            sections: [
              {
                title: "Eindcontrole",
                fields: [
                  "controle_eindcontrole_werking_deur_goed"
                ],
                photos: []
              }
            ],
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "not",
                  item: {
                    op: "eq",
                    field: "type_deur",
                    value: "Deur"
                  }
                }
              ]
            }
          },
          {
            id: "deviation",
            title: "Afwijking",
            sections: [
              {
                title: "Afwijking",
                fields: [
                  "controle_wat_mis",
                  "controle_welke_materialen_nodig",
                  "controle_oplossing_voeren_werkzaamheden"
                ],
                photos: []
              }
            ],
            when: {
              op: "any",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Nee"
                },
                {
                  op: "in",
                  field: "controle_eindcontrole_werking_deur_goed",
                  values: [
                    "Ja, maar werk nodig (Status: geadviseerd)",
                    "Nee, niet spoed (Status: Defecten)",
                    "Nee, spoed (Status: Afkeur)"
                  ]
                }
              ]
            }
          },
          {
            id: "deviation-photos",
            title: "Defectfoto's",
            sections: [
              {
                title: "Defectfoto's",
                fields: [],
                photos: [
                  "controle_foto_1_defect",
                  "controle_foto_2_defect",
                  "controle_foto_3_defect",
                  "controle_foto_4_defect"
                ]
              }
            ],
            when: {
              op: "any",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Nee"
                },
                {
                  op: "in",
                  field: "controle_eindcontrole_werking_deur_goed",
                  values: [
                    "Ja, maar werk nodig (Status: geadviseerd)",
                    "Nee, niet spoed (Status: Defecten)",
                    "Nee, spoed (Status: Afkeur)"
                  ]
                }
              ]
            }
          },
          {
            id: "regie",
            title: "Regie & interne notitie",
            sections: [
              {
                title: "Regie",
                fields: [
                  "controle_regie_uitgevoerd",
                  {
                    name: "controle_regie_vandaag_uitgevoerd",
                    when: {
                      op: "eq",
                      field: "controle_regie_uitgevoerd",
                      value: "Ja"
                    }
                  },
                  {
                    name: "controle_regie_uitgevoerd_datum",
                    when: {
                      op: "all",
                      items: [
                        {
                          op: "eq",
                          field: "controle_regie_uitgevoerd",
                          value: "Ja"
                        },
                        {
                          op: "eq",
                          field: "controle_regie_vandaag_uitgevoerd",
                          value: "Nee"
                        }
                      ]
                    }
                  },
                  "controle_interne_opmerking"
                ],
                photos: []
              }
            ],
            when: {
              op: "any",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Nee"
                },
                {
                  op: "in",
                  field: "controle_eindcontrole_werking_deur_goed",
                  values: [
                    "Ja, maar werk nodig (Status: geadviseerd)",
                    "Nee, niet spoed (Status: Defecten)",
                    "Nee, spoed (Status: Afkeur)"
                  ]
                }
              ]
            }
          },
          {
            id: "end",
            title: "Eindcontrole",
            sections: [
              {
                title: "Eindcontrole",
                fields: [
                  "controle_eindcontrole_werking_deur_goed"
                ],
                photos: []
              }
            ],
            when: {
              op: "eq",
              field: "status_deur_voldoende_controle_onderhoud",
              value: "Nee"
            }
          },
          {
            id: "summary",
            title: "Afronding",
            sections: [],
            when: {
              op: "present",
              field: "status_deur_voldoende_controle_onderhoud"
            }
          }
        ],
        validationRules: [
          {
            when: {
              op: "all",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Ja"
                },
                {
                  op: "context",
                  key: "isEdit",
                  equals: false
                }
              ]
            },
            fields: [
              "type_deur"
            ]
          },
          {
            when: {
              op: "eq",
              field: "status_deur_voldoende_controle_onderhoud",
              value: "Ja"
            },
            fields: [
              "controle_eindcontrole_werking_deur_goed"
            ],
            steps: [
              "end",
              "final-checks"
            ]
          },
          {
            when: {
              op: "in",
              field: "controle_eindcontrole_werking_deur_goed",
              values: [
                "Ja, maar werk nodig (Status: geadviseerd)",
                "Nee, niet spoed (Status: Defecten)",
                "Nee, spoed (Status: Afkeur)"
              ]
            },
            fields: [
              "controle_wat_mis",
              "controle_oplossing_voeren_werkzaamheden"
            ],
            steps: [
              "deviation"
            ]
          },
          {
            when: {
              op: "any",
              items: [
                {
                  op: "eq",
                  field: "status_deur_voldoende_controle_onderhoud",
                  value: "Nee"
                },
                {
                  op: "in",
                  field: "controle_eindcontrole_werking_deur_goed",
                  values: [
                    "Ja, maar werk nodig (Status: geadviseerd)",
                    "Nee, niet spoed (Status: Defecten)",
                    "Nee, spoed (Status: Afkeur)"
                  ]
                }
              ]
            },
            fields: [
              "controle_regie_uitgevoerd"
            ],
            steps: [
              "regie"
            ]
          },
          {
            when: {
              op: "all",
              items: [
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "status_deur_voldoende_controle_onderhoud",
                      value: "Nee"
                    },
                    {
                      op: "in",
                      field: "controle_eindcontrole_werking_deur_goed",
                      values: [
                        "Ja, maar werk nodig (Status: geadviseerd)",
                        "Nee, niet spoed (Status: Defecten)",
                        "Nee, spoed (Status: Afkeur)"
                      ]
                    }
                  ]
                },
                {
                  op: "eq",
                  field: "controle_regie_uitgevoerd",
                  value: "Ja"
                }
              ]
            },
            fields: [
              "controle_regie_vandaag_uitgevoerd"
            ],
            steps: [
              "regie"
            ]
          },
          {
            when: {
              op: "all",
              items: [
                {
                  op: "any",
                  items: [
                    {
                      op: "eq",
                      field: "status_deur_voldoende_controle_onderhoud",
                      value: "Nee"
                    },
                    {
                      op: "in",
                      field: "controle_eindcontrole_werking_deur_goed",
                      values: [
                        "Ja, maar werk nodig (Status: geadviseerd)",
                        "Nee, niet spoed (Status: Defecten)",
                        "Nee, spoed (Status: Afkeur)"
                      ]
                    }
                  ]
                },
                {
                  op: "eq",
                  field: "controle_regie_uitgevoerd",
                  value: "Ja"
                },
                {
                  op: "eq",
                  field: "controle_regie_vandaag_uitgevoerd",
                  value: "Nee"
                }
              ]
            },
            fields: [
              "controle_regie_uitgevoerd_datum"
            ],
            steps: [
              "regie"
            ]
          }
        ],
        serverFields: [
          {
            name: "onderhoudsdatum",
            type: "date"
          }
        ],
        prefillFields: [
          "klant_locatie",
          "deur_nummer"
        ],
        transitions: []
      }
    },
    status: {
      recentDays: 30,
      maintenanceGoodValue: "Ja (Status: Goed)",
      colors: [
        "blauw",
        "groen",
        "rood"
      ]
    }
  };

  // shared/inspection-core/index.ts
  var inspection_core_exports = {};
  __export(inspection_core_exports, {
    applyFieldTransition: () => applyFieldTransition,
    assertInspectionContract: () => assertInspectionContract,
    clearFields: () => clearFields,
    cloneValue: () => cloneValue,
    collectPayload: () => collectPayload,
    contentSignature: () => contentSignature,
    createFormState: () => createFormState,
    directPrefill: () => directPrefill,
    evaluateCondition: () => evaluateCondition,
    evaluateLegacyCondition: () => evaluateLegacyCondition,
    fieldIsVisible: () => fieldIsVisible,
    findField: () => findField,
    findMatrix: () => findMatrix,
    findPhoto: () => findPhoto,
    formDefinition: () => formDefinition,
    formVisibilityTriggers: () => formVisibilityTriggers,
    hasChanges: () => hasChanges,
    hasValue: () => hasValue,
    isRecent: () => isRecent,
    listFields: () => listFields,
    listMatrices: () => listMatrices,
    listPhotos: () => listPhotos,
    matrixAnswerKey: () => matrixAnswerKey,
    matrixKey: () => matrixKey,
    matrixStatus: () => matrixStatus,
    matrixStepHasAnswers: () => matrixStepHasAnswers,
    previewRouteFields: () => previewRouteFields,
    projectDoorStatus: () => projectDoorStatus,
    projectOfficeStatus: () => projectOfficeStatus,
    projectedStatusAfterSave: () => projectedStatusAfterSave,
    setMatrixStatus: () => setMatrixStatus,
    slug: () => slug,
    stepHasAnswers: () => stepHasAnswers,
    toggleMatrixAction: () => toggleMatrixAction,
    transitionClearFields: () => transitionClearFields,
    validationErrors: () => validationErrors,
    visibilityTriggers: () => visibilityTriggers,
    visibleSteps: () => visibleSteps
  });

  // shared/inspection-core/conditions.ts
  function hasValue(value) {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== void 0 && String(value).trim() !== "";
  }
  function equal(left, right) {
    if (Array.isArray(left)) return left.some((item) => equal(item, right));
    return String(left ?? "") === String(right ?? "");
  }
  function evaluateCondition(condition, fields, context = {}) {
    if (!condition) return true;
    switch (condition.op) {
      case "eq":
        return equal(fields[condition.field], condition.value);
      case "in":
        return condition.values.some((value) => equal(fields[condition.field], value));
      case "includes":
        return equal(fields[condition.field], condition.value);
      case "prefix":
        return String(fields[condition.field] ?? "").startsWith(condition.value);
      case "present":
        return hasValue(fields[condition.field]);
      case "context":
        return equal(context[condition.key], condition.equals);
      case "all":
        return condition.items.every((item) => evaluateCondition(item, fields, context));
      case "any":
        return condition.items.some((item) => evaluateCondition(item, fields, context));
      case "not":
        return !evaluateCondition(condition.item, fields, context);
    }
  }
  function evaluateLegacyCondition(condition, fields) {
    if (!condition) return true;
    const value = fields[condition.fieldName];
    if (condition.op === "value") return hasValue(value);
    if (condition.op === "equals" || condition.op === "includes") return equal(value, condition.value);
    if (condition.op === "notEquals") return hasValue(value) && !equal(value, condition.value);
    return false;
  }

  // shared/inspection-core/contract.ts
  function formDefinition(contract2, formType) {
    const form = contract2.forms[formType];
    if (!form) throw new Error(`Onbekend formuliertype: ${formType}`);
    return form;
  }
  function listFields(contract2, formType) {
    return formDefinition(contract2, formType).sections.flatMap((section) => section.fields ?? []);
  }
  function listPhotos(contract2, formType) {
    return formDefinition(contract2, formType).sections.flatMap((section) => section.photos ?? []);
  }
  function listMatrices(contract2, formType) {
    return formDefinition(contract2, formType).sections.flatMap((section) => section.matrices ?? []);
  }
  function findField(contract2, formType, name) {
    return listFields(contract2, formType).find((item) => item.name === name);
  }
  function findPhoto(contract2, formType, kind) {
    return listPhotos(contract2, formType).find((item) => item.kind === kind);
  }
  function findMatrix(contract2, formType, key) {
    return listMatrices(contract2, formType).find((item) => item.key === key);
  }
  function fieldIsVisible(field, fields, context = {}) {
    return evaluateCondition(field.when, fields, context) && evaluateLegacyCondition(field.condition, fields);
  }
  function routeFieldName(item) {
    return typeof item === "string" ? item : item.name;
  }
  function routeFieldIsVisible(item, fields, context) {
    return typeof item === "string" || evaluateCondition(item.when, fields, context);
  }
  function resolveSection(section, fields, context) {
    return {
      ...section,
      fields: (section.fields ?? []).filter((item) => routeFieldIsVisible(item, fields, context)).map(routeFieldName),
      photos: [...section.photos ?? []]
    };
  }
  function visibleSteps(contract2, formType, fields, context = {}) {
    const form = formDefinition(contract2, formType);
    return form.routes.filter((step) => evaluateCondition(step.when, fields, context)).map((step) => {
      const sections = (step.sections ?? []).map((section) => resolveSection(section, fields, context));
      const matrix = step.matrix ? findMatrix(contract2, formType, step.matrix.key) : void 0;
      return {
        id: step.id,
        title: step.title,
        sections,
        matrixKey: matrix?.key,
        rows: matrix?.rows.slice(step.matrix?.start ?? 0, step.matrix?.end)
      };
    });
  }
  function previewRouteFields(contract2, formType, fields, context = {}) {
    const result = { ...fields };
    const form = formDefinition(contract2, formType);
    if (!form.routePreview || !evaluateCondition(form.routePreview.when, fields, context)) return result;
    Object.entries(form.routePreview.fields).forEach(([name, value]) => {
      if (result[name] === void 0 || result[name] === null || result[name] === "") {
        result[name] = Array.isArray(value) ? [...value] : value;
      }
    });
    return result;
  }
  function visibilityTriggers(condition, output = /* @__PURE__ */ new Set()) {
    if (!condition || typeof condition !== "object") return output;
    const value = condition;
    if (typeof value.field === "string") output.add(value.field);
    if (typeof value.fieldName === "string") output.add(value.fieldName);
    if (Array.isArray(value.items)) value.items.forEach((item) => visibilityTriggers(item, output));
    if (value.item) visibilityTriggers(value.item, output);
    return output;
  }
  function formVisibilityTriggers(contract2, formType) {
    const result = /* @__PURE__ */ new Set();
    const form = formDefinition(contract2, formType);
    listFields(contract2, formType).forEach((field) => {
      visibilityTriggers(field.when, result);
      visibilityTriggers(field.condition, result);
    });
    form.routes.forEach((step) => {
      visibilityTriggers(step.when, result);
      (step.sections ?? []).flatMap((section) => section.fields ?? []).forEach((item) => {
        if (typeof item !== "string") visibilityTriggers(item.when, result);
      });
    });
    form.validationRules.forEach((rule) => visibilityTriggers(rule.when, result));
    return result;
  }
  function assertInspectionContract(contract2) {
    if (contract2.schemaVersion !== 1 || contract2.questionnaireVersion < 1) {
      throw new Error("Niet-ondersteunde inspectiecontractversie.");
    }
    ["opname", "onderhoud"].forEach((formType) => {
      const fields = listFields(contract2, formType);
      const names = new Set(fields.map((item) => item.name));
      if (names.size !== fields.length) throw new Error(`Dubbel veld in ${formType}.`);
      const photos = listPhotos(contract2, formType);
      if (new Set(photos.map((item) => item.kind)).size !== photos.length) throw new Error(`Dubbel fotoveld in ${formType}.`);
      const matrices = listMatrices(contract2, formType);
      if (new Set(matrices.map((item) => item.key)).size !== matrices.length) throw new Error(`Dubbele matrix in ${formType}.`);
      formDefinition(contract2, formType).routes.forEach((step) => {
        (step.sections ?? []).flatMap((section) => section.fields ?? []).forEach((item) => {
          const name = routeFieldName(item);
          if (!names.has(name)) throw new Error(`Route ${step.id} verwijst naar onbekend veld ${name}.`);
        });
      });
    });
  }

  // shared/inspection-core/state.ts
  function cloneValue(value) {
    return value === null || value === void 0 ? value : JSON.parse(JSON.stringify(value));
  }
  function matrixAnswerKey(matrixKey2, rowKey, columnKey) {
    return `${matrixKey2}|${rowKey}|${columnKey}`;
  }
  function createFormState(initial = null, clientUuid = null, performedAt = (/* @__PURE__ */ new Date()).toISOString()) {
    const photos = {};
    (initial?.photos ?? []).forEach((photo) => {
      var _a;
      if (!photo.id || !photo.kind) return;
      (photos[_a = photo.kind] ?? (photos[_a] = [])).push({ id: photo.id, kind: photo.kind, existing: true });
    });
    const matrices = {};
    const matrixMeta = {};
    (initial?.matrix_answers ?? []).forEach((answer) => {
      if (answer.value === false) return;
      const key = matrixAnswerKey(answer.matrix_key, answer.row_key, answer.column_key);
      matrices[key] = true;
      matrixMeta[key] = {
        rowLabel: answer.row_label ?? answer.row_key,
        columnLabel: answer.column_label ?? answer.column_key
      };
    });
    return {
      fields: cloneValue(initial?.fields ?? {}),
      photos,
      matrices,
      matrixMeta,
      clientUuid,
      performedAt: initial?.performed_at ?? performedAt,
      preservedNotes: initial?.notes ?? null,
      initialNoteFields: {
        controle_interne_opmerking: initial?.fields?.controle_interne_opmerking,
        controle_wat_mis: initial?.fields?.controle_wat_mis
      }
    };
  }
  function clearFields(state, names) {
    const next = { ...state, fields: { ...state.fields } };
    names.forEach((name) => delete next.fields[name]);
    return next;
  }
  function transitionClearFields(contract2, formType, field) {
    return [...contract2.forms[formType].transitions?.find((item) => item.field === field)?.clear ?? []];
  }
  function applyFieldTransition(contract2, formType, state, field, value) {
    const next = clearFields(state, transitionClearFields(contract2, formType, field));
    if (value === void 0 || value === null || value === "") delete next.fields[field];
    else next.fields[field] = cloneValue(value);
    return next;
  }
  function stableValue(value) {
    if (Array.isArray(value)) {
      return value.map(stableValue).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  }
  function contentSignature(payload) {
    const existingPhotos = (payload.existing_photo_ids ?? []).map(Number).filter((id) => id > 0).sort((left, right) => left - right);
    const newPhotos = (payload.photos ?? []).map((photo) => ({
      kind: photo.kind,
      data_url: photo.data_url,
      filename: photo.filename ?? "",
      content_type: photo.content_type ?? ""
    }));
    const nativePhotos = (payload.native_photos ?? []).map((photo) => ({
      kind: photo.kind,
      native_ref: photo.native_ref,
      filename: photo.filename ?? "",
      content_type: photo.content_type,
      content_sha256: photo.content_sha256,
      content_bytes: photo.content_bytes
    }));
    const matrices = (payload.matrix_answers ?? []).map((answer) => [
      answer.matrix_key,
      answer.row_key,
      answer.column_key
    ]);
    return JSON.stringify(stableValue({
      fields: payload.fields ?? {},
      existingPhotos,
      newPhotos,
      nativePhotos,
      matrices
    }));
  }
  function hasChanges(payload, baseline) {
    return contentSignature(payload) !== baseline;
  }
  function directPrefill(fields, context, allowedFields) {
    const next = { ...fields };
    Object.entries(context).forEach(([name, value]) => {
      if (allowedFields.has(name) && value !== void 0 && value !== null && value !== "") next[name] = cloneValue(value);
    });
    return next;
  }

  // shared/inspection-core/payload.ts
  function normalizedValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => typeof item === "string" ? item.trim() : item).filter(hasValue);
    }
    return typeof value === "string" ? value.trim() : value;
  }
  function visibleFieldNames(contract2, formType, state, context) {
    if (context.isEdit === true || formDefinition(contract2, formType).payloadPolicy === "all-defined") {
      return new Set(formDefinition(contract2, formType).sections.flatMap((section) => (section.fields ?? []).map((field) => field.name)));
    }
    const names = /* @__PURE__ */ new Set();
    visibleSteps(contract2, formType, state.fields, context).forEach((step) => {
      step.sections.forEach((section) => section.fields.forEach((name) => names.add(name)));
    });
    return names;
  }
  function collectFields(contract2, formType, state, context) {
    const allowed = visibleFieldNames(contract2, formType, state, context);
    const result = {};
    Object.entries(state.fields).forEach(([name, value]) => {
      const definition = findField(contract2, formType, name);
      if (!definition || !allowed.has(name) || !fieldIsVisible(definition, state.fields, context) || !hasValue(value)) return;
      result[name] = normalizedValue(value);
    });
    return result;
  }
  function notesFor(formType, state, fields) {
    if (formType === "onderhoud") {
      const noteFields = ["controle_interne_opmerking", "controle_wat_mis"];
      const notesChanged = state.initialNoteFields && noteFields.some((name) => String(state.initialNoteFields?.[name] ?? "") !== String(fields[name] ?? ""));
      if (!notesChanged && hasValue(state.preservedNotes)) return String(state.preservedNotes);
      return noteFields.map((name) => fields[name]).find(hasValue)?.toString() ?? null;
    }
    return ["opmerking_project", "opmerking"].map((name) => fields[name]).find(hasValue)?.toString() ?? null;
  }
  function collectPayload(contract2, formType, state, context = {}, fallbackPerformedAt = (/* @__PURE__ */ new Date()).toISOString()) {
    const fields = collectFields(contract2, formType, state, context);
    const photos = [];
    const native_photos = [];
    const existing_photo_ids = [];
    Object.entries(state.photos).forEach(([kind, entries]) => entries.forEach((item, sort_order) => {
      if (Number(item.id ?? 0) > 0) {
        existing_photo_ids.push(Number(item.id));
      } else if (item.data_url) {
        photos.push({ kind, data_url: item.data_url, filename: item.filename, content_type: item.content_type, sort_order });
      } else if (item.native_ref && item.content_type && item.native_sha256 && item.native_bytes) {
        native_photos.push({
          kind,
          native_ref: item.native_ref,
          filename: item.filename,
          content_type: item.content_type,
          content_sha256: item.native_sha256,
          content_bytes: item.native_bytes,
          sort_order
        });
      }
    }));
    const matrix_answers = [];
    Object.entries(state.matrices).forEach(([key, selected]) => {
      if (!selected) return;
      const [matrix_key, row_key, column_key] = key.split("|");
      if (!matrix_key || !row_key || !column_key) return;
      const meta = state.matrixMeta[key] ?? {};
      matrix_answers.push({
        matrix_key,
        row_key,
        row_label: meta.rowLabel ?? row_key,
        column_key,
        column_label: meta.columnLabel ?? column_key,
        value: true,
        sort_order: matrix_answers.length
      });
    });
    const payload = {
      form_type: formType,
      questionnaire_version: contract2.questionnaireVersion,
      client_uuid: state.clientUuid ?? null,
      performed_at: state.performedAt ?? fallbackPerformedAt,
      notes: notesFor(formType, state, fields),
      fields,
      photos,
      existing_photo_ids,
      matrix_answers
    };
    if (native_photos.length) payload.native_photos = native_photos;
    return payload;
  }
  function validationErrors(contract2, formType, step, state, context = {}) {
    const required = /* @__PURE__ */ new Set();
    step.sections.flatMap((section) => section.fields).forEach((name) => {
      const field = findField(contract2, formType, name);
      if (field?.required && fieldIsVisible(field, state.fields, context)) required.add(name);
    });
    formDefinition(contract2, formType).validationRules.forEach((rule) => {
      if (rule.steps?.length && !rule.steps.includes(step.id)) return;
      if (evaluateCondition(rule.when, state.fields, context)) rule.fields.forEach((name) => required.add(name));
    });
    return [...required].filter((name) => !hasValue(state.fields[name])).map((name) => `${findField(contract2, formType, name)?.label ?? name} is verplicht.`);
  }
  function stepHasAnswers(step, state) {
    return step.sections.some((section) => section.fields.some((name) => hasValue(state.fields[name])) || section.photos.some((kind) => (state.photos[kind] ?? []).length > 0)) || (step.rows ?? []).some((row) => Object.entries(state.matrixMeta).some(([key, meta]) => Boolean(state.matrices[key]) && meta.rowLabel === row));
  }

  // shared/inspection-core/status.ts
  function isRecent(receivedAt, now, days) {
    if (!receivedAt) return false;
    const received = new Date(receivedAt).getTime();
    const reference = new Date(now).getTime();
    if (!Number.isFinite(received) || !Number.isFinite(reference)) return false;
    return received <= reference && reference - received < days * 24 * 60 * 60 * 1e3;
  }
  function projectDoorStatus(contract2, input) {
    if (!isRecent(input.receivedAt, input.now, contract2.status.recentDays)) return "blauw";
    if (input.mode === "opname") return "groen";
    const fields = input.fields ?? {};
    if (String(fields.status_deur_voldoende_controle_onderhoud ?? "") === "Nee") return "rood";
    return String(fields.controle_eindcontrole_werking_deur_goed ?? "") === contract2.status.maintenanceGoodValue ? "groen" : "rood";
  }
  function projectedStatusAfterSave(contract2, mode, fields) {
    if (mode === "opname") return "groen";
    if (String(fields?.status_deur_voldoende_controle_onderhoud ?? "") === "Nee") return "rood";
    return String(fields?.controle_eindcontrole_werking_deur_goed ?? "") === contract2.status.maintenanceGoodValue ? "groen" : "rood";
  }
  function projectOfficeStatus(performedAt, now, days = 30) {
    return isRecent(performedAt, now, days) ? "groen" : "blauw";
  }

  // shared/inspection-core/matrix.ts
  function slug(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "waarde";
  }
  function matrixKey(matrix, rowLabel, columnLabel) {
    return `${matrix}|${slug(rowLabel)}|${slug(columnLabel)}`;
  }
  function matrixStatus(contract2, formType, state, matrix, rowLabel) {
    const definition = findMatrix(contract2, formType, matrix);
    return (definition?.statusColumns ?? []).find((column) => state.matrices[matrixKey(matrix, rowLabel, column)]) ?? "";
  }
  function setMatrixStatus(contract2, formType, state, matrix, rowLabel, columnLabel) {
    const definition = findMatrix(contract2, formType, matrix);
    (definition?.statusColumns ?? []).forEach((column) => delete state.matrices[matrixKey(matrix, rowLabel, column)]);
    if (columnLabel !== "Nee") {
      (definition?.columns ?? []).filter((column) => !(definition?.statusColumns ?? []).includes(column)).forEach((column) => delete state.matrices[matrixKey(matrix, rowLabel, column)]);
    }
    if (!columnLabel) return;
    const key = matrixKey(matrix, rowLabel, columnLabel);
    state.matrices[key] = true;
    state.matrixMeta[key] = { rowLabel, columnLabel };
  }
  function toggleMatrixAction(state, matrix, rowLabel, columnLabel) {
    const key = matrixKey(matrix, rowLabel, columnLabel);
    state.matrices[key] = !state.matrices[key];
    state.matrixMeta[key] = { rowLabel, columnLabel };
  }
  function matrixStepHasAnswers(state, matrix, rows) {
    return rows.some((row) => Object.entries(state.matrixMeta).some(([key, meta]) => Boolean(state.matrices[key]) && hasValue(meta.rowLabel) && meta.rowLabel === row && key.startsWith(`${matrix}|`)));
  }

  // frontend/ts/inspection-contract-runtime.ts
  var contract = v2_default;
  assertInspectionContract(contract);
  var global = window;
  var FD = global.FD = global.FD || {};
  FD.InspectionContractRuntime = Object.freeze({ contract, core: Object.freeze(inspection_core_exports) });
})();
