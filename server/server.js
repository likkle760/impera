/* ============================================================
   IMPERA — Stripe Webhook Server
   ------------------------------------------------------------
   Receives Stripe events, matches REAL billing data
   (name / email / amount / product), provisions the buyer's
   login, and emails the branded confirmation automatically.

   Events handled:
     - checkout.session.completed      -> order-approved.html
     - payment_intent.payment_failed   -> order-declined.html

   Run locally:
     npm install
     cp .env.example .env        (fill values)
     stripe listen --forward-to localhost:4242/webhook
     node server.js
   ============================================================ */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4242;
const DATA_DIR = path.join(__dirname, 'data');

// ---------- Config ----------
const SITE_URL = process.env.SITE_URL || 'http://localhost:5500';
const DASHBOARD_URL = SITE_URL.replace(/\/$/, '') + '/dashboard.html';
const TELEGRAM_URL = process.env.TELEGRAM_URL || 'https://t.me/+PwykI4dxBOEzMGFk';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@impera.com';

// Map Stripe Price IDs -> product info.
// Built-in defaults below; optionally override/extend via PRICE_MAP env (JSON).
const DEFAULT_PRICE_MAP = {
    'price_1U7cTzRiTJNYtmMnrJ9pfDWl': { key: 'scalping', name: 'IMPERA Scalping Bot', type: 'bot' },
    'price_1U7cTIRiTJNYtmMnOxHBGfmn': { key: 'gold', name: 'IMPERA Gold Bot', type: 'bot' },
    'price_1U7cSQRiTJNYtmMnzPNcyDRf': { key: 'global', name: 'IMPERA Global Bot', type: 'bot' },
    'price_1U7ccARiTJNYtmMnbYF6Rlqx': { key: 'mentor-monthly', name: 'IMPERA Mentorship — Monthly', type: 'mentorship' },
    'price_1U7cPJRiTJNYtmMnX13LOQKm': { key: 'mentor-lifetime', name: 'IMPERA Mentorship — Lifetime', type: 'mentorship' }
};

function priceMap() {
    let extra = {};
    try {
        const parsed = JSON.parse(process.env.PRICE_MAP || '{}');
        if (parsed && typeof parsed === 'object') extra = parsed;
    } catch { /* ignore malformed env */ }
    return Object.assign({}, DEFAULT_PRICE_MAP, extra);
}

// ---------- Tiny JSON store ----------
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const db = {
    read(file) {
        try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
        catch { return []; }
    },
    write(file, arr) {
        fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(arr, null, 2));
    }
};

// ---------- Generators (match frontend formats) ----------
function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
    return out.slice(0, 5) + '-' + out.slice(5);
}
function genLicence() {
    const seg = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
    return `IMPERA-${seg()}-${seg()}-${seg()}`;
}

// Auto-schedule the first mentorship session:
// next weekday (Mon-Fri) at least 2 days out, at MENTOR_SESSION_HOUR.
function nextSessionSlot() {
    const hour = process.env.MENTOR_SESSION_HOUR || '18:00';
    const tz = process.env.MENTOR_SESSION_TZ_LABEL || 'UK time';
    const d = new Date();
    d.setDate(d.getDate() + 3);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return {
        date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        time: `${hour} ${tz}`,
        iso: d.toISOString().slice(0, 10),
        hour
    };
}

// ---------- Email ----------
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendHtml(to, subject, html) {
    await transporter.sendMail({
        from: process.env.MAIL_FROM || 'IMPERA <support@impera.com>',
        to, subject, html
    });
    console.log(`[mail] sent "${subject}" -> ${to}`);
}

