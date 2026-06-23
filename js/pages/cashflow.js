// ============================================================
// OlaFinancial — Cash Flow Statement
// ============================================================

const WPCashflow = (() => {

  async function init(container) {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Cash Flow Statement</h1>
          <p class="page-subtitle">Where your money comes from and where it goes</p>
        </div>
      </div>
      <div class="page-body">
        <div class="kpi-grid" id="cf-kpis" style="margin-bottom:1.5rem"></div>
        <!-- Statement -->
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem;color:var(--clr-accent)">&#x2B06; Cash Inflows</div>
            <div id="cf-inflows"></div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem;color:var(--clr-danger)">&#x2B07; Cash Outflows</div>
            <div id="cf-outflows"></div>
          </div>
        </div>
        <!-- Net position -->
        <div class="card" id="cf-net-card" style="text-align:center;padding:2rem"></div>
        <!-- Passive income tracker -->
        <div class="card" style="margin-top:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4C8; Passive Income Tracker</div>
          <p class="text-muted text-sm" style="margin-bottom:1rem">
            Goal: passive income &ge; 100% of monthly expenses (financial independence).
          </p>
          <div id="cf-passive-section"></div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    await _load(start, end);
  }

  async function _load(start, end) {
    try {
      const uid = WPApp.state.user.id;
      const PERIOD = WPUtils.currentPeriod();
      const [income, expenses] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, PERIOD),
        WPDb.getExpensesByDateRange(uid, start, end),
      ]);
      const cf = WPUtils.calcCashFlow(income, expenses);
      const passive = WPUtils.passiveIncomeKPI(income, cf.totalExpenses);
      _renderKPIs(cf, passive);
      _renderStatement(cf, income, expenses);
      _renderPassive(passive, cf);
    } catch (err) { WPToast.error('Failed to load cash flow data.'); }
  }

  function _renderKPIs(cf, passive) {
    document.getElementById('cf-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Inflows</div><div class="card-value accent">${WPUtils.fmt(cf.netIncome)}</div><div class="card-meta">Net of tax &amp; pension</div></div>
      <div class="card"><div class="card-title">Total Outflows</div><div class="card-value danger">${WPUtils.fmt(cf.totalExpenses)}</div><div class="card-meta">All spending categories</div></div>
      <div class="card"><div class="card-title">Net Cash Flow</div><div class="card-value ${cf.netCashFlow>=0?'accent':'danger'}">${WPUtils.fmt(cf.netCashFlow,{signed:true})}</div></div>
      <div class="card"><div class="card-title">Savings Rate</div><div class="card-value ${cf.netCashFlow/Math.max(1,cf.netIncome)>=0.2?'accent':'gold'}">${WPUtils.fmtPct(cf.netCashFlow/Math.max(1,cf.netIncome))}</div><div class="card-meta">Target: &ge; 20%</div></div>
      <div class="card"><div class="card-title">Passive Coverage</div><div class="card-value ${passive.pctOfExpenses>=100?'accent':passive.pctOfExpenses>=50?'gold':'danger'}">${passive.pctOfExpenses.toFixed(1)}%</div><div class="card-meta">of expenses covered passively</div></div>`;
  }

  function _renderStatement(cf, income, expenses) {
    // Inflows
    const inflowsEl = document.getElementById('cf-inflows');
    const activeIncome  = income.filter(e => e.income_type==='active');
    const passiveIncome = income.filter(e => e.income_type==='passive');
    const investIncome  = income.filter(e => e.income_type==='investment');

    inflowsEl.innerHTML = `
      ${_inflowSection('Active Income', activeIncome)}
      ${_inflowSection('Passive Income', passiveIncome)}
      ${_inflowSection('Investment Income', investIncome)}
      <div class="divider"></div>
      <div class="flex justify-between fw-700">
        <span>Gross Total</span>
        <span class="text-accent">${WPUtils.fmt(cf.totalIncome)}</span>
      </div>
      <div class="flex justify-between text-sm text-muted" style="margin-top:0.5rem">
        <span>Less: Tax &amp; Deductions</span>
        <span class="text-danger">(${WPUtils.fmt(cf.totalDeductions)})</span>
      </div>
      <div class="flex justify-between fw-700 text-accent" style="margin-top:0.5rem;font-size:1.1rem">
        <span>Net Income</span>
        <span>${WPUtils.fmt(cf.netIncome)}</span>
      </div>`;

    // Outflows — group by category
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category]||0) + (e.amount||0);
    });
    const outflowRows = Object.entries(byCategory)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, amt]) => `<div class="flex justify-between text-sm" style="padding:0.35rem 0;border-bottom:1px solid var(--clr-border)">
        <span>${cat}</span><span class="td-mono">${WPUtils.fmt(amt)}</span>
      </div>`).join('');
    document.getElementById('cf-outflows').innerHTML = outflowRows + `
      <div class="divider"></div>
      <div class="flex justify-between fw-700 text-danger" style="font-size:1.1rem">
        <span>Total Outflows</span><span>${WPUtils.fmt(cf.totalExpenses)}</span>
      </div>`;

    // Net card
    const positive = cf.netCashFlow >= 0;
    document.getElementById('cf-net-card').innerHTML = `
      <div class="card-title">${positive?'&#x1F4B0; Monthly Surplus':'&#x26A0;&#xFE0F; Monthly Deficit'}</div>
      <div class="card-value ${positive?'accent':'danger'}" style="font-size:3rem;margin:0.5rem 0">${WPUtils.fmt(cf.netCashFlow, {signed:true})}</div>
      <div class="card-meta">${positive
        ? `Great! You have ${WPUtils.fmt(cf.netCashFlow)} left to save or invest.`
        : `You are spending ${WPUtils.fmt(Math.abs(cf.netCashFlow))} more than you earn. Review your expenses.`
      }</div>`;
  }

  function _inflowSection(label, entries) {
    if (!entries.length) return '';
    const total = entries.reduce((s,e) => s+(e.gross_amount||0), 0);
    const rows = entries.map(e => `<div class="flex justify-between text-sm" style="padding:0.35rem 0;border-bottom:1px solid var(--clr-border)">
      <span class="text-muted">${e.source_name}</span>
      <span class="td-mono">${WPUtils.fmt(e.gross_amount||0)}</span>
    </div>`).join('');
    return `
      <div class="text-xs fw-700 text-muted" style="margin:0.75rem 0 0.25rem;text-transform:uppercase;letter-spacing:0.06em">${label}</div>
      ${rows}
      <div class="flex justify-between text-sm fw-600" style="padding:0.35rem 0">
        <span>Subtotal</span><span class="td-mono text-accent">${WPUtils.fmt(total)}</span>
      </div>`;
  }

  function _renderPassive(passive, cf) {
    const pct = Math.min(100, passive.pctOfExpenses);
    const status = pct >= 100 ? 'accent' : pct >= 50 ? 'gold' : 'danger';
    document.getElementById('cf-passive-section').innerHTML = `
      <div class="progress-wrap">
        <div class="progress-labels">
          <span>Passive income vs. expenses</span>
          <span class="text-${status} fw-700">${passive.pctOfExpenses.toFixed(1)}%</span>
        </div>
        <div class="progress-bar" style="height:14px;border-radius:8px">
          <div class="progress-fill ${status==='gold'?'gold':status==='danger'?'danger':''}" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--clr-text-3);margin-top:0.5rem">
          <span>${WPUtils.fmt(passive.passiveKobo)} passive</span>
          <span>${WPUtils.fmt(cf.totalExpenses)} needed</span>
        </div>
      </div>
      <div class="grid-3" style="margin-top:1.5rem">
        <div class="card"><div class="card-title">Passive Income</div><div class="card-value gold">${WPUtils.fmt(passive.passiveKobo)}</div></div>
        <div class="card"><div class="card-title">% of Total Income</div><div class="card-value">${passive.pctOfTotal.toFixed(1)}%</div></div>
        <div class="card"><div class="card-title">Gap to Independence</div>
          <div class="card-value ${passive.passiveKobo>=cf.totalExpenses?'accent':'danger'}">${WPUtils.fmt(Math.max(0,cf.totalExpenses-passive.passiveKobo))}</div>
          <div class="card-meta">${passive.passiveKobo>=cf.totalExpenses?'&#x1F389; Financially independent!':'More passive income needed'}</div>
        </div>
      </div>`;
  }

  function destroy() {}
  return { init, destroy };
})();
