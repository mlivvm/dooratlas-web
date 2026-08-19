(function (global) {
    const FD = global.FD = global.FD || {};
    function create(options) {
        const { container, items, renderItem } = options;
        const estimateHeight = options.estimateHeight || 82;
        const overscan = options.overscan || 6;
        const heights = items.map(() => estimateHeight);
        const before = document.createElement('div');
        const rows = document.createElement('div');
        const after = document.createElement('div');
        let destroyed = false;
        let animationFrame = 0;
        let renderedStart = -1;
        let renderedEnd = -1;
        const previousOverflowAnchor = container.style.overflowAnchor;
        container.style.overflowAnchor = 'none';
        before.setAttribute('aria-hidden', 'true');
        after.setAttribute('aria-hidden', 'true');
        rows.className = 'select-navigator-virtual-list-rows';
        container.replaceChildren(before, rows, after);
        function offsetAt(index) {
            let offset = 0;
            for (let cursor = 0; cursor < index; cursor += 1)
                offset += heights[cursor];
            return offset;
        }
        function indexAt(offset) {
            let cursor = 0;
            let consumed = 0;
            while (cursor < items.length - 1 && consumed + heights[cursor] <= offset) {
                consumed += heights[cursor];
                cursor += 1;
            }
            return cursor;
        }
        function measureRows() {
            if (destroyed)
                return;
            const anchorIndex = indexAt(container.scrollTop);
            const anchorOffset = offsetAt(anchorIndex) - container.scrollTop;
            let changed = false;
            Array.from(rows.children).forEach(row => {
                const index = Number(row.dataset.virtualIndex);
                if (!Number.isInteger(index))
                    return;
                const style = getComputedStyle(row);
                const height = Math.ceil(row.getBoundingClientRect().height + Number.parseFloat(style.marginBottom || '0'));
                if (height > 0 && heights[index] !== height) {
                    heights[index] = height;
                    changed = true;
                }
            });
            if (changed) {
                renderedStart = -1;
                renderedEnd = -1;
                render();
                container.scrollTop = Math.max(0, offsetAt(anchorIndex) - anchorOffset);
            }
        }
        function render() {
            if (destroyed)
                return;
            const viewportTop = container.scrollTop;
            const viewportBottom = viewportTop + Math.max(container.clientHeight, 1);
            const start = Math.max(0, indexAt(viewportTop) - overscan);
            const end = Math.min(items.length, indexAt(viewportBottom) + overscan + 1);
            before.style.height = `${offsetAt(start)}px`;
            after.style.height = `${Math.max(0, offsetAt(items.length) - offsetAt(end))}px`;
            if (start === renderedStart && end === renderedEnd)
                return;
            renderedStart = start;
            renderedEnd = end;
            const fragment = document.createDocumentFragment();
            for (let index = start; index < end; index += 1) {
                const row = renderItem(items[index], index);
                row.dataset.virtualIndex = String(index);
                row.setAttribute('aria-setsize', String(items.length));
                row.setAttribute('aria-posinset', String(index + 1));
                fragment.appendChild(row);
            }
            rows.replaceChildren(fragment);
            window.requestAnimationFrame(measureRows);
        }
        function scheduleRender() {
            if (animationFrame)
                return;
            animationFrame = window.requestAnimationFrame(() => {
                animationFrame = 0;
                render();
            });
        }
        container.addEventListener('scroll', scheduleRender, { passive: true });
        render();
        return {
            destroy: () => {
                destroyed = true;
                if (animationFrame)
                    window.cancelAnimationFrame(animationFrame);
                container.removeEventListener('scroll', scheduleRender);
                container.style.overflowAnchor = previousOverflowAnchor;
            },
        };
    }
    FD.SelectSheetVirtualList = { create };
})(window);
