// Shared map viewport mechanics for the Office map and the Capacitor tablet map.
// Each client owns its surrounding UI and edit actions; this controller owns the
// revision-safe transform mathematics, clamping and rAF scheduling they share.
(function (global) {
    const FD = global.FD = global.FD || {};
    function create(input) {
        if (!FD.ViewportService)
            throw new Error('ViewportService ontbreekt.');
        const viewport = FD.ViewportService;
        const minScale = input.minScale ?? 0.02;
        const maxScale = input.maxScale ?? 10;
        let metrics = null;
        let frame = null;
        const clampScale = (value) => Math.max(minScale, Math.min(maxScale, value));
        function refreshMetrics() {
            const svgEl = input.getSvg();
            const viewBox = svgEl?.viewBox?.baseVal;
            if (!svgEl || !viewBox?.width || !viewBox.height) {
                metrics = null;
                return null;
            }
            const rect = input.containerEl.getBoundingClientRect();
            metrics = {
                svgEl,
                containerLeft: rect.left,
                containerTop: rect.top,
                contentWidth: viewBox.width,
                contentHeight: viewBox.height,
                containerWidth: rect.width,
                containerHeight: rect.height,
                overlayHeight: input.getOverlayHeight?.() || 0,
            };
            return metrics;
        }
        function getMetrics(refresh = false) {
            if (refresh || !metrics || !metrics.svgEl.isConnected)
                return refreshMetrics();
            return metrics;
        }
        function apply(refresh = true) {
            const currentMetrics = getMetrics(refresh);
            if (!currentMetrics)
                return null;
            const current = input.getState();
            const pan = viewport.clampPan({
                ...currentMetrics,
                panX: current.panX,
                panY: current.panY,
                scale: clampScale(current.scale),
            });
            const next = { scale: clampScale(current.scale), ...pan };
            input.setState(next);
            input.applyTransform(next, currentMetrics);
            return next;
        }
        function scheduleApply() {
            if (frame !== null)
                return;
            frame = global.requestAnimationFrame(() => {
                frame = null;
                apply(false);
            });
        }
        function fit(contentWidth, contentHeight) {
            const currentMetrics = refreshMetrics();
            if (!currentMetrics)
                return null;
            const next = viewport.fitToBounds({
                ...currentMetrics,
                contentWidth: contentWidth || currentMetrics.contentWidth,
                contentHeight: contentHeight || currentMetrics.contentHeight,
            });
            input.setState({ ...next, scale: clampScale(next.scale) });
            return apply(false);
        }
        function finishInteraction() {
            input.containerEl.classList.remove('is-panning');
            if (frame !== null) {
                global.cancelAnimationFrame(frame);
                frame = null;
            }
            apply();
        }
        function startInteraction() {
            refreshMetrics();
            input.containerEl.classList.add('is-panning');
        }
        function panFrom(startPanX, startPanY, deltaX, deltaY) {
            const current = input.getState();
            input.setState({ scale: current.scale, panX: startPanX + deltaX, panY: startPanY + deltaY });
            scheduleApply();
        }
        function zoomAtClient(clientX, clientY, requestedScale) {
            const currentMetrics = getMetrics();
            if (!currentMetrics)
                return null;
            const current = input.getState();
            const next = viewport.zoomAtPoint({
                pointX: clientX - currentMetrics.containerLeft,
                pointY: clientY - currentMetrics.containerTop,
                panX: current.panX,
                panY: current.panY,
                scale: current.scale,
                nextScale: clampScale(requestedScale),
            });
            input.setState(next);
            scheduleApply();
            return next;
        }
        function zoomByClient(clientX, clientY, factor) {
            return zoomAtClient(clientX, clientY, input.getState().scale * factor);
        }
        function clientToSvgPoint(clientX, clientY) {
            const currentMetrics = getMetrics();
            if (!currentMetrics)
                return null;
            const viewBox = currentMetrics.svgEl.viewBox.baseVal;
            const current = input.getState();
            return viewport.clientToSvgPoint({
                clientX,
                clientY,
                containerLeft: currentMetrics.containerLeft,
                containerTop: currentMetrics.containerTop,
                panX: current.panX,
                panY: current.panY,
                scale: current.scale,
                viewBoxX: viewBox.x || 0,
                viewBoxY: viewBox.y || 0,
            });
        }
        return {
            refreshMetrics,
            getMetrics,
            fit,
            apply,
            scheduleApply,
            finishInteraction,
            startInteraction,
            panFrom,
            zoomAtClient,
            zoomByClient,
            clientToSvgPoint,
        };
    }
    FD.MapViewportController = { create };
})(window);
