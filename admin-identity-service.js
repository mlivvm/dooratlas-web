(function (global) {
    const FD = global.FD = global.FD || {};
    function tenantId(record) {
        return Number(record?.tenantId || record?.tenant_id || 0);
    }
    function tenantKey(record) {
        const id = tenantId(record);
        return id ? `tenant:${id}` : `name:${String(record?.customer || '').trim()}`;
    }
    function sameTenant(left, right) {
        const leftId = tenantId(left);
        const rightId = tenantId(right);
        return leftId && rightId ? leftId === rightId : left?.customer === right?.customer;
    }
    function customerOptions(records, collator = new Intl.Collator('nl')) {
        const byKey = new Map();
        records.forEach(record => {
            const key = tenantKey(record);
            if (record?.customer && !byKey.has(key))
                byKey.set(key, record);
        });
        const nameCounts = new Map();
        byKey.forEach(record => {
            nameCounts.set(record.customer, (nameCounts.get(record.customer) || 0) + 1);
        });
        return Array.from(byKey, ([value, record]) => {
            const duplicate = (nameCounts.get(record.customer) || 0) > 1;
            const suffix = String(record.tenantCode || record.tenant_code || `#${tenantId(record)}`);
            return { value, label: duplicate ? `${record.customer} (${suffix})` : record.customer, record };
        }).sort((left, right) => collator.compare(left.label, right.label));
    }
    FD.AdminIdentityService = { customerOptions, sameTenant, tenantId, tenantKey };
})(window);
