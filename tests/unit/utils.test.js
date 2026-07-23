/**
 * Unit tests for OlaFinancial financial math utilities (utils.js)
 * Tests extracted pure functions only — no DOM or Supabase dependency.
 * Run with: npm run test:unit
 */

// ─── Pure function helpers (duplicated here to avoid ESM globals) ───────────
function cleanNum(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

function nairaToKobo(naira) { return Math.round(naira * 100); }
function koboToNaira(kobo)  { return kobo / 100; }

function pct(value, total) {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
}

function calcPensionEmployee(basicKobo, housingKobo = 0, transportKobo = 0) {
  return Math.round((basicKobo + housingKobo + transportKobo) * 0.08);
}

function calcNHF(basicKobo) { return Math.round(basicKobo * 0.025); }

function calcFV(annualRate, years, monthlyPaymentKobo = 0, presentValueKobo = 0) {
  const r = annualRate / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return presentValueKobo;
  if (Math.abs(r) < 1e-10) return presentValueKobo + monthlyPaymentKobo * n;
  const growth = Math.pow(1 + r, n);
  return Math.round(presentValueKobo * growth + monthlyPaymentKobo * (growth - 1) / r);
}

function calcNetWorth(totalAssetsKobo, totalLiabilitiesKobo) {
  return totalAssetsKobo - totalLiabilitiesKobo;
}

function debtToAssetRatio(totalLiabilitiesKobo, totalAssetsKobo) {
  if (!totalAssetsKobo) return 0;
  return (totalLiabilitiesKobo / totalAssetsKobo) * 100;
}

function emergencyFundTarget(monthlyNonDiscretionaryKobo) {
  return monthlyNonDiscretionaryKobo * 3;
}

function emergencyFundStatus(currentKobo, targetKobo) {
  if (!targetKobo) return { status: 'no_target', pct: 0 };
  const p = (currentKobo / targetKobo) * 100;
  if (p >= 100) return { status: 'on_track',  pct: Math.min(p, 100), label: 'Fully Funded' };
  if (p >= 67)  return { status: 'building',  pct: p, label: 'Building (2-3 months)' };
  if (p >= 33)  return { status: 'warning',   pct: p, label: 'Warning (1-2 months)' };
  return           { status: 'critical',  pct: p, label: 'Critical (< 1 month)' };
}

/** Mirrors js/utils.js NTA 2025 §30(2) — six deductible expenses */
function calcRentRelief(annualRentKobo = 0) {
  return Math.round(Math.min(Math.max(0, annualRentKobo) * 0.20, 50_000_000));
}

function calcPIT(grossKobo, opts = 0, legacyRentKobo = 0) {
  let r;
  if (opts != null && typeof opts === 'object') {
    r = {
      pension: opts.pension || 0,
      nhf: opts.nhf || 0,
      nhis: opts.nhis || 0,
      annualRent: opts.annualRent || opts.rent || 0,
      mortgageInterest: opts.mortgageInterest || 0,
      lifeInsurance: opts.lifeInsurance || 0,
    };
  } else {
    r = { pension: opts || 0, nhf: 0, nhis: 0, annualRent: legacyRentKobo || 0, mortgageInterest: 0, lifeInsurance: 0 };
  }
  const rentRelief = calcRentRelief(r.annualRent);
  const taxableKobo = Math.max(0, grossKobo - r.pension - r.nhf - r.nhis
    - r.mortgageInterest - r.lifeInsurance - rentRelief);
  const brackets = [
    { limit:  80_000_000, rate: 0.00 },
    { limit: 220_000_000, rate: 0.15 },
    { limit: 900_000_000, rate: 0.18 },
    { limit:1_300_000_000,rate: 0.21 },
    { limit:2_500_000_000,rate: 0.23 },
    { limit: Infinity,    rate: 0.25 },
  ];
  let taxKobo = 0;
  let remaining = taxableKobo;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, b.limit);
    taxKobo += taxable * b.rate;
    remaining -= taxable;
  }
  return Math.round(taxKobo);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('cleanNum', () => {
  test('strips commas from formatted numbers', () => {
    expect(cleanNum('1,234,567')).toBe(1234567);
  });
  test('handles empty/null', () => {
    expect(cleanNum('')).toBe(0);
    expect(cleanNum(null)).toBe(0);
  });
  test('handles plain number strings', () => {
    expect(cleanNum('1500.50')).toBeCloseTo(1500.50);
  });
});

