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
