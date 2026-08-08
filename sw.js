importScripts('env-config.js');
(() => {
    const serviceWorker = self;
    const APP_VERSION = '1.10.59';
    const ENV_CONFIG = serviceWorker.FD?.Env?.config || serviceWorker.FD_ENV_CONFIG || {};
    const CACHE_NAME = typeof ENV_CONFIG.cacheNameForVersion === 'function'
        ? ENV_CONFIG.cacheNameForVersion(APP_VERSION)
        : `fd-v${APP_VERSION}`;
    const CACHE_PREFIX = String(ENV_CONFIG.cachePrefix || 'fd-v');
    const LOCAL_WORKER_ASSETS = [];
    const WORKER_API_HOSTNAME = ENV_CONFIG.workerApiHostname || (() => {
        try {
            return new URL(ENV_CONFIG.workerApiBaseUrl || 'https://api.datasidekick.nl').hostname;
        }
        catch {
            return 'api.datasidekick.nl';
        }
    })();
    let privateCacheGeneration = 0;
    let privateCachePurgeDepth = 0;
    function isManagedCacheName(cacheName) {
        const name = String(cacheName || '');
        if (CACHE_PREFIX === 'fd-live-v') {
            return name.startsWith(CACHE_PREFIX) || /^fd-v\d+\.\d+\.\d+$/i.test(name);
        }
        if (CACHE_PREFIX === 'fd-v') {
            return /^fd-v\d+\.\d+\.\d+$/i.test(name);
        }
        return name.startsWith(CACHE_PREFIX);
    }
    const STATIC_ASSETS = [
        './',
        'index.html',
        ...[
            'admin-dashboard-tokens.css',
            'app.css',
            'env-config.js',
            'office.bundle.js',
            'dooratlas-logo-white-office.webp',
            'dooratlas-logo-transparent-office.webp',
        ].map(asset => `${asset}?v=${APP_VERSION}`),
        'version.json',
        'manifest.json',
        'icon-192.png',
        'icon-512.png',
    ];
    function offlineMissResponse() {
        return new Response('Offline cache miss', {
            status: 504,
            statusText: 'Offline cache miss',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
    function cacheFallback(request) {
        return caches.match(request).then(cached => cached || offlineMissResponse());
    }
    function noStoreRequest(request) {
        return new Request(request, { cache: 'no-store' });
    }
    function isVersionedStaticAsset(url) {
        return url.searchParams.has('v') && /\.(?:css|js|png|svg|webp)$/i.test(url.pathname);
    }
    function isCacheableWorkerGet(url) {
        return url.hostname === WORKER_API_HOSTNAME && /^\/api\/floors\/\d+\/svg$/.test(url.pathname);
    }
    function isPrivateFloorplanCacheEntry(url) {
        return url.hostname === WORKER_API_HOSTNAME && /^\/api\/floors\/\d+\/(?:svg|map)$/.test(url.pathname);
    }
    async function purgePrivateFloorplanCache() {
        privateCacheGeneration += 1;
        privateCachePurgeDepth += 1;
        try {
            const cache = await caches.open(CACHE_NAME);
            const requests = await cache.keys();
            const privateRequests = requests.filter(request => isPrivateFloorplanCacheEntry(new URL(request.url)));
            const deleted = await Promise.all(privateRequests.map(request => cache.delete(request)));
            return deleted.filter(Boolean).length;
        }
        finally {
            privateCachePurgeDepth -= 1;
        }
    }
    async function precacheStaticAssets(cache) {
        await Promise.all(STATIC_ASSETS.map(async (asset) => {
            const request = noStoreRequest(asset);
            const response = await fetch(request);
            if (!response.ok)
                throw new Error(`Precache failed: ${asset}`);
            await cache.put(request, response);
        }));
    }
    serviceWorker.addEventListener('install', (e) => {
        e.waitUntil(caches.open(CACHE_NAME)
            .then(cache => precacheStaticAssets(cache)));
    });
    serviceWorker.addEventListener('activate', (e) => {
        e.waitUntil(caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && isManagedCacheName(k)).map(k => caches.delete(k))))
            .then(() => serviceWorker.clients.claim()));
    });
    serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'FD_SKIP_WAITING') {
            e.waitUntil(serviceWorker.skipWaiting());
        }
        else if (e.data?.type === 'FD_PURGE_PRIVATE_CACHE') {
            e.waitUntil(purgePrivateFloorplanCache().then(deleted => {
                e.ports?.[0]?.postMessage({ type: 'FD_PRIVATE_CACHE_PURGED', deleted });
            }));
        }
    });
    serviceWorker.addEventListener('fetch', (e) => {
        const url = new URL(e.request.url);
        // Version checks must reflect the current deployment, not an old app cache.
        if (url.origin === serviceWorker.location.origin && url.pathname.endsWith('/version.json')) {
            e.respondWith(fetch(noStoreRequest(e.request))
                .catch(() => offlineMissResponse()));
            return;
        }
        // Never cache external services with mutable/auth side effects
        if (url.hostname === 'eu.jotform.com' ||
            url.hostname === 'ipapi.co' ||
            url.hostname === 'api.emailjs.com' ||
            url.hostname === 'api.ipify.org') {
            return;
        }
        // DoorAtlas writes and auth-dependent reads must remain network-only.
        // Floorplan SVG GETs are the only API responses cached for offline use.
        if (url.hostname === WORKER_API_HOSTNAME) {
            if (e.request.method !== 'GET')
                return;
            if (!isCacheableWorkerGet(url)) {
                e.respondWith(fetch(noStoreRequest(e.request))
                    .catch(() => offlineMissResponse()));
                return;
            }
            e.respondWith((() => {
                const requestGeneration = privateCacheGeneration;
                const cacheAllowed = privateCachePurgeDepth === 0;
                return fetch(noStoreRequest(e.request)).then(async (resp) => {
                    if (resp.ok && cacheAllowed && requestGeneration === privateCacheGeneration) {
                        const clone = resp.clone();
                        const cache = await caches.open(CACHE_NAME);
                        if (cacheAllowed && requestGeneration === privateCacheGeneration)
                            await cache.put(e.request, clone);
                    }
                    return resp;
                });
            })().catch(() => cacheFallback(e.request)));
            return;
        }
        // CDN scripts: cache-first (versioned URLs, won't change)
        if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'unpkg.com' || url.hostname === 'cdnjs.cloudflare.com') {
            e.respondWith(caches.match(e.request).then(cached => {
                if (cached)
                    return cached;
                return fetch(e.request)
                    .then(resp => {
                    if (resp.ok) {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return resp;
                })
                    .catch(() => offlineMissResponse());
            }));
            return;
        }
        if (url.origin !== serviceWorker.location.origin)
            return;
        // Versiegebonden assets veranderen nooit onder dezelfde URL. De updateflow
        // controleert version.json en activeert daarna een nieuwe app-shellcache.
        if (isVersionedStaticAsset(url)) {
            e.respondWith(caches.match(e.request).then(cached => cached || fetch(noStoreRequest(e.request)).then(resp => {
                if (resp.ok) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return resp;
            }).catch(() => offlineMissResponse())));
            return;
        }
        // Static assets: network-first, fall back to cache
        e.respondWith(fetch(noStoreRequest(e.request))
            .then(resp => {
            if (resp.ok) {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return resp;
        })
            .catch(() => cacheFallback(e.request)));
    });
})();
