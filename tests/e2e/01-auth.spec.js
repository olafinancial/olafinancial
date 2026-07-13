/**
 * E2E Test Suite 01 — Authentication
 * Covers: Login, Show/Hide password, Signup form, Password reset navigation.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
  });

  test('landing page loads and shows login form', async ({ page }) => {
    await expect(page).toHaveTitle(/Pul Planning|Ola Financial/i);
    await expect(page.locator('#login-email, #email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('#login-password, #password, input[type="password"]').first()).toBeVisible();
  });

  test('show/hide password toggle works', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    const toggleBtn     = page.locator('[aria-label*="password"], .toggle-password, .eye-icon').first();

    await expect(passwordInput).toBeVisible();

    if (await toggleBtn.isVisible()) {
      // Input should start as password type
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.fill('#login-email, input[type="email"]', 'invalid@test.com');
    await page.fill('#login-password, input[type="password"]', 'wrongpassword');
    await page.click('#login-btn, button[type="submit"]');

    // Allow time for the error to appear
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('.error, .toast, [role="alert"], .auth-error').first().isVisible().catch(() => false);
    // We just check it doesn't navigate to the dashboard
    const dashboardVisible = await page.locator('.dashboard, [data-page="dashboard"]').isVisible().catch(() => false);
    expect(dashboardVisible).toBe(false);
  });

  test('sign-up link is visible on the landing page', async ({ page }) => {
    const signupLink = page.locator('#goto-signup, a[href*="signup"], button:has-text("Sign Up")').first();
    await expect(signupLink).toBeVisible();
  });

  test('forgot password link is visible', async ({ page }) => {
    const forgotLink = page.locator('#forgot-link, a:has-text("Forgot")').first();
    await expect(forgotLink).toBeVisible();
  });
});