describe('nairaToKobo / koboToNaira', () => {
  test('converts naira to kobo correctly', () => {
    expect(nairaToKobo(100)).toBe(10000);
    expect(nairaToKobo(0.5)).toBe(50);
  });
  test('converts kobo back to naira', () => {
    expect(koboToNaira(10000)).toBe(100);
  });
  test('round-trips without precision loss', () => {
    expect(koboToNaira(nairaToKobo(12345))).toBe(12345);
  });
});

describe('pct', () => {
  test('calculates percentage correctly', () => {
    expect(pct(50, 200)).toBe(25);
  });
  test('returns 0 when total is 0', () => {
    expect(pct(100, 0)).toBe(0);
  });
  test('handles 100%', () => {
    expect(pct(200, 200)).toBe(100);
  });
});

describe('calcPensionEmployee (PENCOM 8%)', () => {
  test('computes 8% of basic only', () => {
    expect(calcPensionEmployee(100_000_00)).toBe(8_000_00);
  });
  test('includes housing and transport allowances', () => {
    // 8% of (100k + 20k + 10k) = 8% of 130k
    expect(calcPensionEmployee(100_000_00, 20_000_00, 10_000_00)).toBe(10_400_00);
  });
  test('returns 0 on zero basic', () => {
    expect(calcPensionEmployee(0)).toBe(0);
  });
});

describe('calcNHF (NHF 2.5%)', () => {
  test('calculates 2.5% of basic', () => {
    expect(calcNHF(100_000_00)).toBe(2_500_00);
  });
});

describe('calcFV (Future Value)', () => {
  test('zero rate returns PV + (PMT * n)', () => {
    // 0% rate, ₦1000/month for 12 months, no PV
    expect(calcFV(0, 1, 100_000, 0)).toBe(1_200_000);
  });
  test('no payments at positive rate grows PV', () => {
    // PV = ₦100,000 at 12%/yr for 1yr
    const fv = calcFV(0.12, 1, 0, 100_000);
    expect(fv).toBeGreaterThan(100_000);
  });
  test('returns PV when n is 0', () => {
    expect(calcFV(0.10, 0, 1000, 500_000)).toBe(500_000);
  });
});

describe('calcNetWorth', () => {
  test('assets minus liabilities', () => {
    expect(calcNetWorth(500_000_00, 200_000_00)).toBe(300_000_00);
  });
  test('negative net worth when liabilities exceed assets', () => {
    expect(calcNetWorth(100_000_00, 300_000_00)).toBe(-200_000_00);
  });
});

describe('debtToAssetRatio', () => {
  test('computes ratio as percentage', () => {
    expect(debtToAssetRatio(50_000_00, 200_000_00)).toBe(25);
  });
  test('returns 0 when no assets', () => {
    expect(debtToAssetRatio(50_000_00, 0)).toBe(0);
  });
});

describe('emergencyFundTarget', () => {
  test('returns 3x monthly non-discretionary spend', () => {
    expect(emergencyFundTarget(100_000_00)).toBe(300_000_00);
  });
});

describe('emergencyFundStatus', () => {
  test('on_track when fully funded', () => {
    const s = emergencyFundStatus(300_000_00, 300_000_00);
    expect(s.status).toBe('on_track');
    expect(s.pct).toBe(100);
  });
  test('building at ~75%', () => {
    const s = emergencyFundStatus(225_000_00, 300_000_00);
    expect(s.status).toBe('building');
  });
  test('warning at ~50%', () => {
    const s = emergencyFundStatus(150_000_00, 300_000_00);
    expect(s.status).toBe('warning');
  });
  test('critical below 33%', () => {
    const s = emergencyFundStatus(50_000_00, 300_000_00);
    expect(s.status).toBe('critical');
  });
  test('no_target when target is 0', () => {
    const s = emergencyFundStatus(100_000_00, 0);
    expect(s.status).toBe('no_target');
  });
});

