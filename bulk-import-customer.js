(function (global) {
    const FD = global.FD = global.FD || {};
    function createBulkImportCustomer({ config, getCustomers, getCurrentUser = () => null, onCreateTenant, sourceError }) {
        const byId = (id) => global.document.getElementById(id);
        const select = byId('bulk-import-customer');
        const form = byId('bulk-import-new-customer');
        const nameInput = byId('bulk-import-customer-name');
        const shortNameInput = byId('bulk-import-customer-short-name');
        const notesInput = byId('bulk-import-customer-notes');
        let draft = null;
        function canCreateCustomer() {
            const user = getCurrentUser() || {};
            return Boolean(user.isSuperadmin || ['admin', 'sales'].includes(user.role) ||
                (user.memberships || []).some((membership) => ['da_admin', 'da_sales'].includes(membership.role)));
        }
        function tenantId(customer) {
            return Number(customer?.tenantId || customer?.tenant_id || customer?.id || 0);
        }
        function populate(selectedValue = '') {
            const value = selectedValue || select.value;
            select.innerHTML = '<option value="">Kies een klant</option>';
            (getCustomers() || [])
                .filter((customer) => FD.DataService.canManageUploads(config, { tenantId: tenantId(customer) }))
                .forEach((customer) => {
                const option = global.document.createElement('option');
                option.value = String(tenantId(customer));
                option.textContent = customer.customer || customer.tenant_name;
                select.appendChild(option);
            });
            if (draft && !draft.realTenantId) {
                const option = global.document.createElement('option');
                option.value = '-1';
                option.textContent = `${draft.customer} · nieuw`;
                select.appendChild(option);
            }
            if (value && Array.from(select.options).some(option => option.value === value))
                select.value = value;
        }
        function selected() {
            if (select.value === '-1' && draft)
                return draft;
            const id = Number(select.value || 0);
            return (getCustomers() || []).find((customer) => tenantId(customer) === id) || null;
        }
        function showForm(visible) {
            if (visible && !canCreateCustomer())
                return;
            form.hidden = !visible;
            if (visible)
                global.setTimeout(() => nameInput.focus(), 0);
        }
        function clearForm() {
            nameInput.value = '';
            shortNameInput.value = '';
            notesInput.value = '';
        }
        function useDraft() {
            if (!canCreateCustomer())
                return;
            const body = FD.UploadCore.validateNewTenantMetadata({
                tenantName: nameInput.value,
                shortName: shortNameInput.value,
                notes: notesInput.value,
            });
            if (!body.ok) {
                sourceError.textContent = body.error;
                return;
            }
            draft = { tenantId: -1, id: -1, customer: body.tenant_name, tenantDraft: body, floorplans: [] };
            clearForm();
            showForm(false);
            populate('-1');
            sourceError.textContent = '';
        }
        async function materialize() {
            const current = selected();
            if (!current || current !== draft)
                return current;
            if (!draft.realTenantId) {
                const result = await onCreateTenant(draft.tenantDraft);
                draft.realTenantId = Number(result.tenant.id);
            }
            const resolved = (getCustomers() || []).find((customer) => tenantId(customer) === Number(draft.realTenantId)) || {
                ...draft,
                tenantId: Number(draft.realTenantId),
                id: Number(draft.realTenantId),
            };
            populate(String(draft.realTenantId));
            return resolved;
        }
        function reset() {
            draft = null;
            clearForm();
            showForm(false);
            populate();
            byId('btn-bulk-new-customer').hidden = !canCreateCustomer();
        }
        function bind() {
            byId('btn-bulk-new-customer').addEventListener('click', () => showForm(true));
            byId('btn-bulk-cancel-customer').addEventListener('click', () => { clearForm(); showForm(false); sourceError.textContent = ''; });
            byId('btn-bulk-use-customer').addEventListener('click', useDraft);
        }
        return { bind, materialize, populate, reset, selected, tenantId };
    }
    FD.BulkImportCustomer = { createBulkImportCustomer };
})(window);
