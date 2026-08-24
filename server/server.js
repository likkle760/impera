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
const _rawSite = (process.env.SITE_URL || '').trim();
const SITE_URL = /^https?:\/\//i.test(_rawSite) && !/your-site\.com|example\.com|localhost/i.test(_rawSite)
    ? _rawSite.replace(/\/+$/, '')
    : 'https://impera1.onrender.com';
const DASHBOARD_URL = SITE_URL + '/dashboard.html';
const TELEGRAM_URL = process.env.TELEGRAM_URL || 'https://t.me/+PwykI4dxBOEzMGFk';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@impera.com';

// Map Stripe Price IDs -> product info.
// Built-in defaults below; optionally override/extend via PRICE_MAP env (JSON).
const DEFAULT_PRICE_MAP = {
    'price_1U7cTzRiTJNYtmMnrJ9pfDWl': { key: 'scalping', name: 'IMPERA Scalping Bot', type: 'bot', amount: 49 },
    'price_1U7cTIRiTJNYtmMnOxHBGfmn': { key: 'gold', name: 'IMPERA Gold Bot', type: 'bot', amount: 125 },
    'price_1U7cSQRiTJNYtmMnzPNcyDRf': { key: 'global', name: 'IMPERA Global Bot', type: 'bot', amount: 245 },
    'price_1U7ccARiTJNYtmMnbYF6Rlqx': { key: 'mentor-monthly', name: 'IMPERA Mentorship — Monthly', type: 'mentorship', recurring: true, amount: 50 },
    'price_1U7cPJRiTJNYtmMnX13LOQKm': { key: 'mentor-lifetime', name: 'IMPERA Mentorship — Lifetime', type: 'mentorship', amount: 175 },
    'price_1U7dbxRiTJNYtmMnONXnmiVk': { key: 'impera-bot', name: 'IMPERA Bot', type: 'bot', amount: 0 },
    'price_1U7dcLRiTJNYtmMnqPYwKCA5': { key: 'basic-membership', name: 'IMPERA Basic Membership', type: 'mentorship', recurring: true, amount: 0 }
};

// SumUp catalog (key -> product) — one-time card payments via Hosted Checkout.
// Subscriptions (mentor-monthly / basic-membership) are not offered through SumUp.
const SUMUP_CATALOG = {
    scalping:       { name: 'IMPERA Scalping Bot',        type: 'bot', amount: 49 },
    gold:           { name: 'IMPERA Gold Bot',            type: 'bot', amount: 125 },
    global:         { name: 'IMPERA Global Bot',          type: 'bot', amount: 245 },
    'impera-bot':   { name: 'IMPERA Bot',                 type: 'bot', amount: 0 },
    ebook:          { name: 'IMPERA Beginners Trading eBook', type: 'ebook', amount: 50 },
    'mentor-lifetime': { name: 'IMPERA Mentorship — Lifetime', type: 'mentorship', amount: 175 },
    test:           { name: 'IMPERA Bot — Test',          type: 'bot', amount: 1 }
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
const smtpPort = Number(process.env.SMTP_PORT || 465);
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

const smtpConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const apiMailConfigured = () => !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY);

// HTTP email APIs (work on Render free tier, which blocks SMTP ports)
async function sendViaApi({ to, subject, html }) {
    if (typeof fetch !== 'function') throw new Error('fetch unavailable');
    if (process.env.BREVO_API_KEY) {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
                sender: { name: 'IMPERA', email: process.env.SMTP_USER || 'imperafrx@gmail.com' },
                to: [{ email: to }],
                subject,
                htmlContent: html
            })
        });
        if (!r.ok) throw new Error('Brevo error ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 140));
        return;
    }
    if (process.env.RESEND_API_KEY) {
        const from = process.env.MAIL_FROM || 'IMPERA <onboarding@resend.dev>';
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], subject, html })
        });
        if (!r.ok) {
            const body = await r.text().catch(() => '');
            throw new Error('Email API error ' + r.status + ': ' + body.slice(0, 140));
        }
        return;
    }
    throw new Error('No email API key configured');
}

// Send using a template designed in the Resend dashboard (must be PUBLISHED there)
async function sendResendTemplate({ to, templateId, subject, variables }) {
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: process.env.MAIL_FROM || 'IMPERA <onboarding@resend.dev>',
            to: [to],
            subject,
            template: { id: templateId, variables: variables || {} }
        })
    });
    if (!r.ok) throw new Error('Resend template error ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 140));
}

