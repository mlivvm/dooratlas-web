(function (global) {
    const FD = global.FD = global.FD || {};
    let overlay = null;
    let lastTrigger = null;
    let keydownHandler = null;
    function close() {
        if (keydownHandler)
            document.removeEventListener('keydown', keydownHandler, true);
        keydownHandler = null;
        overlay?.remove();
        overlay = null;
        const trigger = lastTrigger;
        lastTrigger = null;
        trigger?.focus();
    }
    function open(input) {
        const source = String(input?.source || '').trim();
        if (!source)
            return;
        close();
        const label = String(input?.label || 'Foto').trim() || 'Foto';
        lastTrigger = input?.trigger instanceof HTMLElement ? input.trigger : null;
        const nextOverlay = document.createElement('div');
        nextOverlay.className = 'inspection-photo-viewer-overlay';
        nextOverlay.setAttribute('data-inspection-photo-viewer', 'true');
        const dialog = document.createElement('section');
        dialog.className = 'inspection-photo-viewer';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', `Foto bekijken: ${label}`);
        const heading = document.createElement('h2');
        heading.className = 'inspection-photo-viewer-title';
        heading.textContent = label;
        const closeButton = document.createElement('button');
        closeButton.className = 'inspection-photo-viewer-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Foto sluiten');
        closeButton.textContent = 'Sluiten';
        const imageFrame = document.createElement('div');
        imageFrame.className = 'inspection-photo-viewer-image-frame';
        const status = document.createElement('p');
        status.className = 'inspection-photo-viewer-status';
        status.setAttribute('aria-live', 'polite');
        status.textContent = 'Foto laden…';
        const image = document.createElement('img');
        image.className = 'inspection-photo-viewer-image';
        image.alt = label;
        image.decoding = 'async';
        image.loading = 'eager';
        image.addEventListener('load', () => {
            image.classList.add('is-loaded');
            status.hidden = true;
        }, { once: true });
        image.addEventListener('error', () => {
            status.textContent = 'Foto kon niet worden geladen.';
            image.classList.remove('is-loaded');
        }, { once: true });
        image.src = source;
        imageFrame.append(status, image);
        dialog.append(heading, closeButton, imageFrame);
        nextOverlay.appendChild(dialog);
        closeButton.addEventListener('click', close);
        nextOverlay.addEventListener('click', event => {
            if (event.target === nextOverlay)
                close();
        });
        keydownHandler = event => {
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
        document.addEventListener('keydown', keydownHandler, true);
        overlay = nextOverlay;
        document.body.appendChild(nextOverlay);
        requestAnimationFrame(() => closeButton.focus());
    }
    FD.InspectionPhotoViewer = { close, open };
})(window);
