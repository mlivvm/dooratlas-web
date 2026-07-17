function exportFloorplanRecord(customer, floorplan) {
    const locationDetails = getFloorplanLocationDetails(customer, floorplan);
    return FD.ExportFlowService.recordForCustomerFloorplan(customer, floorplan, {
        displayName: FD.SelectSheetService.floorplanDisplayName(floorplan),
        locationAddress: locationDetails?.address || '',
        locationNote: locationDetails?.note || '',
    });
}
function currentCustomerExportFloorplans() {
    return (Array.isArray(customers) ? customers : [])
        .flatMap(customer => (customer.floorplans || []).map(floorplan => exportFloorplanRecord(customer, floorplan)));
}
function getExportFloorplanData() {
    const adminData = getAdminData();
    const floorplans = currentCustomerExportFloorplans();
    return {
        ...adminData,
        floorplans,
        doors: Array.isArray(adminData.doors) ? adminData.doors : [],
    };
}
function findExportFloorplanRecord(record, data = getExportFloorplanData()) {
    if (!record)
        return null;
    const floorplans = data.floorplans || [];
    const key = adminFloorplanKey(record);
    const primary = FD.ExportFlowService.findRecord(record, floorplans, adminFloorplanKey);
    if (primary)
        return primary;
    return floorplans.find(item => adminFloorplanKey(item) === key) ||
        floorplans.find(item => (adminSameTenant(item, record) &&
            (item?.repo === 'uploads' ? 'uploads' : 'gallery') === (record.repo === 'uploads' ? 'uploads' : 'gallery') &&
            item?.file === record.file)) ||
        floorplans.find(item => (adminSameTenant(item, record) &&
            ((item?.displayName || item?.name || '') === (record.displayName || record.name || '') ||
                (item?.name || item?.floorplan || '') === (record.name || record.floorplan || '')))) ||
        null;
}
async function loadExportFloorplanData(floorplans) {
    const floorIds = (Array.isArray(floorplans) ? floorplans : [])
        .map(record => FD.ExportFlowService.floorId(record))
        .filter(Boolean);
    if (typeof FD.DataService.fetchDoorcodeExport === 'function') {
        return FD.DataService.fetchDoorcodeExport(CONFIG, { floorIds });
    }
    return FD.ExportFlowService.loadFloorplanData({
        floorplans,
        config: CONFIG,
        fetchFloorplan: FD.DataServiceFloorplan?.fetchFloorplan,
    });
}
async function exportFloorplansForExcel(floorplans) {
    const selectedFloorplans = (Array.isArray(floorplans) ? floorplans : []).filter(Boolean);
    if (!selectedFloorplans.length) {
        setExportExcelError('Selecteer minimaal een plattegrond.');
        return;
    }
    setExportExcelBusy(true);
    setExportExcelError('Exportdata laden...');
    try {
        const exportData = await loadExportFloorplanData(selectedFloorplans);
        const selectedKeys = new Set(exportData.floorplans.map(record => FD.ExportService.floorplanKey(record)));
        const exportedDoorCount = exportData.doors
            .filter(door => selectedKeys.has(FD.ExportService.floorplanKey(door)))
            .filter(door => String(FD.ExportFlowService.doorCode?.(door) || '').trim())
            .length;
        FD.ExportService.downloadDoorcodeWorkbook({
            floorplans: exportData.floorplans,
            doors: exportData.doors,
            documentEl: document,
        });
        hideExportExcelDialog();
        const floorplanText = `${exportData.floorplans.length} plattegrond${exportData.floorplans.length === 1 ? '' : 'en'}`;
        const doorText = `${exportedDoorCount} deurcode${exportedDoorCount === 1 ? '' : 's'}`;
        showToast(`Excel export gemaakt: ${floorplanText}, ${doorText}`, 'success');
    }
    catch (err) {
        console.warn('Excel exportdata laden mislukt:', err);
        setExportExcelError('Exportdata laden mislukt.');
    }
    finally {
        setExportExcelBusy(false);
    }
}
function renderExportFloorplanChoices() {
    if (!exportExcelList)
        return;
    exportExcelList.innerHTML = '';
    const data = getExportFloorplanData();
    const base = findExportFloorplanRecord(exportExcelBaseRecord, data);
    if (!base) {
        setExportExcelError('Deze plattegrond staat niet in de exportdata.');
        return;
    }
    const sameCustomer = (data.floorplans || [])
        .filter(record => adminSameTenant(record, base))
        .sort((left, right) => ADMIN_COLLATOR.compare(left.displayName || left.name || '', right.displayName || right.name || ''));
    if (!sameCustomer.length) {
        setExportExcelError('Geen plattegronden gevonden voor deze klant.');
        return;
    }
    sameCustomer.forEach(record => {
        const label = document.createElement('label');
        label.className = 'export-excel-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = adminFloorplanKey(record);
        input.checked = adminFloorplanKey(record) === adminFloorplanKey(base);
        const text = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = record.displayName || record.name || 'Plattegrond';
        const meta = document.createElement('span');
        meta.textContent = `${record.doorsTotal || 0} deurcode${Number(record.doorsTotal || 0) === 1 ? '' : 's'}`;
        text.append(name, meta);
        label.append(input, text);
        exportExcelList.appendChild(label);
    });
}
async function openExportExcelDialog() {
    hideTopbarMenu();
    if (!canUseExcelExport())
        return;
    if (!appMode.isInteractiveView()) {
        showToast('Sluit eerst het huidige scherm', 'error');
        return;
    }
    const base = getExportBaseRecord();
    if (!base) {
        showToast('Kies eerst een plattegrond', 'error');
        return;
    }
    exportExcelBaseRecord = findExportFloorplanRecord(base, getExportFloorplanData()) || base;
    if (exportExcelContext) {
        exportExcelContext.textContent = `${exportExcelBaseRecord.customer} · ${exportExcelBaseRecord.displayName || exportExcelBaseRecord.name || 'Plattegrond'}`;
    }
    if (exportExcelSelection)
        exportExcelSelection.hidden = true;
    setExportExcelError('');
    exportExcelDialog.show();
}
async function exportCurrentFloorplan() {
    const record = findExportFloorplanRecord(exportExcelBaseRecord, getExportFloorplanData());
    if (!record) {
        setExportExcelError('Deze plattegrond staat niet in de exportdata.');
        return;
    }
    await exportFloorplansForExcel([record]);
}
function showExportFloorplanSelection() {
    if (exportExcelSelection)
        exportExcelSelection.hidden = false;
    setExportExcelError('');
    renderExportFloorplanChoices();
}
async function exportSelectedFloorplans() {
    const selectedKeys = Array.from(exportExcelList?.querySelectorAll('input[type="checkbox"]:checked') || [])
        .map(input => input.value);
    const selectedSet = new Set(selectedKeys);
    const data = getExportFloorplanData();
    const base = findExportFloorplanRecord(exportExcelBaseRecord, data);
    if (!base) {
        setExportExcelError('Deze plattegrond staat niet in de exportdata.');
        return;
    }
    const selected = (data.floorplans || [])
        .filter(record => adminSameTenant(record, base) && selectedSet.has(adminFloorplanKey(record)));
    await exportFloorplansForExcel(selected);
}
function printFloorplanTitle() {
    const record = getSelectedTopbarFloorplanRecord();
    return [
        record?.customer || currentCustomer,
        record?.displayName || record?.name || currentFloorplan,
    ].filter(Boolean).join(' - ') || 'Plattegrond';
}
function ensurePrintFloorplanRoot() {
    let root = document.getElementById('print-floorplan-root');
    if (root)
        return root;
    root = document.createElement('div');
    root.id = 'print-floorplan-root';
    root.className = 'print-floorplan-root';
    document.body.appendChild(root);
    return root;
}
function cleanPrintFilename(value) {
    return String(value || 'Plattegrond')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Plattegrond';
}
function appendPrintLabels(svgEl) {
    if (!svgEl || !showLabels)
        return;
    const ns = 'http://www.w3.org/2000/svg';
    const labelScale = savedScale || scale || 1;
    const labels = FD.MarkerService.labelPlacements(svgEl.querySelectorAll('[data-door-id]'), {
        scale: labelScale,
        activeDoorId: '',
        bounds: FD.MarkerService.labelBounds(svgEl),
    });
    labels.forEach(label => {
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', label.x.toString());
        text.setAttribute('y', label.y.toString());
        text.setAttribute('font-size', label.fontSize.toString());
        text.setAttribute('fill', '#222');
        text.setAttribute('stroke', '#fff');
        text.setAttribute('stroke-width', label.strokeWidth.toString());
        text.setAttribute('paint-order', 'stroke');
        text.setAttribute('text-anchor', label.anchor);
        text.setAttribute('data-fd-label', '1');
        text.setAttribute('pointer-events', 'none');
        text.style.userSelect = 'none';
        text.textContent = label.text;
        svgEl.appendChild(text);
    });
}
function cloneCurrentFloorplanForPrint() {
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return null;
    const printSvg = svgEl.cloneNode(true);
    printSvg.querySelectorAll('[data-fd-label]').forEach(el => el.remove());
    printSvg.querySelectorAll('[data-fd-pending-marker]').forEach(el => el.remove());
    printSvg.querySelectorAll('[data-door-id]').forEach(marker => applyPrintDoorMarkerStyle(marker));
    printSvg.removeAttribute('width');
    printSvg.removeAttribute('height');
    printSvg.removeAttribute('transform');
    printSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    printSvg.style.position = 'static';
    printSvg.style.top = '';
    printSvg.style.left = '';
    printSvg.style.transform = 'none';
    printSvg.style.transformOrigin = '50% 50%';
    printSvg.style.width = '100%';
    printSvg.style.height = 'auto';
    printSvg.style.maxWidth = '100%';
    printSvg.style.maxHeight = '100%';
    printSvg.style.userSelect = 'none';
    appendPrintLabels(printSvg);
    return printSvg;
}
function renderPrintFloorplan() {
    const printSvg = cloneCurrentFloorplanForPrint();
    if (!printSvg)
        return null;
    const title = printFloorplanTitle();
    const root = ensurePrintFloorplanRoot();
    root.innerHTML = '';
    const pageEl = document.createElement('section');
    pageEl.className = 'print-floorplan-page';
    const titleEl = document.createElement('div');
    titleEl.className = 'print-floorplan-title';
    titleEl.textContent = title;
    const canvasEl = document.createElement('div');
    canvasEl.className = 'print-floorplan-canvas';
    canvasEl.appendChild(printSvg);
    pageEl.append(titleEl, canvasEl);
    root.appendChild(pageEl);
    return { root, title };
}
function printCurrentFloorplanToPdf() {
    if (!appMode.isInteractiveView()) {
        hideTopbarMenu();
        showToast('Sluit eerst het huidige scherm', 'error');
        return;
    }
    if (adminDashboardState.visible || !hasCurrentFloorplanView() || !topbarSelectionMatchesCurrentFloorplan()) {
        hideTopbarMenu();
        showToast('Kies eerst een plattegrond', 'error');
        return;
    }
    const rendered = renderPrintFloorplan();
    if (!rendered) {
        hideTopbarMenu();
        showToast('Geen plattegrond gevonden om te printen', 'error');
        return;
    }
    hideTopbarMenu();
    const previousTitle = document.title;
    const printTitle = cleanPrintFilename(rendered.title);
    document.title = printTitle;
    let cleanupTimer = null;
    const cleanup = () => {
        window.removeEventListener('afterprint', cleanup);
        if (cleanupTimer)
            clearTimeout(cleanupTimer);
        if (document.title === printTitle)
            document.title = previousTitle;
        rendered.root.innerHTML = '';
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    cleanupTimer = setTimeout(cleanup, 60000);
    requestAnimationFrame(() => {
        try {
            window.print();
        }
        catch (err) {
            cleanup();
            showToast('Printen mislukt', 'error');
        }
    });
}
function handleEditTapOnEmpty(e) {
    if (!isEditModeActive())
        return;
    if (movingMarker) {
        cancelMoveMode();
        return;
    }
    if (resizingMarker) {
        applyResize();
        return;
    }
    const svgEl = svgContainer.querySelector('svg');
    if (!svgEl)
        return;
    const svgPoint = getSvgPointFromClient(e.clientX, e.clientY);
    if (!svgPoint || !isPointInsideEditableBounds(svgPoint.x, svgPoint.y))
        return;
    if (autoNumbering) {
        const code = getNextAutoCode();
        if (!code) {
            showToast('Voer eerst een prefix in', 'error');
            return;
        }
        if (FD.MarkerService.findMarkerByDoorCode(svgContainer, code)) {
            showToast('Code ' + code + ' bestaat al', 'error');
            return;
        }
        const loadingMessage = doorCodeIndexLoadingMessage();
        if (loadingMessage) {
            showToast(loadingMessage, 'error');
            return;
        }
        const conflict = findGlobalDoorCodeConflict(code);
        if (conflict) {
            showToast(globalDoorCodeConflictMessage(conflict, code), 'error');
            return;
        }
        addMarkerAtPosition(svgPoint.x, svgPoint.y, code);
        updateAutoPreview();
        return;
    }
    const previewMarker = showPendingAddMarker(svgPoint.x, svgPoint.y);
    showDoorMetadataPopup({
        title: 'Nieuwe deur', submitText: 'Toevoegen',
        onSubmit: ({ doorCode, description }) => {
            if (FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode)) {
                editPopupError.textContent = 'Deze code bestaat al op deze plattegrond.';
                return;
            }
            const loadingMessage = doorCodeIndexLoadingMessage();
            if (loadingMessage) {
                editPopupError.textContent = loadingMessage;
                return;
            }
            const conflict = findGlobalDoorCodeConflict(doorCode);
            if (conflict) {
                editPopupError.textContent = globalDoorCodeConflictMessage(conflict, doorCode);
                return;
            }
            clearPendingAddMarker();
            addMarkerAtPosition(svgPoint.x, svgPoint.y, doorCode, description);
            closeEditPopup();
        },
    });
    if (previewMarker)
        requestAnimationFrame(() => positionEditPopupAwayFromMarker(previewMarker));
}