async function sendHtml(to, subject, html) {
    if (apiMailConfigured()) return sendViaApi({ to, subject, html });
    if (!smtpConfigured()) {
        console.log('[mail] SKIPPED "' + subject + '" -> ' + to + ' (no email API key and SMTP_USER/SMTP_PASS not set)');
        throw new Error('Email not configured');
    }
    await transporter.sendMail({
        from: process.env.MAIL_FROM || 'IMPERA <support@impera.com>',
        to, subject, html
    });
    console.log(`[mail] sent "${subject}" -> ${to}`);
}

// Internal alert -> owner inbox (ADMIN_NOTIFY_EMAIL). Never blocks the main flow.
async function notifyAdmin(subject, lines) {
    const to = process.env.ADMIN_NOTIFY_EMAIL;
    if (!to || (!apiMailConfigured() && !smtpConfigured())) {
        console.log('[mail] admin alert SKIPPED "' + subject + '" (no ADMIN_NOTIFY_EMAIL / RESEND_API_KEY / SMTP)');
        return;
    }
    try {
        if (apiMailConfigured()) {
            await sendViaApi({ to, subject, html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px;">
                <table role="presentation" width="100%" bgcolor="#050505" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0b0d10;border:1px solid rgba(201,169,98,.35);border-radius:14px;">
                <tr><td style="padding:34px;text-align:center;">
                <div style="font-size:26px;color:#C9A962;">&#9819;</div>
                <h2 style="letter-spacing:5px;font-size:17px;color:#fff;margin:10px 0 20px;">IMPERA ADMIN ALERT</h2>
                ${lines.map(l => `<p style="color:#ddd;font-size:14px;margin:6px 0;">${l}</p>`).join('')}
                </td></tr></table></td></tr></table></div>` });
            return;
        }
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
    const isMentorship = map.type === 'mentorship' || /mentor|membership/i.test(type);
    const password = genPassword();
    const licenceKey = isMentorship ? null : genLicence();
    const tier = isMentorship ? null : (TIER_BY_KEY[type] || null);

    const accounts = db.read('accounts.json');
    let rec = accounts.find(a => a.sessionId === sessionId);
    if (!rec) {
        rec = { sessionId, createdAt: new Date().toISOString(), emailed: false };
        accounts.push(rec);
    }
    Object.assign(rec, { type, productName, priceId, amountFormatted, password, licenceKey, tier });
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
function hookLog(entry) {
    try {
        const log = db.read('webhooklog.json');
        log.push(Object.assign({ ts: new Date().toISOString() }, entry));
        db.write('webhooklog.json', log.slice(-30));
    } catch { /* ignore */ }
}

// ---------- Shared order fulfilment (Stripe webhook + SumUp both use this) ----------
async function deliverProduct({ sessionId, type, productName, priceId, amountFormatted, amountValue, customerName, email, receiptUrl }) {
    const map = priceMap()[priceId] || {};
    const isMentorship = map.type === 'mentorship' || /mentor|membership/i.test(type);
    const isEbook = map.type === 'ebook' || /ebook/i.test(type);

    const rec = provision({ sessionId, type, productName, priceId, amountFormatted });
    rec.customerName = customerName || '';
    rec.amountValue = amountValue != null ? amountValue : null;
    rec.customerEmail = email;
    // The eBook is delivered as a download link — no bot licence involved
    if (isEbook) rec.licenceKey = null;
    // Licence keys are locked to the buying account from the moment of purchase
    if (rec.licenceKey) {
        rec.activatedBy = String(email).toLowerCase();
        rec.activatedAt = new Date().toISOString();
    }

    const now = new Date();
    const commonVars = {
        customer_name: (customerName || 'there').split(' ')[0],
        order_number: '#' + sessionId.slice(-8).toUpperCase(),
        date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
              now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        dashboard_url: DASHBOARD_URL,
        login_email: email,
        temp_password: rec.password,
        telegram_url: TELEGRAM_URL,
        support_email: SUPPORT_EMAIL
    };

    let subject, html = null;
    let tplId = null, tplVars = null;

    if (process.env.RESEND_API_KEY && (isMentorship ? process.env.RESEND_TPL_MENTORSHIP : process.env.RESEND_TPL_ORDER)) {
        // ---- Use the merchant's own template designed in the Resend dashboard ----
        tplId = isMentorship ? process.env.RESEND_TPL_MENTORSHIP : process.env.RESEND_TPL_ORDER;
        tplVars = {
            CUSTOMER_NAME: commonVars.customer_name,
            ORDER_NUMBER: commonVars.order_number,
            DATE: commonVars.date,
            PRODUCT_NAME: productName,
            AMOUNT: amountFormatted,
            LICENCE_KEY: rec.licenceKey || '',
            TEMP_PASSWORD: rec.password || '',
            LOGIN_EMAIL: email,
            DASHBOARD_URL: DASHBOARD_URL,
            DOWNLOAD_URL: isEbook ? SITE_URL.replace(/\/$/, '') + '/ebook.html' :
                SITE_URL.replace(/\/$/, '') + '/assets/IMPERA_' +
                (/gold/i.test(type) ? 'Gold_Bot' : /global/i.test(type) ? 'Global_Bot' : 'Scalping_Bot') + '.mq5',
            SUPPORT_EMAIL: SUPPORT_EMAIL,
            TELEGRAM_URL: TELEGRAM_URL,
            PLAN_NAME: /life/i.test(type) ? 'Lifetime' : (/basic|membership/i.test(type) ? 'Basic Membership' : 'Monthly')
        };
        subject = isMentorship ? 'Welcome to IMPERA Mentorship — pick your first session'
                               : `IMPERA — Order Confirmed (${productName})`;
    } else if (isMentorship) {
        const planName = /life/i.test(type) ? 'IMPERA Mentorship — Lifetime'
            : /basic|membership/i.test(type) ? (productName || 'IMPERA Basic Membership')
            : 'IMPERA Mentorship — Monthly';
        const tpl = /life/i.test(type) ? 'mentorship-lifetime.html'
            : /basic|membership/i.test(type) ? 'mentorship-monthly.html'
            : 'mentorship-monthly.html';
        html = loadTemplate(tpl, {
            ...commonVars,
            product_name: planName,
            plan_name: planName,
            bot_name: planName,
            amount: amountFormatted,
            licence_key: '',
            download_url: '',
            receipt_url: receiptUrl || `https://dashboard.impera.app/receipts/${sessionId}`
        });
        subject = `Welcome to IMPERA Mentorship — pick your first session`;
    } else if (isEbook) {
        html = loadTemplate('order-ebook.html', {
            ...commonVars,
            product_name: productName,
            bot_name: productName,
            amount: amountFormatted,
            licence_key: '',
            download_url: SITE_URL.replace(/\/$/, '') + '/ebook.html',
            receipt_url: receiptUrl || `https://dashboard.impera.app/receipts/${sessionId}`
        });
        subject = 'IMPERA — Your eBook Is Ready';
    } else {
        const tpl = /gold/i.test(type) ? 'order-gold.html'
            : /global/i.test(type) ? 'order-global.html'
            : 'order-scalping.html';
        html = loadTemplate(tpl, {
            ...commonVars,
            product_name: productName,
            bot_name: productName,
            amount: amountFormatted,
            licence_key: rec.licenceKey || 'Included with your membership',
            download_url: SITE_URL.replace(/\/$/, '') + '/assets/IMPERA_' +
                (/gold/i.test(type) ? 'Gold_Bot' : /global/i.test(type) ? 'Global_Bot' : 'Scalping_Bot') + '.mq5',
            receipt_url: receiptUrl || `https://dashboard.impera.app/receipts/${sessionId}`
        });
        subject = `IMPERA — Order Confirmed (${productName})`;
    }

    saveUser(rec, customerName, email);
    rec.emailed = false;

    // ---- Customer email: never let mail problems break order processing ----
    try {
        if (tplId) await sendResendTemplate({ to: email, templateId: tplId, subject, variables: tplVars });
        else await sendHtml(email, subject, html);
        rec.emailed = true;
    } catch (mailErr) {
        console.error('[fulfil] customer email failed:', mailErr.message);
    }

    // ---- Owner alert: new sale ----
    notifyAdmin(
        `💰 New IMPERA sale — ${productName} ${amountFormatted}`,
        [
            `<strong style="color:#C9A962;">${productName}</strong> — ${amountFormatted}`,
            `Customer: <strong>${customerName || '—'}</strong> &lt;${email}&gt;`,
            `Order: #${sessionId.slice(-8).toUpperCase()} · ${isEbook ? 'eBook' : isMentorship ? 'Mentorship' : 'Bot licence'}`
        ]
    );

    rec.emailed = rec.emailed === true;
    const accs = db.read('accounts.json');
    const ai = accs.findIndex(a => a.sessionId === sessionId);
    if (ai >= 0) {
        accs[ai].customerName = customerName || '';
        accs[ai].customerEmail = email;
        accs[ai].amountValue = amountValue != null ? amountValue : null;
        accs[ai].amountFormatted = amountFormatted;
        accs[ai].emailed = rec.emailed;
    }
    db.write('accounts.json', accs);
    return rec;
}

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        hookLog({ step: 'signature-failed', msg: err.message });
        console.error('[webhook] signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    hookLog({ step: 'received', type: event.type, id: event.data?.object?.id });

    try {
        if (event.type === 'checkout.session.completed') {
            const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
                expand: ['line_items', 'invoice', 'payment_intent.latest_charge']
            });

            const email = session.customer_details?.email || session.customer_email || null;
            const billingName = session.customer_details?.name || '';
            if (!email) {
                hookLog({ step: 'no-email', id: session.id, customer_details: !!session.customer_details, customer_email: session.customer_email || null });
                console.error('[webhook] no customer email on session');
                return res.json({ received: true });
            }

            const line = session.line_items?.data?.[0];
            const priceId = line?.price?.id || '';
            const unit = line?.price?.unit_amount ?? session.amount_total ?? 0;
            const currency = (line?.price?.currency || session.currency || 'gbp').toUpperCase();
            const amountFormatted = `${currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency + ' '}${(unit / 100).toFixed(2)}`;

            const map = priceMap()[priceId] || {};
            const type = map.key || 'scalping';
            const productName = map.name || line?.description || 'IMPERA Product';

            // First session is chosen by the client on the confirmation screen
            // (every day + every hour available). No server-side auto-scheduling.
            await deliverProduct({
                sessionId: session.id,
                type,
                productName,
                priceId,
                amountFormatted,
                amountValue: unit / 100,
                customerName: billingName,
                email,
                receiptUrl: session.payment_intent?.latest_charge?.receipt_url ||
                            session.invoice?.hosted_invoice_url ||
                            `https://dashboard.stripe.com/receipts/${session.id}`
            });
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

            const declineVars = {
                CUSTOMER_NAME: (pi.charges?.data?.[0]?.billing_details?.name || '').split(' ')[0] || 'there',
                ORDER_NUMBER: '#' + pi.id.slice(-8).toUpperCase(),
                DATE: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                AMOUNT: pi.amount != null ? `£${(pi.amount / 100).toFixed(2)}` : '',
                DECLINE_REASON: reasons[reasonCode] || reasons.generic,
                RETRY_URL: SITE_URL.replace(/\/$/, '') + '/index.html#store',
                SUPPORT_EMAIL: SUPPORT_EMAIL,
                TELEGRAM_URL: TELEGRAM_URL
            };

            try {
                if (process.env.RESEND_API_KEY && process.env.RESEND_TPL_DECLINED) {
                    await sendResendTemplate({ to: email, templateId: process.env.RESEND_TPL_DECLINED, subject: 'IMPERA — Action needed regarding your order', variables: declineVars });
                } else {
                    await sendHtml(email, 'IMPERA — Action needed regarding your order', loadTemplate('order-declined.html', {
                        customer_name: declineVars.CUSTOMER_NAME,
                        bot_name: 'your IMPERA order',
                        amount: declineVars.AMOUNT,
                        order_number: declineVars.ORDER_NUMBER,
                        date: declineVars.DATE,
                        decline_reason: declineVars.DECLINE_REASON,
                        retry_url: declineVars.RETRY_URL,
                        support_email: SUPPORT_EMAIL,
                        telegram_url: TELEGRAM_URL
                    }));
                }
            } catch (mailErr) {
                console.error('[webhook] declined email failed:', mailErr.message);
            }
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
        hookLog({ step: 'handler-error', type: event.type, id: event.data?.object?.id, msg: err.message });
        console.error('[webhook] handler error:', err);
        res.status(500).send('Handler error');
    }
});

