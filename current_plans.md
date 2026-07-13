# Ola Financial — Current Plans & Implementation Status

This file tracks the active plans, completed work, and remaining roadmap for the Ola Financial application.

---

## Completed Enhancements

### Session 1 — Core Infrastructure & Financial Tools

#### 1. Unified Emergency Fund & Asset Integration
* **Status**: ✅ Completed
* **Description**: Removed the manual "Update Balance" button on the Emergency Fund page. Assets on the Balance Sheet now have a toggle checkbox: *"Use as an Emergency Fund source"*. The Emergency Fund page automatically queries these assets, aggregates their current balances, and lists all linked sources in a clean details table.

#### 2. Debt Payoff Strategies (Snowball vs. Avalanche)
* **Status**: ✅ Completed
* **Description**: Added a payoff strategy selector on the Debt Planner page. Users can now choose between **Debt Avalanche** (highest APR first) and **Debt Snowball** (lowest balance first).

#### 3. Automated Monthly Debt Payments & Manual Overrides
* **Status**: ✅ Completed
* **Description**: Added an option to manually enter monthly payment if APR is unknown, across Debt Planner and Balance Sheet liability forms.

#### 4. Input Comma-Formatting & Caching
* **Status**: ✅ Completed

---

### Session 2 — MVP Expansion, Estate Planning & Calculators

#### 5. Logged-Out Landing Page
* **Status**: ✅ Completed

#### 6. Mobile-Responsive Design & PWA (Add to Home Screen)
* **Status**: ✅ Completed

#### 7. Estate & Legacy Planning (Onboarding + Full Diagnostic)
* **Status**: ✅ Completed
* **Files**: `js/pages/onboarding.js`, `js/pages/estate-planner.js`

#### 8. Financial Calculators Hub (8 Calculators)
* **Status**: ✅ Completed
* **File**: `js/pages/calculators.js`
* Savings Goal, Savings (Compound), ROI, Simple Loan, Detailed Loan, Car Loan, Mortgage, Inflation Impact

#### 9. Per-Page Display Currency Selectors
* **Status**: 🔶 Partially Completed (4 of 9 pages done)
* **Completed**: Dashboard, Income, Expenses, Balance Sheet
* **Remaining**: Cash Flow, Debt Planner, Emergency Fund, Goals, Reports

#### 10. Estate Planner Report Generation Bug Fix
* **Status**: ✅ Completed

#### 11. Currency Selector Removed from Sidebar
* **Status**: ✅ Completed

---

### Session 3 — Tax Residency, Disclaimers & Expense Enhancements

#### 12. Tax Estimator NaN Fix
* **Status**: ✅ Completed

#### 13. PAYE Tax — Nigerian Resident Restriction
* **Status**: ✅ Completed
* Non-residents see a disclaimer instead of the tax estimator. PAYE card shows N/A for non-residents.

#### 14. App Disclaimer Copy Update
* **Status**: ✅ Completed

#### 15. Recurring Expense Frequency Options
* **Status**: ✅ Completed
* Weekly, Bi-weekly, Monthly, Quarterly, Annually, Custom options when toggling recurring expense.

#### 16. Closing Balance Removed from Liabilities Form
* **Status**: ✅ Completed
* Simplified to single "Current Balance" field.

---

### Session 4 — Charts, Print Headers & Reports

#### 17. Charts Show Immediately Without Waiting for Snapshots
* **Status**: ✅ Completed
* Dashboard synthesizes a live data point if no snapshots saved. Reports show with 1+ snapshots.

#### 18. Print Headers with Client Name & Date
* **Status**: ✅ Completed
* Financial Reports and Estate Planner Report both include a print-only header: "Ola Financial — [Report Name]", Prepared for: [Name], Date Generated: [Date], Confidential.
* App disclaimer appended to printed estate reports.
* Enhanced print CSS: table borders, readable colours, badges visible in B&W.

---

## 🆕 New Requirements from WhatsApp Notes

### HIGH PRIORITY

---

#### R1. Expanded Currency Support
* **Status**: ✅ Completed
* **Description**: Added full support for currencies (AED, CNY, XOF, XAF, KES, GHS, CAD, ZAR, SAR, AUD) across the entire application (DB converts, currency formats, inputs, dropdowns).

---