// Internal alert -> owner inbox (ADMIN_NOTIFY_EMAIL). Never blocks the main flow.
async function notifyAdmin(subject, lines) {
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (!to) return;
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || 'IMPERA <support@impera.com>',
            to,
            subject,
            html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px;">
                <table role="presentation" width="100%" bgcolor="#050505" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0b0d10;border:1px solid rgba(201,169,98,.35);border-radius:14px;">
                <tr><td style="padding:34px;text-align:center;">
                <div style="font-size:26px;color:#C9A962;">&#9819;</div>
                <h2 style="letter-spacing:5px;font-size:17px;color:#fff;margin:10px 0 20px;">IMPERA ADMIN ALERT</h2>
                ${lines.map(l => `<p style="color:#ddd;font-size:14px;margin:6px 0;">${l}</p>`).join('')}
                </td></tr></table></td></tr></table></div>`
        });
        console.log(`[mail] admin alert "${subject}" -> ${to}`);
    } catch (err) {
        console.error('[mail] admin alert failed:', err.message);
    }
}

function loadTemplate(name, vars) {
    const p = path.join(__dirname, '..', 'emails', name);
    let html = fs.readFileSync(p, 'utf8');
    // strip the placeholder documentation comment
    html = html.replace(/<!--[\s\S]*?-->/, '');
    // optionally remove bot-only blocks (mentorship orders have no licence/download)
    if (vars.__stripBotOnly) {
        html = html.replace(/<!--BOT_ONLY-->[\s\S]*?<!--\/BOT_ONLY-->/g, '');
    }
    delete vars.__stripBotOnly;
    Object.entries(vars).forEach(([k, v]) => {
        html = html.replaceAll('{{' + k + '}}', v == null ? '' : String(v));
    });
    return html;
}

// ---------- Provisioning ----------
function provision({ sessionId, type, productName, priceId, amountFormatted }) {
    const map = priceMap()[priceId] || {};
    const isMentorship = map.type === 'mentorship' || /mentor/i.test(type);
    const password = genPassword();
    const licenceKey = isMentorship ? null : genLicence();

    const accounts = db.read('accounts.json');
    let rec = accounts.find(a => a.sessionId === sessionId);
    if (!rec) {
        rec = { sessionId, createdAt: new Date().toISOString(), emailed: false };
        accounts.push(rec);
    }
    Object.assign(rec, { type, productName, priceId, amountFormatted, password, licenceKey });
    db.write('accounts.json', accounts);
    return rec;
}

function saveUser(rec, customerName, email) {
    const users = db.read('users.json');
    let u = users.find(x => x.email === email);
    if (!u) {
        u = { email, name: customerName || 'Trader', role: 'client', createdAt: new Date().toISOString(), products: [] };
        users.push(u);
    } else {
        u.pass = null; // force re-provision display
    }
    u.password = rec.password;
    u.products = u.products.filter(p => p.sessionId !== rec.sessionId);
    u.products.push({
        sessionId: rec.sessionId,
        bot: rec.type === 'mentor-monthly' ? 'mentor-monthly' : rec.type === 'mentor-lifetime' ? 'mentor-lifetime' : rec.type,
        botName: rec.productName,
        licenceKey: rec.licenceKey,
        date: new Date().toISOString()
    });
    db.write('users.json', users);
}

// ---------- CORS for browser API calls ----------
app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ---------- Webhook ----------
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('[webhook] signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
                expand: ['line_items', 'invoice', 'payment_intent.latest_charge']
            });

            const email = session.customer_details?.email;
            const billingName = session.customer_details?.name || '';
            if (!email) { console.error('[webhook] no customer email on session'); return res.json({ received: true }); }

            const line = session.line_items?.data?.[0];
            const priceId = line?.price?.id || '';
            const unit = line?.price?.unit_amount ?? session.amount_total ?? 0;
            const currency = (line?.price?.currency || session.currency || 'gbp').toUpperCase();
            const amountFormatted = `${currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency + ' '}${(unit / 100).toFixed(2)}`;

            const map = priceMap()[priceId] || {};
            const type = map.key || 'scalping';
            const productName = map.name || line?.description || 'IMPERA Product';
            const isMentorship = map.type === 'mentorship';

            const rec = provision({ sessionId: session.id, type, productName, priceId, amountFormatted });
            rec.customerName = billingName;
            rec.amountValue = unit / 100;
            rec.customerEmail = email;
            // First session is chosen by the client on the confirmation screen
            // (every day + every hour available). No server-side auto-scheduling.

            const now = new Date();
            const commonVars = {
                customer_name: billingName.split(' ')[0] || 'there',
                order_number: '#' + session.id.slice(-8).toUpperCase(),
                date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
                      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                dashboard_url: DASHBOARD_URL,
                login_email: email,
                temp_password: rec.password,
                telegram_url: TELEGRAM_URL,
                support_email: SUPPORT_EMAIL
            };

            let subject, html;

            if (isMentorship) {
                // ---- Mentorship purchase: welcome + instant slot-picking instructions ----
                const planName = /life/i.test(type) ? 'IMPERA Mentorship — Lifetime' : 'IMPERA Mentorship — Monthly';
                html = loadTemplate('mentorship-welcome.html', {
                    ...commonVars,
                    plan_name: planName,
                    amount: amountFormatted,
                    bot_name: planName,
                    __stripBotOnly: true
                });
                subject = `Welcome to IMPERA Mentorship — pick your first session`;
            } else {
                // ---- Bot purchase: licence + download email ----
                html = loadTemplate('order-approved.html', {
                    ...commonVars,
                    bot_name: productName,
                    amount: amountFormatted,
                    licence_key: rec.licenceKey || 'Included with your membership',
                    download_url: SITE_URL.replace(/\/$/, '') + '/assets/IMPERA_' +
                        (type === 'gold' ? 'Gold_Bot' : type === 'global' ? 'Global_Bot' : 'Scalping_Bot') + '.mq5',
                    receipt_url: session.payment_intent?.latest_charge?.receipt_url ||
                                 session.invoice?.hosted_invoice_url ||
                                 `https://dashboard.stripe.com/receipts/${session.id}`
                });
                subject = `IMPERA — Order Confirmed (${productName})`;
            }

            saveUser(rec, billingName, email);
            await sendHtml(email, subject, html);

            // ---- Owner alert: new sale ----
            notifyAdmin(
                `💰 New IMPERA sale — ${productName} ${amountFormatted}`,
                [
                    `<strong style="color:#C9A962;">${productName}</strong> — ${amountFormatted}`,
                    `Customer: <strong>${billingName || '—'}</strong> &lt;${email}&gt;`,
                    `Order: #${session.id.slice(-8).toUpperCase()} · ${isMentorship ? 'Mentorship' : 'Bot licence'}`
                ]
            );

            rec.emailed = true;
            db.write('accounts.json', db.read('accounts.json'));
            return res.json({ received: true });
        }

        if (event.type === 'payment_intent.payment_failed') {
            const pi = event.data.object;
            const email =
                pi.charges?.data?.[0]?.billing_details?.email ||
                pi.metadata?.email || null;
            const reasonCode = pi.last_payment_error?.code || 'generic';
            const reasons = {
                insufficient_funds: 'Your bank declined the payment due to insufficient funds.',
                card_declined: 'Your card was declined by your bank.',
                expired_card: 'The card used has expired.',
                incorrect_cvc: 'The security code (CVC) entered was incorrect.',
                generic: 'The payment could not be processed.'
            };

            if (!email) return res.json({ received: true });

            const html = loadTemplate('order-declined.html', {
                customer_name: (pi.charges?.data?.[0]?.billing_details?.name || '').split(' ')[0] || 'there',
                bot_name: 'your IMPERA order',
                amount: pi.amount != null ? `£${(pi.amount / 100).toFixed(2)}` : '',
                order_number: '#' + pi.id.slice(-8).toUpperCase(),
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                decline_reason: reasons[reasonCode] || reasons.generic,
                retry_url: SITE_URL.replace(/\/$/, '') + '/index.html#store',
                support_email: SUPPORT_EMAIL,
                telegram_url: TELEGRAM_URL
            });

            await sendHtml(email, 'IMPERA — Action needed regarding your order', html);
            notifyAdmin(
                `⚠️ Failed payment — ${email}`,
                [
                    `A payment attempt failed for <strong>${email}</strong>`,
                    `Reason: ${reasons[reasonCode] || reasons.generic} · Amount: £${((pi.amount || 0) / 100).toFixed(2)}`
                ]
            );
            return res.json({ received: true });
        }

        res.json({ received: true });
    } catch (err) {
        console.error('[webhook] handler error:', err);
        res.status(500).send('Handler error');
    }
});

