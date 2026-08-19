(function (global) {
    const FD = global.FD = global.FD || {};
    const pending = new Map();
    const scripts = {
        email: {
            key: 'email',
            src: 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js',
            integrity: 'sha384-SALc35EccAf6RzGw4iNsyj7kTPr33K7RoGzYu+7heZhT8s0GZouafRiCg1qy44AS',
            ready: () => global.emailjs,
        },
        qr: {
            key: 'qr',
            src: 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
            integrity: 'sha384-c9d8RFSL+u3exBOJ4Yp3HUJXS4znl9f+z66d1y54ig+ea249SpqR+w1wyvXz/lk+',
            ready: () => global.Html5Qrcode,
        },
        pdf: {
            key: 'pdf',
            src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            integrity: 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e',
            ready: () => global.pdfjsLib,
        },
        cropper: {
            key: 'cropper',
            src: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js',
            integrity: 'sha384-jrOgQzBlDeUNdmQn3rUt/PZD+pdcRBdWd/HWRqRo+n2OR2QtGyjSaJC0GiCeH+ir',
            ready: () => global.Cropper,
        },
    };
    function loadScript(spec) {
        const existing = spec.ready();
        if (existing)
            return Promise.resolve(existing);
        if (pending.has(spec.key))
            return pending.get(spec.key);
        const promise = new Promise((resolve, reject) => {
            const script = global.document.createElement('script');
            script.async = true;
            script.src = spec.src;
            script.integrity = spec.integrity;
            script.crossOrigin = 'anonymous';
            script.dataset.dooratlasRuntime = spec.key;
            script.onload = () => {
                const loaded = spec.ready();
                if (loaded)
                    resolve(loaded);
                else
                    reject(new Error(`${spec.key} is geladen maar niet beschikbaar.`));
            };
            script.onerror = () => reject(new Error(`${spec.key} kon niet worden geladen.`));
            global.document.head.appendChild(script);
        }).catch(error => {
            pending.delete(spec.key);
            global.document.querySelector(`script[data-dooratlas-runtime="${spec.key}"]`)?.remove();
            throw error;
        });
        pending.set(spec.key, promise);
        return promise;
    }
    function ensureCropperStyle() {
        const key = 'cropper-style';
        const existing = global.document.querySelector(`link[data-dooratlas-runtime="${key}"]`);
        if (existing)
            return Promise.resolve();
        if (pending.has(key))
            return pending.get(key);
        const promise = new Promise((resolve, reject) => {
            const link = global.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
            link.integrity = 'sha384-6LFfkTKLRlzFtgx8xsWyBdKGpcMMQTkv+dB7rAbugeJAu1Ym2q1Aji1cjHBG12Xh';
            link.crossOrigin = 'anonymous';
            link.dataset.dooratlasRuntime = key;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Crop-stijl kon niet worden geladen.'));
            global.document.head.appendChild(link);
        }).catch(error => {
            pending.delete(key);
            global.document.querySelector(`link[data-dooratlas-runtime="${key}"]`)?.remove();
            throw error;
        });
        pending.set(key, promise);
        return promise;
    }
    async function ensurePdfJs(workerSrc) {
        const library = await loadScript(scripts.pdf);
        library.GlobalWorkerOptions.workerSrc = workerSrc;
        return library;
    }
    async function ensureCropper() {
        const [, library] = await Promise.all([ensureCropperStyle(), loadScript(scripts.cropper)]);
        return library;
    }
    FD.RuntimeLibraryLoader = {
        ensureCropper,
        ensureEmailJs: () => loadScript(scripts.email),
        ensurePdfJs,
        ensureQrScanner: () => loadScript(scripts.qr),
    };
})(window);
