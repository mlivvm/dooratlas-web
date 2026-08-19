(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.DataServiceCore;
    function list(config) {
        return C.requestJson(config, '/api/bulk-imports');
    }
    function get(config, importId) {
        return C.requestJson(config, `/api/bulk-imports/${encodeURIComponent(importId)}`);
    }
    function create(config, payload) {
        return C.requestJson(config, '/api/bulk-imports', { method: 'POST', csrf: true, body: payload });
    }
    function cancel(config, importId) {
        return C.requestJson(config, `/api/bulk-imports/${encodeURIComponent(importId)}/cancel`, { method: 'POST', csrf: true });
    }
    function uploadSvg(config, importId, itemId, sourceHash, svgText) {
        return C.requestRawJson(config, `/api/bulk-imports/${encodeURIComponent(importId)}/items/${encodeURIComponent(itemId)}/svg`, {
            method: 'PUT', csrf: true, body: svgText, contentType: 'image/svg+xml',
            headers: { 'X-Source-SHA256': sourceHash },
        });
    }
    function failItem(config, importId, itemId, error) {
        return C.requestJson(config, `/api/bulk-imports/${encodeURIComponent(importId)}/items/${encodeURIComponent(itemId)}/failure`, {
            method: 'POST', csrf: true, body: { error: String(error || 'Converteren mislukt.').slice(0, 500) },
        });
    }
    FD.BulkImportApi = { cancel, create, failItem, get, list, uploadSvg };
})(window);
