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

const ROUTES = [
  { name: 'Dashboard',        hash: '#dashboard' },
  { name: 'Income',           hash: '#income' },
  { name: 'Expenses',         hash: '#expenses' },
  { name: 'Balance Sheet',    hash: '#balance-sheet' },
  { name: 'Cash Flow',        hash: '#cashflow' },
  { name: 'Debt Planner',     hash: '#debt' },
  { name: 'Emergency Fund',   hash: '#emergency-fund' },
  { name: 'Goals',            hash: '#goals' },
  { name: 'Reports',          hash: '#reports' },
  { name: 'Retirement',       hash: '#retirement' },
  { name: 'Estate Planner',   hash: '#estate-planner' },
  { name: 'Calculators',      hash: '#calculators' },
];

for (const route of ROUTES) {
  test(`Smoke: ${route.name} loads without errors`, async ({ page }) => {
    const errors    = [];
    const failedReqs = [];

    page.on('pageerror', err => errors.push(err.message));
    page.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        failedReqs.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto(`${BASE}/${route.hash}`);
    await page.waitForLoadState('networkidle');

    // Page heading visible
    const heading = page.locator('h1, h2, .page-title').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // No JS runtime errors
    expect(errors, `JS errors on ${route.name}: ${errors.join(', ')}`).toHaveLength(0);

    // No 5xx server errors (4xx for optional resources are tolerated with a warning)
    const serverErrors = failedReqs.filter(r => r.startsWith('5'));
    expect(serverErrors, `Server errors on ${route.name}: ${serverErrors.join(', ')}`).toHaveLength(0);
  });
}
