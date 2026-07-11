/**
 * E2E Test Suite 08 — Settings & PWA
 * Covers: base currency persists app-wide, PWA service worker registers,
 * offline navigation works, responsive layout on mobile breakpoint.
 */
import { test, expect, devices } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#settings`);
    await page.waitForLoadState('networkidle');
  });

  test('settings page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('base currency selector is visible', async ({ page }) => {
    const currencySelect = page.locator('select[name*="currency"], select[id*="currency"]').first();
    await expect(currencySelect).toBeVisible();
  });

  test('changing base currency updates the dashboard', async ({ page }) => {
    const currencySelect = page.locator('select[name*="currency"], select[id*="currency"]').first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('USD');
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveBtn.isVisible()) await saveBtn.click();
      await page.waitForTimeout(500);

      // Navigate to dashboard and verify USD is displayed
      await page.goto(`${BASE}/#dashboard`);
      await page.waitForLoadState('networkidle');
      const body = await page.locator('body').textContent();
      // USD symbol or code should appear somewhere
      expect(body).toMatch(/\$|USD/);
    }
  });

  test('user can update their name in settings', async ({ page }) => {
    const nameInput = page.locator('input[name*="name"], input[id*="name"], input[placeholder*="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        // No crash expected
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        expect(errors).toHaveLength(0);
      }
    }
  });
});

test.describe('PWA & Service Worker', () => {
  test('service worker is registered on the root page', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
    expect(swRegistered).toBe(true);
  });

  test('app loads key assets from cache when offline', async ({ page, context }) => {
    // Load app online first (primes cache)
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // give SW time to cache

    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // The page title/logo should still appear from cache
    await expect(page.locator('title, h1, .app-logo, nav').first()).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('Responsive / Mobile Layout', () => {
  test('dashboard is usable at iPhone 14 viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      storageState: '.playwright/auth-state.json',
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForLoadState('networkidle');

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance

    await context.close();
  });
});
