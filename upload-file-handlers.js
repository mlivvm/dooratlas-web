(function (global) {
    const FD = global.FD = global.FD || {};
    const Core = FD.UploadCore;
    function createUploadFileHandlers({ elements, nextGeneration, isGenerationCurrent, showToast, }) {
        function clearSelectedFile() {
            if (elements.selectedFileEl)
                elements.selectedFileEl.textContent = 'Nog geen bestanden gekozen';
        }
        async function handlePhotoChange(event) {
            const file = event.target.files[0];
            if (!file)
                return;
            if (file.size > Core.MAX_IMAGE_UPLOAD_BYTES) {
                event.target.value = '';
                clearSelectedFile();
                showToast('Bestand is te groot (max 20 MB)', 'error');
                return;
            }
            const generation = nextGeneration();
            if (elements.selectedFileEl)
                elements.selectedFileEl.textContent = file.name;
            try {
                await Core.validateImageUploadFile(file);
            }
            catch (err) {
                if (isGenerationCurrent(generation)) {
                    clearSelectedFile();
                    event.target.value = '';
                    showToast(err.message, 'error');
                }
                return;
            }
            const img = new global.Image();
            img.onload = () => {
                if (!isGenerationCurrent(generation))
                    return;
                try {
                    const result = Core.resizeImageToCanvas(img, 2000);
                    const dataUrl = Core.canvasToUploadJPEG(result.canvas, {
                        errorMessage: 'Afbeelding te groot. Probeer een kleinere foto.',
                    });
                    Core.showPreview(elements, dataUrl, result.width, result.height);
                }
                catch (err) {
                    showToast(err.message, 'error');
                }
                finally {
                    global.URL?.revokeObjectURL(img.src);
                }
            };
            img.onerror = () => {
                if (!isGenerationCurrent(generation))
                    return;
                global.URL?.revokeObjectURL(img.src);
                event.target.value = '';
                clearSelectedFile();
                showToast('Afbeelding kon niet worden geopend.', 'error');
            };
            img.src = global.URL?.createObjectURL(file);
        }
        async function handleSvgChange(event) {
            const file = event.target.files[0];
            if (!file)
                return;
            const generation = nextGeneration();
            if (elements.selectedFileEl)
                elements.selectedFileEl.textContent = file.name;
            try {
                const svgText = await Core.readValidSvgUploadFile(file);
                if (!isGenerationCurrent(generation))
                    return;
                const objectUrl = global.URL?.createObjectURL(file);
                Core.showPreview(elements, objectUrl, 1, 1);
                elements.imageState.svgText = svgText;
                elements.imageState.previewObjectUrl = objectUrl;
            }
            catch (err) {
                if (isGenerationCurrent(generation)) {
                    clearSelectedFile();
                    event.target.value = '';
                    showToast(err.message, 'error');
                }
            }
        }
        return { handlePhotoChange, handleSvgChange };
    }
    FD.UploadFileHandlers = { createUploadFileHandlers };
})(window);
