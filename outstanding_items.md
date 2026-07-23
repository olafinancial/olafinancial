# Pul Planning — Outstanding Items

**As of:** July 22, 2026  
**Completed features:** 40+ requirements shipped across 9 sessions  
**Active modules:** 16 pages + 2 libraries all live  
**Launch gate:** See **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** (owners: Product / Engineering / Ops / Legal).

### Shipped 2026-07-22 (go-live prep)
- NDIC alert config mapping fixed (`APP_CONFIG.ndic`)
- Privacy Policy + Terms pages + signup consent checkbox
- Household combined view copy honesty (preview only)
- Tax bracket display labels aligned with NTA 2025 progressive bands

---

## 🔴 High Priority — Blocking Production Readiness

### 1. Production Email Setup ([#38](https://github.com/olafinancial/olafinancial/issues/38))
**Type:** Ops / Infrastructure · **Doc:** [EMAIL_SETUP.md](file:///home/shill/Documents/Financial%20App%20Project/EMAIL_SETUP.md)

The code for both auth emails (Supabase) and digest emails (Resend) is **already built**. What remains is production wiring:

| Task | Status |
|------|--------|
| Supabase Site URL + redirect allowlist → `pul.llc` | ⬜ Pending domain cutover |
| Custom SMTP for auth emails (avoid Supabase shared infra rate limits) | ⬜ Not configured |
| Resend account created + `pul.llc` domain verified | ⬜ Not done |
| `RESEND_API_KEY` + `RESEND_FROM` set in production `.env` | ⬜ Not done |
| Always-on Node server for digest cron (can't run on GitHub Pages alone) | ⬜ No hosting decision yet |
| Smoke test: `GET /api/digest/run` → email arrives | ⬜ Blocked on above |

> [!IMPORTANT]
> Without this, password reset emails and weekly/monthly financial digest summaries won't work in production.

---

### 2. Sponsor Partners — Activate Banners ([#28](https://github.com/olafinancial/olafinancial/issues/28))
**Type:** Business / Revenue · **Doc:** [sponsors_onboarding.md](file:///home/shill/Documents/Financial%20App%20Project/sponsors_onboarding.md)

The `WPSponsor` system in [sponsor.js](file:///home/shill/Documents/Financial%20App%20Project/js/lib/sponsor.js) is **fully built** — utility-based targeting, dismissible banners, "Sponsored" labels. Currently running with **placeholder/disabled sponsors**.

**Action needed:** Confirm partner agreements and collect 5 assets per partner (URL, logo, display name, tagline, CTA text), then update the `SPONSORS` config.

| Slot | Target Page | Status |
|------|-------------|--------|
| Insurance provider | Insurance, Balance Sheet | ⬜ Awaiting partner |
| High-yield savings (e.g. PiggyVest) | Emergency Fund, Dashboard | ⬜ Awaiting partner |
| Wealth management / broker | Balance Sheet, Retirement | ⬜ Awaiting partner |
| Debt refinancing | Debt Planner | ⬜ Awaiting partner |
| Pension Fund Administrator | Retirement, Onboarding | ⬜ Awaiting partner |

---

## 🟡 Medium Priority — Feature Gaps

### 3. Domain Migration to `pul.llc` ([#23](https://github.com/olafinancial/olafinancial/issues/23) / [#25](https://github.com/olafinancial/olafinancial/issues/25))
**Type:** Infrastructure · **Doc:** [DOMAIN_MIGRATION.md](file:///home/shill/Documents/Financial%20App%20Project/DOMAIN_MIGRATION.md)

Currently serving from `olafinancial.org`. Full 6-phase migration plan documented:

- [ ] **Phase 1:** DNS for `pul.llc` → GitHub Pages (A/AAAA/CNAME records at Porkbun)
- [ ] **Phase 2:** 301 redirect from `olafinancial.org` → `pul.llc`
- [ ] **Phase 3:** Supabase auth URLs updated
- [ ] **Phase 4:** App canonical/manifest/CNAME pointers
- [ ] **Phase 5:** Soft launch verification
- [ ] **Phase 6:** Cleanup old `.org` references

---

### 4. Salary Deductibles Calculator + Tax-Year Ledger ([#34](https://github.com/olafinancial/olafinancial/issues/34))
**Type:** Feature · **Requested by:** @kaluaja

Build a detailed salary breakdown calculator showing:
- Gross → Net with line-by-line deductions (PAYE via Nigeria Tax Act 2025 brackets, pension 8%, NHF 2.5%, etc.)
- Tax-year ledger tracking cumulative deductions and tax paid

---

### 5. Split Balance Sheet → Separate Assets + Liabilities Pages ([#36](https://github.com/olafinancial/olafinancial/issues/36))
**Type:** Feature / IA Restructure · **Requested by:** @kaluaja

Currently a single 40K-line [balance-sheet.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/balance-sheet.js). Proposal to split into dedicated Assets and Liabilities pages for better UX. Needs design review before implementation.

---

### 6. Budget Planner / 50-30-20 Rule ([#32](https://github.com/olafinancial/olafinancial/issues/32))
**Type:** Feature · **Priority:** Low (roadmap)

Guided budget creation with automated categorization against the 50/30/20 framework (Needs / Wants / Savings). Referenced in requirements as FR-021.

---

## 🔵 Recurring / Operational

### 7. Monthly Macroeconomic Data Update ([#29](https://github.com/olafinancial/olafinancial/issues/29))
**Type:** Recurring maintenance

The dashboard macro card pulls from [econ-ng.json](file:///home/shill/Documents/Financial%20App%20Project/server/data/econ-ng.json). Data must be manually updated when NBS/CBN publish new figures:

| Metric | Update Frequency |
|--------|-----------------|
| Inflation rate | Monthly |
| Monetary Policy Rate (MPR) | After each MPC meeting |
| GDP per capita growth | Quarterly |
| FX rates (USD, GBP) | Monthly or on significant moves |
| Foreign reserves | Monthly |

---

## 🟢 Polish / Nice-to-Have

### 8. Harden WebKit Offline PWA Tests
2 of 120 E2E tests fail on WebKit only (offline `setOffline` + `reload` internal error). All other browsers pass 100%.

### 9. Investment Quiz Follow-ups (from R40)
- Unit tests for pure scoring helpers
- PDF export of investment profile (beyond browser print)
- Optional getting-started step 7 linking to `/invest` — **partially added**

### 10. Social Sharing & Watermarked Image Export ([#27](https://github.com/olafinancial/olafinancial/issues/27) — closed, but R32 planned)
Web Share API + `html2canvas` PNG download with `pul.llc` watermark on Reports page. Issue was closed but the feature is listed as 🔲 Planned in [current_plans.md](file:///home/shill/Documents/Financial%20App%20Project/current_plans.md).

---

## Summary Table

| # | Item | Type | Priority | Blocker? |
|---|------|------|----------|----------|
| 1 | Production email setup (#38) | Ops | 🔴 High | Yes — auth + digests |
| 2 | Sponsor partners (#28) | Business | 🔴 High | Revenue |
| 3 | Domain migration to pul.llc (#23/#25) | Infra | 🟡 Medium | Branding |
| 4 | Salary deductibles calculator (#34) | Feature | 🟡 Medium | No |
| 5 | Balance Sheet split (#36) | Feature/IA | 🟡 Medium | No |
| 6 | Budget Planner 50/30/20 (#32) | Feature | 🟡 Low | No |
| 7 | Monthly macro data (#29) | Recurring | 🔵 Ongoing | No |
| 8 | WebKit PWA test fix | Testing | 🟢 Low | No |
| 9 | Investment quiz extras | Polish | 🟢 Low | No |
| 10 | Social share + watermark export | Feature | 🟢 Low | No |

> [!TIP]
> **Recommended next steps:** Tackle **#38 (email ops)** first since it unblocks both auth and digests in production, then **#23/#25 (domain migration)** since many other items (auth redirects, PWA canonical URL, sponsor links) depend on the final domain being live.
