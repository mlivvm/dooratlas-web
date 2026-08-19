(function (global) {
    const FD = global.FD = global.FD || {};
    function summaryRole(session, memberships) {
        if (session?.is_superadmin)
            return 'admin';
        const roles = new Set(memberships.map(membership => String(membership?.role || '').toLowerCase()));
        if (roles.has('da_admin'))
            return 'admin';
        if (roles.has('da_sales'))
            return 'sales';
        if (roles.has('da_beheer'))
            return 'beheer';
        if (roles.has('da_monteur'))
            return 'monteur';
        return 'viewer';
    }
    function sessionUser(session) {
        const memberships = Array.isArray(session?.memberships) ? session.memberships : [];
        return {
            id: String(session?.user_id || ''),
            username: String(session?.email || ''),
            email: String(session?.email || ''),
            displayName: String(session?.full_name || session?.email || ''),
            role: summaryRole(session, memberships),
            isSuperadmin: Boolean(session?.is_superadmin),
            lastMapMode: String(session?.last_map_mode || 'opname'),
            memberships,
            permissions: { floorplans: [] },
        };
    }
    FD.DataSessionUserService = { sessionUser };
})(window);
