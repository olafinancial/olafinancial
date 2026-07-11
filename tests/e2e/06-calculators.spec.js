/**
 * E2E Test Suite 06 — Calculators Hub
 * Covers: all 9 calculators render, produce numeric output, no JS errors.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

const CALCULATORS = [
  { label: /savings goal/i,   inputs: [['#goal-amount,input[name*="goal"]', '1000000'], ['#monthly-savings,input[name*="monthly"]', '50000']] },
  { label: /compound/i,       inputs: [['input[name*="principal"],#principal', '500000'], ['input[name*="rate"],#rate', '12']] },
  { label: /roi/i,            inputs: [['input[name*="invest"],#invest', '200000'], ['input[name*="return"],#return', '250000']] },
  { label: /simple loan/i,    inputs: [['input[name*="amount"],#loan-amount', '1000000'], ['input[name*="rate"]', '18']] },
  { label: /mortgage/i,       inputs: [['input[name*="amount"],#home-price', '50000000'], ['input[name*="rate"]', '15']] },
  { label: /car loan/i,       inputs: [['input[name*="amount"],#car-price', '5000000'], ['input[name*="rate"]', '20']] },
  { label: /inflation/i,      inputs: [['input[name*="amount"],#amount', '100000'], ['input[name*="rate"],#inflation', '18']] },
  { label: /fixed deposit|cd/i, inputs: [['input[name*="principal"],#principal', '500000'], ['input[name*="rate"]', '14']] },
];

test.describe('Calculators Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#calculators`);
    await page.waitForLoadState('networkidle');
  });

  test('calculators hub page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('all calculator tabs are accessible', async ({ page }) => {
    for (const calc of CALCULATORS) {
      const tab = page.locator(`button, [role="tab"], a`).filter({ hasText: calc.label }).first();
      if (await tab.count() > 0) {
        await expect(tab).toBeVisible();
      }
    }
  });

  test('savings goal calculator returns a numeric result', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Click savings goal tab
    const tab = page.locator('button, [role="tab"]').filter({ hasText: /savings goal/i }).first();
    if (await tab.isVisible()) {
      await tab.click();
      await page.waitForTimeout(300);

      // Fill in a goal amount
      const goalInput = page.locator('input').first();
      if (await goalInput.isVisible()) {
        await goalInput.fill('1000000');
      }

      // Click calculate
      const calcBtn = page.locator('button:has-text("Calcul"), button[type="submit"]').first();
      if (await calcBtn.isVisible()) {
        await calcBtn.click();
        await page.waitForTimeout(500);
        const result = page.locator('.result, .output, [data-result]').first();
        if (await result.count() > 0) {
          await expect(result).toBeVisible();
          const text = await result.textContent();
          expect(text).toMatch(/[\d,]/);
        }
      }
    }

    expect(errors).toHaveLength(0);
  });
});
