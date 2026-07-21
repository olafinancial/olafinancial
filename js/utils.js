// ============================================================
// OlaFinancial — Financial Math Utilities
// Nigerian-specific calculations (Nigeria Tax Act 2025,
// PENCOM pension, TVM, Debt Avalanche, NDIC alerts)
// All monetary values in KOBO internally (₦1 = 100 kobo)
// ============================================================

const WPUtils = (() => {

  // ── CURRENCY FORMATTING ──────────────────────────────────
  const CURRENCY_SYMBOLS = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
  };

  function fmt(kobo, opts = {}) {
    const amount = kobo / 100;
    const currencyCode = opts.currency || WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const isNone = currencyCode === 'NONE';
    const symbol = isNone ? '' : (CURRENCY_SYMBOLS[currencyCode] || '₦');
    const locale = currencyCode === 'NGN' ? 'en-NG' : 'en-US';
    
    const { compact = false, signed = false } = opts;
    const prefix = signed && amount > 0 ? '+' : '';
    
    if (compact && Math.abs(amount) >= 1_000_000_000) {
      return prefix + symbol + (amount / 1_000_000_000).toFixed(1) + 'B';
    }
    if (compact && Math.abs(amount) >= 1_000_000) {
      return prefix + symbol + (amount / 1_000_000).toFixed(1) + 'M';
    }
    if (compact && Math.abs(amount) >= 1_000) {
      return prefix + symbol + (amount / 1_000).toFixed(0) + 'K';
    }
    
    if (isNone) {
      return prefix + new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    return prefix + new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function cleanNum(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, '')) || 0;
  }

  function maskNumberInput(el) {
    if (!el) return;
    el.addEventListener('input', (e) => {
      let cursor = e.target.selectionStart;
      let originalLen = e.target.value.length;
      
      // Strip everything except digits and one decimal point
      let val = e.target.value.replace(/[^\d.]/g, '');
      const parts = val.split('.');
      if (parts.length > 2) parts.splice(2);
      
      // Format integer part with commas
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const formatted = parts.join('.');
      
      e.target.value = formatted;
      
      // Adjust cursor
      let newLen = formatted.length;
      e.target.setSelectionRange(cursor + (newLen - originalLen), cursor + (newLen - originalLen));
    });
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

  // ── NIGERIAN PIT — NIGERIA TAX ACT 2025 §30(2) ───────────
  // Six deductible expenses (all annual amounts in KOBO unless noted):
  //  1. Pension (Pension Reform Act — employee 8% + approved AVC)
  //  2. NHF (National Housing Fund — typically 2.5% of basic)
  //  3. NHIS (National Health Insurance Scheme)
  //  4. Mortgage interest on owner-occupied residential housing (interest only)
  //  5. Life insurance / deferred annuity premiums (self + spouse)
  //  6. Rent relief — 20% of annual rent paid, capped at ₦500,000
  // CRA abolished. Chargeable income → progressive brackets.

  const PIT_BRACKETS = [
    { limit:  80_000_000, rate: 0.00 },  // First ₦800K
    { limit: 220_000_000, rate: 0.15 },  // Next  ₦2.2M
    { limit: 900_000_000, rate: 0.18 },  // Next  ₦9M
    { limit:1_300_000_000,rate: 0.21 },  // Next  ₦13M
    { limit:2_500_000_000,rate: 0.23 },  // Next  ₦25M
    { limit: Infinity,    rate: 0.25 },  // Above ₦50M
  ];

  function rentReliefMaxKobo() {
    return APP_CONFIG.rentReliefMax
      || (APP_CONFIG.taxReliefs && APP_CONFIG.taxReliefs.maxRentRelief)
      || 50_000_000; // ₦500,000
  }

  /** Rent relief: min(20% of annual rent, ₦500,000). Input/output kobo. */
  function calcRentRelief(annualRentKobo = 0) {
    const rent = Math.max(0, Number(annualRentKobo) || 0);
    return Math.round(Math.min(rent * 0.20, rentReliefMaxKobo()));
  }

  /**
   * Normalize relief inputs. Supports legacy call shape:
   *   calcPIT(gross, pensionKobo, annualRentKobo)
   * and object form:
   *   calcPIT(gross, { pension, nhf, nhis, annualRent, mortgageInterest, lifeInsurance })
   * All annual kobo.
   */
  function normalizePITReliefs(opts = 0, legacyRentKobo = 0) {
    if (opts != null && typeof opts === 'object' && !Array.isArray(opts)) {
      return {
        pension: Math.max(0, Number(opts.pension) || 0),
        nhf: Math.max(0, Number(opts.nhf) || 0),
        nhis: Math.max(0, Number(opts.nhis) || 0),
        annualRent: Math.max(0, Number(opts.annualRent != null ? opts.annualRent : opts.rent) || 0),
        mortgageInterest: Math.max(0, Number(opts.mortgageInterest) || 0),
        lifeInsurance: Math.max(0, Number(opts.lifeInsurance) || 0),
      };
    }
    return {
      pension: Math.max(0, Number(opts) || 0),
      nhf: 0,
      nhis: 0,
      annualRent: Math.max(0, Number(legacyRentKobo) || 0),
      mortgageInterest: 0,
      lifeInsurance: 0,
    };
  }

  /**
   * Full breakdown of the six §30(2) deductions + chargeable income + tax.
   * @param {number} annualGrossKobo
   * @param {object|number} opts reliefs (or legacy pension kobo)
   * @param {number} [legacyRentKobo]
   */
  function summarizePIT(annualGrossKobo, opts = 0, legacyRentKobo = 0) {
    const gross = Math.max(0, Number(annualGrossKobo) || 0);
    const r = normalizePITReliefs(opts, legacyRentKobo);
    const rentRelief = calcRentRelief(r.annualRent);

    // The six deductible items (annual kobo)
    const six = {
      pension: r.pension,                 // 1
      nhf: r.nhf,                         // 2
      nhis: r.nhis,                       // 3
      mortgageInterest: r.mortgageInterest, // 4
      lifeInsurance: r.lifeInsurance,     // 5
      rentRelief,                         // 6 (computed from annual rent)
    };

    const totalReliefs = six.pension + six.nhf + six.nhis
      + six.mortgageInterest + six.lifeInsurance + six.rentRelief;
    const taxableKobo = Math.max(0, gross - totalReliefs);
    const taxKobo = _applyPITBrackets(taxableKobo);

    return {
      annualGrossKobo: gross,
      reliefs: six,
      annualRentPaid: r.annualRent,
      totalReliefsKobo: totalReliefs,
      taxableKobo,
      taxKobo,
      effectiveRate: gross > 0 ? taxKobo / gross : 0,
    };
  }

  function _applyPITBrackets(taxableKobo) {
    let taxKobo = 0;
    let remaining = Math.max(0, taxableKobo);
    for (const b of PIT_BRACKETS) {
      if (remaining <= 0) break;
      const band = Math.min(remaining, b.limit);
      taxKobo += band * b.rate;
      remaining -= band;
    }
    return Math.round(taxKobo);
  }

  /**
   * Annual PAYE (kobo). Backward-compatible:
   *   calcPIT(gross, pension, rent)  OR  calcPIT(gross, { pension, nhf, nhis, ... })
   */
  function calcPIT(grossKobo, opts = 0, legacyRentKobo = 0) {
    return summarizePIT(grossKobo, opts, legacyRentKobo).taxKobo;
  }

  function calcTaxableIncome(grossKobo, opts = 0, legacyRentKobo = 0) {
    return summarizePIT(grossKobo, opts, legacyRentKobo).taxableKobo;
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

  // NHIS contribution (1.75% of basic — common payroll estimate; amount override allowed)
  function calcNHIS(basicKobo) { return Math.round(basicKobo * 0.0175); }

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

  // ── DEBT PAYOFF STRATEGY ─────────────────────────────────
  // debts: [{ id, name, balanceKobo, apr, monthlyPaymentKobo }]
  // strategy: 'avalanche' (highest APR first) or 'snowball' (lowest balance first)
  // Returns sorted schedule with months-to-payoff and total interest
  function calcDebtStrategy(debts, extraPaymentKobo = 0, strategy = 'avalanche') {
    if (!debts || !debts.length) return [];

    // Sort: Avalanche = highest APR first, Snowball = lowest balance first
    const sorted = debts
      .filter(d => d.balanceKobo > 0 && (d.apr > 0 || d.balanceKobo > 0))
      .sort((a, b) => {
        if (strategy === 'snowball') {
          return a.balanceKobo - b.balanceKobo;
        }
        return b.apr - a.apr;
      });

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

    // Strategy cascade simulation
    let remaining = sorted.map(d => ({ ...d, balance: d.balanceKobo }));
    let monthCounts = new Array(remaining.length).fill(0);
    let strategyInterest = new Array(remaining.length).fill(0);
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
        strategyInterest[i] += interest;
        d.balance += interest;

        // Apply minimum payment
        let payment = Math.min(d.balance, d.monthlyPaymentKobo);
        // Apply extra to highest priority remaining
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
      monthsToPayoff: monthCounts[i] || 0,
      totalInterestStrategy:  strategyInterest[i] || 0,
      interestSaved: Math.max(0, (r.totalInterestMinPmt || 0) - (strategyInterest[i] || 0)),
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
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentRSAKobo,
    monthlyGrossKobo,
    monthlyInvestmentKobo,
    monthlyIncomeNeededKobo,
    inflationPct,
    riskTolerance = 'moderate',
    jurisdiction = 'NG',
    avcKobo = 0,
    gratuityKobo = 0,
    employerMatchPct = 3,
  }) {
    const yearsToRetirement = retirementAge - currentAge;
    if (yearsToRetirement <= 0) {
      return {
        yearsToRetirement: 0,
        projectedRSAKobo: currentRSAKobo,
        projectedInvestKobo: 0,
        projectedFundKobo: currentRSAKobo,
        requiredNestEggKobo: monthlyIncomeNeededKobo * 12 * (lifeExpectancy - retirementAge),
        rsaMonthlyDrawdownKobo: 0,
        monthlyPensionTotalKobo: 0,
        additionalMonthlyKobo: 0,
        recommendations: ["Current age is already at or past retirement age."]
      };
    }

    // Expected return based on risk tolerance
    const rates = { conservative: 0.09, moderate: 0.12, aggressive: 0.16 };
    const rate = rates[riskTolerance] || 0.12;

    // Monthly Pension total (employer + employee combined) depending on jurisdiction
    let monthlyPensionTotalKobo = 0;
    let initialRSA = currentRSAKobo;

    if (jurisdiction === 'NG') {
      // PENCOM CPS: 8% employee + 10% employer = 18% of gross
      monthlyPensionTotalKobo = Math.round(monthlyGrossKobo * 0.18);
      // Incorporate initial AVC and Gratuity balances into initial fund value
      initialRSA = currentRSAKobo + avcKobo + gratuityKobo;
    } else if (jurisdiction === 'US') {
      // US 401k rules: assume 6% employee contribution, plus employer match up to match rate
      const matchFrac = Math.min(6, employerMatchPct) / 100;
      monthlyPensionTotalKobo = Math.round(monthlyGrossKobo * (0.06 + matchFrac));
      // Cap at US 2025 limit $23,000 / 12 months (~ $1,916/month)
      const usCapKobo = 1916_00;
      if (monthlyPensionTotalKobo > usCapKobo) monthlyPensionTotalKobo = usCapKobo;
    } else if (jurisdiction === 'UK') {
      // UK auto-enrolment rules: combined 8% minimum pension contributions
      monthlyPensionTotalKobo = Math.round(monthlyGrossKobo * 0.08);
    } else if (jurisdiction === 'CA') {
      // CA RRSP rules: 18% of earned income limits
      monthlyPensionTotalKobo = Math.min(Math.round(monthlyGrossKobo * 0.18), 2600_00);
    } else {
      // Generic savings
      monthlyPensionTotalKobo = Math.round(monthlyGrossKobo * 0.10);
    }

    // Projected RSA & Investment
    const projectedRSAKobo = calcFV(rate, yearsToRetirement, monthlyPensionTotalKobo, initialRSA);
    const projectedInvestKobo = calcFV(rate, yearsToRetirement, monthlyInvestmentKobo, 0);
    const projectedFundKobo = projectedRSAKobo + projectedInvestKobo;

    // Required Nest Egg
    const inflationRate = inflationPct / 100;
    const realIncomeNeeded = Math.round(monthlyIncomeNeededKobo * Math.pow(1 + inflationRate, yearsToRetirement));
    const yearsInRetirement = lifeExpectancy - retirementAge;
    const drawdownRate = Math.max(0.06, rate - 0.03); // conservative drawdown rate in retirement

    const r = drawdownRate / 12;
    const n = yearsInRetirement * 12;
    let requiredNestEggKobo = 0;
    if (n > 0) {
      if (Math.abs(r) < 1e-10) requiredNestEggKobo = realIncomeNeeded * n;
      else requiredNestEggKobo = Math.round(realIncomeNeeded * ((Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))));
    }

    // RSA Monthly Drawdown
    const rsaMonthlyDrawdownKobo = calcAnnuity(projectedRSAKobo, drawdownRate, yearsInRetirement);

    // Shortfall & Additional Savings
    const surplus = projectedFundKobo - requiredNestEggKobo;
    const additionalMonthlyKobo = surplus < 0 ? calcPMT(rate, yearsToRetirement, 0, Math.abs(surplus)) : 0;

    // Recommendations
    const recommendations = [];
    if (surplus >= 0) {
      recommendations.push("Your retirement plan is fully funded! Keep maintaining your current savings rate.");
    } else {
      recommendations.push(`Save an extra ${WPUtils.fmt(additionalMonthlyKobo)} monthly to close your gap.`);
    }
    recommendations.push("As you approach retirement, consider shifting a portion of your funds to more conservative, fixed-income assets to protect capital.");
    if (surplus < 0) {
      recommendations.push("Review your monthly expenses to identify discretionary areas where you can save and invest more.");
      if (jurisdiction === 'NG') {
        recommendations.push("Verify that your PFA is generating competitive returns (e.g. above inflation/industry benchmark) to boost RSA growth.");
      }
    }

    return {
      yearsToRetirement,
      projectedRSAKobo,
      projectedInvestKobo,
      projectedFundKobo,
      requiredNestEggKobo,
      rsaMonthlyDrawdownKobo,
      monthlyPensionTotalKobo,
      additionalMonthlyKobo,
      recommendations
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

  function getEntryCurrency(notes) {
    if (notes && typeof notes === 'string') {
      const match = notes.match(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/);
      if (match) return match[1];
    }
    return WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
  }

  function setEntryCurrency(notes, currency) {
    let cleanNotes = (notes || '').replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').trim();
    return currency ? `${cleanNotes} [${currency}]`.trim() : cleanNotes;
  }

  function convert(amountKobo, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amountKobo;
    const rates = APP_CONFIG.exchangeRates || { NGN: 1, USD: 1500, EUR: 1600, GBP: 1900 };
    const rateFrom = rates[fromCurrency] || 1;
    const rateTo = rates[toCurrency] || 1;
    const amountInNGN = amountKobo * rateFrom;
    return Math.round(amountInNGN / rateTo);
  }

  /** Whether a liability accrues interest (explicit flag, else APR > 0). */
  function isInterestBearingLiability(l) {
    if (!l) return false;
    if (l.is_interest_bearing === false || l.is_interest_bearing === 0) return false;
    if (l.is_interest_bearing === true || l.is_interest_bearing === 1) return true;
    return (parseFloat(l.apr) || 0) > 0;
  }

  function isIncomeGeneratingAsset(a) {
    if (!a) return false;
    return !!(a.is_income_generating);
  }

  function _itemBalanceKobo(item, targetCurrency) {
    const cur = getEntryCurrency(item.notes);
    return convert(item.close_balance || item.open_balance || 0, cur, targetCurrency);
  }

  /**
   * Classify assets (income-generating vs not) and liabilities (interest-bearing vs not),
   * then compare productive assets to interest-bearing debt — #50.
   */
  function productiveBalanceSheet(assets, liabilities, currency) {
    const listA = Array.isArray(assets) ? assets : [];
    const listL = Array.isArray(liabilities) ? liabilities : [];
    const cur = currency || 'NGN';

    const incomeGen = listA.filter(isIncomeGeneratingAsset);
    const nonIncome = listA.filter(a => !isIncomeGeneratingAsset(a));
    const interestBearing = listL.filter(isInterestBearingLiability);
    const nonInterest = listL.filter(l => !isInterestBearingLiability(l));

    const sum = (items) => items.reduce((s, x) => s + _itemBalanceKobo(x, cur), 0);

    const incomeGenTotal = sum(incomeGen);
    const nonIncomeTotal = sum(nonIncome);
    const interestBearingTotal = sum(interestBearing);
    const nonInterestTotal = sum(nonInterest);
    const totalAssets = incomeGenTotal + nonIncomeTotal;
    const totalLiab = interestBearingTotal + nonInterestTotal;

    const coverage = interestBearingTotal > 0
      ? incomeGenTotal / interestBearingTotal
      : (incomeGenTotal > 0 ? Infinity : 0);
    const gap = incomeGenTotal - interestBearingTotal;
    const incomeGenPctOfAssets = totalAssets > 0 ? (incomeGenTotal / totalAssets) * 100 : 0;
    const ibPctOfLiab = totalLiab > 0 ? (interestBearingTotal / totalLiab) * 100 : 0;

    let grade = 'empty';
    if (totalAssets === 0 && totalLiab === 0) grade = 'empty';
    else if (interestBearingTotal === 0 && incomeGenTotal > 0) grade = 'strong';
    else if (coverage >= 1.5) grade = 'strong';
    else if (coverage >= 1) grade = 'ok';
    else if (coverage >= 0.5) grade = 'watch';
    else grade = 'weak';

    const narrative = _productiveNarrative({
      incomeGenTotal, nonIncomeTotal, interestBearingTotal, nonInterestTotal,
      coverage, gap, grade, incomeGenPctOfAssets, ibPctOfLiab,
      incomeGenCount: incomeGen.length, nonIncomeCount: nonIncome.length,
      ibCount: interestBearing.length, nibCount: nonInterest.length,
      currency: cur,
    });

    return {
      incomeGen, nonIncome, interestBearing, nonInterest,
      incomeGenTotal, nonIncomeTotal, interestBearingTotal, nonInterestTotal,
      totalAssets, totalLiab,
      coverage, gap, grade,
      incomeGenPctOfAssets, ibPctOfLiab,
      narrative,
    };
  }

  function _productiveNarrative(p) {
    const f = (k) => fmt(k, { currency: p.currency, compact: true });
    const lines = [];

    if (p.grade === 'empty') {
      lines.push('Add assets and liabilities to compare income-generating assets with interest-bearing debt.');
      return lines;
    }

    lines.push(
      `You have ${f(p.incomeGenTotal)} in income-generating assets ` +
      `(${p.incomeGenCount} item${p.incomeGenCount === 1 ? '' : 's'}, ${p.incomeGenPctOfAssets.toFixed(0)}% of assets) ` +
      `and ${f(p.nonIncomeTotal)} in non-income assets (home, vehicles, personal items, etc.).`
    );

    lines.push(
      `Interest-bearing liabilities total ${f(p.interestBearingTotal)} ` +
      `(${p.ibCount} debt${p.ibCount === 1 ? '' : 's'}` +
      (p.totalLiab > 0 ? `, ${p.ibPctOfLiab.toFixed(0)}% of all liabilities` : '') +
      `). Non-interest liabilities (e.g. 0% family loans, deferred tax) are ${f(p.nonInterestTotal)}.`
    );

    if (p.interestBearingTotal <= 0) {
      lines.push('You have no interest-bearing debt on the books — productive assets are not offset by interest cost. Keep it that way when you borrow.');
    } else if (p.coverage >= 1.5) {
      lines.push(
        `Strong match: income-generating assets cover interest-bearing debt about ${isFinite(p.coverage) ? p.coverage.toFixed(2) : '∞'}×. ` +
        `Surplus productive capital is roughly ${f(p.gap)}.`
      );
    } else if (p.coverage >= 1) {
      lines.push(
        `Balanced: income-generating assets roughly match interest-bearing debt (${p.coverage.toFixed(2)}× coverage). ` +
        `Aim for more productive assets or faster debt payoff to build a cushion.`
      );
    } else if (p.coverage >= 0.5) {
      lines.push(
        `Watch: interest-bearing debt exceeds income-generating assets (coverage ${p.coverage.toFixed(2)}×, gap ${f(Math.abs(p.gap))} short). ` +
        `Prioritise paying down high-APR debt or growing yield-producing assets.`
      );
    } else {
      lines.push(
        `Weak: productive assets cover only ${p.coverage.toFixed(2)}× of interest-bearing debt (short by ${f(Math.abs(p.gap))}). ` +
        `Interest is likely outrunning asset income — cut costly debt and avoid new non-productive borrowing.`
      );
    }

    lines.push(
      'Tip: mark assets as “income-generating” on Assets, and mark loans as interest-bearing (or not) on Liabilities so this report stays accurate.'
    );

    return lines;
  }

  /** Parse structured tags embedded in asset notes: [ticker:…] [qty:…] [unit_cost:…] [sub:…] */
  function parseNotesTags(notes) {
    const out = { ticker: '', qty: 0, unitCostKobo: 0, sub: '' };
    if (!notes || typeof notes !== 'string') return out;
    const t = notes.match(/\[ticker:([^\]]+)\]/i);
    const q = notes.match(/\[qty:([^\]]+)\]/i);
    const c = notes.match(/\[unit_cost:([^\]]+)\]/i);
    const s = notes.match(/\[sub:([^\]]+)\]/i);
    if (t) out.ticker = String(t[1]).trim().toUpperCase();
    if (q) out.qty = parseFloat(q[1]) || 0;
    if (c) out.unitCostKobo = parseInt(c[1], 10) || 0;
    if (s) out.sub = String(s[1]).trim();
    return out;
  }

  /** Strip structured tags (and currency) for human-readable notes display. */
  function cleanNotesDisplay(notes) {
    return (notes || '')
      .replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '')
      .replace(/\[Emergency Fund\]/g, '')
      .replace(/\[sub:[^\]]+\]/gi, '')
      .replace(/\[qty:[^\]]+\]/gi, '')
      .replace(/\[unit_cost:[^\]]+\]/gi, '')
      .replace(/\[ticker:[^\]]+\]/gi, '')
      .replace(/\[sharia:yes\]/gi, '')
      .replace(/\[nhis:\d+\]/gi, '')
      .replace(/\[mortgage_int:\d+\]/gi, '')
      .replace(/\[life_ins:\d+\]/gi, '')
      .replace(/\[annual_rent:\d+\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Deterministic fallback quote when live feed is unavailable. */
  function estimateMarketPrice(ticker, buyPrice) {
    const sym = String(ticker || '').toUpperCase().trim();
    const basePrices = {
      AAPL: 190, TSLA: 175, MSFT: 420, GOOG: 170, GOOGL: 170,
      AMZN: 180, NVDA: 125, NFLX: 620, META: 475, SPY: 520, QQQ: 450,
      DANGCEM: 520, GTCO: 48, ZENITHBANK: 42, MTNN: 220, BUA: 95,
    };
    const base = basePrices[sym];
    const day = new Date().getDate();
    let hash = 0;
    for (let i = 0; i < sym.length; i++) hash += sym.charCodeAt(i);
    const dailyFluc = ((hash + day) % 6) - 3;
    if (base !== undefined) return Math.max(0.01, base * (1 + dailyFluc / 100));
    return Math.max(0.01, (buyPrice || 100) * (1.15 + dailyFluc / 100));
  }

  /**
   * Live quote via Yahoo chart API through CORS proxies.
   * Returns major-unit price (e.g. dollars) or null.
   */
  async function fetchMarketPrice(ticker) {
    const sym = String(ticker || '').trim().toUpperCase();
    if (!sym) return null;
    const yahooUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}` +
      `?interval=1d&range=1d`;
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
    ];
    for (const url of proxies) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        let data = await res.json();
        if (data && typeof data.contents === 'string') {
          try { data = JSON.parse(data.contents); } catch { continue; }
        }
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          ?? data?.chart?.result?.[0]?.meta?.previousClose;
        if (price && Number(price) > 0) return Number(price);
      } catch {
        /* try next proxy */
      }
    }
    return null;
  }

  /**
   * Zakat calculator (educational). Classic 2.5% of net zakatable wealth above nisab.
   * Amounts in minor units (kobo). Not a fatwa — consult a scholar for edge cases.
   */
  function calcZakat({
    cashKobo = 0,
    goldKobo = 0,
    silverKobo = 0,
    investmentsKobo = 0,
    businessKobo = 0,
    receivablesKobo = 0,
    debtsKobo = 0,
    nisabKobo = 0,
    rate = 0.025,
  } = {}) {
    const gross = Math.max(0, cashKobo) + Math.max(0, goldKobo) + Math.max(0, silverKobo)
      + Math.max(0, investmentsKobo) + Math.max(0, businessKobo) + Math.max(0, receivablesKobo);
    const net = Math.max(0, gross - Math.max(0, debtsKobo));
    const aboveNisab = net >= Math.max(0, nisabKobo);
    const due = aboveNisab ? Math.round(net * rate) : 0;
    return {
      grossWealthKobo: gross,
      netWealthKobo: net,
      nisabKobo: Math.max(0, nisabKobo),
      aboveNisab,
      rate,
      zakatDueKobo: due,
    };
  }

  /**
   * Plain-language strategic health report (#49).
   * Rule-based narrative answering cash flow, balance sheet, EF, retirement,
   * insurance, investments, and estate questions — with opportunity CTAs.
   *
   * @param {object} ctx
   * @param {Array} ctx.income
   * @param {Array} ctx.expenses
   * @param {Array} ctx.assets
   * @param {Array} ctx.liabilities
   * @param {Array} ctx.snapshots
   * @param {Array} [ctx.goals]
   * @param {object} [ctx.profile]
   * @param {string} [ctx.currency]
   * @param {object|null} [ctx.insuranceData]  localStorage insurance payload
   * @param {object|null} [ctx.estateData]
   * @param {object|null} [ctx.investQuiz]
   * @param {string} [ctx.userId]
   */
  function buildStrategicHealthReport(ctx = {}) {
    const currency = ctx.currency || 'NGN';
    const income = ctx.income || [];
    const expenses = ctx.expenses || [];
    const assets = ctx.assets || [];
    const liabilities = ctx.liabilities || [];
    const snapshots = Array.isArray(ctx.snapshots) ? ctx.snapshots : [];
    const goals = ctx.goals || [];
    const profile = ctx.profile || {};
    const f = (k) => fmt(k, { currency, compact: true });
    const fFull = (k) => fmt(k, { currency });

    const bal = (item) => {
      const cur = getEntryCurrency(item.notes);
      return convert(item.close_balance || item.open_balance || 0, cur, currency);
    };

    const cf = calcCashFlow(income, expenses);
    const netIncome = cf.netIncome || 0;
    const totalExp = cf.totalExpenses || 0;
    const netCF = cf.netCashFlow || 0;
    const passive = passiveIncomeKPI(income, totalExp);
    const passiveKobo = passive.passiveKobo || 0;
    const passivePctOfInc = netIncome > 0 ? (passiveKobo / netIncome) * 100 : 0;

    // Expense coverage: share of expenses funded by income (vs implied debt/drawdown)
    const expCoveredByIncomePct = totalExp > 0
      ? Math.min(100, (Math.max(0, netIncome) / totalExp) * 100)
      : (netIncome > 0 ? 100 : 0);
    const fundedByDebtOrSavings = totalExp > netIncome && totalExp > 0;

    const totalAssets = assets.reduce((s, a) => s + bal(a), 0);
    const totalLiab = liabilities.reduce((s, l) => s + bal(l), 0);
    const netWorth = totalAssets - totalLiab;

    // Trends from snapshots (stored in profile base currency — convert if needed)
    // Assume snapshot amounts are in profile currency matching currency or NGN base.
    const baseCur = profile.currency || currency;
    let nwTrend = 'flat';
    let nwChange = 0;
    let assetsTrend = 'flat';
    let assetsChange = 0;
    let liabTrend = 'flat';
    let liabChange = 0;
    if (snapshots.length >= 2) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      nwChange = convert((last.net_worth || 0) - (first.net_worth || 0), baseCur, currency);
      assetsChange = convert((last.total_assets || 0) - (first.total_assets || 0), baseCur, currency);
      liabChange = convert((last.total_liabilities || 0) - (first.total_liabilities || 0), baseCur, currency);
      nwTrend = nwChange > 0 ? 'up' : nwChange < 0 ? 'down' : 'flat';
      assetsTrend = assetsChange > 0 ? 'up' : assetsChange < 0 ? 'down' : 'flat';
      liabTrend = liabChange > 0 ? 'up' : liabChange < 0 ? 'down' : 'flat';
    } else {
      // Fall back to current open/close on assets if no history
      const openA = assets.reduce((s, a) => {
        const cur = getEntryCurrency(a.notes);
        return s + convert(a.open_balance || 0, cur, currency);
      }, 0);
      const closeA = totalAssets;
      assetsChange = closeA - openA;
      assetsTrend = assetsChange > 0 ? 'up' : assetsChange < 0 ? 'down' : 'flat';
      nwTrend = netWorth >= 0 ? 'up' : 'down';
    }

    // Emergency fund
    const efAssets = assets.filter(a => a.notes && String(a.notes).includes('[Emergency Fund]'));
    const efBal = efAssets.reduce((s, a) => s + bal(a), 0);
    const essentialExp = expenses.filter(e => !e.is_discretionary).reduce((s, e) => {
      const cur = getEntryCurrency(e.description || e.notes);
      return s + convert(e.amount || 0, cur, currency);
    }, 0);
    const monthlyEssential = essentialExp > 0 ? essentialExp : totalExp;
    const efTarget = emergencyFundTarget(monthlyEssential);
    const efStatus = emergencyFundStatus(efBal, efTarget);
    const efMonths = monthlyEssential > 0 ? efBal / monthlyEssential : 0;
    const efOperational = efMonths >= 3 || efStatus.status === 'on_track';

    // Retirement
    const retAssets = assets.filter(a => {
      const t = (a.asset_type || '').toLowerCase();
      return t === 'retirement_contribution' || t === 'pension' || t.includes('retirement');
    });
    const retBal = retAssets.reduce((s, a) => s + bal(a), 0);
    const age = profile.age || null;
    const retAge = profile.retirement_age || 60;
    const yearsToRet = age != null ? Math.max(0, retAge - age) : null;
    // crude: funded if retirement assets >= 3× annual net income or any plan exists with progress
    const annualNet = netIncome * 12;
    const retFundedRatio = annualNet > 0 ? retBal / annualNet : (retBal > 0 ? 1 : 0);
    const retOk = retBal > 0 && (retFundedRatio >= 1 || (yearsToRet != null && yearsToRet > 20 && retBal > 0));

    // Insurance
    const ins = ctx.insuranceData || {};
    const policies = Array.isArray(ins.policies) ? ins.policies : [];
    const hasLife = policies.some(p => (p.type || '').toLowerCase() === 'life') ||
      ins.answers?.hasCurrentLife === 'yes';
    const hasHealth = policies.some(p => (p.type || '').toLowerCase() === 'health');
    const insOptimal = hasLife && (hasHealth || policies.length >= 2);
    const insPartial = policies.length > 0 || hasLife || hasHealth;

    // Investments (equity / income-gen / ticker)
    const investAssets = assets.filter(a => {
      const t = (a.asset_type || '').toLowerCase();
      const tags = parseNotesTags(a.notes);
      return a.is_income_generating || t === 'equity' || t === 'crypto' || tags.ticker;
    });
    const investBal = investAssets.reduce((s, a) => s + bal(a), 0);
    let investGain = 0;
    investAssets.forEach(a => {
      const cur = getEntryCurrency(a.notes);
      const open = convert(a.open_balance || 0, cur, currency);
      const close = convert(a.close_balance || a.open_balance || 0, cur, currency);
      investGain += (close - open);
    });
    const investTrend = investGain > 0 ? 'up' : investGain < 0 ? 'down' : 'flat';
    const quiz = ctx.investQuiz;
    const hasQuiz = !!(quiz && (quiz.profile || quiz.band || quiz.score != null));

    // Estate / legacy
    const estate = ctx.estateData || {};
    const legacyReviewed = !!(
      estate.will_status === 'yes' ||
      estate.has_will === 'yes' ||
      estate.will === 'yes' ||
      estate.completed ||
      estate.step_completed ||
      (estate.beneficiaries && estate.beneficiaries.length)
    );

    // Goals
    const goalsCount = goals.length;
    const goalsOnTrack = goals.filter(g => {
      try { return goalProgress(g).progressPct >= 50; } catch { return false; }
    }).length;

    const productive = productiveBalanceSheet(assets, liabilities, currency);

    const statusOf = (ok, warn) => (ok ? 'good' : warn ? 'watch' : 'risk');

    const checks = [
      {
        id: 'income',
        q: 'Is income positive? How much is passive?',
        status: statusOf(netIncome > 0 && netCF >= 0, netIncome > 0 && netCF < 0),
        headline: netIncome > 0
          ? `Your net income this month is ${fFull(netIncome)}.`
          : 'No positive net income is recorded for this month.',
        detail: netIncome > 0
          ? `About ${passivePctOfInc.toFixed(0)}% (${f(passiveKobo)}) is passive. Active earnings still do most of the work${passivePctOfInc < 20 ? ' — growing passive income reduces job risk.' : '.'}`
          : 'Log salary and other income on the Income page so we can score cash flow.',
        cta: netIncome <= 0 ? { label: 'Add income', href: '#/income' } : (passivePctOfInc < 15 ? { label: 'Grow passive income', href: '#/income' } : null),
      },
      {
        id: 'expense_cover',
        q: 'Are expenses covered by income or debt?',
        status: statusOf(!fundedByDebtOrSavings && totalExp > 0, fundedByDebtOrSavings && expCoveredByIncomePct >= 70),
        headline: totalExp <= 0
          ? 'No expenses logged this month.'
          : fundedByDebtOrSavings
            ? `Expenses exceed net income — only ${expCoveredByIncomePct.toFixed(0)}% of spending is covered by take-home pay.`
            : `Income covers ${expCoveredByIncomePct.toFixed(0)}% of expenses with room to spare.`,
        detail: fundedByDebtOrSavings
          ? `The gap of ${f(totalExp - netIncome)} is likely funded by savings drawdown or new debt. Cut discretionary spend or raise income.`
          : `You are not relying on debt to fund day-to-day living. Keep it that way.`,
        cta: fundedByDebtOrSavings ? { label: 'Review expenses', href: '#/expenses' } : { label: 'Budget planner', href: '#/budget' },
      },
      {
        id: 'passive_ef',
        q: 'Can passive income cover expenses? Is the emergency fund ready?',
        status: statusOf(passive.pctOfExpenses >= 100 && efOperational, passive.pctOfExpenses >= 25 || efMonths >= 1),
        headline: `Passive income covers ${passive.pctOfExpenses.toFixed(0)}% of expenses.`,
        detail: efOperational
          ? `Emergency fund looks operational (~${efMonths.toFixed(1)} months of essentials, ${f(efBal)}).`
          : `Emergency fund is thin (~${efMonths.toFixed(1)} months, ${f(efBal)} vs target ${f(efTarget)}). Build liquid savings before aggressive investing.`,
        cta: !efOperational ? { label: 'Emergency fund', href: '#/emergency-fund' } : (passive.pctOfExpenses < 50 ? { label: 'Track passive income', href: '#/cashflow' } : null),
      },
      {
        id: 'assets',
        q: 'Are assets growing or falling?',
        status: statusOf(assetsTrend === 'up', assetsTrend === 'flat'),
        headline: snapshots.length >= 2
          ? `Assets are ${assetsTrend === 'up' ? 'growing' : assetsTrend === 'down' ? 'falling' : 'flat'} (${f(assetsChange)} over the recorded period).`
          : `Assets total ${f(totalAssets)} this period${assetsTrend !== 'flat' ? ` (${assetsTrend === 'up' ? 'up' : 'down'} vs opening balances)` : ''}.`,
        detail: assetsTrend === 'down'
          ? 'Declining assets may mean spending capital, market drops, or under-saving. Review big outflows and investment marks.'
          : assetsTrend === 'up'
            ? 'Asset growth compounds long-term wealth — stay consistent with savings and rebalancing.'
            : 'Add monthly snapshots from the Dashboard to see clearer multi-month asset trends.',
        cta: { label: 'View assets', href: '#/assets' },
      },
      {
        id: 'liabilities',
        q: 'Are liabilities growing or falling?',
        status: statusOf(liabTrend === 'down' || totalLiab === 0, liabTrend === 'flat'),
        headline: totalLiab <= 0
          ? 'No liabilities on the books — excellent for optionality.'
          : snapshots.length >= 2
            ? `Liabilities are ${liabTrend === 'up' ? 'rising' : liabTrend === 'down' ? 'falling' : 'flat'} (${f(liabChange)} over the period). Total: ${f(totalLiab)}.`
            : `Liabilities total ${f(totalLiab)}.`,
        detail: liabTrend === 'up'
          ? 'Rising debt increases interest cost. Prefer paying high-APR balances and avoid new consumer credit.'
          : totalLiab > 0
            ? 'Keep payoff on track with the Debt Planner (avalanche or snowball).'
            : 'Channel surplus into emergency fund and investments rather than lifestyle creep.',
        cta: totalLiab > 0 ? { label: 'Debt planner', href: '#/debt' } : null,
      },
      {
        id: 'net_worth',
        q: 'Did net worth rise or fall?',
        status: statusOf(netWorth >= 0 && nwTrend !== 'down', netWorth >= 0),
        headline: `Net worth is ${fFull(netWorth)} (${netWorth >= 0 ? 'positive' : 'negative'}).`,
        detail: snapshots.length >= 2
          ? `Over your snapshot history, net worth is ${nwTrend === 'up' ? 'up' : nwTrend === 'down' ? 'down' : 'flat'} by ${f(nwChange)}.`
          : 'Save Dashboard monthly snapshots to track net worth month-over-month.',
        cta: netWorth < 0 ? { label: 'Balance sheet', href: '#/balance-sheet' } : { label: 'Reports trends', href: '#/reports' },
      },
      {
        id: 'retirement',
        q: 'Is the retirement plan funded?',
        status: statusOf(retOk, retBal > 0),
        headline: retBal > 0
          ? `Retirement-linked assets total ${f(retBal)}${yearsToRet != null ? ` with ~${yearsToRet} years to target age ${retAge}` : ''}.`
          : 'No retirement / pension balances are tagged yet.',
        detail: retOk
          ? 'You have a meaningful retirement base. Revisit contribution rate and risk profile annually.'
          : 'Add RSA/pension/AVC under Assets (retirement type) and run the Retirement planner for a funding gap estimate.',
        cta: { label: 'Retirement planner', href: '#/retirement' },
      },
      {
        id: 'insurance',
        q: 'Is insurance coverage optimal?',
        status: statusOf(insOptimal, insPartial),
        headline: insOptimal
          ? 'Life and broader cover look present in your insurance log.'
          : insPartial
            ? 'Some insurance is logged, but coverage may still have gaps.'
            : 'No insurance policies logged — households are often under-insured for income loss and health shocks.',
        detail: 'Run the Insurance needs assessment and log policies so this score stays accurate. Gaps here are a common risk for families.',
        cta: { label: 'Insurance assessment', href: '#/insurance' },
      },
      {
        id: 'investments',
        q: 'Are investments growing or falling?',
        status: statusOf(investBal > 0 && investTrend !== 'down', investBal > 0 || hasQuiz),
        headline: investBal > 0
          ? `Investment-style assets total ${f(investBal)} and are ${investTrend === 'up' ? 'up' : investTrend === 'down' ? 'down' : 'flat'} vs cost/open this period.`
          : 'No investment holdings flagged yet (equities, funds, or income-generating assets).',
        detail: hasQuiz
          ? 'You have an investment profile quiz on file — use it to guide allocation, not day-trading.'
          : 'Take the Invest Profile quiz and add equity holdings with tickers on Assets for mark-to-market tracking.',
        cta: investBal <= 0 ? { label: 'Invest profile quiz', href: '#/invest' } : { label: 'Assets / MTM', href: '#/assets' },
      },
      {
        id: 'legacy',
        q: 'Has legacy / estate planning been reviewed?',
        status: statusOf(legacyReviewed, false),
        headline: legacyReviewed
          ? 'Estate planning notes are on file — good stewardship for dependants.'
          : 'Legacy planning has not been marked complete.',
        detail: 'A will, beneficiaries, and guardianship choices protect family when life happens. Review at least yearly or after major life events.',
        cta: { label: 'Estate planner', href: '#/estate-planner' },
      },
    ];

    // Opportunity / lead-gen style suggestions
    const opportunities = [];
    if (!efOperational) {
      opportunities.push({
        title: 'Stabilise first',
        msg: 'Build 3 months of essential expenses in an emergency fund before increasing investment risk.',
        href: '#/emergency-fund',
        tag: 'Protection',
      });
    }
    if (fundedByDebtOrSavings) {
      opportunities.push({
        title: 'Stop the leak',
        msg: 'Spending runs above income. A 50/30/20 budget check often frees cash for debt and savings.',
        href: '#/budget',
        tag: 'Cash flow',
      });
    }
    if (!insPartial) {
      opportunities.push({
        title: 'Income protection gap',
        msg: 'Without life/health cover, one event can erase years of saving. Assess needs and log policies.',
        href: '#/insurance',
        tag: 'Insurance',
      });
    }
    if (productive.grade === 'weak' || productive.grade === 'watch') {
      opportunities.push({
        title: 'Debt costs more than assets earn',
        msg: 'Interest-bearing debt outpaces income-generating assets. Attack high APR or grow productive capital.',
        href: '#/debt',
        tag: 'Balance sheet',
      });
    }
    if (investBal <= 0 && netCF > 0 && efOperational) {
      opportunities.push({
        title: 'Put surplus to work',
        msg: 'You have room to invest. Complete the Invest Profile quiz and start small, diversified holdings.',
        href: '#/invest',
        tag: 'Growth',
      });
    }
    if (!legacyReviewed && (netWorth > 0 || goalsCount > 0)) {
      opportunities.push({
        title: 'Protect what you are building',
        msg: 'Document beneficiaries and a simple will so progress is not lost to admin chaos.',
        href: '#/estate-planner',
        tag: 'Legacy',
      });
    }
    if (passivePctOfInc < 10 && netIncome > 0) {
      opportunities.push({
        title: 'Diversify income',
        msg: 'Almost all income is active. Even small rental, dividends, or side cash flow improves resilience.',
        href: '#/income',
        tag: 'Income',
      });
    }

    const goodN = checks.filter(c => c.status === 'good').length;
    const riskN = checks.filter(c => c.status === 'risk').length;
    const watchN = checks.filter(c => c.status === 'watch').length;
    let overall = 'steady';
    if (riskN >= 4) overall = 'urgent';
    else if (riskN >= 2 || watchN >= 4) overall = 'attention';
    else if (goodN >= 7) overall = 'strong';

    const name = profile.full_name || profile.name || 'there';
    const monthLabel = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

    const summary =
      overall === 'strong'
        ? `${name}, your ${monthLabel} picture is solid: cash flow, buffers, and balance sheet mostly support long-term goals.`
        : overall === 'urgent'
          ? `${name}, several core areas need attention this month — focus on cash flow, emergency savings, and high-cost debt before new goals.`
          : overall === 'attention'
            ? `${name}, you are making progress, but a few gaps could derail plans if ignored. Prioritise the red/amber items below.`
            : `${name}, here is a plain-language read of your finances for ${monthLabel}.`;

    const closing =
      'This report is educational, not personalised investment advice. Numbers update when you log income, expenses, assets, and debts in Pul Planning.';

    return {
      monthLabel,
      overall,
      summary,
      closing,
      checks,
      opportunities: opportunities.slice(0, 5),
      scores: { good: goodN, watch: watchN, risk: riskN, total: checks.length },
      metrics: {
        netIncome, totalExp, netCF, passiveKobo, passivePctOfInc,
        totalAssets, totalLiab, netWorth, efBal, efMonths, investBal,
        productiveGrade: productive.grade,
      },
    };
  }

  return {
    fmt, cleanNum, maskNumberInput, nairaToKobo, koboToNaira, pct, fmtPct, fmtDate,
    calcPIT, summarizePIT, calcTaxableIncome, calcRentRelief, normalizePITReliefs,
    effectiveTaxRate, taxBracket,
    calcPensionEmployee, calcNHF, calcNHIS,
    calcFV, calcPMT, calcAnnuity,
    calcDebtStrategy,
    calcDebtAvalanche: function(debts, extra) { return calcDebtStrategy(debts, extra, 'avalanche'); },
    calcNetWorth, coverageRatio, debtToAssetRatio, checkNDIC,
    emergencyFundTarget, emergencyFundStatus,
    calcRetirement,
    calcCashFlow,
    passiveIncomeKPI,
    goalProgress,
    healthScore, healthScoreLabel,
    currentPeriod, periodLabel, last12Months,
    getEntryCurrency, setEntryCurrency, convert,
    parseNotesTags, cleanNotesDisplay,
    estimateMarketPrice, fetchMarketPrice,
    isInterestBearingLiability, isIncomeGeneratingAsset, productiveBalanceSheet,
    buildStrategicHealthReport,
    calcZakat,
  };
})();

