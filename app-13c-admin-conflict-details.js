function adminConflictDetailNode(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    if (text)
        node.textContent = text;
    return node;
}
function adminConflictStatusLabel(status) {
    const labels = {
        zelfde_marker: 'Botsing: dezelfde deur gewijzigd',
        geen_overlap: 'Geen botsing',
        centrale_verwijderd: 'Deur ontbreekt op centrale kaart',
        basis_ontbreekt: 'Oorspronkelijke kaartversie ontbreekt',
        nieuwe_marker: 'Nieuwe deur op tablet',
        controle_nodig: 'Handmatige controle nodig',
    };
    return labels[status] || 'Beoordeling nodig';
}
function adminConflictChangeSentence(field, value) {
    const label = field.label || 'waarde';
    const article = field.field === 'position' && label === 'middenpunt' ? 'het' : 'de';
    if (field.field === 'position') {
        return `Verplaatste ${article} ${label} van ${field.base_value} naar ${value}`;
    }
    if (field.field === 'delete') {
        return `Wilde de deur op de kaart ${value}; de oorspronkelijke keuze was ${field.base_value}`;
    }
    return `Veranderde ${article} ${label} van ${field.base_value} naar ${value}`;
}
function renderAdminConflictMarkerDetails(details, technician = 'Onbekende monteur', deviceLabel = 'tablet') {
    if (!details.length)
        return null;
    const section = adminConflictDetailNode('section', 'admin-conflict-diff');
    const overlapCount = details.filter(detail => detail.overlap).length;
    const fieldConflict = details.some(detail => detail.field_conflicts?.length);
    section.append(adminConflictDetailNode('h4', '', fieldConflict ? 'Dit is de enige botsende wijziging' : 'Wat is precies gewijzigd?'), adminConflictDetailNode('p', 'admin-conflict-diff-intro', fieldConflict
        ? 'Dezelfde waarde is na het openen zowel op tablet als in Office aangepast. Kies hieronder welke waarde moet blijven; andere velden zijn al automatisch verwerkt.'
        : overlapCount
            ? `Hieronder staan alle wijzigingen in deze opdracht. ${overlapCount} deurmarkering${overlapCount === 1 ? '' : 'en'} vragen een keuze; de overige wijzigingen zijn apart gecontroleerd.`
            : 'Hieronder staan alle wijzigingen in deze opdracht. Er is geen inhoudelijke botsing vastgesteld; controleer wel de oorzaak van deze beoordeling.'));
    const markerList = adminConflictDetailNode('div', 'admin-conflict-marker-list');
    details.forEach(detail => {
        if (detail.field_conflicts?.length) {
            const labels = detail.field_conflicts.map(field => field.label).join(' en ');
            const card = adminConflictDetailNode('article', 'admin-conflict-field-card');
            const heading = adminConflictDetailNode('div', 'admin-conflict-field-heading');
            heading.append(adminConflictDetailNode('strong', '', detail.marker_label), adminConflictDetailNode('span', 'admin-conflict-marker-status is-overlap', `Botsing over ${labels}`));
            card.append(heading);
            detail.field_conflicts.forEach(field => {
                const comparison = adminConflictDetailNode('section', 'admin-conflict-field-comparison');
                comparison.append(adminConflictDetailNode('p', 'admin-conflict-field-base', `Oorspronkelijke waarde · ${field.label}: ${field.base_value}`));
                const choices = adminConflictDetailNode('div', 'admin-conflict-field-sides');
                const tablet = adminConflictDetailNode('div', 'admin-conflict-field-side is-tablet');
                tablet.append(adminConflictDetailNode('span', 'admin-conflict-field-source', `${technician} · ${deviceLabel}`), adminConflictDetailNode('strong', '', adminConflictChangeSentence(field, field.tablet_value)));
                const central = adminConflictDetailNode('div', 'admin-conflict-field-side is-central');
                const centralTime = field.central_changed_at ? ` · ${conflictDate(field.central_changed_at)}` : '';
                central.append(adminConflictDetailNode('span', 'admin-conflict-field-source', `${field.central_actor} · ${field.central_source}${centralTime}`), adminConflictDetailNode('strong', '', adminConflictChangeSentence(field, field.central_value)));
                choices.append(tablet, central);
                comparison.append(choices);
                card.append(comparison);
            });
            card.append(adminConflictDetailNode('p', 'admin-conflict-marker-hint', detail.choice_hint));
            markerList.append(card);
            return;
        }
        const card = adminConflictDetailNode('article', `admin-conflict-marker ${detail.overlap ? 'is-overlap' : 'is-disjoint'}`);
        const heading = adminConflictDetailNode('div', 'admin-conflict-marker-heading');
        heading.append(adminConflictDetailNode('strong', '', detail.marker_label), adminConflictDetailNode('span', `admin-conflict-marker-status ${detail.overlap ? 'is-overlap' : 'is-disjoint'}`, adminConflictStatusLabel(detail.status)));
        const columns = adminConflictDetailNode('div', 'admin-conflict-marker-columns');
        const tablet = adminConflictDetailNode('div', 'admin-conflict-marker-value');
        const central = adminConflictDetailNode('div', 'admin-conflict-marker-value');
        tablet.append(adminConflictDetailNode('h5', '', 'Opgeslagen op tablet'));
        central.append(adminConflictDetailNode('h5', '', 'Centrale kaart nu'));
        const tabletList = adminConflictDetailNode('ul');
        const centralList = adminConflictDetailNode('ul');
        detail.tablet_changes.forEach(item => tabletList.append(adminConflictDetailNode('li', '', item)));
        detail.central_state.forEach(item => centralList.append(adminConflictDetailNode('li', '', item)));
        tablet.append(tabletList);
        central.append(centralList);
        columns.append(tablet, central);
        card.append(heading, columns, adminConflictDetailNode('p', 'admin-conflict-marker-hint', detail.choice_hint));
        markerList.append(card);
    });
    section.append(markerList);
    return section;
}
function renderAdminConflictChoice(conflict, action, kicker, title, whenToChoose, outcomes) {
    const choice = conflictNode('section', `admin-conflict-action-choice admin-conflict-action-choice-${action}`);
    const outcomeId = `admin-conflict-${conflict.id}-${action}-outcome`;
    const outcome = conflictNode('div', 'admin-conflict-action-outcome');
    outcome.id = outcomeId;
    outcome.append(conflictNode('strong', '', 'Wat gebeurt er?'));
    const list = conflictNode('ul', 'admin-conflict-action-list');
    outcomes.forEach(item => list.append(conflictNode('li', '', item)));
    outcome.append(list);
    const buttonLabel = action === 'central' ? 'Centrale versie bewaren' : 'Tabletwijziging opnieuw aanbieden';
    const button = conflictNode('button', action === 'central' ? 'admin-dashboard-secondary' : 'admin-dashboard-primary', buttonLabel);
    button.type = 'button';
    button.dataset.conflictAction = action;
    button.dataset.conflictId = String(conflict.id);
    button.setAttribute('aria-label', `${buttonLabel} voor ${conflictFormLabel(conflict.form_type)}`);
    button.setAttribute('aria-describedby', outcomeId);
    choice.append(conflictNode('span', 'admin-conflict-action-kicker', kicker), conflictNode('h4', '', title), conflictNode('p', 'admin-conflict-action-when', whenToChoose), outcome, button);
    return choice;
}
