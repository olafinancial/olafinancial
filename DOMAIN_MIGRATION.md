# Domain migration: pul.llc primary (olafinancial.org bridge)

**Status:** Planned  
**Updated:** 2026-07-13  

## Goal

| Role | Domain / account |
|------|------------------|
| **Primary product URL** | `https://pul.llc` (and `www.pul.llc`) |
| **Temporary bridge** | `https://olafinancial.org` → same app until cutover is complete |
| **Org / accounts** | Keep **olafinancial** names (GitHub org, repo, Porkbun account, business email, etc.) |

**Why:** Customer renamed the public domain after feedback. This is a **domain / URL** move, not a full rename of every internal account.

---

## End state

```
Users & bookmarks     →  https://pul.llc
olafinancial.org      →  301 → https://pul.llc  (bridge; keep until migration done)
GitHub Pages          →  custom domain: pul.llc
Supabase Site URL     →  https://pul.llc
Auth redirect allowlist → pul.llc (+ olafinancial.org during transition)
GitHub / Porkbun / email accounts → stay olafinancial unless decided later
```

---

## Principles

1. **One canonical host for auth, PWA, and SEO:** `pul.llc`.
2. **Bridge, don’t dual-canonical forever:** prefer 301 from `.org` → `pul.llc` once pul is live.
3. **GitHub Pages** supports one first-class custom domain (repo `CNAME` file + Pages settings). Dual HTTPS without redirect needs a CDN (e.g. Cloudflare); not required if `.org` only redirects.
4. **Display name** (“Ola Financial” vs “pul”) can lag the domain move — update copy when the customer settles branding.

---

## Phase 0 — Decisions (done)

- [x] Primary domain: **pul.llc**
- [x] Temporary: **olafinancial.org** until everything is moved
- [x] Keep org/accounts as **olafinancial**

---

## Phase 1 — DNS + GitHub Pages (make pul.llc live)

### 1.1 Porkbun — `pul.llc`

Remove parking / pixie records. Point apex at GitHub Pages:

| Type | Host | Value |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `olafinancial.github.io` |

### 1.2 GitHub Pages

Repo → **Settings → Pages**:

1. Source: **GitHub Actions** (existing `deploy.yml`).
2. **Custom domain:** `pul.llc`.
3. After DNS propagates and the certificate is ready: enable **Enforce HTTPS**.

### 1.3 Repo `CNAME` file

Single line only (GitHub Pages primary domain):

```text
pul.llc
```

Commit and push to `main` so deploy stays in sync with Pages settings.

### 1.4 Verify

- [ ] `https://pul.llc` loads the app
- [ ] Valid HTTPS (no cert warning)
- [ ] `https://www.pul.llc` works (if www is required)
- [ ] **Do not** remove olafinancial.org DNS yet

---

## Phase 2 — Bridge olafinancial.org

**Preferred:** Porkbun **URL forwarding (301)** from `olafinancial.org` (and `www`) → `https://pul.llc`.

| Domain | Behavior |
|--------|----------|
| `pul.llc` | Serves the site (Pages primary) |
| `olafinancial.org` | 301 → `https://pul.llc` |

Optional short period: leave `.org` on GitHub DNS for parallel testing, then switch to 301-only.

---

## Phase 3 — Supabase auth URLs

**Authentication → URL configuration**

| Setting | Value |
|---------|--------|
| **Site URL** | `https://pul.llc` |
| **Redirect URLs** (during transition) | `https://pul.llc/**` |
| | `https://www.pul.llc/**` |
| | `https://olafinancial.org/**` |
| | `https://www.olafinancial.org/**` |
| | `http://localhost:3000/**` |

App code already uses pul.llc for some OAuth / password-reset redirects (`js/supabase-client.js`). Those only work after Phase 1 HTTPS is live.

After the bridge is 301-only and logins no longer hit `.org`, remove olafinancial.org from the allowlist.

---

## Phase 4 — App canonical pointers (product URL only)

Do **not** rename GitHub org or every “Ola Financial” string in this phase.

| Item | Target |
|------|--------|
| Root `CNAME` | `pul.llc` |
| `index.html` canonical + `og:url` | `https://pul.llc` |
| `manifest.json` `start_url` / `scope` | `https://pul.llc/` |
| Auth `redirectTo` in code | Confirm `https://pul.llc/...` |

**Leave unchanged for now:**

- GitHub org/repo `olafinancial`
- Porkbun account name
- Business email still using olafinancial (if any)
- Supabase project name
- In-app product title “Ola Financial” until copy is approved

---

## Phase 5 — Soft launch checklist

- [ ] Login / logout / password reset on `https://pul.llc`
- [ ] Old URL `https://olafinancial.org` lands on pul.llc (if 301)
- [ ] PWA “Add to Home Screen” from **pul.llc** (old installs from `.org` are a different origin)
- [ ] Reports / share watermark already references `pul.llc` — consistent
- [ ] Customer-facing links (WhatsApp, decks, signatures) → pul.llc
- [ ] CI / deploy still from same repo (no account renames)

---

## Phase 6 — Cleanup (when migration is complete)

- [ ] 301 from olafinancial.org has been stable
- [ ] Remove olafinancial.org from Supabase redirect URLs
- [ ] Decide: keep `.org` as permanent redirect, or park / expire
- [ ] Optional: unify UI/legal copy to final brand name
- [ ] Still no requirement to rename GitHub org

---

## Suggested order

1. DNS for **pul.llc** → GitHub Pages  
2. Pages custom domain + repo `CNAME` = `pul.llc` + HTTPS  
3. Supabase Site URL + redirect allowlist (both domains during transition)  
4. 301 **olafinancial.org → pul.llc**  
5. Smoke-test auth on pul.llc  
6. Repo PR for canonical / manifest / `CNAME` once DNS is confirmed  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Set Pages domain before DNS ready | Configure DNS first; wait for propagation; then custom domain + Enforce HTTPS |
| Auth redirects to non-live host | Only flip Supabase Site URL / code redirects after `https://pul.llc` works |
| Split login sessions on two origins | Prefer 301 bridge; one canonical host |
| PWA reinstall | Users who installed from olafinancial.org may need to add again from pul.llc |

---

## Related issues / docs

- Branding issues: [#23](https://github.com/olafinancial/olafinancial/issues/23), [#25](https://github.com/olafinancial/olafinancial/issues/25) (duplicates — domain first, full rebrand later)
- Hosting overview: `SETUP.md`, `tech_stack_investor.md`
- Status tracker: `current_plans.md`

---

## What stays “olafinancial” on purpose

| Account / resource | Action |
|--------------------|--------|
| GitHub org `olafinancial` | Keep |
| Repo `olafinancial` | Keep |
| Supabase project | Keep (URL config only) |
| Porkbun account | Keep (DNS records change) |
| Email / Google / banking under olafinancial | Keep until customer asks otherwise |
| **Product URL** | **pul.llc** |
| **Temporary user-facing old URL** | **olafinancial.org → pul.llc** |
