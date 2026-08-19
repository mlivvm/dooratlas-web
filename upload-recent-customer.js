(function (global) {
    const FD = global.FD = global.FD || {};
    function createRecentCustomerShortcut({ button, customerById }) {
        let mostRecentCompletedCustomerId = 0;
        function customer() {
            return mostRecentCompletedCustomerId ? customerById(mostRecentCompletedCustomerId) : null;
        }
        function sync(activeStep, creationMode) {
            const selected = customer();
            if (!selected || activeStep !== 'customer' || creationMode) {
                button.hidden = true;
                return;
            }
            button.hidden = false;
            button.textContent = `Zelfde klant: ${selected.customer || selected.tenant_name || 'Klant'}`;
        }
        function remember(tenantId) {
            const selected = customerById(tenantId);
            const customerId = Number(selected?.tenantId || selected?.id || 0);
            if (customerId > 0)
                mostRecentCompletedCustomerId = customerId;
        }
        return { customer, remember, sync };
    }
    FD.UploadRecentCustomer = { createRecentCustomerShortcut };
})(window);
