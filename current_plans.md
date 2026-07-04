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
* **Status**: 🔲 Not Started
* **Source**: *"need more currencies, especially dubai and China and CFA (West African Currency), Kenya, Ghana, etc. / Canada, South Africa, Kenya, Ghana, Dubai, Saudi Arabia"*
* **Scope**:
  * Add to currency dropdown everywhere: AED (UAE Dirham), CNY (Chinese Yuan), XOF/XAF (CFA Franc), KES (Kenyan Shilling), GHS (Ghanaian Cedi), CAD (Canadian Dollar), ZAR (South African Rand), SAR (Saudi Riyal), AUD (Australian Dollar)
  * Update `WPUtils.convert()` exchange rate map in `js/utils.js`
  * Update all currency dropdowns in all income, expense, asset, liability, and page-level currency selector forms
* **Files**: `js/utils.js`, `js/config.js`, `js/pages/income.js`, `js/pages/expenses.js`, `js/pages/balance-sheet.js`, all pages with currency selectors

---

#### R2. Dashboard Insights Moved Above Charts
* **Status**: 🔲 Not Started
* **Source**: *"Dashboard: insights should be high up, so the user can read them when they log in. For now it's below the boxes that have trends; it should be above them"*
* **Scope**: Reorder dashboard layout so the Insights & Alerts card renders before the trend chart cards.
* **File**: `js/pages/dashboard.js`

---

#### R3. Dashboard Greeting Uses "Daily" Not "Monthly"
* **Status**: 🔲 Not Started
* **Source**: *"On the dashboard, the day should read daily, not monthly"*
* **Scope**: Change the period label in the dashboard header from "Financial overview · [Month]" to show today's date (e.g. "Financial overview · Friday, 4 July 2025").
* **File**: `js/pages/dashboard.js`

---

#### R4. Global Base Currency Setting (App-Wide)
* **Status**: 🔲 Not Started
* **Source**: *"Calculator page and all pages on the website. Allow the user to specify the base currency the website should use, or no currency unit"*
* **Scope**:
  * Add a prominent "Base Display Currency" selector either in Settings/Profile or pinned to the top of the app.
  * Saving this preference overrides the per-page currency selector defaults.
  * Support "No currency unit" mode (just shows raw numbers without symbols).
* **Files**: `js/app.js`, `js/utils.js`, `js/pages/onboarding.js` (profile step)

---

#### R5. Rename "PAYE" Label to "Tax" App-Wide
* **Status**: 🔲 Not Started
* **Source**: *"under adding income, if I am earning $ then Nigerian tax laws don't apply to me. So remove 'PAYE' and replace with 'Tax' so it's more uniform"*
* **Scope**:
  * Replace all occurrences of "PAYE Tax" with "Tax" in income forms, KPI cards, and table headers.
  * The Tax Estimator section header stays as "Nigeria Tax Act 2025 — Tax Estimator" but the card labels become "Tax" not "PAYE Tax".
* **Files**: `js/pages/income.js`

---

#### R6. Investment Expense → Auto-Populate Balance Sheet (Double Entry)
* **Status**: 🔲 Not Started
* **Source**: *"Under Expenses, there should be an option 'investment.' So if I use $100 to buy Tesla, it should be an expense from my income, but the Tesla investment flows to the Asset side of the balance sheet. This will NOT replace adding an asset under the balance sheet, but if I select 'investment' it should give me those same options as I get when I add an asset, then it populates to the balance sheet. Called double entry."*
* **Scope**:
  * Add "Investment" as an expense category in the expense form.
  * When "Investment" is selected, reveal an expanded sub-form identical to the Add Asset form.
  * On save: create both the expense entry AND the asset entry automatically.
  * Display linked investment expenses in the expense table with an "→ Asset" indicator.
* **Files**: `js/pages/expenses.js`, `js/pages/balance-sheet.js`, `js/supabase-client.js`

---

#### R7. Retirement Contribution Rename + AVC/Gratuity Support
* **Status**: 🔲 Not Started
* **Source**: *"Under Balance sheet, add asset, there is a drop-down for Pension/RSA, please rename to 'retirement contribution', this will include RSA, and Additional Voluntary Contribution. Under retirement, for Nigeria, we only have 8/10% RSA pension contributions. Can you add AVC, which includes Additional Voluntary Contributions and Gratuity? AVC will also show up on Balance Sheet as an option to add, and also under Expenses as an option to add as an investment."*
* **Scope**:
  * Rename "Pension/RSA" → "Retirement Contribution" in asset type dropdowns.
  * Add AVC and Gratuity as sub-types under retirement contributions.
  * AVC appears in: Balance Sheet (add asset), Expenses (as investment sub-type), Retirement page.
  * On the Retirement page, show a dedicated AVC & Gratuity section with accumulated totals.
* **Files**: `js/pages/balance-sheet.js`, `js/pages/retirement.js`, `js/pages/expenses.js`

---

#### R8. Fixed Deposit (CD) Calculator
* **Status**: 🔲 Not Started
* **Source**: *"Can we add a calculator for Certificates of Deposit? Outside America it's called a Fixed Deposit. Here is a calculator for CD: https://www.calculatorsoup.com/calculators/financial/cd-calculator.php"*
* **Scope**:
  * Add a 9th tab to the Calculators Hub: **Fixed Deposit / CD Calculator**.
  * Inputs: Principal, Annual Interest Rate, Compounding frequency (Daily/Monthly/Quarterly/Semi-Annual/Annual), Term (months/years), Early Withdrawal option.
  * Outputs: Maturity Value, Total Interest Earned, Effective Annual Yield.
* **File**: `js/pages/calculators.js`

---

