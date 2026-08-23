# IMPERA — Stripe → Email Automation

When a customer pays, this server receives Stripe's webhook and **automatically**:

| Purchase | What happens |
|---|---|
| **Any bot** (Scalping/Gold/Global) | Generates licence key + login password → emails the branded *Order Approved* email with that bot's name, real billing amount, licence key, download link and dashboard login |
| **Mentorship** (Monthly/Lifetime) | Generates login password + auto-schedules their first 1:1 Zoom session (next weekday, `MENTOR_SESSION_HOUR`) → emails the *Mentorship Welcome* with date/time of session |
| **Failed payment** | Emails the branded *Declined* email with the reason |

All data comes from **Stripe's billing record** — customer email, billing name and amount always match what was actually paid.

---

## Setup (one time)

1. **Install [Node.js](https://nodejs.org)** (LTS), then in this folder:
   ```
   npm install
   cp .env.example .env
   ```

2. **Fill `.env`**:
   - `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys
   - `PRICE_MAP` — replace each `price_XXXX` with your real Price IDs from Stripe Dashboard → Products. Keep `"type":"mentorship"` on the two mentorship prices — that's what switches which email is sent.
   - SMTP section — Gmail app-password works out of the box.
   - `SITE_URL` — where your HTML site is hosted.

3. **Connect the webhook**
   - Local testing: `stripe listen --forward-to localhost:4242/webhook` → copy the `whsec_...` into `.env`
   - Live: Stripe Dashboard → Developers → Webhooks → Add endpoint → `https://YOUR-SERVER/webhook` → events: `checkout.session.completed`, `payment_intent.payment_failed` → copy signing secret into `.env`

4. **Point the site at the server**: in `success.html`, set
   ```
   var IMPERA_API = 'https://your-server.com';
   ```
   The success page then uses the server-generated password, so what the buyer sees matches the emailed login exactly.

5. Run it: `npm start`

## Endpoints

- `POST /webhook` — Stripe events (verified by signature)
- `GET /api/account/:sessionId` — buyer's provisioning record (used by success.html)
- `GET /health`
- `POST /api/remind { sessionId }` — sends the branded meeting-reminder email. Header: `x-admin-token: <ADMIN_TOKEN>`

## Data
Accounts/orders are stored in `server/data/users.json` and `accounts.json`. For production scale, move to Postgres/Supabase.

## Hosting
Any Node host works (Railway/Render/Fly free tiers). Set the same env vars there; no file changes needed.
