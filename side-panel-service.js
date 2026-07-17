(function (global) {
    const FD = global.FD = global.FD || {};
    const LABEL_COLLATOR = new Intl.Collator('nl', {
        numeric: true,
        sensitivity: 'base',
    });
    function normalizeDoorIds(doorIds) {
        return Array.from(new Set(Array.from(doorIds || []).filter(Boolean))).sort();
    }
    function normalizeDoorEntries(doorIds, getDoorLabel) {
        return normalizeDoorIds(doorIds)
            .map((doorId, index) => ({
            doorId,
            index,
            label: typeof getDoorLabel === 'function' ? String(getDoorLabel(doorId) || 'Deur') : 'Deur',
        }))
            .sort((left, right) => {
            const compare = LABEL_COLLATOR.compare(left.label, right.label);
            return compare || left.index - right.index;
        });
    }
    function findDoorItem(listEl, doorId) {
        return Array.from(listEl?.querySelectorAll?.('.side-panel-item') || [])
            .find(item => item.dataset.doorId === doorId) || null;
    }
    function createDoorItem(onSelect) {
        const item = document.createElement('div');
        item.className = 'side-panel-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        const dot = document.createElement('span');
        dot.className = 'side-panel-dot';
        const text = document.createElement('span');
        text.className = 'side-panel-text';
        const label = document.createElement('span');
        label.className = 'side-panel-label';
        const status = document.createElement('span');
        status.className = 'side-panel-status';
        text.appendChild(label);
        text.appendChild(status);
        item.appendChild(dot);
        item.appendChild(text);
        item.addEventListener('click', () => {
            if (typeof onSelect === 'function')
                onSelect(item.dataset.doorId);
        });
        item.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            event.preventDefault();
            if (typeof onSelect === 'function')
                onSelect(item.dataset.doorId);
        });
        return item;
    }
    function doorColor({ isDone, condition, colors }) {
        if (isDone && condition === 'attention')
            return colors.attention || colors.done;
        if (isDone && condition === 'checking')
            return colors.checking || colors.done;
        return isDone ? colors.done : colors.todo;
    }
    function updateDoorItem(item, doorId, { selectedDoor, isDone, condition, colors, label }) {
        const labelText = label || 'Deur';
        item.dataset.doorId = doorId;
        item.setAttribute('aria-pressed', doorId === selectedDoor ? 'true' : 'false');
        item.setAttribute('aria-label', `Deur ${labelText}`);
        item.title = labelText;
        const dot = item.querySelector('.side-panel-dot');
        if (dot)
            dot.style.background = doorColor({ isDone, condition, colors });
        const labelEl = item.querySelector('.side-panel-label') || item.querySelector('span:last-child');
        if (labelEl)
            labelEl.textContent = labelText;
        const status = item.querySelector('.side-panel-status');
        if (status) {
            if (isDone && condition === 'attention') {
                status.textContent = 'Aandacht';
            }
            else if (isDone && condition === 'checking') {
                status.textContent = 'Controle';
            }
            else if (isDone) {
                status.textContent = 'Afgerond';
            }
            else {
                status.textContent = 'Open';
            }
        }
        item.classList.toggle('selected', doorId === selectedDoor);
    }
    function renderDoorList({ listEl, headerEl, doorIds, selectedDoor, getDoorStatus, getDoorCondition, getDoorLabel, colors, onSelect, }) {
        const sortedDoorEntries = normalizeDoorEntries(doorIds, getDoorLabel);
        const wanted = new Set(sortedDoorEntries.map(entry => entry.doorId));
        const existingItems = Array.from(listEl.querySelectorAll('.side-panel-item'));
        const byDoorId = new Map();
        existingItems.forEach(item => {
            const doorId = item.dataset.doorId;
            if (!doorId || !wanted.has(doorId)) {
                item.remove();
                return;
            }
            byDoorId.set(doorId, item);
        });
        sortedDoorEntries.forEach(({ doorId, label }) => {
            let item = byDoorId.get(doorId);
            if (!item) {
                item = createDoorItem(onSelect);
                byDoorId.set(doorId, item);
            }
            updateDoorItem(item, doorId, {
                selectedDoor,
                isDone: typeof getDoorStatus === 'function' ? getDoorStatus(doorId) : false,
                condition: typeof getDoorCondition === 'function' ? getDoorCondition(doorId) : 'unknown',
                colors,
                label,
            });
            listEl.appendChild(item);
        });
        if (headerEl)
            headerEl.textContent = `Deuren (${sortedDoorEntries.length})`;
        return { count: sortedDoorEntries.length };
    }
    function createController({ elements, getDoorIds, getSelectedDoor, getDoorStatus, getDoorCondition, getDoorLabel, colors, onSelect, setShellOpen, }) {
        function setOpen(open) {
            if (typeof setShellOpen === 'function') {
                setShellOpen(open);
                return;
            }
            elements.panelEl?.classList.toggle('open', open);
        }
        function close() {
            setOpen(false);
        }
        function toggle() {
            setOpen(!elements.panelEl?.classList.contains('open'));
        }
        function clear() {
            if (elements.listEl)
                elements.listEl.innerHTML = '';
            if (elements.headerEl)
                elements.headerEl.textContent = 'Deuren';
        }
        function render() {
            return renderDoorList({
                listEl: elements.listEl,
                headerEl: elements.headerEl,
                doorIds: typeof getDoorIds === 'function' ? getDoorIds() : [],
                selectedDoor: typeof getSelectedDoor === 'function' ? getSelectedDoor() : null,
                getDoorStatus,
                getDoorCondition,
                getDoorLabel,
                colors,
                onSelect,
            });
        }
        function findItem(doorId) {
            return findDoorItem(elements.listEl, doorId);
        }
        function scrollToDoor(doorId) {
            const panelItem = findItem(doorId);
            if (panelItem) {
                panelItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        return {
            clear,
            close,
            findItem,
            render,
            refresh: render,
            scrollToDoor,
            setOpen,
            toggle,
        };
    }
    FD.SidePanelService = {
        createController,
        normalizeDoorEntries,
        normalizeDoorIds,
        findDoorItem,
        renderDoorList,
    };
})(window);
