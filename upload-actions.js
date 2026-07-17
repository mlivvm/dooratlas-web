(function (global) {
    const FD = global.FD = global.FD || {};
    function createUploadedFloorplanActionsController({ controls, getSelectedFloorplan, modeController, isEditMode = () => false, hideTopbarMenu = () => { }, showToast = () => { }, requestTopbarUpdate = () => { }, onDelete, }) {
        let bound = false;
        let pendingDeleteTarget = null;
        const deleteDialog = FD.UIShellService.createPopupPair({
            overlayEl: controls.deleteOverlay,
            popupEl: controls.deletePopup,
        });
        function getSelection() {
            return typeof getSelectedFloorplan === 'function' ? getSelectedFloorplan() : {};
        }
        function updateButtons() {
            const { floorplan } = getSelection();
            FD.UIShellService.updateUploadActionButtons({
                deleteButtonEl: controls.deleteButton,
                editImageButtonEl: controls.editImageButton,
                metadataButtonEl: controls.metadataButton,
                floorplan,
            });
            requestTopbarUpdate();
        }
        function normalizeDeleteTarget(target) {
            if (!target?.customer || !target?.floorplan)
                return {};
            return { customer: target.customer, floorplan: target.floorplan };
        }
        function showDeleteConfirm(target = null) {
            if (isEditMode()) {
                showToast('Sluit eerst de bewerkingsmodus', 'error');
                return;
            }
            if (!modeController.isInteractiveView()) {
                showToast('Sluit eerst het huidige scherm', 'error');
                return;
            }
            hideTopbarMenu();
            const current = normalizeDeleteTarget(target || getSelection());
            const { floorplan } = current;
            if (!floorplan)
                return;
            pendingDeleteTarget = current;
            controls.deleteMessage.textContent = `Weet je zeker dat je "${floorplan.name}" wilt verwijderen?`;
            deleteDialog.show();
        }
        function hideDeleteConfirm() {
            pendingDeleteTarget = null;
            deleteDialog.hide();
        }
        async function confirmDelete() {
            const { customer, floorplan } = normalizeDeleteTarget(pendingDeleteTarget || getSelection());
            if (!customer || !floorplan)
                return;
            hideDeleteConfirm();
            try {
                await onDelete({ customer, floorplan });
                updateButtons();
                showToast('Plattegrond verwijderd', 'success');
            }
            catch (err) {
                showToast('Verwijderen mislukt: ' + err.message, 'error');
            }
        }
        function bind() {
            if (bound)
                return;
            bound = true;
            controls.deleteButton.addEventListener('click', () => showDeleteConfirm());
            controls.deleteConfirmButton.addEventListener('click', confirmDelete);
            controls.deleteCancelButton.addEventListener('click', hideDeleteConfirm);
            controls.deleteOverlay.addEventListener('click', hideDeleteConfirm);
        }
        return { bind, hideDeleteConfirm, showDeleteConfirm, updateButtons };
    }
    FD.UploadActions = { createUploadedFloorplanActionsController };
})(window);