// Webhook diagnostics (admin only)
app.get('/api/admin/webhooklog', (req, res) => {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    res.json({ log: db.read('webhooklog.json').slice(-30), accounts: db.read('accounts.json').length, users: db.read('users.json').length });
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
            mode: (info.recurring || info.key === 'mentor-monthly') ? 'subscription' : 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: email || undefined,
            success_url: origin + '/success.html?session_id={CHECKOUT_SESSION_ID}&bot=' + encodeURIComponent(info.key || '') + '&email=' + encodeURIComponent(email || ''),
            cancel_url: origin + '/checkout.html?bot=' + encodeURIComponent(info.key || 'scalping') + '&cancelled=1',
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('[checkout] create session failed:', err.message);
        try {
            const log = db.read('checkoutlog.json');
            log.push({ ts: new Date().toISOString(), msg: err.message, code: err.code || err.type || '', priceId: (req.body || {}).priceId });
            db.write('checkoutlog.json', log.slice(-20));
        } catch (e2) {}
        res.status(500).json({ error: 'Could not start checkout. Please try again.', detail: err.message });
    }
});

// ---------- SumUp Hosted Checkout ----------
const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase();
const sumupOk = () => !!process.env.SUMUP_API_KEY;
let _merchantCodeCache = null;
async function sumupMerchantCode() {
    if (_merchantCodeCache) return _merchantCodeCache;
    if (process.env.SUMUP_MERCHANT_CODE) { _merchantCodeCache = process.env.SUMUP_MERCHANT_CODE; return _merchantCodeCache; }
    const r = await fetch('https://api.sumup.com/v0.1/me', { headers: { Authorization: 'Bearer ' + process.env.SUMUP_API_KEY } });
    if (!r.ok) throw new Error('Cannot read SumUp merchant profile (HTTP ' + r.status + ')');
    const me = await r.json();
    _merchantCodeCache = (me.merchant_profile && me.merchant_profile.merchant_code) || me.merchant_code || null;
    if (!_merchantCodeCache) throw new Error('No merchant_code found on SumUp profile');
    return _merchantCodeCache;
}

