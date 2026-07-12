# pul.llc (olafinancial.org) — Technology Stack Overview
### Prepared for Investor Review · July 2026

---

## Executive Summary

pul.llc is a personal finance platform purpose-built for the Nigerian market and the African diaspora. The architecture was designed with three principles: **zero vendor lock-in**, **enterprise-grade security from day one**, and **low operating cost at scale**. The entire platform runs on a modern serverless-friendly stack with a monthly infrastructure cost under **$50 at current user volumes**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Browser / PWA)                 │
│          HTML5 · Vanilla JS · Service Worker             │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                   Node.js API Server                      │
│       Lightweight HTTP · ESM · Zero framework deps        │
│  Routes: /api/profile  /api/snapshot  /api/econ  /health │
└──────────┬────────────────────────────┬─────────────────┘
           │ Supabase JS Client          │ Static file serve
┌──────────▼──────────────┐   ┌─────────▼────────────────┐
│      Supabase Platform   │   │   Client-side JS modules  │
│  ┌─────────────────────┐│   │  income · expenses · debt  │
│  │  PostgreSQL (v15)   ││   │  balance sheet · insurance  │
│  │  Row Level Security ││   │  retirement · goals · etc. │
│  └─────────────────────┘│   └──────────────────────────-┘
│  ┌─────────────────────┐│
│  │   Auth (JWT / OAuth)││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   Realtime / Edge   ││
│  └─────────────────────┘│
└─────────────────────────┘
```

---

## Layer-by-Layer Breakdown

### 1. Frontend — Client Application

| Attribute | Detail |
|-----------|--------|
| **Language** | Vanilla JavaScript (ES2022 modules) |
| **Styling** | Vanilla CSS with custom design tokens |
| **Rendering** | Client-side SPA with hash-based router |
| **Typography** | Google Fonts — Inter |
| **Charts** | Chart.js (canvas-based, offline capable) |
| **No framework** | Zero React/Vue/Angular — no framework upgrade risk, no bundle bloat |

**Why no framework?** Framework churn is a leading cause of technical debt in early-stage startups. Vanilla JS gives us a stable, auditable codebase with sub-50ms Time to Interactive and zero dependency upgrade cycles.

---

### 2. Progressive Web App (PWA)

| Attribute | Detail |
|-----------|--------|
| **Install** | "Add to Home Screen" on iOS and Android |
| **Offline** | Service Worker caches shell + static assets |
| **Cache strategy** | Cache-first for assets, network-first for API |
| **Push notifications** | Architecture ready (Web Push API) |
| **Shortcuts** | Native OS shortcuts to Dashboard and Log Expense |

Users get a native app experience with zero App Store friction or review delays.

---

### 3. Backend — API Server

| Attribute | Detail |
|-----------|--------|
| **Runtime** | Node.js v22 (LTS) |
| **Module system** | ESM (ES Modules) — modern, tree-shakeable |
| **HTTP** | Native `node:http` — no Express dependency |
| **Architecture** | Thin route handler pattern — each route is an isolated module |
| **Deployment** | Hostinger VPS (KVM-based Linux) — dedicated resources, full SSH access |

**Current API surface:**
- `GET /api/health` — uptime check / load balancer probe
- `GET /api/profile` — authenticated user profile
- `POST /api/snapshot` — monthly financial snapshot persistence
- `GET /api/admin/users` — admin analytics
- `GET /api/econ` — Nigeria macroeconomic indicators (inflation, MPR, FX, GDP, reserves)

---

### 4. Database — Supabase / PostgreSQL

| Attribute | Detail |
|-----------|--------|
| **Engine** | PostgreSQL 15 (managed by Supabase) |
| **Hosting** | Supabase Cloud (AWS us-east-1) |
| **Security model** | Row Level Security (RLS) enforced at DB level |
| **Auth** | Supabase Auth (JWT) — email/password + OAuth |
| **Migrations** | Versioned SQL migration files (`001_schema` → `004_rls`) |
| **Precision** | All monetary values stored as `BIGINT` in kobo (subunit) — no floating-point rounding errors |
| **Indexes** | Composite indexes on `(user_id, period_month)` for all time-series tables |

**Schema tables (11 core):**

| Table | Purpose |
|-------|---------|
| `user_profiles` | User settings, tax residency, risk tolerance, currency |
| `income_entries` | Gross income, PAYE, pension, NHF deductions |
| `expense_entries` | Categorised spend, recurring, prepaid amortisation |
| `assets` | Savings, equity, property, retirement — balance sheet |
| `liabilities` | Debt obligations, APR, payment schedule |
| `financial_goals` | Goal tracking with compound growth projection |
| `insurance_policies` | Coverage tracking per policy type |
| `emergency_fund` | Liquid reserves configuration |
| `monthly_snapshots` | Net worth / cash flow trend data (12-month charts) |
| `ref_banks` | Nigerian bank reference data |
| `ref_pfas` | PENCOM Pension Fund Administrator list |

---

### 5. Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Supabase JWT — short-lived tokens, refresh rotation |
| **Authorisation** | PostgreSQL Row Level Security — every query filtered at DB level, server code cannot accidentally leak cross-user data |
| **Transport** | HTTPS enforced — HSTS headers |
| **Secrets** | Environment variables only — never committed to source |
| **Input validation** | DB-level `CHECK` constraints on all enumerated fields |
| **Financial precision** | Integer arithmetic only (kobo) — immune to floating-point vulnerabilities |
| **RLS audit** | Supabase Advisor scans run continuously — all CRITICAL issues resolved |
| **Password security** | Supabase Auth handles hashing (bcrypt) — we never touch plaintext passwords |

---

### 6. Financial Intelligence Engine

All financial computation runs client-side in `js/utils.js` — a purpose-built library implementing:

| Feature | Detail |
|---------|--------|
| **Nigeria Tax Act 2025** | Full PIT bands, PAYE, CRA, rent relief |
| **PENCOM rules** | 8% employee + 10% employer pension computation |
| **NHF** | 2.5% National Housing Fund contribution |
| **Debt strategies** | Avalanche (APR-ranked) and Snowball (balance-ranked) simulators |
| **50/30/20 rule** | Live budget compliance scoring |
| **Compound growth** | FV/PV calculators for 8 instrument types |
| **Health Score** | Proprietary 0–100 financial wellness metric |
| **Currency conversion** | 14 currencies — NGN, USD, GBP, EUR, AED, CAD, CNY, ZAR, KES, GHS, SAR, AUD, XOF, XAF |
| **NDIC limits** | Automatic deposit insurance threshold alerts |

---

### 7. Macroeconomic Data Feed

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `GET /api/econ` — served from `server/data/econ-ng.json` |
| **Data points** | Inflation (NBS), GDP per capita growth (NBS), MPR (CBN), FX rates (NAFEM), Foreign reserves (CBN) |
| **Update cadence** | Monthly for inflation/FX, quarterly for GDP |
| **Resilience** | Falls back gracefully if endpoint is unavailable — page still loads |
| **Future** | Architecture ready for automated scraping or CBN Open Data API |

---

### 8. Testing & Quality

| Layer | Tool | Coverage |
|-------|------|---------|
| **Unit tests** | Jest | Core financial math (tax, compound interest, currency conversion) |
| **E2E tests** | Playwright | 58 tests across Chromium, Firefox, WebKit, iPhone 14 viewport |
| **Test suites** | 8 suites | Auth, Dashboard, Income/Expenses, Debt, Balance Sheet, Reports, Settings, PWA |
| **CI/CD** | GitHub Actions | Auto-runs on every push and pull request |
| **Coverage reporting** | Istanbul (via Jest) | HTML coverage report generated on each CI run |

---

### 9. DevOps & Deployment

| Attribute | Detail |
|-----------|--------|
| **Version control** | GitHub — `olafinancial/olafinancial` |
| **CI/CD** | GitHub Actions — test → lint → deploy pipeline |
| **Issue tracking** | GitHub Issues — 33 tracked items (7 open, 26 closed) |
| **Domain registrar** | Porkbun — `olafinancial.org` (DNS managed, DNSSEC enabled) |
| **Web hosting** | Hostinger VPS — KVM virtualisation, NVMe SSD, dedicated IP |
| **Environment management** | `.env` pattern — separate dev / test / production configs |
| **Database migrations** | Sequential SQL migration files — fully auditable, reproducible |

---

### 10. Monetisation Infrastructure (Built-In)

| Feature | Status |
|---------|--------|
| **Insights engine** (`js/lib/insights.js`) | ✅ Live — 30+ context-aware financial alerts |
| **Sponsor banner system** (`js/lib/sponsor.js`) | ✅ Built — shows vetted partner offers when user lacks a product |
| **Sponsor products covered** | Insurance, Investment, Emergency Fund, Debt Refinancing, Pension |
| **Monetisation model** | Only vetted sponsors featured — quality-controlled advertising |
| **Social sharing** | Planned — watermarked PNG export for X / WhatsApp virality |

---

## Infrastructure Cost Model

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Free → Pro ($25) | ~$25 |
| Hostinger VPS | Premium VPS | ~$7–$15 |
| Porkbun domain (`olafinancial.org`) | Annual renewal | ~$1/month |
| GitHub | Free (public) | $0 |
| **Total** | | **~$33–$41/month** |

Supabase Pro scales to 100,000 MAU before requiring enterprise pricing. The architecture is stateless and horizontally scalable — adding capacity requires no code changes.

---

## Scalability Path

```
Current (MVP)             Growth (~10K MAU)           Scale (100K+ MAU)
─────────────────         ────────────────────        ──────────────────────
Hostinger VPS (1 node)    Hostinger VPS (upgraded)    Dedicated server / CDN
Supabase Free tier        Supabase Pro                Supabase Enterprise / RDS
Porkbun DNS               Porkbun + Cloudflare proxy  Cloudflare Enterprise
Static JSON econ data     Scheduled NBS/CBN scraper   Real-time data pipeline
Manual sponsor config     Self-serve sponsor portal   Programmatic ad exchange
```

---

## Technology Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Supabase vendor lock-in | PostgreSQL is open standard — can migrate to self-hosted Postgres on Hostinger with one config change |
| Hostinger single-point VPS | Full SSH access enables rapid migration; Hostinger SLA 99.9% uptime; snapshot backups available |
| No framework = harder hiring | Vanilla JS/Node.js are universal skills — easier to hire than niche framework experts |
| Client-side computation | All financial logic is deterministic, unit-tested, and auditable |
| Data residency | Supabase region selection — can move to EU or African region as regulations evolve |
| Single-developer bus factor | Versioned migrations, documented architecture, full test coverage |

---

## Summary

pul.llc is built on a **deliberately minimal, high-security stack** that prioritises correctness over cleverness. Every architectural decision reduces cost, reduces attack surface, and increases auditability — qualities that matter as the platform handles sensitive personal financial data for users across Nigeria and the African diaspora.

---

*Stack version as of July 2026. All figures verified against live codebase.*  
*Live at: [olafinancial.org](https://olafinancial.org)*  
*Repository: [github.com/olafinancial/olafinancial](https://github.com/olafinancial/olafinancial)*  
*Domain registrar: Porkbun · Web host: Hostinger VPS · Database: Supabase (AWS us-east-1)*