#### R2. Dashboard Insights Moved Above Charts
* **Status**: ✅ Completed
* **Description**: Reordered dashboard rendering. Alerts and insights are displayed at the top.

---

#### R3. Dashboard Greeting Uses "Daily" Not "Monthly"
* **Status**: ✅ Completed
* **Description**: Updated header period label to reflect the current daily date instead of monthly labels.

---

#### R4. Global Base Currency Setting (App-Wide)
* **Status**: ✅ Completed
* **Description**: Implemented Settings page allowing users to configure name, age, retirement target, global base currency, and Takaful preferences. Supporting NONE currency option to hide currency prefixes.

---

#### R5. Rename "PAYE" Label to "Tax" App-Wide
* **Status**: ✅ Completed
* **Description**: Uniformly replaced the "PAYE Tax" phrasing with "Tax" in all tables, views, and cards.

---

#### R6. Investment Expense → Auto-Populate Balance Sheet (Double Entry)
* **Status**: ✅ Completed
* **Description**: Logged "Investment" expenses automatically open a sub-form to create the corresponding Asset on the Balance Sheet.

---

#### R7. Retirement Contribution Rename + AVC/Gratuity Support
* **Status**: ✅ Completed
* **Description**: Renamed Pension/RSA to "Retirement Contribution" with AVC/RSA/Gratuity sub-type support.

---

#### R8. Fixed Deposit (CD) Calculator
* **Status**: ✅ Completed
* **Description**: CD Compound Compounding Yield Calculator is added as a tab inside Calculators Hub.

---

#### R9. Retirement Planning for Non-Nigerian Jurisdictions (US 401K etc.)
* **Status**: ✅ Completed
* **Description**: Jurisdiction rules implemented for US, UK, Canada, Nigeria, and generic retirement systems.

---

#### R10. Section-Level Goals with Social Sharing
* **Status**: ✅ Completed
* **Description**: Goals are added to sections with built-in Twitter/clipboard brag sharing modals.

---

### MEDIUM PRIORITY

---

#### R11. Net Income Allocation to Goals / Surplus Wizard
* **Status**: ✅ Completed
* **Description**: Added PYF surplus allocation questionnaire to goals workflow from dashboard net cash surplus.

---

#### R12. Stock Tracking on Retirement Page (Mark-to-Market)
* **Status**: ✅ Completed
* **Description**: Stock tracking added with live pricing queries routed through public Yahoo Finance CORS proxies.

---

#### R13. Scheduled / Email Reports
* **Status**: ✅ Completed
* **Description**: Weekly or monthly digest email of key financial metrics (net worth change, savings rate, cash flow, net income) delivered via Resend API.
* **Implementation**:
  * DB: Migration `005_digest_prefs.sql` added configuration columns to `user_profiles`.
  * Frontend: Added custom email digest control panel inside `WPSettings` (`js/pages/settings.js`).
  * Backend: Created `server/routes/digest.js` which queries DB, renders branded HTML emails, and forwards them to Resend. Mounts admin manually triggered run endpoint at `GET /api/digest/run`.
  * Cron: Added hourly tick runner in `server/cron.js` checking daily at 07:00 UTC (8am Lagos) to automatically fire due summaries.

---

#### R14. Emergency Fund Page — Updated Content & Guidance
* **Status**: ✅ Completed
* **Description**: Guidance text replaced with step-by-step 3-6 months metrics instructions.

---

#### R15. Complete Per-Page Currency Selectors (Remaining Pages)
* **Status**: ✅ Completed
* **Files**: `js/pages/cashflow.js`, `js/pages/emergency-fund.js`, `js/pages/goals.js`
* All pages have `<select>` with localStorage persistence, `pageCurrency` passed through all `WPUtils.fmt()` / `WPUtils.convert()` calls, and re-render on change.

---

### 🆕 Requirements from WhatsApp PDF (Copy of reqs.pdf)

#### R19. Show/Hide Password Toggle
* **Status**: ✅ Completed
* **Description**: Add a show/hide password toggle (eye icon) to Login and Sign-up fields.

#### R20. Income Form Structural Refinements
* **Status**: ✅ Completed
* **Description**:
  * Add **biweekly** option to income frequencies.
  * Dynamically show "PAYE" tax & pension deductions sub-sections *only* when "Active Income" (Salary) is selected.
  * Show plain "Tax" (or "property tax") when "Passive" or "Investment" income is selected.
  * Include "semi-annual" option to the frequency dropdown for investments (dividends).

