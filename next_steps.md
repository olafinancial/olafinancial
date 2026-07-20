# Pul Planning — Next Steps & Live Issue Check

**Status Date:** July 15, 2026

Following the successful implementation of the core features in the last session (**Budget Planner #32**, **Salary Calculator #34**, and the **Balance Sheet Split #36**), we have checked the repository status. 

Here are the remaining active GitHub issues and the recommended path forward:

---

## 📋 Outstanding Issues Tracker

### 1. Operations: Production Email Setup ([#38](https://github.com/olafinancial/olafinancial/issues/38))
* **Type:** Ops / Infrastructure · **Priority:** High
* **Status:** 🔲 Open (Docs ready in `EMAIL_SETUP.md`; production wiring pending)
* **Tasks:**
  * Map `pul.llc` redirect rules in Supabase Auth Site URL.
  * Register and verify `pul.llc` domain at Resend.
  * Add `RESEND_API_KEY` and `RESEND_FROM` to the production environment.
  * Decide on the hosting provider for the always-on Node server (needed to trigger the daily/weekly digest crons).

### 2. Infrastructure: Domain Cutover to `pul.llc` ([#23](https://github.com/olafinancial/olafinancial/issues/23) / [#25](https://github.com/olafinancial/olafinancial/issues/25))
* **Type:** Infrastructure · **Priority:** Medium
* **Status:** 🔲 Open (Following `DOMAIN_MIGRATION.md` plan)
* **Tasks:**
  * Configure Porkbun DNS A/AAAA/CNAME records to point apex to GitHub Pages.
  * Update GitHub Pages settings to bind the custom domain `pul.llc`.
  * Enforce HTTPS on the repository settings once DNS propagates.
  * Bridge `olafinancial.org` with 301 redirects to `pul.llc`.

### 3. Business: Sponsor Partner Banners ([#28](https://github.com/olafinancial/olafinancial/issues/28))
* **Type:** Content / Config · **Priority:** High (Revenue)
* **Status:** 🔲 Blocked (Awaiting partner contracts)
* **Tasks:**
  * Once the user provides partner creatives, update the `SPONSORS` object inside `js/lib/sponsor.js` with active URLs, taglines, and images to replace placeholders.

### 4. Maintenance: Macroeconomic Data Feed ([#29](https://github.com/olafinancial/olafinancial/issues/29))
* **Type:** Recurring Maintenance · **Priority:** Low
* **Status:** 🔲 Open
* **Tasks:**
  * Check the latest NBS/CBN figures for inflation, GDP growth, MPR, and foreign reserves, and update [econ-ng.json](file:///home/shill/Documents/Financial%20App%20Project/server/data/econ-ng.json) accordingly.

---

## 🚀 Recommended Next Steps

1. **Production Email Ops (#38)**: Complete the Supabase and Resend environment variables configuration. This is key to enabling auth flows (forgot password, sign up validation) on production.
2. **Domain Cutover (#23/#25)**: Transition active hosting from `.org` to `pul.llc` now that all core features are verified.
3. **Macro Data Refresh (#29)**: Update the JSON feed with NBS data from early Q3 2026.
