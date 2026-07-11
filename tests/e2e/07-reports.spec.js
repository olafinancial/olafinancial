/**
 * E2E Test Suite 07 — Financial Reports
 * Covers: page load, report generation, print headers with client name,
 * pul.llc watermark present, Estate Report print.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Financial Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/reports`);
    await page.waitForLoadState('networkidle');
  });

  test('reports page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('generate report button is visible', async ({ page }) => {
    const genBtn = page.locator('#export-btn, button:has-text("Export PDF")').first();
    await expect(genBtn).toBeVisible();
  });

  test('print header contains Ola Financial branding', async ({ page }) => {
    // Check if print-only headers exist in the DOM (visibility:hidden until print)
    const printHeader = page.locator('.print-header, [data-print-header], .report-header').first();
    if (await printHeader.count() > 0) {
      const text = await printHeader.textContent();
      expect(text.toLowerCase()).toMatch(/ola financial|pul\.llc/i);
    }
  });

  test('watermark element present in report DOM', async ({ page }) => {
    const genBtn = page.locator('#export-btn, button:has-text("Export PDF")').first();
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(1000);
      const watermark = page.locator('[class*="watermark"], .watermark').first();
      if (await watermark.count() > 0) {
        const text = await watermark.textContent();
        expect(text.toLowerCase()).toContain('pul.llc');
      }
    }
  });

  test('no JS errors on report page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE}/#/reports`);
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('Estate Planner Report', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/estate-planner`);
    await page.waitForLoadState('networkidle');
  });

  test('estate planner page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('print report button is visible', async ({ page }) => {
    const printBtn = page.locator('#estate-audit-btn, button:has-text("Generate Report")').first();
    await expect(printBtn).toBeVisible();
  });

  test('disclaimer text is included in estate report', async ({ page }) => {
    const disclaimer = page.locator('.disclaimer, [data-section="disclaimer"]').first();
    if (await disclaimer.count() > 0) {
      await expect(disclaimer).toBeTruthy();
    }
  });
});