// ---------- Visitor tracking (called from every public page) ----------
// ---------- Create Checkout Session (server-side) ----------
function siteOrigin(req) {
    const o = req.get && req.get('origin');
    if (o && /^https?:\/\//i.test(o)) return o.replace(/\/+$/, '');
    const envUrl = (process.env.SITE_URL || '').trim();
    if (/^https?:\/\//i.test(envUrl) && !/your-site\.com|example\.com|localhost/i.test(envUrl)) return envUrl.replace(/\/+$/, '');
    return 'https://impera1.onrender.com';
}

app.post('/api/create-checkout-session', express.json(), async (req, res) => {
    try {
        const { priceId, email } = req.body || {};
        const map = priceMap();
        const info = priceId && map[priceId];
        if (!info) return res.status(400).json({ error: 'Unknown or missing price. Please contact support.' });
        const origin = siteOrigin(req);
        const session = await stripe.checkout.sessions.create({
            mode: info.key === 'mentor-monthly' ? 'subscription' : 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: email || undefined,
            success_url: origin + '/success.html?session_id={CHECKOUT_SESSION_ID}&bot=' + encodeURIComponent(info.key || '') + '&email=' + encodeURIComponent(email || ''),
            cancel_url: origin + '/checkout.html?bot=' + encodeURIComponent(info.key || 'scalping') + '&cancelled=1',
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('[checkout] create session failed:', err.message);
        res.status(500).json({ error: 'Could not start checkout. Please try again.' });
    }
});

app.post('/api/track', express.json(), (req, res) => {    res.set('Access-Control-Allow-Origin', '*');
    const { v, p, r } = req.body || {};
    if (!v) return res.status(400).json({ error: 'missing visitor id' });
    const visits = db.read('visits.json');
    visits.push({
        v: String(v).slice(0, 40),
        p: String(p || '/').slice(0, 120),
        r: r ? String(r).slice(0, 200) : '',
        ts: Date.now()
    });
    db.write('visits.json', visits.slice(-8000)); // cap file size
    res.json({ ok: true });
});

// ---------- Bookings (synced from client dashboards) ----------
app.post('/api/bookings', express.json(), (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const b = req.body || {};
    if (!b.id || !b.userEmail || !b.date || !b.time) return res.status(400).json({ error: 'invalid booking' });
    const bookings = db.read('bookings.json');
    if (!bookings.find(x => x.id === b.id)) {
        bookings.push({
            id: b.id, userEmail: b.userEmail, userName: b.userName || '', date: b.date,
            time: b.time, type: b.type || '1:1 Mentorship Call',
            status: b.status || 'pending', zoom: b.zoom || '', createdAt: b.createdAt || new Date().toISOString()
        });
        db.write('bookings.json', bookings);
        // ---- Owner alert: new booking ----
        const nice = new Date(b.date + 'T00:00:00');
        notifyAdmin(
            `📅 New booking — ${b.userName || b.userEmail} — ${nice.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${b.time}`,
            [
                `<strong style="color:#C9A962;">${b.userName || 'Client'}</strong> booked <strong>${b.type}</strong>`,
                `${nice.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at <strong>${b.time}</strong>`,
                `Contact: &lt;${b.userEmail}&gt;`
            ]
        );
    }
    res.json({ ok: true });
});

app.patch('/api/bookings/:id', express.json(), (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const bookings = db.read('bookings.json');
    const b = bookings.find(x => x.id === req.params.id);
    if (!b) return res.status(404).json({ error: 'not found' });
    const allowed = ['status', 'zoom'];
    Object.keys(req.body || {}).forEach(k => { if (allowed.includes(k)) b[k] = req.body[k]; });
    db.write('bookings.json', bookings);
    res.json({ ok: true });
});

// ---------- Admin overview (Shopify-style analytics) ----------
function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }

function buildOverview() {
    const accounts = db.read('accounts.json');
    const users = db.read('users.json').filter(u => u.role !== 'admin');
    const bookings = db.read('bookings.json');
    const visits = db.read('visits.json');

    const now = Date.now();
    const orders = accounts
        .filter(a => a.amountValue != null || a.emailed)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const revenue = orders.reduce((s, a) => s + (a.amountValue || 0), 0);
    const members = orders.filter(a => /mentor/i.test(a.type)).length;

    // 14-day series
    const daily = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
        daily.push({
            date: d,
            revenue: +orders.filter(o => dayKey(new Date(o.createdAt).getTime()) === d)
                            .reduce((s, o) => s + (o.amountValue || 0), 0).toFixed(2),
            orders: orders.filter(o => dayKey(new Date(o.createdAt).getTime()) === d).length,
            visits: visits.filter(v => dayKey(v.ts) === d).length,
            visitors: new Set(visits.filter(v => dayKey(v.ts) === d).map(v => v.v)).size
        });
    }

    const todayKey = dayKey(now);
    const todaysVisits = visits.filter(v => dayKey(v.ts) === todayKey);
    const uniqueToday = new Set(todaysVisits.map(v => v.v)).size;
    const liveVisitors = new Set(visits.filter(v => now - v.ts < 15 * 60000).map(v => v.v)).size;
    const allUnique = new Set(visits.map(v => v.v)).size;

    const pageCount = {};
    visits.forEach(v => { pageCount[v.p] = (pageCount[v.p] || 0) + 1; });
    const pages = Object.entries(pageCount).map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views).slice(0, 8);

    let selfHost = '';
    try { selfHost = new URL(SITE_URL).host; } catch {}
    const refCount = {};
    visits.forEach(v => {
        if (!v.r) return;
        try { if (new URL(v.r).host === selfHost) return; } catch {}
        refCount[v.r] = (refCount[v.r] || 0) + 1;
    });
    const referrers = Object.entries(refCount).map(([ref, count]) => ({ ref, count }))
        .sort((a, b) => b.count - a.count).slice(0, 8);

    const recentOrders = orders.slice(0, 10).map(o => ({
        type: 'order', ts: o.createdAt,
        label: `${o.productName} — ${o.customerEmail || ''}`,
        sub: `£${(o.amountValue || 0).toFixed(2)} · ${(o.status || '')}`
    }));
    const recentBookings = [...bookings].reverse().slice(0, 6).map(b => ({
        type: 'booking', ts: b.createdAt,
        label: `${b.userName} booked ${b.date} ${b.time}`,
        sub: b.status
    }));

    return {
        generatedAt: new Date().toISOString(),
        totals: {
            revenue: +revenue.toFixed(2),
            orders: orders.length,
            members,
            clients: users.length,
            visitorsToday: uniqueToday,
            pageviewsToday: todaysVisits.length,
            liveVisitors,
            conversion: allUnique ? +(orders.length / allUnique * 100).toFixed(2) : 0
        },
        daily,
        orders: orders.slice(0, 60),
        bookings,
        clients: users.map(u => ({
            email: u.email, name: u.name, createdAt: u.createdAt,
            products: (u.products || []).map(p => p.botName || p.bot)
        })),
        pages,
        referrers,
        recent: [...recentOrders, ...recentBookings]
            .sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 14)
    };
}

