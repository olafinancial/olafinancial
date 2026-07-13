/**
 * Playwright global setup — runs once before all E2E tests.
 * Logs in with test credentials, then saves auth state to disk so
 * individual tests can skip the login flow entirely.
 */
import { chromium } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth.js';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const email    = process.env.TEST_EMAIL    || 'testuser@example.com';
  const password = process.env.TEST_PASSWORD || 'TestPassword123!';

  // Ensure the directory for auth state exists
  const dir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  try {
    await page.goto(baseURL);

    // Wait for the login form
    await page.waitForSelector('#login-email, #email, input[type="email"]', { timeout: 10_000 });
    await page.fill('#login-email, #email, input[type="email"]', email);
    await page.fill('#login-password, #password, input[type="password"]', password);
    await page.click('#login-btn, button[type="submit"]');

    // Wait until we are past the login page (authenticated app shell or onboarding)
    // Real DOM markers: .app-shell, #dash-kpis, #dash-greeting, .onboarding-shell
    try {
      await page.waitForSelector(
        '.app-shell, #dash-kpis, #dash-greeting, .onboarding-shell, .page-title',
        { timeout: 15_000 }
      );
      const currentUrl = page.url();
      console.log(`ℹ️  Global setup: redirected to ${currentUrl}`);

      // If we got redirected to onboarding, complete it so future tests can proceed
      if (currentUrl.includes('onboarding') || await page.locator('.onboarding-shell').count() > 0) {
        console.log('ℹ️  Global setup: user onboarding is required. Filling out onboarding wizard.');

        // Step 1: Profile Info (Name, Age, State, Currency)
        await page.fill('#ob-name', 'Test User');
        await page.fill('#ob-age', '30');
        await page.selectOption('#ob-state', 'LA');
        await page.click('#ob-next');
        await page.waitForTimeout(500);

        // Step 2: Employment
        await page.selectOption('#ob-emp', 'salaried');
        await page.fill('#ob-dependents', '2');
        await page.click('#ob-next');
        await page.waitForTimeout(500);

        // Step 3: Retirement and goals target
        await page.fill('#ob-ret-age', '60');
        await page.selectOption('#ob-risk', 'moderate');
        const chip = page.locator('.goal-chip').first();
        if (await chip.isVisible()) await chip.click();
        await page.click('#ob-next');
        await page.waitForTimeout(500);

        // Step 4: Estate Wills
        await page.selectOption('#ob-will', 'no');
        await page.selectOption('#ob-guardians', 'no');
        await page.click('#ob-next');
        await page.waitForTimeout(500);

        // Step 5: Summary
        await page.click('#ob-next'); // Click "Get Started"

        await page.waitForSelector('#dash-kpis, #dash-greeting, .app-shell', { timeout: 15_000 });
        console.log('✅  Global setup: Onboarding successfully completed!');
      }
    } catch (err) {
      console.error(`❌ Global setup failed to redirect or complete onboarding. Current URL: ${page.url()}`);
      throw err;
    }

    // Save the auth state (cookies + localStorage)
    await page.context().storageState({ path: STORAGE_STATE });
    console.log(`✅  Auth state saved to ${STORAGE_STATE}`);
  } catch (err) {
    console.warn(`⚠️  Global setup: could not log in automatically — ${err.message}`);
    console.warn('    Tests that require auth will run in guest mode.');
  } finally {
    await browser.close();
  }
}
