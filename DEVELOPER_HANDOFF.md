# Developer Handoff & Maintenance Guide — Pul Planning

**Product Name:** Pul Planning  
**Primary Domain:** [https://pul.llc](https://pul.llc)  
**GitHub Repository:** `olafinancial/olafinancial`  
**Document Version:** 1.0 (Master Handoff)  
**Last Updated:** July 2026  

---

## 1. Executive Summary & Architecture Overview

Pul Planning is a personal finance platform designed for tracking net worth, managing income/expenses, calculating Financial Independence (FI Score), planning debt payoff, and projecting retirement (Nigeria Tax Act 2025 compliant).

### Architecture Stack:
- **Frontend (Web App):** Vanilla HTML5, CSS3, JavaScript (ES6 Modules) hosted on **GitHub Pages** with custom domain `pul.llc`.
- **Backend Service (API & Cron):** Node.js HTTP server hosted on **Render** (`pul-planning-backend`). Handles scheduled email digests, macroeconomics data (`/api/econ`), administrative resets, and account deletion.
- **Database & Authentication:** **Supabase** (PostgreSQL with Row-Level Security and Supabase Auth for login/signup/password resets).
- **Email Delivery:** **Resend** (for product digests & scheduled reports) + **Supabase Auth** (for authentication emails).

---

## 2. Live Services & Account Inventory

*Note to Owner: Store actual passwords and API tokens in a secure password manager (e.g. 1Password, Bitwarden, or Dashlane).*

| Service | Provider / URL | Access / Account Handle | Purpose |
| :--- | :--- | :--- | :--- |
| **Domain Registrar** | [Porkbun](https://porkbun.com) | Account: `olafinancial` | Controls DNS for `pul.llc` & `olafinancial.org` |
| **Code Repository & Hosting** | [GitHub](https://github.com/olafinancial/olafinancial) | Org: `olafinancial` | Code storage, GitHub Pages static hosting |
| **Backend API Server** | [Render](https://render.com) | Service: `pul-planning-backend` | Runs Node.js API server & scheduled digests |
| **Database & Auth** | [Supabase](https://supabase.com) | Project: `Pul Planning` | User authentication, PostgreSQL database, RLS |
| **Product Email API** | [Resend](https://resend.com) | Domain: `pul.llc` | Sends email digests from `digest@pul.llc` |
| **Support Mailbox** | [Email / Webmail](mailto:hello@pul.llc) | `hello@pul.llc` | Customer inquiry & support address |

---

## 3. Environment Variables & Production Secrets

The backend server on Render and local development environment require the following environment variables:

```bash
# ── SUPABASE (Database & Auth) ──
SUPABASE_URL="https://<YOUR-PROJECT-ID>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_anon_..."    # Safe for browser / public
SUPABASE_SECRET_KEY="sb_service_..."         # Secret! Server-side ONLY (bypasses RLS)

# ── SERVER & APP CONFIG ──
PORT=3000
NODE_ENV="production"
APP_URL="https://pul.llc"

# ── EMAIL (Resend Digest API) ──
RESEND_API_KEY="re_..."
RESEND_FROM="Pul Planning <digest@pul.llc>"

# ── ADMIN & SECURITY ──
ADMIN_SECRET="<YOUR-RANDOM-ADMIN-SECRET>"   # Protects /api/digest/run in production
```

> **Warning:** Never commit `.env` files containing real production keys to version control. Production keys are stored directly in **Render Dashboard → Environment Variables** and **Supabase Dashboard → Project Settings**.

---

## 4. Domain & DNS Configuration (Porkbun)

Apex domain `pul.llc` points to GitHub Pages. `www.pul.llc` is CNAME-ed to `pul.llc`.

### DNS Records Table for `pul.llc`:

| Type | Host / Name | Target / Value | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `185.199.108.153` | GitHub Pages Apex |
| **A** | `@` | `185.199.109.153` | GitHub Pages Apex |
| **A** | `@` | `185.199.110.153` | GitHub Pages Apex |
| **A** | `@` | `185.199.111.153` | GitHub Pages Apex |
| **AAAA** | `@` | `2606:50c0:8000::153` | GitHub Pages IPv6 Apex |
| **CNAME** | `www` | `pul.llc` | WWW Redirection |
| **TXT** | `@` | `v=spf1 include:amazonses.com ~all` (or Resend SPF) | Email Deliverability |
| **CNAME** | `resend._domainkey` | (Provided by Resend Dashboard) | Resend DKIM Authentication |

---

## 5. Daily Maintenance & Operational Guides

### A. How to Update Code & Deploy Changes
Deployments are fully automated via GitHub Actions and Render webhooks.
1. Open terminal in project folder:
   ```bash
   git status
   git add .
   git commit -m "feat: description of change"
   git push origin main
   ```
2. **GitHub Pages** will automatically publish the static frontend within 1–2 minutes.
3. **Render** will automatically build and restart the backend server within 2 minutes.

### B. How to Add or Edit Blog Posts (Non-Technical Owner Method)
No local software or programming required:
1. Go to GitHub repo: `https://github.com/olafinancial/olafinancial/tree/main/blog/posts`
2. Click **Add file → Create new file**.
3. Name it `my-post-title.md` and write the post using Markdown. Click **Commit changes**.
4. Go to `blog/posts.json` on GitHub, click the **Pencil (Edit)** icon, add the post object at the top of the array, and click **Commit changes**.
5. See `BLOG_OWNER_GUIDE.md` or PowerPoint guide (`docs/Pul_Blog_Posting_Guide.pptx`) for visual step-by-step instructions.

### C. How to Run Local Tests
Run unit tests to verify tax calculations, net worth ratios, and financial functions before pushing code:
```bash
npm run test:unit
```

### D. How to Inspect Backend Logs & Server Health
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Select `pul-planning-backend`.
3. Click **Logs** tab to view real-time API logs, errors, and scheduled digest execution status.
4. Healthcheck URL: `https://pul-planning-backend.onrender.com/api/health`

---

## 6. Directory Map & Repository Structure

```
├── blog/                      # Public Blog posts (.md files) and index (posts.json)
├── css/                       # Master stylesheets
│   ├── styles.css             # Main application design system & dark mode
│   └── marketing.css          # Landing & marketing page styles
├── docs/                      # Technical guides & visual slides
├── js/                        # JavaScript application modules
│   ├── app.js                 # App bootstrap, router initialization & navigation shell
│   ├── auth.js                # Auth handlers & user session watcher
│   ├── blog.js                # Markdown blog renderer
│   ├── config.js              # Benchmarks, onboarding paths & legal links
│   ├── router.js              # Client-side hash router
│   ├── supabase-client.js     # Supabase client SDK instance
│   ├── utils.js               # Nigerian Tax Act 2025, NHF, PENCOM & currency calculators
│   └── pages/                 # Individual module controllers
│       ├── dashboard.js       # Main dashboard KPIs & alerts
│       ├── income.js          # Income sources & PAYE tax calculator
│       ├── expenses.js        # Expense tracking & categorization
│       ├── onboarding.js      # 6-step initial setup wizard
│       ├── settings.js        # User settings, digests & guide reset
│       └── ...                # Other feature pages
├── server/                    # Backend Node.js server
│   ├── index.js               # Main HTTP router & CORS setup
│   ├── cron.js                # Background digest scheduler
│   └── routes/                # Backend API route handlers
├── supabase/                  # Database migration scripts & RLS policy files
├── tests/                     # Jest unit tests & Playwright E2E tests
├── index.html                 # Main Single Page App (SPA) entrypoint
├── blog.html                  # Public Blog page
├── how-it-works.html          # Public How It Works page
├── about.html                 # Public About page
├── render.yaml                # Render Infrastructure-as-Code deployment file
└── package.json               # Node.js dependencies & scripts
```

---

## 7. Emergency & Troubleshooting Contacts

- **Server Down / API Unresponsive:** Check [Render Status](https://status.render.com) and restart the service via Render Dashboard.
- **Database / Authentication Down:** Check [Supabase Status](https://status.supabase.com).
- **Domain / DNS Issues:** Check Porkbun DNS settings and domain expiration dates.
- **Reverting a Broken Deployment:**
  ```bash
  git revert HEAD
  git push origin main
  ```

---

*This document should be safely stored in the project repository root (`DEVELOPER_HANDOFF.md`) and updated whenever structural infrastructure changes occur.*
