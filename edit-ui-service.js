(function (global) {
    const FD = global.FD = global.FD || {};
    function createEditPopupController({ elements, documentRef = document, onBeforeHide = () => { } }) {
        let activeInput = null;
        function isTabletTouchViewport() {
            return Boolean(global.matchMedia?.('(hover: none) and (pointer: coarse) and (min-width: 601px)').matches);
        }
        function reflowPopupIntoVisibleViewport() {
            if (!isTabletTouchViewport() || elements.popupEl.style.display === 'none')
                return;
            const viewport = global.visualViewport;
            const width = Math.max(1, viewport?.width || global.innerWidth);
            const height = Math.max(1, viewport?.height || global.innerHeight);
            const left = viewport?.offsetLeft || 0;
            const top = viewport?.offsetTop || 0;
            const topbarBottom = documentRef.querySelector('.topbar')?.getBoundingClientRect().bottom || top;
            const contentTop = Math.max(top, Math.min(top + height, topbarBottom + 8));
            const availableHeight = Math.max(1, Math.floor(top + height - contentTop - 16));
            elements.popupEl.style.maxHeight = `${availableHeight}px`;
            elements.popupEl.style.overflowY = 'auto';
            elements.popupEl.style.left = `${Math.round(left + width / 2)}px`;
            elements.popupEl.style.top = `${Math.round(contentTop + availableHeight / 2)}px`;
            elements.popupEl.style.transform = 'translate(-50%, -50%)';
        }
        function schedulePopupViewportReflow() {
            const schedule = global.requestAnimationFrame || ((callback) => {
                callback(0);
                return 0;
            });
            schedule(() => reflowPopupIntoVisibleViewport());
        }
        function renderButtons(buttons) {
            elements.buttonsEl.innerHTML = '';
            const primaryAction = buttons.length > 0 ? buttons[0].action : null;
            buttons.forEach(button => {
                const el = documentRef.createElement('button');
                el.textContent = button.text;
                el.style.background = button.color || '#1a73e8';
                el.style.color = button.textColor || 'white';
                el.addEventListener('click', button.action);
                elements.buttonsEl.appendChild(el);
            });
            return primaryAction;
        }
        function showShell(title) {
            elements.titleEl.textContent = title;
            elements.errorEl.textContent = '';
            elements.customEl.innerHTML = '';
            elements.popupEl.style.top = '50%';
            elements.popupEl.style.left = '50%';
            elements.popupEl.style.right = '';
            elements.popupEl.style.bottom = '';
            elements.popupEl.style.maxHeight = '';
            elements.popupEl.style.overflowY = '';
            elements.popupEl.style.flexDirection = '';
            elements.popupEl.style.transform = 'translate(-50%, -50%)';
            elements.popupEl.style.display = 'block';
            elements.overlayEl.style.display = 'block';
            elements.buttonsEl.style.flex = '';
            elements.customEl.style.flex = '';
            elements.customEl.style.minHeight = '';
            elements.customEl.style.overflowY = '';
        }
        function show(title, defaultValue, buttons) {
            showShell(title);
            elements.customEl.style.display = 'none';
            const primaryAction = renderButtons(buttons);
            if (defaultValue === null) {
                elements.inputRowEl.style.display = 'none';
                activeInput = null;
            }
            else {
                elements.inputRowEl.style.display = 'flex';
                elements.inputEl.value = defaultValue || '';
                elements.inputEl.focus();
                activeInput = elements.inputEl;
            }
            schedulePopupViewportReflow();
            elements.inputEl.onkeydown = (event) => {
                if (event.key === 'Enter' && primaryAction)
                    primaryAction();
            };
        }
        function showCustom(title, renderCustom, buttons) {
            showShell(title);
            elements.inputRowEl.style.display = 'none';
            elements.inputEl.onkeydown = null;
            elements.customEl.style.display = 'block';
            elements.popupEl.style.display = 'flex';
            elements.popupEl.style.flexDirection = 'column';
            elements.buttonsEl.style.flex = '0 0 auto';
            elements.customEl.style.flex = '1 1 auto';
            elements.customEl.style.minHeight = '0';
            elements.customEl.style.overflowY = 'auto';
            activeInput = renderCustom(elements.customEl, documentRef);
            renderButtons(buttons);
            activeInput?.focus();
            schedulePopupViewportReflow();
        }
        function hide() {
            onBeforeHide();
            elements.popupEl.style.display = 'none';
            elements.overlayEl.style.display = 'none';
            activeInput = null;
            elements.customEl.innerHTML = '';
            elements.customEl.style.display = 'none';
        }
        global.addEventListener?.('resize', schedulePopupViewportReflow);
        global.visualViewport?.addEventListener?.('resize', schedulePopupViewportReflow);
        global.visualViewport?.addEventListener?.('scroll', schedulePopupViewportReflow);
        return { getActiveInput: () => activeInput, hide, show, showCustom };
    }
    function createCancelEditController({ openButtonEl, overlayEl, popupEl, confirmButtonEl, cancelButtonEl, hasPendingChanges = () => false, onCancel = () => { }, }) {
        let bound = false;
        const dialog = FD.UIShellService.createPopupPair({ overlayEl, popupEl });
        function requestCancel() {
            if (!hasPendingChanges()) {
                onCancel();
                return;
            }
            dialog.show();
        }
        function confirmCancel() {
            dialog.hide();
            onCancel();
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            openButtonEl.addEventListener('click', requestCancel);
            confirmButtonEl.addEventListener('click', confirmCancel);
            cancelButtonEl.addEventListener('click', dialog.hide);
            overlayEl.addEventListener('click', dialog.hide);
        }
        return {
            bind,
            hide: dialog.hide,
            requestCancel,
        };
    }
    function valueFromTouch(sliderEl, event) {
        const rect = sliderEl.getBoundingClientRect();
        const touchEvent = event;
        const mouseEvent = event;
        const x = (touchEvent.touches ? touchEvent.touches[0].clientX : mouseEvent.clientX) - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const min = parseInt(sliderEl.min, 10);
        const max = parseInt(sliderEl.max, 10);
        return Math.round(min + ratio * (max - min));
    }
    function createMarkerSizeSliderController({ sliderEl, labelEl, getMaxValue = () => Infinity, onChange = () => { }, }) {
        let bound = false;
        function setValue(value) {
            const max = getMaxValue();
            const safeValue = Number.isFinite(max) ? Math.min(value, max) : value;
            sliderEl.value = safeValue;
            labelEl.textContent = safeValue;
            onChange(safeValue);
            return safeValue;
        }
        function setRange({ min, max, value }) {
            if (min !== undefined)
                sliderEl.min = min;
            if (max !== undefined)
                sliderEl.max = max;
            if (value !== undefined)
                setValue(value);
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            sliderEl.addEventListener('input', (event) => {
                setValue(parseInt(event.target.value, 10));
            });
            sliderEl.addEventListener('touchstart', (event) => {
                event.preventDefault();
                setValue(valueFromTouch(sliderEl, event));
            }, { passive: false });
            sliderEl.addEventListener('touchmove', (event) => {
                event.preventDefault();
                setValue(valueFromTouch(sliderEl, event));
            }, { passive: false });
        }
        return {
            bind,
            setRange,
            setValue,
        };
    }
    function createQrScannerController({ scanButtonEl, closeButtonEl, overlayEl, statusEl, readerId, scannerFactory = () => new global.Html5Qrcode(readerId), ensureLibrary = async () => { }, onScan = () => { }, logger = console, }) {
        let bound = false;
        let scanner = null;
        async function start() {
            overlayEl.style.display = 'flex';
            statusEl.textContent = 'Camera starten...';
            try {
                await ensureLibrary();
                scanner = scannerFactory();
                await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
                    onScan(decodedText);
                    stop();
                }, () => { });
                statusEl.textContent = 'Richt de camera op een QR code';
            }
            catch (err) {
                scanner = null;
                logger.error('Camera fout:', err);
                statusEl.textContent = 'Camera niet beschikbaar. Controleer de permissies.';
            }
        }
        async function stop() {
            if (scanner) {
                try {
                    await scanner.stop();
                    scanner.clear();
                }
                catch (err) { }
                scanner = null;
            }
            overlayEl.style.display = 'none';
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            scanButtonEl.addEventListener('click', start);
            closeButtonEl.addEventListener('click', stop);
        }
        return {
            bind,
            isActive: () => Boolean(scanner),
            start,
            stop,
        };
    }
    FD.EditUIService = {
        createCancelEditController,
        createEditPopupController,
        createMarkerSizeSliderController,
        createQrScannerController,
        valueFromTouch,
    };
})(window);