app.get('/api/admin/overview', (req, res) => {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    res.json(buildOverview());
});

// ---------- Account lookup for success page ----------
app.get('/api/account/:sessionId', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const rec = db.read('accounts.json').find(a => a.sessionId === req.params.sessionId);
    if (!rec) return res.status(404).json({ error: 'not found' });
    res.json({
        sessionId: rec.sessionId,
        bot: rec.type,
        product: rec.productName,
        amount: rec.amountFormatted,
        password: rec.password,
        licenceKey: rec.licenceKey,
        name: rec.customerName || '',
        nextSession: rec.nextSession || null
    });
});

// ---------- Meeting reminder (admin-triggered) ----------
// POST /api/remind  { sessionId }   Header: x-admin-token: <ADMIN_TOKEN>
app.post('/api/remind', express.json(), async (req, res) => {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    const rec = db.read('accounts.json').find(a => a.sessionId === req.body.sessionId);
    const users = db.read('users.json');
    const user = users.find(u => u.products?.some(p => p.sessionId === req.body.sessionId));
    if (!rec || !user || !rec.nextSession) return res.status(404).json({ error: 'booking not found' });

    const html = reminderHtml({
        customer_name: (user.name || 'there').split(' ')[0],
        session_date: rec.nextSession.date,
        session_time: rec.nextSession.time
    });
    await sendHtml(user.email, `IMPERA Mentorship — Session Reminder · ${rec.nextSession.date}`, html);
    res.json({ ok: true });
});

