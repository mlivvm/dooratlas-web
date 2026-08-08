(function (global) {
    const FD = global.FD = global.FD || {};
    const NS = 'http://www.w3.org/2000/svg';
    const INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape';
    const MARKER_SHAPES = {
        ellipse: { tags: ['ellipse', 'circle'], svgTag: 'ellipse' },
        rectangle: { tags: ['rect'], svgTag: 'rect' },
        polygon: { tags: ['polygon'], svgTag: 'polygon' },
    };
    const MARKER_SELECTOR = Object.values(MARKER_SHAPES).flatMap(spec => spec.tags).join(', ');
    const number = (marker, attribute, fallback = NaN) => {
        const value = Number.parseFloat(marker.getAttribute(attribute) || '');
        return Number.isFinite(value) ? value : fallback;
    };
    const round = (value) => Math.round(value).toString();
    function shape(marker) {
        if (!marker)
            return null;
        const tag = marker.localName;
        if (marker.getAttribute('data-dooratlas-marker-shape') === 'rectangle' || MARKER_SHAPES.rectangle.tags.includes(tag))
            return 'rectangle';
        if (marker.getAttribute('data-dooratlas-marker-shape') === 'polygon' || MARKER_SHAPES.polygon.tags.includes(tag))
            return 'polygon';
        return MARKER_SHAPES.ellipse.tags.includes(tag) ? 'ellipse' : null;
    }
    function polygonPoints(marker) {
        const values = (marker.getAttribute('points') || '').trim().split(/[\s,]+/).filter(Boolean);
        if (values.length < 6 || values.length % 2)
            return null;
        const points = values.reduce((result, value, index) => {
            if (index % 2)
                result[result.length - 1].y = Number.parseFloat(value);
            else
                result.push({ x: Number.parseFloat(value), y: NaN });
            return result;
        }, []);
        return isValidPolygon(points) ? points : null;
    }
    function orientation(first, second, third) {
        return (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);
    }
    function segmentsIntersect(first, second, third, fourth) {
        const firstSide = orientation(first, second, third);
        const secondSide = orientation(first, second, fourth);
        const thirdSide = orientation(third, fourth, first);
        const fourthSide = orientation(third, fourth, second);
        return (firstSide === 0 || secondSide === 0 || (firstSide > 0) !== (secondSide > 0)) &&
            (thirdSide === 0 || fourthSide === 0 || (thirdSide > 0) !== (fourthSide > 0));
    }
    function isValidPolygon(points) {
        if (!points || points.length < 3 || points.length > 12 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
            return false;
        if (new Set(points.map(point => `${point.x}:${point.y}`)).size !== points.length)
            return false;
        const area = points.reduce((total, point, index) => {
            const next = points[(index + 1) % points.length];
            return total + point.x * next.y - next.x * point.y;
        }, 0);
        if (Math.abs(area) < 0.000001)
            return false;
        return !points.some((point, index) => points.some((other, otherIndex) => {
            if (otherIndex <= index || otherIndex === (index + 1) % points.length || (otherIndex + 1) % points.length === index)
                return false;
            return segmentsIntersect(point, points[(index + 1) % points.length], other, points[(otherIndex + 1) % points.length]);
        }));
    }
    function geometry(marker) {
        const kind = shape(marker);
        if (kind === 'polygon') {
            const points = polygonPoints(marker);
            return points ? { shape: 'polygon', points } : null;
        }
        if (kind === 'rectangle') {
            const x = number(marker, 'x');
            const y = number(marker, 'y');
            const width = number(marker, 'width');
            const height = number(marker, 'height');
            return [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0
                ? { shape: 'rectangle', x, y, width, height } : null;
        }
        const cx = number(marker, 'cx');
        const cy = number(marker, 'cy');
        const r = number(marker, 'r');
        const suppliedRx = number(marker, 'rx');
        const suppliedRy = number(marker, 'ry');
        const rx = Number.isFinite(suppliedRx) ? suppliedRx : (Number.isFinite(r) ? r : suppliedRy);
        const ry = Number.isFinite(suppliedRy) ? suppliedRy : (Number.isFinite(r) ? r : suppliedRx);
        return [cx, cy, rx, ry].every(Number.isFinite) && rx > 0 && ry > 0
            ? { shape: 'ellipse', cx, cy, rx, ry } : null;
    }
    function center(marker) {
        const value = geometry(marker);
        if (!value)
            return null;
        if (value.shape === 'ellipse')
            return { x: value.cx, y: value.cy };
        if (value.shape === 'rectangle')
            return { x: value.x + value.width / 2, y: value.y + value.height / 2 };
        const box = bounds(marker);
        return box ? { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 } : null;
    }
    function bounds(marker, padding = 0) {
        const value = geometry(marker);
        if (!value)
            return null;
        if (value.shape === 'rectangle')
            return { left: value.x - padding, right: value.x + value.width + padding, top: value.y - padding, bottom: value.y + value.height + padding };
        if (value.shape === 'polygon') {
            return {
                left: Math.min(...value.points.map(point => point.x)) - padding,
                right: Math.max(...value.points.map(point => point.x)) + padding,
                top: Math.min(...value.points.map(point => point.y)) - padding,
                bottom: Math.max(...value.points.map(point => point.y)) + padding,
            };
        }
        return { left: value.cx - value.rx - padding, right: value.cx + value.rx + padding, top: value.cy - value.ry - padding, bottom: value.cy + value.ry + padding };
    }
    function setGeometry(marker, value) {
        ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points'].forEach(attribute => marker.removeAttribute(attribute));
        if (value.shape === 'polygon') {
            marker.setAttribute('data-dooratlas-marker-shape', 'polygon');
            marker.setAttribute('points', value.points.map(point => `${round(point.x)},${round(point.y)}`).join(' '));
            return;
        }
        if (value.shape === 'rectangle') {
            marker.setAttribute('data-dooratlas-marker-shape', 'rectangle');
            marker.setAttribute('x', round(value.x));
            marker.setAttribute('y', round(value.y));
            marker.setAttribute('width', round(Math.max(1, value.width)));
            marker.setAttribute('height', round(Math.max(1, value.height)));
            return;
        }
        marker.removeAttribute('data-dooratlas-marker-shape');
        marker.setAttribute('cx', round(value.cx));
        marker.setAttribute('cy', round(value.cy));
        if (marker.localName === 'circle') {
            marker.setAttribute('r', round(Math.max(1, value.rx)));
            return;
        }
        marker.setAttribute('rx', round(Math.max(1, value.rx)));
        marker.setAttribute('ry', round(Math.max(1, value.ry)));
    }
    function createMarker(input) {
        const kind = input.shape || 'ellipse';
        const marker = document.createElementNS(NS, MARKER_SHAPES[kind].svgTag);
        marker.setAttribute('id', input.doorId);
        marker.setAttributeNS(INKSCAPE_NS, 'inkscape:label', input.doorId);
        if (kind === 'polygon') {
            if (!isValidPolygon(input.points))
                throw new Error('Een polygoon heeft minstens drie geldige punten nodig.');
            setGeometry(marker, { shape: 'polygon', points: input.points.map(point => ({ ...point })) });
        }
        else if (kind === 'rectangle') {
            const width = Math.max(1, input.width || (input.radius || 10) * 2);
            const height = Math.max(1, input.height || (input.radius || 10) * 2);
            setGeometry(marker, { shape: 'rectangle', x: (input.x || 0) - width / 2, y: (input.y || 0) - height / 2, width, height });
        }
        else {
            const radius = Math.max(1, input.radius || 10);
            setGeometry(marker, { shape: 'ellipse', cx: input.x || 0, cy: input.y || 0, rx: radius, ry: radius });
        }
        marker.style.fill = input.fill || '#1a73e8';
        marker.style.opacity = input.opacity || '0.7';
        return marker;
    }
    function move(marker, x, y) {
        const value = geometry(marker);
        const point = center(marker);
        if (!value || !point)
            return;
        if (value.shape === 'polygon')
            return void setGeometry(marker, { shape: 'polygon', points: value.points.map(vertex => ({ x: vertex.x + x - point.x, y: vertex.y + y - point.y })) });
        if (value.shape === 'rectangle')
            return void setGeometry(marker, { ...value, x: x - value.width / 2, y: y - value.height / 2 });
        setGeometry(marker, { ...value, cx: x, cy: y });
    }
    function resize(marker, size) {
        const value = geometry(marker);
        const point = center(marker);
        if (!value || !point)
            return;
        if (value.shape === 'polygon') {
            const box = bounds(marker);
            if (!box)
                return;
            const longest = Math.max(box.right - box.left, box.bottom - box.top);
            const ratio = longest ? (size * 2) / longest : 1;
            return void setGeometry(marker, { shape: 'polygon', points: value.points.map(vertex => ({ x: point.x + (vertex.x - point.x) * ratio, y: point.y + (vertex.y - point.y) * ratio })) });
        }
        if (value.shape === 'rectangle') {
            const longest = Math.max(value.width, value.height);
            const ratio = longest ? (size * 2) / longest : 1;
            return void setGeometry(marker, { shape: 'rectangle', x: point.x - value.width * ratio / 2, y: point.y - value.height * ratio / 2, width: value.width * ratio, height: value.height * ratio });
        }
        setGeometry(marker, { ...value, rx: size, ry: size });
    }
    function size(marker, fallback = 10) {
        const box = bounds(marker);
        return box ? Math.max(box.right - box.left, box.bottom - box.top) / 2 : fallback;
    }
    function replacement(marker, nextShape) {
        if (shape(marker) === nextShape)
            return null;
        const point = center(marker);
        const box = bounds(marker);
        if (!point || !box)
            return null;
        const next = createMarker({
            doorId: marker.getAttribute('id') || '', shape: nextShape, x: point.x, y: point.y,
            radius: Math.max(box.right - box.left, box.bottom - box.top) / 2, width: box.right - box.left, height: box.bottom - box.top,
            points: [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }],
        });
        Array.from(marker.attributes).forEach(attribute => next.setAttribute(attribute.name, attribute.value));
        next.style.cssText = marker.style.cssText;
        if (nextShape === 'polygon')
            setGeometry(next, { shape: 'polygon', points: [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }] });
        else
            setGeometry(next, nextShape === 'rectangle' ? { shape: 'rectangle', x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top } : { shape: 'ellipse', cx: point.x, cy: point.y, rx: (box.right - box.left) / 2, ry: (box.bottom - box.top) / 2 });
        marker.parentNode?.replaceChild(next, marker);
        return next;
    }
    function rotate(marker, degrees) {
        const value = geometry(marker);
        const point = center(marker);
        if (!value || !point || Math.abs(degrees) % 180 !== 90)
            return;
        if (value.shape === 'polygon')
            return void setGeometry(marker, { shape: 'polygon', points: value.points.map(vertex => ({ x: point.x - (vertex.y - point.y), y: point.y + vertex.x - point.x })) });
        if (value.shape === 'rectangle')
            return void setGeometry(marker, { shape: 'rectangle', x: point.x - value.height / 2, y: point.y - value.width / 2, width: value.height, height: value.width });
        setGeometry(marker, { ...value, rx: value.ry, ry: value.rx });
    }
    FD.MarkerShapeService = {
        markerSelector: MARKER_SELECTOR, shape, geometry, center, bounds, setGeometry, createMarker, move, resize, size, replacement, rotate, isValidPolygon,
    };
})(window);
