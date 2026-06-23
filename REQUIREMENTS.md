# Financial HealthCheck Platform — Product Requirements Document

**Version:** 1.1  
**Date:** June 19, 2026 (Regulatory research completed June 19, 2026)  
**Prepared by:** Antigravity (AI Coding Assistant)  
**Source Documents:**
- `Gmail - financial planning website.pdf` (Kalu A. Aja concept email to Sabrina H, Jun 11 2026)
- `Financial HealthCheck Workbook Sabrina.xlsx` (4-sheet reference workbook)
**Primary Stakeholders:** Sabrina H (sabrinahill@gmail.com), Kalu A. Aja (kaluaja@gmail.com)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Vision & Goals](#2-project-vision--goals)
3. [Target Audience & Market Context](#3-target-audience--market-context)
4. [Nigerian Regulatory & Legal Compliance Framework](#4-nigerian-regulatory--legal-compliance-framework)
5. [Technology Stack](#5-technology-stack)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Architecture](#8-data-architecture)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Security Requirements](#10-security-requirements)
11. [Mobile Expansion Roadmap](#11-mobile-expansion-roadmap)
12. [Benchmarks & Competitive References](#12-benchmarks--competitive-references)
13. [Open Questions & Decisions Needed](#13-open-questions--decisions-needed)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

The **Financial HealthCheck Platform** is a high-performance personal finance web application designed to help Nigerian users comprehensively track, analyze, and optimize their financial health. It digitalizes the logic embedded in the Financial HealthCheck Workbook (Excel) into an interactive, data-driven web experience.

The platform is envisioned as an **active financial coach** - not merely a tracker - that uses the user's own data to generate personalized budgets, debt repayment strategies, retirement projections, tax insights, and insurance gap analyses. The platform is built mobile-first and cross-platform ready, targeting eventual deployment to Android and iOS (via Flutter) if web adoption proves strong.

All monetary values are denominated in **Nigerian Naira (N / NGN)** by default, with optional multi-currency support for diaspora users.

---

## 2. Project Vision & Goals

### 2.1 Vision Statement

> "To be the most trusted personal finance companion for Nigerians, transforming complex financial data into clear, actionable pathways to wealth and financial independence."

### 2.2 Primary Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Empower users to understand their true financial health | User completes onboarding and sees a full financial snapshot |
| G2 | Shift users from active income dependency toward passive income growth | Passive Income % KPI tracked over time |
| G3 | Provide proactive debt reduction and savings guidance | Debt avalanche plan generated for every indebted user |
| G4 | Ensure compliance with all Nigerian financial regulations | Zero regulatory violations at launch |
| G5 | Build on open-source stack deployable for near-zero cost | Hosted on GitHub Pages + Supabase free tier at MVP |
| G6 | Path to mobile: web-first, Flutter-ready architecture | Android/iOS launch within 12 months of web adoption |

### 2.3 Benchmarks / Inspirational Platforms

- **Monarch Money** (https://app.monarch.com) - goal tracking, visual dashboards
- **Quicken Simplifi** - budget optimization, spending categories
- **Quicken Business & Personal** - asset/liability management, cash flow statements

---

## 3. Target Audience & Market Context

### 3.1 Primary User Persona

| Attribute | Description |
|-----------|-------------|
| Geography | Nigeria (primary); Nigerian diaspora (secondary) |
| Age | 22 - 55 years old |
| Income | Middle class to upper-middle class (N150,000 - N5,000,000+/month) |
| Education | University educated; comfortable with digital tools |
| Language | English (Nigerian English) |
| Device | Smartphone first (Android ~75% market share in Nigeria), desktop secondary |
| Pain Points | Informal budgeting, lack of visibility into net worth, lack of structured retirement planning |
| Financial Goals | Debt freedom, property ownership, education funding, retirement security |

### 3.2 Nigerian Market Context

- **Currency:** Nigerian Naira (NGN)
- **Banking penetration:** ~45% formally banked; growing mobile money usage
- **Internet penetration:** ~55% (primarily mobile broadband)
- **Common investment vehicles:** Treasury Bills (T-Bills), FGN Bonds, NSE equities, fixed deposits, real estate
- **Common expenses in workbook:** Household staff salaries, generator fuel ("Power Supply"), school fees, Naira-denominated insurance premiums - all require localization
- **Pension System:** Contributory Pension Scheme (CPS) regulated by **PENCOM** - employer + employee contributions, **Retirement Savings Account (RSA)**

---

## 4. Nigerian Regulatory & Legal Compliance Framework

> **IMPORTANT:** This app handles sensitive personal financial data and may offer financial planning advice. It must comply with all applicable Nigerian laws. The following requirements are **mandatory** for launch.

### 4.1 Data Protection - Nigeria Data Protection Act 2023 (NDPA) + GAID 2025

> **CRITICAL UPDATE:** The NDPR 2019 has been **fully superseded**. The governing law is the **Nigeria Data Protection Act (NDPA) 2023**, now implemented via the **General Application and Implementation Directive (GAID) 2025** (effective September 19, 2025). "NDPR compliance" is no longer sufficient. Registration with the **Nigeria Data Protection Commission (NDPC)** — the new regulator — is mandatory.

A personal finance app handling sensitive financial data is classified as a **Data Controller/Processor of Major Importance (DCPMI)** — subject to the highest tier of obligations.

| Requirement | Details |
|-------------|------|
| **NDPC Registration** | Must register with NDPC (tiered: Ultra High / Extra High / Ordinary High based on data sensitivity and volume) |
| **Annual Compliance Audit (CAR)** | Annual Data Protection Compliance Audit Report must be submitted to NDPC |
| Lawful basis for processing | Obtain explicit user **consent** before collecting PII; pre-ticked boxes prohibited |
| **DPIA Required** | Data Protection Impact Assessment mandatory — app involves financial profiling and large-scale sensitive data |
| Data minimization | Collect only data necessary for stated purposes |
| Right to erasure | Users can request deletion of all their data |
| Data breach notification | Notify NDPC within **72 hours** of discovering a breach |
| Privacy Policy | Must be published, written in plain English, accessible before sign-up |
| Data residency | CBN mandates payment transaction data stored locally by **January 1, 2027**; plan hosting accordingly |
| **DPO Appointment** | Mandatory appointment of a qualified Data Protection Officer (DPO) |
| Cross-border transfers | Transfers outside Nigeria only permitted via Standard Contractual Clauses (SCCs) or Binding Corporate Rules (BCRs) |
| **Penalty** | Up to **2% of annual gross revenue** OR **₦10 million** (whichever is higher) for major violations |

### 4.2 Financial Advisory Disclaimers - SEC Nigeria & CBN

| Requirement | Details |
|-------------|---------|
| Not a licensed advisor | The platform **must display a clear disclaimer** that it is a financial planning tool, NOT a licensed investment advisor |
| SEC Nigeria license | Full investment advisory/portfolio management requires a license from the **Securities and Exchange Commission (SEC Nigeria)**. The MVP must stay within "financial planning tool" scope to avoid this requirement |
| CBN regulations | Do **not** facilitate actual money transfers, payments, or hold user funds without a CBN Payment Service license |
| Advisory disclaimer | Every report, recommendation, and projection must include: *"This analysis is for informational purposes only and does not constitute financial advice. Consult a qualified financial advisor for personalized guidance."* |

### 4.3 Taxation - Federal Inland Revenue Service (FIRS)

The platform's **Tax Optimization Module** must reflect current Nigerian tax law:

> **CRITICAL UPDATE (2026):** The **Nigeria Tax Act 2025** was signed in June 2025 and is **effective January 1, 2026**. This replaces PITA and significantly changes the tax brackets. All tax calculations must use the new framework.

**Personal Income Tax (PIT) — Nigeria Tax Act 2025 (effective Jan 1, 2026):**

| Annual Taxable Income (NGN) | Marginal Rate |
|-----------------------------|---------------|
| First ₦800,000 | **0% (tax-free)** |
| ₦800,001 – ₦3,000,000 (next ₦2.2M) | **15%** |
| ₦3,000,001 – ₦12,000,000 (next ₦9M) | **18%** |
| ₦12,000,001 – ₦25,000,000 (next ₦13M) | **21%** |
| ₦25,000,001 – ₦50,000,000 (next ₦25M) | **23%** |
| Above ₦50,000,000 | **25%** |

**Key changes from old PITA:**
- Tax-free threshold raised from ₦300,000 → **₦800,000 per annum**
- National minimum wage earners (≤₦70,000/month = ₦840,000/year) are **fully exempt**
- Consolidated Relief Allowance (CRA) **abolished** — replaced with simplified deductions
- **New Rent Relief:** 20% of annual rent, capped at **₦500,000** (tax-deductible)
- Pension contributions (employee's 8%) remain **tax-deductible**
- Framework unified into a single Nigeria Tax Act

**Taxable Income Calculation:**
```
Gross Emolument
- Pension Contribution (8% of basic + housing + transport allowance)
- Rent Relief (20% of annual rent, max ₦500,000)
- Other allowable deductions
= Taxable Income → Apply progressive brackets above
```

**Other Taxes:**
- **Value Added Tax (VAT):** 7.5% — applies to app subscription fees if annual turnover ≥ ₦25 million
- **Capital Gains Tax (CGT):** 10% on disposal of chargeable assets (stocks, property)
- **Withholding Tax (WHT):** Dividends = 10% (final); Interest income = 10% (final)
- **T-Bills and FGN Bonds:** **Tax-exempt** for individual investors — a key selling point
- **Electronic Money Transfer Levy (EMTL):** ₦50 flat fee on transfers ≥ ₦10,000 (only relevant if app processes payments)

**Key tax features the platform must support:**
- Display estimated PIT liability using 2026 Nigeria Tax Act brackets
- Calculate post-tax net income with automatic rent relief and pension deduction
- Flag VAT implications on business-related expenses
- Identify potential tax deductions (pension VAC, NHF at 2.5% of basic, life assurance premiums)
- Alert users when income thresholds change tax brackets
- Display WHT implications on investment income
- Highlight T-Bill/FGN Bond tax exemption as an investment advantage

### 4.4 Pension - PENCOM (Pension Commission)

| Item | Requirement |
|------|-------------|
| Contributory Pension Scheme | Employer: minimum 10% of monthly emolument; Employee: minimum 8% |
| RSA (Retirement Savings Account) | Track RSA balance and projected value at retirement |
| PFA selection | Users can note their chosen Pension Fund Administrator (PFA) |
| Retirement age | Minimum retirement age: **50 years** (voluntary); **60 years** (mandatory) |
| Voluntary Additional Contribution (VAC) | Support tracking of voluntary top-ups to RSA (tax deductible) |
| Retirement benefit | Lump sum (25% of RSA if under 50) + programmatic withdrawal or annuity |
| **Micro Pension Plan (MPP)** | Self-employed / informal sector workers (businesses < 3 employees) — flexible contributions; 40% contingent (accessible) + 60% retirement (locked until 50) |

### 4.5 Consumer Protection - FCCPC

- All data practices must comply with the **Federal Competition and Consumer Protection Act (FCCPA) 2018**
- The **FCCPC Digital, Electronic, Online, or Non-Traditional (DEON) Consumer Lending Regulations 2025** apply **only if** the app includes any lending or BNPL features (not required for MVP)
- No dark patterns in UI; no deceptive subscription schemes
- Clear "opt-out" and "delete account" flows
- Penalty for violations: **₦50M–₦100M** fine OR **1% of annual turnover**

### 4.6 IT / Digital Compliance - NITDA

- Register with NITDA if classified as a "critical national information infrastructure" operator (typically applies at significant scale; monitor threshold)
- Follow **NITDA Accessibility Standards** for government-recognized platforms
- Local content: preference for Nigerian-developed software components where available

### 4.7 NDIC (Deposit Insurance)

> **Updated May 2024:** NDIC coverage was significantly increased from ₦500,000 to ₦5,000,000 for commercial banks.

| Institution Type | NDIC Coverage Per Depositor |
|-----------------|-----------------------------|
| Deposit Money Banks (commercial banks) | **₦5,000,000** |
| Mobile Money Operators (MMOs) | **₦5,000,000** |
| Non-Interest Banks | **₦5,000,000** |
| Microfinance Banks (MFBs) | **₦2,000,000** |
| Payment Service Banks (PSBs) | **₦2,000,000** |

- Flag in balance sheet view when savings in any single institution exceed the relevant coverage limit
- Display institution-type specific coverage limit for each bank/account the user lists
- Source: NDIC Act (amended); approximately **98.98%** of DMB depositors are now fully covered

### 4.8 Recent Regulatory Changes Alert

> **WARNING:** Nigerian financial regulations are evolving rapidly. The following changes in 2024–2026 directly affect this app's compliance requirements:

| Change | Effective | App Impact |
|--------|-----------|------------|
| **Nigeria Tax Act 2025** — new PIT brackets, ₦800K tax-free threshold | Jan 1, 2026 | All tax logic must use new brackets |
| **NDPA 2023 + GAID 2025** — supersedes NDPR 2019 | Sep 19, 2025 | NDPC registration mandatory; DPO required |
| **ISA 2025** — digital assets classified as securities, new CMO capital requirements | Jan 2025/Jan 2026 | Investment features require SEC review |
| **NDIC Coverage Increase** — ₦500K → ₦5M for commercial banks | May 2024 | Update all UI messaging on deposit insurance |
| **CBN Data Localization** — payment data must be stored locally in Nigeria | Jan 1, 2027 | Plan hosting architecture now |
| **FCCPC DEON Regulations 2025** — digital lending framework | 2025 | Required only if lending features added |
| **SEC CMO Capital Requirements** — ₦50M min for Investment Advisers (corporate) | Jan 16, 2026 | Required only if personalized investment advice offered |

---

## 5. Technology Stack

### 5.1 Guiding Principles

- **Open-source first:** Prefer OSS solutions with no proprietary lock-in
- **Low/zero cost at MVP:** Use free tiers for initial launch
- **Flutter-ready:** Architecture must support code-sharing with future Flutter mobile app
- **Performance:** Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1

### 5.2 Approved Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend (Web MVP)** | HTML5 + Vanilla CSS + Vanilla JavaScript | Max performance, zero framework overhead, no bundle bloat |
| **Frontend (Mobile Future)** | Flutter (Dart) | Google-backed OSS, cross-platform Android + iOS, code-sharing with web via Flutter Web |
| **Backend / Database** | Supabase (preferred) or Firebase | Supabase = open-source PostgreSQL-based BaaS; Firebase = Google's NoSQL BaaS |
| **Authentication** | Supabase Auth / Firebase Auth | Built-in email/password, OAuth2 (Google, etc.) |
| **Hosting** | GitHub Pages (static web app) | Free, CDN-backed, custom domain support |
| **Charts & Visualizations** | Chart.js (OSS) | Lightweight, responsive charts; no license cost |
| **PWA** | Service Worker + Web App Manifest | Installable on Android/iOS without app store |
| **CI/CD** | GitHub Actions | Free for public repos; automated deploy to GitHub Pages |
| **Version Control** | GitHub | Public repository for open-source community |

### 5.3 Architecture Overview

```
+-----------------------------------------------------------+
|                   GitHub Pages (CDN)                      |
|               HTML + CSS + JavaScript                     |
|        (Progressive Web App - installable)                |
+------------------------+----------------------------------+
                         | REST / Realtime
+------------------------v----------------------------------+
|              Supabase (Backend-as-a-Service)              |
|   PostgreSQL DB | Auth | Storage | Edge Functions         |
|   (self-hostable for future NGN data residency)          |
+-----------------------------------------------------------+
```

### 5.4 Future Mobile Architecture (Flutter)

```
+----------------------------------------------------------+
|              Flutter Application                          |
|  Android | iOS | Web (shared Dart business logic)         |
+----------------------------------------------------------+
        Same Supabase backend - no backend changes needed
```

---

## 6. Functional Requirements

> Requirements are tagged: **MVP** (launch), **v1.1** (post-launch), **v2.0** (mobile era)

### 6.1 User Onboarding & Profile [MVP]

#### FR-001: Interactive Onboarding Flow

- **Description:** The platform shall implement a CFP-style (Certified Financial Planner) diagnostic onboarding flow that collects:
  - Full name, email, age, state of residence (Nigerian state)
  - Employment status (salaried, self-employed, business owner, retired)
  - Target retirement age
  - Number of dependents
  - Risk tolerance (Conservative / Moderate / Aggressive)
  - Primary financial goals (select from list + custom)
- **Acceptance Criteria:** User cannot skip onboarding; progress saved if interrupted; data pre-populates all modules

#### FR-002: User Authentication

- **Description:** Secure sign-up and login via email/password and Google OAuth
- **MFA:** Optional 2FA (TOTP) for sensitive financial data
- **Session management:** Idle timeout after 15 minutes; re-authentication required
- **Acceptance Criteria:** Auth via Supabase Auth; JWT tokens; secure cookie storage

#### FR-003: Financial Profile Snapshot (Dashboard)

- **Description:** Landing page after login shows a "health score" snapshot:
  - Net Worth (NGN)
  - Monthly Cash Flow (positive/negative)
  - Emergency Fund status (% of target)
  - Passive Income % of total income
  - Debt-to-Asset Ratio
  - Retirement Readiness score

---

### 6.2 Income Management [MVP]

#### FR-010: Income Input & Categorization

- **Description:** Users shall categorize income into three types (matching workbook):
  - **Active Income** - salary, wages, freelance, business revenue
  - **Passive Income** - dividends, rent received, annuities, royalties
  - **Investment Income** - capital gains, T-bill yields, bond coupons, FGN bond returns
- **Fields:** Source name, gross amount (NGN), frequency (monthly/quarterly/annual), start date
- **Deductions tracked:** PAYE tax, pension (employee contribution 8%), NHF, cooperative deductions, union dues, other
- **Calculations:**
  - Net Active Income = Gross Active Income minus Deductions
  - Gross Passive Income = sum of all passive streams
  - Net Total Income = Net Active Income + Gross Passive Income
- **Acceptance Criteria:** Real-time calculation; supports multiple income sources per category

#### FR-011: Passive Income KPI

- **Description:** A persistent KPI widget shall display:
  - Passive Income as % of Total Income
  - Passive Income as % of Total Non-Discretionary Expenses
  - Trend line (monthly) showing growth toward financial independence

---

### 6.3 Expense Tracking & Categorization [MVP]

#### FR-020: Expense Entry

- **Description:** Users shall log expenses with:
  - Date, amount (NGN), merchant/description
  - Category (see categories below)
  - Discretionary / Non-Discretionary classification
  - Customizable time windows: 30, 60, 90, 180, 365 days

**Expense Categories (from workbook, localized for Nigeria):**

| Category | Sub-items |
|----------|-----------|
| **Housing** | Rent/Mortgage, Power Supply (generator), Water, Waste, Household staff salaries |
| **Transportation** | Auto Fuel, Auto Maintenance, Auto Licenses & Taxes, Auto Insurance, Taxi/Ride-hailing |
| **Education** | Children's school fees, Tuition (self), Exam fees |
| **Communication** | Phone bill, Internet/WiFi, Other subscriptions |
| **Interest / Debt** | Commercial loan repayments, Staff loan repayments, Credit card repayments, Other interest payments |
| **Insurance** | Health insurance, Home insurance, Life insurance |
| **Family Support** | Child support, Childcare, Dependent support |
| **Shopping** | Clothing/Jewellery, Household goods |
| **Entertainment** | Movies/concerts/social events, Holidays & travel |
| **Gifts & Charity** | Gifts, Charitable donations, Sponsorships |
| **Taxes** | State taxes, Federal taxes (if self-employed/business) |
| **Other** | Miscellaneous |

- **Acceptance Criteria:** Auto-categorization suggestions based on merchant name; manual override always available; recurring expense templates

#### FR-021: Budget Auto-Generation

- **Description:** Based on income and expense data, the system shall:
  - Identify spending excesses vs. income by category
  - Generate a proposed monthly budget
  - Recommend reallocations (e.g., reduce discretionary to accelerate debt payoff)
  - Display proposed budget alongside actual spending
- **Acceptance Criteria:** Budget generated on demand and after every monthly close

---

### 6.4 Visual Reporting [MVP]

#### FR-030: Expense Visualization

- **Description:** Dashboard shall include:
  - **Pie chart:** Expenses by category (color-coded)
  - **Stacked bar chart:** Discretionary vs. Non-Discretionary over time
  - **Line chart:** Monthly spend trend per category
  - **Table:** Full expense list with filters (date range, category, type)
- **Acceptance Criteria:** All charts render within 1 second; responsive on mobile; exportable as PNG

#### FR-031: Custom Report Generation

- **Description:** Users shall generate downloadable/printable reports for:
  - Net Worth Statement (selected period)
  - Net Cash Position Statement (selected period)
  - Income Statement
  - Expense Breakdown
  - Debt Schedule
- **Format:** PDF export; shareable link (time-limited)
- **Acceptance Criteria:** Report generation < 5 seconds; renders correctly on A4 paper

---

### 6.5 Assets & Liabilities (Balance Sheet) [MVP]

#### FR-040: Asset Tracking

Based on "Cashflow balance sheet 4" workbook sheet:

**Income-Generating Assets:**

| Asset Type | Fields |
|------------|--------|
| Savings & Checking accounts | Opening balance, interest rate, tenor, closing balance |
| Fixed Deposits | Opening balance, interest rate, tenor |
| Private Bonds | Balance, yield, maturity |
| FGN Bonds / T-Bills | Balance, yield, maturity |
| Equities (NSE stocks) | Shares, current price, dividend yield |
| REITs | Balance, yield |
| Mutual Funds | Units, NAV |
| Income-producing Property | Market value, rental income |
| Retirement Accounts (RSA/PFA) | Current balance, PFA name |
| Profit Share | Balance |

**Non-Income-Generating Assets:**

| Asset Type | Fields |
|------------|--------|
| Cash on hand | Amount |
| Cryptocurrency | Amount, token, valuation |
| Zero-dividend Securities | Market value |
| Land & Property (no rental) | Estimated market value |
| Art & Collectibles | Estimated value |
| Patents & IP | Estimated value |
| Furniture & Fixtures | Estimated value |
| Vehicles | Estimated value |
| Other | Description, value |

- **Acceptance Criteria:** Each asset has opening and closing balance per period; automatic calculation of total assets; coverage ratio computed

#### FR-041: Liability Tracking

**Interest-Bearing Liabilities:**

| Type | Fields |
|------|--------|
| Asset Financing (auto/equipment loans) | Balance, APR, monthly payment |
| Student Loans | Balance, APR, monthly payment |
| Mortgage | Balance, APR, monthly payment |
| Personal Loans | Balance, APR, monthly payment |
| Credit Cards | Balance, APR, minimum payment |
| Retirement-linked borrowing | Balance, APR |
| College Fund Loans | Balance, APR |
| Target Savings Funds (negative) | Balance |

**Non-Interest Liabilities:**
- Personal loans (0%), Company drawings, Government taxes owed, Accrued wages

#### FR-042: Balance Sheet Calculations

- **Net Worth** = Total Assets minus Total Liabilities
- **Coverage Ratio** = Total Assets / Total Liabilities
- **Cash Ratio** = Income-Generating Assets / Interest-Bearing Liabilities
- **Debt-to-Asset Ratio** = Total Liabilities / Total Assets x 100%
- **Period tracking:** Net worth calculated and stored at end of each month for trend analysis
- **NDIC alert:** Flag when savings in any single bank exceed N5,000,000

---

### 6.6 Debt Management [MVP]

#### FR-050: Debt Avalanche Plan

- **Description:** The system shall automatically:
  1. List all interest-bearing liabilities sorted by APR (highest first)
  2. Calculate minimum monthly payments
  3. Show total interest payable if only minimum payments made
  4. Generate an optimized payoff schedule ("Debt Avalanche" - attack highest APR first)
  5. Show interest savings from the avalanche vs. minimum-payment approach
  6. Allow user to input extra monthly payment amount to see accelerated payoff
- **Visual:** Timeline/Gantt-style debt payoff schedule
- **Acceptance Criteria:** Calculations accurate to N1; schedule updates in real-time as inputs change

---

### 6.7 Cash Flow Analysis [MVP]

#### FR-060: Three-Statement Cash Flow

Based on "Personal Cashflow5" workbook sheet, produce a cash flow statement with three sections:

| Section | Description | Workbook Mapping |
|---------|-------------|-----------------|
| **Operating Activities** | Day-to-day income and non-discretionary expenses | Total Income minus Operations Outflow |
| **Investment Activities** | Asset purchases/sales, investment contributions | Investment Outflow |
| **Financing Activities** | Loan repayments, debt proceeds | Financing Outflow |

- **Net Cash Flow** = Operating + Investment + Financing
- **Period:** Monthly, Quarterly, Annual views
- **Acceptance Criteria:** Auto-populated from income and expense entries; exportable

#### FR-061: Cash Flow Ratios

- Operating Cash Flow Ratio = Operating Activities / Total Expenses x 100%
- Investment-to-Income Ratio = Investment Outflow / Total Income x 100%
- Financing-to-Income Ratio = Financing Outflow / Total Income x 100%

---

### 6.8 Emergency Fund Tracker [MVP]

#### FR-070: Emergency Fund Module

- **Target Calculation:** Auto-computed as **3x monthly non-discretionary expenses**
- **Current Balance:** User inputs dedicated emergency fund account balance
- **Progress Bar:** Visual indicator (0%-100%+ of target)
- **Contribution Recommendation:** Suggested monthly contribution (from "Pay Yourself First" - PYF - section of workbook: default 5% of Net Income to Emergency Fund)
- **Alerts:** Notify user when balance drops below 2x monthly expenses (warning) or 1x (critical)
- **Acceptance Criteria:** Target recalculates whenever non-discretionary expenses change

---

### 6.9 Pay Yourself First (PYF) Module [MVP]

Based on workbook "CASHFLOW BUDGET 3" rows 28-35:

#### FR-080: Automated Fund Allocation

The system shall allow users to set percentage-based automatic allocations from Net Income:

| Allocation | Default % | Notes |
|------------|----------|-------|
| Emergency Fund | 5% | FR-070 |
| Extra Retirement Savings | 5% | On top of mandatory pension |
| College Fund | 0% (user-defined) | Per child |
| Mortgage Savings | 0% (user-defined) | Down payment target |
| Debt Interest Payoff | 0% (user-defined) | Accelerated repayment |
| Investment | 10% | Equities, T-Bills, Bonds |
| **Total PYF** | **20%** (default) | User-adjustable |

- Users can adjust percentages; system warns if total PYF < 10% or > 50%
- **Acceptance Criteria:** Recommended amounts shown in NGN and %; allocation changes reflected immediately in budget

---

### 6.10 Financial Goals Tracker [MVP]

Based on "goals sheet 1" workbook:

#### FR-090: Goal Creation

- User inputs: Goal name, target cost (NGN), target completion date, current savings (PV), expected return rate
- System calculates: Required monthly savings (PMT function), projected shortfall or surplus
- Pre-built goal templates:
  - Retirement
  - Mortgage / Property Purchase
  - College Fund
  - Emergency Fund (linked to FR-070)
  - Custom goals (unlimited)
- **Progress tracking:** Visual progress bar; monthly check-in prompts
- **Acceptance Criteria:** Financial math uses standard TVM (Time Value of Money) formulas; accurate to N100

#### FR-091: Goal-Based Budget Optimization

- System shall recommend budget adjustments to keep user on track for all active goals
- Conflicting goals shall be flagged with trade-off analysis
- **Acceptance Criteria:** Recommendations generated automatically when goals are behind schedule

---

### 6.11 Retirement Planning Module [MVP]

Based on "goals sheet 1" (Age, Desired Retirement Age, Period to Retire, pay-cycle count):

#### FR-100: Retirement Calculator

- **Inputs:**
  - Current age, target retirement age
  - Current RSA balance (PENCOM/PFA)
  - Monthly pension contribution (employer + employee)
  - Additional voluntary contributions
  - Expected annual return on RSA (historical average: ~10-12% for Nigerian PFAs)
  - Expected post-retirement monthly income need (NGN)
- **Calculations:**
  - Years/months to retirement
  - Number of remaining pay cycles
  - Projected RSA balance at retirement (FV formula)
  - Monthly income supported by projected RSA (annuity formula)
  - **Retirement Gap** = Required monthly income minus Projected monthly income
- **Optimization strategies:** Auto-generated if gap exists (increase VAC, reduce expenses, delay retirement by N years)
- **Acceptance Criteria:** Projections update in real-time; assumes Nigerian inflation rate (~18-22% - configurable) for real-value projections

---

### 6.12 Insurance Gap Analysis [v1.1]

#### FR-110: Insurance Assessment

- User inputs current insurance policies:
  - Life insurance (sum assured, premium)
  - Health insurance (plan tier, insurer)
  - Home/property insurance (coverage amount)
  - Vehicle insurance (third-party vs. comprehensive)
- System analyzes:
  - Life cover adequacy: Recommended = 10x annual income (or enough to clear all debts + 5 years income replacement)
  - Health plan tier vs. dependents and age
  - Property coverage vs. asset value
- **Gap alerts:** Color-coded flags for under-insured areas
- **Nigerian-specific insurers reference list:** AIICO, Leadway, AXA Mansard, Cornerstone, NAICOM-licensed providers
- **NAICOM note:** Display disclaimer that insurance recommendations are informational; consult a NAICOM-licensed broker
- **Acceptance Criteria:** Gaps identified with NGN amount and percentage shortfall

---

### 6.13 Tax Optimization Module [v1.1]

#### FR-120: Nigerian Tax Analysis

- **PAYE Calculator:** Based on user's gross income and allowances, compute:
  - Taxable income after CRA (N200,000 + 20% gross, whichever higher)
  - PIT liability per PITA progressive bands
  - Effective tax rate
  - Tax savings from pension contributions (VAC reduces taxable income)
- **Tax Impact Simulation:** Allow user to model "what-if" scenarios:
  - If I increase pension contributions by NX, my tax decreases by NY
  - If I earn NX from investment income, my total tax becomes NY
- **Deduction Discovery:**
  - Flag NHF (National Housing Fund) contributions (2.5% of basic salary, tax-deductible)
  - Flag NSITF contributions
  - Flag life assurance premiums (deductible under PITA)
- **CGT Awareness:** Alert when asset disposal may trigger 10% CGT
- **Regulatory Alerts:** Notification when income rises to next tax bracket
- **Acceptance Criteria:** Calculations align with current FIRS guidelines; legal disclaimer on every tax screen

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5 seconds on 3G |
| Largest Contentful Paint (LCP) | < 2.5 seconds |
| Time to Interactive (TTI) | < 3.5 seconds |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Dashboard load time | < 2 seconds after authentication |
| Report generation | < 5 seconds |
| Offline support (PWA) | Core dashboard readable offline; data syncs when reconnected |

### 7.2 Scalability

- Support minimum **10,000 concurrent users** at launch
- Supabase free tier handles up to 50,000 monthly active users
- Database: PostgreSQL on Supabase; horizontal scaling available via paid tier
- Static assets on GitHub Pages CDN - scales automatically

### 7.3 Availability

- Target **99.5% uptime** (GitHub Pages SLA + Supabase SLA)
- Maintenance windows: Sundays 2:00-4:00 AM WAT (West Africa Time, UTC+1)

### 7.4 Accessibility

- WCAG 2.1 Level AA compliance
- NITDA Accessibility Standards
- Full keyboard navigation
- Screen reader support (ARIA labels on all interactive elements)
- Minimum contrast ratio: 4.5:1

### 7.5 Internationalization (i18n)

- Primary: English (Nigerian English)
- Currency: NGN default; USD optional for diaspora users
- Date format: DD/MM/YYYY (Nigerian standard)
- Number format: N1,000,000.00 (comma thousands separator)
- Future: Yoruba, Igbo, Hausa language support

### 7.6 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari (mobile) | Last 2 versions (iOS) |
| Samsung Internet | Last 2 versions |
| Opera Mini | Basic functionality |

---

## 8. Data Architecture

### 8.1 Core Database Schema (PostgreSQL / Supabase)

```sql
-- Users
users (id, email, created_at, profile_data JSONB)

-- Financial Profile
user_profiles (user_id, age, retirement_age, state, employment_status, risk_tolerance)

-- Income
income_entries (id, user_id, type[active|passive|investment], source, gross_amount, 
                frequency, deductions JSONB, created_at, period_month)

-- Expenses  
expense_entries (id, user_id, date, amount, category, sub_category, 
                 is_discretionary, description, is_recurring)

-- Assets
assets (id, user_id, asset_type, name, is_income_generating, 
        open_balance, interest_rate, tenor, close_balance, period_month)

-- Liabilities
liabilities (id, user_id, liability_type, name, is_interest_bearing,
             open_balance, apr, monthly_payment, close_balance, period_month)

-- Goals
financial_goals (id, user_id, goal_name, target_amount, target_date, 
                 current_savings, expected_return_rate, goal_type)

-- Insurance Policies
insurance_policies (id, user_id, policy_type, insurer, sum_assured, 
                    premium, coverage_start, coverage_end)

-- Emergency Fund
emergency_fund (user_id, current_balance, target_balance, account_name)

-- Monthly Snapshots (for trend analysis)
monthly_snapshots (user_id, period_month, net_worth, total_assets, 
                   total_liabilities, net_cash_flow, passive_income_pct)
```

### 8.2 Data Security

- All data encrypted at rest (AES-256, via Supabase)
- All data encrypted in transit (TLS 1.3)
- Row-Level Security (RLS) enabled on all tables - users can only access their own data
- No PII stored in client-side localStorage/cookies (session token only)
- Financial amounts stored as integers (Naira Kobo) to avoid floating-point errors

---

## 9. UI/UX Requirements

### 9.1 Design Principles

- **Trust & Security:** Dark mode / professional color palette; no childish UI elements
- **Clarity:** Financial data presented in clear hierarchies; most critical numbers prominent
- **Mobile-First:** All layouts designed for 375px width first; scaled up to desktop
- **Accessibility:** High contrast, large tap targets (min 44x44px)

### 9.2 Design System

- **Typography:** Inter (Google Fonts) for body; system fonts fallback
- **Color Palette:**
  - Primary: Deep Navy `#0A1628` (trust, finance)
  - Accent: Emerald Green `#00C896` (growth, wealth)
  - Warning: Amber `#F59E0B`
  - Danger: Rose `#F43F5E`
  - Background: Soft dark `#111827`
  - Surface: `#1F2937`
- **Icons:** Lucide Icons (OSS, MIT license)
- **Charts:** Chart.js (OSS, MIT license)

### 9.3 Core Screens

| Screen | Priority |
|--------|---------|
| Onboarding (multi-step wizard) | MVP |
| Login / Sign-up | MVP |
| Dashboard (financial health overview) | MVP |
| Income Manager | MVP |
| Expense Tracker & Budget | MVP |
| Balance Sheet (Assets & Liabilities) | MVP |
| Cash Flow Statement | MVP |
| Debt Management | MVP |
| Emergency Fund | MVP |
| Goals Tracker | MVP |
| Retirement Planner | MVP |
| Reports & Export | MVP |
| Insurance Gap Analysis | v1.1 |
| Tax Optimization | v1.1 |
| Settings & Profile | MVP |
| Privacy / Data Management | MVP |

### 9.4 Micro-interactions & Animations

- Loading skeletons (not spinners) for data-heavy screens
- Smooth number counter animations for KPI updates
- Progress bar animations for goals and emergency fund
- Slide-in transitions for drawer menus
- Subtle confetti animation when a goal is completed

---

## 10. Security Requirements

### 10.1 Authentication & Authorization

- Supabase Auth with JWT (RS256 signed)
- Row-Level Security (RLS) - Supabase enforces at database level
- OAuth2 scopes: email, profile only (no broad permissions)
- Brute-force protection: account lockout after 5 failed attempts (15-minute cooldown)
- Password strength requirements: min 12 characters, 1 uppercase, 1 number, 1 special character

### 10.2 Data Handling

- No financial data logged in application logs
- API responses never include other users' data (enforced by RLS)
- Input sanitization on all user-entered text fields
- CSRF protection on all state-mutating endpoints

### 10.3 Compliance Logging

- Audit log of user data access and modifications (NDPA requirement)
- Logs stored for minimum 2 years
- Automated breach detection (Supabase alerts + GitHub Actions monitoring)

### 10.4 Legal Notices (Required in App)

- Privacy Policy (NDPA compliant) - linked in footer and during sign-up
- Terms of Service
- Financial Disclaimer (on every analytical screen)
- Cookie Policy (if applicable)

---

## 11. Mobile Expansion Roadmap

### 11.1 Phase 1: Progressive Web App (PWA) [MVP]

- Installable from browser on Android and iOS
- Offline data viewing (Service Worker caches dashboard data)
- Push notifications for budget alerts (Web Push API)
- Home screen icon, splash screen

### 11.2 Phase 2: Flutter Android App [v2.0 - post adoption]

**Trigger:** 1,000+ monthly active users on web OR user research shows >60% prefer native app
- Shared Supabase backend (no backend changes needed)
- Dart business logic packages reused from Flutter Web (if built)
- Target: Google Play Store (Nigeria region primary)
- Minimum Android version: Android 8.0 (API 26) - covers ~95% of Nigerian Android users
- Monetization: Freemium (basic free; premium features ~N2,500/month)

### 11.3 Phase 3: Flutter iOS App [v2.1]

**Trigger:** Android adoption confirms demand
- Same Dart codebase as Android; platform-specific adaptations
- Target: Apple App Store (Nigeria)
- Minimum iOS version: iOS 14

### 11.4 Flutter-Ready Design Decisions (Apply at Web MVP Stage)

- All business logic extracted into pure JavaScript functions (easy to port to Dart)
- API layer abstracted (swap fetch() for Dart http package easily)
- State management designed as unidirectional data flow (maps to Flutter's Provider/Riverpod)
- No DOM-specific logic in business logic layer

---

## 12. Benchmarks & Competitive References

| Platform | What to Learn From | Gaps to Fill |
|----------|-------------------|--------------|
| **Monarch Money** | Beautiful goal tracking, collaborative features | Not Nigeria-specific; no NGN; no Nigerian tax |
| **Quicken Simplifi** | Clean budget vs. actual view | Subscription cost prohibitive for Nigeria; no PITA support |
| **Quicken Business & Personal** | Asset/liability balance sheet depth | Too complex; US-centric; costly |
| **Cowrywise (Nigeria)** | Nigerian-first UX; familiar to target audience | Investment focus only; no full financial planning |
| **PiggyVest (Nigeria)** | High adoption in Nigeria; savings gamification | Savings only; no advisory/planning |
| **Carbon (Nigeria)** | Loan-focused fintech | No budgeting/planning features |

**Differentiator:** The Financial HealthCheck Platform is the only comprehensive personal finance management tool built specifically for the Nigerian regulatory context, combining balance sheet tracking, cash flow analysis, debt management, retirement planning, and Nigerian tax optimization in a single open-source, free platform.

---

## 13. Open Questions & Decisions Needed

> The following items require stakeholder input before final design decisions can be made.

| # | Question | Impact | Priority |
|---|---------|--------|---------|
| OQ-1 | Will the platform ever handle actual money movement (transfers, payments)? If yes, a **CBN Payment Service Provider license** is required. | Architecture, compliance | High |
| OQ-2 | Should the app support **multiple currency** input (USD, GBP, EUR) for diaspora users with foreign income? | Income model, FX rate integration | Medium |
| OQ-3 | Will there be a **premium subscription tier** (NGN/month)? What features will be gated? | Business model, pricing | High |
| OQ-4 | Will the codebase be **fully open source** (public GitHub repo) or private? | Licensing, community | Medium |
| OQ-5 | Who will be the **Data Protection Officer (DPO)** for NDPA compliance? | Legal compliance | High |
| OQ-6 | Should bank account balances sync automatically via **Open Banking APIs** (e.g., Mono, Okra, Stitch)? | Scope, cost, CBN compliance | Medium |
| OQ-7 | What is the target **launch date** for the web MVP? | Sprint planning | High |
| OQ-8 | Will the platform support **joint/family accounts** (couples managing finances together)? | Data model | Medium |
| OQ-9 | Is a **financial advisor marketplace** (connect users to licensed CFPs in Nigeria) in scope? | SEC Nigeria licensing implications | Low (v2.0) |
| OQ-10 | Should **AI/ML recommendations** (e.g., using Gemini API) be incorporated for personalized advice? | Cost, disclaimers, scope | Medium |

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **APR** | Annual Percentage Rate - the yearly cost of borrowing |
| **CBN** | Central Bank of Nigeria |
| **CRA** | Consolidated Relief Allowance - tax relief under PITA |
| **CPS** | Contributory Pension Scheme - Nigeria's mandatory pension system |
| **Debt Avalanche** | Strategy of paying highest-APR debts first to minimize total interest paid |
| **FCCPC** | Federal Competition and Consumer Protection Commission |
| **FIRS** | Federal Inland Revenue Service - Nigeria's tax authority |
| **FV** | Future Value - time value of money formula |
| **NGN** | Nigerian Naira - the national currency |
| **NHF** | National Housing Fund - 2.5% of basic salary contribution scheme |
| **NITDA** | National Information Technology Development Agency |
| **NDIC** | Nigeria Deposit Insurance Corporation |
| **NDPA** | Nigeria Data Protection Act 2023 |
| **NDPR** | Nigeria Data Protection Regulation 2019 (preceded NDPA) |
| **NAICOM** | National Insurance Commission |
| **PENCOM** | National Pension Commission |
| **PFA** | Pension Fund Administrator |
| **PITA** | Personal Income Tax Act |
| **PMT** | Payment - TVM formula for periodic payment calculation |
| **PV** | Present Value - current worth of a future sum |
| **PYF** | Pay Yourself First - savings-first budgeting philosophy |
| **RSA** | Retirement Savings Account - individual pension account under CPS |
| **SEC Nigeria** | Securities and Exchange Commission Nigeria |
| **TVM** | Time Value of Money |
| **VAC** | Voluntary Additional Contribution to RSA |
| **WAT** | West Africa Time (UTC+1) - Nigeria's time zone |

---

### Recommended Legal Disclaimers (Required In-App)

1. **General:** *"This app provides financial information and tracking tools for educational purposes only. It does not constitute financial, investment, tax, or legal advice."*
2. **Tax Tools:** *"Tax calculations are estimates based on the Nigeria Tax Act 2025. Individual tax situations may vary. Consult a qualified tax professional or the FIRS for personalized advice."*
3. **Investment Info:** *"Investment information is for educational purposes only and does not constitute a recommendation to buy or sell any security. [App Name] is not a registered investment adviser with SEC Nigeria. All investments involve risk."*
4. **Pension Info:** *"Pension information is for general guidance only. Contact your Pension Fund Administrator (PFA) for your actual RSA balance and scheme details."*
5. **Deposit Insurance:** *"NDIC insures deposits up to ₦5,000,000 at Deposit Money Banks and ₦2,000,000 at Microfinance Banks per depositor. Verify coverage limits at ndic.gov.ng."*
6. **Exchange Rates:** *"Currency exchange rates are indicative only. Official rates are published by the Central Bank of Nigeria (CBN)."*

---

*Document Status: **DRAFT v1.1** — Regulatory research completed June 19, 2026. Pending stakeholder review.*  
*Next Review: Upon stakeholder sign-off on Open Questions (Section 13)*  
*Legal Counsel: Engage Nigerian fintech legal counsel to verify all regulatory interpretations before launch.*
