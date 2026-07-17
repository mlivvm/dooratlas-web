(function (global) {
    const FD = global.FD = global.FD || {};
    function createCombobox({ trigger, triggerLabel, dropdown, searchInput, listbox, select, placeholder = 'Maak een keuze', onSelected = () => { }, }) {
        let options = [];
        let activeIndex = -1;
        let selectedValue = '';
        const popup = dropdown.closest('#upload-popup');
        function readOptions() {
            return Array.from(select.options || [])
                .filter((option) => String(option.value || ''))
                .map((option) => ({ value: String(option.value), label: String(option.textContent || '').trim() }));
        }
        function filteredOptions() {
            const query = String(searchInput.value || '').trim().toLocaleLowerCase('nl');
            return options.filter(item => !query || item.label.toLocaleLowerCase('nl').includes(query));
        }
        function syncPopupOverflow() {
            if (!popup)
                return;
            const hasOpenDropdown = Boolean(popup.querySelector('.upload-combobox-dropdown:not([hidden])'));
            popup.classList.toggle('has-open-combobox', hasOpenDropdown);
        }
        function close() {
            dropdown.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.removeAttribute('aria-activedescendant');
            activeIndex = -1;
            syncPopupOverflow();
        }
        function positionDropdown() {
            const rect = trigger.getBoundingClientRect();
            const viewportHeight = global.innerHeight || document.documentElement.clientHeight;
            const below = viewportHeight - rect.bottom - 16;
            const above = rect.top - 16;
            const openAbove = below < 240 && above > below;
            dropdown.classList.toggle('is-above', openAbove);
            dropdown.style.setProperty('--upload-combobox-max-height', `${Math.max(120, openAbove ? above : below)}px`);
        }
        function render() {
            const filtered = filteredOptions();
            listbox.innerHTML = '';
            if (!filtered.length) {
                const empty = global.document.createElement('div');
                empty.className = 'upload-combobox-empty';
                empty.textContent = 'Geen resultaten';
                listbox.appendChild(empty);
            }
            else {
                filtered.forEach((item, index) => {
                    const button = global.document.createElement('button');
                    button.type = 'button';
                    button.id = `${listbox.id}-option-${index}`;
                    button.className = 'upload-combobox-option';
                    button.setAttribute('role', 'option');
                    button.setAttribute('aria-selected', String(item.value === selectedValue));
                    button.classList.toggle('is-active', index === activeIndex);
                    button.textContent = item.label;
                    button.addEventListener('pointerdown', event => event.preventDefault());
                    button.addEventListener('click', () => selectValue(item.value, { emit: true }));
                    listbox.appendChild(button);
                });
            }
            const active = listbox.querySelector('.upload-combobox-option.is-active');
            if (active) {
                searchInput.setAttribute('aria-activedescendant', active.id);
                active.scrollIntoView({ block: 'nearest' });
            }
            else
                searchInput.removeAttribute('aria-activedescendant');
        }
        function open(initialQuery = '') {
            if (trigger.disabled)
                return;
            document.dispatchEvent(new CustomEvent('upload-combobox-open', { detail: dropdown }));
            searchInput.value = initialQuery;
            activeIndex = -1;
            positionDropdown();
            dropdown.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            searchInput.setAttribute('aria-expanded', 'true');
            render();
            syncPopupOverflow();
            global.setTimeout(() => searchInput.focus(), 0);
        }
        function selectValue(value, { emit = false } = {}) {
            selectedValue = String(value || '');
            select.value = selectedValue;
            const selected = options.find(item => item.value === selectedValue);
            triggerLabel.textContent = selected?.label || placeholder;
            trigger.title = selected?.label || '';
            searchInput.value = '';
            close();
            if (emit)
                onSelected(selectedValue);
        }
        function clearSelection({ emit = false } = {}) {
            const hadSelection = Boolean(selectedValue);
            selectValue('', { emit: false });
            if (emit && hadSelection)
                onSelected('');
        }
        function refresh({ preserveSelection = true } = {}) {
            const previous = preserveSelection ? String(select.value || selectedValue || '') : '';
            options = readOptions();
            const nextValue = options.some(item => item.value === previous) ? previous : '';
            selectValue(nextValue, { emit: false });
        }
        function setDisabled(disabled) {
            trigger.disabled = disabled;
            searchInput.disabled = disabled;
            select.disabled = disabled;
            if (disabled)
                close();
        }
        trigger.addEventListener('click', () => dropdown.hidden ? open() : close());
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (dropdown.hidden)
                    open();
            }
            else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                open(event.key);
            }
        });
        searchInput.addEventListener('input', () => {
            activeIndex = -1;
            render();
        });
        searchInput.addEventListener('keydown', (event) => {
            const filtered = filteredOptions();
            if (event.key === 'Escape') {
                close();
                trigger.focus();
            }
            else if (event.key === 'Tab')
                close();
            else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                activeIndex = Math.max(0, Math.min(filtered.length - 1, activeIndex + direction));
                render();
            }
            else if (event.key === 'Enter' && filtered.length && (activeIndex >= 0 || filtered.length === 1)) {
                event.preventDefault();
                selectValue(filtered[Math.max(0, activeIndex)].value, { emit: true });
                trigger.focus();
            }
        });
        document.addEventListener('pointerdown', event => {
            if (!dropdown.hidden && !dropdown.parentElement?.contains(event.target))
                close();
        });
        document.addEventListener('upload-combobox-open', (event) => {
            if (event.detail !== dropdown)
                close();
        });
        global.addEventListener('resize', () => {
            if (!dropdown.hidden)
                positionDropdown();
        });
        refresh({ preserveSelection: false });
        return { clearSelection, close, open, refresh, selectValue, setDisabled };
    }
    FD.UploadCombobox = { createCombobox };
})(window);
