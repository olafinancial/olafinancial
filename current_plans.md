# Ola Financial — Current Plans & Implementation Status

This file tracks the active plans, completed work, and remaining roadmap for the Ola Financial application.

## Completed Enhancements (This Session)

### 1. Unified Emergency Fund & Asset Integration
* **Status**: Completed
* **Description**: Removed the manual "Update Balance" button on the Emergency Fund page. Assets on the Balance Sheet now have a toggle checkbox: *"Use as an Emergency Fund source"*. The Emergency Fund page automatically queries these assets, aggregates their current balances, and lists all linked sources in a clean details table.

### 2. Debt Payoff Strategies (Snowball vs. Avalanche)
* **Status**: Completed
* **Description**: Added a payoff strategy selector (Dropdown) on the Debt Planner page. Users can now choose between **Debt Avalanche** (highest APR first) and **Debt Snowball** (lowest balance first) to instantly compare total interest saved and payoff months.

### 3. Automated Monthly Debt Payments & Manual Overrides
* **Status**: Completed
* **Description**: Added a checkbox on both the Balance Sheet Liability form and the Debt Planner form: *"I don't know the APR (Enter monthly payment manually)"*. 
  * If unchecked, entering the APR and Balance automatically calculates the minimum monthly payment in real-time using standard amortized terms per debt type (Mortgage, Auto, Credit Card, Personal Loan).
  * If checked, the APR field is hidden and the monthly payment field becomes fully editable.

### 4. Input Comma-Formatting & Caching
* **Status**: Completed
* **Description**: Masked all numeric currency inputs (Goals, Assets, Liabilities, Debt Extra Payments, Emergency Fund) to format with commas dynamically as you type. Service worker caching has been disabled during the active testing window to allow instant client updates.

---

## Remaining Roadmap

### 1. Insurance Policies & Coverage Analysis
* **Goal**: Build an insurance tracker page that analyzes sum assured vs. needs (e.g. Life, Health, Motor, Property) and flags coverage gaps.
* **Proposed Files**: `js/pages/insurance.js`

### 2. Comprehensive Financial Reports
* **Goal**: Assemble active reports showing net worth trends, asset allocations, cash flow statements, and a PDF downloader function.
* **Proposed Files**: `js/pages/reports.js`