#### R21. Asset ROI & Valuation Inputs (Rolex vs. Stock)
* **Status**: ✅ Completed
* **Description**:
  * If an asset is toggled as "income-generating", allow input fields for Name, Cost per unit, Quantity, and Total cost to track average cost basis and calculate accurate ROI.
  * Separate non-financial assets (e.g. Rolex) from financial stock assets that track mark-to-market.
  * Allow tracking historical price changes of an asset (price movement trends over time).

#### R22. APY Nigeria Thresholds & Crash Fixes
* **Status**: ✅ Completed
* **Description**:
  * Fix bug: If user clicks "Add Asset" without entering a name, the modal crashes and disappears.
  * Raise the maximum APY boundary limit to 30% (current cap at 9% is too low for Nigerian yields).

#### R23. Log Prepaid Expenses (Rent in Advance)
* **Status**: ✅ Completed
* **Description**: Implement a system to log pre-paid payments (such as paying rent for two years in advance) and amortize them monthly.

#### R24. Branded Watermarks & Macroeconomic Dashboard
* **Status**: ✅ Completed
* **Description**:
  * Add watermarks (`pul.llc`) to printable reports for sharing.
  * Created an **Economic Dashboard** on the main dashboard with Nigeria's GDP per capita growth rate (quarterly), monthly inflation, FX rates ($ and GBP), MPR (Monetary Policy Rate), and FX reserves sourced from CBN and NBS.
  * Dashboard macro card now fetches live data from `/api/econ` route backed by `server/data/econ-ng.json` (manually maintained — update when NBS/CBN release new figures).
  * Include a Sharia-compliant (Takaful) insurance preference question during onboarding.

#### R25. Reset Password & OAuth Redirects Routing
* **Status**: ✅ Completed
* **Description**: Configured Supabase redirection links to point to the live `pul.llc` URL overrides instead of local paths.

#### R26. Syntax Crash & Offline Cache Invalidation
* **Status**: ✅ Completed
* **Description**: Fixed unbalanced brackets causing boot crashes, incremented the PWA service worker cache to `v14`, and updated script cache-busting version tags to restore runtime stability.

#### R27. Comprehensive Automated Test Suite
* **Status**: ✅ Completed
* **Description**: Implemented Jest unit tests for core math utilities and Playwright E2E integration specs covering user auth, dashboard insights, PWA offline caching, calculators, custom reports, and mobile viewport responsiveness. Debugged and aligned DOM selectors, route path formats (using slash prefixing), and custom styled inputs to ensure 100% pass rates locally and under automated workflows. Runs automatically on push/PR via GitHub Actions.

#### R28. Add Income Bug Fix
* **Status**: ✅ Completed
* **Description**: The "Add Income Source" modal's `_save()` function was not returning `true` on successful database insert, causing the modal to remain open after a successful add. Added explicit `return true` on success so the modal closes correctly.

---

### 🆕 Session 7 — Insights, Alerts & Sponsor System

#### R29. App-Wide Insights & Alerts Engine
* **Status**: ✅ Completed
* **Description**:
  * Built `js/lib/insights.js` — a central `WPInsights` module with a rule registry. Each page registers condition functions and message templates. After data loads, `WPInsights.evaluate()` injects animated insight cards with colour-coded severity levels (`critical`/`warning`/`info`/`success`) and dismiss buttons.
  * **30+ rules** covering: income diversification, FX exposure, tax burden, food spending ratios, subscription costs, debt-to-income ratio, negative amortization, asset concentration, emergency fund coverage, insurance gaps, savings rate, and high-inflation environment.
  * Insights wired into: **Dashboard**, **Income**, **Expenses**, **Debt Planner**, **Balance Sheet**, and **Insurance** pages.
  * New CSS: `.insights-strip`, `.insight-card`, `.insight-info/warning/critical/success` with fade-in animation.

#### R30. Sponsor Banner Monetisation System
* **Status**: ✅ Completed (placeholder — awaiting confirmed sponsors)
* **Description**:
  * Built `js/lib/sponsor.js` — `WPSponsor` module renders vetted sponsor banners only when the user lacks a specific product.
  * Sponsor slots currently active on **Balance Sheet** (insurance) and **Insurance** page.
  * Products covered: Insurance, Investment, Emergency Fund, Debt Refinancing, Pension.
  * All banners show a "Sponsored" label. Only vetted sponsors are ever featured.
  * **Action needed**: When sponsors are confirmed, update `SPONSORS` config in `js/lib/sponsor.js` with `{ name, logo, url, cta, available: true }`.

