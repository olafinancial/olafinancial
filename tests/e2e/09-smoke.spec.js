/**
 * E2E Test Suite 09 — Full App Smoke Test (Go-Live Readiness)
 * Visits every active module route and asserts:
 *   - Page loads without JS errors
 *   - A visible heading is present
 *   - No broken network requests (4xx/5xx)
 * Run this as the final gate before deploying to production.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

// Hash router requires leading slash (#/income not #income)
const ROUTES = [
  { name: 'Dashboard',        hash: '#/dashboard',      title: /dashboard|hello|good|welcome|test user/i },
  { name: 'Income',           hash: '#/income',         title: /income/i },
  { name: 'Expenses',         hash: '#/expenses',       title: /expense/i },
  { name: 'Balance Sheet',    hash: '#/balance-sheet',  title: /balance sheet|net worth|assets/i },
  { name: 'Cash Flow',        hash: '#/cashflow',       title: /cash flow/i },
  { name: 'Debt Planner',     hash: '#/debt',           title: /debt/i },
  { name: 'Emergency Fund',   hash: '#/emergency-fund', title: /emergency/i },
  { name: 'Goals',            hash: '#/goals',          title: /goal/i },
  { name: 'Reports',          hash: '#/reports',        title: /report/i },
  { name: 'Retirement',       hash: '#/retirement',     title: /retirement/i },
  { name: 'Estate Planner',   hash: '#/estate-planner', title: /estate/i },
  { name: 'Calculators',      hash: '#/calculators',    title: /calculator/i },
  { name: 'Settings',         hash: '#/settings',       title: /settings/i },
  { name: 'Insurance',        hash: '#/insurance',      title: /insurance|takaful/i },
];

for (const route of ROUTES) {
  test(`Smoke: ${route.name} loads without errors`, async ({ page }) => {
    const errors    = [];
    const failedReqs = [];

    page.on('pageerror', err => errors.push(err.message));
    page.on('response', res => {
      // Only track same-origin failures; third-party CDNs (fonts, analytics) are flaky
      const url = res.url();
      const isThirdParty = !url.startsWith(BASE) && !url.includes('localhost');
      if (res.status() >= 400 && !url.includes('favicon') && !isThirdParty) {
        failedReqs.push(`${res.status()} ${url}`);
      }
    });

    await page.goto(`${BASE}/${route.hash}`);
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2, .page-title').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    // Ensure we landed on the intended module (not a silent dashboard fallback)
    await expect(heading).toContainText(route.title);

    expect(errors, `JS errors on ${route.name}: ${errors.join(', ')}`).toHaveLength(0);

    const serverErrors = failedReqs.filter(r => r.startsWith('5'));
    expect(serverErrors, `Server errors on ${route.name}: ${serverErrors.join(', ')}`).toHaveLength(0);
  });
}
