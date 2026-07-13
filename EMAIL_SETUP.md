# Email setup checklist — Pul Planning

**Status:** Operational steps (code exists; production wiring pending)  
**Updated:** 2026-07-13  
**Related issue:** track progress on GitHub (ops / infra)

The product uses **two** email systems. Do not mix them.

| Kind | Provider | Who sends | Always-on server? |
|------|----------|-----------|-------------------|
| **Auth** (signup confirm, password reset) | **Supabase Auth** | Supabase cloud | No |
| **Product digests** (daily/weekly/monthly finance summary) | **Resend** via Node | Your `server/` process | **Yes** |

GitHub Pages only hosts the **static frontend**. Digest cron runs only where `npm run start` / `npm run dev` is running with secrets.

---

## A. Auth emails (Supabase)

### A1. Redirect URLs (required for reset / OAuth)

Supabase → **Authentication → URL configuration**

| Setting | Value |
|---------|--------|
| **Site URL** | `https://pul.llc` (primary; use `https://olafinancial.org` until cutover) |
| **Redirect URLs** | `https://pul.llc/**` |
| | `https://www.pul.llc/**` |
| | `https://olafinancial.org/**` |
| | `https://www.olafinancial.org/**` |
| | `http://localhost:3000/**` |

App code (`js/supabase-client.js`) uses e.g.:

- `https://pul.llc/index.html` (OAuth / post-auth)
- `https://pul.llc/index.html#/reset-password` (password reset)

These hosts must be **live HTTPS** and listed above, or users get redirect errors.

### A2. Auth email templates (optional polish)

Supabase → **Authentication → Email templates**

- [ ] Update **Confirm signup**, **Reset password**, **Magic link** copy to **Pul Planning** (optional)
- [ ] Ensure links use Site URL / redirect allowlist (default templates are fine)

### A3. Custom SMTP for auth (recommended for production)

By default Supabase sends from its shared infrastructure (rate limits / spam risk).

Supabase → **Project Settings → Authentication → SMTP** (or Auth → SMTP)

1. Use a real mailbox provider (Resend SMTP, SendGrid, Amazon SES, etc.)
2. From address e.g. `auth@pul.llc` or `noreply@pul.llc`
3. Verify domain DNS (SPF / DKIM) at the provider **and** in DNS for `pul.llc`

**Checklist**

- [ ] Custom SMTP enabled **or** accept Supabase default for staging only  
- [ ] Test: **Forgot password** on production → email arrives → link opens app  
- [ ] Test: signup confirmation if confirm-email is required  

### A4. Confirm email requirement

Supabase → **Authentication → Providers → Email**

- [ ] Decide: **Confirm email** on/off for production  
- [ ] If on, users cannot log in until they click the mail link  

---

## B. Digest emails (Resend + Node server)

Code already implemented:

- `server/routes/digest.js` — build HTML + `POST https://api.resend.com/emails`
- `server/cron.js` — hourly tick; runs digests at **07:00 UTC** (08:00 Lagos)
- Settings UI — user enables digest / frequency / address
- Manual trigger: `GET /api/digest/run` (when server is up)

### B1. Create a Resend account

