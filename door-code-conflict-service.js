(function (global) {
    const FD = global.FD = global.FD || {};
    function uniqueCodes(conflicts, fallbackCode = '') {
        const seen = new Set();
        const codes = [];
        [...conflicts.map(conflict => conflict?.code), fallbackCode].forEach(value => {
            const code = String(value || '').trim();
            const identity = code.toLocaleLowerCase();
            if (!code || seen.has(identity))
                return;
            seen.add(identity);
            codes.push(code);
        });
        return codes;
    }
    function codeList(codes) {
        const visible = codes.slice(0, 3);
        const extra = Math.max(0, codes.length - visible.length);
        const joined = visible.length <= 1
            ? (visible[0] || '')
            : `${visible.slice(0, -1).join(', ')} en ${visible[visible.length - 1]}`;
        return extra ? `${joined} en ${extra} meer` : joined;
    }
    function codeSubject(codes) {
        if (!codes.length)
            return 'Deze deurcode';
        return `${codes.length === 1 ? 'Code' : 'Codes'} ${codeList(codes)}`;
    }
    function detailsFor(err) {
        return err?.details && typeof err.details === 'object' ? err.details : {};
    }
    function duplicateDoorCodeMessage(err) {
        if (Number(err?.status) !== 409)
            return '';
        const details = detailsFor(err);
        const conflicts = Array.isArray(details.conflicts) ? details.conflicts : [];
        const fallbackCode = String(details.attemptedDoorCode || err?.attemptedDoorCode || '').trim();
        const structured = err?.code === 'duplicate_door_code' ||
            err?.message === 'duplicate_door_code' ||
            details.code === 'duplicate_door_code' ||
            conflicts.length > 0 ||
            Boolean(fallbackCode);
        const genericDuplicate = /deurcode bestaat al/i.test(String(err?.message || err?.code || ''));
        if (!structured && !genericDuplicate)
            return '';
        const codes = uniqueCodes(conflicts, fallbackCode);
        const subject = codeSubject(codes);
        const floorplanConflict = conflicts.find(conflict => conflict?.scope === 'floorplan');
        if (floorplanConflict) {
            return `${subject} ${codes.length > 1 ? 'staan' : 'staat'} dubbel op deze plattegrond.`;
        }
        const contextual = conflicts.find(conflict => conflict?.customer && conflict?.floorplan);
        if (contextual && codes.length <= 1) {
            return `${subject} bestaat al bij ${contextual.customer} - ${contextual.floorplan}.`;
        }
        if (codes.length)
            return `${subject} ${codes.length > 1 ? 'bestaan' : 'bestaat'} al.`;
        return 'Deze deurcode bestaat al.';
    }
    FD.DoorCodeConflictService = {
        duplicateDoorCodeMessage,
    };
})(window);
