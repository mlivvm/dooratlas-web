(function (global) {
    const FD = global.FD = global.FD || {};
    const storageKey = FD.Env?.storageKey || ((key) => key);
    const MANIFEST_KEY = storageKey('fd_floorplan_cache_manifest');
    function getStorage() {
        try {
            return global.localStorage || null;
        }
        catch {
            return null;
        }
    }
    function getFloorplanRepo(fp) {
        return fp?.repo === 'uploads' ? 'uploads' : 'gallery';
    }
    function getFloorplanPath(fp) {
        return fp?.file || '';
    }
    function getFloorplanApiUrl(fp, config) {
        const baseUrl = fp?.repo === 'uploads' ? config.svgUploadsUrl : config.svgBaseUrl;
        return baseUrl + encodeURIComponent(getFloorplanPath(fp));
    }
    function getCacheKey(repo, path) {
        return `${repo}:${path}`;
    }
    function getRepoFromContentsUrl(fileUrl) {
        return String(fileUrl || '').startsWith('fd-floorplan://uploads/')
            ? 'uploads'
            : 'gallery';
    }
    function getPathFromContentsUrl(fileUrl) {
        return decodeURIComponent(String(fileUrl || '').replace(/^fd-floorplan:\/\/(?:gallery|uploads)\//, '') || '');
    }
    function readManifest(cacheVersion) {
        const storage = getStorage();
        if (!storage)
            return { version: cacheVersion, files: {} };
        try {
            const raw = storage.getItem(MANIFEST_KEY);
            if (!raw)
                return { version: cacheVersion, files: {} };
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.files) {
                return { version: cacheVersion, files: {} };
            }
            if (parsed.version !== cacheVersion) {
                return { version: cacheVersion, files: {} };
            }
            return parsed;
        }
        catch {
            return { version: cacheVersion, files: {} };
        }
    }
    function writeManifest(cacheVersion, manifest, logger = console) {
        const storage = getStorage();
        if (!storage)
            return;
        try {
            storage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
        }
        catch (err) {
            logger.warn('Offline cache manifest kon niet worden opgeslagen:', err);
        }
    }
    function clearManifest() {
        try {
            getStorage()?.removeItem(MANIFEST_KEY);
        }
        catch { }
    }
    async function purgeViaServiceWorker(timeoutMs = 1500) {
        const controller = global.navigator?.serviceWorker?.controller;
        const MessageChannelConstructor = global.MessageChannel;
        if (!controller || typeof MessageChannelConstructor !== 'function')
            return false;
        return new Promise(resolve => {
            const channel = new MessageChannelConstructor();
            const timer = global.setTimeout(() => resolve(false), timeoutMs);
            channel.port1.onmessage = (event) => {
                if (event.data?.type !== 'FD_PRIVATE_CACHE_PURGED')
                    return;
                global.clearTimeout(timer);
                resolve(true);
            };
            controller.postMessage({ type: 'FD_PURGE_PRIVATE_CACHE' }, [channel.port2]);
        });
    }
    async function clearPrivateCache({ cacheVersion, config } = {}) {
        clearManifest();
        await purgeViaServiceWorker();
        if (!global.caches || !cacheVersion)
            return 0;
        const workerUrl = getWorkerFloorplanUrl('fd-floorplan://gallery/1', config);
        if (!workerUrl)
            return 0;
        const workerOrigin = new URL(workerUrl).origin;
        const cache = await global.caches.open(cacheVersion);
        const requests = await cache.keys();
        const privateRequests = requests.filter(request => {
            const url = new URL(request.url);
            return url.origin === workerOrigin && /^\/api\/floors\/\d+\/svg$/.test(url.pathname);
        });
        const deleted = await Promise.all(privateRequests.map(request => cache.delete(request)));
        return deleted.filter(Boolean).length;
    }
    function updateManifestSha(cacheVersion, fileUrl, sha, logger = console) {
        if (!sha)
            return;
        const repo = getRepoFromContentsUrl(fileUrl);
        const path = getPathFromContentsUrl(fileUrl);
        if (!path)
            return;
        const manifest = readManifest(cacheVersion);
        manifest.files[getCacheKey(repo, path)] = sha;
        writeManifest(cacheVersion, manifest, logger);
    }
    function removeManifestSha(cacheVersion, fileUrl, logger = console) {
        const repo = getRepoFromContentsUrl(fileUrl);
        const path = getPathFromContentsUrl(fileUrl);
        if (!path)
            return;
        const manifest = readManifest(cacheVersion);
        delete manifest.files[getCacheKey(repo, path)];
        writeManifest(cacheVersion, manifest, logger);
    }
    function isWorkerReadProxyEnabled(config) {
        return FD.DataService?.isWorkerReadProxyEnabled?.(config) === true;
    }
    function isOnline() {
        return global.navigator?.onLine !== false;
    }
    function isNetworkError(err) {
        const message = String(err?.message || '');
        return err?.name === 'TypeError' ||
            /Failed to fetch|NetworkError|Load failed|ERR_INTERNET_DISCONNECTED/i.test(message);
    }
    function getWorkerFloorplanUrl(fileUrl, config) {
        return FD.DataService?.getWorkerFloorplanUrl?.(config, fileUrl) || null;
    }
    async function decorateCachedFloorplanSVG(fileUrl, svgText, options = {}) {
        if (typeof FD.DataService?.decorateFloorplanSVG !== 'function')
            return svgText;
        return FD.DataService.decorateFloorplanSVG(fileUrl, svgText, options);
    }
    async function revalidateSVGInBackground(fileUrl, cachedSha, options) {
        try {
            return await FD.DataService.revalidateFloorplanSVG(fileUrl, cachedSha, options);
        }
        catch {
            return null;
        }
    }
    async function fetchWorkerSVGCacheFirst(fileUrl, { cacheVersion, signal, config } = {}) {
        const workerUrl = getWorkerFloorplanUrl(fileUrl, config);
        if (!global.caches || !workerUrl) {
            return { svgText: await FD.DataService.loadFloorplanSVG(fileUrl, { signal, config }), revalidate: null };
        }
        try {
            const cache = await global.caches.open(cacheVersion);
            const cachedResp = await cache.match(workerUrl, { ignoreVary: true });
            if (cachedResp) {
                const svgText = await cachedResp.clone().text();
                const cachedSha = cachedResp.headers.get('X-FD-Sha') || '';
                const revalidate = isOnline() ? revalidateSVGInBackground(fileUrl, cachedSha, { signal, config }) : null;
                return {
                    svgText: await decorateCachedFloorplanSVG(fileUrl, svgText, { signal, config }),
                    revalidate,
                };
            }
        }
        catch (err) {
            if (err?.name === 'AbortError')
                throw err;
            console.warn('Worker cache-first lookup mislukt:', err);
        }
        return { svgText: await FD.DataService.loadFloorplanSVG(fileUrl, { signal, config }), revalidate: null };
    }
    async function fetchSVGCacheFirst(fileUrl, options = {}) {
        return fetchWorkerSVGCacheFirst(fileUrl, options);
    }
    async function updateCachedSVGAfterSave(fileUrl, updateResult, svgText, { cacheVersion, config } = {}) {
        const sha = updateResult?.content?.sha || updateResult?.sha || '';
        if (!cacheVersion)
            return;
        if (!global.caches) {
            if (!sha)
                removeManifestSha(cacheVersion, fileUrl);
            return;
        }
        try {
            const workerUrl = getWorkerFloorplanUrl(fileUrl, config);
            if (!workerUrl)
                return;
            const cache = await global.caches.open(cacheVersion);
            if (!sha) {
                await cache.delete(workerUrl, { ignoreVary: true });
                removeManifestSha(cacheVersion, fileUrl);
                return;
            }
            await cache.put(workerUrl, new global.Response(svgText, {
                headers: {
                    'Content-Type': 'image/svg+xml; charset=utf-8',
                    'X-FD-Sha': sha,
                },
            }));
            updateManifestSha(cacheVersion, fileUrl, sha);
        }
        catch (err) {
            console.warn('SVG cache kon niet direct worden bijgewerkt:', err);
        }
    }
    async function isFloorplanCached(item, { cacheVersion, config } = {}) {
        if (!item.sha || !global.caches)
            return false;
        try {
            const workerUrl = getWorkerFloorplanUrl(item.fileUrl, config);
            if (!workerUrl)
                return false;
            const cache = await global.caches.open(cacheVersion || config?.offlineCacheVersion);
            const cachedResp = await cache.match(workerUrl, { ignoreVary: true });
            const cachedSha = cachedResp?.headers?.get('X-FD-Sha') || '';
            return Boolean(cachedResp && cachedSha === item.sha);
        }
        catch (err) {
            console.warn('Offline cache controle mislukt:', item.fileUrl, err);
            return false;
        }
    }
    async function waitForServiceWorkerReady({ timeoutMs = 8000, logger = console } = {}) {
        if (!global.navigator?.serviceWorker)
            return false;
        try {
            await Promise.race([
                global.navigator.serviceWorker.ready,
                new Promise((_, reject) => global.setTimeout(() => reject(new Error('timeout')), timeoutMs)),
            ]);
            return true;
        }
        catch (err) {
            logger.warn('Service worker niet klaar voor offline cache warmup:', err);
            return false;
        }
    }
    FD.FloorplanCacheCore = {
        clearPrivateCache,
        fetchSVGCacheFirst,
        getCacheKey,
        getFloorplanApiUrl,
        getFloorplanPath,
        getFloorplanRepo,
        isFloorplanCached,
        isNetworkError,
        isOnline,
        isWorkerReadProxyEnabled,
        readManifest,
        updateCachedSVGAfterSave,
        waitForServiceWorkerReady,
        writeManifest,
    };
})(window);