app.get('/api/config-old', (req, res) => { res.json({ provider: PAYMENT_PROVIDER }); });

// ---------- PayPal Checkout (Orders v2) ----------
const PAYPAL_BASE = (process.env.PAYPAL_ENV === 'sandbox') ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
let _ppTokenCache = null;
async function paypalToken() {
    if (_ppTokenCache && _ppTokenCache.exp > Date.now() + 60000) return _ppTokenCache.t;
    const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64');
    const r = await fetch(PAYPAL_BASE + '/v1/oauth2/token', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    });
    if (!r.ok) throw new Error('PayPal authentication failed (HTTP ' + r.status + ')');
    const d = await r.json();
    _ppTokenCache = { t: d.access_token, exp: Date.now() + ((d.expires_in || 300) - 60) * 1000 };
    return _ppTokenCache.t;
}

app.get('/api/config', (req, res) => {
    const provider = PAYMENT_PROVIDER;
    let ready;
    if (provider === 'sumup') ready = sumupOk();
    else if (provider === 'paypal') ready = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    // Products that cannot be sold through direct (non-Stripe) providers:
    // subscriptions + anything priced £0 (below processor minimums)
    const unavailable = ['mentor-monthly', 'basic-membership'];
    Object.keys(SUMUP_CATALOG).forEach(k => {
        if (SUMUP_CATALOG[k].recurring || !(SUMUP_CATALOG[k].amount > 0)) unavailable.push(k);
    });
    res.json({
        provider,
        ready: ready !== undefined ? ready : undefined,
        sumupReady: provider === 'sumup' ? sumupOk() : undefined,
        unavailableOnSumup: unavailable,
        unavailableOnProvider: unavailable
    });
});

