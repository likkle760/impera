/* ============================================================
   IMPERA Admin Command Center
   - Live mode: polls IMPERA server every 5s (orders, visitors,
     bookings, analytics) — configure in Settings.
   - Demo mode: falls back to this device's local data.
   ============================================================ */
(function () {
    'use strict';
    const A = window.ImperaAuth;
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];

    /* ---------- state ---------- */
    let DATA = null;              // last overview payload (live or local)
    let MODE = 'demo';            // 'demo' | 'live'
    let lastFetchAt = null;
    let pollTimer = null;
    let prevUnseenBookings = null;   // for new-booking alerts
    const OPENED_AT = Date.now();    // highlight rows that arrive this session

    const LOCAL_PRICE = {
        scalping: 49, gold: 125, global: 245,
        platinum: 799, 'mentor-monthly': 50, 'mentor-lifetime': 175
    };
    const BOT_LABEL = {
        scalping: 'IMPERA Scalping Bot', gold: 'IMPERA Gold Bot', global: 'IMPERA Global Bot',
        'mentor-monthly': 'IMPERA Mentorship — Monthly', 'mentor-lifetime': 'IMPERA Mentorship — Lifetime'
    };

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function money(n) { return '£' + (Number(n) || 0).toFixed(2); }
    function timeAgo(ts) {
        const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
        if (s < 60) return s + 's ago';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('show'), 2400);
    }

    /* ================= GATE ================= */
    if (!A) {
        const el = $('#gateError');
        el.textContent = 'auth.js failed to load — check js/auth.js exists and reload.';
        el.style.display = 'block';
        return;
    }

    $('#resetOwnerLink').addEventListener('click', () => {
        const creds = A.resetOwner();
        $('#gEmail').value = creds.email;
        $('#gPass').value = creds.password;
        const hint = $('#gateHint');
        hint.textContent = 'Owner access restored — click Enter Portal.';
        hint.style.display = 'block';
    });

    const sess = A.session();
    if (sess && sess.role === 'admin') openPortal();

    $('#gateForm').addEventListener('submit', function (e) {
        e.preventDefault();
        $('#gateHint').style.display = 'none';
        $('#gateError').style.display = 'none';
        const res = A.login($('#gEmail').value.trim(), $('#gPass').value);
        if (res.error === 'No account found with this email.') return gateFail(res.error + ' Click "Reset owner access" below.');
        if (res.error) return gateFail(res.error + ' (passwords are case-sensitive)');
        if (res.session.role !== 'admin') { A.clearSession(); return gateFail('This account does not have admin access.'); }
        openPortal();
    });
    function gateFail(msg) { const el = $('#gateError'); el.textContent = msg; el.style.display = 'block'; }

    function openPortal() {
        $('#gate').style.display = 'none';
        $('#shell').classList.add('on');
        bindNav();
        bindSettings();
        startPolling();
    }

    $('#logoutBtn').addEventListener('click', () => { A.clearSession(); location.reload(); });

    /* ================= NAV / TABS ================= */
    const TITLES = { home: 'Home', orders: 'Orders', bookings: 'Sessions', customers: 'Customers', analytics: 'Analytics', settings: 'Settings' };

    function bindNav() {
        $$('.sb-link[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.sb-link[data-view]').forEach(b => b.classList.toggle('on', b === btn));
                $$('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + btn.dataset.view));
                $('#viewTitle').textContent = TITLES[btn.dataset.view] || '';
                if (btn.dataset.view === 'bookings') clearBookingAlert();
                renderAll(); // redraw tables for current data
            });
        });
    }

    /* ================= NEW-BOOKING ALERTS ================= */
    function unseenBookings(bookings) {
        const seenTs = Number(localStorage.getItem('impera_admin_seen_bookings') || 0);
        return (bookings || []).filter(b => b.status === 'pending' && new Date(b.createdAt).getTime() > seenTs);
    }

    function updateBookingAlert() {
        if (!DATA) return;
        const unseen = unseenBookings(DATA.bookings);
        const link = document.querySelector('.sb-link[data-view="bookings"]');
        if (!link) return;
        let badge = document.getElementById('bkBadge');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'bkBadge';
            badge.className = 'nav-badge';
            link.appendChild(badge);
        }
        badge.textContent = unseen.length;
        badge.style.display = unseen.length ? 'inline-flex' : 'none';

        // chime only when a genuinely new booking arrives while portal is open
        if (prevUnseenBookings !== null && unseen.length > prevUnseenBookings) {
            toast('\uD83D\uDD14 New session booking received!');
            beep();
        }
        prevUnseenBookings = unseen.length;
    }

    function clearBookingAlert() {
        localStorage.setItem('impera_admin_seen_bookings', String(Date.now()));
        const badge = document.getElementById('bkBadge');
        if (badge) badge.style.display = 'none';
        prevUnseenBookings = 0;
    }

    function beep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(880, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.12);
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            o.start();
            o.stop(ctx.currentTime + 0.55);
        } catch (e) { /* audio blocked — silent */ }
    }

    /* ================= SETTINGS ================= */
    function apiCfg() {
        return {
            url: (localStorage.getItem('impera_api_url') || '').trim(),
            token: (localStorage.getItem('impera_admin_token') || '').trim()
        };
    }

    function bindSettings() {
        const cfg = apiCfg();
        $('#setApiUrl').value = cfg.url;
        $('#setApiToken').value = cfg.token;

        $('#saveConnBtn').addEventListener('click', async () => {
            const url = $('#setApiUrl').value.trim().replace(/\/$/, '');
            const token = $('#setApiToken').value.trim();
            localStorage.setItem('impera_api_url', url);
            localStorage.setItem('impera_admin_token', token);
            const st = $('#connStatus');
            st.textContent = 'Testing…'; st.className = 'conn-status';
            try {
                const r = await fetch(url + '/api/admin/overview', { headers: { 'x-admin-token': token } });
                if (!r.ok) throw new Error(r.status);
                st.textContent = '● Connected'; st.className = 'conn-status ok';
                toast('Connected — live updates enabled');
                startPolling(true);
            } catch (err) {
                st.textContent = '● Connection failed (' + err.message + ')'; st.className = 'conn-status bad';
            }
        });

        $('#clearConnBtn').addEventListener('click', () => {
            localStorage.removeItem('impera_api_url');
            localStorage.removeItem('impera_admin_token');
            $('#setApiUrl').value = ''; $('#setApiToken').value = '';
            stopPolling();
            MODE = 'demo';
            updatePill();
            toast('Disconnected — demo mode');
        });

        if (apiCfg().url && apiCfg().token) {
            const st = $('#connStatus');
            st.textContent = '● Configured'; st.className = 'conn-status ok';
        }
    }

    /* ================= DATA ================= */
    function localOverview() {
        const purchases = A.getPurchases().map(p => ({
            createdAt: p.date,
            productName: p.botName || BOT_LABEL[p.bot] || p.bot,
            customerEmail: p.email || '',
            type: p.bot,
            amountValue: LOCAL_PRICE[p.bot] != null ? LOCAL_PRICE[p.bot] : 0,
            emailed: true
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const users = A.getUsers().filter(u => u.role !== 'admin');
        const bookings = A.getBookings();

        const daily = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            daily.push({
                date: d,
                revenue: +purchases.filter(o => o.createdAt.slice(0, 10) === d).reduce((s, o) => s + o.amountValue, 0).toFixed(2),
                orders: purchases.filter(o => o.createdAt.slice(0, 10) === d).length,
                visits: 0
            });
        }

        const recentOrders = purchases.slice(0, 10).map(o => ({
            type: 'order', ts: o.createdAt,
            label: `${o.productName}${o.customerEmail ? ' — ' + o.customerEmail : ''}`,
            sub: money(o.amountValue)
        }));
        const recentBookings = [...bookings].reverse().slice(0, 6).map(b => ({
            type: 'booking', ts: b.createdAt,
            label: `${b.userName} booked ${b.date} ${b.time}`, sub: b.status
        }));

        return {
            totals: {
                revenue: +purchases.reduce((s, o) => s + o.amountValue, 0).toFixed(2),
                orders: purchases.length,
                members: purchases.filter(o => String(o.type).indexOf('mentor') === 0).length,
                clients: users.length,
                visitorsToday: 0, pageviewsToday: 0, liveVisitors: 0, conversion: 0
            },
            daily,
            orders: purchases.slice(0, 60),
            bookings,
            clients: users.map(u => ({
                email: u.email, name: u.name, createdAt: u.createdAt, local: true,
                products: (u.products || []).map(p => p.botName || p.bot),
                member: (u.products || []).some(p => A.isMentorship(p.bot))
            })),
            pages: [], referrers: [],
            recent: [...recentOrders, ...recentBookings]
                .sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 14)
        };
    }

    async function fetchData() {
        const cfg = apiCfg();
        if (cfg.url && cfg.token) {
            try {
                const r = await fetch(cfg.url + '/api/admin/overview', { headers: { 'x-admin-token': cfg.token } });
                if (!r.ok) throw new Error(String(r.status));
                DATA = await r.json();
                MODE = 'live';
            } catch (e) {
                MODE = 'offline';
                if (!DATA) DATA = localOverview();
            }
        } else {
            MODE = 'demo';
            DATA = localOverview();
        }
        lastFetchAt = Date.now();
        updatePill();
        renderAll();
    }

    function startPolling(force) {
        stopPolling();
        fetchData();
        pollTimer = setInterval(fetchData, 5000);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopPolling(); else startPolling();
        });
    }
    function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

    function updatePill() {
        const pill = $('#livePill'), txt = $('#liveText');
        pill.classList.remove('demo');
        if (MODE === 'live') { txt.textContent = 'Live · updated ' + agoTxt(); }
        else if (MODE === 'offline') { pill.classList.add('demo'); txt.textContent = 'Server unreachable · showing local data'; }
        else { pill.classList.add('demo'); txt.textContent = 'Demo mode · local data'; }
    }
    function agoTxt() {
        if (!lastFetchAt) return '';
        const s = Math.floor((Date.now() - lastFetchAt) / 1000);
        return s < 3 ? 'just now' : s + 's ago';
    }
    setInterval(() => { if (MODE !== 'demo' && lastFetchAt) updatePill(); }, 1000);

    /* ================= CHARTS (inline SVG, no deps) ================= */
    function barChart(el, values, labels, id, c1, c2, fmt) {
        if (!el) return;
        if (!values.length || Math.max.apply(null, values) === 0 && values.every(v => v === 0)) {
            el.innerHTML = '<div class="chart-empty">No data yet — connect the server &amp; share your site to collect analytics.</div>';
            return;
        }
        const W = 700, H = 200, PAD = 10;
        const max = Math.max.apply(null, values) || 1;
        const gap = (W - PAD * 2) / values.length;
        const bw = gap * 0.6;
        let bars = '', labelsSvg = '';
        values.forEach((v, i) => {
            const h = Math.max((v / max) * (H - 42), v > 0 ? 3 : 1.5);
            const x = PAD + i * gap + (gap - bw) / 2;
            const y = H - 22 - h;
            bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="url(#g${id})" opacity="0.92"><title>${labels[i]} — ${fmt ? fmt(v) : v}</title></rect>`;
            if (i % 2 === 0) labelsSvg += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" font-size="9.5" fill="#666" text-anchor="middle" font-family="Inter">${labels[i].slice(5)}</text>`;
        });
        el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">
            <defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
            </linearGradient></defs>
            <line x1="${PAD}" y1="${H - 21.5}" x2="${W - PAD}" y2="${H - 21.5}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
            ${bars}${labelsSvg}
        </svg>`;
    }

    /* ================= RENDERERS ================= */
    function renderAll() {
        if (!DATA) return;
        renderKPIs(DATA.totals);

        const labels = DATA.daily.map(d => d.date);
        barChart($('#chartRevenue'), DATA.daily.map(d => d.revenue), labels, 'rev', '#E6C97A', '#8a6d2b', v => money(v));
        barChart($('#chartVisitors'), DATA.daily.map(d => d.visits), labels, 'vis', '#00FFB2', '#00795a', v => v + ' visits');
        barChart($('#chartPageviews'), DATA.daily.map(d => d.visits), labels, 'pv', '#00C2FF', '#00647f', v => v + ' views');

        renderFeed(DATA.recent);
        renderOrders(DATA.orders);
        renderBookings(DATA.bookings || []);
        renderClients();
        renderAnalytics(DATA);
        updateBookingAlert();
    }

    function renderKPIs(t) {
        $('#kRevenue').textContent = money(t.revenue);
        $('#kOrders').textContent = t.orders;
        $('#kVisitors').textContent = t.visitorsToday;
        $('#kPageviews').textContent = t.pageviewsToday + ' page views today';
        $('#kLive').textContent = t.liveVisitors;
        $('#kConv').textContent = t.conversion + '%';
        $('#kMembers').textContent = t.members;
        $('#aVisToday').textContent = t.visitorsToday;
        $('#aViewsToday').textContent = t.pageviewsToday;
        $('#aLive').textContent = t.liveVisitors;
    }

    function renderFeed(items) {
        const el = $('#feedList');
        if (!items.length) { el.innerHTML = '<div class="feed-item"><span class="dim">No activity yet.</span></div>'; return; }
        el.innerHTML = items.map(i => `
            <div class="feed-item">
                <div class="feed-ico ${i.type}">${i.type === 'order' ? '&#128178;' : '&#128197;'}</div>
                <div class="feed-body">
                    <div class="feed-label">${esc(i.label)}</div>
                    <div class="feed-sub">${esc(i.sub)}</div>
                </div>
                <div class="feed-time">${timeAgo(i.ts)}</div>
            </div>`).join('');
    }

    function renderOrders(orders) {
        const body = $('#ordersBody');
        if (!orders.length) { body.innerHTML = '<tr><td colspan="5" class="dim" style="text-align:center;padding:28px">No orders yet.</td></tr>'; return; }
        body.innerHTML = orders.map(o => `
            <tr>
                <td><strong>${esc(o.productName)}</strong></td>
                <td>${esc(o.customerEmail)}<br><span class="dim">${esc(o.customerName || '')}</span></td>
                <td style="color:#E6C97A;font-weight:700">${money(o.amountValue)}</td>
                <td class="dim">${new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                <td><span class="pill ${o.emailed === false ? 'pill-pending' : 'pill-paid'}">${o.emailed === false ? 'processing' : 'paid'}</span></td>
            </tr>`).join('');
    }

    /* ---------- Bookings (dual-write: local + server PATCH) ---------- */
    function renderBookings(bookings) {
        const body = $('#bookingsBody');
        const all = [...bookings].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        if (!all.length) { body.innerHTML = '<tr><td colspan="6" class="dim" style="text-align:center;padding:28px">No bookings yet.</td></tr>'; return; }

        body.innerHTML = all.map(b => {
            const d = new Date(b.date + 'T' + b.time);
            const isNew = new Date(b.createdAt).getTime() > OPENED_AT;
            return `<tr class="${isNew ? 'row-new' : ''}">
                <td>${esc(b.userName)}<br><span class="dim">${esc(b.userEmail)}</span></td>
                <td>${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br><span class="dim">${b.time}</span></td>
                <td class="dim" style="font-size:.82rem">${esc(b.type)}</td>
                <td><input class="zoom-input" data-zoom="${esc(b.id)}" type="url" placeholder="https://zoom.us/j/…" value="${esc(b.zoom)}"></td>
                <td><span class="pill pill-${b.status}">${b.status}</span></td>
                <td><div class="row-actions">
                    ${b.zoom ? `<a class="mini-btn b-blue" href="${esc(b.zoom)}" target="_blank" rel="noopener" style="text-decoration:none;padding:8px 12px;display:inline-block">Join</a>` : ''}
                    <button class="mini-btn b-gold" onclick="setBooking('${esc(b.id)}','confirmed')" ${b.status === 'confirmed' ? 'disabled' : ''}>Confirm</button>
                    <button class="mini-btn b-grey" onclick="setBooking('${esc(b.id)}','completed')" ${b.status === 'completed' ? 'disabled' : ''}>Done</button>
                    <button class="mini-btn b-blue" onclick="remindClient('${esc(b.id)}')">Remind</button>
                    <button class="mini-btn b-red" onclick="removeBooking('${esc(b.id)}')">Del</button>
                </div></td>
            </tr>`;
        }).join('');

        body.querySelectorAll('[data-zoom]').forEach(inp => {
            inp.addEventListener('change', () => {
                const patch = { zoom: inp.value.trim() };
                A.updateBooking(inp.dataset.zoom, patch);
                patchServerBooking(inp.dataset.zoom, patch);
                setTimeout(fetchData, 250);
            });
        });
    }

    window.setBooking = function (id, status) {
        A.updateBooking(id, { status });
        patchServerBooking(id, { status });
        setTimeout(fetchData, 250);
    };
    window.removeBooking = function (id) {
        if (!confirm('Delete this booking permanently?')) return;
        A.deleteBooking(id);
        patchServerBooking(id, { status: 'cancelled' });
        setTimeout(fetchData, 250);
    };
    window.remindClient = function (id) {
        const b = (DATA && DATA.bookings || []).find(x => x.id === id) || A.getBookings().find(x => x.id === id);
        if (!b) return;
        const d = new Date(b.date + 'T' + b.time);
        const params = new URLSearchParams({
            template: 'reminder', to: b.userEmail, name: b.userName,
            date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            time: b.time, zoom: b.zoom || ''
        });
        window.open('emails/sender.html?' + params.toString(), '_blank');
    };

    function patchServerBooking(id, patch) {
        const cfg = apiCfg();
        if (!cfg.url || !cfg.token) return;
        fetch(cfg.url + '/api/bookings/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': cfg.token },
            body: JSON.stringify(patch)
        }).catch(() => {});
    }

    /* ---------- Customers (local dashboard accounts) ---------- */
    function renderClients() {
        const body = $('#clientsBody');
        const users = A.getUsers().filter(u => u.role !== 'admin');
        $('#custNote').textContent = MODE === 'live'
            ? 'These are client dashboard logins created on this device. Orders processed by Stripe (any device) are under the Orders tab.'
            : 'Customer dashboard accounts stored on this device.';

        if (!users.length) { body.innerHTML = '<tr><td colspan="5" class="dim" style="text-align:center;padding:28px">No clients yet.</td></tr>'; return; }

        body.innerHTML = users.map(u => {
            const prods = (u.products || []).map(p =>
                `<span class="pill ${A.isMentorship(p.bot) ? 'pill-pending' : 'pill-paid'}" style="margin-right:6px">${A.isMentorship(p.bot) ? 'Mentorship' : esc(p.botName || p.bot)}</span>`
            ).join('') || '<span class="dim">None</span>';
            const member = (u.products || []).some(p => A.isMentorship(p.bot));
            return `<tr>
                <td>${esc(u.name)}</td>
                <td class="dim">${esc(u.email)}</td>
                <td>${prods}</td>
                <td>${member ? '<span class="pill pill-member">Member</span>' : '<span class="pill pill-cancelled">No</span>'}</td>
                <td><div class="row-actions">
                    <button class="mini-btn b-grey" onclick="resetPass('${esc(u.email)}')">Reset Password</button>
                    <button class="mini-btn ${member ? 'b-red' : 'b-gold'}" onclick="toggleMentor('${esc(u.email)}',${member})">${member ? 'Revoke Mentor' : 'Grant Mentor'}</button>
                    <button class="mini-btn b-red" onclick="delUser('${esc(u.email)}')">Del</button>
                </div></td>
            </tr>`;
        }).join('');
    }

    window.resetPass = function (email) {
        const pw = A.genPassword();
        const users = A.getUsers();
        const u = users.find(x => x.email === email);
        if (!u) return;
        u.pass = btoa(unescape(encodeURIComponent('impera:' + pw)));
        localStorage.setItem(A.K.users, JSON.stringify(users));
        prompt('New temporary password for ' + email + ' — share it with the client:', pw);
    };
    window.toggleMentor = function (email, isMember) {
        const users = A.getUsers();
        const u = users.find(x => x.email === email);
        if (!u) return;
        u.products = u.products || [];
        if (isMember) u.products = u.products.filter(p => !A.isMentorship(p.bot));
        else u.products.push({ sessionId: 'manual-' + Date.now(), bot: 'mentor-monthly', botName: 'IMPERA Mentorship — Monthly', licenceKey: null, plan: 'monthly', date: new Date().toISOString() });
        localStorage.setItem(A.K.users, JSON.stringify(users));
        renderClients();
    };
    window.delUser = function (email) {
        if (!confirm('Delete client ' + email + '? This cannot be undone.')) return;
        localStorage.setItem(A.K.users, JSON.stringify(A.getUsers().filter(u => u.email !== email)));
        renderClients();
    };

    /* ---------- Analytics ---------- */
    function renderAnalytics(d) {
        const pl = $('#pagesList');
        pl.innerHTML = d.pages.length
            ? d.pages.map(p => `<div class="stat-row"><span class="page-url">${esc(p.page)}</span><span>${p.views} views</span></div>`).join('')
            : '<div class="stat-row"><span>No page data yet — connect the server so visitor tracking starts.</span></div>';

        const rl = $('#refList');
        rl.innerHTML = d.referrers && d.referrers.length
            ? d.referrers.map(rf => `<div class="stat-row"><span class="page-url">${esc(rf.ref)}</span><span>${rf.count}</span></div>`).join('')
            : '<div class="stat-row"><span>No external traffic recorded yet.</span></div>';
    }
})();
