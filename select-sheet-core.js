(function (global) {
    const FD = global.FD = global.FD || {};
    const LABEL_COLLATOR = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
    const LOCATION_ALL_VALUE = '';
    const LOCATION_NONE_VALUE = '__fd_no_location__';
    const LOCATION_NONE_LABEL = 'Zonder locatie';
    const ORGANIZER_NONE_VALUE = '__fd_no_organizer__';
    const ORGANIZER_NONE_LABEL = 'Zonder locatie';
    const DIRECT_LOCATION_FILTER_LIMIT = 4;
    const COLLAPSIBLE_FLOORPLAN_LIMIT = 8;
    const UNKNOWN_FLOOR_RANK = 9999;
    const FLOOR_WORD_RANKS = new Map([
        ['begane grond', 0],
        ['benedenverdieping', 0],
        ['bg', 0],
        ['parterre', 0],
        ['eerste', 1],
        ['tweede', 2],
        ['derde', 3],
        ['vierde', 4],
        ['vijfde', 5],
        ['zesde', 6],
        ['zevende', 7],
        ['achtste', 8],
        ['negende', 9],
        ['tiende', 10],
        ['dak', 90],
    ]);
    function getSelectedOptionText(selectEl, fallback) {
        if (!selectEl?.value)
            return fallback;
        return selectEl.options[selectEl.selectedIndex]?.textContent || fallback;
    }
    function sortedWithOriginalIndex(items, labelForItem) {
        const safeItems = Array.isArray(items) ? items : [];
        const labelFn = typeof labelForItem === 'function'
            ? labelForItem
            : (item) => item?.name || item?.customer || '';
        return safeItems
            .map((item, index) => ({ item, index, label: String(labelFn(item, index) || '').trim() }))
            .sort((left, right) => LABEL_COLLATOR.compare(left.label, right.label) || left.index - right.index);
    }
    function normalizeSortText(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');
    }
    function floorRankFromText(value) {
        const text = normalizeSortText(value);
        if (!text)
            return UNKNOWN_FLOOR_RANK;
        const basement = text.match(/(?:^|\b)(?:kelder|souterrain)(?:\s*(-?\d+))?(?:\b|$)/);
        if (basement)
            return basement[1] ? -Math.abs(parseInt(basement[1], 10)) : -1;
        for (const [word, rank] of FLOOR_WORD_RANKS.entries()) {
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
            if (new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i').test(text))
                return rank;
        }
        const numbered = text.match(/(^|\b)(-?\d{1,2})(?:e|de|ste)?(?:\s*(?:verdieping|etage|vloer))?(\b|$)/i);
        if (!numbered)
            return UNKNOWN_FLOOR_RANK;
        const rank = parseInt(numbered[2], 10);
        return Number.isFinite(rank) ? rank : UNKNOWN_FLOOR_RANK;
    }
    function splitDisplayBaseAndFloor(label) {
        const text = String(label || '').trim();
        if (!text)
            return { baseLabel: '', floorLabel: '', floorRank: UNKNOWN_FLOOR_RANK };
        const parts = text.split(/\s+[-–—]\s+/).map(part => part.trim()).filter(Boolean);
        if (parts.length > 1) {
            const last = parts[parts.length - 1];
            const rank = floorRankFromText(last);
            if (rank !== UNKNOWN_FLOOR_RANK) {
                return { baseLabel: parts.slice(0, -1).join(' - '), floorLabel: last, floorRank: rank };
            }
        }
        return { baseLabel: text, floorLabel: '', floorRank: UNKNOWN_FLOOR_RANK };
    }
    function floorplanDisplayParts(floorplan) {
        const building = String(floorplan?.building || '').trim();
        const floorLabel = String(floorplan?.floorLabel || '').trim();
        return { building, floorLabel };
    }
    function floorplanDisplayName(floorplan) {
        const { building, floorLabel } = floorplanDisplayParts(floorplan);
        if (building && floorLabel)
            return `${building} - ${floorLabel}`;
        return floorLabel || building || String(floorplan?.name || '').trim();
    }
    function floorplanLocationName(floorplan) {
        return String(floorplan?.building || '').trim();
    }
    function floorplanOrganizerValue(floorplan) {
        const location = floorplanLocationName(floorplan);
        if (location)
            return `location:${location}`;
        return ORGANIZER_NONE_VALUE;
    }
    function floorplanOrganizerLabel(value, fallback = '') {
        const text = String(value || '').trim();
        if (!text || text === ORGANIZER_NONE_VALUE)
            return ORGANIZER_NONE_LABEL;
        if (text.startsWith('location:'))
            return text.slice(text.indexOf(':') + 1);
        return fallback || text;
    }
    function floorplanLocationFilterValue(floorplan) {
        return floorplanLocationName(floorplan) || LOCATION_NONE_VALUE;
    }
    function floorplanLocationFilterLabel(value) {
        return value === LOCATION_NONE_VALUE ? LOCATION_NONE_LABEL : String(value || '').trim();
    }
    function normalizeLocationName(value) {
        return String(value || '').trim().toLowerCase();
    }
    function getCustomerLocationDetails(customer, locationName) {
        const normalized = normalizeLocationName(locationName);
        if (!normalized || !Array.isArray(customer?.locations))
            return null;
        const location = customer.locations.find((item) => normalizeLocationName(item?.name) === normalized);
        if (!location)
            return null;
        const street = String(location.street || location.address || '').trim();
        const postalCode = String(location.postalCode || '').trim();
        const city = String(location.city || '').trim();
        const notes = String(location.notes || location.note || '').trim();
        const address = [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        if (!address && !notes)
            return null;
        return {
            name: String(location.name || locationName || '').trim(),
            street,
            postalCode,
            city,
            notes,
            address,
            note: notes,
        };
    }
    function getFloorplanLocationDetails(customer, floorplan) {
        const details = getCustomerLocationDetails(customer, floorplanLocationName(floorplan));
        if (details)
            return details;
        const street = String(floorplan?.locationStreet || floorplan?.locationAddress || floorplan?.address || '').trim();
        const postalCode = String(floorplan?.locationPostalCode || '').trim();
        const city = String(floorplan?.locationCity || '').trim();
        const notes = String(floorplan?.locationNotes || floorplan?.locationNote || floorplan?.note || '').trim();
        const address = [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        if (!address && !notes)
            return null;
        return { name: floorplanLocationName(floorplan) || 'Locatie', street, postalCode, city, notes, address, note: notes };
    }
    function buildLocationFilterOptions(items, options = {}) {
        const safeItems = Array.isArray(items) ? items : [];
        const counts = new Map();
        let hasRealLocation = false;
        safeItems.forEach(item => {
            const value = floorplanLocationFilterValue(item);
            if (value !== LOCATION_NONE_VALUE)
                hasRealLocation = true;
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        if (!hasRealLocation)
            return [];
        const locationOptions = Array.from(counts.entries())
            .sort((left, right) => {
            const leftNone = left[0] === LOCATION_NONE_VALUE;
            const rightNone = right[0] === LOCATION_NONE_VALUE;
            if (leftNone !== rightNone)
                return leftNone ? 1 : -1;
            return LABEL_COLLATOR.compare(floorplanLocationFilterLabel(left[0]), floorplanLocationFilterLabel(right[0]));
        })
            .map(([value, count]) => ({ value, label: floorplanLocationFilterLabel(value), count }));
        return [{ value: LOCATION_ALL_VALUE, label: options.allLabel || 'Alle locaties', count: safeItems.length }, ...locationOptions];
    }
    function floorplanSortKey(floorplan, labelOverride = '') {
        const displayLabel = String(labelOverride || floorplanDisplayName(floorplan)).trim();
        const building = floorplanLocationName(floorplan);
        const explicitFloor = String(floorplan?.floorLabel || '').trim();
        const parsed = splitDisplayBaseAndFloor(displayLabel);
        const floorLabel = explicitFloor || parsed.floorLabel;
        const rawLevelOrder = floorplan?.levelOrder ?? floorplan?.level_order;
        const parsedLevelOrder = rawLevelOrder === '' || rawLevelOrder === null || rawLevelOrder === undefined
            ? null
            : Number(rawLevelOrder);
        const floorRank = parsedLevelOrder !== null && Number.isFinite(parsedLevelOrder)
            ? parsedLevelOrder
            : floorRankFromText(floorLabel);
        return { baseLabel: building || parsed.baseLabel || displayLabel, floorLabel, floorRank, displayLabel };
    }
    function compareFloorplanDisplayOrder(leftFloorplan, rightFloorplan, leftLabel = '', rightLabel = '') {
        const left = floorplanSortKey(leftFloorplan, leftLabel);
        const right = floorplanSortKey(rightFloorplan, rightLabel);
        const baseCompare = LABEL_COLLATOR.compare(left.baseLabel, right.baseLabel);
        if (baseCompare)
            return baseCompare;
        if (left.floorRank !== right.floorRank)
            return left.floorRank - right.floorRank;
        const floorCompare = LABEL_COLLATOR.compare(left.floorLabel, right.floorLabel);
        if (floorCompare)
            return floorCompare;
        return LABEL_COLLATOR.compare(left.displayLabel, right.displayLabel);
    }
    FD.SelectSheetCore = {
        LOCATION_ALL_VALUE,
        LOCATION_NONE_VALUE,
        LOCATION_NONE_LABEL,
        ORGANIZER_NONE_VALUE,
        ORGANIZER_NONE_LABEL,
        DIRECT_LOCATION_FILTER_LIMIT,
        COLLAPSIBLE_FLOORPLAN_LIMIT,
        buildLocationFilterOptions,
        compareFloorplanDisplayOrder,
        floorplanOrganizerLabel,
        floorplanOrganizerValue,
        floorplanSortKey,
        floorplanLocationFilterLabel,
        floorplanLocationFilterValue,
        floorplanLocationName,
        getCustomerLocationDetails,
        getFloorplanLocationDetails,
        floorplanDisplayName,
        floorplanDisplayParts,
        getSelectedOptionText,
        sortedWithOriginalIndex,
    };
})(window);
