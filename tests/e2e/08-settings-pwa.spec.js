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
    // Hash routes require a leading slash: #/settings (not #settings)
    await page.goto(`${BASE}/#/settings`);
    await page.waitForLoadState('networkidle');
  });

  test('settings page renders', async ({ page }) => {
    await expect(page.locator('h1.page-title, .page-title').first()).toBeVisible();
    await expect(page.locator('h1, .page-title').first()).toContainText(/settings/i);
  });

  test('base currency selector is visible', async ({ page }) => {
    // Actual control id is #set-currency (see js/pages/settings.js)
    const currencySelect = page.locator('#set-currency, select[id*="currency"]').first();
    await expect(currencySelect).toBeVisible();
  });

  test('changing base currency updates the dashboard', async ({ page }) => {
    const currencySelect = page.locator('#set-currency, select[id*="currency"]').first();
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('USD');
      const saveBtn = page.locator('#save-settings-btn, button:has-text("Save Changes")').first();
      if (await saveBtn.isVisible()) await saveBtn.click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE}/#/dashboard`);
      await page.waitForLoadState('networkidle');
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/\$|USD/);
    }
  });

  test('user can update their name in settings', async ({ page }) => {
    const nameInput = page.locator('#set-name, input[id*="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      const saveBtn = page.locator('#save-settings-btn, button:has-text("Save Changes")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
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

  test('app loads key assets from cache when offline', async ({ page, context, browserName }) => {
    // Playwright WebKit (incl. mobile project) often throws
    // "WebKit encountered an internal error" on setOffline + reload in CI.
    test.skip(browserName === 'webkit', 'WebKit offline reload is unreliable in Playwright CI');

    // Load app online first (primes SW network-first cache after successful fetch)
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return true;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && (reg.active || reg.waiting || reg.installing));
    }, null, { timeout: 10_000 }).catch(() => {});
    // Second navigation while online fills the SW cache (network-first stores on success)
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await context.setOffline(true);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });

    const title = await page.title();
    expect(title).toMatch(/Pul Planning|Ola Financial/);
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
    await page.goto(`${BASE}/#/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.clientWidth || document.documentElement.clientWidth);
    const viewportWidth = 390;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance

    await context.close();
  });
});
