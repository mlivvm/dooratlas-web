(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.FloorplanCacheCore;
    FD.FloorplanCacheService = {
        cacheFloorplanSummary: C.cacheFloorplanSummary,
        clearPrivateCache: C.clearPrivateCache,
        fetchSVGCacheFirst: C.fetchSVGCacheFirst,
        getFloorplanApiUrl: C.getFloorplanApiUrl,
        getFloorplanPath: C.getFloorplanPath,
        getFloorplanRepo: C.getFloorplanRepo,
        privateCacheGeneration: C.privateCacheGeneration,
        readCachedSVG: C.readCachedSVG,
        readCachedFloorplanSummary: C.readCachedFloorplanSummary,
        readManifest: C.readManifest,
        updateCachedSVGAfterSave: C.updateCachedSVGAfterSave,
        waitForServiceWorkerReady: C.waitForServiceWorkerReady,
    };
})(window);
