(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_ZOOM = 12.5;
    const ZOOM_MULTIPLIER = 2.5;
    function ensureOverlay() {
        const existing = global.document.getElementById('upload-pdf-preview-overlay');
        if (existing)
            return existing.previewState;
        const overlay = global.document.createElement('div');
        overlay.id = 'upload-pdf-preview-overlay';
        overlay.className = 'upload-pdf-preview-overlay';
        overlay.innerHTML = `
      <div class="upload-pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-pdf-preview-title">
        <div class="upload-pdf-preview-head">
          <span id="upload-pdf-preview-title">Pagina bekijken</span>
          <button type="button" class="upload-pdf-preview-close" aria-label="Voorbeeld sluiten">&times;</button>
        </div>
        <div class="upload-pdf-preview-body">
          <span class="upload-pdf-preview-loading">Voorbeeld laden...</span>
          <img alt="PDF pagina vergroot" draggable="false" tabindex="0" role="button" aria-label="Klik om in te zoomen" style="display:none;">
        </div>
      </div>
    `;
        const state = {
            overlay,
            title: overlay.querySelector('#upload-pdf-preview-title'),
            stage: overlay.querySelector('.upload-pdf-preview-body'),
            image: overlay.querySelector('img'),
            loading: overlay.querySelector('.upload-pdf-preview-loading'),
            zoom: 1,
            runId: 0,
        };
        overlay.previewState = state;
        overlay.addEventListener('click', event => { if (event.target === overlay)
            close(state); });
        overlay.querySelector('.upload-pdf-preview-close')?.addEventListener('click', () => close(state));
        global.document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay.classList.contains('is-open'))
                close(state);
        });
        state.image.addEventListener('click', (event) => zoomAtPointer(state, event.clientX, event.clientY));
        state.image.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            event.preventDefault();
            const rect = state.stage.getBoundingClientRect();
            zoomAtPointer(state, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
        global.document.body.appendChild(overlay);
        return state;
    }
    function applyZoom(state, nextZoom) {
        const image = state.image;
        const width = Math.max(1, image.naturalWidth || 1);
        state.zoom = Math.max(0.1, Math.min(MAX_ZOOM, nextZoom));
        image.style.width = `${Math.round(width * state.zoom)}px`;
        image.style.height = 'auto';
        image.dataset.zoom = String(state.zoom);
    }
    function fit(state) {
        const image = state.image;
        const stage = state.stage;
        if (!image.naturalWidth || !image.naturalHeight)
            return;
        const width = Math.max(1, stage.clientWidth - 28);
        const height = Math.max(1, stage.clientHeight - 28);
        applyZoom(state, Math.min(1, width / image.naturalWidth, height / image.naturalHeight));
        stage.scrollTo({ left: 0, top: 0 });
    }
    function zoomAtPointer(state, clientX, clientY) {
        const image = state.image;
        const stage = state.stage;
        if (!image.naturalWidth)
            return;
        const imageRect = image.getBoundingClientRect();
        const ratioX = Math.max(0, Math.min(1, (clientX - imageRect.left) / Math.max(1, imageRect.width)));
        const ratioY = Math.max(0, Math.min(1, (clientY - imageRect.top) / Math.max(1, imageRect.height)));
        const previousWidth = imageRect.width;
        const previousHeight = imageRect.height;
        applyZoom(state, Math.max(ZOOM_MULTIPLIER, state.zoom * ZOOM_MULTIPLIER));
        stage.scrollLeft += ratioX * (image.getBoundingClientRect().width - previousWidth);
        stage.scrollTop += ratioY * (image.getBoundingClientRect().height - previousHeight);
    }
    function setImage(state, source, alt, runId) {
        const image = state.image;
        const loading = state.loading;
        image.alt = alt;
        image.hidden = true;
        image.style.display = '';
        image.style.width = '';
        image.style.height = '';
        image.dataset.zoom = '';
        state.zoom = 1;
        loading.hidden = false;
        image.onload = () => {
            if (runId !== state.runId)
                return;
            image.hidden = false;
            loading.hidden = true;
            fit(state);
        };
        image.onerror = () => {
            if (runId !== state.runId)
                return;
            image.hidden = true;
            loading.hidden = false;
            loading.textContent = 'Voorbeeld kon niet worden geladen';
        };
        image.src = source;
    }
    async function open({ title, alt = 'PDF pagina vergroot', immediatePreview = '', loadPreview = null }) {
        const state = ensureOverlay();
        const runId = ++state.runId;
        state.overlay.classList.add('is-open');
        state.title.textContent = title || 'Pagina bekijken';
        state.loading.hidden = false;
        state.loading.textContent = 'Voorbeeld laden...';
        state.image.removeAttribute('src');
        state.image.hidden = true;
        state.image.hidden = true;
        if (immediatePreview)
            setImage(state, immediatePreview, alt, runId);
        if (typeof loadPreview !== 'function') {
            if (!immediatePreview)
                state.loading.textContent = 'Voorbeeld niet beschikbaar';
            return;
        }
        try {
            const source = await loadPreview();
            if (runId !== state.runId || !source)
                return;
            setImage(state, source, alt, runId);
        }
        catch {
            if (runId !== state.runId || immediatePreview)
                return;
            state.loading.textContent = 'Voorbeeld kon niet worden geladen';
        }
    }
    function close(state = ensureOverlay()) {
        state.runId++;
        state.overlay.classList.remove('is-open');
        state.image.onload = null;
        state.image.onerror = null;
        state.image.removeAttribute('src');
        state.image.style.width = '';
        state.image.style.height = '';
    }
    FD.UploadPdfPreview = { close, open };
})(window);