app.post('/api/create-paypal-order', express.json(), async (req, res) => {
    try {
        if (!(PAYMENT_PROVIDER === 'paypal')) return res.status(400).json({ error: 'PayPal is not the active payment provider.' });
        const { key, email } = req.body || {};
        const info = SUMUP_CATALOG[key];
        if (!info) return res.status(400).json({ error: 'Unknown product.' });
        if (!(info.amount > 0)) return res.status(400).json({ error: 'This product cannot be purchased right now.' });
        if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });

        const t = await paypalToken();
        const origin = siteOrigin(req);
        const r = await fetch(PAYPAL_BASE + '/v2/checkout/orders', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: info.name,
                    custom_id: key + '|' + email,
                    amount: { currency_code: 'GBP', value: Number(info.amount).toFixed(2) }
                }],
                application_context: {
                    brand_name: 'IMPERA',
                    locale: 'en-GB',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                    return_url: origin + '/success.html?paypal_return=1&bot=' + encodeURIComponent(key) + '&email=' + encodeURIComponent(email),
                    cancel_url: origin + '/checkout.html?bot=' + encodeURIComponent(key) + '&cancelled=1'
                }
            })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((d.details && d.details[0] && d.details[0].description) || d.message || ('HTTP ' + r.status));
        const approve = (d.links || []).find(l => l.rel === 'approve');
        if (!approve) throw new Error('No approval link returned');

        const orders = db.read('paypalorders.json');
        orders.push({ id: d.id, key, email, name: info.name, type: info.type, amount: info.amount, status: 'created', createdAt: new Date().toISOString() });
        db.write('paypalorders.json', orders);
        res.json({ url: approve.href });
    } catch (err) {
        console.error('[paypal] create failed:', err.message);
        res.status(500).json({ error: 'Could not start checkout. Please try again.', detail: err.message });
    }
});

