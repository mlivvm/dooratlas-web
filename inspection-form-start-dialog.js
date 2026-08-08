(function (global) {
    const FD = global.FD = global.FD || {};
    function labelFor(formType) {
        return String(formType) === 'inspection' ? 'Opname' : 'Onderhoud';
    }
    function backendTypeFor(formType) {
        return String(formType) === 'inspection' ? 'opname' : 'onderhoud';
    }
    function timestampFor(inspection) {
        const value = Date.parse(String(inspection?.performed_at || inspection?.updated_at || inspection?.received_at || ''));
        return Number.isFinite(value) ? value : 0;
    }
    function latestInspection(inspections, formType) {
        const backendType = backendTypeFor(formType);
        return inspections
            .filter(inspection => String(inspection?.form_type || '') === backendType)
            .sort((left, right) => timestampFor(right) - timestampFor(left) || Number(right?.id || 0) - Number(left?.id || 0))[0] || null;
    }
    function createElement(tag, className = '', text = '') {
        const element = document.createElement(tag);
        if (className)
            element.className = className;
        if (text)
            element.textContent = text;
        return element;
    }
    function chooseExistingForm(input) {
        const label = labelFor(input.formType);
        const title = `Bestaand ${label.toLocaleLowerCase('nl-NL')}formulier`;
        const trigger = input.trigger instanceof HTMLElement ? input.trigger : null;
        return new Promise(resolve => {
            let settled = false;
            const overlay = createElement('div', 'inspection-form-start-overlay');
            const dialog = createElement('section', 'maintenance-close-confirm inspection-form-start-dialog');
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'inspection-form-start-title');
            dialog.setAttribute('aria-describedby', 'inspection-form-start-copy');
            dialog.setAttribute('data-inspection-form-start-dialog', 'true');
            const close = createElement('button', 'inspection-form-start-close', '×');
            close.type = 'button';
            close.setAttribute('aria-label', 'Keuze sluiten');
            const heading = createElement('h3', '', title);
            heading.id = 'inspection-form-start-title';
            const copy = createElement('p', '', `Voor deze deur bestaat al een ${label.toLocaleLowerCase('nl-NL')}formulier. Een nieuw formulier wordt als extra versie toegevoegd; het bestaande formulier blijft altijd bewaard. Wilt u een nieuw formulier maken of de bestaande versie aanpassen?`);
            copy.id = 'inspection-form-start-copy';
            const createNew = createElement('button', 'btn maintenance-action maintenance-secondary-action', 'Nieuw formulier maken');
            createNew.type = 'button';
            const editExisting = createElement('button', 'btn maintenance-action maintenance-next-action', 'Bestaand formulier aanpassen');
            editExisting.type = 'button';
            const actions = createElement('div', 'inspection-form-start-actions');
            actions.append(createNew, editExisting);
            const header = createElement('div', 'inspection-form-start-header');
            header.append(heading, close);
            dialog.append(header, copy, actions);
            overlay.append(dialog);
            const finish = (choice) => {
                if (settled)
                    return;
                settled = true;
                document.removeEventListener('keydown', onKeydown, true);
                overlay.remove();
                if (choice === null)
                    trigger?.focus();
                resolve(choice);
            };
            const onKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    finish(null);
                    return;
                }
                if (event.key !== 'Tab')
                    return;
                const focusable = [close, createNew, editExisting];
                const currentIndex = focusable.indexOf(document.activeElement);
                const nextIndex = event.shiftKey
                    ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
                    : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
                event.preventDefault();
                focusable[nextIndex]?.focus();
            };
            close.addEventListener('click', () => finish(null));
            createNew.addEventListener('click', () => finish('new'));
            editExisting.addEventListener('click', () => finish('edit'));
            overlay.addEventListener('click', event => {
                if (event.target === overlay)
                    finish(null);
            });
            document.addEventListener('keydown', onKeydown, true);
            document.body.append(overlay);
            requestAnimationFrame(() => editExisting.focus());
        });
    }
    async function resolve(input) {
        if (input.initialInspection)
            return { status: 'edit', inspection: input.initialInspection };
        if (typeof input.loadInspections !== 'function')
            return { status: 'unavailable', inspection: null };
        try {
            const loaded = await input.loadInspections();
            const existing = latestInspection(Array.isArray(loaded) ? loaded : [], input.formType);
            if (!existing)
                return { status: 'new', inspection: null };
            const choice = await chooseExistingForm(input);
            if (choice === 'new')
                return { status: 'new', inspection: null };
            if (choice === 'edit')
                return { status: 'edit', inspection: existing };
            return { status: 'cancelled', inspection: null };
        }
        catch (_error) {
            return { status: 'unavailable', inspection: null };
        }
    }
    FD.InspectionFormStartDialog = { resolve };
})(window);
