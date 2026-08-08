(function (global) {
    const FD = global.FD = global.FD || {};
    function renderNulBeurt(input) {
        const { Flow, element, selectOption, state } = input;
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
    function renderProgress(input) {
        const { element, index, initialInspection, list, rerender, state } = input;
        const progress = element('div', { className: 'maintenance-progress', 'data-maintenance-step-count': list.length });
        progress.append(element('span', { className: 'maintenance-progress-copy', text: `Stap ${index + 1} van ${list.length}` }));
        const canNavigate = Boolean(initialInspection);
        const dots = element('div', {
            className: `maintenance-progress-dots${canNavigate ? ' is-editable' : ''}`,
            role: canNavigate ? 'navigation' : 'img',
            'aria-label': canNavigate
                ? `Onderhoudsstappen. Stap ${index + 1} van ${list.length}. Kies een stap om die te openen.`
                : `Stap ${index + 1} van ${list.length}`,
        });
        dots.style.setProperty('--maintenance-progress-count', String(Math.max(1, list.length)));
        list.forEach((item, itemIndex) => {
            const className = `maintenance-progress-dot${itemIndex < index ? ' is-complete' : ''}${itemIndex === index ? ' is-current' : ''}`;
            if (!canNavigate) {
                dots.append(element('span', { className, 'aria-hidden': 'true' }));
                return;
            }
            const button = element('button', {
                className,
                type: 'button',
                'aria-current': itemIndex === index ? 'step' : null,
                'aria-label': `Ga naar stap ${itemIndex + 1}: ${item.title || `onderdeel ${itemIndex + 1}`}`,
                title: `Stap ${itemIndex + 1}: ${item.title || `onderdeel ${itemIndex + 1}`}`,
            });
            button.addEventListener('click', () => {
                if (state.saving || itemIndex === index)
                    return;
                state.stepId = item.id;
                rerender();
            });
            dots.append(button);
        });
        progress.append(dots);
        return progress;
    }
    function wrapInputWithSuffix(input) {
        const { control, element, item } = input;
        if (item?.name !== 'controle_tijd_besteed_meerwerk')
            return control;
        control.setAttribute('inputmode', 'numeric');
        control.setAttribute('aria-label', `${item.label} in minuten`);
        const wrap = element('div', { className: 'maintenance-input-with-suffix' });
        wrap.append(control, element('span', { className: 'maintenance-input-suffix', 'aria-hidden': 'true', text: 'min' }));
        return wrap;
    }
    FD.MaintenanceFormRendererUi = { renderNulBeurt, renderProgress, wrapInputWithSuffix };
})(window);
