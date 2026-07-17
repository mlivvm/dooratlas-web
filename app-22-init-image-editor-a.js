authController = FD.AuthService.createAuthController({
    loginConfig: LOGIN_CONFIG,
    appConfig: CONFIG,
    elements: {
        splashScreen: document.getElementById('splash-screen'),
        loginScreen: document.getElementById('login-screen'),
        appContainer,
        usernameInput: document.getElementById('login-username'),
        passwordInput: document.getElementById('login-password'),
        passwordToggleButton: document.getElementById('login-password-toggle'),
        rememberCheckbox: document.getElementById('login-remember'),
        loginButton: document.getElementById('login-btn'),
        errorEl: document.getElementById('login-error'),
    },
    logoutControls: {
        openButton: document.getElementById('btn-logout'),
        overlay: document.getElementById('logout-overlay'),
        popup: document.getElementById('logout-popup'),
        confirmButton: document.getElementById('logout-confirm'),
        cancelButton: document.getElementById('logout-cancel'),
    },
    modeController: appMode,
    modes: AppModes,
    emailConfig: {
        enabled: CONFIG.loginEmailNotificationsEnabled,
        publicKey: '3DTmVGOU0h5-m-l12',
        serviceId: 'service_in7o99q',
        templateId: 'template_j7na4ug',
    },
    hideTopbarMenu,
    showToast,
    onShowApp: showApp,
    onLogout: async () => {
        stopSessionHeartbeat();
        stopAdminActiveUsersPolling();
        await resetAppToStartScreen();
        stopPolling();
    },
    onSessionExpired: async () => {
        stopSessionHeartbeat();
        stopAdminActiveUsersPolling();
        await resetAppToStartScreen();
    },
});
FD.DataService.setSessionExpiredHandler?.((err, context) => handleExpiredSession(err, context));
authController.bind();
// ============================================================
// INIT
// ============================================================
async function init() {
    updateLabelsMenuButton();
    updateMarkerOutlineMenuButton();
    await Promise.all([loadCustomers(), loadStatus()]);
    updateRoleActionButtons();
    await restoreJotFormReturnIfNeeded();
}
// ============================================================
// IMAGE EDITOR
// ============================================================
let editorCanvas, editorCtx, editorStage, editorScale = 1, editorBaseScale = 1, editorSavedScale = 1, editorSavedPanX = 0, editorSavedPanY = 0;
let editorPanX = 0, editorPanY = 0, editorStartPanX = 0, editorStartPanY = 0, editorStartX = 0, editorStartY = 0;
let editorTool = 'pan';
let editorUndoStack = [];
let cropRect = null, activeCropHandle = null;
let editorSnapshot = null;
let editorRafId = null;
let eraseBrushSize = 30;
let erasePointerDown = false, eraseLastPt = null;
let editorSaving = false;
let editorIsPanning = false, editorDragMode = null;
let activeEditorPointers = new Map(), editorIsPinching = false, editorPinchDist = null, editorPinchMidX = 0, editorPinchMidY = 0;
let editorCropper = null;
let editorCropContext = null;
let editorCropRotation = 0;
let pendingCropSave = null;
function normalizeEditorRotation(value) {
    return ((Math.round(Number(value || 0) / 90) * 90) % 360 + 360) % 360;
}
function getCurrentFloorplanObj() {
    return getSelectedFloorplan().floorplan;
}
function prepareEditorCropperForFullFit() {
    if (!editorCropper?.getContainerData || !editorCropper?.setCropBoxData)
        return;
    const containerData = editorCropper.getContainerData();
    if (!containerData.width || !containerData.height)
        return;
    const width = Math.max(24, Math.min(96, containerData.width * 0.2));
    const height = Math.max(24, Math.min(96, containerData.height * 0.2));
    editorCropper.setCropBoxData({
        left: (containerData.width - width) / 2,
        top: (containerData.height - height) / 2,
        width,
        height,
    });
}
function fitEditorCropperCanvasToFullImage() {
    if (!editorCropper?.getContainerData || !editorCropper?.getCanvasData || !editorCropper?.setCanvasData || !editorCropper?.getImageData)
        return;
    const containerData = editorCropper.getContainerData();
    const canvasData = editorCropper.getCanvasData();
    const imageData = editorCropper.getImageData();
    const naturalWidth = canvasData.naturalWidth || imageData.naturalWidth || canvasData.width || 1;
    const naturalHeight = canvasData.naturalHeight || imageData.naturalHeight || canvasData.height || 1;
    if (!containerData.width || !containerData.height || !naturalWidth || !naturalHeight)
        return;
    const safeSpace = window.matchMedia?.('(pointer: coarse)')?.matches ? 72 : 56;
    const maxWidth = Math.max(1, containerData.width - safeSpace);
    const maxHeight = Math.max(1, containerData.height - safeSpace);
    const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    editorCropper.setCanvasData({
        left: (containerData.width - width) / 2,
        top: (containerData.height - height) / 2,
        width,
        height,
    });
}
function fitEditorCropperToFullImage() {
    if (!editorCropper)
        return;
    prepareEditorCropperForFullFit();
    fitEditorCropperCanvasToFullImage();
    if (typeof editorCropper.setCropBoxData === 'function') {
        const canvasData = editorCropper.getCanvasData();
        editorCropper.setCropBoxData({
            left: canvasData.left,
            top: canvasData.top,
            width: canvasData.width,
            height: canvasData.height,
        });
    }
}
function resetEditorCropperToRotation() {
    if (!editorCropper)
        return;
    const rotation = normalizeEditorRotation(editorCropRotation);
    editorCropper.reset();
    if (typeof editorCropper.rotateTo === 'function') {
        editorCropper.rotateTo(rotation);
    }
    else if (rotation && typeof editorCropper.rotate === 'function') {
        editorCropper.rotate(rotation);
    }
    requestAnimationFrame(() => {
        if (!editorCropper)
            return;
        fitEditorCropperToFullImage();
        requestAnimationFrame(() => {
            if (!editorCropper)
                return;
            fitEditorCropperToFullImage();
            setTimeout(() => {
                if (editorCropper)
                    fitEditorCropperToFullImage();
            }, 140);
        });
    });
}
function startCropperWhenEditorLayoutIsReady(cropImage, attempt = 0) {
    if (!editorCropContext)
        return;
    const overlay = document.getElementById('img-editor-overlay');
    const wrap = document.getElementById('img-editor-canvas-wrap');
    if (!overlay || !wrap || overlay.style.display === 'none')
        return;
    const layoutReady = wrap.clientWidth > 0 && wrap.clientHeight > 0 && cropImage.naturalWidth > 0 && cropImage.naturalHeight > 0;
    if (!layoutReady && attempt < 30) {
        requestAnimationFrame(() => startCropperWhenEditorLayoutIsReady(cropImage, attempt + 1));
        return;
    }
    if (!layoutReady) {
        showToast('Crop-tool kon de plattegrond niet openen', 'error');
        return;
    }
    if (editorCropper) {
        editorCropper.destroy();
        editorCropper = null;
    }
    editorCropper = new Cropper(cropImage, {
        viewMode: 1,
        autoCropArea: 1,
        dragMode: 'move',
        background: false,
        movable: true,
        zoomable: true,
        scalable: false,
        rotatable: true,
        responsive: true,
        restore: false,
        guides: true,
        ready() {
            if (!editorCropper || !editorCropContext)
                return;
            const imageData = editorCropper.getImageData();
            const naturalWidth = imageData.naturalWidth || cropImage.naturalWidth;
            const naturalHeight = imageData.naturalHeight || cropImage.naturalHeight;
            if (!naturalWidth || !naturalHeight)
                return;
            editorCropper.setData({
                x: 0,
                y: 0,
                width: naturalWidth,
                height: naturalHeight,
            });
            requestAnimationFrame(() => {
                if (editorCropper && editorCropContext)
                    fitEditorCropperToFullImage();
            });
        },
    });
}
function openImageEditor() {
    if (isEditModeActive()) {
        showToast('Sluit eerst de bewerkingsmodus', 'error');
        return;
    }
    if (!appMode.isInteractiveView()) {
        showToast('Sluit eerst het huidige scherm', 'error');
        return;
    }
    if (typeof Cropper === 'undefined') {
        showToast('Crop-tool kon niet worden geladen', 'error');
        return;
    }
    if (document.getElementById('img-editor-overlay').style.display !== 'none')
        return;
    hideTopbarMenu();
    const svgEl = svgContainer.querySelector('svg');
    const svgImgEl = svgEl?.querySelector('image');
    if (!svgImgEl) {
        showToast('Geen afbeelding gevonden in plattegrond', 'error');
        return;
    }
    const vb = svgEl?.viewBox?.baseVal;
    if (!vb || !vb.width || !vb.height) {
        showToast('Plattegrond heeft geen geldige afmetingen', 'error');
        return;
    }
    const imageHref = svgImgEl.getAttribute('href') || svgImgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!imageHref || !imageHref.startsWith('data:image')) {
        showToast('Afbeelding kan niet worden geladen', 'error');
        return;
    }
    editorStage = document.getElementById('img-editor-stage');
    editorCanvas = document.getElementById('img-editor-canvas');
    editorCtx = editorCanvas.getContext('2d');
    editorUndoStack = [];
    editorSaving = false;
    editorCropRotation = 0;
    pendingCropSave = null;
    document.getElementById('img-editor-save').disabled = false;
    document.getElementById('img-editor-save').textContent = '\uD83D\uDCBE Opslaan';
    editorCropContext = {
        svgEl,
        svgImgEl,
        imageHref,
        vb: { x: vb.x || 0, y: vb.y || 0, width: vb.width, height: vb.height },
        imgX: parseFloat(svgImgEl.getAttribute('x') || '0') || 0,
        imgY: parseFloat(svgImgEl.getAttribute('y') || '0') || 0,
        imgW: parseFloat(svgImgEl.getAttribute('width') || String(vb.width)) || vb.width,
        imgH: parseFloat(svgImgEl.getAttribute('height') || String(vb.height)) || vb.height,
    };
    appMode.enter(AppModes.IMAGE_EDITOR, { imageHref });
}
function enterImageEditorModeUI(imageHref) {
    if (editorCropper) {
        editorCropper.destroy();
        editorCropper = null;
    }
    editorCropRotation = 0;
    const cropImage = document.getElementById('img-editor-crop-image');
    cropImage.onload = null;
    cropImage.onerror = null;
    cropImage.removeAttribute('src');
    cropImage.style.display = 'block';
    cropImage.onload = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => startCropperWhenEditorLayoutIsReady(cropImage));
        });
    };
    cropImage.onerror = () => showToast('Afbeelding laden mislukt', 'error');
    document.getElementById('img-editor-overlay').style.display = 'flex';
    cropImage.src = imageHref;
}
function waitForEditorLayoutAndFit(attempt = 0) {
    const wrap = document.getElementById('img-editor-canvas-wrap');
    if (!wrap || !editorCanvas || !editorCanvas.width || !editorCanvas.height)
        return;
    if ((!wrap.clientWidth || !wrap.clientHeight) && attempt < 20) {
        requestAnimationFrame(() => waitForEditorLayoutAndFit(attempt + 1));
        return;
    }
    fitEditorToScreen();
    setEditorTool('pan');
    if (attempt === 0) {
        requestAnimationFrame(() => {
            if (document.getElementById('img-editor-overlay').style.display !== 'none') {
                fitEditorToScreen();
            }
        });
        setTimeout(() => {
            if (document.getElementById('img-editor-overlay').style.display !== 'none') {
                fitEditorToScreen();
            }
        }, 120);
    }
}
function fitEditorToScreen() {
    const wrap = document.getElementById('img-editor-canvas-wrap');
    const wW = wrap.clientWidth, wH = wrap.clientHeight;
    if (!wW || !wH || !editorCanvas.width || !editorCanvas.height)
        return;
    editorBaseScale = Math.min(wW / editorCanvas.width, wH / editorCanvas.height) * 0.92;
    editorScale = editorBaseScale;
    editorPanX = (wW - editorCanvas.width * editorScale) / 2;
    editorPanY = (wH - editorCanvas.height * editorScale) / 2;
    editorSavedScale = editorScale;
    editorSavedPanX = editorPanX;
    editorSavedPanY = editorPanY;
    applyEditorViewport();
}
function updateEditorScale() {
    fitEditorToScreen();
}
function applyEditorViewport() {
    editorCanvas.style.width = editorCanvas.width + 'px';
    editorCanvas.style.height = editorCanvas.height + 'px';
    editorStage.style.width = editorCanvas.width + 'px';
    editorStage.style.height = editorCanvas.height + 'px';
    editorStage.style.transform = `translate(${editorPanX}px, ${editorPanY}px) scale(${editorScale})`;
    editorCanvas.classList.toggle('is-dragging', editorIsPanning && editorTool === 'pan');
    if (editorTool === 'pan') {
        editorCanvas.style.cursor = editorIsPanning ? 'grabbing' : 'grab';
    }
    else {
        editorCanvas.style.cursor = 'crosshair';
    }
}
function restoreEditorSnapshotToCanvas() {
    if (!editorSnapshot || !editorCanvas || !editorCtx)
        return false;
    if (editorSnapshot.width !== editorCanvas.width || editorSnapshot.height !== editorCanvas.height)
        return false;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(editorSnapshot, 0, 0);
    return true;
}
function stopCropPreview({ restoreCanvas = true, clearSnapshot = false } = {}) {
    if (editorRafId) {
        cancelAnimationFrame(editorRafId);
        editorRafId = null;
    }
    if (restoreCanvas)
        restoreEditorSnapshotToCanvas();
    if (clearSnapshot) {
        editorSnapshot = null;
        cropRect = null;
        activeCropHandle = null;
    }
}
