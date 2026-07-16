// ============================================================
// OlaFinancial — 50/30/20 Budget Planner
// #46: Savings & Debt Payoff — clear mapping, how to populate
// ============================================================

const WPBudget = (() => {
  let _expenses = [];
  let _income = [];
  let _liabilities = [];
  let _selectedPeriod = WPUtils.currentPeriod();
  let _historicalExpenses = {};
  let _historicalIncome = {};
  let _historicalLiabilities = {};

  /** Normalize expense category for matching (handles "Interest & Debt" vs interest_debt). */
  function _normCat(cat) {
    return String(cat || 'other')
      .toLowerCase()
      .trim()
      .replace(/[_/]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 50/30/20 bucket for an expense.
   * Savings/Debt: Investment, Interest & Debt, and similar labels.
   * Wants: discretionary flag.
   * Needs: everything else.
   */
  function _bucketForExpense(e) {
    const cat = _normCat(e.category);
    if (
      cat === 'investment' ||
      cat === 'interest & debt' ||
      cat === 'interest and debt' ||
      cat === 'interest debt' ||
      cat === 'debt' ||
      cat === 'debt payoff' ||
      cat === 'loan payment' ||
      cat === 'loan repayment' ||
      cat === 'savings' ||
      cat.includes('investment') ||
      (cat.includes('debt') && !cat.includes('credit card fee')) ||
      cat.includes('loan repay')
    ) {
      return 'savings';
    }
    if (e.is_discretionary) return 'wants';
    return 'needs';
  }

  function _isInvestmentCat(cat) {
    const c = _normCat(cat);
    return c === 'investment' || c.includes('investment');
  }

  function _isDebtCat(cat) {
    const c = _normCat(cat);
    return (
      c === 'interest & debt' ||
      c === 'interest and debt' ||
      c === 'interest debt' ||
      c === 'debt' ||
      c === 'debt payoff' ||
      c === 'loan payment' ||
      c === 'loan repayment' ||
      (c.includes('debt') && !c.includes('credit card fee')) ||
      c.includes('loan repay')
    );
  }

  function _entryAmtInBase(e, baseCur) {
    const cur = WPUtils.getEntryCurrency(e.description || e.notes);
    return WPUtils.convert(e.amount || 0, cur, baseCur);
  }

  function _incomeNetInBase(entries, baseCur) {
    return entries.reduce((s, i) => {
      const cur = WPUtils.getEntryCurrency(i.notes);
      const gross = WPUtils.convert(i.gross_amount || 0, cur, baseCur);
      const tax = WPUtils.convert(i.paye_tax || 0, cur, baseCur);
      const pension = WPUtils.convert(i.pension_contrib || 0, cur, baseCur);
      const nhf = WPUtils.convert(i.nhf_contrib || 0, cur, baseCur);
      const other = WPUtils.convert(i.other_deductions || 0, cur, baseCur);
      return s + (gross - tax - pension - nhf - other);
    }, 0);
  }

  /**
   * Split savings into investments vs debt payoff.
   * Debt: Interest & Debt expenses; if none, fall back to liability monthly payments
   * so adding a loan on Liabilities still populates the ring (#46).
   */
  function _computeBuckets(expenses, liabilities, baseCur) {
    let needsTotal = 0;
    let wantsTotal = 0;
    let investTotal = 0;
    let debtFromExpenses = 0;
    const categoriesBreakdown = {};

    expenses.forEach(e => {
      const cat = e.category || 'Other';
      const amt = _entryAmtInBase(e, baseCur);
      const bucket = _bucketForExpense(e);

      if (!categoriesBreakdown[cat]) {
        categoriesBreakdown[cat] = { amount: 0, discretionary: !!e.is_discretionary, bucket };
      }
      categoriesBreakdown[cat].amount += amt;
      categoriesBreakdown[cat].bucket = bucket;
      if (e.is_discretionary) categoriesBreakdown[cat].discretionary = true;

      if (bucket === 'savings') {
        if (_isDebtCat(cat)) debtFromExpenses += amt;
        else investTotal += amt;
      } else if (bucket === 'wants') {
        wantsTotal += amt;
      } else {
        needsTotal += amt;
      }
    });

    const liabilitySchedule = (liabilities || []).reduce((s, l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.monthly_payment || 0, cur, baseCur);
    }, 0);

    // Prefer actual debt expenses; otherwise use scheduled liability payments
    let debtTotal = debtFromExpenses;
    let debtSource = 'expenses';
    if (debtFromExpenses <= 0 && liabilitySchedule > 0) {
      debtTotal = liabilitySchedule;
      debtSource = 'liabilities';
    }

    const savingsTotal = investTotal + debtTotal;

    return {
      needsTotal,
      wantsTotal,
      savingsTotal,
      investTotal,
      debtTotal,
      debtFromExpenses,
      liabilitySchedule,
      debtSource,
      categoriesBreakdown,
    };
  }

  async function init(container) {
    _selectedPeriod = WPUtils.currentPeriod();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Budget Planner</h1>
          <p class="page-subtitle">Guided budget tracking using the 50/30/20 rule (Needs, Wants, Savings &amp; Debt)</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="budget-month-select" class="select select-sm" style="width:140px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
            ${WPUtils.last12Months().map(m => `<option value="${m}">${WPUtils.periodLabel(m)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="page-body">
        <!-- How the rings work (#46) -->
        <div class="card" style="margin-bottom:1.5rem;padding:1.1rem 1.25rem;border-left:3px solid var(--clr-accent)">
          <div class="section-title" style="margin:0 0 0.5rem">What these rings track</div>
          <p class="text-sm text-muted" style="margin:0 0 0.75rem;max-width:48rem;line-height:1.5">
            Each ring is <strong>spend as a % of your net income</strong> this month (not a payoff timeline graph).
            The third ring — <strong>Savings &amp; Debt Payoff</strong> — only moves when money is logged as investing or debt repayment.
          </p>
          <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;font-size:0.8rem">
            <div style="background:var(--clr-surface-2);padding:0.75rem;border-radius:8px">
              <strong style="color:#38BDF8">Needs (≤50%)</strong>
              <div class="text-muted" style="margin-top:0.25rem">Housing, food, transport, utilities, health… (non-discretionary expenses)</div>
            </div>
            <div style="background:var(--clr-surface-2);padding:0.75rem;border-radius:8px">
              <strong style="color:#F59E0B">Wants (≤30%)</strong>
              <div class="text-muted" style="margin-top:0.25rem">Expenses marked <em>Discretionary</em> (dining out, entertainment, shopping…)</div>
            </div>
            <div style="background:var(--clr-surface-2);padding:0.75rem;border-radius:8px">
              <strong style="color:#00C896">Savings &amp; Debt (≥20%)</strong>
              <div class="text-muted" style="margin-top:0.25rem">
                Expense categories <strong>Investment</strong> or <strong>Interest &amp; Debt</strong>,
                or scheduled monthly payments on <a href="#/liabilities" style="color:var(--clr-accent)">Liabilities</a>
              </div>
            </div>
          </div>
          <div class="flex gap-2" style="margin-top:0.85rem;flex-wrap:wrap">
            <a href="#/expenses" class="btn btn-secondary btn-sm">Log expense → Investment / Interest &amp; Debt</a>
            <a href="#/liabilities" class="btn btn-secondary btn-sm">Add liability + monthly payment</a>
            <a href="#/debt" class="btn btn-ghost btn-sm">Debt payoff simulator</a>
          </div>
        </div>

        <!-- Prominent Total Income Info -->
        <div class="card" style="margin-bottom:1.5rem;background:linear-gradient(135deg,var(--clr-surface-2),var(--clr-surface-1));padding:1.5rem">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
            <div>
              <div class="card-title" style="margin-bottom:0.25rem">Total Net Income</div>
              <div class="card-value accent" id="budget-income-total" style="font-size:2.5rem">₦0.00</div>
              <div class="card-meta">Deduction-adjusted active + passive + investment income</div>
            </div>
            <div style="text-align:right" id="budget-allocation-status"></div>
          </div>
        </div>

        <!-- 3 Progress Rings -->
        <div class="grid grid-3" id="budget-rings-grid" style="gap:1.5rem;margin-bottom:1rem">
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-needs-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Needs (Essential)</div>
            <div class="card-value" id="ring-needs-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-needs-meta">Target: 50%</div>
          </div>
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-wants-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Wants (Discretionary)</div>
            <div class="card-value" id="ring-wants-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-wants-meta">Target: 30%</div>
          </div>
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-savings-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Savings &amp; Debt Payoff</div>
            <div class="card-value" id="ring-savings-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-savings-meta">Target: 20%</div>
            <div id="ring-savings-breakdown" class="text-xs text-muted" style="margin-top:0.75rem;line-height:1.45;max-width:16rem"></div>
          </div>
        </div>

        <!-- Empty / guidance strip for savings bucket -->
        <div id="budget-savings-guide" style="display:none;margin-bottom:1.5rem"></div>

        <!-- Stacked utilization bar -->
        <div class="card" style="margin-bottom:1.5rem;padding:1.5rem">
          <div class="section-title" style="margin-bottom:0.35rem">Budget Utilization</div>
          <p class="text-xs text-muted" style="margin:0 0 0.75rem">How this month’s net income is used. Grey = not yet allocated to Needs / Wants / Savings&amp;Debt.</p>
          <div style="height:24px;border-radius:12px;background:var(--clr-surface-3);overflow:hidden;display:flex;margin-bottom:0.75rem" id="utilization-bar-fill"></div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--clr-text-2);flex-wrap:wrap;gap:0.5rem">
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#38BDF8;border-radius:2px"></span> Needs (<span id="util-needs-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#F59E0B;border-radius:2px"></span> Wants (<span id="util-wants-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#00C896;border-radius:2px"></span> Savings/Debt (<span id="util-savings-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:var(--clr-text-3);border-radius:2px"></span> Unallocated (<span id="util-unallocated-pct">100%</span>)</span>
          </div>
        </div>

        <div class="grid grid-3" style="gap:1.5rem;margin-bottom:1.5rem;grid-template-columns: 2fr 1fr">
          <div class="card">
            <div class="section-header">
              <span class="section-title">Expense Allocation by Category</span>
              <span class="badge badge-neutral" id="budget-expenses-count">0 categories</span>
            </div>
            <div class="table-wrap" id="budget-categories-table" style="margin-top:1rem"></div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="card">
              <div class="section-title" style="margin-bottom:1rem">Month-over-Month Change</div>
              <div style="display:flex;flex-direction:column;gap:0.75rem" id="budget-mom-list"></div>
            </div>

            <div class="card">
              <div class="section-title" style="margin-bottom:1rem">Custom Allocation Targets</div>
              <form id="budget-custom-form" style="display:flex;flex-direction:column;gap:0.75rem">
                <div class="form-row" style="grid-template-columns:1fr 1fr 1fr;gap:0.5rem">
                  <div class="form-group">
                    <label for="bc-target-needs" style="font-size:11px">Needs %</label>
                    <input class="input" type="number" id="bc-target-needs" value="50" min="0" max="100">
                  </div>
                  <div class="form-group">
                    <label for="bc-target-wants" style="font-size:11px">Wants %</label>
                    <input class="input" type="number" id="bc-target-wants" value="30" min="0" max="100">
                  </div>
                  <div class="form-group">
                    <label for="bc-target-savings" style="font-size:11px">Savings/Debt %</label>
                    <input class="input" type="number" id="bc-target-savings" value="20" min="0" max="100">
                  </div>
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                  <button type="submit" class="btn btn-primary btn-sm" style="flex:1">Apply</button>
                  <button type="button" id="budget-reset-btn" class="btn btn-secondary btn-sm">Reset</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>
    `;

    const monthSelect = document.getElementById('budget-month-select');
    monthSelect.value = _selectedPeriod;
    monthSelect.addEventListener('change', async (e) => {
      _selectedPeriod = e.target.value;
      await _load();
    });

    const customForm = document.getElementById('budget-custom-form');
    const needsInput = document.getElementById('bc-target-needs');
    const wantsInput = document.getElementById('bc-target-wants');
    const savingsInput = document.getElementById('bc-target-savings');

    const loadCustomAllocations = () => {
      const stored = localStorage.getItem('wp_budget_alloc');
      if (stored) {
        try {
          const alloc = JSON.parse(stored);
          needsInput.value = alloc.needs || 50;
          wantsInput.value = alloc.wants || 30;
          savingsInput.value = alloc.savings || 20;
        } catch (e) { /* ignore */ }
      } else {
        needsInput.value = 50;
        wantsInput.value = 30;
        savingsInput.value = 20;
      }
    };

    loadCustomAllocations();

    customForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = parseInt(needsInput.value) || 0;
      const w = parseInt(wantsInput.value) || 0;
      const s = parseInt(savingsInput.value) || 0;
      if (n + w + s !== 100) {
        WPToast.warning('Allocation percentages must sum to 100%.');
        return;
      }
      localStorage.setItem('wp_budget_alloc', JSON.stringify({ needs: n, wants: w, savings: s }));
      WPToast.success('Custom budget allocation applied.');
      _render();
    });

    document.getElementById('budget-reset-btn').addEventListener('click', () => {
      localStorage.removeItem('wp_budget_alloc');
      loadCustomAllocations();
      WPToast.info('Reset to standard 50/30/20 targets.');
      _render();
    });

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;

      const parts = _selectedPeriod.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      [_income, _expenses, _liabilities] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, _selectedPeriod),
        WPDb.getExpensesByDateRange(uid, _selectedPeriod, periodEnd),
        WPDb.getLiabilitiesByPeriod(uid, _selectedPeriod),
      ]);

      const prevDate = new Date(year, month - 2, 1);
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
      const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
      const prevPeriodEnd = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

      const [prevInc, prevExp, prevLiab] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, prevPeriod),
        WPDb.getExpensesByDateRange(uid, prevPeriod, prevPeriodEnd),
        WPDb.getLiabilitiesByPeriod(uid, prevPeriod),
      ]);

      _historicalIncome[prevPeriod] = prevInc;
      _historicalExpenses[prevPeriod] = prevExp;
      _historicalLiabilities[prevPeriod] = prevLiab;

      _render();
    } catch (err) {
      WPToast.error('Failed to load budget data.');
      console.error(err);
    }
  }

  function _render() {
    const profile = WPApp.state.profile || {};
    const currency = profile.currency || 'NGN';

    let targetNeeds = 50;
    let targetWants = 30;
    let targetSavings = 20;

    const stored = localStorage.getItem('wp_budget_alloc');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        targetNeeds = parsed.needs;
        targetWants = parsed.wants;
        targetSavings = parsed.savings;
      } catch (e) { /* ignore */ }
    }

    const isCustom = targetNeeds !== 50 || targetWants !== 30 || targetSavings !== 20;
    document.getElementById('budget-allocation-status').innerHTML = isCustom
      ? `<span class="badge badge-gold">Custom Mode: ${targetNeeds}/${targetWants}/${targetSavings}</span>`
      : `<span class="badge badge-accent">Standard Mode: 50/30/20</span>`;

    const totalNetIncome = _incomeNetInBase(_income, currency);
    document.getElementById('budget-income-total').textContent = WPUtils.fmt(totalNetIncome, { currency });

    const {
      needsTotal,
      wantsTotal,
      savingsTotal,
      investTotal,
      debtTotal,
      debtFromExpenses,
      liabilitySchedule,
      debtSource,
      categoriesBreakdown,
    } = _computeBuckets(_expenses, _liabilities, currency);

    const needsPct = totalNetIncome > 0 ? (needsTotal / totalNetIncome) * 100 : 0;
    const wantsPct = totalNetIncome > 0 ? (wantsTotal / totalNetIncome) * 100 : 0;
    const savingsPct = totalNetIncome > 0 ? (savingsTotal / totalNetIncome) * 100 : 0;

    document.getElementById('ring-needs-value').textContent = WPUtils.fmt(needsTotal, { currency });
    document.getElementById('ring-needs-meta').textContent = `Actual: ${needsPct.toFixed(1)}% | Target: ${targetNeeds}%`;

    document.getElementById('ring-wants-value').textContent = WPUtils.fmt(wantsTotal, { currency });
    document.getElementById('ring-wants-meta').textContent = `Actual: ${wantsPct.toFixed(1)}% | Target: ${targetWants}%`;

    document.getElementById('ring-savings-value').textContent = WPUtils.fmt(savingsTotal, { currency });
    document.getElementById('ring-savings-meta').textContent = `Actual: ${savingsPct.toFixed(1)}% | Target: ${targetSavings}%`;

    // Breakdown under savings ring
    const bdEl = document.getElementById('ring-savings-breakdown');
    if (bdEl) {
      if (savingsTotal <= 0) {
        bdEl.innerHTML = `<span style="color:var(--clr-gold)">Not populated yet</span> — log <strong>Investment</strong> or <strong>Interest &amp; Debt</strong> expenses, or set monthly payments on liabilities.`;
      } else {
        const debtLabel = debtSource === 'liabilities'
          ? 'Debt (liability schedules)'
          : 'Debt (Interest &amp; Debt expenses)';
        bdEl.innerHTML = `
          Investing: <strong>${WPUtils.fmt(investTotal, { currency, compact: true })}</strong><br>
          ${debtLabel}: <strong>${WPUtils.fmt(debtTotal, { currency, compact: true })}</strong>
          ${debtSource === 'liabilities' && liabilitySchedule > 0
            ? `<br><span style="opacity:0.85">Tip: also log “Interest &amp; Debt” expenses for actual cash paid this month.</span>`
            : ''}
        `;
      }
    }

    // Guide banner when savings is empty or below target
    const guideEl = document.getElementById('budget-savings-guide');
    if (guideEl) {
      if (savingsTotal <= 0) {
        guideEl.style.display = '';
        guideEl.innerHTML = `
          <div class="alert alert-warning" style="display:flex;gap:0.75rem;align-items:flex-start">
            <span style="font-size:1.25rem" aria-hidden="true">💡</span>
            <div style="flex:1">
              <strong>Savings &amp; Debt Payoff is at ₦0 — here’s how to fill it</strong>
              <ol style="margin:0.5rem 0 0;padding-left:1.2rem;font-size:0.875rem;color:var(--clr-text-2);line-height:1.5">
                <li>On <a href="#/expenses" style="color:var(--clr-accent)">Expenses</a>, add a line with category <strong>Investment</strong> (contributions, brokerage buys) or <strong>Interest &amp; Debt</strong> (loan / credit payments).</li>
                <li>Or on <a href="#/liabilities" style="color:var(--clr-accent)">Liabilities</a>, add a debt with a <strong>monthly payment</strong> — we use that schedule when no debt expense is logged yet.</li>
                <li>Adding a liability alone without a monthly payment (or without an Interest &amp; Debt expense) will <em>not</em> move this ring.</li>
              </ol>
              ${_liabilities.length
                ? `<p class="text-xs" style="margin:0.6rem 0 0">You have <strong>${_liabilities.length}</strong> liability record(s); scheduled monthly payments total
                    <strong>${WPUtils.fmt(liabilitySchedule, { currency })}</strong>
                    ${liabilitySchedule <= 0 ? ' — set a monthly payment amount on each debt.' : ' — included above as debt payoff.'}</p>`
                : ''}
            </div>
          </div>`;
      } else if (savingsPct < targetSavings) {
        guideEl.style.display = '';
        const gap = Math.max(0, (targetSavings / 100) * totalNetIncome - savingsTotal);
        guideEl.innerHTML = `
          <div class="alert" style="display:flex;gap:0.75rem;align-items:flex-start;background:var(--clr-surface-2);border:1px solid var(--clr-border)">
            <span style="font-size:1.25rem" aria-hidden="true">🎯</span>
            <div>
              <strong>Below your ${targetSavings}% savings/debt target</strong>
              <p class="text-sm text-muted" style="margin:0.35rem 0 0">
                You’re at ${savingsPct.toFixed(1)}%. About
                <strong>${WPUtils.fmt(gap, { currency })}</strong> more investing or debt repayment this month would hit the target.
              </p>
            </div>
          </div>`;
      } else {
        guideEl.style.display = 'none';
        guideEl.innerHTML = '';
      }
    }

    const needsColor = needsPct <= targetNeeds ? 'var(--clr-accent)' : (needsPct <= targetNeeds + 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');
    const wantsColor = wantsPct <= targetWants ? 'var(--clr-accent)' : (wantsPct <= targetWants + 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');
    const savingsColor = savingsPct >= targetSavings ? 'var(--clr-accent)' : (savingsPct >= targetSavings - 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');

    _renderRingSVG('ring-needs-container', needsPct, targetNeeds, needsColor, 'Needs');
    _renderRingSVG('ring-wants-container', wantsPct, targetWants, wantsColor, 'Wants');
    _renderRingSVG('ring-savings-container', savingsPct, targetSavings, savingsColor, 'Save/Debt');

    const bar = document.getElementById('utilization-bar-fill');
    const uNeeds = Math.min(100, needsPct);
    const uWants = Math.min(100 - uNeeds, wantsPct);
    const uSavings = Math.min(100 - uNeeds - uWants, savingsPct);
    const uUnallocated = Math.max(0, 100 - uNeeds - uWants - uSavings);

    document.getElementById('util-needs-pct').textContent = `${needsPct.toFixed(0)}%`;
    document.getElementById('util-wants-pct').textContent = `${wantsPct.toFixed(0)}%`;
    document.getElementById('util-savings-pct').textContent = `${savingsPct.toFixed(0)}%`;
    document.getElementById('util-unallocated-pct').textContent = `${uUnallocated.toFixed(0)}%`;

    bar.innerHTML = `
      <div style="width:${uNeeds}%;background:#38BDF8;height:100%;transition:width 0.5s ease" title="Needs: ${needsPct.toFixed(1)}%"></div>
      <div style="width:${uWants}%;background:#F59E0B;height:100%;transition:width 0.5s ease" title="Wants: ${wantsPct.toFixed(1)}%"></div>
      <div style="width:${uSavings}%;background:#00C896;height:100%;transition:width 0.5s ease" title="Savings/Debt: ${savingsPct.toFixed(1)}%"></div>
    `;

    // Category table (+ synthetic row for liability schedule when used)
    const tableContainer = document.getElementById('budget-categories-table');
    const cats = Object.entries(categoriesBreakdown).sort((a, b) => b[1].amount - a[1].amount);

    let extraRows = '';
    if (debtSource === 'liabilities' && liabilitySchedule > 0) {
      extraRows = `
        <tr style="background:var(--clr-surface-2)">
          <td><strong>Liability monthly payments</strong><br><span class="text-xs text-muted">From Balance Sheet · not an expense line</span></td>
          <td><span class="badge badge-accent">Savings/Debt</span></td>
          <td class="td-mono text-right fw-600">${WPUtils.fmt(liabilitySchedule, { currency })}</td>
          <td class="td-mono text-right text-muted">${totalNetIncome > 0 ? ((liabilitySchedule / totalNetIncome) * 100).toFixed(1) : '0.0'}%</td>
        </tr>`;
    }

    document.getElementById('budget-expenses-count').textContent =
      `${cats.length + (extraRows ? 1 : 0)} categor${(cats.length + (extraRows ? 1 : 0)) !== 1 ? 'ies' : 'y'}`;

    if (!cats.length && !extraRows) {
      tableContainer.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No expenses recorded for this month. <a href="#/expenses" style="color:var(--clr-accent)">Add expenses</a> to build your budget.</div>`;
    } else {
      tableContainer.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Bucket</th>
              <th class="text-right">Spent</th>
              <th class="text-right">% of Income</th>
            </tr>
          </thead>
          <tbody>
            ${cats.map(([name, data]) => {
              const bucket = data.bucket || _bucketForExpense({ category: name, is_discretionary: data.discretionary });
              let badgeClass = 'badge-info';
              let bucketLabel = 'Needs';
              if (bucket === 'savings') {
                badgeClass = 'badge-accent';
                bucketLabel = 'Savings/Debt';
              } else if (bucket === 'wants') {
                badgeClass = 'badge-gold';
                bucketLabel = 'Wants';
              }
              const spentPct = totalNetIncome > 0 ? (data.amount / totalNetIncome) * 100 : 0;
              return `
                <tr>
                  <td><strong>${String(name).replace(/_/g, ' ')}</strong></td>
                  <td><span class="badge ${badgeClass}">${bucketLabel}</span></td>
                  <td class="td-mono text-right fw-600">${WPUtils.fmt(data.amount, { currency })}</td>
                  <td class="td-mono text-right text-muted">${spentPct.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
            ${extraRows}
          </tbody>
        </table>
      `;
    }

    _renderMoM(totalNetIncome, needsTotal, wantsTotal, savingsTotal, currency);
  }

  function _renderRingSVG(containerId, actualPct, targetPct, color, label) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const r = 50;
    const circ = 2 * Math.PI * r;
    const ringPct = Math.min(100, actualPct);
    const offset = circ - (ringPct / 100) * circ;

    el.innerHTML = `
      <svg width="120" height="120" viewBox="0 0 120 120" aria-label="${label} ${actualPct.toFixed(0)} percent of income">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--clr-surface-3)" stroke-width="8"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          style="transition: stroke-dashoffset 0.8s ease"/>
        <text x="60" y="60" text-anchor="middle" dominant-baseline="middle" fill="var(--clr-text-1)" font-size="20" font-weight="700">${actualPct.toFixed(0)}%</text>
        <text x="60" y="78" text-anchor="middle" fill="var(--clr-text-2)" font-size="10" font-weight="500">${label}</text>
      </svg>
    `;
  }

  function _renderMoM(currIncome, currNeeds, currWants, currSavings, currency) {
    const list = document.getElementById('budget-mom-list');
    if (!list) return;

    const parts = _selectedPeriod.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const prevDate = new Date(year, month - 2, 1);
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;

    const prevInc = _historicalIncome[prevPeriod] || [];
    const prevExp = _historicalExpenses[prevPeriod] || [];
    const prevLiab = _historicalLiabilities[prevPeriod] || [];

    const prevIncomeTotal = _incomeNetInBase(prevInc, currency);
    const prevBuckets = _computeBuckets(prevExp, prevLiab, currency);

    const renderMoMItem = (label, curr, prev, lowerIsBetter = true) => {
      const diff = curr - prev;
      const absDiff = Math.abs(diff);
      const isIncrease = diff > 0;
      const isZero = diff === 0;

      let trendClass = 'text-accent';
      let arrow = '↓';

      if (isIncrease) {
        trendClass = lowerIsBetter ? 'text-danger' : 'text-accent';
        arrow = '↑';
      } else if (!isZero) {
        trendClass = lowerIsBetter ? 'text-accent' : 'text-danger';
        arrow = '↓';
      } else {
        trendClass = 'text-muted';
        arrow = '—';
      }

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--clr-border)">
          <div>
            <div style="font-weight:600">${label}</div>
            <div class="text-xs text-muted">Prev: ${WPUtils.fmt(prev, { currency, compact: true })}</div>
          </div>
          <div class="td-mono ${trendClass}" style="text-align:right">
            <div>${WPUtils.fmt(curr, { currency, compact: true })}</div>
            <div class="text-xs">${isZero ? 'No change' : `${arrow} ${WPUtils.fmt(absDiff, { currency, compact: true })}`}</div>
          </div>
        </div>
      `;
    };

    list.innerHTML = `
      ${renderMoMItem('Income', currIncome, prevIncomeTotal, false)}
      ${renderMoMItem('Needs', currNeeds, prevBuckets.needsTotal, true)}
      ${renderMoMItem('Wants', currWants, prevBuckets.wantsTotal, true)}
      ${renderMoMItem('Savings/Debt', currSavings, prevBuckets.savingsTotal, false)}
    `;
  }

  function destroy() {}

  return { init, destroy };
})();
