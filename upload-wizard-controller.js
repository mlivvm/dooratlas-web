(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    const Combobox = FD.UploadCombobox;
    function createUploadWizard({ elements, controls, currentCustomers, getCurrentUser, onCreateTenant, onListLocations, onCreateLocation, onContinueFiles = () => { }, }) {
        let activeStep = 'customer';
        let bound = false;
        let locationLoadToken = 0;
        let creationMode = '';
        let draftCustomer = null;
        let draftLocation = null;
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
            if (id === Number(draftCustomer?.tenantId))
                return draftCustomer;
            return currentCustomers().find((customer) => Number(customer?.tenantId || customer?.id) === id) || null;
        }
        function appendDraftCustomerOption() {
            if (!draftCustomer)
                return;
            const option = document.createElement('option');
            option.value = String(draftCustomer.tenantId);
            option.textContent = `${draftCustomer.customer} · nieuw`;
            elements.customerSelect.appendChild(option);
        }
        function setError(message = '') {
            elements.errorEl.textContent = message;
        }
        function clearNewCustomerInputs() {
            elements.newCustomerInput.value = '';
            if (elements.newCustomerShortNameInput)
                elements.newCustomerShortNameInput.value = '';
            if (elements.newCustomerNotesInput)
                elements.newCustomerNotesInput.value = '';
        }
        function clearNewLocationInputs() {
            ['locationNameInput', 'locationStreetInput', 'locationPostalCodeInput', 'locationCityInput', 'locationNotesInput']
                .forEach(key => { if (elements[key])
                elements[key].value = ''; });
        }
        function syncCreationPanels() {
            const creatingCustomer = creationMode === 'customer';
            const creatingLocation = creationMode === 'location';
            if (elements.customerSelectionControls)
                elements.customerSelectionControls.style.display = creatingCustomer ? 'none' : 'grid';
            if (elements.locationSelectionControls)
                elements.locationSelectionControls.style.display = creatingLocation ? 'none' : 'grid';
            elements.newCustomerWrapper.style.display = creatingCustomer ? 'grid' : 'none';
            elements.newLocationWrapper.style.display = creatingLocation ? 'grid' : 'none';
            customerCombobox.close();
            locationCombobox.close();
        }
        function syncFooterActions(index) {
            const creatingCustomer = creationMode === 'customer';
            const creatingLocation = creationMode === 'location';
            const creating = creatingCustomer || creatingLocation;
            const hasSelectedFiles = Boolean(elements.pdfState.pages.length);
            if (elements.wizardFooter)
                elements.wizardFooter.dataset.creationMode = creationMode || 'select';
            elements.wizardBack.style.display = creating ? 'none' : 'inline-flex';
            elements.wizardBack.style.visibility = !creating && index > 0 ? 'visible' : 'hidden';
            controls.cancelFormButton.style.display = creating ? 'none' : 'inline-flex';
            elements.wizardNext.style.display = creating || (activeStep === 'file' && !hasSelectedFiles) ? 'none' : 'inline-flex';
            controls.backToSelectButton.style.display = creatingCustomer ? 'inline-flex' : 'none';
            elements.createCustomerButton.style.display = creatingCustomer ? 'inline-flex' : 'none';
            elements.cancelLocationButton.style.display = creatingLocation ? 'inline-flex' : 'none';
            elements.createLocationButton.style.display = creatingLocation ? 'inline-flex' : 'none';
        }
        function wizardTitle(step) {
            if (creationMode === 'customer')
                return 'Nieuwe klant';
            if (creationMode === 'location')
                return 'Nieuwe locatie';
            return step === 'customer' ? 'Kies een klant' : step === 'location' ? 'Kies een pand / locatie' : 'PDF, afbeelding of SVG bestand';
        }
        function showStep(step) {
            activeStep = step;
            const order = ['customer', 'location', 'file'];
            const index = order.indexOf(step);
            elements.wizardCustomer.style.display = step === 'customer' ? 'grid' : 'none';
            elements.wizardLocation.style.display = step === 'location' ? 'grid' : 'none';
            elements.wizardFile.style.display = step === 'file' ? 'grid' : 'none';
            elements.wizardTitle.textContent = wizardTitle(step);
            elements.wizardProgress.forEach((item, itemIndex) => {
                item.classList.toggle('is-active', itemIndex === index);
                item.classList.toggle('is-complete', itemIndex < index);
            });
            setError();
            syncCreationPanels();
            syncFooterActions(index);
            controls.popup.scrollTop = 0;
            const focusTarget = creationMode === 'customer'
                ? elements.newCustomerInput
                : creationMode === 'location'
                    ? elements.locationNameInput
                    : step === 'customer'
                        ? elements.customerComboboxTrigger
                        : step === 'location'
                            ? elements.locationComboboxTrigger
                            : controls.fileButton;
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
            if (tenantId === Number(draftCustomer?.tenantId)) {
                populateLocationSelect(draftLocation ? [draftLocation] : []);
                return;
            }
            try {
                const locations = await onListLocations(tenantId);
                if (loadToken !== locationLoadToken || Number(elements.customerSelect.value || 0) !== tenantId)
                    return;
                const draftForTenant = Number(draftLocation?.tenant_id) === tenantId ? [draftLocation] : [];
                populateLocationSelect([...locations, ...draftForTenant]);
            }
            catch (err) {
                if (loadToken !== locationLoadToken)
                    return;
                setError(Core.formatUploadError(err));
            }
        }
        function canCreateCustomer() {
            const user = getCurrentUser() || {};
            return Boolean(user.isSuperadmin || ['admin', 'sales'].includes(user.role) || (user.memberships || []).some((membership) => ['da_admin', 'da_sales'].includes(membership.role)));
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
            draftCustomer = { tenantId: -1, id: -1, customer: body.tenant_name, tenantDraft: body, floorplans: [] };
            draftLocation = null;
            Core.populateCustomerSelect(elements.customerSelect, currentCustomers());
            appendDraftCustomerOption();
            customerCombobox.refresh({ preserveSelection: false });
            customerCombobox.selectValue('-1', { emit: false });
            await handleCustomerChange();
            clearNewCustomerInputs();
            creationMode = '';
            showStep('customer');
        }
        function showNewCustomer() {
            setError();
            creationMode = 'customer';
            showStep('customer');
        }
        function hideNewCustomer() {
            clearNewCustomerInputs();
            creationMode = '';
            showStep('customer');
        }
        function showNewLocation() {
            if (!elements.customerSelect.value)
                return setError('Kies eerst een klant.');
            setError();
            creationMode = 'location';
            showStep('location');
        }
        function hideNewLocation() {
            clearNewLocationInputs();
            creationMode = '';
            showStep('location');
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
            draftLocation = {
                id: -1, tenant_id: tenantId, name: body.name, street: body.street,
                postal_code: body.postal_code, city: body.city, notes: body.notes, locationDraft: body,
            };
            const existingLocations = tenantId > 0
                ? (elements.availableLocations || []).filter((location) => Number(location.id) > 0)
                : [];
            populateLocationSelect([...existingLocations, draftLocation], '-1');
            clearNewLocationInputs();
            creationMode = '';
            showStep('location');
            locationCombobox.selectValue('-1', { emit: false });
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
                tenantDraft: tenantId < 0 ? draftCustomer?.tenantDraft : null,
                locationDraft: locationId < 0 ? draftLocation?.locationDraft : null,
            };
        }
        function validationCustomers() {
            return draftCustomer ? [...currentCustomers(), draftCustomer] : currentCustomers();
        }
        async function materializeContext(context) {
            if (!context?.ok || (context.tenantId > 0 && context.locationId > 0))
                return context;
            let tenantId = Number(context.tenantId);
            if (tenantId < 0) {
                const customerDraft = draftCustomer;
                if (!customerDraft)
                    throw new Error('De nieuwe klant ontbreekt. Kies de klant opnieuw.');
                if (!customerDraft.realTenantId) {
                    const result = await onCreateTenant(customerDraft.tenantDraft);
                    customerDraft.realTenantId = Number(result.tenant.id);
                }
                tenantId = Number(customerDraft.realTenantId);
            }
            let locationId = Number(context.locationId);
            if (locationId < 0) {
                const locationDraft = draftLocation;
                if (!locationDraft)
                    throw new Error('De nieuwe locatie ontbreekt. Kies de locatie opnieuw.');
                if (!locationDraft.realLocationId) {
                    const result = await onCreateLocation({ ...locationDraft.locationDraft, tenant_id: tenantId });
                    locationDraft.realLocationId = Number(result.id);
                }
                locationId = Number(locationDraft.realLocationId);
            }
            const resolved = { ...context, tenantId, locationId, tenantDraft: null, locationDraft: null };
            elements.uploadContext = resolved;
            elements.pdfState.uploadContext = resolved;
            return resolved;
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
            draftCustomer = null;
            draftLocation = null;
            Core.resetFormState(elements);
            customerCombobox.refresh({ preserveSelection: false });
            customerCombobox.clearSelection({ emit: false });
            locationCombobox.refresh({ preserveSelection: false });
            locationCombobox.clearSelection({ emit: false });
            locationCombobox.setDisabled(true);
            elements.uploadContext = null;
            locationLoadToken++;
            creationMode = '';
            elements.newCustomerButton.hidden = !(allowNewCustomer || canCreateCustomer());
            showStep('customer');
        }
        function setCustomerLoading(loading) {
            customerCombobox.setDisabled(loading);
            elements.newCustomerButton.disabled = loading;
            if (loading)
                elements.customerComboboxLabel.textContent = 'Klanten laden...';
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
            elements.newCustomerButton?.addEventListener('click', showNewCustomer);
            elements.createCustomerButton?.addEventListener('click', createCustomer);
            controls.backToSelectButton?.addEventListener('click', hideNewCustomer);
            elements.newLocationButton?.addEventListener('click', showNewLocation);
            elements.createLocationButton?.addEventListener('click', createLocation);
            elements.cancelLocationButton?.addEventListener('click', hideNewLocation);
            elements.wizardNext.addEventListener('click', next);
            elements.wizardBack.addEventListener('click', back);
        }
        return { bind, currentContext, materializeContext, refreshFileState, reset, setCustomerLoading, showFileStep, showStep, validationCustomers };
    }
    FD.UploadWizardController = { createUploadWizard };
})(window);
