# OlaFinancial— Setup & Deployment Guide

> Nigerian Personal Finance Platform  
> Stack: Vanilla JS · Supabase (PostgreSQL) · GitHub Pages · PWA

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Git | ≥ 2.40 | [git-scm.com](https://git-scm.com) |
| A GitHub account | — | [github.com](https://github.com) |
| A Supabase account | — | [supabase.com](https://supabase.com) (free tier works) |
| A web browser | Chrome/Edge/Firefox | — |

---

## Part 1 — Supabase Setup (Backend)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **"New project"**.
3. Fill in:
   - **Organization**: your personal org or create one
   - **Name**: `olafinancial`
   - **Database Password**: create a strong password — **save it somewhere safe**
   - **Region**: **"West EU (Frankfurt)"** — closest to Nigeria with good latency
4. Click **"Create new project"**. Wait ~2 minutes for provisioning.

---

### Step 2: Run Database Migrations

1. In Supabase, click **"SQL Editor"** in the left sidebar.
2. Click **"+ New query"**.
3. Open each migration file in order and paste + run:

   **Migration 1 — Schema** → paste `supabase/migrations/001_schema.sql` → Click **"Run"**

   **Migration 2 — RLS Policies** → paste `supabase/migrations/002_rls.sql` → Click **"Run"**

   **Migration 3 — Seed Data** → paste `supabase/migrations/003_seed.sql` → Click **"Run"**

4. Verify: go to **"Table Editor"** and confirm these tables exist:
   `user_profiles`, `income_entries`, `expense_entries`, `assets`, `liabilities`,
   `goals`, `monthly_snapshots`, `emergency_fund`, `ref_expense_categories`

---

### Step 3: Enable Google Auth (Optional)

To allow Google sign-in:
1. Supabase → **Authentication → Providers → Google** → Enable
2. Create OAuth credentials in Google Cloud Console
3. Paste the Client ID and Secret back into Supabase
4. Add `https://YOUR_GITHUB_USERNAME.github.io` to Redirect URLs

For email/password only: **no action needed** — enabled by default.

---

### Step 4: Get Your API Keys

1. In Supabase → **Project Settings → API**
2. Copy:
   - **Project URL**: `https://abcdefghij.supabase.co`
   - **anon public key**: long JWT starting with `eyJ...`

3. Open `js/config.js` and replace the two placeholder lines:

```javascript
// BEFORE (placeholders in js/config.js):
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

// AFTER (your real values):
const SUPABASE_URL  = 'https://abcdefghij.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> ✅ The **anon/public key** is safe in frontend code — protected by Row Level Security.  
> ❌ Never put the **service_role** key in frontend code.

---

## Part 2 — GitHub Repository Setup

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Set:
   - **Repository name**: `olafinancial`
   - **Visibility**: **Public** ✅ (required for free GitHub Pages)
   - Do **NOT** initialize with README
3. Click **"Create repository"**

---

### Step 2: Push the Project to GitHub

Open a terminal in your project folder:

```bash
# Initialize git (skip if already done)
git init

# Stage all files
git add .

# First commit
git commit -m "feat: initial Ola Financial MVP"

# Connect to your GitHub repo
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/olafinancial.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub → **Settings → Pages**
2. Under **"Source"**, select **"GitHub Actions"**
3. Click **Save**

The workflow in `.github/workflows/deploy.yml` will automatically run.

---

### Step 4: Verify Deployment

1. Go to your repo → **Actions** tab
2. Look for **"Deploy Ola Financial to GitHub Pages"** — wait for green ✅
3. Your live site:

```
https://YOUR_GITHUB_USERNAME.github.io/olafinancial/
```

---

## Part 3 — Supabase Allowed Redirect URLs

After deploying, add your live URL to Supabase:

1. Supabase → **Authentication → URL Configuration**
2. Add to **"Redirect URLs"**:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/olafinancial/
   http://localhost:5500
   http://127.0.0.1:5500
   ```

---

## Part 4 — Local Development

No build step required — plain HTML/JS.

### Option A: VS Code Live Server (Recommended)
1. Install the **"Live Server"** extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**
3. Opens at `http://127.0.0.1:5500`

### Option B: Python
```bash
python3 -m http.server 5500
```

### Option C: Node.js
```bash
npx -y serve . -p 5500
```

---

## Part 5 — Custom Domain (Optional)

If you purchased `olafinancial.org` or similar:

### 1. Add CNAME file to the project root
```bash
echo "olafinancial.org" > CNAME
git add CNAME && git commit -m "chore: add custom domain" && git push
```

### 2. Configure DNS at your registrar

| Type | Name | Value |
|------|------|-------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `YOUR_GITHUB_USERNAME.github.io` |

### 3. Enforce HTTPS
GitHub → Settings → Pages → Check **"Enforce HTTPS"**

> DNS propagation takes 24–48 hours.

### Recommended Nigerian Domain Registrars
| Registrar | Website | Notes |
|-----------|---------|-------|
| Web4Africa | web4africa.ng | Manages .ng TLD, NGN payment |
| NiRA Registry | nira.org.ng | Official .ng registry |
| QServers | qservers.net | Nigerian registrar, Naira billing |

---

## Part 6 — Future: Moving to Flutter

The JS architecture is designed for easy Flutter migration:

| Web JS Module | Flutter Equivalent |
|---|---|
| `WPUtils` (financial math) | `lib/utils/financial_utils.dart` |
| `WPDb` (Supabase queries) | `lib/services/supabase_service.dart` |
| `WPRouter` (hash router) | `go_router` package |
| `WPAuth` (auth module) | `supabase_flutter` Auth |
| Page modules | Screens in `lib/screens/` |

The Supabase database (schema, RLS, migrations) is **100% reusable** between web and mobile.

---

## Email (auth + digests)

The app sends two kinds of email. Full checklist: **[`EMAIL_SETUP.md`](./EMAIL_SETUP.md)** (GitHub issue **#38**).

| Kind | Provider | Always-on Node server? |
|------|----------|-------------------------|
| Password reset / signup confirm | **Supabase Auth** | No |
| Scheduled finance digests | **Resend** (`server/routes/digest.js` + cron) | **Yes** — not GitHub Pages alone |

Quick production gates:

1. Supabase redirect URLs include `https://pul.llc/**` (and bridge domains).
2. Resend: verify `pul.llc`, set `RESEND_API_KEY` + `RESEND_FROM` on the **API host**.
3. Deploy Node 24/7 with Supabase **service role** for digest jobs; test `GET /api/digest/run`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank white page | Open browser console (F12) for errors. Usually wrong Supabase keys. |
| "Invalid API key" | Double-check `SUPABASE_URL` and `SUPABASE_ANON` in `js/config.js` |
| Login not redirecting | Add your live URLs to Supabase → Authentication → Redirect URLs (see `EMAIL_SETUP.md` / `DOMAIN_MIGRATION.md`) |
| Password reset email missing | Check Supabase Auth logs / SMTP; confirm email templates and redirect allowlist |
| Digests not sending | Set `RESEND_API_KEY` on the Node host; verify Resend domain; ensure cron process is running (not Pages-only) |
| GitHub Pages shows 404 | Repo must be **Public** and Source set to **GitHub Actions** |
| RLS / permission errors | Re-run `002_rls.sql` in SQL Editor |
| Tables not found | Re-run migrations in order: 001 → 002 → 003 |
| Charts not showing | Snapshots needed — click "Save Snapshot" on Dashboard first |

---

## Security Notes

- **Row Level Security (RLS)** is enabled on all tables — users only see their own data
- The `anon` key in `config.js` **cannot bypass RLS** — safe for public repos
- Supabase Auth uses **bcrypt** — Ola Financial never stores raw passwords
- **NDPR compliance**: all user data lives in your own Supabase project
- Enable **Email Confirmations** in Supabase → Auth → Settings for production use

---

*Ola Financial v1.0.0 — Built for Nigeria 🇳🇬*
