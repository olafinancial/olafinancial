# Pul Planning — One-Page Launch Checklist

**Product:** Pul Planning (`pul.llc`) · **Repo:** [olafinancial/olafinancial](https://github.com/olafinancial/olafinancial)  
**Purpose:** Gate public go-live. Soft/beta launch may proceed with open items marked **Beta OK**.  
**Last updated:** 2026-07-22

---

## Owners

| Role | Who (fill names) | Scope |
|------|------------------|--------|
| **Product** | ________________ | UX truthfulness, feature freeze, sponsor content, comms |
| **Engineering** | ________________ | Code, CI, backend deploy, security config |
| **Ops / Infra** | ________________ | DNS, Supabase, Resend, Render, monitoring |
| **Legal / Compliance** | ________________ | NDPA, policies, NDPC, disclaimers, counsel review |
| **Support / GTM** | ________________ | Support email, tester list, launch messaging |

---

## Status legend

- `[ ]` Not done · `[~]` In progress · `[x]` Done · **Beta OK** = can soft-launch without it · **Blocker** = no public launch

---

## A. Legal & compliance — **Legal** (Blockers)

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| A1 | Counsel review of `privacy.html` + `terms.html` | Legal | [ ] **Blocker** | Templates shipped in repo; not a substitute for lawyer sign-off |
| A2 | NDPC registration / DCPMI tier assessment | Legal | [ ] **Blocker** | NDPA 2023 + GAID 2025 |
| A3 | DPO appointed (or outsourced) | Legal | [ ] **Blocker** | Required for major importance controllers |
| A4 | DPIA documented for financial profiling | Legal | [ ] **Blocker** | Keep with compliance pack |
| A5 | Breach runbook (72h NDPC notice path) | Legal + Ops | [ ] **Blocker** | Contact tree + evidence checklist |
| A6 | Confirm advisory scope stays “tool not adviser” | Legal + Product | [ ] | SEC/CBN posture; in-app disclaimer present |
| A7 | Privacy + Terms linked at signup + in-app | Engineering | [x] | Consent checkbox + `privacy.html` / `terms.html` |
| A8 | Support / privacy mailboxes live (`privacy@`, `hello@`) | Ops | [ ] **Blocker** | DNS + inbox |

---

## B. Product honesty & freeze — **Product** + **Engineering**

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| B1 | Household combined view does not overclaim | Engineering | [x] | Preview copy only; personal data still shown |
| B2 | NDIC excess-balance alerts work | Engineering | [x] | Fixed `APP_CONFIG.ndic` mapping + unit tests |
| B3 | Tax bracket display matches NTA 2025 engine | Engineering | [x] | `APP_CONFIG.taxBrackets` aligned |
| B4 | Feature freeze list for launch week | Product | [ ] | No half-shipped multi-tenant household |
| B5 | Sponsor banners off or real partners only | Product | [ ] **Beta OK** | GitHub #28 |
| B6 | Demo/reset/delete documented for testers | Product | [x] | `CUSTOMER_TESTING.md` |
| B7 | MFA (optional in PRD) decision | Product | [ ] **Beta OK** | Document “post-launch” if deferred |

---

## C. Production email & auth — **Ops** (Blocker for full launch)

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| C1 | Supabase Site URL = `https://pul.llc` | Ops | [ ] **Blocker** | Redirect allowlist includes `pul.llc/**` |
| C2 | Password reset email smoke test | Ops | [ ] **Blocker** | Inbox → link → app |
| C3 | Custom SMTP for auth (or accepted risk) | Ops | [ ] **Beta OK** | Avoid shared-infra rate limits at scale |
| C4 | Resend domain verified + `RESEND_*` set | Ops | [ ] | Digests; see `EMAIL_SETUP.md` / #38 |
| C5 | Confirm-email on/off decision | Product + Ops | [ ] | Document choice |

---

## D. Always-on backend — **Ops** + **Engineering** (Blocker for digests / delete)

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| D1 | Deploy Node API (Render blueprint `render.yaml`) | Ops | [ ] **Blocker*** | *If digests or account-delete required at launch |
| D2 | Env: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Ops | [ ] | Never in frontend |
| D3 | Env: `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL` | Ops | [ ] | |
| D4 | Env: `ADMIN_SECRET` + `NODE_ENV=production` | Ops | [ ] | Protects `GET /api/digest/run` |
| D5 | Smoke: `/api/health`, digest dry-run, account delete | Engineering | [ ] | |
| D6 | Cron timezone confirmed (07:00 UTC = 08:00 Lagos) | Ops | [ ] | |

\*Static-only soft launch can ship **without** digests if Product accepts “email digests later” messaging.

---

## E. Security & data — **Engineering** + **Ops**

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| E1 | RLS enabled on all user tables (prod) | Engineering | [ ] | Re-verify in Supabase dashboard |
| E2 | Service role key never in client bundle | Engineering | [x] | Anon/publishable only in `js/config.js` |
| E3 | `.env` not committed; secrets in host vault | Ops | [x]/[ ] | Local gitignore OK; confirm host |
| E4 | Admin routes not publicly abusable | Engineering | [ ] | Digest secret + admin list |
| E5 | Backup / point-in-time recovery understood | Ops | [ ] **Beta OK** | Supabase plan limits |
| E6 | Idle session timeout live | Engineering | [x] | 15 minutes |

---

## F. Quality & release — **Engineering**

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| F1 | CI green on `main` | Engineering | [x] | Unit + deploy workflows |
| F2 | Unit tests including NDIC / PIT | Engineering | [x] | Expand over time; import real modules later |
| F3 | E2E smoke on Chromium (staging or local) | Engineering | [ ] | Before cutover |
| F4 | Cache bust / SW version bumped for release | Engineering | [x] | `BUILD_ID` 20260722_launch |
| F5 | Mobile check (Android Chrome) | Product + Eng | [ ] | Nigeria-first device |
| F6 | Accessibility spot-check (keyboard, contrast) | Product | [ ] **Beta OK** | Full WCAG later |

---

## G. Domain, branding, GTM — **Ops** + **Product** + **Support**

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| G1 | `pul.llc` HTTPS + Pages custom domain | Ops | [x]/[ ] | Site 200; reconfirm DNS/HTTPS enforce |
| G2 | Old domain 301 strategy (if any) | Ops | [ ] **Beta OK** | |
| G3 | Support channel + SLA for beta | Support | [ ] | Email or WhatsApp |
| G4 | Launch audience list (invite-only?) | Product | [ ] | Recommend closed beta first |
| G5 | Public messaging avoids “guaranteed returns / advice” | Product | [ ] | |
| G6 | Sponsors / monetisation (#28, app store) | Product | [ ] **Beta OK** | After soft launch |

---

## H. Go / no-go

### Soft launch (invite-only / beta) — minimum bar

- [x] Privacy & Terms published and linked with signup consent  
- [x] NDIC + household honesty fixes  
- [ ] Password reset works on production domain  
- [ ] RLS verified on production Supabase  
- [ ] Named support contact  
- [ ] Legal **aware** of NDPC path (even if registration in progress)  

### Public launch — all Blockers closed

- [ ] A1–A6, A8 legal/compliance  
- [ ] C1–C2 auth email  
- [ ] D1–D5 if digests/delete are promised in marketing  
- [ ] E1, E4 security checks  
- [ ] F3, F5 release QA  
- [ ] G4–G5 GTM  

**Sign-off**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product | | | |
| Engineering | | | |
| Ops | | | |
| Legal | | | |

---

## Quick links

| Doc | Path |
|-----|------|
| Email ops | [EMAIL_SETUP.md](./EMAIL_SETUP.md) · [email_setup_execution.md](./email_setup_execution.md) |
| Domain | [DOMAIN_MIGRATION.md](./DOMAIN_MIGRATION.md) |
| Setup | [SETUP.md](./SETUP.md) |
| Customer test tools | [CUSTOMER_TESTING.md](./CUSTOMER_TESTING.md) |
| Requirements (NDPA) | [REQUIREMENTS.md](./REQUIREMENTS.md) §4 |
| Open GitHub | [#38 email](https://github.com/olafinancial/olafinancial/issues/38) · [#28 sponsors](https://github.com/olafinancial/olafinancial/issues/28) |
| Privacy / Terms | [privacy.html](./privacy.html) · [terms.html](./terms.html) |

---

*This checklist is an operational gate, not legal advice. Close Blockers before marketing Pul as a public finance platform for unrestricted users.*
