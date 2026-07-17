(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.FloorplanCacheCore;
    const W = FD.FloorplanCacheWarmup;
    FD.FloorplanCacheService = {
        clearPrivateCache: C.clearPrivateCache,
        createWarmupController: W.createWarmupController,
        fetchSVGCacheFirst: C.fetchSVGCacheFirst,
        getFloorplanApiUrl: C.getFloorplanApiUrl,
        getFloorplanPath: C.getFloorplanPath,
        getFloorplanRepo: C.getFloorplanRepo,
        readManifest: C.readManifest,
        updateCachedSVGAfterSave: C.updateCachedSVGAfterSave,
        waitForServiceWorkerReady: C.waitForServiceWorkerReady,
    };
})(window);
