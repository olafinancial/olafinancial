// ============================================================
// OlaFinancial — Configuration
// ============================================================
// SETUP REQUIRED: Replace placeholder values before deploying.
// See SETUP.md for step-by-step instructions.
// ============================================================

// ── SUPABASE ─────────────────────────────────────────────────
// Replace these with your actual Supabase project credentials.
// Found at: https://supabase.com → Your Project → Settings → API
const SUPABASE_URL  = 'https://kwymfdbvfzexhckuaorh.supabase.co';  // ← REPLACE
const SUPABASE_ANON = 'sb_publishable_i_muV01vzwnLzYvaiU6RCg_JV0-qcD6';        // ← REPLACE

// ── APP METADATA ─────────────────────────────────────────────
const APP_CONFIG = {
  appName:       'Pul Planning',
  appVersion:    '1.0.0',
  appTagline:    'Personal Finance Platform',
  currency:      'NGN',
  currencySymbol:'₦',
  locale:        'en-NG',

  /**
   * Naive-user “common path” — start here, then go there.
   * Used in onboarding finale + Dashboard getting-started card.
   */
  gettingStartedPath: [
    {
      n: 1,
      route: '/income',
      title: 'Add your income',
      blurb: 'Money in first. Without income logged, tax, savings rate, and cash flow cannot be calculated.',
      tip: 'Why: everything else is measured against what you earn.',
      cta: 'Go to Income',
    },
    {
      n: 2,
      route: '/expenses',
      title: 'Log a few expenses',
      blurb: 'Money out. Even 5–10 real bills show where cash leaks each month.',
      tip: 'Why: you cannot cut what you cannot see.',
      cta: 'Go to Expenses',
    },
    {
      n: 3,
      route: '/balance-sheet',
      title: 'List assets & debts',
      blurb: 'What you own minus what you owe = net worth — your true financial scoreboard.',
      tip: 'Why: cash flow is monthly; net worth is the long game.',
      cta: 'Go to Balance Sheet',
    },
    {
      n: 4,
      route: '/dashboard',
      title: 'Review your dashboard',
      blurb: 'Your snapshot: health score, surplus/deficit, and plain-language alerts.',
      tip: 'Why: one screen tells you what needs attention first.',
      cta: 'Open Dashboard',
    },
    {
      n: 5,
      route: '/goals',
      title: 'Set one goal',
      blurb: 'Pick one target (emergency fund is a great first). Goals turn numbers into a plan.',
      tip: 'Why: vague wishes do not get funded — named goals do.',
      cta: 'Go to Goals',
    },
    {
      n: 6,
      route: '/debt',
      title: 'Optional: plan debt payoff',
      blurb: 'If you have loans, map a payoff order so interest stops eating your future.',
      tip: 'Avalanche = highest rate first · Snowball = smallest balance first.',
      cta: 'Debt Planner',
    },
    {
      n: 7,
      route: '/invest',
      title: 'Optional: investment profile quiz',
      blurb: 'Answer 10 scored questions to see Conservative / Balanced / Aggressive mixes for the Nigerian market (NGX, T-bills, REITs, etc.).',
      tip: 'Educational only — not personalised investment advice.',
      cta: 'Invest Profile',
    },
  ],

  /** HTML for the numbered getting-started path (onboarding + dashboard). */
  gettingStartedPathHTML(opts = {}) {
    const { interactive = false, compact = false } = opts;
    const steps = this.gettingStartedPath || [];
    return `
      <ol class="guide-path ${compact ? 'guide-path--compact' : ''}">
        ${steps.map((s, i) => `
          <li class="guide-path-step">
            <div class="guide-path-num" aria-hidden="true">${s.n}</div>
            <div class="guide-path-body">
              <div class="guide-path-title">${i === 0 ? 'Start here: ' : ''}${s.title}</div>
              <p class="guide-path-blurb">${s.blurb}</p>
              ${s.tip ? `<p class="guide-path-tip">${s.tip}</p>` : ''}
              ${interactive
                ? `<button type="button" class="btn btn-secondary btn-sm guide-path-cta" data-guide-route="${s.route}">${s.cta} →</button>`
                : `<span class="guide-path-hint text-muted text-xs">Menu: <strong>${s.route.replace('/', '') || 'dashboard'}</strong></span>`
              }
            </div>
            ${i < steps.length - 1 ? '<div class="guide-path-connector" aria-hidden="true"></div>' : ''}
          </li>
        `).join('')}
      </ol>`;
  },

  // Public social profiles (open in new tab)
  social: {
    x: {
      label: 'X',
      handle: '@pulplanning',
      url: 'https://x.com/pulplanning',
    },
    instagram: {
      label: 'Instagram',
      handle: '@pulplanning',
      url: 'https://www.instagram.com/pulplanning/',
    },
    facebook: {
      label: 'Facebook',
      handle: 'Pul Planning',
      // Business Page share / profile link provided by marketing
      url: 'https://m.facebook.com/story.php?story_fbid=pfbid0wSjkZAA6q2XxgmoHEYGbrLpA2fNPH6PKir8s9EDR95iKAuNAdTYKqoKDSwJDq2xRl&id=61592031444473',
    },
  },

  /**
   * Shared social icon row for auth, sidebar, logged-out.
   * @param {'default'|'compact'} variant
   */
  brandSocialHTML(variant = 'default') {
    const s = this.social;
    const cls = variant === 'compact' ? 'brand-social brand-social--compact' : 'brand-social';
    // Simple monochrome SVG marks (currentColor)
    const iconX = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`;
    const iconIg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;
    const iconFb = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.18 2.12.18v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z"/></svg>`;
    return `
      <div class="${cls}" aria-label="Follow Pul Planning">
        <a class="brand-social-link" href="${s.x.url}" target="_blank" rel="noopener noreferrer" title="${s.x.handle} on X" aria-label="Pul Planning on X">${iconX}<span>${s.x.handle}</span></a>
        <a class="brand-social-link" href="${s.instagram.url}" target="_blank" rel="noopener noreferrer" title="Instagram ${s.instagram.handle}" aria-label="Pul Planning on Instagram">${iconIg}<span>Instagram</span></a>
        <a class="brand-social-link" href="${s.facebook.url}" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Pul Planning on Facebook">${iconFb}<span>Facebook</span></a>
      </div>`;
  },

  exchangeRates: {
    NGN: 1,
    USD: 1500,
    EUR: 1600,
    GBP: 1900,
    AED: 408,
    CNY: 207,
    XOF: 2.44,
    XAF: 2.44,
    KES: 11.6,
    GHS: 101,
    CAD: 1100,
    ZAR: 82.5,
    SAR: 400,
    AUD: 980,
  },

  // ── NIGERIA TAX ACT 2025 — PERSONAL INCOME TAX ────────────
  // Source: Nigeria Tax Act 2025 (signed May 2025)
  // Brackets apply to Chargeable Income after reliefs
  taxBrackets: [
    { upTo:  80_000_000, rate: 0.00, label: '0% (≤ ₦800k/month)' },   // First ₦80M annual: 0%
    { upTo: 280_000_000, rate: 0.15, label: '15%' },                    // Next ₦200M: 15%
    { upTo: 500_000_000, rate: 0.20, label: '20%' },                    // Next ₦220M: 20%
    { upTo: Infinity,    rate: 0.25, label: '25%' },                    // Above ₦500M: 25%
  ],

  // Annual reliefs (kobo)
  taxReliefs: {
    personalRelief:    500_000_00,   // ₦500,000 personal income relief
    pensionRelief:     true,          // Employee pension (8%) is fully deductible
    nhfRelief:         true,          // NHF contributions are deductible
    disabilityRelief:  2_000_000_00, // ₦2M if permanently incapacitated
    maxRentRelief:     500_000_00,   // 20% of rent paid, max ₦500,000
  },

  // ── PENCOM CONTRIBUTORY PENSION ───────────────────────────
  pencom: {
    employeeRate:  0.08,   // 8% of monthly emoluments
    employerRate:  0.10,   // 10% of monthly emoluments
    totalRate:     0.18,   // 18% combined
    retirementAge: 50,     // Minimum retirement age for RSA withdrawal
    description:   'PENCOM Contributory Pension Scheme — Pension Reform Act 2014 (as amended)',
  },

  // ── NDIC DEPOSIT INSURANCE LIMITS ────────────────────────
  // Source: NDIC (Nigeria Deposit Insurance Corporation)
  ndic: {
    dmb:  500_000_000,    // ₦5,000,000 for Deposit Money Banks (commercial banks)
    mfb:  200_000_000,    // ₦2,000,000 for Microfinance Banks
    pmb:  200_000_000,    // ₦2,000,000 for Primary Mortgage Banks
    mmo:  150_000_000,    // ₦1,500,000 for Mobile Money Operators (PSBs)
  },

  // ── FINANCIAL RATIOS (benchmarks) ─────────────────────────
  benchmarks: {
    savingsRateMin:        0.20,  // ≥ 20% of net income
    emergencyFundMonths:   3,     // 3 months of essential expenses
    debtToAssetMax:        0.50,  // ≤ 50%
    coverageRatioMin:      1.0,   // ≥ 1× (assets / liabilities)
  },

  // ── DISCLAIMER ────────────────────────────────────────────
  disclaimer: `
    <strong>Disclaimer:</strong> Pul Planning provides financial calculations for informational 
    and educational purposes only. It is not a licensed financial adviser. Always verify 
    with a qualified Nigerian Chartered Accountant or financial planner before making financial decisions.
  `,
};