app.post('/api/paypal/capture/:orderId', express.json(), async (req, res) => {
    try {
        if (!process.env.PAYPAL_CLIENT_ID) return res.status(500).json({ error: 'PayPal is not configured.' });
        const oid = String(req.params.orderId || '');
        const orders = db.read('paypalorders.json');
        const o = orders.find(x => x.id === oid);
        if (!o) return res.status(404).json({ error: 'Order not found.' });

        if (o.status === 'paid') {
            const p = acctPayload(o.sessionId);
            if (p) return res.json(p);
        }

        const t = await paypalToken();
        let status = null;
        const g = await fetch(PAYPAL_BASE + '/v2/checkout/orders/' + encodeURIComponent(oid), { headers: { Authorization: 'Bearer ' + t } });
        if (g.ok) { const gj = await g.json().catch(() => ({})); status = gj.status || null; }

        if (status !== 'COMPLETED') {
            const r = await fetch(PAYPAL_BASE + '/v2/checkout/orders/' + encodeURIComponent(oid) + '/capture', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                const msg = (d.details && d.details[0] && d.details[0].description) || d.message || ('HTTP ' + r.status);
                if (!/ORDER_ALREADY_CAPTURED/i.test(msg)) {
                    return res.json({ pending: status === 'APPROVED' || status === 'CREATED', status: status, detail: msg });
                }
            }
            status = 'COMPLETED';
        }

        o.status = 'paid';
        o.sessionId = o.sessionId || ('pp_' + oid);
        o.paidAt = new Date().toISOString();
        db.write('paypalorders.json', orders);

        await deliverProduct({
            sessionId: o.sessionId,
            type: o.key,
            productName: o.name,
            priceId: 'paypal:' + o.key,
            amountFormatted: '£' + Number(o.amount).toFixed(2),
            amountValue: o.amount,
            customerName: '',
            email: o.email,
            receiptUrl: 'https://www.paypal.com/activity/payment/' + oid
        });
        const p = acctPayload(o.sessionId);
        if (!p) return res.status(500).json({ error: 'Fulfilment failed.' });
        res.json(p);
    } catch (err) {
        console.error('[paypal] capture failed:', err.message);
        res.status(500).json({ error: 'Verification failed.', detail: err.message });
    }
});

app.post('/api/create-sumup-checkout', express.json(), async (req, res) => {
    try {
        if (!sumupOk()) return res.status(500).json({ error: 'SumUp is not configured yet. Please contact support.' });
        const { key, email } = req.body || {};
        const info = SUMUP_CATALOG[key];
        if (!info) return res.status(400).json({ error: 'Unknown product.' });
        if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });

        const ref = 'imp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const orders = db.read('sumuporders.json');
        orders.push({ ref, key, email, name: info.name, type: info.type, amount: info.amount, status: 'pending', createdAt: new Date().toISOString() });
        db.write('sumuporders.json', orders);

        const mc = await sumupMerchantCode();
        const origin = siteOrigin(req);
        const r = await fetch('https://api.sumup.com/v0.1/checkouts', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + process.env.SUMUP_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: info.amount,
                currency: 'GBP',
                checkout_reference: ref,
                description: info.name + ' — ' + email,
                merchant_code: mc,
                redirect_url: origin + '/success.html?sumup_ref=' + encodeURIComponent(ref) +
                              '&bot=' + encodeURIComponent(key) + '&email=' + encodeURIComponent(email),
                hosted_checkout: { enabled: true }
            })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.hosted_checkout_url) {
            const msg = (data && (data.message || data.detail)) || ('HTTP ' + r.status);
            throw new Error(msg);
        }
        const orders2 = db.read('sumuporders.json');
        const o = orders2.find(x => x.ref === ref);
        if (o) { o.checkoutId = data.id; db.write('sumuporders.json', orders2); }
        res.json({ url: data.hosted_checkout_url });
    } catch (err) {
        console.error('[sumup] create failed:', err.message);
        res.status(500).json({ error: 'Could not start checkout. Please try again.', detail: err.message });
    }
});

