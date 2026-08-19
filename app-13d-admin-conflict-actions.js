function renderAdminConflictActions(conflict) {
    const wrapper = conflictNode('div', 'admin-conflict-actions');
    const selected = adminDashboardState.conflictConfirm;
    const isSelected = selected?.id === conflict.id;
    if (isSelected) {
        const fieldLabels = conflictFieldLabels(conflict);
        const fieldText = fieldLabels.length ? fieldLabels.join(' en ') : 'waarden';
        const actionLabel = selected.action === 'central'
            ? 'de centrale versie bewaren'
            : 'de tabletwaarde opnieuw aanbieden';
        const confirmation = conflictNode('div', 'admin-conflict-confirmation');
        confirmation.append(conflictNode('strong', '', `Weet je zeker dat je ${actionLabel} wilt?`), conflictNode('p', '', conflict.conflict_code === 'marker_field_conflict'
            ? selected.action === 'central'
                ? `De waarde van Office voor ${fieldText} blijft op de kaart. Andere wijzigingen aan deze deur zijn al automatisch verwerkt.`
                : `De tabletwaarde voor ${fieldText} blijft bewaard en wordt opnieuw aangeboden op de actuele kaart. Andere wijzigingen aan deze deur zijn al automatisch verwerkt.`
            : selected.action === 'central'
                ? conflict.kind === 'marker_batch'
                    ? 'De centrale waarden hierboven blijven staan. De volledige tabletbewerking van deze kaart vervalt; wijzigingen aan andere deuren uit dezelfde opdracht worden niet apart opgeslagen.'
                    : 'De centrale inspectieversie blijft staan. Het volledige tabletwerk voor deze inspectie vervalt en wordt bij de volgende synchronisatie opgeruimd.'
                : conflict.kind === 'marker_batch'
                    ? 'Alle tabletwijzigingen hierboven blijven bewaard en worden opnieuw aangeboden op de actuele kaart. Wijzigingen aan andere deuren worden veilig toegevoegd; bij dezelfde deur kan opnieuw een keuze nodig zijn.'
                    : 'Het volledige tabletwerk blijft bewaard en wordt opnieuw aangeboden op de actuele centrale inspectieversie. Bij een nieuwe overlap verschijnt het conflict opnieuw ter beoordeling.'));
        const confirmationActions = conflictNode('div', 'admin-conflict-confirmation-actions');
        const confirm = conflictNode('button', 'admin-dashboard-primary', 'Bevestigen');
        confirm.type = 'button';
        confirm.dataset.conflictConfirm = 'true';
        confirm.dataset.conflictId = String(conflict.id);
        confirm.dataset.conflictAction = selected.action;
        confirm.disabled = adminDashboardState.conflictResolvingId === conflict.id;
        const cancel = conflictNode('button', 'admin-dashboard-secondary', 'Annuleren');
        cancel.type = 'button';
        cancel.dataset.conflictCancel = 'true';
        cancel.dataset.conflictId = String(conflict.id);
        cancel.disabled = confirm.disabled;
        confirmationActions.append(confirm, cancel);
        confirmation.append(confirmationActions);
        wrapper.append(confirmation);
        return wrapper;
    }
    if (conflict.conflict_code === 'marker_field_conflict') {
        const labels = conflictFieldLabels(conflict);
        const fieldText = labels.length === 1 ? labels[0] : 'conflicterende waarden';
        const compact = conflictNode('div', 'admin-conflict-compact-actions');
        compact.append(conflictNode('strong', '', `Kies welke waarde op de kaart blijft: ${fieldText}.`), conflictNode('p', 'admin-conflict-compact-help', 'De centrale versie is de waarde uit Office. De tabletversie is de waarde die de monteur heeft opgeslagen. Andere wijzigingen aan deze deur zijn al verwerkt.'));
        const options = conflictNode('div', 'admin-conflict-compact-options');
        const centralOption = conflictNode('section', 'admin-conflict-compact-option is-central');
        const central = conflictNode('button', 'admin-dashboard-secondary', 'Bewaar centrale versie');
        central.type = 'button';
        central.dataset.conflictAction = 'central';
        central.dataset.conflictId = String(conflict.id);
        central.setAttribute('aria-label', `Bewaar centrale versie voor ${fieldText}`);
        centralOption.append(conflictNode('h4', '', 'Centrale versie bewaren'), conflictNode('p', '', `De Office-waarde voor ${fieldText} blijft op de kaart. De tabletwaarde voor deze wijziging wordt niet overgenomen.`), central);
        const tabletOption = conflictNode('section', 'admin-conflict-compact-option is-tablet');
        const tablet = conflictNode('button', 'admin-dashboard-primary', 'Bewaar tabletversie');
        tablet.type = 'button';
        tablet.dataset.conflictAction = 'retry';
        tablet.dataset.conflictId = String(conflict.id);
        tablet.setAttribute('aria-label', `Bewaar tabletversie voor ${fieldText}`);
        tabletOption.append(conflictNode('h4', '', 'Tabletversie bewaren'), conflictNode('p', '', `De tabletwaarde voor ${fieldText} blijft bewaard en wordt opnieuw aangeboden op de actuele kaart.`), tablet);
        options.append(centralOption, tabletOption);
        compact.append(options);
        wrapper.append(compact);
        return wrapper;
    }
    const choices = conflictNode('div', 'admin-conflict-action-choices');
    choices.append(renderAdminConflictChoice(conflict, 'central', 'Centrale versie bewaren', 'Centrale kaart behouden', 'Kies dit als de kaart in Office klopt en de tabletwijziging niet moet worden overgenomen.', conflict.kind === 'marker_batch'
        ? [
            'De centrale waarden blijven staan voor iedere deur in deze opdracht.',
            'De volledige tabletbewerking vervalt; er wordt niets opnieuw aangeboden.',
            'De opdracht wordt op de tablet opgeruimd.',
        ]
        : [
            'De centrale inspectieversie blijft leidend.',
            'Het volledige tabletwerk wordt bij de volgende synchronisatie opgeruimd.',
            'Er wordt niets opnieuw aangeboden.',
        ]), renderAdminConflictChoice(conflict, 'retry', 'Tabletversie bewaren', 'Tabletwijziging opnieuw aanbieden', 'Kies dit als de wijziging van de monteur wél op de centrale kaart moet komen.', conflict.kind === 'marker_batch'
        ? [
            'Alle tabletwijzigingen in deze opdracht blijven behouden.',
            'Wijzigingen aan andere deuren worden veilig toegevoegd aan de centrale kaart.',
            'Bij dezelfde deur wordt de tabletwaarde opnieuw aangeboden; zo nodig verschijnt opnieuw een keuze.',
        ]
        : [
            'DoorAtlas zet het tabletwerk op de nieuwste centrale inspectiebasis.',
            'De tablet probeert het volledige werk opnieuw op te slaan.',
            'Bij nieuwe overlap verschijnt opnieuw een conflict ter beoordeling.',
        ]));
    wrapper.append(conflictNode('p', 'admin-conflict-action-heading', 'Maak één keuze. Niet kiezen laat dit conflict open; er verandert niets.'), choices);
    return wrapper;
}
