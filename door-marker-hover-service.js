(function (global) {
    const FD = global.FD = global.FD || {};
    const boundMarkers = new WeakSet();
    let card = null;
    let activeMarker = null;
    let pointerDownOnActiveMarker = false;
    function ensureCard() {
        if (card)
            return card;
        card = document.createElement('aside');
        card.id = 'door-marker-hover-card';
        card.className = 'door-marker-hover-card';
        card.setAttribute('role', 'tooltip');
        card.setAttribute('aria-hidden', 'true');
        card.hidden = true;
        document.body.append(card);
        return card;
    }
    function addText(parent, className, value) {
        const line = document.createElement('span');
        line.className = className;
        line.textContent = value;
        parent.append(line);
    }
    function render(marker) {
        const target = ensureCard();
        const code = String(FD.MarkerService?.markerDoorCode?.(marker) || '').trim();
        const description = String(FD.MarkerService?.markerDoorDescription?.(marker) || '').trim();
        const securityLevel = String(FD.MapModeService?.markerSecurityLevel?.(marker) || '').trim();
        target.replaceChildren();
        addText(target, 'door-marker-hover-code', code || 'Deur zonder code');
        addText(target, 'door-marker-hover-description', description || 'Geen omschrijving');
        if (securityLevel) {
            const security = document.createElement('span');
            security.className = `door-marker-hover-security door-marker-hover-security--${securityLevel}`;
            security.textContent = FD.MapModeService?.securityLevelLabel?.(securityLevel) || securityLevel;
            target.append(security);
        }
        return target;
    }
    function position(target, marker) {
        const margin = 10;
        const gap = 14;
        const width = target.offsetWidth;
        const height = target.offsetHeight;
        const bounds = marker.getBoundingClientRect();
        const preferredLeft = bounds.right + gap;
        const preferredTop = bounds.top + (bounds.height - height) / 2;
        const left = preferredLeft + width + margin <= global.innerWidth ? preferredLeft : bounds.left - width - gap;
        const top = preferredTop + height + margin <= global.innerHeight ? preferredTop : bounds.bottom - height - gap;
        target.style.left = `${Math.max(margin, Math.min(left, global.innerWidth - width - margin))}px`;
        target.style.top = `${Math.max(margin, Math.min(top, global.innerHeight - height - margin))}px`;
    }
    function show(marker) {
        activeMarker?.removeAttribute('aria-describedby');
        activeMarker = marker;
        const target = render(marker);
        target.hidden = false;
        target.setAttribute('aria-hidden', 'false');
        marker.setAttribute('aria-describedby', target.id);
        position(target, marker);
        target.classList.add('is-visible');
    }
    function hide() {
        activeMarker?.removeAttribute('aria-describedby');
        activeMarker = null;
        pointerDownOnActiveMarker = false;
        if (!card)
            return;
        card.classList.remove('is-visible');
        card.setAttribute('aria-hidden', 'true');
        card.hidden = true;
    }
    function bind(marker) {
        if (boundMarkers.has(marker))
            return;
        boundMarkers.add(marker);
        marker.addEventListener('pointerenter', event => {
            if (event.pointerType === 'touch')
                return;
            show(marker);
        });
        marker.addEventListener('pointerleave', event => {
            if (activeMarker === marker && (pointerDownOnActiveMarker || event.buttons !== 0))
                return;
            hide();
        });
        marker.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch' && activeMarker === marker)
                pointerDownOnActiveMarker = true;
        });
        marker.addEventListener('focus', () => {
            show(marker);
        });
        marker.addEventListener('blur', () => hide());
    }
    function destroy() {
        hide();
        card?.remove();
        card = null;
    }
    document.addEventListener('scroll', () => hide(), true);
    document.addEventListener('pointerdown', event => {
        if (!activeMarker || event.pointerType === 'touch')
            return;
        const target = event.target;
        if (target && (target === activeMarker || activeMarker.contains(target)))
            pointerDownOnActiveMarker = true;
    }, true);
    document.addEventListener('pointerup', event => {
        if (!activeMarker || !pointerDownOnActiveMarker)
            return;
        pointerDownOnActiveMarker = false;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (target !== activeMarker && !activeMarker.contains(target))
            hide();
    }, true);
    document.addEventListener('pointercancel', () => hide(), true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape')
            hide();
    });
    global.addEventListener('resize', () => hide());
    FD.DoorMarkerHoverService = { bind, hide, destroy };
})(window);
