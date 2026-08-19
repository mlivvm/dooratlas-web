// A transformed SVG containing a large embedded raster image becomes one very
// large GPU layer in Android WebView. Above a device texture/budget threshold,
// tiles of that layer can be evicted while pinching. Keep the same pan/zoom
// mathematics, but make the SVG itself the fixed viewport so WebView only ever
// draws the visible portion. Vector-only and already safe maps retain their
// proven transform route unchanged.
(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_SAFE_LAYER_PIXELS = 12000000;
    const FALLBACK_MAX_TEXTURE_SIZE = 4096;
    let detectedMaxTextureSize = null;
    function readBounds(svgEl) {
        const viewBox = svgEl.viewBox?.baseVal;
        if (!viewBox?.width || !viewBox.height)
            return null;
        return { x: viewBox.x || 0, y: viewBox.y || 0, width: viewBox.width, height: viewBox.height };
    }
    function maxTextureSize() {
        if (detectedMaxTextureSize !== null)
            return detectedMaxTextureSize;
        try {
            const canvas = document.createElement('canvas');
            const context = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            const limit = context?.getParameter(context.MAX_TEXTURE_SIZE);
            detectedMaxTextureSize = typeof limit === 'number' && limit > 0 ? limit : FALLBACK_MAX_TEXTURE_SIZE;
        }
        catch {
            detectedMaxTextureSize = FALLBACK_MAX_TEXTURE_SIZE;
        }
        return detectedMaxTextureSize;
    }
    function needsFixedViewport(svgEl, bounds) {
        if (!svgEl.querySelector('image'))
            return false;
        const density = Math.max(1, global.devicePixelRatio || 1);
        const physicalWidth = bounds.width * density;
        const physicalHeight = bounds.height * density;
        const textureLimit = maxTextureSize();
        return physicalWidth > textureLimit || physicalHeight > textureLimit ||
            physicalWidth * physicalHeight > MAX_SAFE_LAYER_PIXELS;
    }
    function create() {
        let trackedSvg = null;
        let sourceBounds = null;
        let fixedViewport = false;
        function track(svgEl) {
            if (!svgEl)
                return null;
            if (trackedSvg !== svgEl) {
                trackedSvg = svgEl;
                sourceBounds = readBounds(svgEl);
                fixedViewport = Boolean(sourceBounds && needsFixedViewport(svgEl, sourceBounds));
                if (fixedViewport)
                    svgEl.dataset.dooratlasCamera = 'viewport';
                else
                    delete svgEl.dataset.dooratlasCamera;
            }
            return sourceBounds;
        }
        function contentBounds(svgEl) {
            return track(svgEl);
        }
        function apply({ state, metrics }) {
            const bounds = track(metrics.svgEl);
            if (!bounds || !fixedViewport || state.scale <= 0)
                return false;
            const width = Math.max(1, metrics.containerWidth);
            const height = Math.max(1, metrics.containerHeight);
            const viewBoxX = bounds.x - state.panX / state.scale;
            const viewBoxY = bounds.y - state.panY / state.scale;
            const viewBoxWidth = width / state.scale;
            const viewBoxHeight = height / state.scale;
            metrics.svgEl.style.transform = 'none';
            metrics.svgEl.style.transformOrigin = '0 0';
            metrics.svgEl.style.width = `${width}px`;
            metrics.svgEl.style.height = `${height}px`;
            metrics.svgEl.setAttribute('width', String(width));
            metrics.svgEl.setAttribute('height', String(height));
            metrics.svgEl.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
            return true;
        }
        return { contentBounds, apply };
    }
    FD.SvgViewportCameraService = { create };
})(window);
