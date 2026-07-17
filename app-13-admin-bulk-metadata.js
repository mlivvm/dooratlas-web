function openSelectedTopbarMetadataDialog() {
    if (!isAdminUser())
        return;
    const record = getSelectedTopbarFloorplanRecord();
    if (!record) {
        showToast('Kies eerst een plattegrond', 'error');
        return;
    }
    openAdminMetadataDialog(record);
}
function renderAdminDetail() {
    const record = getSelectedAdminFloorplan();
    if (!record) {
        if (adminDetailEmpty)
            adminDetailEmpty.style.display = 'flex';
        if (adminDetailContent)
            adminDetailContent.style.display = 'none';
        if (adminDoorDetailCard)
            adminDoorDetailCard.hidden = true;
        resetAdminPreview();
        return;
    }
    if (adminDetailEmpty)
        adminDetailEmpty.style.display = 'none';
    if (adminDetailContent)
        adminDetailContent.style.display = 'block';
    const selectedDoor = getSelectedAdminDoor();
    if (adminDoorDetailCard)
        adminDoorDetailCard.hidden = !selectedDoor;
    if (selectedDoor) {
        if (adminDoorDetailDot)
            adminDoorDetailDot.style.background = adminDoorColor(selectedDoor);
        if (adminDoorDetailCode) {
            adminDoorDetailCode.textContent = selectedDoor.code || selectedDoor.doorCode || selectedDoor.door_code || selectedDoor.name || 'Deur';
        }
        if (adminDoorDetailStatus)
            adminDoorDetailStatus.textContent = adminStatusLabel(selectedDoor);
        if (adminDoorDetailMeta) {
            adminDoorDetailMeta.textContent = `${selectedDoor.customer} · ${selectedDoor.floorplanDisplayName || selectedDoor.floorplan}`;
        }
    }
    if (adminDetailTitle)
        adminDetailTitle.textContent = record.displayName || record.name || 'Plattegrond';
    if (adminDetailMeta) {
        const repoLabel = record.repo === 'uploads' ? 'upload' : 'gallery';
        adminDetailMeta.textContent = [record.customer, repoLabel, `technisch: ${record.name}`]
            .filter(Boolean)
            .join(' · ');
    }
    if (adminDetailStats) {
        adminDetailStats.textContent = `${record.done || 0} van ${record.doorsTotal || 0} deuren afgerond · ${record.open || 0} openstaand · ${record.attention || 0} aandacht nodig`;
    }
    if (adminDashboardState.activeTab === 'details')
        loadAdminPreview(record);
}
function renderAdminDashboard() {
    setAdminTab(adminDashboardState.activeTab);
    renderAdminFreshness();
    renderAdminKpis();
    renderAdminOverview();
    renderAdminActivity();
    renderAdminCustomerFilters();
    renderAdminLocationFilters();
    renderAdminFloorplanList();
    renderAdminDoorResults();
    renderAdminDetail();
    updateRoleActionButtons();
}
async function loadAdminDashboard({ force = false } = {}) {
    if (!isAdminUser())
        return;
    if (adminDashboardState.loading)
        return;
    if (!force && adminDashboardState.data) {
        renderAdminDashboard();
        loadActiveUsers();
        loadAdminActivity();
        return;
    }
    setAdminDashboardLoading(true);
    adminDashboardState.loadError = '';
    const generation = FD.DataService.sessionGeneration?.();
    try {
        const data = await FD.DataService.fetchAdminOverview(CONFIG, {
            diagnostics: {
                purpose: 'admin_overview',
                background: true,
            },
        });
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        adminDashboardState.data = data;
        adminDashboardState.lastUpdatedAt = data.generated_at || data.generatedAt || new Date().toISOString();
        if (Array.isArray(data.customers) && data.customers.length) {
            const previousSelection = getSelectedFloorplan();
            const previousCustomerIndex = FD.SelectSheetService.selectedIndex(customerSelect);
            const previousCustomer = previousSelection.customer ||
                (previousCustomerIndex !== null ? customers[previousCustomerIndex] : null);
            const previousFloorplan = previousSelection.floorplan || null;
            const previousRepo = previousFloorplan?.repo === 'uploads' ? 'uploads' : 'gallery';
            customers = data.customers;
            cacheCustomers();
            populateCustomerDropdown();
            const selectedCustomerIndex = customers.findIndex(customer => adminSameTenant(customer, previousCustomer));
            if (selectedCustomerIndex >= 0) {
                customerSelect.value = String(selectedCustomerIndex);
                populateFloorplanDropdown(selectedCustomerIndex);
                if (previousFloorplan) {
                    const selectedFloorplanIndex = (customers[selectedCustomerIndex].floorplans || []).findIndex(fp => (fp.name === previousFloorplan.name &&
                        fp.file === previousFloorplan.file &&
                        (fp.repo === 'uploads' ? 'uploads' : 'gallery') === previousRepo));
                    if (selectedFloorplanIndex >= 0)
                        floorplanSelect.value = String(selectedFloorplanIndex);
                }
                updatePickerButtons();
            }
        }
        setAdminDashboardLoading(false);
        renderAdminDashboard();
    }
    catch (err) {
        if (generation !== FD.DataService.sessionGeneration?.())
            return;
        console.warn('Admin dashboard laden mislukt:', err);
        adminDashboardState.loadError = err.message || 'dashboard_failed';
        if (adminFloorplanList) {
            adminFloorplanList.innerHTML = '<div class="admin-dashboard-empty">Dashboard laden mislukt.</div>';
        }
    }
    finally {
        setAdminDashboardLoading(false);
        loadActiveUsers();
        loadAdminActivity();
    }
}
function showAdminDashboard({ force = false } = {}) {
    if (!isAdminUser())
        return;
    if (isEditModeActive()) {
        showToast('Sluit eerst de bewerkingsmodus', 'error');
        return;
    }
    adminDashboardState.visible = true;
    appContainer.classList.add('admin-dashboard-active');
    if (adminDashboardEl)
        adminDashboardEl.style.display = 'flex';
    loadingEl.classList.add('hidden');
    closeSidePanel();
    stopPolling();
    renderAdminDashboard();
    updateRoleActionButtons();
    startAdminActiveUsersPolling();
    loadAdminDashboard({ force });
}
function hideAdminDashboard() {
    adminDashboardState.visible = false;
    stopAdminActiveUsersPolling();
    appContainer.classList.remove('admin-dashboard-active');
    if (adminDashboardEl)
        adminDashboardEl.style.display = 'none';
    updateRoleActionButtons();
}
function returnToCurrentFloorplanFromDashboard() {
    if (!hasCurrentFloorplanView())
        return false;
    restoreTopbarToCurrentFloorplan();
    hideAdminDashboard();
    syncSidePanelForViewport();
    refreshAllDoorColors();
    refreshJotFormSubmissionCache().catch(err => {
        console.warn('JotForm status na dashboard-terugkeer laden mislukt:', err);
    });
    statusController.poll().catch(err => {
        console.warn('Status na dashboard-terugkeer laden mislukt:', err);
    });
    startPolling();
    return true;
}
async function loadAdminPreview(record) {
    if (!adminDetailPreview || !record)
        return;
    const key = adminFloorplanKey(record);
    if (adminDashboardState.previewKey === key && adminDetailPreview.querySelector('svg'))
        return;
    const requestId = adminDashboardState.previewRequestId + 1;
    const generation = FD.DataService.sessionGeneration?.();
    adminDashboardState.previewRequestId = requestId;
    adminDashboardState.previewKey = key;
    adminDetailPreview.textContent = 'Preview laden...';
    try {
        const result = await fetchFloorplanSVGCacheFirst(getFloorplanApiUrl(record));
        const svgText = typeof result === 'string' ? result : result?.svgText;
        if (!svgText)
            throw new Error('Preview SVG ontbreekt.');
        if (generation !== FD.DataService.sessionGeneration?.() ||
            adminDashboardState.previewRequestId !== requestId || adminDashboardState.previewKey !== key)
            return;
        adminDetailPreview.innerHTML = FD.FloorplanViewService.sanitizeSVGText(svgText);
        const svg = adminDetailPreview.querySelector('svg');
        if (svg) {
            fitAdminPreviewSvg(svg);
        }
    }
    catch (err) {
        if (generation === FD.DataService.sessionGeneration?.() && adminDashboardState.previewRequestId === requestId) {
            adminDetailPreview.textContent = 'Preview niet beschikbaar';
        }
    }
}
function parseSvgLength(value) {
    const match = String(value || '').trim().match(/^(-?\d+(?:\.\d+)?)/);
    const number = match ? Number(match[1]) : 0;
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function fitAdminPreviewSvg(svg) {
    const width = parseSvgLength(svg.getAttribute('width'));
    const height = parseSvgLength(svg.getAttribute('height'));
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox && width && height) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    svg.removeAttribute('transform');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.position = 'static';
    svg.style.inset = 'auto';
    svg.style.top = 'auto';
    svg.style.right = 'auto';
    svg.style.bottom = 'auto';
    svg.style.left = 'auto';
    svg.style.transform = 'none';
    svg.style.transformOrigin = '50% 50%';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    requestAnimationFrame(() => {
        if (!svg.isConnected)
            return;
        const currentViewBox = svg.getAttribute('viewBox');
        if (currentViewBox && !/^0\s+0\s+0\s+0$/.test(currentViewBox.trim()))
            return;
        try {
            const box = svg.getBBox();
            if (box.width > 0 && box.height > 0) {
                svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
            }
        }
        catch { }
    });
}
function findFloorplanSelectionForAdminRecord(record) {
    const floorplanName = record?.name || record?.floorplan || '';
    const repo = record?.repo === 'uploads' ? 'uploads' : 'gallery';
    const file = record?.file || '';
    const customerIndex = customers.findIndex(customer => adminSameTenant(customer, record));
    if (customerIndex < 0)
        return { customerIndex: -1, floorplanIndex: -1 };
    const floorplanIndex = (customers[customerIndex].floorplans || []).findIndex(fp => (fp.name === floorplanName &&
        fp.file === file &&
        (fp.repo === 'uploads' ? 'uploads' : 'gallery') === repo));
    return { customerIndex, floorplanIndex };
}
async function openAdminFloorplan(record, doorId = '') {
    if (!record)
        return;
    hideAdminDashboard();
    let { customerIndex, floorplanIndex } = findFloorplanSelectionForAdminRecord(record);
    if (customerIndex < 0 || floorplanIndex < 0) {
        await loadCustomers();
        ({ customerIndex, floorplanIndex } = findFloorplanSelectionForAdminRecord(record));
    }
    if (customerIndex < 0 || floorplanIndex < 0) {
        showToast('Plattegrond niet gevonden', 'error');
        showAdminDashboard();
        return;
    }
    customerSelect.value = String(customerIndex);
    populateFloorplanDropdown(customerIndex);
    floorplanSelect.value = String(floorplanIndex);
    updatePickerButtons();
    await loadFloorplan(customerIndex, floorplanIndex);
    const markerKey = normalizeAdminDoorId(doorId);
    if (markerKey && FD.MarkerService.markerExists(svgContainer, markerKey)) {
        selectDoor(markerKey);
    }
}
