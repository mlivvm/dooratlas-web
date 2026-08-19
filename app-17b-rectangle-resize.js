function showResizePopup(marker, doorId) {
    const slider = document.getElementById('edit-marker-size');
    editPopupTitle.textContent = 'Grootte aanpassen';
    editPopupError.textContent = '';
    editPopupInputRow.style.display = 'none';
    editPopupCustom.innerHTML = '';
    editPopupCustom.style.display = 'block';
    editPopupButtons.innerHTML = '';
    const control = document.createElement('div');
    control.className = 'resize-popup-control';
    const appendSlider = (labelText, value, max, onInput) => {
        const label = document.createElement('label');
        label.textContent = labelText;
        const valueEl = document.createElement('span');
        valueEl.textContent = String(Math.round(value));
        label.appendChild(valueEl);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '2';
        input.max = String(Math.max(2, Math.floor(max)));
        input.value = String(Math.round(value));
        input.addEventListener('input', () => { const next = Number(input.value); valueEl.textContent = String(Math.round(next)); onInput(next); if (showLabels)
            updateEditLabels(); });
        label.appendChild(input);
        control.appendChild(label);
    };
    const currentValue = parseInt(slider.value, 10);
    appendSlider(FD.MarkerService.markerDisplayLabel(marker), currentValue, Number(slider.max), value => {
        updateSliderValue(value);
    });
    editPopupCustom.appendChild(control);
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuleren';
    cancelBtn.style.background = '#e0e0e0';
    cancelBtn.style.color = '#333';
    cancelBtn.addEventListener('click', () => { cancelResize(); closeEditPopup(); });
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Klaar';
    doneBtn.style.background = '#34a853';
    doneBtn.style.color = 'white';
    doneBtn.addEventListener('click', () => { applyResize(); closeEditPopup(); });
    editPopupButtons.append(cancelBtn, doneBtn);
    editPopup.style.display = 'block';
    editOverlay.style.display = 'block';
    requestAnimationFrame(() => positionEditPopupAwayFromMarker(marker));
}
