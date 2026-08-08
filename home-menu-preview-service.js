(function (global) {
    const FD = global.FD = global.FD || {};
    const maxEntries = 6;
    const maxSvgChars = 750000;
    const previews = new Map();
    function remember(value, svgText) {
        const id = Number(value || 0);
        const text = String(svgText || '');
        if (!Number.isInteger(id) || id < 1 || !text || text.length > maxSvgChars)
            return;
        previews.delete(id);
        previews.set(id, text);
        while (previews.size > maxEntries) {
            const oldest = previews.keys().next();
            if (!oldest.done)
                previews.delete(oldest.value);
        }
    }
    function read(value) {
        const id = Number(value || 0);
        return Number.isInteger(id) && id > 0 ? previews.get(id) || '' : '';
    }
    FD.HomeMenuPreviewService = { read, remember };
})(window);
