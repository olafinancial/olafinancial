// ============================================================
// OlaFinancial — WPInsights: App-Wide Insights & Alerts Engine
// Provides context-aware financial insights injected into each
// page module after data loads.
// ============================================================

const WPInsights = (() => {

  // Registry of page-scoped insight rule sets
  const _registry = {};

  /**
   * Register insight rules for a page.
   * @param {string} pageKey - unique page identifier
   * @param {Array<{id, fn, level, title, msg, action}>} rules
   */
  function register(pageKey, rules) {
    _registry[pageKey] = rules;
  }

  /**
   * Evaluate registered rules against a snapshot and inject results
   * into the target container element.
   * @param {string} pageKey
   * @param {object} snapshot - page-specific data snapshot
   * @param {HTMLElement} container - DOM element to render insights into
   */
  function evaluate(pageKey, snapshot, container) {
    if (!container) return;
    const rules = _registry[pageKey] || [];
    const triggered = rules.filter(r => {
      try { return r.fn(snapshot); } catch { return false; }
    });

    if (triggered.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    container.innerHTML = `
      <div class="insights-strip">
        ${triggered.map(r => `
          <div class="insight-card insight-${r.level || 'info'}" data-insight-id="${r.id}">
            <span class="insight-icon">${_levelIcon(r.level)}</span>
            <div class="insight-body">
              ${r.title ? `<div class="insight-title">${r.title}</div>` : ''}
              <div class="insight-msg">${r.msg}</div>
              ${r.action ? `<a class="insight-action" href="${r.action.href || 'javascript:void(0)'}">${r.action.label}</a>` : ''}
            </div>
            <button class="insight-dismiss" onclick="this.closest('.insight-card').remove()" aria-label="Dismiss">✕</button>
          </div>
        `).join('')}
      </div>`;
  }

  function _levelIcon(level) {
    switch (level) {
      case 'critical': return '🔴';
      case 'warning':  return '⚠️';
      case 'success':  return '✅';
      default:         return 'ℹ️';
    }
  }

  // ── PRE-REGISTERED RULE SETS ──────────────────────────────────

  // Dashboard
  register('dashboard', [
    {
      id: 'negative-net-worth',
      level: 'critical',
      title: 'Net Worth is Negative',
      msg: 'Your total liabilities exceed your assets. Focus on paying down debt and building savings.',
      fn: s => typeof s.netWorthKobo === 'number' && s.netWorthKobo < 0,
      action: { label: 'Go to Debt Planner', href: '#/debt' },
    },
    {
      id: 'no-emergency-fund',
      level: 'warning',
      title: 'No Emergency Fund Logged',
      msg: 'Financial experts recommend 3–6 months of living expenses in liquid savings. Start yours today.',
      fn: s => !s.hasEmergencyFund,
      action: { label: 'Set Up Emergency Fund', href: '#/emergency-fund' },
    },
    {
      id: 'high-inflation-caution',
      level: 'info',
      title: 'High Inflation Environment',
      msg: 'Nigeria\'s inflation is above 30%. Consider inflation-hedging assets (real estate, foreign currency, equities) to preserve purchasing power.',
      fn: s => (s.inflation || 0) > 30,
    },
    {
      id: 'net-worth-declining',
      level: 'warning',
      title: 'Net Worth Declining',
      msg: 'Your net worth has been declining for 2+ consecutive months. Review your expense categories and savings rate.',
      fn: s => s.netWorthTrend === 'declining',
    },
    {
      id: 'no-income-sources',
      level: 'warning',
      title: 'No Income Sources Recorded',
      msg: 'Add your income sources so we can calculate your cash flow and personalized insights.',
      fn: s => !s.incomeCount || s.incomeCount === 0,
      action: { label: 'Add Income', href: '#/income' },
    },
  ]);

  // Income
  register('income', [
    {
      id: 'single-income-source',
      level: 'warning',
      title: 'Single Income Dependency',
      msg: 'You rely on one income source. Consider diversifying with passive income (rental, dividends, side business) to reduce financial risk.',
      fn: s => s.sourceCount === 1,
    },
    {
      id: 'no-fx-hedge',
      level: 'info',
      title: 'FX Exposure Risk',
      msg: 'Your income is entirely in NGN while the naira depreciates. Consider earning in USD, GBP, or other stable currencies.',
      fn: s => s.sourceCount > 0 && !s.hasForeignCurrency,
    },
    {
      id: 'high-tax-burden',
      level: 'info',
      title: 'High PAYE Tax Burden',
      msg: 'Your effective tax rate is above 25%. Maximising pension contributions can legally reduce your taxable income.',
      fn: s => s.effectiveTaxRate > 0.25,
    },
    {
      id: 'no-passive-income',
      level: 'info',
      title: 'No Passive Income',
      msg: 'All your income is active (salary/business). Adding passive streams (rent, dividends) builds long-term wealth and financial resilience.',
      fn: s => s.sourceCount > 0 && !s.hasPassive,
    },
  ]);

  // Expenses
  register('expenses', [
    {
      id: 'food-ratio-high',
      level: 'warning',
      title: 'High Food & Dining Spend',
      msg: 'Food and dining is consuming more than 30% of your take-home pay. This is above the recommended 15–20% budget guideline.',
      fn: s => s.foodRatio > 0.30,
    },
    {
      id: 'subscriptions-high',
      level: 'info',
      title: 'High Subscription Costs',
      msg: 'Your monthly subscriptions exceed ₦50,000. Review streaming, software, and memberships you no longer use.',
      fn: s => s.subscriptionTotal > 5000000, // kobo
    },
    {
      id: 'no-expenses-logged',
      level: 'info',
      title: 'No Expenses This Period',
      msg: 'Log your expenses to see spending breakdowns, category insights, and cash flow analysis.',
      fn: s => !s.expenseCount || s.expenseCount === 0,
    },
    {
      id: 'spending-spike',
      level: 'warning',
      title: 'Spending Increased >15% vs Last Month',
      msg: 'Your total spending has jumped significantly. Check if this is a one-time event or a new pattern to address.',
      fn: s => s.spendingGrowth > 0.15,
    },
    {
      id: 'no-budget',
      level: 'info',
      title: 'No Budget Goals Set',
      msg: 'Set spending targets per category to stay on track and build discipline.',
      fn: s => !s.hasBudgetGoal,
      action: { label: 'Set Budget Goals', href: '#/goals' },
    },
  ]);

  // Debt
  register('debt', [
    {
      id: 'high-dti',
      level: 'critical',
      title: 'Debt-to-Income Ratio Above 40%',
      msg: 'Your debt repayments are consuming more than 40% of income — a dangerous threshold. Prioritise aggressive paydown of your highest-rate debts.',
      fn: s => s.debtToIncomeRatio > 0.40,
    },
    {
      id: 'many-high-interest-debts',
      level: 'warning',
      title: 'Multiple High-Interest Debts',
      msg: 'You have 3 or more debts above 20% APR. The Debt Avalanche strategy (highest rate first) will save the most in interest.',
      fn: s => s.highInterestCount >= 3,
    },
    {
      id: 'no-debts',
      level: 'success',
      title: 'Debt Free! 🎉',
      msg: 'Excellent work — you have no liabilities recorded. Channel your surplus into investments and savings goals.',
      fn: s => s.debtCount === 0,
    },
    {
      id: 'interest-exceeds-principal',
      level: 'critical',
      title: 'Interest Exceeds Monthly Payments',
      msg: 'Your minimum payments on some debts are less than the monthly interest accruing. You may never pay these off without increasing payments.',
      fn: s => s.hasNegativeAmortization,
    },
  ]);

  // Balance Sheet
  register('balance-sheet', [
    {
      id: 'no-insurance-assets',
      level: 'warning',
      title: 'No Insurance Policies Recorded',
      msg: 'Life, health, or property insurance protects your assets. Add your policies or explore options below.',
      fn: s => !s.hasInsurance,
      action: { label: 'Review Insurance', href: '#/insurance' },
    },
    {
      id: 'low-liquidity',
      level: 'warning',
      title: 'Low Liquid Assets',
      msg: 'Less than 10% of your assets are in liquid form (cash, savings). This limits your ability to handle emergencies.',
      fn: s => s.liquidRatio < 0.10 && s.totalAssetsKobo > 0,
    },
    {
      id: 'concentration-risk',
      level: 'info',
      title: 'Asset Concentration Risk',
      msg: 'More than 80% of your assets are in a single category. Diversification across asset classes reduces risk.',
      fn: s => s.topAssetCategoryRatio > 0.80 && s.totalAssetsKobo > 0,
    },
  ]);

  // Reports
  register('reports', [
    {
      id: 'savings-rate-low',
      level: 'warning',
      title: 'Savings Rate Below 10%',
      msg: 'You\'re saving less than 10% of gross income. Aim for 20%+ for long-term financial security.',
      fn: s => s.savingsRate < 0.10 && s.hasData,
    },
    {
      id: 'spending-trend-up',
      level: 'warning',
      title: 'Spending Trend Increasing',
      msg: 'Expenses have been trending upward over the past 3 months. Review your budget categories.',
      fn: s => s.expenseTrend === 'up' && s.hasData,
    },
    {
      id: 'no-snapshot-history',
      level: 'info',
      title: 'Build Your Financial History',
      msg: 'Take monthly snapshots to unlock trend charts, year-over-year comparisons, and net worth growth tracking.',
      fn: s => s.snapshotCount < 2,
      action: { label: 'Take Snapshot Now', href: '#/dashboard' },
    },
  ]);

  // Emergency Fund
  register('emergency-fund', [
    {
      id: 'ef-underfunded',
      level: 'warning',
      title: 'Emergency Fund Below Target',
      msg: 'Your emergency fund covers less than 3 months of expenses. Aim for 3–6 months before investing aggressively.',
      fn: s => s.monthsCovered < 3 && s.targetMonths > 0,
    },
    {
      id: 'ef-fully-funded',
      level: 'success',
      title: 'Emergency Fund Fully Funded ✅',
      msg: 'Great work! Your emergency fund is fully funded. Now channel surplus into investments and long-term goals.',
      fn: s => s.monthsCovered >= s.targetMonths && s.targetMonths > 0,
    },
  ]);

  // Insurance
  register('insurance', [
    {
      id: 'no-life-insurance',
      level: 'warning',
      title: 'No Life Insurance Policy',
      msg: 'Life insurance protects your family if you can no longer provide income. It\'s especially important if you have dependents.',
      fn: s => !s.hasLife,
    },
    {
      id: 'no-health-insurance',
      level: 'critical',
      title: 'No Health Insurance',
      msg: 'Medical bills are a leading cause of financial hardship in Nigeria. Ensure you have coverage, even via NHIS or HMO.',
      fn: s => !s.hasHealth,
    },
  ]);

  return { register, evaluate };

})();
