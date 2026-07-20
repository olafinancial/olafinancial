# Stability & Feature Enhancements (GitHub Issues #51-72)

This plan details the changes required to resolve the newly reported issues, improving stability, calculations, user validation, and visual summaries.

## User Review Required

> [!IMPORTANT]
> **Regulatory Compliance text update:** The compliance/educational statement will be updated globally to the new wording from Issue #71. It will appear at the bottom of all pages and in PDF prints.
>
> **Financial Independence Metric:** We are introducing a shareable Financial Independence Score defined as `(Passive Income + Investment Income) / Total Income * 100`. This will be featured prominently on the Cash Flow and Reports pages.

## Proposed Changes

### 1. Liabilities & Assets Form Validations & zero-APR support (Issues #72, #67)

#### [MODIFY] [liabilities.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/liabilities.js)
- Allow APR inputs of `0%` without triggering validation errors or NaN warning messages.
- Shorten the interest-bearing toggle help text as specified in Issue #67.
- In `_saveLiab()`, add client-side input validation on the liability name field. If name is empty, display an inline red warning label instead of letting the modal crash/disappear.

#### [MODIFY] [assets.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/assets.js)
- In `_saveAsset()`, add client-side validation on the asset name field to display an inline red warning if empty.
- Remove the optional `[sharia:yes]` tag checkbox option from the general Add Asset modal form (Issue #66).
- When a user inputs a stock ticker and triggers a fetch, show a `"Please wait, fetching ticker..."` loading text indicator inside the modal.

#### [MODIFY] [debt.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/debt.js)
- Ensure the avalanche payoff strategy (highest interest first) handles 0% APR debts correctly by placing them at the end of the priority queue, rather than omitting them.

---

### 2. Investment Questionnaire Persistence & Tips (Issues #64, #65)

#### [MODIFY] [investment-quiz.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/investment-quiz.js)
- Save quiz results locally to `localStorage` under `wp_invest_quiz_{userId}` and trigger a save/retrieve synchronization with the profile database (`user_profiles.metadata`).
- Remove specific vendor names and licensed-only "financial tips" wording, keeping recommendations educational and strictly inflation-aware.

---

### 3. Income & Tax Calculator Enhancements (Issues #59, #61, #62)

#### [MODIFY] [calculators.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/calculators.js)
- In the Salary/PAYE calculator tab, add checkbox toggles for **Pension Contribution (8%)** and **NHIS Contribution** to allow users to turn them off (some employers do not make these deductions, exposing more gross income to tax).

#### [MODIFY] [income.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/income.js)
- In the `Add Income Source` modal: when "Salary" (active income) is selected, show an **"Auto-calculate Net (2025 Tax Reform)"** helper button next to Net Salary. Clicking it computes the net salary using the Nigeria Tax Act 2025 tax brackets (gross minus deductions and progressive tax) and fills it automatically.
- Clarify approved deductibles: Pension, NHF, NHIS, Mortgage interest, Rent relief, Life insurance.

---

### 4. Cash Flow Grouping & Independence Metrics (Issue #68)

#### [MODIFY] [cashflow.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/cashflow.js)
- Update the cash flow outflow table to group expenses under **Needs (Essential)** and **Wants (Discretionary)** headers (mirroring the Inflows side).
- Calculate the **Financial Independence Score**: `(Passive Income + Investment Income) / Total Income * 100`. Display it prominently at the top with a social Twitter bragging share button.

---

### 5. Income Segmented Visualization (Issue #60)

#### [MODIFY] [income.js](file:///home/shill/Documents/Financial%20App%20Project/js/pages/income.js)
- Swap the "net v gross" visualization bar with a segmented progress card showing the proportions of **Active vs Passive vs Investment** segments in the user's total gross income.

---

### 6. App Disclaimer Wording Update (Issue #71)

#### [MODIFY] [config.js](file:///home/shill/Documents/Financial%20App%20Project/js/config.js)
- Update `APP_CONFIG.disclaimer` to match the exact compliance statement copy requested in Issue #71.

---

## Verification Plan

### Automated Tests
- Run unit test suite:
  ```bash
  npm run test:unit
  ```
- Run Playwright E2E integration specs:
  ```bash
  eval "$(/home/shill/.local/share/fnm/fnm env)" && npx playwright test --project=chromium
  ```

### Manual Verification
- Test adding assets and liabilities without names to confirm validation alerts are visible.
- Add a 0% APR loan to confirm it appears correctly without NaN values.
- Verify the loading text appears during stock ticker fetch.
- Verify cash flow groups outflows correctly and displays the Financial Independence Score.
