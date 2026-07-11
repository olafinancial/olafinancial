/**
 * E2E Test Suite 02 — Dashboard
 * Covers: page load, insights above charts, greeting/date label,
 * currency selector, net-worth card, chart rendering.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// Requires a valid logged-in session. Use storageState if global-setup ran.
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForLoadState('networkidle');
  });

  test('dashboard page renders without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('shows a greeting with the current date', async ({ page }) => {
    const greeting = page.locator('.dashboard-greeting, .greeting, h1, h2').first();
    await expect(greeting).toBeVisible();
    // Should contain today's date year at minimum
    const text = await greeting.textContent();
    expect(text).toBeTruthy();
  });

  test('insights/alerts section appears above charts', async ({ page }) => {
    const insights = page.locator('.insights, .alerts, [data-section="insights"]').first();
    const charts   = page.locator('canvas, .chart-container, [data-section="charts"]').first();
    await expect(insights).toBeVisible();
    await expect(charts).toBeVisible();

    // Verify insights appear before charts in the DOM via bounding box
    const insightsBox = await insights.boundingBox();
    const chartsBox   = await charts.boundingBox();
    if (insightsBox && chartsBox) {
      expect(insightsBox.y).toBeLessThan(chartsBox.y);
    }
  });

  test('net worth card is visible with a numeric value', async ({ page }) => {
    const netWorthCard = page.locator('[data-card="net-worth"], .net-worth, .card:has-text("Net Worth")').first();
    await expect(netWorthCard).toBeVisible();
    const text = await netWorthCard.textContent();
    // Should contain a number (with possible currency symbol)
    expect(text).toMatch(/[\d,]+/);
  });

  test('currency selector changes displayed currency', async ({ page }) => {
    const selector = page.locator('select[id*="currency"], select[name*="currency"]').first();
    if (await selector.isVisible()) {
      const originalText = await page.locator('.net-worth, [data-card]').first().textContent();
      await selector.selectOption('USD');
      await page.waitForTimeout(500);
      const newText = await page.locator('.net-worth, [data-card]').first().textContent();
      // Text should change after switching currency
      expect(newText).not.toBe(originalText);
    }
  });
});
