/* ========================================
   IMPERA — Dashboard (Static, No Server)
   ======================================== */
(async function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    // ---- Auth (ImperaAuth: users, passwords, roles) ----
    let session = window.ImperaAuth ? ImperaAuth.session() : JSON.parse(localStorage.getItem('impera_session') || 'null');

    if (!session || !session.email) {
        showAuthScreen();
        return;
    }

    function showAuthScreen() {
        document.querySelector('.dash-main').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;padding:40px">
                <div style="max-width:400px;width:100%">
                    <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:8px;text-align:center">Welcome to IMPERA</h2>
                    <p id="authSub" style="color:#666;text-align:center;margin-bottom:32px">Log in to access your products and sessions</p>
                    <form id="authForm" style="display:flex;flex-direction:column;gap:16px">
                        <div id="regNameRow" style="display:none">
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#aaa;margin-bottom:8px">Full Name</label>
                            <input type="text" id="authName" placeholder="Your name" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.95rem;font-family:Inter,sans-serif;outline:none;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#aaa;margin-bottom:8px">Email Address</label>
                            <input type="email" id="authEmail" placeholder="you@example.com" required style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.95rem;font-family:Inter,sans-serif;outline:none;box-sizing:border-box">
                        </div>
                        <div>
                            <label style="display:block;font-size:0.85rem;font-weight:600;color:#aaa;margin-bottom:8px">Password</label>
                            <input type="password" id="authPass" placeholder="Your password" required style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:0.95rem;font-family:Inter,sans-serif;outline:none;box-sizing:border-box">
                        </div>
                        <p id="authError" style="color:#ff5c7a;font-size:0.85rem;display:none"></p>
                        <button type="submit" id="authSubmit" style="width:100%;padding:16px;background:#00C2FF;color:#050505;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:1px">Log In</button>
                    </form>
                    <p style="text-align:center;margin-top:20px;color:#777;font-size:0.9rem">
                        <span id="authToggleText">Don't have an account?</span>
                        <a href="#" id="authToggle" style="color:#00C2FF;font-weight:600">Create one</a>
                    </p>
                </div>
            </div>`;

        var mode = 'login';
        const toggle = $('#authToggle');
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            mode = mode === 'login' ? 'register' : 'login';
            $('#regNameRow').style.display = mode === 'register' ? 'block' : 'none';
            $('#authSubmit').textContent = mode === 'register' ? 'Create Account' : 'Log In';
            $('#authToggleText').textContent = mode === 'register' ? 'Already have an account?' : "Don't have an account?";
            toggle.textContent = mode === 'register' ? 'Log in' : 'Create one';
            $('#authSub').textContent = mode === 'register'
                ? 'Create your IMPERA account'
                : 'Log in to access your products and sessions';
            $('#authError').style.display = 'none';
        });

        $('#authForm').addEventListener('submit', function(e) {
            e.preventDefault();
            var email = $('#authEmail').value.trim();
            var pass = $('#authPass').value;
            var res;
            if (mode === 'register') {
                var name = $('#authName').value.trim();
                if (!name) { return authFail('Please enter your name.'); }
                if (pass.length < 6) { return authFail('Password must be at least 6 characters.'); }
                res = ImperaAuth.register(name, email, pass);
            } else {
                res = ImperaAuth.login(email, pass);
            }
            if (res.error) return authFail(res.error);
            window.location.reload();
        });

        function authFail(msg) {
            var el = $('#authError');
            el.textContent = msg;
            el.style.display = 'block';
        }
    }

    // ---- Populate user data ----
    const firstName = (session.name || 'Trader').split(' ')[0];
    if ($('#dashUserName')) $('#dashUserName').textContent = firstName;
    if ($('#topbarName')) $('#topbarName').textContent = firstName;
    if ($('#topbarAvatar')) $('#topbarAvatar').textContent = firstName.charAt(0).toUpperCase();
    if ($('#settingsName')) $('#settingsName').value = session.name || '';
    if ($('#settingsEmail')) $('#settingsEmail').value = session.email || '';

    // ---- Sidebar / Tab navigation ----
    const sidebarLinks = $$('.sidebar-link[data-tab]');
    const tabs = $$('.dash-tab');

    function switchTab(tabId) {
        sidebarLinks.forEach(l => l.classList.toggle('active', l.dataset.tab === tabId));
        tabs.forEach(t => t.classList.toggle('active', t.id === 'tab-' + tabId));
        const titles = {
            'overview': 'Overview',
            'products': 'My Products',
            'sessions': 'Book a Session',
            'bots': 'My Bots',
            'licence': 'Licence Key',
            'settings': 'Settings'
        };
        if ($('#topbarTitle')) $('#topbarTitle').textContent = titles[tabId] || 'Dashboard';
        if (tabId === 'sessions' && !session.isMember) { switchTab('overview'); return; }
        if (tabId === 'sessions') renderSessions();
        if ($('#sidebar')) $('#sidebar').classList.remove('open');
        if ($('#sidebarOverlay')) $('#sidebarOverlay').classList.remove('active');
    }
    window.switchTab = switchTab;

    // Role-based nav visibility
    if (session.isMember) {
        const snl = $('#sessionsNavLink');
        if (snl) snl.style.display = '';
    }
    if (session.role === 'admin') {
        const apl = $('#adminPortalLink');
        if (apl) apl.style.display = '';
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });

    if ($('#sidebarToggle')) {
        $('#sidebarToggle').addEventListener('click', () => {
            $('#sidebar').classList.add('open');
            $('#sidebarOverlay').classList.add('active');
        });
    }
    if ($('#sidebarClose')) {
        $('#sidebarClose').addEventListener('click', () => {
            $('#sidebar').classList.remove('open');
            $('#sidebarOverlay').classList.remove('active');
        });
    }
    if ($('#sidebarOverlay')) {
        $('#sidebarOverlay').addEventListener('click', () => {
            $('#sidebar').classList.remove('open');
            $('#sidebarOverlay').classList.remove('active');
        });
    }

    // ---- Logout ----
    $('#logoutBtn').addEventListener('click', () => {
        if (window.ImperaAuth) ImperaAuth.clearSession();
        else localStorage.removeItem('impera_session');
        window.location.href = 'index.html';
    });

    // ================= OVERVIEW — real account data only =================
    function renderOverviewStats() {
        const A = window.ImperaAuth;
        const purchases = A ? A.getPurchases().filter(p => p.email === session.email) : [];
        const bots = purchases.filter(p => !A.isMentorship(p.bot));
        const member = purchases.some(p => A.isMentorship(p.bot));

        const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
        set('ovBots', bots.length);
        set('ovPlan', member ? (purchases.some(p => p.bot === 'mentor-lifetime') ? 'Lifetime' : 'Monthly') : '\u2014');

        const upcoming = A ? A.getBookings()
            .filter(b => b.userEmail === session.email && b.status !== 'cancelled' &&
                         new Date(b.date + 'T' + b.time) >= new Date())
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] : null;
        set('ovSession', upcoming ? upcoming.date + ' \u00b7 ' + upcoming.time : 'None booked');

        const u = A ? A.findUser(session.email) : null;
        set('ovSince', u && u.createdAt
            ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '\u2014');
    }

    function renderAll() {
        renderBots();
        renderOverviewStats();
    }

    // ---- My Bots tab ----
    function renderBots() {
        const grid = $('#dashBotsGrid');
        if (!grid) return;
        const purchases = JSON.parse(localStorage.getItem('impera_purchases') || '[]');
        const userPurchases = purchases.filter(p => p.email === session.email);
        const purchasedBots = userPurchases.map(p => p.bot);
        const tier = session.tier;

        const allBots = [
            { key: 'scalping', name: 'IMPERA Scalping Bot', tier: 'Scalping', file: 'IMPERA_Scalping_Bot.mq5', desc: 'EMA crossover + RSI · M1/M5 scalper · EUR/USD, GBP/USD, USD/JPY', active: tier === 'Scalping' || tier === 'Gold' || tier === 'Global', purchased: purchasedBots.includes('scalping') },
            { key: 'gold', name: 'IMPERA Gold Bot', tier: 'Gold', file: 'IMPERA_Gold_Bot.mq5', desc: 'Multi-TF EMA + MACD + Stoch · XAU/USD specialist', active: tier === 'Gold' || tier === 'Global', purchased: purchasedBots.includes('gold') },
            { key: 'global', name: 'IMPERA Global Bot', tier: 'Global', file: 'IMPERA_Global_Bot.mq5', desc: '3 strategies: Scalp + Swing + Breakout · All symbols · VIP', active: tier === 'Global', purchased: purchasedBots.includes('global') }
        ];

        grid.innerHTML = allBots.map(b => {
            const hasFile = b.purchased || b.active;
            const downloadHtml = hasFile
                ? `<a href="bots/${b.file}" download="${b.file}" style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,255,178,0.06);border:1px solid rgba(0,255,178,0.15);border-radius:8px;color:#00FFB2;text-decoration:none;font-size:0.85rem;font-weight:600;margin-top:12px;transition:all 0.3s"><span>&darr;</span> Download ${b.file}</a>`
                : `<a href="index.html#store" style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,194,255,0.06);border:1px solid rgba(0,194,255,0.15);border-radius:8px;color:#00C2FF;text-decoration:none;font-size:0.85rem;font-weight:600;margin-top:12px;transition:all 0.3s"><span>&rarr;</span> Purchase to Download</a>`;
            return `
                <div class="dash-bot-card">
                    <div class="dash-bot-header">
                        <span class="dash-bot-name">${b.name}</span>
                        <span class="dash-bot-status ${b.active ? 'active' : 'inactive'}">${b.active ? 'Unlocked' : 'Locked'}</span>
                    </div>
                    <p style="color:var(--gray-500);font-size:0.82rem;margin:8px 0 0">${b.desc}</p>
                    <div class="dash-bot-stats">
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val" style="font-size:0.95rem">${b.active ? 'Unlocked' : 'Locked'}</div><div class="dash-bot-stat-label">Access</div></div>
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val">${b.tier}</div><div class="dash-bot-stat-label">Tier</div></div>
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val" style="font-size:0.95rem">MT5 · .mq5</div><div class="dash-bot-stat-label">Format</div></div>
                    </div>
                    ${downloadHtml}
                </div>`;
        }).join('');
    }

    // ---- Licence key ----
    function renderLicence() {
        const activeBox = $('#licenceActive');
        const inactiveBox = $('#licenceInactive');
        if (session.licence) {
            if (activeBox) activeBox.style.display = '';
            if (inactiveBox) inactiveBox.style.display = 'none';
            if ($('#licenceTier')) $('#licenceTier').textContent = (session.tier || 'Standard') + ' License';
            if ($('#licenceKeyDisplay')) $('#licenceKeyDisplay').textContent = session.licence;
        } else {
            if (activeBox) activeBox.style.display = 'none';
            if (inactiveBox) inactiveBox.style.display = '';
        }
    }
    renderLicence();

    const licenceForm = $('#licenceForm');
    if (licenceForm) {
        const input = $('#licenceInput');
        input.addEventListener('input', e => {
            let raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            let body = raw.startsWith('IMPERA') ? raw.slice(6) : raw;
            body = body.slice(0, 12);
            let formatted = 'IMPERA';
            for (let i = 0; i < body.length; i++) {
                if (i % 4 === 0) formatted += '-';
                formatted += body[i];
            }
            e.target.value = formatted;
        });

        licenceForm.addEventListener('submit', e => {
            e.preventDefault();
            const key = input.value.trim().toUpperCase();
            const errorEl = $('#licenceError');
            errorEl.classList.remove('show');
            if (!/^IMPERA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
                errorEl.textContent = 'Invalid key format. Use IMPERA-XXXX-XXXX-XXXX.';
                errorEl.classList.add('show');
                return;
            }
            let tier = 'Scalping';
            if (key.includes('DIAM') || key.includes('VIPX')) tier = 'Global';
            else if (key.includes('GOLD') || key.includes('ULTR')) tier = 'Gold';

            session.licence = key;
            session.tier = tier;
            localStorage.setItem('impera_session', JSON.stringify(session));
            const botNames = { Scalping: 'IMPERA Scalping Bot', Gold: 'IMPERA Gold Bot', Global: 'IMPERA Global Bot' };
            const ok = $('#licenceSuccess');
            if (ok) {
                ok.textContent = '\u2713 Licence activated \u2014 ' + (botNames[tier] || 'your bot') + ' unlocked';
                ok.style.display = '';
            }
            errorEl.classList.remove('show');
            renderLicence();
            renderAll();
        });
    }

    const deactivateBtn = $('#deactivateKeyBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            session.licence = null; session.tier = null;
            localStorage.setItem('impera_session', JSON.stringify(session));
            const ok = $('#licenceSuccess');
            if (ok) ok.style.display = 'none';
            renderLicence(); renderAll();
            $('#licenceInput').value = '';
        });
    }

    // ---- Settings ----
    const settingsForm = $('#settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', e => {
            e.preventDefault();
            const newName = $('#settingsName').value.trim();
            if (newName) {
                session.name = newName;
                localStorage.setItem('impera_session', JSON.stringify(session));
                const fn = newName.split(' ')[0];
                if ($('#dashUserName')) $('#dashUserName').textContent = fn;
                if ($('#topbarName')) $('#topbarName').textContent = fn;
                if ($('#topbarAvatar')) $('#topbarAvatar').textContent = fn.charAt(0).toUpperCase();
            }
            const btn = settingsForm.querySelector('button[type="submit"]');
            btn.textContent = 'Saved!';
            btn.style.background = 'linear-gradient(135deg, #00FFB2, #00cc8e)';
            setTimeout(() => { btn.textContent = 'Save Changes'; btn.style.background = ''; }, 2000);
        });
    }

    // ---- Init ----
    renderAll();

    /* ========================================
       MY PRODUCTS
       ======================================== */
    const BOT_META = {
        scalping:  { name: 'IMPERA Scalping Bot',  file: 'assets/IMPERA_Scalping_Bot.mq5' },
        gold:      { name: 'IMPERA Gold Bot',      file: 'assets/IMPERA_Gold_Bot.mq5' },
        global:    { name: 'IMPERA Global Bot',    file: 'assets/IMPERA_Global_Bot.mq5' },
        platinum:  { name: 'IMPERA Platinum AI',   file: 'assets/IMPERA_Platinum.mq5' }
    };

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    function fmtDate(iso) {
        try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return iso; }
    }

    function renderProducts() {
        const grid = $('#productsGrid');
        if (!grid) return;
        const prods = (window.ImperaAuth ? ImperaAuth.userProducts(session.email) : []) || [];

        if (!prods.length) {
            grid.innerHTML = `<div class="dash-card" style="text-align:center;padding:48px">
                <p style="color:#777;margin-bottom:20px">You don't own any products yet.</p>
                <a href="index.html#pricing" class="btn btn-primary">Browse IMPERA Products</a>
            </div>`;
            return;
        }

        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">';
        prods.forEach(p => {
            const isMentor = ImperaAuth.isMentorship(p.bot);
            if (isMentor) {
                const m = ImperaAuth.mentorshipPlan(session.email);
                html += `
                <div class="dash-card" style="border:1px solid rgba(201,169,98,0.4)">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                        <h3 style="font-size:1.1rem">&#128218; IMPERA Mentorship</h3>
                        <span style="font-size:.7rem;letter-spacing:1px;text-transform:uppercase;color:#00FFB2;border:1px solid rgba(0,255,178,.35);padding:4px 10px;border-radius:99px;">Active</span>
                    </div>
                    <p style="color:#888;font-size:.9rem;line-height:1.8">
                        Plan: <strong style="color:#fff">${esc(m.plan)}</strong><br>
                        Member since: ${fmtDate(m.started)}<br>
                        ${m.nextRenewal ? 'Next renewal: ' + fmtDate(m.nextRenewal) + '<br>' : ''}
                        Includes: weekly 1:1 sessions, private community, trade reviews
                    </p>
                    <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="switchTab('sessions')">Book Your Next Session &rarr;</button>
                </div>`;
            } else {
                const meta = BOT_META[p.bot] || { name: p.botName || p.bot, file: '#' };
                html += `
                <div class="dash-card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                        <h3 style="font-size:1.1rem">&#129302; ${esc(meta.name)}</h3>
                        <span style="font-size:.7rem;letter-spacing:1px;text-transform:uppercase;color:#00FFB2;border:1px solid rgba(0,255,178,.35);padding:4px 10px;border-radius:99px;">Owned</span>
                    </div>
                    <p style="color:#888;font-size:.85rem">Purchased ${fmtDate(p.date)}</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:10px;padding:12px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px">
                        <code style="font-family:'JetBrains Mono',monospace;font-size:.85rem;color:#C9A962">${esc(p.licenceKey || '—')}</code>
                        <button onclick="copyLicence(this,'${esc(p.licenceKey || '')}')" style="background:none;border:none;color:#00C2FF;font-size:.75rem;cursor:pointer;white-space:nowrap">COPY</button>
                    </div>
                    <a href="${meta.file}" download class="btn btn-primary" style="margin-top:16px;width:100%;display:block;text-align:center">Download .mq5</a>
                </div>`;
            }
        });
        html += '</div>';
        grid.innerHTML = html;
    }
    window.copyLicence = function (btn, key) {
        navigator.clipboard.writeText(key).then(() => {
            var old = btn.textContent;
            btn.textContent = 'COPIED';
            setTimeout(() => { btn.textContent = old; }, 1500);
        });
    };
    renderProducts();

    /* ========================================
       SESSIONS — Booking calendar (mentorship)
       ======================================== */
    let calDate = new Date();
    let selectedDay = null;

    function renderSessions() {
        if (!session.isMember) return;
        buildCalendar();
        renderUpcoming();
    }

    function buildCalendar() {
        const grid = $('#calGrid'), head = $('#calHead'), label = $('#calLabel');
        if (!grid) return;
        head.innerHTML = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div>${d}</div>`).join('');

        const y = calDate.getFullYear(), m = calDate.getMonth();
        label.textContent = calDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        const first = new Date(y, m, 1);
        const startOffset = (first.getDay() + 6) % 7; // Monday-first
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        let html = '';
        for (let i = 0; i < startOffset; i++) html += '<div></div>';

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(y, m, d);
            const dow = date.getDay();
            const isPast = date < today;
            const available = !isPast;
            const bookedCount = ImperaAuth.getBookings().filter(b => sameDay(b.date, date) && b.userEmail === session.email && b.status !== 'cancelled').length;
            const isSelected = selectedDay && sameDay(selectedDay, date);

            html += `<div data-day="${d}" style="
                    aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    border-radius:10px;cursor:${available ? 'pointer' : 'default'};
                    border:1px solid ${isSelected ? '#00C2FF' : available ? 'rgba(0,194,255,0.25)' : 'rgba(255,255,255,0.05)'};
                    background:${isSelected ? 'rgba(0,194,255,0.12)' : available ? 'rgba(0,194,255,0.04)' : 'transparent'};
                    color:${available ? '#fff' : '#444'};
                    font-weight:${bookedCount ? 700 : 500};position:relative;">
                    ${d}
                    ${bookedCount ? '<span style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#C9A962"></span>' : ''}
                </div>`;
        }
        grid.innerHTML = html;

        grid.querySelectorAll('[data-day]').forEach(cell => {
            cell.addEventListener('click', () => {
                const d = parseInt(cell.dataset.day, 10);
                const date = new Date(y, m, d);
                const today2 = new Date(); today2.setHours(0, 0, 0, 0);
                if (date < today2) return;
                selectedDay = date;
                buildCalendar();
                renderSlots(date);
            });
        });
    }

    function sameDay(dateStrOrDate, d2) {
        const d1 = dateStrOrDate instanceof Date ? dateStrOrDate : new Date(dateStrOrDate + 'T00:00:00');
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    function ymd(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function renderSlots(date) {
        const panel = $('#slotPanel');
        const taken = ImperaAuth.bookedSlots(ymd(date));
        let html = `<p style="font-weight:700;margin-bottom:14px">${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
        html += ImperaAuth.SLOTS.map(t => {
            const isTaken = taken.includes(t);
            return `<button type="button" data-slot="${t}" disabled="${isTaken}" style="
                    width:100%;padding:11px;margin-bottom:8px;border-radius:10px;cursor:${isTaken ? 'not-allowed' : 'pointer'};
                    border:1px solid ${isTaken ? 'rgba(255,255,255,0.08)' : 'rgba(0,194,255,0.35)'};
                    background:${isTaken ? 'rgba(255,255,255,0.03)' : 'rgba(0,194,255,0.06)'};
                    color:${isTaken ? '#555' : '#fff'};font-family:Inter,sans-serif;font-size:.9rem;">
                    ${t}${isTaken ? ' · booked' : ''} <span style="float:right;color:#666">Zoom</span>
                </button>`;
        }).join('');
        panel.innerHTML = html;

        panel.querySelectorAll('[data-slot]:not([disabled="true"])').forEach(btn => {
            btn.addEventListener('click', () => confirmBooking(ymd(date), btn.dataset.slot));
        });
    }

    function confirmBooking(date, time) {
        const nice = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
        panelConfirm(nice + ' at ' + time, () => {
            const res = ImperaAuth.addBooking(session.email, session.name, date, time);
            if (res.error) return alert(res.error);
            syncBookingToServer(res.booking);
            renderSlots(new Date(date + 'T00:00:00'));
            buildCalendar();
            renderUpcoming();
            alert('Session requested for ' + nice + ' at ' + time + '. You will receive a Zoom link by email once confirmed.');
        });
    }

    // ---- Optional server sync (works when Admin Portal → Live Connection is configured) ----
    function apiBase() { try { return localStorage.getItem('impera_api_url'); } catch (e) { return null; } }
    function syncBookingToServer(b) {
        const base = apiBase(); if (!base || !b) return;
        fetch(base.replace(/\/$/, '') + '/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b)
        }).catch(() => {});
    }
    function patchBookingOnServer(id, patch) {
        const base = apiBase(); if (!base || !id) return;
        fetch(base.replace(/\/$/, '') + '/api/bookings/' + encodeURIComponent(id), {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
        }).catch(() => {});
    }

    function panelConfirm(text, cb) {
        // lightweight inline confirm using native dialog
        if (window.confirm('Book a 1:1 session on ' + text + '?')) cb();
    }

    function renderUpcoming() {
        const list = $('#upcomingList');
        if (!list) return;
        const mine = ImperaAuth.getBookings()
            .filter(b => b.userEmail === session.email && b.status !== 'cancelled')
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        const upcoming = mine.filter(b => new Date(b.date + 'T' + b.time) >= new Date());
        if (!upcoming.length) {
            list.innerHTML = '<p style="color:#666;font-size:.95rem">No sessions booked yet.</p>';
            return;
        }

        list.innerHTML = upcoming.map(b => {
            const d = new Date(b.date + 'T' + b.time);
            const statusColor = b.status === 'confirmed' ? '#00FFB2' : b.status === 'completed' ? '#888' : '#C9A962';
            return `<div class="dash-card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 22px;margin-bottom:12px">
                <div>
                    <strong>${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${b.time}</strong>
                    <span style="margin-left:10px;color:${statusColor};font-size:.75rem;text-transform:uppercase;letter-spacing:1px">${b.status}</span>
                    <p style="color:#777;font-size:.85rem;margin-top:4px">${esc(b.type)} — via Zoom</p>
                </div>
                <div style="display:flex;gap:10px;align-items:center">
                    ${b.zoom ? `<a href="${esc(b.zoom)}" target="_blank" rel="noopener" class="btn btn-primary" style="padding:9px 18px;font-size:.85rem">Join Zoom</a>` : ''}
                    ${b.status === 'pending' ? `<button onclick="cancelBooking('${b.id}')" class="btn btn-glass" style="padding:9px 18px;font-size:.85rem">Cancel</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }
    window.cancelBooking = function (id) {
        ImperaAuth.updateBooking(id, { status: 'cancelled' });
        patchBookingOnServer(id, { status: 'cancelled' });
        renderSessions();
    };
})();
