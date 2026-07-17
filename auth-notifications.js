(function (global) {
    const FD = global.FD = global.FD || {};
    async function sendLoginNotification({ emailjsClient = global.emailjs, serviceId, templateId, type, attempts, timeZone = 'Europe/Amsterdam', fetchImpl = global.fetch, logger = console, }) {
        if (!emailjsClient?.send || !serviceId || !templateId)
            return;
        let location = '-';
        try {
            const resp = await fetchImpl('https://api.ipify.org?format=json');
            const ipData = await resp.json();
            const geoResp = await fetchImpl(`https://ipapi.co/${ipData.ip}/json/`);
            const data = await geoResp.json();
            location = `${data.city}, ${data.country_name} (${data.ip})`;
        }
        catch (err) {
            logger.error('Locatie ophalen mislukt:', err);
        }
        emailjsClient.send(serviceId, templateId, {
            type,
            time: new Date().toLocaleString('nl-NL', { timeZone }),
            attempts: attempts || '-',
            location,
        }).catch((err) => logger.error('Email notificatie mislukt:', err));
    }
    FD.AuthNotifications = {
        sendLoginNotification,
    };
})(window);
