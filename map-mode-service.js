(function (global) {
    const FD = global.FD = global.FD || {};
    const MODES = ['opname', 'onderhoud', 'beveiliging'];
    const SECURITY_LEVELS = ['hoog', 'normaal', 'laag'];
    const MODE_LABELS = {
        opname: 'Opname',
        onderhoud: 'Onderhoud',
        beveiliging: 'Beveiligingsniveau',
    };
    const SECURITY_LABELS = {
        hoog: 'Hoog beveiligingsniveau',
        normaal: 'Normaal beveiligingsniveau',
        laag: 'Laag beveiligingsniveau',
        unset: 'Niet ingesteld',
    };
    const SECURITY_COLORS = {
        hoog: '#c62828',
        normaal: '#a16207',
        laag: '#15803d',
        unset: '#1a73e8',
    };
    function normalizeMapMode(value) {
        const mode = String(value || '').trim().toLowerCase();
        return MODES.includes(mode) ? mode : 'opname';
    }
    function normalizeSecurityLevel(value) {
        const level = String(value || '').trim().toLowerCase();
        return SECURITY_LEVELS.includes(level) ? level : '';
    }
    function mapModeLabel(mode) {
        return MODE_LABELS[normalizeMapMode(mode)];
    }
    function securityLevelLabel(level) {
        return SECURITY_LABELS[normalizeSecurityLevel(level) || 'unset'];
    }
    function markerSecurityLevel(marker) {
        return normalizeSecurityLevel(marker?.getAttribute?.('data-fd-security-level'));
    }
    function markerStatus(marker, mode) {
        const normalized = normalizeMapMode(mode);
        if (normalized === 'beveiliging')
            return 'blauw';
        const attribute = normalized === 'opname'
            ? 'data-fd-opname-status'
            : 'data-fd-onderhoud-status';
        return marker?.getAttribute?.(attribute) === 'groen' ? 'groen' : 'blauw';
    }
    function securityFilter(level) {
        const color = SECURITY_COLORS[level || 'unset'];
        return `drop-shadow(0 0 5px ${color}99) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.24))`;
    }
    function markerPresentation(marker, mode, colors) {
        const normalized = normalizeMapMode(mode);
        if (normalized === 'beveiliging') {
            const level = markerSecurityLevel(marker);
            return {
                color: SECURITY_COLORS[level || 'unset'],
                filter: securityFilter(level),
                statusLabel: securityLevelLabel(level),
                securityLevel: level || null,
                done: false,
            };
        }
        const done = markerStatus(marker, normalized) === 'groen';
        const color = done ? String(colors?.done || '#34a853') : String(colors?.todo || '#1a73e8');
        return {
            color,
            filter: done
                ? 'drop-shadow(0 0 5px rgba(52, 168, 83, 0.40)) drop-shadow(0 1px 2px rgba(15, 23, 42, 0.20))'
                : 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.28))',
            statusLabel: done ? 'Afgerond' : 'Open',
            securityLevel: null,
            done,
        };
    }
    function securitySummary(markers) {
        const summary = { total: 0, hoog: 0, normaal: 0, laag: 0 };
        Array.from(markers || []).forEach(marker => {
            summary.total += 1;
            const level = markerSecurityLevel(marker);
            if (level)
                summary[level] += 1;
        });
        return summary;
    }
    function updateStatusBar({ markers, statusCount, mapMode, getDoorStatus, getDoorCondition }) {
        const markerList = Array.from(markers || []);
        if (!markerList.length) {
            if (statusCount)
                statusCount.textContent = '';
            return;
        }
        if (normalizeMapMode(mapMode) === 'beveiliging') {
            const summary = securitySummary(markerList);
            if (statusCount)
                statusCount.textContent = `Beveiligingsniveau: ${summary.total} deuren`;
            return;
        }
        let done = 0;
        let attention = 0;
        markerList.forEach(marker => {
            const doorId = marker.dataset?.doorId;
            const isDone = typeof getDoorStatus === 'function' && getDoorStatus(doorId);
            if (isDone)
                done += 1;
            if (isDone && typeof getDoorCondition === 'function' && getDoorCondition(doorId) === 'attention')
                attention += 1;
        });
        if (statusCount)
            statusCount.textContent = `${done} / ${markerList.length} deuren afgerond${attention ? `, ${attention} aandacht nodig` : ''}`;
    }
    function renderSecuritySummary({ summaryEl, mapMode, markers, totalEl, highEl, normalEl, lowEl, headerEl, }) {
        if (!summaryEl)
            return;
        const enabled = normalizeMapMode(mapMode) === 'beveiliging';
        summaryEl.hidden = !enabled;
        if (!enabled)
            return;
        const summary = securitySummary(markers);
        if (totalEl)
            totalEl.textContent = String(summary.total);
        if (highEl)
            highEl.textContent = String(summary.hoog);
        if (normalEl)
            normalEl.textContent = String(summary.normaal);
        if (lowEl)
            lowEl.textContent = String(summary.laag);
        if (headerEl)
            headerEl.textContent = `Beveiligingsniveau (${summary.total})`;
    }
    function createController({ rootEl, buttonEl, labelEl, menuEl, optionEls, onChange, } = {}) {
        let activeMode = 'opname';
        function render() {
            if (labelEl)
                labelEl.textContent = mapModeLabel(activeMode);
            if (buttonEl)
                buttonEl.setAttribute('aria-expanded', menuEl?.hidden ? 'false' : 'true');
            Array.from(optionEls || []).forEach(option => {
                const selected = option.getAttribute('data-map-mode') === activeMode;
                option.setAttribute('aria-checked', selected ? 'true' : 'false');
                option.classList.toggle('active', selected);
            });
        }
        function hide() {
            if (menuEl)
                menuEl.hidden = true;
            render();
        }
        function setVisible(visible) {
            if (!rootEl)
                return;
            rootEl.hidden = !visible;
            if (!visible)
                hide();
        }
        function setMode(value, { notify = false } = {}) {
            activeMode = normalizeMapMode(value);
            render();
            if (notify && typeof onChange === 'function')
                onChange(activeMode);
            return activeMode;
        }
        buttonEl?.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!menuEl)
                return;
            menuEl.hidden = !menuEl.hidden;
            render();
        });
        Array.from(optionEls || []).forEach(option => {
            option.addEventListener('click', () => {
                setMode(option.getAttribute('data-map-mode'), { notify: true });
                hide();
            });
        });
        document.addEventListener('click', event => {
            if (rootEl?.contains(event.target))
                return;
            hide();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape')
                hide();
        });
        render();
        return { getMode: () => activeMode, hide, setMode, setVisible };
    }
    FD.MapModeService = {
        SECURITY_COLORS,
        createController,
        mapModeLabel,
        markerPresentation,
        markerSecurityLevel,
        markerStatus,
        normalizeMapMode,
        normalizeSecurityLevel,
        securityLevelLabel,
        securitySummary,
        updateStatusBar,
        renderSecuritySummary,
    };
})(window);
