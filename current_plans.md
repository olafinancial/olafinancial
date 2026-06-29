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
* **Description**: Added a payoff strategy selector (Dropdown) on the Debt Planner page. Users can now choose between **Debt Avalanche** (highest APR first) and **Debt Snowball** (lowest balance first) to instantly compare total interest saved and payoff months.

#### 3. Automated Monthly Debt Payments & Manual Overrides
* **Status**: ✅ Completed
* **Description**: Added a checkbox on both the Balance Sheet Liability form and the Debt Planner form: *"I don't know the APR (Enter monthly payment manually)"*.
  * If unchecked, entering the APR and Balance automatically calculates the minimum monthly payment in real-time using standard amortized terms per debt type (Mortgage, Auto, Credit Card, Personal Loan).
  * If checked, the APR field is hidden and the monthly payment field becomes fully editable.

#### 4. Input Comma-Formatting & Caching
* **Status**: ✅ Completed
* **Description**: Masked all numeric currency inputs (Goals, Assets, Liabilities, Debt Extra Payments, Emergency Fund) to format with commas dynamically as you type. Service worker caching has been disabled during the active testing window to allow instant client updates.

---

### Session 2 — MVP Expansion, Estate Planning & Calculators

#### 5. Logged-Out Landing Page
* **Status**: ✅ Completed
* **Description**: Created a branded "logged out" page with option to sign in again, replacing the automatic redirect to onboarding.

#### 6. Mobile-Responsive Design & PWA (Add to Home Screen)
* **Status**: ✅ Completed
* **Description**: Fixed display issues across the app for mobile screens. Added PWA manifest, service worker, and Apple-specific meta tags so users can install the app to their iPhone or Android home screen before an app store launch.

#### 7. Comprehensive MVP Financial Service Features
* **Status**: ✅ Completed
* **Description**: Extended the app with additional functionality requested by the customer to make it a comprehensive financial service MVP, including retirement planning and estate planning modules.

#### 8. Estate & Legacy Planning (Onboarding + Full Diagnostic)
* **Status**: ✅ Completed
* **Files**: `js/pages/onboarding.js`, `js/pages/estate-planner.js`
* **Description**:
  * Added **Step 4: Estate & Legacy Planning** to onboarding to capture if the user has a Will and designated guardians early.
  * Built a 5-step legacy planner wizard with automated pre-population from existing profile and balance sheet data.
  * Implemented an objective scoring risk engine covering: Will, Living Trust, POAs, Beneficiaries, Guardianship, Business Succession, and Special Needs planning.
  * Renders a customized **Legacy Risk Report** with risk level alerts, identified gaps, prioritized action plans, and **Print to PDF** capability.

#### 9. Financial Calculators Hub (8 Calculators)
* **Status**: ✅ Completed
* **File**: `js/pages/calculators.js`
* **Description**: Built a premium tabbed Calculators Hub with 8 financial calculators:
  1. **Savings Goal** — Periodic saving amount needed to reach a target sum
  2. **Savings Calculator** — Future value simulation with compounding
  3. **Return on Investment (ROI)** — Gross return, total ROI, and annualized ROI
  4. **Simple Loan** — Simple interest with total cost breakdown
  5. **Detailed Loan** — Full compound interest solver with term-based payments
  6. **Car Loan** — Includes trade-in value, down payment, sales tax, and rate
  7. **Mortgage Payment** — Property tax, home insurance, and optional PMI
  8. **Inflation Impact** — Purchasing power depreciation over time

#### 10. Per-Page Display Currency Selectors
* **Status**: 🔶 Partially Completed (4 of 9 pages done)
* **Completed Pages**: Dashboard, Income, Expenses, Balance Sheet
* **Remaining Pages**: Cash Flow, Debt Planner, Emergency Fund, Goals, Reports
* **Description**: Added a dropdown currency switcher (NGN/USD/EUR/GBP) to individual page headers. Users can toggle their display currency per page, enabling Nigerians with foreign funds to view totals in any supported currency. Selection is saved to `localStorage` per page and all amounts are converted on the fly.

#### 11. Estate Planner Report Generation Bug Fix
* **Status**: ✅ Completed
* **Description**: Fixed the `_generateReport()` method to always trigger `_collectStepData()` on the current step before generating the report, and wrapped calculation loops in a robust try-catch boundary.

#### 12. Currency Selector Removed from Sidebar
* **Status**: ✅ Completed
* **Description**: Removed the global currency selector from the sidebar per user request — currency selection now lives on individual pages where it makes sense.

---

### Session 3 — Tax Residency, Disclaimers & Expense Enhancements

#### 13. Tax Estimator NaN Fix
* **Status**: ✅ Completed
* **Description**: Fixed the Annual Net Income and Annual PAYE Tax cards showing `NaN` by safeguarding the `_runTaxEstimator()` function against missing/invalid DOM elements and empty input values. Added validation warnings for invalid inputs.

#### 14. PAYE Tax — Nigerian Resident Restriction
* **Status**: ✅ Completed
* **Files**: `js/pages/onboarding.js`, `js/pages/income.js`
* **Description**:
  * Added a **Non-Resident (Outside Nigeria)** option to onboarding State of Residence.
  * For **Non-Residents**: PAYE Tax KPI card displays `N/A (Non-Resident)`, tax is excluded from net income calculations, and the Tax Estimator form is replaced with a disclaimer notice.
  * For **Nigerian Residents**: Full tax estimator and progressive bracket calculations continue to display normally.
  * Disclaimer: *"PAYE Tax and tax estimator features only apply to Nigerian Residents."*

#### 15. App Disclaimer Copy Update
* **Status**: ✅ Completed
* **File**: `js/config.js`
* **Description**: Updated the app-wide disclaimer to: *"Ola Financial provides financial calculations for informational and educational purposes only. It is not a licensed financial adviser. Always verify with a qualified Nigerian Chartered Accountant or financial planner before making financial decisions."*

#### 16. Recurring Expense Frequency Options
* **Status**: ✅ Completed
* **File**: `js/pages/expenses.js`
* **Description**: When toggling "Recurring expense" on the add/edit expense form, a new frequency dropdown appears with options: **Weekly, Bi-weekly, Monthly, Quarterly, Annually, or Custom** (with a free-text input). Frequency is stored in the description field and displayed as a badge in the expense table (e.g. `Recurring (Weekly)`).

---

## Remaining Roadmap

### High Priority

#### 1. Complete Per-Page Currency Selectors
* **Goal**: Propagate the display currency switcher to the remaining 5 pages: Cash Flow, Debt Planner, Emergency Fund, Goals, Reports.
* **Files**: `js/pages/cashflow.js`, `js/pages/debt.js`, `js/pages/emergency-fund.js`, `js/pages/goals.js`, `js/pages/reports.js`

### Medium Priority

#### 2. Insurance Policies & Coverage Analysis
* **Goal**: Build an insurance tracker page that analyzes sum assured vs. needs (e.g. Life, Health, Motor, Property) and flags coverage gaps.
* **Proposed Files**: `js/pages/insurance.js`

#### 3. Comprehensive Financial Reports Enhancements
* **Goal**: Enhance reports showing net worth trends, asset allocations, cash flow statements, and a PDF downloader function.
* **Files**: `js/pages/reports.js`

### Low Priority / Future

#### 4. Investment Portfolio Tracker
* **Goal**: Track investment holdings (stocks, bonds, mutual funds) with performance metrics.

#### 5. Budget Planner / 50-30-20 Rule
* **Goal**: Guided budget creation with automated categorization against the 50/30/20 framework.

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
