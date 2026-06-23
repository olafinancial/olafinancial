// ============================================================
// OlaFinancial — Financial Math Utilities
// Nigerian-specific calculations (Nigeria Tax Act 2025,
// PENCOM pension, TVM, Debt Avalanche, NDIC alerts)
// All monetary values in KOBO internally (₦1 = 100 kobo)
// ============================================================

const WPUtils = (() => {

  // ── CURRENCY FORMATTING ──────────────────────────────────
  function fmt(kobo, opts = {}) {
    const naira = kobo / 100;
    const { compact = false, signed = false } = opts;
    const prefix = signed && naira > 0 ? '+' : '';
    if (compact && Math.abs(naira) >= 1_000_000_000) {
      return prefix + '₦' + (naira / 1_000_000_000).toFixed(1) + 'B';
    }
    if (compact && Math.abs(naira) >= 1_000_000) {
      return prefix + '₦' + (naira / 1_000_000).toFixed(1) + 'M';
    }
    if (compact && Math.abs(naira) >= 1_000) {
      return prefix + '₦' + (naira / 1_000).toFixed(0) + 'K';
    }
    return prefix + new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(naira);
  }

  function nairaToKobo(naira) { return Math.round(naira * 100); }
  function koboToNaira(kobo)  { return kobo / 100; }

  function pct(value, total) {
    if (!total || total === 0) return 0;
    return (value / total) * 100;
  }

  function fmtPct(decimal, decimals = 1) {
    return (decimal * 100).toFixed(decimals) + '%';
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── NIGERIAN PIT — NIGERIA TAX ACT 2025 ─────────────────
  // All amounts in KOBO
  function calcPIT(grossKobo, pensionKobo = 0, annualRentKobo = 0) {
    // Rent relief: 20% of annual rent, max ₦500,000 (50,000,000 kobo)
    const rentRelief = Math.min(annualRentKobo * 0.20, APP_CONFIG.rentReliefMax);
    const taxableKobo = Math.max(0, grossKobo - pensionKobo - rentRelief);

    // Progressive brackets (in kobo)
    const brackets = [
      { limit:  80_000_000, rate: 0.00 },  // First ₦800K
      { limit: 220_000_000, rate: 0.15 },  // Next  ₦2.2M
      { limit: 900_000_000, rate: 0.18 },  // Next  ₦9M
      { limit:1_300_000_000,rate: 0.21 },  // Next  ₦13M
      { limit:2_500_000_000,rate: 0.23 },  // Next  ₦25M
      { limit: Infinity,    rate: 0.25 },  // Above ₦50M
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

  function effectiveTaxRate(grossKobo, taxKobo) {
    if (!grossKobo) return 0;
    return taxKobo / grossKobo;
  }

  // Tax bracket for a given taxable income
  function taxBracket(taxableKobo) {
    const thresholds = [
      { max: 80_000_000,    label: '0% (Tax-Free)',  rate: 0 },
      { max: 300_000_000,   label: '15%',            rate: 0.15 },
      { max: 1_200_000_000, label: '18%',            rate: 0.18 },
      { max: 2_500_000_000, label: '21%',            rate: 0.21 },
      { max: 5_000_000_000, label: '23%',            rate: 0.23 },
      { max: Infinity,      label: '25% (Top Rate)', rate: 0.25 },
    ];
    for (const t of thresholds) {
      if (taxableKobo <= t.max) return t;
    }
    return thresholds[thresholds.length - 1];
  }

  // PENCOM pension contribution (employee 8% of emoluments)
  function calcPensionEmployee(basicKobo, housingKobo = 0, transportKobo = 0) {
    return Math.round((basicKobo + housingKobo + transportKobo) * 0.08);
  }

  // NHF contribution (2.5% of basic salary)
  function calcNHF(basicKobo) { return Math.round(basicKobo * 0.025); }

  // ── TIME VALUE OF MONEY ──────────────────────────────────
  // Future Value: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  function calcFV(annualRate, years, monthlyPaymentKobo = 0, presentValueKobo = 0) {
    const r = annualRate / 12;
    const n = Math.round(years * 12);
    if (n <= 0) return presentValueKobo;
    if (Math.abs(r) < 1e-10) {
      return presentValueKobo + monthlyPaymentKobo * n;
    }
    const growth = Math.pow(1 + r, n);
    return Math.round(presentValueKobo * growth + monthlyPaymentKobo * (growth - 1) / r);
  }

  // Monthly Payment required to reach FV from PV in n years
  function calcPMT(annualRate, years, presentValueKobo, futureValueKobo) {
    const r = annualRate / 12;
    const n = Math.round(years * 12);
    if (n <= 0) return 0;
    if (Math.abs(r) < 1e-10) {
      return Math.max(0, Math.round((futureValueKobo - presentValueKobo) / n));
    }
    const growth = Math.pow(1 + r, n);
    const pmt = (futureValueKobo - presentValueKobo * growth) * r / (growth - 1);
    return Math.max(0, Math.round(pmt));
  }

  // Monthly annuity withdrawal from a lump sum over n years
  function calcAnnuity(balanceKobo, annualRate, years) {
    const r = annualRate / 12;
    const n = years * 12;
    if (Math.abs(r) < 1e-10) return Math.round(balanceKobo / n);
    return Math.round(balanceKobo * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }

  // ── DEBT AVALANCHE ───────────────────────────────────────
  // debts: [{ id, name, balanceKobo, apr, monthlyPaymentKobo }]
  // Returns sorted schedule with months-to-payoff and total interest
  function calcDebtAvalanche(debts, extraPaymentKobo = 0) {
    if (!debts || !debts.length) return [];

    // Sort highest APR first
    const sorted = debts
      .filter(d => d.balanceKobo > 0 && d.apr > 0)
      .sort((a, b) => b.apr - a.apr);

    let results = sorted.map(d => {
      const r = d.apr / 100 / 12;
      let balance = d.balanceKobo;
      let months  = 0;
      let totalInterest = 0;
      const minPmt = d.monthlyPaymentKobo;

      // Minimum payment projection
      let minBal = balance;
      let minInt = 0;
      for (let i = 0; i < 600 && minBal > 0; i++) {
        const interest = Math.round(minBal * r);
        minInt += interest;
        minBal = Math.max(0, minBal + interest - minPmt);
      }

      return {
        ...d,
        totalInterestMinPmt: minInt,
        sortedIndex: sorted.indexOf(d),
      };
    });

    // Avalanche: simulate cascading payments
    let remaining = sorted.map(d => ({ ...d, balance: d.balanceKobo }));
    let monthCounts = new Array(remaining.length).fill(0);
    let avalancheInterest = new Array(remaining.length).fill(0);
    let freed = 0;

    for (let month = 0; month < 600; month++) {
      let allPaid = true;
      let extraLeft = extraPaymentKobo + freed;
      freed = 0;

      for (let i = 0; i < remaining.length; i++) {
        const d = remaining[i];
        if (d.balance <= 0) continue;
        allPaid = false;

        const r = d.apr / 100 / 12;
        const interest = Math.round(d.balance * r);
        avalancheInterest[i] += interest;
        d.balance += interest;

        // Apply minimum payment
        let payment = Math.min(d.balance, d.monthlyPaymentKobo);
        // Apply extra to highest-priority remaining
        if (i === remaining.findIndex(x => x.balance > 0)) {
          payment = Math.min(d.balance, payment + extraLeft);
          extraLeft = 0;
        }
        d.balance -= payment;
        if (d.balance <= 0) {
          freed += d.monthlyPaymentKobo;
          monthCounts[i] = month + 1;
          d.balance = 0;
        }
      }
      if (allPaid) break;
    }

    return results.map((r, i) => ({
      ...r,
      monthsToPayoffAvalanche: monthCounts[i] || 0,
      totalInterestAvalanche:  avalancheInterest[i] || 0,
      interestSaved: Math.max(0, (r.totalInterestMinPmt || 0) - (avalancheInterest[i] || 0)),
    }));
  }

  // ── BALANCE SHEET ─────────────────────────────────────────
  function calcNetWorth(totalAssetsKobo, totalLiabilitiesKobo) {
    return totalAssetsKobo - totalLiabilitiesKobo;
  }

  function coverageRatio(totalAssetsKobo, totalLiabilitiesKobo) {
    if (!totalLiabilitiesKobo) return Infinity;
    return totalAssetsKobo / totalLiabilitiesKobo;
  }

  function debtToAssetRatio(totalLiabilitiesKobo, totalAssetsKobo) {
    if (!totalAssetsKobo) return 0;
    return (totalLiabilitiesKobo / totalAssetsKobo) * 100;
  }

  // NDIC alert check
  function checkNDIC(balanceKobo, institutionType = 'dmb') {
    const limit = institutionType === 'dmb' ? APP_CONFIG.ndicLimitsDMB : APP_CONFIG.ndicLimitsMFB;
    if (balanceKobo > limit) {
      return { alert: true, excess: balanceKobo - limit, limit, institutionType };
    }
    return { alert: false };
  }

  // ── EMERGENCY FUND ────────────────────────────────────────
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

  // ── RETIREMENT ────────────────────────────────────────────
  function calcRetirement({
    currentAgeYears,
    retirementAgeYears,
    rsaBalanceKobo,
    monthlyContributionKobo,
    expectedAnnualReturn = 0.11,
    monthlyIncomeNeededKobo,
    inflationRate = APP_CONFIG.inflationRate,
  }) {
    const yearsToRetirement = retirementAgeYears - currentAgeYears;
    if (yearsToRetirement <= 0) return null;

    const projectedRSA = calcFV(expectedAnnualReturn, yearsToRetirement, monthlyContributionKobo, rsaBalanceKobo);

    // Real value of income needed at retirement (inflation-adjusted)
    const realIncomeNeeded = Math.round(monthlyIncomeNeededKobo * Math.pow(1 + inflationRate, yearsToRetirement));

    // Monthly annuity from projected RSA over 25 years post-retirement
    const monthlyFromRSA = calcAnnuity(projectedRSA, expectedAnnualReturn, 25);

    const gap = Math.max(0, realIncomeNeeded - monthlyFromRSA);
    const payCycles = yearsToRetirement * 12;

    return {
      yearsToRetirement,
      payCycles,
      projectedRSA,
      monthlyFromRSA,
      realIncomeNeeded,
      gap,
      isFunded: gap === 0,
    };
  }

  // ── CASH FLOW ─────────────────────────────────────────────
  function calcCashFlow(incomeEntries, expenseEntries) {
    const totalIncome     = incomeEntries.reduce((s, e) => s + (e.gross_amount || 0), 0);
    const totalDeductions = incomeEntries.reduce((s, e) => s + (e.paye_tax || 0) + (e.pension_contrib || 0) + (e.nhf_contrib || 0) + (e.other_deductions || 0), 0);
    const netIncome       = totalIncome - totalDeductions;

    const operating   = expenseEntries.filter(e => !['Investment & Debt','Financing'].includes(e.category)).reduce((s, e) => s + (e.amount || 0), 0);
    const investment  = expenseEntries.filter(e => e.category === 'Investment & Debt').reduce((s, e) => s + (e.amount || 0), 0);
    const financing   = expenseEntries.filter(e => e.category === 'Interest & Debt').reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpenses = operating + investment + financing;
    const netCashFlow   = netIncome - totalExpenses;

    const nonDiscretionary = expenseEntries.filter(e => !e.is_discretionary).reduce((s, e) => s + (e.amount || 0), 0);
    const discretionary    = totalExpenses - nonDiscretionary;

    return { totalIncome, totalDeductions, netIncome, operating, investment, financing, totalExpenses, netCashFlow, nonDiscretionary, discretionary };
  }

  // ── PASSIVE INCOME KPIs ───────────────────────────────────
  function passiveIncomeKPI(incomeEntries, totalExpensesKobo) {
    const passive = incomeEntries.filter(e => e.income_type === 'passive').reduce((s, e) => s + (e.gross_amount || 0), 0);
    const total   = incomeEntries.reduce((s, e) => s + (e.gross_amount || 0), 0);
    return {
      passiveKobo: passive,
      totalKobo:   total,
      pctOfTotal:  pct(passive, total),
      pctOfExpenses: pct(passive, totalExpensesKobo),
    };
  }

  // ── GOAL ─────────────────────────────────────────────────
  function goalProgress(goal) {
    const daysLeft = Math.max(0, (new Date(goal.target_date) - new Date()) / 86400000);
    const yearsLeft = daysLeft / 365;
    const required  = calcPMT(goal.expected_return_rate, yearsLeft, goal.current_savings, goal.target_amount);
    const projected = calcFV(goal.expected_return_rate, yearsLeft, goal.monthly_contribution, goal.current_savings);
    const progressPct = Math.min(100, pct(goal.current_savings, goal.target_amount));
    const onTrack = projected >= goal.target_amount;
    return { daysLeft, yearsLeft, required, projected, progressPct, onTrack };
  }

  // ── FINANCIAL HEALTH SCORE ────────────────────────────────
  // Returns 0–100 composite score
  function healthScore({ netWorthKobo, passivePct, debtToAssetPct, emergencyFundPct, retirementGap }) {
    let score = 0;
    // Net worth > 0: 20 pts
    if (netWorthKobo > 0) score += 20;
    // Passive income >= 50%: up to 25 pts
    score += Math.min(25, (passivePct / 100) * 25);
    // Debt to asset < 50%: up to 20 pts
    score += Math.max(0, 20 - (debtToAssetPct / 100) * 20);
    // Emergency fund >= 100%: up to 20 pts
    score += Math.min(20, (emergencyFundPct / 100) * 20);
    // No retirement gap: 15 pts
    if (!retirementGap || retirementGap <= 0) score += 15;
    else score += Math.max(0, 15 - (retirementGap / 10_000_000_000) * 15);
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  function healthScoreLabel(score) {
    if (score >= 80) return { label: 'Excellent',   color: 'accent' };
    if (score >= 60) return { label: 'Good',         color: 'accent' };
    if (score >= 40) return { label: 'Fair',         color: 'gold' };
    if (score >= 20) return { label: 'Needs Work',  color: 'gold' };
    return                  { label: 'Critical',    color: 'danger' };
  }

  // ── PERIOD HELPERS ────────────────────────────────────────
  function currentPeriod() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`;
  }

  function periodLabel(periodMonth) {
    return new Date(periodMonth + 'T00:00:00').toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
  }

  function last12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
    }
    return months;
  }

  return {
    fmt, nairaToKobo, koboToNaira, pct, fmtPct, fmtDate,
    calcPIT, effectiveTaxRate, taxBracket,
    calcPensionEmployee, calcNHF,
    calcFV, calcPMT, calcAnnuity,
    calcDebtAvalanche,
    calcNetWorth, coverageRatio, debtToAssetRatio, checkNDIC,
    emergencyFundTarget, emergencyFundStatus,
    calcRetirement,
    calcCashFlow,
    passiveIncomeKPI,
    goalProgress,
    healthScore, healthScoreLabel,
    currentPeriod, periodLabel, last12Months,
  };
})();