function reminderHtml(v) {
    const inner =
`<p style="color:#ccc;font-size:15px;line-height:26px;">Hi ${v.customer_name},</p>
<p style="color:#ccc;font-size:15px;line-height:26px;">This is a friendly reminder about your upcoming 1:1 mentorship session on <strong style="color:#fff">Zoom</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(201,169,98,.08);border:1px solid rgba(201,169,98,.45);border-radius:12px;margin:24px 0;"><tr><td style="padding:22px;">
<p style="margin:4px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date</p>
<p style="margin:0 0 14px;color:#fff;font-size:17px;font-weight:bold;">${v.session_date}</p>
<p style="margin:4px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Time</p>
<p style="margin:0;color:#C9A962;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;">${v.session_time}</p>
</td></tr></table>
<p style="color:#999;font-size:13px;line-height:22px;">Tip: have your charts, trades and questions ready so we make the most of the session.</p>`;

    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#050505;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" bgcolor="#050505" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0b0d10;border:1px solid rgba(201,169,98,.35);border-radius:16px;">
<tr><td style="padding:44px;text-align:center;">
<div style="font-size:30px;color:#C9A962;">&#9819;</div>
<h1 style="letter-spacing:6px;font-size:22px;color:#fff;margin:10px 0 4px;">IMPERA</h1>
<p style="color:#C9A962;font-size:11px;letter-spacing:3px;margin:0 0 28px;">MENTORSHIP SESSION REMINDER</p>
${inner}
<p style="color:#888;font-size:12px;margin-top:34px;">IMPERA &middot; AI-Powered Trading</p>
</td></tr></table></td></tr></table></body></html>`;
}

app.get('/', (_q, s) => {
    s.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>IMPERA Server</title></head>
<body style="background:#050505;color:#e8e8e8;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<div style="text-align:center;border:1px solid rgba(201,169,98,.35);border-radius:18px;padding:56px 64px;background:#0b0d10">
<div style="font-size:44px;color:#C9A962">&#9819;</div>
<h1 style="letter-spacing:8px;font-size:26px;margin:14px 0 6px">IMPERA</h1>
<p style="color:#C9A962;letter-spacing:4px;font-size:11px;margin:0 0 22px">SERVER OPERATIONAL</p>
<p style="color:#888;font-size:13px;margin:0">This is the backend for impera.com.<br>Webhooks, emails and analytics are live.</p>
</div></body></html>`);
});

app.get('/health', (_q, s) => s.send('ok'));

app.listen(PORT, () => console.log(`IMPERA webhook server listening on http://localhost:${PORT}`));
