async function saveEditMode() {
    if (editSaving)
        return;
    if (!(await ensureActiveSession({
        force: true,
        purpose: 'marker_save_preflight',
        background: false,
    })))
        return;
    if (editSaveRequiresRefresh) {
        showToast('De plattegrond is elders gewijzigd. Vernieuw de pagina voordat je opnieuw opslaat.', 'error');
        return;
    }
    if (resizingMarker)
        applyResize();
    if (movingMarker)
        cancelMoveMode();
    if (isShapePlacementActive()) {
        showToast('Rond eerst de nieuwe vorm af of annuleer deze.', 'error');
        return;
    }
    if (hasPolygonDraft()) {
        showToast('Sluit of annuleer eerst de polygoon die je aan het tekenen bent.', 'error');
        return;
    }
    if (polygonVertexEditor)
        finishPolygonVertexEdit();
    if (editChanges.length === 0) {
        exitEditMode();
        return;
    }
    const svgEl = svgContainer.querySelector('svg');
    const btnSave = document.getElementById('btn-edit-save');
    btnSave.textContent = 'Opslaan...';
    btnSave.disabled = true;
    editSaving = true;
    busyOverlay.show({
        title: 'Plattegrond opslaan',
        subtitle: 'Wijzigingen worden opgeslagen...',
    });
    try {
        const securityLevels = Object.fromEntries(Array.from(svgContainer.querySelectorAll('[data-door-id]')).map(marker => [
            marker.dataset.doorId,
            FD.MapModeService.markerSecurityLevel(marker),
        ]));
        const { floorplan: fp } = getSelectedFloorplan();
        if (!fp)
            throw new Error('Geen plattegrond geselecteerd');
        const fileUrl = getFloorplanApiUrl(fp);
        pendingMarkerSaveId = pendingMarkerSaveId || FD.DataService.createMarkerSaveId();
        const updateResult = await FD.DataService.saveFloorplanMarkers(fileUrl, svgEl, {
            config: CONFIG,
            customerName: currentCustomer,
            floorplanName: currentFloorplan,
            message: 'Markers bijgewerkt: ' + currentCustomer + ' - ' + currentFloorplan,
            fetchErrorMessage: 'Kon bestand niet ophalen',
            saveErrorMessage: 'Kon niet opslaan',
            securityLevels,
            editChanges,
            clientMutationId: pendingMarkerSaveId,
        });
        if (!updateResult.noChanges) {
            floorplanLoadController.cancel();
            // The server owns the canonical SVG. Remove the stale private copy
            // instead of downloading the full map again in the foreground.
            await updateCachedSVGAfterSave(fileUrl, updateResult, '');
            syncFloorplanSummaryFromMutation(fp, updateResult);
            invalidateAdminDashboard();
        }
        resetDoorCodeIndexState();
        exitEditMode();
        editChanges = [];
        pendingMarkerSaveId = '';
        editSaveRequiresRefresh = false;
        refreshAllDoorColors();
        if (showLabels)
            updateEditLabels();
        showToast('Opgeslagen', 'success');
    }
    catch (err) {
        const duplicateMessage = duplicateDoorCodeMessage(err);
        const saveStatusUnknown = err?.code === 'marker_save_unknown';
        const offline = err?.code === 'marker_save_offline';
        if (!saveStatusUnknown && !offline)
            pendingMarkerSaveId = '';
        if (Number(err?.status) === 409 && !duplicateMessage)
            editSaveRequiresRefresh = true;
        const message = saveStatusUnknown
            ? 'Opslagstatus onbekend. Bewerk niets en klik opnieuw op Opslaan zodra de verbinding terug is.'
            : offline
                ? 'Geen verbinding. De wijzigingen staan nog open; probeer opnieuw zodra je online bent.'
                : duplicateMessage
                    ? 'Opslaan mislukt: ' + duplicateMessage
                    : 'Opslaan mislukt: ' + err.message;
        showToast(message, 'error');
        btnSave.textContent = 'Opslaan';
        btnSave.disabled = false;
    }
    finally {
        editSaving = false;
        busyOverlay.hide();
    }
}
