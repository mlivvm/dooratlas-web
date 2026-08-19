(function (global) {
    const FD = global.FD = global.FD || {};
    const MAX_FILES = 250;
    const UNCERTAIN_CODE = /(?:^|[-_\s])(E\d+|KR)(?=[-_\s]|$)/i;
    const sourcePathCollator = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
    function cleanBaseName(fileName) {
        return String(fileName || '').replace(/\.pdf$/i, '').trim();
    }
    function floorOrdinalLabel(level) {
        if (level < 0)
            return `Kelder ${level}`;
        if (level === 0)
            return 'Begane grond';
        return `${level}e verdieping`;
    }
    function parseFloorProposal(fileName) {
        const baseName = cleanBaseName(fileName);
        const uncertain = baseName.match(UNCERTAIN_CODE)?.[1]?.toUpperCase() || '';
        const basement = baseName.match(/--(\d+)(?=[-_\s]|$)/);
        if (basement) {
            const levelOrder = -Number(basement[1]);
            return { baseName, mapName: floorOrdinalLabel(levelOrder), floorLabel: floorOrdinalLabel(levelOrder), levelOrder, confidence: 'high', warning: '' };
        }
        if (/(?:^|[-_\s])DK(?=[-_\s]|$)/i.test(baseName)) {
            return {
                baseName, mapName: 'Dak', floorLabel: 'Dak', levelOrder: 100, confidence: 'review',
                warning: 'Code DK kan een dak of een genummerde dakverdieping betekenen; controleer naam en niveau.',
            };
        }
        const standard = baseName.match(/(?:^|[-_\s])(\d{2})(?=[-_\s]|$)/);
        if (standard && !uncertain) {
            const levelOrder = Number(standard[1]);
            const floorLabel = floorOrdinalLabel(levelOrder);
            return { baseName, mapName: floorLabel, floorLabel, levelOrder, confidence: 'high', warning: '' };
        }
        const warning = uncertain
            ? `Code ${uncertain} is niet eenduidig; controleer naam en niveau.`
            : 'Geen betrouwbaar verdiepingspatroon gevonden; controleer naam en niveau.';
        return { baseName, mapName: baseName || 'Naam controleren', floorLabel: baseName || 'Naam controleren', levelOrder: 0, confidence: 'review', warning };
    }
    function relativePath(file) {
        return String(file?.webkitRelativePath || file?.relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    }
    function compareSourceFiles(left, right) {
        const leftPath = relativePath(left) || left.name;
        const rightPath = relativePath(right) || right.name;
        return sourcePathCollator.compare(leftPath, rightPath);
    }
    function inspectFolderStructure(files) {
        const paths = files.map(relativePath);
        const segments = paths.map(path => path.split('/').filter(Boolean));
        const roots = new Set(segments.map(parts => parts[0]).filter(Boolean));
        const usable = files.length > 0 && paths.every(Boolean) && segments.every(parts => parts.length >= 2) && roots.size === 1;
        return {
            usable,
            rootName: usable ? segments[0][0] : '',
            warning: usable ? '' : 'De browser gaf geen betrouwbare mapstructuur door. Wijs gebouwen handmatig of in bulk toe.',
        };
    }
    function buildingProposal(file, structureUsable) {
        if (!structureUsable)
            return '';
        const parts = relativePath(file).split('/').filter(Boolean);
        return parts.length >= 3 ? parts[1] : '';
    }
    function targetKey(name, index) {
        const slug = String(name || 'gebouw')
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
        return `${slug || 'gebouw'}-${index + 1}`;
    }
    function buildConcept(fileList) {
        const files = Array.from(fileList || [])
            .filter(file => /\.pdf$/i.test(file.name) || String(file.type).toLowerCase() === 'application/pdf')
            .sort(compareSourceFiles);
        if (!files.length)
            throw new Error('Kies minimaal één PDF-bestand.');
        if (files.length > MAX_FILES)
            throw new Error(`Maximaal ${MAX_FILES} PDF-bestanden per bulkimport.`);
        const structure = inspectFolderStructure(files);
        const buildingNames = [];
        files.forEach(file => {
            const name = buildingProposal(file, structure.usable);
            if (name && !buildingNames.includes(name))
                buildingNames.push(name);
        });
        const targets = buildingNames.map((name, index) => ({ key: targetKey(name, index), name, kind: 'new' }));
        const keyByName = new Map(targets.map(target => [target.name, target.key]));
        const items = files.map((file, index) => {
            const proposal = parseFloorProposal(file.name);
            const buildingName = buildingProposal(file, structure.usable);
            return {
                id: global.crypto.randomUUID(), file, index, include: true, selected: false,
                relativePath: relativePath(file) || file.name,
                buildingName, targetKey: keyByName.get(buildingName) || '',
                mapName: proposal.mapName, floorLabel: proposal.floorLabel,
                levelOrder: proposal.levelOrder, confidence: proposal.confidence,
                proposalWarning: proposal.warning,
                warning: buildingName ? proposal.warning : 'Gebouw kiezen voordat deze kaart kan worden geïmporteerd.',
                state: buildingName ? (proposal.confidence === 'high' ? 'ready' : 'review') : 'action',
                error: '', hash: '',
            };
        });
        return { files, items, targets, structure, maxFiles: MAX_FILES };
    }
    function duplicateKeys(items) {
        const counts = new Map();
        items.filter(item => item.include && item.targetKey).forEach(item => {
            const key = `${item.targetKey}|${String(item.mapName).trim().toLocaleLowerCase()}|${Number(item.levelOrder)}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return new Set(Array.from(counts).filter(([, count]) => count > 1).map(([key]) => key));
    }
    FD.BulkImportParser = { MAX_FILES, buildConcept, duplicateKeys, inspectFolderStructure, parseFloorProposal, relativePath };
})(window);
