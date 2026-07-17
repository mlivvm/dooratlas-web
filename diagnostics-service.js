(function (global) {
    const FD = global.FD = global.FD || {};
    const storageKey = FD.Env?.storageKey || (key => key);
    const QUEUE_KEY = storageKey('fd_diagnostics_queue');
    const MAX_QUEUE = 25;
    const MAX_RUNTIME_ERRORS = 8;
    let activeReporter = null;
    function getWorkerApiBaseUrl(config) {
        return String(config?.workerApiBaseUrl || '').replace(/\/+$/, '');
    }
    function trimText(value, maxLength) {
        const text = String(value || '').trim();
        return text.length > maxLength ? text.slice(0, maxLength) : text;
    }
    function appVersion(config) {
        return String(config?.offlineCacheVersion || '').replace(/^fd(?:-[a-z0-9-]+)?-v/i, '') || '';
    }
    function readQueue() {
        try {
            const parsed = JSON.parse(global.localStorage?.getItem(QUEUE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    function writeQueue(queue) {
        try {
            global.localStorage?.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
        }
        catch { }
    }
    function enqueue(payload) {
        const queue = readQueue();
        queue.push(payload);
        writeQueue(queue);
    }
    function clearPrivateData() {
        try {
            global.localStorage?.removeItem(QUEUE_KEY);
        }
        catch { }
    }
    function sanitizeDetails(value, depth = 0) {
        if (value == null || depth > 3)
            return null;
        if (typeof value === 'string')
            return trimText(value, 500);
        if (typeof value === 'number' || typeof value === 'boolean')
            return value;
        if (Array.isArray(value))
            return value.slice(0, 10).map(item => sanitizeDetails(item, depth + 1));
        if (typeof value !== 'object')
            return trimText(value, 200);
        const output = {};
        Object.entries(value).slice(0, 30).forEach(([key, item]) => {
            if (/token|password|secret|svg|pdf|image|jotform|content/i.test(key))
                return;
            output[trimText(key, 80)] = sanitizeDetails(item, depth + 1);
        });
        return output;
    }
    function objectDetails(value) {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
    }
    function buildPayload(config, event, getContext) {
        const context = typeof getContext === 'function' ? (getContext() || {}) : {};
        const contextDetails = objectDetails(context.details);
        const eventDetails = objectDetails(event.details);
        const statusValue = Number(event.status);
        return {
            appVersion: appVersion(config),
            level: trimText(event.level || 'error', 16),
            eventType: trimText(event.eventType || 'runtime_error', 80),
            message: trimText(event.message || event.error || 'Onbekende fout', 700),
            source: trimText(event.source || '', 120),
            customer: trimText(event.customer || context.customer || '', 180),
            floorplan: trimText(event.floorplan || context.floorplan || '', 180),
            doorId: trimText(event.doorId || context.doorId || '', 180),
            online: typeof event.online === 'boolean' ? event.online : global.navigator?.onLine !== false,
            appMode: trimText(event.appMode || context.appMode || '', 40),
            lastToast: trimText(event.lastToast || context.lastToast || '', 250),
            endpoint: trimText(event.endpoint || '', 300),
            status: Number.isFinite(statusValue) && statusValue >= 100 && statusValue <= 599 ? statusValue : null,
            syncQueueCount: Number.isFinite(Number(event.syncQueueCount ?? context.syncQueueCount))
                ? Number(event.syncQueueCount ?? context.syncQueueCount)
                : null,
            details: sanitizeDetails({ ...contextDetails, ...eventDetails }),
        };
    }
    async function postPayload(config, payload) {
        const baseUrl = getWorkerApiBaseUrl(config);
        if (!baseUrl || global.navigator?.onLine === false || !FD.DataServiceCore?.requestJson)
            return false;
        await FD.DataServiceCore.requestJson(config, '/api/diagnostics', {
            method: 'POST',
            csrf: true,
            body: payload,
        });
        return true;
    }
    function create(config, { getContext, logger = console, } = {}) {
        let flushing = false;
        let runtimeErrorCount = 0;
        async function flushQueue() {
            if (flushing || global.navigator?.onLine === false)
                return false;
            flushing = true;
            try {
                const queue = readQueue();
                const remaining = [];
                for (const payload of queue) {
                    try {
                        const ok = await postPayload(config, payload);
                        if (!ok)
                            remaining.push(payload);
                    }
                    catch {
                        remaining.push(payload);
                    }
                }
                writeQueue(remaining);
                return remaining.length === 0;
            }
            finally {
                flushing = false;
            }
        }
        async function record(event = {}) {
            const payload = buildPayload(config, event || {}, getContext);
            try {
                const ok = await postPayload(config, payload);
                if (!ok) {
                    enqueue(payload);
                    return { queued: true };
                }
                await flushQueue();
                return { sent: true };
            }
            catch (err) {
                enqueue(payload);
                logger.debug?.('Diagnostics tijdelijk niet verstuurd:', err);
                return { queued: true };
            }
        }
        function recordRuntimeError(eventType, err, source) {
            if (runtimeErrorCount >= MAX_RUNTIME_ERRORS)
                return;
            runtimeErrorCount += 1;
            const message = err?.message || err?.reason?.message || String(err?.reason || err || '');
            record({
                level: 'error',
                eventType,
                message,
                source,
                details: {
                    name: err?.name || err?.reason?.name || '',
                    stack: err?.stack || err?.reason?.stack || '',
                },
            });
        }
        function reportManual(options = {}) {
            const userMessage = trimText(options.message || options.text || '', 700);
            const userCategory = trimText(options.category || 'Anders', 80) || 'Anders';
            return record({
                level: 'info',
                eventType: 'manual_report',
                message: userMessage || 'Probleem gemeld via dashboard menu',
                source: 'app-menu',
                details: {
                    userCategory,
                    userMessage,
                },
            });
        }
        global.addEventListener('online', () => { flushQueue(); });
        global.addEventListener('error', event => {
            recordRuntimeError('window_error', event.error || event.message, event.filename || 'window');
        });
        global.addEventListener('unhandledrejection', event => {
            recordRuntimeError('unhandled_rejection', event.reason, 'promise');
        });
        activeReporter = { flushQueue, record, reportManual };
        flushQueue();
        return activeReporter;
    }
    function record(event) {
        return activeReporter?.record(event);
    }
    FD.DiagnosticsService = {
        clearPrivateData,
        create,
        record,
    };
})(window);