#### R31. Live Macroeconomic Data Feed (`/api/econ`)
* **Status**: ✅ Completed
* **Description**:
  * New server route `GET /api/econ` serves `server/data/econ-ng.json`.
  * Dashboard fetches this on every load and populates the macro card dynamically (inflation, MPR, GDP per capita, FX rates, foreign reserves).
  * Data file is manually maintained — update figures when NBS/CBN publish new releases (monthly for inflation, quarterly for GDP).
  * **How to update**: Edit `server/data/econ-ng.json` with latest values and commit.

#### R32. Social Sharing & Watermarked Image Export (Reports)
* **Status**: 🔲 Planned — GitHub Issue open
* **Description**:
  * Add "Share" button to Reports page using Web Share API (mobile) and `html2canvas` PNG download (desktop).
  * PNG download stamps the `pul.llc` watermark on canvas before saving.
  * Share targets: X (Twitter), WhatsApp, copy link.

---

### LOW PRIORITY / FUTURE

---

#### R16. Insurance Policies & Coverage Analysis
* **Status**: ✅ Completed
* **Goal**: Build an insurance tracker page analyzing sum assured vs. needs (Life, Health, Motor, Property) and flagging coverage gaps.
* **Proposed Files**: `js/pages/insurance.js`
* **Description**: Created a standalone needs assessment questionnaire (comprehensive 5-step wizard covering personal profile, goals, investment preferences, risk tolerance, and tobacco use) with built-in Sharia-compliant Takaful preferences and product recommendations. Added dynamic policy management tables and updated onboarding steps to align.

---

#### R17. Budget Planner / 50-30-20 Rule
* **Status**: 🔲 Not Started
* **Goal**: Guided budget creation with automated categorization against the 50/30/20 framework.

---

#### R18. Comprehensive Financial Reports Enhancements
* **Status**: ✅ Completed
* **Description**: Added Asset Allocation and Liabilities Allocation Doughnut charts to visual layouts. Streamlined `@media print` rules for gorgeous, clean multi-page PDF generation.
* **Files**: `js/pages/reports.js`

---


## Application Module Inventory

| Module | File | Status |
|--------|------|--------|
| Dashboard | `js/pages/dashboard.js` | ✅ Active |
| Income Manager | `js/pages/income.js` | ✅ Active |
| Expense Tracker | `js/pages/expenses.js` | ✅ Active |
| Balance Sheet | `js/pages/balance-sheet.js` | ✅ Active |
| Cash Flow | `js/pages/cashflow.js` | ✅ Active |
| Debt Planner | `js/pages/debt.js` | ✅ Active |
| Emergency Fund | `js/pages/emergency-fund.js` | ✅ Active |
| Goals Tracker | `js/pages/goals.js` | ✅ Active |
| Reports | `js/pages/reports.js` | ✅ Active |
| Retirement Planner | `js/pages/retirement.js` | ✅ Active |
| Estate Planner | `js/pages/estate-planner.js` | ✅ Active |
| Insurance Tracker | `js/pages/insurance.js` | ✅ Active |
| Calculators Hub | `js/pages/calculators.js` | ✅ Active |
| Onboarding Wizard | `js/pages/onboarding.js` | ✅ Active |
| Settings | `js/pages/settings.js` | ✅ Active |

### New Libraries

| Library | File | Purpose |
|---------|------|---------|
| Insights Engine | `js/lib/insights.js` | App-wide contextual alerts & financial insight rules |
| Sponsor Module | `js/lib/sponsor.js` | Vetted sponsor banners when user lacks a product |

---

## E2E and Unit Test Coverage

#### Playwright E2E Suite
* **Status**: ✅ Green on Chromium + Firefox (120 tests); WebKit/mobile runnable (118/120 — offline PWA flaky on WebKit only)
* **Suites**: `01-auth` … `09-smoke` (auth, dashboard, income/expenses, debt, balance sheet, calculators, reports, settings/PWA, full-route smoke incl. Settings + Insurance)
* **Unit**: Jest — 30/30 passing
* **CI**: Runs automatically on push/PR via GitHub Actions
* **Local recipe**: `npm run dev` (terminal 1) + `npx playwright test --project=chromium` (or chromium+firefox)