// ---------- Dev/test order creation (no payment) ----------
app.post('/api/dev/order', express.json(), async (req, res) => {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const { key, email } = req.body || {};
        if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'valid email required' });
        const catalog = Object.assign({}, SUMUP_CATALOG, {
            'basic-membership': { name: 'IMPERA Basic Membership', type: 'mentorship', amount: 0 },
            'mentor-monthly': { name: 'IMPERA Mentorship — Monthly', type: 'mentorship', amount: 0 }
        });
        const info = catalog[key];
        if (!info) return res.status(400).json({ error: 'unknown key' });
        const sessionId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const rec = await deliverProduct({
            sessionId,
            type: key,
            productName: info.name,
            priceId: 'dev:' + key,
            amountFormatted: '£' + Number(info.amount).toFixed(2),
            amountValue: info.amount,
            customerName: String(req.body.name || '').trim(),
            email
        });
        res.json(acctPayload(rec.sessionId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function acctPayload(sessionId) {
    const rec = db.read('accounts.json').find(a => a.sessionId === sessionId);
    if (!rec) return null;
    return {
        sessionId: rec.sessionId,
        bot: rec.type,
        product: rec.productName,
        amount: rec.amountFormatted,
        password: rec.password,
        licenceKey: rec.licenceKey,
        name: rec.customerName || '',
        nextSession: rec.nextSession || null
    };
}

app.get('/api/sumup/verify/:ref', async (req, res) => {
    try {
        if (!sumupOk()) return res.status(500).json({ error: 'SumUp is not configured.' });
        const ref = String(req.params.ref || '');
        const orders = db.read('sumuporders.json');
        const order = orders.find(o => o.ref === ref);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        if (order.status === 'paid') {
            const p = acctPayload(order.sessionId);
            if (p) return res.json(p);
        }

        // Ask SumUp for the latest state of this checkout reference
        const q = await fetch('https://api.sumup.com/v0.1/checkouts?checkout_reference=' + encodeURIComponent(ref) + '&limit=1', {
            headers: { Authorization: 'Bearer ' + process.env.SUMUP_API_KEY }
        });
        if (!q.ok) return res.status(502).json({ pending: true });
        const list = await q.json().catch(() => []);
        const co = Array.isArray(list) && list[0];
        if (!co) return res.json({ pending: true });

        const paid = co.status === 'PAID' ||
            (Array.isArray(co.transactions) && co.transactions.some(t => t.status === 'SUCCESSFUL'));

        if (!paid) return res.json({ pending: co.status !== 'FAILED', status: co.status || null });

        // Paid! Fulfil exactly once.
        order.status = 'paid';
        order.checkoutId = order.checkoutId || co.id;
        order.sessionId = order.sessionId || ('sumup_' + co.id);
        order.paidAt = new Date().toISOString();
        db.write('sumuporders.json', orders);

        const tx = (co.transactions || []).find(t => t.status === 'SUCCESSFUL') || {};
        await deliverProduct({
            sessionId: order.sessionId,
            type: order.key,
            productName: order.name,
            priceId: 'sumup:' + order.key,
            amountFormatted: '£' + Number(order.amount).toFixed(2),
            amountValue: order.amount,
            customerName: tx.payer_email ? '' : order.email.split('@')[0],
            email: order.email,
            receiptUrl: tx.transaction_id ? ('https://me.sumup.com/transactions/' + tx.transaction_id) : null
        });
        const p = acctPayload(order.sessionId);
        if (!p) return res.status(500).json({ error: 'Fulfilment failed.' });
        res.json(p);
    } catch (err) {
        console.error('[sumup] verify failed:', err.message);
        res.status(500).json({ error: 'Verification failed.', detail: err.message });
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

// ---------- Admin login: exchange email + password for the admin token ----------
const adminFails = {};
app.post('/api/admin/login', express.json(), (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const f = adminFails[ip] || (adminFails[ip] = { n: 0, ts: 0 });
    if (f.n >= 8 && now - f.ts < 10 * 60000) {
        return res.status(429).json({ error: 'Too many attempts — try again in a few minutes.' });
    }

    const { email, password } = req.body || {};
    let ok = false;
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        ok = String(email || '').trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()
            && String(password) === process.env.ADMIN_PASSWORD;
    } else {
        // fallback: any admin account stored in users.json (base64 "impera:<password>")
        const u = db.read('users.json').find(u => u.role === 'admin' &&
            String(u.email || '').toLowerCase() === String(email || '').trim().toLowerCase());
        try {
            ok = !!(u && Buffer.from('impera:' + String(password)).toString('base64') === u.pass);
        } catch { ok = false; }
    }

    if (!ok) {
        f.n++; f.ts = now;
        return res.status(401).json({
            error: 'Invalid admin credentials.',
            configured: !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
        });
    }
    f.n = 0;
    if (!process.env.ADMIN_TOKEN) return res.status(500).json({ error: 'Server missing ADMIN_TOKEN env var.' });
    res.json({ ok: true, token: process.env.ADMIN_TOKEN });
});

// Diagnose email delivery: sends a test email to ADMIN_NOTIFY_EMAIL
app.get('/api/mailcheck', async (req, res) => {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    if (!apiMailConfigured() && !smtpConfigured()) return res.json({ ok: false, error: 'No email method configured. Add RESEND_API_KEY / BREVO_API_KEY (free tier) or SMTP vars (paid instance).' });
    if (!process.env.ADMIN_NOTIFY_EMAIL) return res.json({ ok: false, error: 'ADMIN_NOTIFY_EMAIL is not set.' });
    try {
        await sendHtml(process.env.ADMIN_NOTIFY_EMAIL, 'IMPERA — mail test',
            '<div style="font-family:Arial,sans-serif;padding:24px">If you receive this, order &amp; booking emails are working. 👑</div>');
        res.json({
            ok: true,
            via: process.env.BREVO_API_KEY ? 'brevo-api' : (process.env.RESEND_API_KEY ? 'resend-api' : 'smtp'),
            emailMode: {
                order: process.env.RESEND_TPL_ORDER ? 'RESEND DASHBOARD TEMPLATE ' + process.env.RESEND_TPL_ORDER : 'built-in per-product html',
                mentorship: process.env.RESEND_TPL_MENTORSHIP ? 'RESEND DASHBOARD TEMPLATE ' + process.env.RESEND_TPL_MENTORSHIP : 'built-in per-product html',
                declined: process.env.RESEND_TPL_DECLINED ? 'RESEND DASHBOARD TEMPLATE ' + process.env.RESEND_TPL_DECLINED : 'built-in html'
            }
        });
    } catch (err) {
        res.json({ ok: false, error: err.message });
    }
});

// ---------- Account lookup for success page ----------
app.get('/api/account/:sessionId', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const payload = acctPayload(req.params.sessionId);
    if (!payload) return res.status(404).json({ error: 'not found' });
    res.json(payload);
});

// ---------- Products by buyer email (drives dashboard across devices) ----------
const TIER_BY_KEY = { scalping: 'Scalping', 'impera-bot': 'Scalping', test: 'Scalping', gold: 'Gold', global: 'Global' };

app.get('/api/products/:email', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const users = db.read('users.json');
    const u = users.find(x => (x.email || '').toLowerCase() === String(req.params.email || '').toLowerCase());
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json({
        name: u.name || '',
        products: (u.products || []).map(p => ({
            sessionId: p.sessionId, bot: p.bot, botName: p.botName,
            licenceKey: p.licenceKey || null, date: p.date
        }))
    });
});

// ---------- Licence activation (validates against real orders only) ----------
app.post('/api/licence/activate', express.json(), (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const body = req.body || {};
    const key = String(body.key || '').trim().toUpperCase();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ ok: false, error: 'Log in to your IMPERA account first — licence keys activate against your login.' });
    }
    if (!/^IMPERA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
        return res.status(400).json({ ok: false, error: 'Invalid key format.' });
    }
    const accounts = db.read('accounts.json');
    const rec = accounts.find(a => a.licenceKey === key);
    if (!rec) return res.status(404).json({ ok: false, error: 'This licence key was not recognised. Keys are issued by email after purchase.' });
    const botKey = TIER_BY_KEY[rec.type] ? rec.type : null;
    if (!botKey) return res.status(400).json({ ok: false, error: 'This key belongs to a mentorship plan and unlocks sessions, not a bot download.' });

    // ---- One key, one account ----
    const boundTo = rec.activatedBy || rec.customerEmail?.toLowerCase() || null;
    if (boundTo && boundTo !== email) {
        return res.status(409).json({
            ok: false,
            error: `This licence key is locked to another IMPERA account (${maskEmail(boundTo)}). Each key works on one account only.`
        });
    }
    if (!rec.activatedBy) {
        rec.activatedBy = email;
        rec.activatedAt = new Date().toISOString();
        db.write('accounts.json', accounts);
    }

    res.json({ ok: true, tier: TIER_BY_KEY[botKey], botKey, productName: rec.productName || 'IMPERA Bot' });
});

function maskEmail(e) {
    const [u, d] = String(e || '').split('@');
    return (u ? u[0] : '') + '\u2022\u2022\u2022@' + (d || '');
}

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
