/**
 * Playwright global setup — runs once before all E2E tests.
 * Prefer Supabase password grant API to seed storage state (reliable in CI),
 * then open the app and finish onboarding if needed.
 */
import { chromium } from '@playwright/test';
import { STORAGE_STATE } from './fixtures/auth.js';
import fs from 'fs';
import path from 'path';

// Keep in sync with js/config.js (browser uses these for Supabase client)
const DEFAULT_SUPABASE_URL  = 'https://kwymfdbvfzexhckuaorh.supabase.co';
const DEFAULT_SUPABASE_ANON = 'sb_publishable_i_muV01vzwnLzYvaiU6RCg_JV0-qcD6';

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname; // xxx.supabase.co
    return host.split('.')[0];
  } catch {
    return 'localhost';
  }
}

/**
 * Obtain a session via Supabase Auth REST (no browser).
 * @returns {Promise<object>} session payload for localStorage
 */
async function fetchSupabaseSession(email, password, supabaseUrl, anonKey) {
  const tokenUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error_description || body?.msg || body?.error || res.statusText;
    throw new Error(`Supabase password login failed (${res.status}): ${msg}`);
  }
  if (!body.access_token) {
    throw new Error('Supabase login response missing access_token');
  }
  return body;
}

export default async function globalSetup() {
  const baseURL  = process.env.BASE_URL || 'http://localhost:3000';
  const email    = (process.env.TEST_EMAIL || '').trim();
  const password = process.env.TEST_PASSWORD || '';
  const isCI     = !!process.env.CI;
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON;

  if (!email || !password) {
    const msg = 'TEST_EMAIL and TEST_PASSWORD must be set (GitHub Actions secrets or .env).';
    console.error(`❌ Global setup: ${msg}`);
    if (isCI) throw new Error(msg);
    console.warn('    Skipping auth state; authenticated tests will fail.');
    return;
  }

  console.log(
    `ℹ️  Global setup: auth as ${email.replace(/(^.).*(@.*$)/, '$1***$2')} → ${baseURL}`
  );

  const dir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ── 1) Server ready ─────────────────────────────────────
    let ready = false;
    for (let i = 0; i < 45; i++) {
      try {
        const res = await page.request.get(baseURL);
        if (res.ok()) { ready = true; break; }
      } catch { /* retry */ }
      await page.waitForTimeout(1000);
    }
    if (!ready) throw new Error(`Server not reachable at ${baseURL} after 45s`);

    // ── 2) API login (preferred) ────────────────────────────
    let session;
    try {
      session = await fetchSupabaseSession(email, password, supabaseUrl, anonKey);
      console.log('ℹ️  Global setup: Supabase API login OK');
    } catch (apiErr) {
      console.warn(`⚠️  API login failed (${apiErr.message}); trying UI login…`);
      session = null;
    }

    if (session) {
      const ref = projectRefFromUrl(supabaseUrl);
      const storageKey = `sb-${ref}-auth-token`;
      // Supabase JS v2 expects the full session object under this key
      await context.addInitScript(
        ({ key, value }) => {
          localStorage.setItem(key, value);
        },
        { key: storageKey, value: JSON.stringify(session) }
      );
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } else {
      // ── 3) UI login fallback ───────────────────────────────
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.locator('#login-email').waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator('#login-email').fill(email);
      await page.locator('#login-password').fill(password);
      await page.locator('#login-btn').click();

      const outcome = await Promise.race([
        page.locator('.app-shell, #dash-kpis, .onboarding-shell').waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'ok'),
        page.locator('#auth-error').waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'auth-error'),
      ]).catch(() => 'timeout');

      if (outcome === 'auth-error') {
        const errText = (await page.locator('#auth-error').textContent())?.trim() || 'unknown';
        throw new Error(`UI login rejected: ${errText}`);
      }
      if (outcome === 'timeout') {
        throw new Error(`UI login did not reach app shell. URL=${page.url()}`);
      }
    }

    // Give boot() time after session inject
    await page.waitForSelector('.app-shell, #dash-kpis, #dash-greeting, .onboarding-shell', {
      timeout: 45_000,
    });
    console.log(`ℹ️  Global setup: app UI ready at ${page.url()}`);

    // ── 4) Onboarding if needed (6 steps) ───────────────────
    if (page.url().includes('onboarding') || (await page.locator('.onboarding-shell').count()) > 0) {
      console.log('ℹ️  Global setup: completing onboarding wizard…');

      await page.fill('#ob-name', 'Test User');
      await page.fill('#ob-age', '30');
      await page.selectOption('#ob-state', 'LA');
      await page.click('#ob-next');
      await page.waitForTimeout(400);

      await page.selectOption('#ob-emp', 'salaried');
      await page.fill('#ob-dependents', '2');
      await page.click('#ob-next');
      await page.waitForTimeout(400);

      await page.fill('#ob-ret-age', '60');
      await page.selectOption('#ob-risk', 'moderate');
      const chip = page.locator('.goal-chip').first();
      if (await chip.isVisible().catch(() => false)) await chip.click();
      await page.click('#ob-next');
      await page.waitForTimeout(400);

      await page.selectOption('#ob-will', 'no');
      await page.selectOption('#ob-guardians', 'no');
      await page.click('#ob-next');
      await page.waitForTimeout(400);

      // Path guide
      await page.click('#ob-next');
      await page.waitForTimeout(400);

      // Summary / Get Started
      await page.click('#ob-next');
      await page.waitForSelector('.app-shell, #dash-kpis, #dash-greeting', { timeout: 30_000 });
      console.log('✅  Global setup: onboarding completed');
    }

    await context.storageState({ path: STORAGE_STATE });
    console.log(`✅  Auth state saved to ${STORAGE_STATE}`);
  } catch (err) {
    console.error(`❌ Global setup failed: ${err.message}`);
    // Write whatever state we have so storageState path exists (avoids ENOENT noise)
    try {
      await context.storageState({ path: STORAGE_STATE });
    } catch { /* ignore */ }

    if (isCI) throw err;
    console.warn('    Local mode: continuing; authenticated tests may fail.');
  } finally {
    await browser.close();
  }
}
