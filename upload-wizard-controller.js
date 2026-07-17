(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Combobox = FD.UploadCombobox;
    function createUploadWizard({ elements, controls, currentCustomers, getCurrentUser, onCreateTenant, onListLocations, onCreateLocation, onContinueFiles = () => { }, }) {
        let activeStep = 'customer';
        let bound = false;
        let locationLoadToken = 0;
        const customerCombobox = Combobox.createCombobox({
            trigger: elements.customerComboboxTrigger,
            triggerLabel: elements.customerComboboxLabel,
            dropdown: elements.customerComboboxDropdown,
            searchInput: elements.customerSearchInput,
            listbox: elements.customerComboboxOptions,
            select: elements.customerSelect,
            placeholder: 'Kies een klant',
            onSelected: () => handleCustomerChange(),
        });
        const locationCombobox = Combobox.createCombobox({
            trigger: elements.locationComboboxTrigger,
            triggerLabel: elements.locationComboboxLabel,
            dropdown: elements.locationComboboxDropdown,
            searchInput: elements.locationSearchInput,
            listbox: elements.locationComboboxOptions,
            select: elements.locationSelect,
            placeholder: 'Kies een locatie',
            onSelected: () => setError(),
        });
        function customerById(tenantId) {
            const id = Number(tenantId || 0);
            return currentCustomers().find((customer) => Number(customer?.tenantId || customer?.id) === id) || null;
        }
        function setError(message = '') {
            elements.errorEl.textContent = message;
        }
        function showStep(step) {
            activeStep = step;
            const order = ['customer', 'location', 'file'];
            const index = order.indexOf(step);
            elements.wizardCustomer.style.display = step === 'customer' ? 'grid' : 'none';
            elements.wizardLocation.style.display = step === 'location' ? 'grid' : 'none';
            elements.wizardFile.style.display = step === 'file' ? 'grid' : 'none';
            elements.wizardTitle.textContent = step === 'customer' ? 'Kies een klant' : step === 'location' ? 'Kies een pand / locatie' : 'PDF, afbeelding of SVG bestand';
            elements.wizardBack.style.visibility = index > 0 ? 'visible' : 'hidden';
            elements.wizardNext.style.display = step === 'file' && !elements.pdfState.pages.length ? 'none' : 'inline-flex';
            elements.wizardProgress.forEach((item, itemIndex) => {
                item.classList.toggle('is-active', itemIndex === index);
                item.classList.toggle('is-complete', itemIndex < index);
            });
            setError();
            customerCombobox.close();
            locationCombobox.close();
            controls.popup.scrollTop = 0;
            const focusTarget = step === 'customer' ? elements.customerComboboxTrigger : step === 'location' ? elements.locationComboboxTrigger : controls.fileButton;
            global.setTimeout(() => focusTarget?.focus(), 0);
        }
        function populateLocationSelect(locations, selectedId = '') {
            elements.availableLocations = locations.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'nl', { sensitivity: 'base' }));
            elements.locationSelect.innerHTML = '<option value="">-- Kies locatie --</option>';
            elements.availableLocations
                .forEach((location) => {
                const option = document.createElement('option');
                option.value = String(location.id);
                option.textContent = String(location.name || 'Locatie');
                elements.locationSelect.appendChild(option);
            });
            elements.locationSelect.disabled = false;
            elements.newLocationButton.disabled = false;
            locationCombobox.setDisabled(false);
            locationCombobox.refresh({ preserveSelection: false });
            if (selectedId)
                locationCombobox.selectValue(String(selectedId), { emit: false });
        }
        async function handleCustomerChange() {
            const tenantId = Number(elements.customerSelect.value || 0);
            const loadToken = ++locationLoadToken;
            elements.locationSelect.innerHTML = '<option value="">Locaties laden...</option>';
            elements.locationSelect.disabled = true;
            locationCombobox.clearSelection({ emit: false });
            locationCombobox.setDisabled(true);
            elements.newLocationButton.disabled = !tenantId;
            if (!tenantId)
                return;
            try {
                const locations = await onListLocations(tenantId);
                if (loadToken !== locationLoadToken || Number(elements.customerSelect.value || 0) !== tenantId)
                    return;
                populateLocationSelect(locations);
            }
            catch (err) {
                if (loadToken !== locationLoadToken)
                    return;
                setError(Core.formatUploadError(err));
            }
        }
        function canCreateCustomer() {
            const user = getCurrentUser() || {};
            return Boolean(user.isSuperadmin || user.role === 'admin' || (user.memberships || []).some((membership) => membership.role === 'da_admin'));
        }
        async function createCustomer() {
            if (!canCreateCustomer())
                return;
            setError();
            const body = Core.validateNewTenantMetadata({
                tenantName: elements.newCustomerInput.value,
                shortName: elements.newCustomerShortNameInput?.value,
                notes: elements.newCustomerNotesInput?.value,
            });
            if (!body.ok)
                return setError(body.error);
            try {
                const result = await onCreateTenant(body);
                Core.populateCustomerSelect(elements.customerSelect, currentCustomers());
                customerCombobox.refresh({ preserveSelection: false });
                customerCombobox.selectValue(String(result.tenant.id), { emit: false });
                Core.showCustomerSelect(elements);
                await handleCustomerChange();
            }
            catch (err) {
                setError(Core.formatUploadError(err));
            }
        }
        function showNewLocation() {
            if (!elements.customerSelect.value)
                return setError('Kies eerst een klant.');
            elements.newLocationWrapper.style.display = 'grid';
            elements.locationNameInput.focus();
        }
        function hideNewLocation() {
            elements.newLocationWrapper.style.display = 'none';
        }
        async function createLocation() {
            const tenantId = Number(elements.customerSelect.value || 0);
            setError();
            const body = Core.validateNewLocationMetadata({
                tenantId, name: elements.locationNameInput.value,
                street: elements.locationStreetInput.value, postalCode: elements.locationPostalCodeInput.value,
                city: elements.locationCityInput.value, notes: elements.locationNotesInput.value,
            });
            if (!body.ok)
                return setError(body.error);
            try {
                const location = await onCreateLocation(body);
                populateLocationSelect(await onListLocations(tenantId), location.id);
                hideNewLocation();
            }
            catch (err) {
                setError(Core.formatUploadError(err));
            }
        }
        function currentContext() {
            const tenantId = Number(elements.customerSelect.value || 0);
            const customer = customerById(tenantId);
            if (!customer)
                return { ok: false, error: 'Kies een klant.' };
            const locationId = Number(elements.locationSelect.value || 0);
            if (!locationId)
                return { ok: false, error: 'Kies een pand / locatie.' };
            return {
                ok: true,
                tenantId,
                locationId,
                customerName: customer.customer || '',
                locationName: elements.locationSelect.selectedOptions?.[0]?.textContent || '',
            };
        }
        async function next() {
            if (activeStep === 'customer') {
                if (!customerById(elements.customerSelect.value))
                    return setError('Kies een klant.');
                if (elements.locationSelect.disabled)
                    await handleCustomerChange();
                showStep('location');
                return;
            }
            if (activeStep === 'location') {
                const context = currentContext();
                if (!context.ok)
                    return setError(context.error);
                elements.uploadContext = context;
                elements.pdfState.uploadContext = context;
                showStep('file');
                return;
            }
            if (activeStep === 'file' && elements.pdfState.pages.length)
                onContinueFiles();
        }
        function back() {
            if (activeStep === 'file')
                showStep('location');
            else if (activeStep === 'location')
                showStep('customer');
        }
        function reset({ allowNewCustomer = false } = {}) {
            Core.populateCustomerSelect(elements.customerSelect, currentCustomers());
            Core.resetFormState(elements);
            customerCombobox.refresh({ preserveSelection: false });
            customerCombobox.clearSelection({ emit: false });
            locationCombobox.refresh({ preserveSelection: false });
            locationCombobox.clearSelection({ emit: false });
            locationCombobox.setDisabled(true);
            elements.uploadContext = null;
            locationLoadToken++;
            elements.newCustomerButton.hidden = !(allowNewCustomer || canCreateCustomer());
            showStep('customer');
        }
        function showFileStep() {
            elements.stepChoose.style.display = 'none';
            elements.stepPreview.style.display = 'none';
            elements.stepMetadata.style.display = 'none';
            elements.stepPdf.style.display = 'none';
            elements.stepForm.style.display = 'flex';
            Core.setPdfImportLayout(controls, false);
            Core.setUploadFormLayout(controls, true);
            showStep('file');
        }
        function refreshFileState() {
            if (activeStep === 'file')
                showStep('file');
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            elements.newCustomerButton?.addEventListener('click', () => Core.showNewCustomerInput(elements));
            elements.createCustomerButton?.addEventListener('click', createCustomer);
            controls.backToSelectButton?.addEventListener('click', () => Core.showCustomerSelect(elements));
            elements.newLocationButton?.addEventListener('click', showNewLocation);
            elements.createLocationButton?.addEventListener('click', createLocation);
            elements.cancelLocationButton?.addEventListener('click', hideNewLocation);
            elements.wizardNext.addEventListener('click', next);
            elements.wizardBack.addEventListener('click', back);
        }
        return { bind, currentContext, refreshFileState, reset, showFileStep, showStep };
    }
    FD.UploadWizardController = { createUploadWizard };
})(window);
