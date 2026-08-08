(function (global) {
    const FD = global.FD = global.FD || {};
    function sliderRange(svgEl) {
        if (!svgEl)
            return { max: 30, def: 15 };
        const viewBox = svgEl.viewBox.baseVal;
        const shortest = Math.min(viewBox.width || 1000, viewBox.height || 1000);
        const max = Math.max(20, Math.min(150, Math.round(shortest * 0.03)));
        return { max, def: Math.round(max / 3) };
    }
    function markerRadius(marker, fallback = 10) {
        const rx = parseFloat(marker.getAttribute('rx') || '') || parseFloat(marker.getAttribute('r') || '') || fallback;
        const ry = parseFloat(marker.getAttribute('ry') || '') || parseFloat(marker.getAttribute('r') || '') || rx;
        return Math.max(rx, ry);
    }
    FD.MarkerGeometryService = {
        markerRadius,
        sliderRange,
    };
})(window);