1. Sign up at [resend.com](https://resend.com)
2. Create an API key (full access or send-only)
3. Store the key only in server env — **never** in the browser or git

### B2. Verify sending domain (production)

In Resend → **Domains** → add **`pul.llc`** (or a subdomain e.g. `mail.pul.llc`)

Add the DNS records Resend shows (typically):

| Type | Purpose |
|------|---------|
| TXT | SPF |
| TXT / CNAME | DKIM |
| Optional TXT | DMARC |

Wait until domain status is **Verified**.

**From address** should match the verified domain, e.g.:

```text
digest@pul.llc
Pul Planning <digest@pul.llc>
```

Until domain is verified, Resend may only allow their test/onboarding from-addresses (not production).

### B3. Server environment variables

Add to production `.env` (and local `.env` for testing). See also `.env.example`.

```bash
# Resend (product digests)
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM=Pul Planning <digest@pul.llc>

# Supabase admin reads for digest job
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=eyJ...   # service_role — server only

# Links inside the digest HTML
APP_URL=https://pul.llc

# Optional: protect admin trigger in production
ADMIN_SECRET=long-random-string
NODE_ENV=production
PORT=3000
```

If `RESEND_API_KEY` is missing, the server logs:

```text
[cron] RESEND_API_KEY not set — email digest cron disabled
```

### B4. Host the Node server 24/7

Digests **do not run on GitHub Pages**. Deploy `server/` to a process host, e.g.:

- Railway / Render / Fly.io / a VPS  
- Same repo: `npm ci && npm start` (or `npm run dev` only for local)

Requirements:

- [ ] Public HTTPS URL for API if you call digest from outside (optional)  
- [ ] Env vars from B3 injected on that host  
- [ ] Process restarts on crash; stays up across deploys  
- [ ] Clock/timezone: cron uses **UTC** hour `7`  

### B5. Database / product prefs

- [ ] Migration `supabase/migrations/005_digest_prefs.sql` applied (digest columns on `user_profiles`)  
- [ ] In app **Settings**: enable email digest, set frequency, set recipient email  
- [ ] Confirm test user has income/expense/asset data so the summary is meaningful  

### B6. Test digests

**Local / staging**

```bash
# With .env loaded and server running:
curl -s "http://localhost:3000/api/digest/run"
# Or with admin secret if enforced:
# curl -s "http://localhost:3000/api/digest/run?secret=$ADMIN_SECRET"
```

**Checklist**

- [ ] Response shows sent ≥ 1 (or skipped with clear reason)  
- [ ] Inbox receives branded digest  
- [ ] From address shows correctly (not “via resend.dev” only, once domain verified)  
- [ ] Unsubscribe / disable in Settings stops further sends  
- [ ] Cron log line at 07:00 UTC: `Running email digest job`  

### B7. GitHub Actions / CI

CI **does not** need Resend for unit/e2e unless you add digest tests.  
Do **not** put `RESEND_API_KEY` in frontend or Pages deploy secrets unless a separate backend job uses it.

---

## C. Domain alignment (with DOMAIN_MIGRATION.md)

| Item | Auth (Supabase) | Digest (Resend) |
|------|-----------------|-----------------|
| Primary user-facing site | `https://pul.llc` | Links in HTML → `APP_URL=https://pul.llc` |
| Bridge | Keep `olafinancial.org` on redirect allowlist until cutover | Prefer `APP_URL` = primary only |
| From-domain DNS | SMTP domain if custom SMTP | Resend domain verify on `pul.llc` |

---

## D. Ordered rollout (recommended)

1. **Auth first (no new host)**  
   - Fix Supabase redirect URLs for pul.llc + .org  
   - Test password reset on production frontend  

2. **Resend domain**  
   - Verify `pul.llc` in Resend; set `RESEND_FROM`  

3. **Backend host**  
   - Deploy Node with `RESEND_API_KEY` + Supabase secret  
   - Hit `/api/digest/run` once  

4. **Cron**  
   - Confirm 07:00 UTC job in logs over 1–2 days  

5. **Polish**  
   - Auth templates branded Pul Planning  
   - Optional: custom Supabase SMTP via same Resend domain  

---

## E. Security notes

- `SUPABASE_SECRET_KEY` and `RESEND_API_KEY` are **server-only**  
- Never commit `.env`  
- Prefer least-privilege Resend key if available  
- Rate-limit or secret-protect `/api/digest/run` in production (`ADMIN_SECRET`)  

---

## F. Quick reference — code paths

| Path | Purpose |
|------|---------|
| `js/supabase-client.js` | Auth signup/login/reset (Supabase) |
| `js/pages/settings.js` | Digest prefs UI |
| `server/routes/digest.js` | Build + send digests via Resend |
| `server/cron.js` | Schedule digests |
| `server/index.js` | Mounts `/api/digest/run`, starts cron |
| `supabase/migrations/005_digest_prefs.sql` | DB columns for digest prefs |

---

## G. Acceptance criteria (close the ops issue when)

- [ ] Password reset email works on **pul.llc** (or current live domain)  
- [ ] Resend domain **pul.llc** verified  
- [ ] Production Node process has Resend + Supabase secret env  
- [ ] Manual `/api/digest/run` sends a real email  
- [ ] Cron sends (or correctly skips) without errors in logs  
- [ ] Settings toggle controls delivery for a test user  
