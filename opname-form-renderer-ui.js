(function (global) {
    const FD = global.FD = global.FD || {};
    function renderProgress(input) {
        const { element, index, initialInspection, list, rerender, state } = input;
        const progress = element('div', { className: 'opname-progress', 'data-opname-step-count': list.length });
        progress.append(element('span', { className: 'opname-progress-copy', text: `Stap ${index + 1} van ${list.length}` }));
        const canNavigate = Boolean(initialInspection);
        const dots = element('div', {
            className: `opname-progress-dots${canNavigate ? ' is-editable' : ''}`,
            role: canNavigate ? 'navigation' : 'img',
            'aria-label': canNavigate
                ? `Opnamestappen. Stap ${index + 1} van ${list.length}. Kies een stap om die te openen.`
                : `Stap ${index + 1} van ${list.length}`,
        });
        dots.style.setProperty('--opname-progress-count', String(Math.max(1, list.length)));
        list.forEach((item, itemIndex) => {
            const className = `opname-progress-dot${itemIndex < index ? ' is-complete' : ''}${itemIndex === index ? ' is-current' : ''}`;
            if (!canNavigate) {
                dots.append(element('span', { className, 'aria-hidden': 'true' }));
                return;
            }
            const button = element('button', {
                className, type: 'button', 'aria-current': itemIndex === index ? 'step' : null,
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
    function focusFirstInvalid(modal) {
        requestAnimationFrame(() => {
            const target = modal.querySelector('[data-opname-field-wrap].opname-field--invalid button, [data-opname-field-wrap].opname-field--invalid input, [data-opname-field-wrap].opname-field--invalid select, [data-opname-field-wrap].opname-field--invalid textarea');
            target?.focus();
        });
    }
    function displayOption(value) {
        const text = String(value || '');
        return text === 'HSD_deur' ? 'HSD-deur' : text;
    }
    FD.OpnameFormRendererUi = { displayOption, focusFirstInvalid, renderProgress };
})(window);