#### R9. Retirement Planning for Non-Nigerian Jurisdictions (US 401K etc.)
* **Status**: 🔲 Not Started
* **Source**: *"Retirement, this is for Nigeria. What if I am retiring under US laws? Can we ask, then apply the retirement law; the US will be 401K"*
* **Scope**:
  * Add a "Retirement Jurisdiction" selector on the Retirement page: Nigeria (RSA/PFA), United States (401K/IRA), United Kingdom (Pension), Canada (RRSP), Other.
  * Nigeria: Current 8% employee / 10% employer RSA + AVC/Gratuity.
  * US: 401K with 2025 contribution limits ($23,000 / $30,500 catch-up), Roth IRA, Traditional IRA.
  * UK/Canada: Simplified projections with correct terminology.
  * Other: Generic savings rate projections.
* **File**: `js/pages/retirement.js`

---

#### R10. Section-Level Goals with Social Sharing
* **Status**: 🔲 Not Started
* **Source**: *"In all sections, add a goal for the section that is automatically tracked. For example, I want to increase income by 5% or I want to reduce expenses by $500 per month. Make these shareable on Twitter/social media as a bragging right type thing."*
* **Scope**:
  * Add a "Set Goal" mini-widget to Income, Expenses, Debt, Emergency Fund, and Goals pages.
  * Each goal has a target (e.g. "Reduce expenses by ₦50,000/month") and tracks progress automatically.
  * "Share" button generates a branded image/text card shareable to Twitter/X, WhatsApp, and LinkedIn.
* **Files**: All major page files, new `js/pages/social-share.js` utility

---

### MEDIUM PRIORITY

---

#### R11. Net Income Allocation to Goals / Surplus Wizard
* **Status**: 🔲 Not Started
* **Source**: *"Create a method for Net Income to be allocated to Goals. Also, if you have a surplus, offer a questionnaire to determine where to allocate; can be another bucket for 'spend at will'."*
* **Scope**:
  * After calculating net cash flow, if a surplus exists, display an "Allocate Your Surplus" prompt.
  * User can split the surplus across: Goals (picks from existing goals), Emergency Fund top-up, Investment/Savings, Spend at Will bucket.
  * Show allocation progress visually.
* **Files**: `js/pages/dashboard.js`, `js/pages/goals.js`, `js/pages/cashflow.js`

---

#### R12. Stock Tracking on Retirement Page (Mark-to-Market)
* **Status**: 🔲 Not Started
* **Source**: *"On the retirement page we can add stock assets, with ticker, quantity, date of purchase, purchase price. Marking to market on a daily basis. Keeping a running total of these assets. Track the stocks."*
* **Scope**:
  * Add a stock holdings sub-section on the Retirement page.
  * Fields: Ticker symbol, Quantity, Purchase date, Purchase price, Current price (fetched from a free API).
  * Show: Cost basis, Current value, Gain/Loss, % return.
  * Running total feeds into retirement portfolio total.
* **File**: `js/pages/retirement.js`, new stock price API integration

---

#### R13. Scheduled / Email Reports
* **Status**: 🔲 Not Started
* **Source**: *"Each time customer logs in, allow person to choose daily, monthly, weekly, quarterly reports by their specs or setup to send weekly report by email on Sundays by default or on demand."*
* **Scope**:
  * Add a "Report Preferences" settings section.
  * Options: Daily digest / Weekly (default Sunday) / Monthly / Quarterly.
  * Email delivery requires backend integration (Supabase Edge Functions + email provider).
  * In-app: Show a "Generate Report" banner matching the selected cadence on login.
* **Files**: `js/pages/reports.js`, `supabase/functions/`, new `js/pages/settings.js`

---

#### R14. Emergency Fund Page — Updated Content & Guidance
* **Status**: 🔲 Not Started
* **Source**: *"Update 'How to Create an Emergency Fund' section..."*
* **Scope**: Replace the current informational text with the new step-by-step guide provided:
  1. List ALL expenses
  2. Separate discretionary from essential
  3. Open a dedicated savings/money market account
  * Include target language: 3–6 months essential expenses minimum; 6–12 months for self-employed.
* **File**: `js/pages/emergency-fund.js`

---

#### R15. Complete Per-Page Currency Selectors (Remaining Pages)
* **Status**: 🔲 Not Started (carried over)
* **Scope**: Propagate the display currency switcher to: Cash Flow, Debt Planner, Emergency Fund, Goals, Reports.
* **Files**: `js/pages/cashflow.js`, `js/pages/debt.js`, `js/pages/emergency-fund.js`, `js/pages/goals.js`, `js/pages/reports.js`

---

### LOW PRIORITY / FUTURE

---

#### R16. Insurance Policies & Coverage Analysis
* **Status**: 🔲 Not Started
* **Goal**: Build an insurance tracker page analyzing sum assured vs. needs (Life, Health, Motor, Property) and flagging coverage gaps.
* **Proposed Files**: `js/pages/insurance.js`

---

#### R17. Budget Planner / 50-30-20 Rule
* **Status**: 🔲 Not Started
* **Goal**: Guided budget creation with automated categorization against the 50/30/20 framework.

---

#### R18. Comprehensive Financial Reports Enhancements
* **Status**: 🔲 Not Started (carried over)
* **Goal**: Net worth trends, asset allocation chart, cash flow statement, better PDF export.
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
| Calculators Hub | `js/pages/calculators.js` | ✅ Active |
| Onboarding Wizard | `js/pages/onboarding.js` | ✅ Active |
| Settings | `js/pages/settings.js` | 🔲 Planned |
| Insurance Tracker | `js/pages/insurance.js` | 🔲 Planned |