// NDIC — mirrors fixed js/utils.js (APP_CONFIG.ndic.* in kobo)
const NDIC = {
  dmb: 500_000_000, // ₦5,000,000
  mfb: 200_000_000, // ₦2,000,000
  pmb: 200_000_000,
  mmo: 150_000_000,
};

function ndicLimitKobo(institutionType = 'dmb', config = NDIC) {
  const key = String(institutionType || 'dmb').toLowerCase();
  return config[key] != null ? Number(config[key]) || 0 : config.dmb;
}

function checkNDIC(balanceKobo, institutionType = 'dmb', config = NDIC) {
  const bal = Math.max(0, Number(balanceKobo) || 0);
  const limit = ndicLimitKobo(institutionType, config);
  if (limit > 0 && bal > limit) {
    return { alert: true, excess: bal - limit, limit, institutionType };
  }
  return { alert: false, limit, institutionType };
}

describe('checkNDIC (deposit insurance thresholds)', () => {
  test('no alert when balance is within DMB ₦5M limit', () => {
    // ₦4,999,999.00 in kobo
    const r = checkNDIC(499_999_900, 'dmb');
    expect(r.alert).toBe(false);
    expect(r.limit).toBe(500_000_000);
  });
  test('alerts when DMB balance exceeds ₦5M', () => {
    const r = checkNDIC(600_000_000, 'dmb'); // ₦6M
    expect(r.alert).toBe(true);
    expect(r.excess).toBe(100_000_000);
    expect(r.limit).toBe(500_000_000);
  });
  test('uses lower MFB limit (₦2M)', () => {
    const r = checkNDIC(300_000_000, 'mfb'); // ₦3M
    expect(r.alert).toBe(true);
    expect(r.limit).toBe(200_000_000);
  });
  test('defaults unknown institution type to DMB limit path via config', () => {
    const r = checkNDIC(100, 'unknown_type', { dmb: 500_000_000 });
    expect(r.alert).toBe(false);
    expect(r.limit).toBe(500_000_000);
  });
});

describe('calcPIT (Nigerian Tax Act 2025 §30(2) six deductibles)', () => {
  test('income below ₦800K per year is tax-free', () => {
    expect(calcPIT(80_000_000)).toBe(0);
  });
  test('income in 15% bracket', () => {
    const tax = calcPIT(100_000_000);
    expect(tax).toBe(3_000_000);
  });
  test('pension deductions reduce taxable income', () => {
    const taxWithout = calcPIT(200_000_000);
    const taxWith    = calcPIT(200_000_000, 10_000_000);
    expect(taxWith).toBeLessThan(taxWithout);
  });
  test('rent relief is 20% capped at ₦500k', () => {
    expect(calcRentRelief(100_000_000)).toBe(20_000_000); // 20% of ₦1M
    expect(calcRentRelief(10_000_000_000)).toBe(50_000_000); // cap ₦500k
  });
  test('all six reliefs reduce tax vs pension-only', () => {
    const gross = 12_000_000_00; // ₦12M
    const pensionOnly = calcPIT(gross, { pension: 960_000_00 });
    const allSix = calcPIT(gross, {
      pension: 960_000_00,
      nhf: 180_000_00,
      nhis: 126_000_00,
      annualRent: 2_000_000_00,       // → ₦400k relief
      mortgageInterest: 500_000_00,
      lifeInsurance: 100_000_00,
    });
    expect(allSix).toBeLessThan(pensionOnly);
  });
  test('zero income pays no tax', () => {
    expect(calcPIT(0)).toBe(0);
  });
});
