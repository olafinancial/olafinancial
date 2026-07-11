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
    await page.waitForSelector('#email', { timeout: 10_000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('[data-testid="login-submit"], button[type="submit"]');

    // Wait until we are redirected past the login page (dashboard visible)
    await page.waitForSelector('[data-page="dashboard"], #dashboard-page, .dashboard', { timeout: 15_000 });

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
