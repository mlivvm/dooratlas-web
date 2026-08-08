async function openHomeMenuFloorplan(item) {
    const customerIndex = Number(item?.customerIndex);
    const floorplanIndex = Number(item?.floorplanIndex);
    if (!Number.isInteger(customerIndex) || !Number.isInteger(floorplanIndex))
        return;
    closeSelectSheet();
    if (adminDashboardState.visible)
        hideAdminDashboard();
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    await loadFloorplan(customerIndex, floorplanIndex);
}
FD.HomeMenuService?.configure?.({
    appVersion: APP_VERSION,
    logoSrc: `dooratlas-logo-transparent-office.webp?v=${APP_VERSION}`,
    canRender: () => Boolean(currentUser) && appMode.isInteractiveView(),
    getCustomers: () => customers,
    loadCachedPreview: floorplan => FD.FloorplanCacheService.readCachedSVG(getFloorplanApiUrl(floorplan), {
        cacheVersion: CONFIG.offlineCacheVersion, config: CONFIG,
    }),
    loadRecentFloors: () => FD.DataService.loadRecentFloors(CONFIG),
    openFloorplan: openHomeMenuFloorplan,
    openPicker: () => selectionController.open('customer'),
    recordRecentFloor: floorId => FD.DataService.recordRecentFloor(CONFIG, floorId),
});
