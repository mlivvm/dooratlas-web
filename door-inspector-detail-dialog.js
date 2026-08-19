(function (global) {
    const FD = global.FD = global.FD || {};
    let overlay = null;
    let trigger = null;
    let keydown = null;
    function createElement(tag, className = '', text = '') {
        const node = document.createElement(tag);
        if (className)
            node.className = className;
        if (text)
            node.textContent = text;
        return node;
    }
    function close() {
        if (keydown)
            document.removeEventListener('keydown', keydown, true);
        keydown = null;
        overlay?.remove();
        overlay = null;
        const returnFocus = trigger;
        trigger = null;
        returnFocus?.focus();
    }
    function open({ title, content, trigger: nextTrigger }) {
        close();
        trigger = nextTrigger;
        const nextOverlay = createElement('div', 'door-inspector-detail-overlay');
        const dialog = createElement('section', 'door-inspector-detail-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', title);
        const heading = createElement('h3', 'door-inspector-detail-title', title);
        const closeButton = createElement('button', 'door-inspector-detail-close', 'Sluiten');
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', `${title} sluiten`);
        closeButton.addEventListener('click', close);
        const header = createElement('div', 'door-inspector-detail-header');
        header.append(heading, closeButton);
        dialog.append(header, content);
        nextOverlay.appendChild(dialog);
        nextOverlay.addEventListener('click', event => {
            if (event.target === nextOverlay)
                close();
        });
        keydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                close();
            }
            else if (event.key === 'Tab') {
                event.preventDefault();
                event.stopImmediatePropagation();
                closeButton.focus();
            }
        };
        document.addEventListener('keydown', keydown, true);
        overlay = nextOverlay;
        document.body.appendChild(nextOverlay);
        requestAnimationFrame(() => closeButton.focus());
    }
    FD.DoorInspectorDetailDialog = { close, open };
})(window);
