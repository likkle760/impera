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
            'live-trades': 'Live Trades',
            'performance': 'Performance',
            'bots': 'My Bots',
            'mt5': 'MT5 Account',
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

    // ---- Bot-specific trade configs ----
    const botConfigs = {
        scalping: {
            pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'],
            maxTrades: 3, lotRange: [0.01, 0.02, 0.05], avgDuration: '5-15m',
            strategy: 'EMA Crossover + RSI',
            bases: { 'EUR/USD': 1.089, 'GBP/USD': 1.271, 'USD/JPY': 157.3, 'AUD/USD': 0.662, 'USD/CAD': 1.364 }
        },
        gold: {
            pairs: ['XAU/USD'], maxTrades: 2, lotRange: [0.01, 0.02, 0.05], avgDuration: '15-60m',
            strategy: 'Multi-TF EMA + MACD + Stoch',
            bases: { 'XAU/USD': 2384 }
        },
        global: {
            pairs: ['EUR/USD', 'GBP/USD', 'XAU/USD', 'USD/JPY', 'NAS100', 'GBP/JPY', 'AUD/USD', 'BTC/USD'],
            maxTrades: 5, lotRange: [0.01, 0.05, 0.1], avgDuration: '5-120m',
            strategy: 'Scalp + Swing + Breakout',
            bases: { 'EUR/USD': 1.089, 'GBP/USD': 1.271, 'XAU/USD': 2384, 'BTC/USD': 67842, 'USD/JPY': 157.3, 'NAS100': 19403, 'GBP/JPY': 199.8, 'AUD/USD': 0.662 }
        }
    };

    let activeBotType = null;
    let openTrades = [];
    let closedTrades = [];
    let tradeInterval = null;

    function detectBotType() {
        if (!session.licence) return null;
        const key = session.licence.toUpperCase();
        if (key.includes('DIAM') || key.includes('VIPX') || session.tier === 'Global') return 'global';
        if (key.includes('GOLD') || key.includes('ULTR') || session.tier === 'Gold') return 'gold';
        return 'scalping';
    }

    function randomPrice(pair, bases) {
        const base = bases[pair] || 1.0;
        return base + (Math.random() - 0.5) * base * 0.003;
    }

    function fmt(v, pair) {
        const dp = (pair === 'XAU/USD' || pair === 'BTC/USD' || pair === 'NAS100') ? 2 : (pair.includes('JPY') ? 3 : 5);
        return v.toFixed(dp);
    }

    function generateTrades() {
        const botType = detectBotType();
        if (!botType) {
            openTrades = []; closedTrades = []; activeBotType = null;
            if (tradeInterval) { clearInterval(tradeInterval); tradeInterval = null; }
            renderAll(); return;
        }
        if (botType === activeBotType && openTrades.length > 0) return;
        activeBotType = botType;
        const config = botConfigs[botType];
        const pairs = config.pairs;
        const bases = config.bases;
        const now = Date.now();

        openTrades = [];
        const numOpen = Math.min(config.maxTrades, Math.floor(Math.random() * config.maxTrades) + 1);
        for (let i = 0; i < numOpen; i++) {
            const pair = pairs[Math.floor(Math.random() * pairs.length)];
            const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
            const entry = randomPrice(pair, bases);
            const current = randomPrice(pair, bases);
            const lots = config.lotRange[Math.floor(Math.random() * config.lotRange.length)];
            const diff = type === 'BUY' ? current - entry : entry - current;
            const profit = diff * lots * (pair === 'XAU/USD' ? 100 : pair === 'BTC/USD' ? 0.01 : 100000);
            const sl = type === 'BUY' ? entry * 0.998 : entry * 1.002;
            const tp = type === 'BUY' ? entry * 1.004 : entry * 0.996;
            const duration = Math.floor(Math.random() * 120) + 5;
            openTrades.push({ ticket: 1000000 + Math.floor(Math.random() * 900000), pair, type, lots, entry, sl, tp, current, profit, duration, strategy: config.strategy });
        }

        closedTrades = [];
        for (let i = 0; i < 10; i++) {
            const pair = pairs[Math.floor(Math.random() * pairs.length)];
            const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
            const entry = randomPrice(pair, bases);
            const exit = randomPrice(pair, bases);
            const lots = config.lotRange[Math.floor(Math.random() * config.lotRange.length)];
            const diff = type === 'BUY' ? exit - entry : entry - exit;
            const profit = diff * lots * (pair === 'XAU/USD' ? 100 : pair === 'BTC/USD' ? 0.01 : 100000);
            const mins = Math.floor(Math.random() * 280) + 5;
            const time = new Date(now - mins * 60000);
            closedTrades.push({ pair, type, entry, exit, profit, time });
        }
        renderAll();
    }

    function renderAll() {
        renderLiveTrades(); renderClosedTrades(); renderRecentTrades();
        renderBots(); renderOverviewStats(); renderEmptyStates();
    }

    function renderEmptyStates() {
        const noLicence = !session.licence;
        const recentBody = $('#recentTradesBody');
        const liveBody = $('#liveTradesBody');
        const closedBody = $('#closedTradesBody');
        if (noLicence) {
            const emptyHtml = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray-500)">No active licence key. <a href="#" onclick="switchTab(\'licence\');return false" style="color:#00C2FF">Activate your bot</a> to start trading.</td></tr>';
            const emptyHtmlWide = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--gray-500)">No active trades. <a href="#" onclick="switchTab(\'licence\');return false" style="color:#00C2FF">Enter your licence key</a> to begin.</td></tr>';
            if (recentBody) recentBody.innerHTML = emptyHtml;
            if (liveBody) liveBody.innerHTML = emptyHtmlWide;
            if (closedBody) closedBody.innerHTML = emptyHtml;
        }
    }

    function renderOverviewStats() {
        const balanceEl = $('#statBalance');
        const profitEl = $('#statProfit');
        const openEl = $('#statOpenTrades');
        const winEl = $('#statWinRate');
        if (session.licence) {
            const balance = 10000 + Math.random() * 5000;
            const todayProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0);
            const wins = closedTrades.filter(t => t.profit > 0).length;
            const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : '0.0';
            if (balanceEl) balanceEl.textContent = balance.toLocaleString(undefined, { minimumFractionDigits: 2 });
            if (profitEl) profitEl.textContent = todayProfit >= 0 ? todayProfit.toFixed(2) : todayProfit.toFixed(2);
            if (openEl) openEl.textContent = openTrades.length;
            if (winEl) winEl.textContent = winRate;
        } else {
            if (balanceEl) balanceEl.textContent = '0.00';
            if (profitEl) profitEl.textContent = '0.00';
            if (openEl) openEl.textContent = '0';
            if (winEl) winEl.textContent = '0.0';
        }
    }

    function renderLiveTrades() {
        const body = $('#liveTradesBody');
        if (!body) return;
        if (!session.licence) { body.innerHTML = ''; return; }
        if (openTrades.length === 0) {
            body.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--gray-500)">No open trades at the moment.</td></tr>';
            return;
        }
        body.innerHTML = openTrades.map(t => `
            <tr>
                <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--gray-500)">#${t.ticket}</td>
                <td><strong>${t.pair}</strong></td>
                <td class="${t.type === 'BUY' ? 'trade-buy' : 'trade-sell'}">${t.type}</td>
                <td>${t.lots}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.entry, t.pair)}</td>
                <td style="font-family:var(--font-mono);color:var(--red)">${fmt(t.sl, t.pair)}</td>
                <td style="font-family:var(--font-mono);color:var(--emerald)">${fmt(t.tp, t.pair)}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.current, t.pair)}</td>
                <td class="${t.profit >= 0 ? 'trade-profit' : 'trade-loss'}">${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)}</td>
                <td style="color:var(--gray-500)">${t.duration}m</td>
            </tr>
        `).join('');
    }

    function renderClosedTrades() {
        const body = $('#closedTradesBody');
        if (!body) return;
        if (!session.licence) { body.innerHTML = ''; return; }
        if (closedTrades.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-500)">No closed trades yet.</td></tr>';
            return;
        }
        body.innerHTML = closedTrades.map(t => `
            <tr>
                <td><strong>${t.pair}</strong></td>
                <td class="${t.type === 'BUY' ? 'trade-buy' : 'trade-sell'}">${t.type}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.entry, t.pair)}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.exit, t.pair)}</td>
                <td class="${t.profit >= 0 ? 'trade-profit' : 'trade-loss'}">${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)}</td>
                <td style="color:var(--gray-500)">${t.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
        `).join('');
    }

    function renderRecentTrades() {
        const body = $('#recentTradesBody');
        if (!body) return;
        if (!session.licence || closedTrades.length === 0) { body.innerHTML = ''; return; }
        const recent = closedTrades.slice(0, 5);
        body.innerHTML = recent.map(t => `
            <tr>
                <td><strong>${t.pair}</strong></td>
                <td class="${t.type === 'BUY' ? 'trade-buy' : 'trade-sell'}">${t.type}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.entry, t.pair)}</td>
                <td style="font-family:var(--font-mono)">${fmt(t.exit, t.pair)}</td>
                <td class="${t.profit >= 0 ? 'trade-profit' : 'trade-loss'}">${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)}</td>
                <td><span class="trade-status ${t.profit >= 0 ? 'winning' : 'losing'}">${t.profit >= 0 ? 'WIN' : 'LOSS'}</span></td>
            </tr>
        `).join('');
    }

    // ---- Equity chart ----
    function drawEquityChart() {
        const canvas = $('#equityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2; canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        const w = rect.width, h = rect.height;
        const pad = { top: 20, right: 20, bottom: 30, left: 60 };
        const days = 30;
        const data = [];
        let equity = session.licence ? 10000 : 0;
        for (let i = 0; i < days; i++) {
            equity += (Math.random() - 0.35) * 200;
            if (!session.licence) equity = 0;
            data.push(equity);
        }
        const min = session.licence ? Math.min(...data) * 0.998 : 0;
        const max = session.licence ? Math.max(...data) * 1.002 : 100;
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;

        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (chartH / 4) * i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
            const val = max - ((max - min) / 4) * i;
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'right'; ctx.fillText('$' + Math.round(val).toLocaleString(), pad.left - 8, y + 4);
        }

        if (!session.licence) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.fillText('Activate a licence key to see your equity curve', w / 2, h / 2);
            return;
        }

        const gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
        gradient.addColorStop(0, 'rgba(0, 194, 255, 0.15)'); gradient.addColorStop(1, 'rgba(0, 194, 255, 0)');
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = pad.left + (i / (days - 1)) * chartW;
            const y = pad.top + (1 - (v - min) / (max - min)) * chartH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#00C2FF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.lineTo(pad.left + chartW, pad.top + chartH); ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();

        const lastX = pad.left + chartW;
        const lastY = pad.top + (1 - (data[data.length - 1] - min) / (max - min)) * chartH;
        ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, Math.PI * 2); ctx.fillStyle = '#00C2FF'; ctx.fill();
        ctx.beginPath(); ctx.arc(lastX, lastY, 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 194, 255, 0.2)'; ctx.fill();
    }

    function drawMonthlyChart() {
        const canvas = $('#monthlyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2; canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        const w = rect.width, h = rect.height;
        const pad = { top: 20, right: 20, bottom: 40, left: 50 };
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const values = [8.2, 12.5, 6.1, 15.3, 11.8, 18.2, 14.6, 9.3, 16.7, 13.1, 10.8, 17.5];
        const maxVal = Math.max(...values) * 1.2;
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const barW = chartW / months.length * 0.6;
        const gap = chartW / months.length;
        months.forEach((m, i) => {
            const x = pad.left + gap * i + (gap - barW) / 2;
            const barH = (values[i] / maxVal) * chartH;
            const y = pad.top + chartH - barH;
            const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
            grad.addColorStop(0, i === 5 ? '#FFD700' : '#00C2FF');
            grad.addColorStop(1, i === 5 ? 'rgba(255,215,0,0.1)' : 'rgba(0,194,255,0.1)');
            ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]); ctx.fillStyle = grad; ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'center'; ctx.fillText(values[i] + '%', x + barW / 2, y - 6);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px Inter, sans-serif';
            ctx.fillText(m, x + barW / 2, pad.top + chartH + 16);
        });
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
            const isLocked = !b.active;
            const hasFile = b.purchased || b.active;
            const downloadHtml = hasFile
                ? `<a href="bots/${b.file}" download="${b.file}" style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,255,178,0.06);border:1px solid rgba(0,255,178,0.15);border-radius:8px;color:#00FFB2;text-decoration:none;font-size:0.85rem;font-weight:600;margin-top:12px;transition:all 0.3s"><span>&darr;</span> Download ${b.file}</a>`
                : `<a href="index.html#store" style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,194,255,0.06);border:1px solid rgba(0,194,255,0.15);border-radius:8px;color:#00C2FF;text-decoration:none;font-size:0.85rem;font-weight:600;margin-top:12px;transition:all 0.3s"><span>&rarr;</span> Purchase to Download</a>`;
            return `
                <div class="dash-bot-card">
                    <div class="dash-bot-header">
                        <span class="dash-bot-name">${b.name}</span>
                        <span class="dash-bot-status ${b.active ? 'active' : 'inactive'}">${b.active ? 'Running' : (isLocked ? 'Locked' : 'Stopped')}</span>
                    </div>
                    <p style="color:var(--gray-500);font-size:0.82rem;margin:8px 0 0">${b.desc}</p>
                    <div class="dash-bot-stats">
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val">${b.active ? Math.floor(Math.random() * 200 + 50) : '&mdash;'}</div><div class="dash-bot-stat-label">Trades</div></div>
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val" style="color:${b.active ? 'var(--emerald)' : 'var(--gray-500)'}">${b.active ? (90 + Math.random() * 8).toFixed(1) + '%' : '&mdash;'}</div><div class="dash-bot-stat-label">Win Rate</div></div>
                        <div class="dash-bot-stat"><div class="dash-bot-stat-val" style="color:${b.active ? 'var(--emerald)' : 'var(--gray-500)'}">${b.active ? '+$' + (Math.random() * 500 + 100).toFixed(0) : '$0'}</div><div class="dash-bot-stat-label">Profit</div></div>
                    </div>
                    ${downloadHtml}
                </div>`;
        }).join('');
    }

    // ---- MT5 connection (simulated) ----
    const mt5Form = $('#mt5Form');
    const mt5ConnectedInfo = $('#mt5ConnectedInfo');
    const mt5Status = $('#mt5Status');
    const mt5Data = JSON.parse(localStorage.getItem('impera_mt5_' + session.email) || 'null');
    if (mt5Data && mt5Form) showMT5Connected(mt5Data);

    if (mt5Form) {
        mt5Form.addEventListener('submit', e => {
            e.preventDefault();
            const broker = $('#mt5Broker').value;
            const login = $('#mt5Login').value;
            const pass = $('#mt5Pass').value;
            if (!broker || !login || !pass) return;
            const data = { broker, login, balance: (10000 + Math.random() * 5000).toFixed(2), equity: (10000 + Math.random() * 5500).toFixed(2), leverage: '1:500', server: broker };
            localStorage.setItem('impera_mt5_' + session.email, JSON.stringify(data));
            showMT5Connected(data);
        });
    }

    function showMT5Connected(data) {
        if (mt5Form) mt5Form.style.display = 'none';
        if (mt5ConnectedInfo) mt5ConnectedInfo.style.display = '';
        if (mt5Status) mt5Status.innerHTML = '<div class="mt5-status-dot connected"></div><span style="color:var(--emerald)">Connected</span>';
        if ($('#mt5InfoBroker')) $('#mt5InfoBroker').textContent = data.broker;
        if ($('#mt5InfoLogin')) $('#mt5InfoLogin').textContent = data.login;
        if ($('#mt5InfoBalance')) $('#mt5InfoBalance').textContent = '$' + parseFloat(data.balance).toLocaleString(undefined, { minimumFractionDigits: 2 });
        if ($('#mt5InfoEquity')) $('#mt5InfoEquity').textContent = '$' + parseFloat(data.equity).toLocaleString(undefined, { minimumFractionDigits: 2 });
        if ($('#mt5InfoLeverage')) $('#mt5InfoLeverage').textContent = data.leverage;
        if ($('#mt5InfoServer')) $('#mt5InfoServer').textContent = data.server;
    }

    const mt5DisconnectBtn = $('#mt5DisconnectBtn');
    if (mt5DisconnectBtn) {
        mt5DisconnectBtn.addEventListener('click', () => {
            localStorage.removeItem('impera_mt5_' + session.email);
            if (mt5Form) mt5Form.style.display = '';
            if (mt5ConnectedInfo) mt5ConnectedInfo.style.display = 'none';
            if (mt5Status) mt5Status.innerHTML = '<div class="mt5-status-dot disconnected"></div><span>Not Connected</span>';
            if (mt5Form) mt5Form.reset();
        });
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
            activeBotType = null; openTrades = []; closedTrades = [];
            renderLicence(); generateTrades();
        });
    }

    const deactivateBtn = $('#deactivateKeyBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            session.licence = null; session.tier = null;
            localStorage.setItem('impera_session', JSON.stringify(session));
            activeBotType = null; openTrades = []; closedTrades = [];
            if (tradeInterval) { clearInterval(tradeInterval); tradeInterval = null; }
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
    generateTrades();
    drawEquityChart();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { drawEquityChart(); drawMonthlyChart(); }, 200);
    });

    // Simulate live trade updates
    if (session.licence) {
        const config = botConfigs[activeBotType] || botConfigs.scalping;
        tradeInterval = setInterval(() => {
            openTrades.forEach(t => {
                t.current = randomPrice(t.pair, config.bases);
                const diff = t.type === 'BUY' ? t.current - t.entry : t.entry - t.current;
                t.profit = diff * t.lots * (t.pair === 'XAU/USD' ? 100 : t.pair === 'BTC/USD' ? 0.01 : 100000);
                t.duration += 1;
            });
            renderLiveTrades();
        }, 3000);
    }

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