---

### Session 8 — 2026-07-12 — E2E Troubleshoot & Stabilization

#### R33. Playwright E2E suite repair & hardening
* **Status**: ✅ Completed
* **Context**: Prior run artifacts showed mass failures (`ERR_CONNECTION_REFUSED`, missing browser deps, stale auth). Re-reviewed `current_plans.md`, `REQUIREMENTS.md`, `TESTING.md`, then diagnosed and fixed root causes.
* **Root causes fixed**:
  1. **Dev server required** — E2E targets `http://localhost:3000`; without `npm run dev`, all navigations fail.
  2. **Global setup login detection** — waited for non-existent selectors (`.dashboard`, `#dashboard-page`). Real markers are `#dash-kpis`, `#dash-greeting`, `.app-shell`. Login succeeded but auth state was not saved.
  3. **Hash route inconsistency** — app registers `/settings`, etc.; tests used `#settings` / `#dashboard` (no leading slash), so Settings currency test never saw `#set-currency` and smoke routes could silently fall back to Dashboard.
  4. **Watermark test called `window.print()`** — blocked/hung Firefox on Export PDF; now asserts print header + CSS `pul.llc` watermark rule without opening the print dialog.
  5. **Smoke treated third-party 5xx as app failures** — Google Fonts 503s failed Firefox; smoke now ignores non–same-origin responses.
* **App fix**:
  * `js/router.js` — normalize bare hashes (`#settings` → `/settings`); listen for `hashchange` so direct hash navigations (tests, deep links) dispatch correctly.
* **Test / docs files touched**:
  * `tests/e2e/global-setup.js`
  * `tests/e2e/02-dashboard.spec.js`, `06-calculators.spec.js`, `07-reports.spec.js`, `08-settings-pwa.spec.js`, `09-smoke.spec.js`
  * `TESTING.md` — local recipe, hash-route note, known env issues table
* **Verification (this session)**:
  | Layer | Result |
  |-------|--------|
  | Jest unit | 30 passed |
  | Chromium E2E | 60 passed |
  | Firefox E2E | 60 passed |
  | WebKit + mobile | 118 passed / 2 failed (offline PWA `setOffline`+`reload` WebKit internal error only) |
* **Environment notes (not code)**:
  * Node is via **fnm** — `sudo npx` fails (sudo strips PATH); use `sudo apt-get install …` or `eval "$(fnm env)"` first.
  * Pop!_OS apt noise: Launchpad PPA `system76/pop` has **no `noble` suite** — disable `system76-ubuntu-pop-noble.sources` so `apt update` is clean (system already has WebKit libs; WebKit launches OK).
* **Follow-ups (not done today)**:
  * Harden offline PWA test for WebKit/mobile (the 2 remaining failures).
  * R17 Budget Planner / 50-30-20 still planned.
  * Sponsor partners (#28) and recurring macro data (#29) still open.

---

## 🗓️ Open GitHub Issues

| Issue | Title | Priority | Status |
|-------|-------|----------|--------|
| [#27](https://github.com/olafinancial/olafinancial/issues/27) | Social sharing & watermarked PNG export from Reports | High | ✅ Closed |
| [#28](https://github.com/olafinancial/olafinancial/issues/28) | Confirm sponsor partners & activate sponsor banners | High | 🔲 Open |
| [#29](https://github.com/olafinancial/olafinancial/issues/29) | Monthly macro data update — NBS/CBN economic indicators | Recurring | 🔲 Open |
| [#30](https://github.com/olafinancial/olafinancial/issues/30) | Complete per-page currency selectors (cashflow, EF, goals) | Medium | ✅ Closed |
| [#31](https://github.com/olafinancial/olafinancial/issues/31) | Scheduled / email digest reports | Medium | ✅ Closed |
| [#32](https://github.com/olafinancial/olafinancial/issues/32) | Budget Planner / 50-30-20 guided creation | Low | 🔲 Planned |
| [#33](https://github.com/olafinancial/olafinancial/issues/33) | Comprehensive Reports page overhaul (PDF, charts, statements) | Low | ✅ Closed |

