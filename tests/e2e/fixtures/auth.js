/**
 * Playwright auth fixture — reusable auth state for E2E tests.
 * Creates a test user session and saves the storage state so subsequent
 * tests skip the login flow.
 */
import { test as base } from '@playwright/test';
import path from 'path';

// File where we cache the authenticated browser state
export const STORAGE_STATE = path.join(process.cwd(), '.playwright/auth-state.json');

/**
 * Extended test with an "authed" fixture that navigates to the app
 * already logged in (using credentials from .env.test).
 */
export const test = base.extend({
  authed: [async ({ page }, use) => {
    // The auth state was already saved by the global setup.
    // Just navigate to the app root — auth cookies are already loaded.
    await page.goto('/');
    await use(page);
  }, { scope: 'test' }],
});

export { expect } from '@playwright/test';
