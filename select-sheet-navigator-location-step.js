(function (global) {
    const FD = global.FD = global.FD || {};
    const LOCATION_NONE_VALUE = '__fd_no_location__';
    function options(group) {
        return Array.isArray(group?.options)
            ? group.options.filter(option => String(option.value || '').trim())
            : [];
    }
    function requiresChoice(group) {
        return options(group).filter(option => String(option.value) !== LOCATION_NONE_VALUE).length > 1;
    }
    function choosing(group, filterValue) {
        return requiresChoice(group) && !String(filterValue || '').trim();
    }
    function render(list, group, onSelect) {
        const items = options(group);
        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'select-navigator-empty';
            empty.textContent = 'Geen locaties beschikbaar';
            list.appendChild(empty);
            return;
        }
        items.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'select-navigator-location';
            const name = document.createElement('span');
            name.className = 'select-navigator-location-name';
            name.textContent = String(option.label || 'Locatie');
            const meta = document.createElement('span');
            meta.className = 'select-navigator-location-meta';
            const count = Number(option.count || 0);
            meta.textContent = `${count} ${count === 1 ? 'plattegrond' : 'plattegronden'}`;
            button.append(name, meta);
            button.addEventListener('click', () => onSelect(String(option.value || '')));
            list.appendChild(button);
        });
    }
    function injectStyles(tabletQuery) {
        if (document.getElementById?.('select-navigator-customer-search-hint-style'))
            return;
        const style = document.createElement('style');
        style.id = 'select-navigator-customer-search-hint-style';
        style.textContent = `
      .select-navigator-customer-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .select-navigator-customer-head-copy { min-width:0; }
      .select-navigator-customer-search-hint { display:inline-flex; flex:0 0 auto; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:var(--fd-admin-primary-soft,#eaf2ff); color:var(--fd-admin-primary,#155fc6); }
      .select-navigator-customer-search-hint svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; }
      .select-navigator-location { width:100%; min-height:64px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; margin-bottom:8px; padding:12px 14px; border:1px solid #d8e0ea; border-radius:9px; background:#fff; color:#1f2933; text-align:left; cursor:pointer; }
      .select-navigator-location:hover, .select-navigator-location:focus-visible { outline:none; border-color:#8eb4eb; background:#eef4ff; }
      .select-navigator-location-name { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:15px; font-weight:850; }
      .select-navigator-location-meta { display:inline-flex; align-items:center; min-height:26px; padding:4px 8px; border-radius:999px; background:#eef4ff; color:#174ea6; font-size:12px; font-weight:850; white-space:nowrap; }
      @media ${tabletQuery} and (max-width:859px) { .select-sheet{width:min(820px,calc(100vw - 28px));}.select-sheet-close{width:48px;height:48px;}.select-sheet-list--desktop{padding:0;background:#f8fafc;overflow:hidden;}.select-navigator{height:min(680px,calc(var(--app-height,100dvh) - var(--topbar-h,52px) - 92px));min-height:0;display:grid;grid-template-columns:minmax(230px,.68fr) minmax(0,1fr);background:#fff;}.select-navigator-customers,.select-navigator-floorplans{min-width:0;min-height:0;display:flex;flex-direction:column;}.select-navigator-customers{border-right:1px solid #e5e7eb;background:#f8fafc;}.select-navigator-pane-head{flex:0 0 auto;padding:12px 14px 10px;border-bottom:1px solid #e5e7eb;}.select-navigator-floorplan-head{display:block;}.select-navigator-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:8px;}.select-navigator-search,.select-navigator-filter-select{min-height:46px;width:100%;box-sizing:border-box;border:1px solid #d7dbe0;border-radius:8px;background:#fff;color:#1f2933;font-size:14px;font-weight:700;}.select-navigator-search{margin:0;padding:10px 12px;}.select-navigator-customers>.select-navigator-search{width:calc(100% - 28px);margin:10px 14px 8px;}.select-navigator-filter-select{padding:10px 34px 10px 12px;}.select-navigator-customer-list,.select-navigator-floorplan-list{flex:1;min-height:0;overflow-y:auto;}.select-navigator-customer-list{padding:0 8px 10px;}.select-navigator-floorplan-list{padding:10px 12px 14px;}.select-navigator-customer,.select-navigator-floorplan{width:100%;border:1px solid transparent;border-radius:8px;background:transparent;color:#1f2933;text-align:left;cursor:pointer;}.select-navigator-customer{min-height:50px;display:block;padding:10px;}.select-navigator-customer.selected,.select-navigator-floorplan.selected{border-color:#1a73e8;background:#e8f0fe;color:#174ea6;}.select-navigator-customer-name,.select-navigator-customer-meta,.select-navigator-floorplan-title,.select-navigator-floorplan-location,.select-navigator-floorplan-description{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.select-navigator-customer-name,.select-navigator-floorplan-title{font-size:15px;font-weight:850;line-height:1.25;}.select-navigator-customer-meta,.select-navigator-floorplan-location,.select-navigator-floorplan-description{margin-top:3px;color:#66717f;font-size:12px;font-weight:700;}.select-navigator-floorplan{min-height:74px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-bottom:8px;padding:10px;border-color:#e5e7eb;background:#fff;}.select-navigator-floorplan.readonly{background:#f5f6f7;color:#7a858f;}.select-navigator-floorplan-meta{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:5px;}.select-navigator-floorplan-badge,.select-navigator-open-label{display:inline-flex;align-items:center;min-height:26px;padding:4px 7px;border-radius:999px;background:#eef4ff;color:#174ea6;font-size:12px;font-weight:850;white-space:nowrap;}.select-navigator-open-label{border-radius:8px;background:#155fc6;color:#fff;}.select-navigator-empty{padding:24px 14px;color:#66717f;font-size:14px;font-weight:750;text-align:center;} }
    `;
        document.head.appendChild(style);
    }
    function customerSearchHint() {
        const hint = document.createElement('span');
        hint.className = 'select-navigator-customer-search-hint';
        hint.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '10.8');
        circle.setAttribute('cy', '10.8');
        circle.setAttribute('r', '6.4');
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        handle.setAttribute('d', 'm16 16 4.2 4.2');
        svg.append(circle, handle);
        hint.appendChild(svg);
        return hint;
    }
    FD.SelectSheetNavigatorLocationStep = {
        choosing, customerSearchHint, injectStyles, options, render, requiresChoice,
    };
})(window);
