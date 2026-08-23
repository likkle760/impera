/* IMPERA — visitor beacon
   Sends an anonymous page-view ping to the IMPERA webhook server when one is
   configured. The server URL is stored once in localStorage (set it from
   Admin Portal → Settings → Live Connection) under 'impera_api_url'. */
(function () {
    'use strict';
    var API = null;
    try { API = localStorage.getItem('impera_api_url'); } catch (e) {}
    if (!API) return;

    // stable anonymous visitor id
    var vid = null;
    try {
        vid = localStorage.getItem('impera_vid');
        if (!vid) {
            vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            localStorage.setItem('impera_vid', vid);
        }
    } catch (e) { vid = 'vanon'; }

    function ping() {
        try {
            fetch(API.replace(/\/$/, '') + '/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    v: vid,
                    p: location.pathname.split('/').pop() || 'index.html',
                    r: document.referrer || ''
                }),
                keepalive: true
            }).catch(function () {});
        } catch (e) {}
    }

    ping();
})();
