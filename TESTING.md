# Ola Financial — Testing Guide

## Overview
The test suite is split into two layers:

| Layer | Tool | Command | Coverage Target |
|-------|------|---------|-----------------|
| Unit tests | Jest | `npm run test:unit` | ≥ 80% lines/functions |
| End‑to‑End (E2E) | Playwright | `npm run test:e2e` | All active routes / critical flows |
| Both | – | `npm test` | Full suite |

---

## Quick Start (Local)

### 1. Install dev dependencies
```bash
npm install
npx playwright install --with-deps   # needs sudo for system libraries
# If install-deps fails (no sudo), Chromium/Firefox often still work:
npx playwright install chromium firefox
```

### 2. Create your local test env file
```bash
cp .env.test.example .env.test
# Edit .env.test with your test Supabase credentials and a test user account
# Alternatively, TEST_EMAIL / TEST_PASSWORD in .env are loaded by playwright.config.js
```

### 3. Start the dev server (in one terminal) — **required**
E2E hits `http://localhost:3000`. Without the server you get `net::ERR_CONNECTION_REFUSED`.
```bash
npm run dev
```

### 4. Run unit tests
```bash
npm run test:unit
# HTML coverage report: open coverage/index.html
```

### 5. Run E2E tests (in another terminal, while dev server is running)
```bash
# Full matrix (chromium + firefox + webkit + mobile iPhone 14)
npm run test:e2e

# Recommended local loop (Chromium only — fastest)
npx playwright test --project=chromium

# HTML report
npx playwright show-report
```

### Hash routes
App routes use a **leading slash** after `#` (e.g. `#/dashboard`, `#/settings`).
The router normalizes bare forms like `#settings` as well, but tests should prefer `#/...`.

### Known environment issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| `net::ERR_CONNECTION_REFUSED` | Dev server not running | `npm run dev` in another terminal |
| `Host system is missing dependencies` (webkit/mobile) | Missing OS libs | `sudo npx playwright install-deps` |
| Global setup “could not log in” | Bad `TEST_EMAIL`/`TEST_PASSWORD` or wrong dashboard selectors | Check `.env` credentials; ensure test user exists in Supabase |

---

## Test File Structure

```
tests/
  unit/
    utils.test.js            ← Financial math utility unit tests
  integration/               ← (future: Supabase CRUD integration tests)
  e2e/
    fixtures/
      auth.js                ← Reusable authenticated page fixture
    global-setup.js          ← Logs in once, saves auth state to disk
    01-auth.spec.js          ← Login / signup / password toggle
    02-dashboard.spec.js     ← Dashboard load, insights, currency
    03-income-expenses.spec.js ← Income & expense CRUD
    04-debt-planner.spec.js  ← Strategy toggle, form validation
    05-balance-sheet.spec.js ← Asset form crash regression, APY cap
    06-calculators.spec.js   ← All 9 calculators render & compute
    07-reports.spec.js       ← Report generation, print headers, watermarks
    08-settings-pwa.spec.js  ← Settings persistence, PWA, mobile layout
    09-smoke.spec.js         ← Full route smoke test (go-live gate)
```

---

## CI / GitHub Actions

Tests run automatically on every push to `main` and on pull requests:
- **Unit tests** run first (`unit` job).
- **E2E tests** run only if unit tests pass (`e2e` job, needs `unit`).
- Reports are uploaded as GitHub Actions artifacts.
- On failure, screenshots and videos are attached.

### Required GitHub Secrets
Add these in **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `TEST_EMAIL` | Email of a dedicated test user in Supabase |
| `TEST_PASSWORD` | Password for the test user |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

> **Tip**: Use a separate Supabase test project to keep production data clean.

---

## Adding New Tests

1. **Unit test**: add a `describe`/`test` block in `tests/unit/utils.test.js`
   (or a new `*.test.js` file in `tests/unit/`) for any pure utility functions.

2. **E2E test**: create a new `tests/e2e/NN-feature.spec.js`. Use the authenticated
   `storageState: '.playwright/auth-state.json'` option so you don't need to log in.

3. Keep tests deterministic — prefer checking for element visibility/text over
   pixel-level comparisons.

---

## Go-Live Checklist (Pre-Deploy)
Run through these before each production release:

- [ ] `npm run test:unit` — all unit tests pass, coverage ≥ 80%
- [ ] `npm run test:e2e` — all E2E smoke tests green on Chromium at minimum
- [ ] Review Playwright HTML report for any flaky tests; investigate before deploy
- [ ] Manually verify PDF print output (headers, watermarks, disclaimer) in Chrome
- [ ] Test PWA install prompt on a real mobile device
- [ ] Confirm service worker cache version matches current deployment (check `sw.js`)
- [ ] Verify Supabase OAuth + password-reset redirects point to live `pul.llc` URL
