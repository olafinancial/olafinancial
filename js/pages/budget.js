// ============================================================
// OlaFinancial — 50/30/20 Budget Planner
// ============================================================

const WPBudget = (() => {
  let _expenses = [];
  let _income = [];
  let _selectedPeriod = WPUtils.currentPeriod();
  let _historicalExpenses = {};
  let _historicalIncome = {};

  async function init(container) {
    _selectedPeriod = WPUtils.currentPeriod();
    
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Budget Planner</h1>
          <p class="page-subtitle">Guided budget tracking using the 50/30/20 rule (Needs, Wants, Savings)</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="budget-month-select" class="select select-sm" style="width:140px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
            ${WPUtils.last12Months().map(m => `<option value="${m}">${WPUtils.periodLabel(m)}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div class="page-body">
        <!-- Prominent Total Income Info -->
        <div class="card" style="margin-bottom:1.5rem;background:linear-gradient(135deg,var(--clr-surface-2),var(--clr-surface-1));padding:1.5rem">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
            <div>
              <div class="card-title" style="margin-bottom:0.25rem">Total Net Income</div>
              <div class="card-value accent" id="budget-income-total" style="font-size:2.5rem">₦0.00</div>
              <div class="card-meta">Deduction-adjusted active + passive + investment income</div>
            </div>
            <div style="text-align:right" id="budget-allocation-status">
              <!-- Allocation mode / summary -->
            </div>
          </div>
        </div>

        <!-- 3 Progress Rings -->
        <div class="grid grid-3" id="budget-rings-grid" style="gap:1.5rem;margin-bottom:1.5rem">
          <!-- Needs -->
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-needs-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Needs (Essential)</div>
            <div class="card-value" id="ring-needs-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-needs-meta">Target: 50%</div>
          </div>
          <!-- Wants -->
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-wants-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Wants (Discretionary)</div>
            <div class="card-value" id="ring-wants-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-wants-meta">Target: 30%</div>
          </div>
          <!-- Savings/Debt -->
          <div class="card flex flex-col items-center" style="text-align:center;padding:2rem">
            <div id="ring-savings-container"></div>
            <div class="card-title" style="margin-top:1rem;margin-bottom:0.25rem">Savings & Debt Payoff</div>
            <div class="card-value" id="ring-savings-value" style="font-size:1.5rem">₦0.00</div>
            <div class="card-meta" id="ring-savings-meta">Target: 20%</div>
          </div>
        </div>

        <!-- Stacked utilization bar -->
        <div class="card" style="margin-bottom:1.5rem;padding:1.5rem">
          <div class="section-title" style="margin-bottom:0.75rem">Budget Utilization</div>
          <div style="height:24px;border-radius:12px;background:var(--clr-surface-3);overflow:hidden;display:flex;margin-bottom:0.75rem" id="utilization-bar-fill">
            <!-- Stacked elements inside -->
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--clr-text-2)">
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#38BDF8;border-radius:2px"></span> Needs (<span id="util-needs-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#F59E0B;border-radius:2px"></span> Wants (<span id="util-wants-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:#00C896;border-radius:2px"></span> Savings/Debt (<span id="util-savings-pct">0%</span>)</span>
            <span class="flex items-center gap-1"><span style="width:10px;height:10px;background:var(--clr-text-3);border-radius:2px"></span> Unallocated (<span id="util-unallocated-pct">100%</span>)</span>
          </div>
        </div>

        <div class="grid grid-3" style="gap:1.5rem;margin-bottom:1.5rem;grid-template-columns: 2fr 1fr">
          <!-- Category breakdown -->
          <div class="card">
            <div class="section-header">
              <span class="section-title">Expense Allocation by Category</span>
              <span class="badge badge-neutral" id="budget-expenses-count">0 categories</span>
            </div>
            <div class="table-wrap" id="budget-categories-table" style="margin-top:1rem"></div>
          </div>

          <div class="flex flex-col gap-4">
            <!-- MoM Comparison -->
            <div class="card">
              <div class="section-title" style="margin-bottom:1rem">Month-over-Month Change</div>
              <div style="display:flex;flex-direction:column;gap:0.75rem" id="budget-mom-list">
                <!-- MoM items loaded here -->
              </div>
            </div>

            <!-- Custom Allocation Override -->
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
                    <label for="bc-target-savings" style="font-size:11px">Savings %</label>
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

    // Dropdown change
    const monthSelect = document.getElementById('budget-month-select');
    monthSelect.value = _selectedPeriod;
    monthSelect.addEventListener('change', async (e) => {
      _selectedPeriod = e.target.value;
      await _load();
    });

    // Custom Target form
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
        } catch(e){}
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
      
      // Calculate end date of selected period
      const parts = _selectedPeriod.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

      // Fetch current period data
      [_income, _expenses] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, _selectedPeriod),
        WPDb.getExpensesByDateRange(uid, _selectedPeriod, periodEnd)
      ]);

      // MoM Loading (fetch previous month's data too)
      const prevDate = new Date(year, month - 2, 1);
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}-01`;
      const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth()+1, 0).getDate();
      const prevPeriodEnd = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}-${String(prevLastDay).padStart(2,'0')}`;

      const [prevInc, prevExp] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, prevPeriod),
        WPDb.getExpensesByDateRange(uid, prevPeriod, prevPeriodEnd)
      ]);

      _historicalIncome[prevPeriod] = prevInc;
      _historicalExpenses[prevPeriod] = prevExp;

      _render();
    } catch(err) {
      WPToast.error('Failed to load budget data.');
      console.error(err);
    }
  }

  function _render() {
    const profile = WPApp.state.profile || {};
    const currency = profile.currency || 'NGN';

    // Get allocations targets
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
      } catch(e){}
    }

    const isCustom = targetNeeds !== 50 || targetWants !== 30 || targetSavings !== 20;
    document.getElementById('budget-allocation-status').innerHTML = isCustom 
      ? `<span class="badge badge-gold">Custom Mode: ${targetNeeds}/${targetWants}/${targetSavings}</span>`
      : `<span class="badge badge-accent">Standard Mode: 50/30/20</span>`;

    // Compute Net Income
    const totalNetIncome = _income.reduce((s, i) => {
      const gross = i.gross_amount || 0;
      const tax = i.paye_tax || 0;
      const pension = i.pension_contrib || 0;
      const nhf = i.nhf_contrib || 0;
      const other = i.other_deductions || 0;
      return s + (gross - tax - pension - nhf - other);
    }, 0);

    document.getElementById('budget-income-total').textContent = WPUtils.fmt(totalNetIncome, { currency });

    // Buckets calculation
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;

    const categoriesBreakdown = {};

    _expenses.forEach(e => {
      const cat = e.category || 'other';
      const amt = e.amount || 0;

      // Group by Category name
      if (!categoriesBreakdown[cat]) {
        categoriesBreakdown[cat] = { amount: 0, discretionary: e.is_discretionary || false };
      }
      categoriesBreakdown[cat].amount += amt;

      // Determine 50/30/20 classification
      if (cat === 'investment' || cat === 'interest_debt') {
        savingsTotal += amt;
      } else if (e.is_discretionary) {
        wantsTotal += amt;
      } else {
        needsTotal += amt;
      }
    });

    const totalExpenses = needsTotal + wantsTotal + savingsTotal;

    const needsPct = totalNetIncome > 0 ? (needsTotal / totalNetIncome) * 100 : 0;
    const wantsPct = totalNetIncome > 0 ? (wantsTotal / totalNetIncome) * 100 : 0;
    const savingsPct = totalNetIncome > 0 ? (savingsTotal / totalNetIncome) * 100 : 0;

    // UI Updates - Ring values
    document.getElementById('ring-needs-value').textContent = WPUtils.fmt(needsTotal, { currency });
    document.getElementById('ring-needs-meta').textContent = `Actual: ${needsPct.toFixed(1)}% | Target: ${targetNeeds}%`;

    document.getElementById('ring-wants-value').textContent = WPUtils.fmt(wantsTotal, { currency });
    document.getElementById('ring-wants-meta').textContent = `Actual: ${wantsPct.toFixed(1)}% | Target: ${targetWants}%`;

    document.getElementById('ring-savings-value').textContent = WPUtils.fmt(savingsTotal, { currency });
    document.getElementById('ring-savings-meta').textContent = `Actual: ${savingsPct.toFixed(1)}% | Target: ${targetSavings}%`;

    // Render Ring SVG elements
    // Colors
    // Needs: green (if <= target), amber (target..+10), red (> target+10)
    const needsColor = needsPct <= targetNeeds ? 'var(--clr-accent)' : (needsPct <= targetNeeds + 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');
    const wantsColor = wantsPct <= targetWants ? 'var(--clr-accent)' : (wantsPct <= targetWants + 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');
    const savingsColor = savingsPct >= targetSavings ? 'var(--clr-accent)' : (savingsPct >= targetSavings - 10 ? 'var(--clr-gold)' : 'var(--clr-danger)');

    _renderRingSVG('ring-needs-container', needsPct, targetNeeds, needsColor, 'Needs');
    _renderRingSVG('ring-wants-container', wantsPct, targetWants, wantsColor, 'Wants');
    _renderRingSVG('ring-savings-container', savingsPct, targetSavings, savingsColor, 'Savings');

    // Stacked bar updates
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

    // Category list table
    const tableContainer = document.getElementById('budget-categories-table');
    const cats = Object.entries(categoriesBreakdown).sort((a,b) => b[1].amount - a[1].amount);
    
    document.getElementById('budget-expenses-count').textContent = `${cats.length} categor${cats.length!==1?'ies':'y'}`;

    if (!cats.length) {
      tableContainer.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No expenses recorded for this month.</div>`;
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
              let bucket = 'Needs';
              let badgeClass = 'badge-neutral';
              if (name === 'investment' || name === 'interest_debt') {
                bucket = 'Savings/Debt';
                badgeClass = 'badge-accent';
              } else if (data.discretionary) {
                bucket = 'Wants';
                badgeClass = 'badge-gold';
              } else {
                badgeClass = 'badge-info';
              }
              const spentPct = totalNetIncome > 0 ? (data.amount / totalNetIncome) * 100 : 0;
              return `
                <tr>
                  <td><strong>${name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong></td>
                  <td><span class="badge ${badgeClass}">${bucket}</span></td>
                  <td class="td-mono text-right fw-600">${WPUtils.fmt(data.amount, { currency })}</td>
                  <td class="td-mono text-right text-muted">${spentPct.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // MoM comparison calculation
    _renderMoM(totalNetIncome, needsTotal, wantsTotal, savingsTotal, currency);
  }

  function _renderRingSVG(containerId, actualPct, targetPct, color, label) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const r = 50;
    const circ = 2 * Math.PI * r;
    // Cap representation at 100% inside ring, but show actual text value
    const ringPct = Math.min(100, actualPct);
    const offset = circ - (ringPct / 100) * circ;

    el.innerHTML = `
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--clr-surface-3)" stroke-width="8"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          style="transition: stroke-dashoffset 0.8s ease"/>
        <text x="60" y="60" text-anchor="middle" fill="var(--clr-text)" font-size="20" font-weight="700">${actualPct.toFixed(0)}%</text>
        <text x="60" y="78" text-anchor="middle" fill="var(--clr-text-2)" font-size="10" font-weight="500">${label}</text>
      </svg>
    `;
  }

  function _renderMoM(currIncome, currNeeds, currWants, currSavings, currency) {
    const list = document.getElementById('budget-mom-list');
    if (!list) return;

    // Get previous month period key
    const parts = _selectedPeriod.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const prevDate = new Date(year, month - 2, 1);
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}-01`;

    const prevInc = _historicalIncome[prevPeriod] || [];
    const prevExp = _historicalExpenses[prevPeriod] || [];

    const prevIncomeTotal = prevInc.reduce((s, i) => {
      const gross = i.gross_amount || 0;
      const tax = i.paye_tax || 0;
      const pension = i.pension_contrib || 0;
      const nhf = i.nhf_contrib || 0;
      const other = i.other_deductions || 0;
      return s + (gross - tax - pension - nhf - other);
    }, 0);

    let prevNeeds = 0;
    let prevWants = 0;
    let prevSavings = 0;

    prevExp.forEach(e => {
      const cat = e.category || 'other';
      const amt = e.amount || 0;
      if (cat === 'investment' || cat === 'interest_debt') {
        prevSavings += amt;
      } else if (e.is_discretionary) {
        prevWants += amt;
      } else {
        prevNeeds += amt;
      }
    });

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
      ${renderMoMItem('Needs', currNeeds, prevNeeds, true)}
      ${renderMoMItem('Wants', currWants, prevWants, true)}
      ${renderMoMItem('Savings/Debt', currSavings, prevSavings, false)}
    `;
  }

  function destroy() {}

  return { init, destroy };
})();
