// The Office map is the touch reference implementation. Keeping its pinch
// lifecycle here makes the fieldapp use the same TouchList semantics: both
// fingers count even when one starts on a door marker.
(function (global) {
    const FD = global.FD = global.FD || {};
    const SETTLE_MS = 400;
    function bind(input) {
        const viewport = FD.ViewportService;
        if (!viewport)
            throw new Error('ViewportService ontbreekt.');
        let initialDistance = 0;
        let initialScale = 1;
        let active = false;
        let settleTimer = null;
        const clearSettleTimer = () => {
            if (settleTimer === null)
                return;
            global.clearTimeout(settleTimer);
            settleTimer = null;
        };
        const settle = () => {
            clearSettleTimer();
            if (!active)
                return;
            settleTimer = global.setTimeout(() => {
                settleTimer = null;
                active = false;
                input.onSettled?.();
            }, SETTLE_MS);
        };
        const onStart = (event) => {
            if (event.touches.length < 2)
                return;
            event.preventDefault();
            clearSettleTimer();
            active = true;
            initialDistance = viewport.touchDistance(event.touches);
            initialScale = input.getScale();
            input.onStart?.();
        };
        const onMove = (event) => {
            if (!active || event.touches.length !== 2 || !initialDistance)
                return;
            event.preventDefault();
            const nextScale = initialScale * (viewport.touchDistance(event.touches) / initialDistance);
            const center = viewport.touchCenter(event.touches);
            input.zoomAtClient(center.x, center.y, nextScale);
            input.onZoom?.();
        };
        const onEnd = (event) => {
            if (event.touches.length === 0)
                settle();
        };
        input.containerEl.addEventListener('touchstart', onStart, { passive: false });
        input.containerEl.addEventListener('touchmove', onMove, { passive: false });
        input.containerEl.addEventListener('touchend', onEnd);
        input.containerEl.addEventListener('touchcancel', onEnd);
        return {
            destroy() {
                clearSettleTimer();
                input.containerEl.removeEventListener('touchstart', onStart);
                input.containerEl.removeEventListener('touchmove', onMove);
                input.containerEl.removeEventListener('touchend', onEnd);
                input.containerEl.removeEventListener('touchcancel', onEnd);
            },
            isTapSuppressed: () => active,
        };
    }
    FD.MapTouchGestureService = { bind };
})(window);
