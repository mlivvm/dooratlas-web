function globalSearchCustomerIndex(result) {
    const target = Number(result?.data?.tenant_id || result?.data?.tenantId || 0);
    return customers.findIndex(customer => Number(customer?.tenantId || 0) === target);
}
function globalSearchFloorplanIndex(customerIndex, result) {
    const target = Number(result?.data?.floor_id || result?.data?.floorId || 0);
    return (customers[customerIndex]?.floorplans || []).findIndex(floorplan => (Number(floorplan?.floorId || floorplan?.id || 0) === target));
}
async function openGlobalSearchResult(result) {
    let customerIndex = globalSearchCustomerIndex(result);
    let floorplanIndex = result.kind === 'customer' ? -1 : globalSearchFloorplanIndex(customerIndex, result);
    if (customerIndex < 0 || (result.kind !== 'customer' && floorplanIndex < 0)) {
        await loadCustomers();
        customerIndex = globalSearchCustomerIndex(result);
        floorplanIndex = result.kind === 'customer' ? -1 : globalSearchFloorplanIndex(customerIndex, result);
    }
    if (customerIndex < 0 || (result.kind !== 'customer' && floorplanIndex < 0)) {
        showToast('Zoekresultaat is niet meer beschikbaar. Vernieuw en probeer opnieuw.', 'error');
        return;
    }
    if (adminDashboardState.visible)
        hideAdminDashboard();
    if (result.kind === 'customer') {
        closeSelectSheet();
        customerSelect.value = String(customerIndex);
        populateFloorplanDropdown(customerIndex);
        updatePickerButtons();
        selectionController.open('floorplan');
        return;
    }
    closeSelectSheet();
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    await loadFloorplan(customerIndex, floorplanIndex);
    if (result.kind !== 'door')
        return;
    const markerUuid = String(result.data.marker_uuid || result.data.markerUuid || '').trim();
    const markerKey = markerUuid ? `door-${markerUuid}` : '';
    if (markerKey && FD.MarkerService.markerExists(svgContainer, markerKey)) {
        selectDoor(markerKey);
    }
    else {
        showToast('Deurmarker is niet op de zichtbare plattegrond gevonden.', 'error');
    }
}
const globalSearchController = FD.GlobalSearchService.create({
    anchor: btnTopbarMetadata,
    config: CONFIG,
    getCustomers: () => customers,
    canOpen: () => appMode.isInteractiveView() && !isEditModeActive(),
    onBlocked: () => showToast(isEditModeActive() ? 'Sluit eerst de bewerkingsmodus' : 'Sluit eerst het huidige scherm', 'error'),
    onSelect: openGlobalSearchResult,
});
globalSearchController.bind();
FD.GlobalSearch = globalSearchController;
