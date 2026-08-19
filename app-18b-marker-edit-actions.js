function handleEditTapOnDoor(doorId) {
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
    if (polygonVertexEditor) {
        finishPolygonVertexEdit();
        return;
    }
    const marker = FD.MarkerService.findMarkerByDoorId(svgContainer, doorId);
    if (!marker)
        return;
    const displayLabel = FD.MarkerService.markerDisplayLabel(marker);
    const isPolygon = FD.MarkerShapeService.shape(marker) === 'polygon';
    const actions = [{
            text: 'Verplaatsen', color: '#7b1fa2',
            action: () => {
                closeEditPopup();
                if (isPolygon) {
                    showEditPopup('Polygoon verplaatsen', null, [
                        { text: 'Punten verplaatsen', color: '#1a73e8', action: () => { closeEditPopup(); startPolygonVertexEdit(marker, doorId); } },
                        {
                            text: 'Geheel verplaatsen', color: '#7b1fa2', action: () => {
                                closeEditPopup();
                                const position = FD.MarkerService.markerPosition(marker);
                                if (position)
                                    startMoveMode(marker, doorId, position.x, position.y);
                            },
                        },
                        { text: 'Annuleren', color: '#e0e0e0', textColor: '#333', action: closeEditPopup },
                    ]);
                    return;
                }
                const position = FD.MarkerService.markerPosition(marker);
                if (position)
                    startMoveMode(marker, doorId, position.x, position.y);
            },
        }];
    if (!isPolygon)
        actions.push({
            text: 'Grootte aanpassen', color: '#e67700', action: () => {
                closeEditPopup();
                startResizeMode(marker, doorId, getMarkerRadius(marker));
            },
        });
    actions.push({
        text: 'Deurgegevens wijzigen', color: '#1a73e8', action: () => {
            closeEditPopup();
            const currentCode = FD.MarkerService.markerDoorCode(marker);
            const currentDescription = FD.MarkerService.markerDoorDescription(marker);
            const currentSecurityLevel = FD.MapModeService.markerSecurityLevel(marker);
            showDoorMetadataPopup({
                title: 'Deurgegevens wijzigen', doorCode: currentCode, description: currentDescription, securityLevel: currentSecurityLevel,
                onSubmit: ({ doorCode, description, securityLevel }) => {
                    if (doorCode === currentCode && description === currentDescription && securityLevel === currentSecurityLevel)
                        return void closeEditPopup();
                    const localMatch = FD.MarkerService.findMarkerByDoorCode(svgContainer, doorCode);
                    if (localMatch && localMatch !== marker)
                        return void (editPopupError.textContent = 'Deze code bestaat al op deze plattegrond.');
                    const loadingMessage = doorCodeIndexLoadingMessage();
                    if (loadingMessage)
                        return void (editPopupError.textContent = loadingMessage);
                    const conflict = findGlobalDoorCodeConflict(doorCode);
                    if (conflict)
                        return void (editPopupError.textContent = globalDoorCodeConflictMessage(conflict, doorCode));
                    renameMarker(doorId, doorCode, description, securityLevel);
                    closeEditPopup();
                },
            });
        },
    }, {
        text: 'Verwijderen', color: '#d93025', action: () => {
            closeEditPopup();
            showEditPopup('Weet je zeker dat je deur ' + displayLabel + ' wilt verwijderen?', null, [
                { text: 'Ja, verwijderen', color: '#d93025', action: () => { deleteMarker(doorId); closeEditPopup(); } },
                { text: 'Nee', color: '#e0e0e0', textColor: '#333', action: closeEditPopup },
            ]);
        },
    }, { text: 'Sluiten', color: '#e0e0e0', textColor: '#333', action: closeEditPopup });
    showEditPopup('Deur: ' + displayLabel, null, actions);
}
