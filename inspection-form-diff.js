(function (global) {
    const FD = global.FD = global.FD || {};
    function stableValue(value) {
        if (Array.isArray(value)) {
            return value.map(stableValue).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
        }
        if (!value || typeof value !== 'object')
            return value;
        return Object.fromEntries(Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, stableValue(item)]));
    }
    function contentSignature(payload) {
        const existingPhotos = (payload.existing_photo_ids || [])
            .map((id) => Number(id))
            .filter((id) => id > 0)
            .sort((left, right) => left - right);
        const newPhotos = (payload.photos || []).map((photo) => ({
            kind: String(photo.kind || ''),
            data_url: String(photo.data_url || ''),
            filename: String(photo.filename || ''),
            content_type: String(photo.content_type || ''),
        }));
        const matrices = (payload.matrix_answers || [])
            .filter((answer) => answer.value !== false)
            .map((answer) => [
            String(answer.matrix_key || ''),
            String(answer.row_key || ''),
            String(answer.column_key || ''),
        ]);
        return JSON.stringify(stableValue({
            fields: payload.fields || {},
            existingPhotos,
            newPhotos,
            matrices,
        }));
    }
    FD.InspectionFormDiff = {
        contentSignature,
        hasChanges: (payload, baseline) => contentSignature(payload) !== baseline,
    };
})(window);
