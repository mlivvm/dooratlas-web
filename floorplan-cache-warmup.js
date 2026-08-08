(function (global) {
    const FD = global.FD = global.FD || {};
    const C = FD.FloorplanCacheCore;
    function createWarmupController({ config, getCustomers, isOnline, logger = console } = {}) {
        let started = false;
        let generation = 0;
        let controller = null;
        function cancel() {
            generation++;
            started = false;
            if (controller) {
                controller.abort();
                controller = null;
            }
        }
        function shouldCancel(runGeneration, signal) {
            const online = isOnline ? isOnline() : global.navigator?.onLine;
            if (signal?.aborted || !online || runGeneration !== generation)
                return true;
            return false;
        }
        async function warmFloorplanCache({ customers, config: activeConfig, generation: runGeneration, signal } = {}) {
            if (shouldCancel(runGeneration, signal))
                return;
            const queue = [];
            customers.forEach((customer) => {
                (customer.floorplans || []).forEach((fp) => {
                    if (!fp.file)
                        return;
                    const repo = C.getFloorplanRepo(fp);
                    const path = C.getFloorplanPath(fp);
                    queue.push({
                        repo,
                        path,
                        fileUrl: C.getFloorplanApiUrl(fp, activeConfig),
                        cacheKey: C.getCacheKey(repo, path),
                    });
                });
            });
            const repoTreeMaps = {};
            const authSkippedRepos = new Set();
            const manifestUnavailableRepos = new Set();
            const warnedAuthRepos = new Set();
            const markRepoAuthSkipped = (repo, err) => {
                authSkippedRepos.add(repo);
                if (warnedAuthRepos.has(repo))
                    return;
                warnedAuthRepos.add(repo);
                logger.warn('Offline cache warmup overgeslagen voor repo zonder toegang:', repo, err);
            };
            const markRepoManifestUnavailable = (repo, err) => {
                manifestUnavailableRepos.add(repo);
                if (err) {
                    logger.warn('Worker floorplan manifest niet beschikbaar, warmup slaat volledige repo over:', repo, err);
                }
                else {
                    logger.info?.('Worker floorplan manifest niet beschikbaar, warmup slaat volledige repo over:', repo);
                }
            };
            await Promise.all(Array.from(new Set(queue.map(item => item.repo))).map(async (repo) => {
                if (shouldCancel(runGeneration, signal))
                    return;
                try {
                    const treeMap = await FD.DataService.fetchFloorplanTreeMap(repo, {
                        signal,
                        config: activeConfig,
                        diagnostics: {
                            suppress: true,
                            purpose: 'offline_cache_warmup',
                            background: true,
                        },
                    });
                    if (treeMap && typeof treeMap.get === 'function') {
                        repoTreeMaps[repo] = treeMap;
                    }
                    else {
                        repoTreeMaps[repo] = null;
                        markRepoManifestUnavailable(repo);
                    }
                }
                catch (err) {
                    if (err?.name === 'AbortError')
                        return;
                    repoTreeMaps[repo] = null;
                    if (err?.status === 401 || err?.status === 403) {
                        markRepoAuthSkipped(repo, err);
                        return;
                    }
                    markRepoManifestUnavailable(repo, err);
                }
            }));
            if (shouldCancel(runGeneration, signal))
                return;
            const manifest = C.readManifest(activeConfig.offlineCacheVersion);
            const warmQueue = [];
            let skipped = 0;
            let authSkipped = 0;
            let manifestUnavailable = 0;
            let missing = 0;
            let transientFailed = 0;
            await Promise.all(queue.map(async (item) => {
                if (shouldCancel(runGeneration, signal))
                    return;
                if (authSkippedRepos.has(item.repo)) {
                    authSkipped++;
                    return;
                }
                if (manifestUnavailableRepos.has(item.repo)) {
                    manifestUnavailable++;
                    return;
                }
                const treeMap = repoTreeMaps[item.repo];
                if (!treeMap) {
                    manifestUnavailable++;
                    return;
                }
                const sha = treeMap ? treeMap.get(item.path) : null;
                item.sha = sha;
                if (treeMap && !sha) {
                    missing++;
                    return;
                }
                if (sha && manifest.files[item.cacheKey] === sha && await C.isFloorplanCached(item, {
                    cacheVersion: activeConfig.offlineCacheVersion,
                    config: activeConfig,
                })) {
                    skipped++;
                }
                else {
                    warmQueue.push(item);
                }
            }));
            let next = 0;
            let cached = 0;
            let networkFailed = false;
            const transientSamples = [];
            const workerCount = Math.min(3, warmQueue.length);
            function markTransientFailure(item, err) {
                transientFailed++;
                if (transientSamples.length >= 5)
                    return;
                transientSamples.push({
                    repo: item.repo,
                    path: item.path,
                    message: err?.message || String(err || ''),
                    status: err?.status || null,
                });
            }
            async function worker() {
                while (next < warmQueue.length) {
                    if (networkFailed)
                        return;
                    if (shouldCancel(runGeneration, signal))
                        return;
                    const item = warmQueue[next++];
                    if (authSkippedRepos.has(item.repo)) {
                        authSkipped++;
                        continue;
                    }
                    try {
                        await FD.DataService.warmFloorplanSVG(item.fileUrl, { signal, config: activeConfig });
                        if (item.sha)
                            manifest.files[item.cacheKey] = item.sha;
                        cached++;
                    }
                    catch (err) {
                        if (err?.name === 'AbortError')
                            return;
                        if (err?.status === 401 || err?.status === 403) {
                            markRepoAuthSkipped(item.repo, err);
                            authSkipped++;
                            continue;
                        }
                        if (err?.status === 404) {
                            missing++;
                            continue;
                        }
                        if (err?.status >= 500 && err?.status < 600) {
                            markTransientFailure(item, err);
                            continue;
                        }
                        if (C.isNetworkError(err)) {
                            markTransientFailure(item, err);
                            networkFailed = true;
                            return;
                        }
                        logger.warn('Plattegrond niet in offline cache:', item.fileUrl, err);
                    }
                    await new Promise(resolve => global.setTimeout(resolve, 50));
                }
            }
            await Promise.all(Array.from({ length: workerCount }, worker));
            if (shouldCancel(runGeneration, signal))
                return;
            C.writeManifest(activeConfig.offlineCacheVersion, manifest, logger);
            const details = [];
            if (authSkipped)
                details.push(`${authSkipped} auth overgeslagen`);
            if (manifestUnavailable)
                details.push(`${manifestUnavailable} manifest overgeslagen`);
            if (missing)
                details.push(`${missing} ontbrekend in repo`);
            if (transientFailed)
                details.push(`${transientFailed} tijdelijk mislukt`);
            const detailText = details.length ? `, ${details.join(', ')}` : '';
            logger.info(`Offline cache warmup klaar: ${cached} vernieuwd, ${skipped} overgeslagen, ${queue.length} totaal${detailText}.`);
            if (transientFailed || authSkipped) {
                try {
                    FD.DiagnosticsService?.record?.({
                        level: transientFailed ? 'warn' : 'info',
                        eventType: 'offline_cache_warmup',
                        message: transientFailed
                            ? `Offline cache warmup deels mislukt: ${transientFailed} tijdelijk mislukt`
                            : `Offline cache warmup deels overgeslagen: ${authSkipped} auth overgeslagen`,
                        source: 'floorplan-cache-service',
                        details: {
                            cached,
                            skipped,
                            total: queue.length,
                            authSkipped,
                            missing,
                            transientFailed,
                            stoppedAfterNetworkError: networkFailed,
                            samples: transientSamples,
                        },
                    });
                }
                catch { }
            }
        }
        function schedule() {
            const customers = getCustomers ? getCustomers() : [];
            const online = isOnline ? isOnline() : global.navigator?.onLine;
            if (!online)
                return;
            if (started || !customers.length)
                return;
            started = true;
            const runGeneration = ++generation;
            controller = new global.AbortController();
            const signal = controller.signal;
            const run = async () => {
                if (shouldCancel(runGeneration, signal))
                    return;
                const swReady = await C.waitForServiceWorkerReady({ logger });
                if (shouldCancel(runGeneration, signal))
                    return;
                if (!swReady)
                    return;
                await warmFloorplanCache({ customers, config, generation: runGeneration, signal });
            };
            const safeRun = () => run().catch((err) => {
                if (err?.name === 'AbortError')
                    return;
                logger.warn('Offline cache warmup mislukt:', err);
            });
            if (global.requestIdleCallback) {
                global.requestIdleCallback(safeRun, { timeout: 5000 });
            }
            else {
                global.setTimeout(safeRun, 1500);
            }
        }
        return { cancel, schedule };
    }
    FD.FloorplanCacheWarmup = {
        createWarmupController,
    };
})(window);
