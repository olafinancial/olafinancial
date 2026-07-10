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
* **Status**: 🔲 Planned (Configured in open GitHub Roadmap issues)

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
* **Status**: 🔲 Planned (Configured in open GitHub Roadmap issues)

---

#### R14. Emergency Fund Page — Updated Content & Guidance
* **Status**: ✅ Completed
* **Description**: Guidance text replaced with step-by-step 3-6 months metrics instructions.

---

---

#### R15. Complete Per-Page Currency Selectors (Remaining Pages)
* **Status**: 🔲 Planned (Configured in open GitHub Roadmap issues) `js/pages/cashflow.js`, `js/pages/debt.js`, `js/pages/emergency-fund.js`, `js/pages/goals.js`, `js/pages/reports.js`

---

### 🆕 Requirements from WhatsApp PDF (Copy of reqs.pdf)

#### R19. Show/Hide Password Toggle
* **Status**: 🔲 Not Started
* **Description**: Add a show/hide password toggle (eye icon) to Login and Sign-up fields.

#### R20. Income Form Structural Refinements
* **Status**: 🔲 Not Started
* **Description**: 
  * Add **biweekly** option to income frequencies.
  * Dynamically show "PAYE" tax & pension deductions sub-sections *only* when "Active Income" (Salary) is selected.
  * Show plain "Tax" (or "property tax") when "Passive" or "Investment" income is selected.
  * Include "semi-annual" option to the frequency dropdown for investments (dividends).

#### R21. Asset ROI & Valuation Inputs (Rolex vs. Stock)
* **Status**: 🔲 Not Started
* **Description**:
  * If an asset is toggled as "income-generating", allow input fields for Name, Cost per unit, Quantity, and Total cost to track average cost basis and calculate accurate ROI.
  * Separate non-financial assets (e.g. Rolex) from financial stock assets that track mark-to-market.
  * Allow tracking historical price changes of an asset (price movement trends over time).

#### R22. APY Nigeria Thresholds & Crash Fixes
* **Status**: 🔲 Not Started
* **Description**:
  * Fix bug: If user clicks "Add Asset" without entering a name, the modal crashes and disappears.
  * Raise the maximum APY boundary limit to 30% (current cap at 9% is too low for Nigerian yields).

#### R23. Log Prepaid Expenses (Rent in Advance)
* **Status**: 🔲 Not Started
* **Description**: Implement a system to log pre-paid payments (such as paying rent for two years in advance) and amortize them monthly.

#### R24. Branded Watermarks & Macroeconomic Dashboard
* **Status**: 🔲 Not Started
* **Description**:
  * Add watermarks (`pul.llc`) to printable reports for sharing.
  * Create an **Economic Dashboard** pulling Nigeria's GDP growth rate, monthly inflation, FX rates ($ and GBP), MPR (Monetary Policy Rate), and reserves using data from the CBN and NBS.
  * Include a Sharia-compliant (Takaful) insurance preference question during onboarding.

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
