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

  // ── NIGERIAN PIT — NIGERIA TAX ACT 2025 ─────────────────
  // All amounts in KOBO
  function calcPIT(grossKobo, pensionKobo = 0, annualRentKobo = 0) {
    // Rent relief: 20% of annual rent, max ₦500,000 (50,000,000 kobo)
    const rentReliefMax = APP_CONFIG.rentReliefMax || (APP_CONFIG.taxReliefs && APP_CONFIG.taxReliefs.maxRentRelief) || 50000000;
    const rentRelief = Math.min(annualRentKobo * 0.20, rentReliefMax);
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

  return {
    fmt, cleanNum, maskNumberInput, nairaToKobo, koboToNaira, pct, fmtPct, fmtDate,
    calcPIT, effectiveTaxRate, taxBracket,
    calcPensionEmployee, calcNHF,
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
  };
})();
