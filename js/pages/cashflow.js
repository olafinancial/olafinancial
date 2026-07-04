// ============================================================
// OlaFinancial — Cash Flow Statement
// ============================================================

const WPCashflow = (() => {

  async function init(container) {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const end   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_cashflow') || baseCur;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Cash Flow Statement</h1>
          <p class="page-subtitle">Where your money comes from and where it goes</p>
        </div>
        <select id="cf-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
          <option value="NGN">NGN (₦)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="AED">AED (د.إ)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="XOF">XOF (CFA)</option>
          <option value="XAF">XAF (FCFA)</option>
          <option value="KES">KES (KSh)</option>
          <option value="GHS">GHS (GH₵)</option>
          <option value="CAD">CAD (CA$)</option>
          <option value="ZAR">ZAR (R)</option>
          <option value="SAR">SAR (ر.س)</option>
          <option value="AUD">AUD (A$)</option>
        </select>
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

    const curSelect = document.getElementById('cf-page-currency');
    if (curSelect) {
      curSelect.value = pageCurrency;
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_cashflow', e.target.value);
        _load(start, end);
      });
    }

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
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const pageCurrency = localStorage.getItem('wp_page_currency_cashflow') || baseCur;

      const cf = WPUtils.calcCashFlow(income, expenses);
      const passive = WPUtils.passiveIncomeKPI(income, cf.totalExpenses);
      _renderKPIs(cf, passive, baseCur, pageCurrency);
      _renderStatement(cf, income, expenses, baseCur, pageCurrency);
      _renderPassive(passive, cf, baseCur, pageCurrency);
    } catch (err) { WPToast.error('Failed to load cash flow data.'); }
  }

  function _renderKPIs(cf, passive, baseCur, pageCurrency) {
    const totalIn = WPUtils.convert(cf.netIncome, baseCur, pageCurrency);
    const totalOut = WPUtils.convert(cf.totalExpenses, baseCur, pageCurrency);
    const netCF = WPUtils.convert(cf.netCashFlow, baseCur, pageCurrency);
    const coverage = passive.pctOfExpenses;

    document.getElementById('cf-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Inflows</div><div class="card-value accent">${WPUtils.fmt(totalIn, {currency: pageCurrency})}</div><div class="card-meta">Net of tax &amp; pension</div></div>
      <div class="card"><div class="card-title">Total Outflows</div><div class="card-value danger">${WPUtils.fmt(totalOut, {currency: pageCurrency})}</div><div class="card-meta">All spending categories</div></div>
      <div class="card"><div class="card-title">Net Cash Flow</div><div class="card-value ${cf.netCashFlow>=0?'accent':'danger'}">${WPUtils.fmt(netCF,{signed:true, currency: pageCurrency})}</div></div>
      <div class="card"><div class="card-title">Savings Rate</div><div class="card-value ${cf.netCashFlow/Math.max(1,cf.netIncome)>=0.2?'accent':'gold'}">${WPUtils.fmtPct(cf.netCashFlow/Math.max(1,cf.netIncome))}</div><div class="card-meta">Target: &ge; 20%</div></div>
      <div class="card"><div class="card-title">Passive Coverage</div><div class="card-value ${coverage>=100?'accent':coverage>=50?'gold':'danger'}">${coverage.toFixed(1)}%</div><div class="card-meta">of expenses covered passively</div></div>`;
  }

  function _renderStatement(cf, income, expenses, baseCur, pageCurrency) {
    // Inflows
    const inflowsEl = document.getElementById('cf-inflows');
    const activeIncome  = income.filter(e => e.income_type==='active');
    const passiveIncome = income.filter(e => e.income_type==='passive');
    const investIncome  = income.filter(e => e.income_type==='investment');

    inflowsEl.innerHTML = `
      ${_inflowSection('Active Income', activeIncome, baseCur, pageCurrency)}
      ${_inflowSection('Passive Income', passiveIncome, baseCur, pageCurrency)}
      ${_inflowSection('Investment Income', investIncome, baseCur, pageCurrency)}
      <div class="divider"></div>
      <div class="flex justify-between fw-700">
        <span>Gross Total</span>
        <span class="text-accent">${WPUtils.fmt(WPUtils.convert(cf.totalIncome, baseCur, pageCurrency), {currency: pageCurrency})}</span>
      </div>
      <div class="flex justify-between text-sm text-muted" style="margin-top:0.5rem">
        <span>Less: Tax &amp; Deductions</span>
        <span class="text-danger">(${WPUtils.fmt(WPUtils.convert(cf.totalDeductions, baseCur, pageCurrency), {currency: pageCurrency})})</span>
      </div>
      <div class="flex justify-between fw-700 text-accent" style="margin-top:0.5rem;font-size:1.1rem">
        <span>Net Income</span>
        <span>${WPUtils.fmt(WPUtils.convert(cf.netIncome, baseCur, pageCurrency), {currency: pageCurrency})}</span>
      </div>`;

    // Outflows — group by category
    const byCategory = {};
    expenses.forEach(e => {
      const cur = WPUtils.getEntryCurrency(e.description);
      const convertedAmt = WPUtils.convert(e.amount||0, cur, baseCur);
      byCategory[e.category] = (byCategory[e.category]||0) + convertedAmt;
    });
    const outflowRows = Object.entries(byCategory)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, amt]) => {
        const pageAmt = WPUtils.convert(amt, baseCur, pageCurrency);
        return `<div class="flex justify-between text-sm" style="padding:0.35rem 0;border-bottom:1px solid var(--clr-border)">
          <span>${cat}</span><span class="td-mono">${WPUtils.fmt(pageAmt, {currency: pageCurrency})}</span>
        </div>`;
      }).join('');
    document.getElementById('cf-outflows').innerHTML = outflowRows + `
      <div class="divider"></div>
      <div class="flex justify-between fw-700 text-danger" style="font-size:1.1rem">
        <span>Total Outflows</span><span>${WPUtils.fmt(WPUtils.convert(cf.totalExpenses, baseCur, pageCurrency), {currency: pageCurrency})}</span>
      </div>`;

    // Net card
    const positive = cf.netCashFlow >= 0;
    const netConverted = WPUtils.convert(cf.netCashFlow, baseCur, pageCurrency);
    document.getElementById('cf-net-card').innerHTML = `
      <div class="card-title">${positive?'&#x1F4B0; Monthly Surplus':'&#x26A0;&#xFE0F; Monthly Deficit'}</div>
      <div class="card-value ${positive?'accent':'danger'}" style="font-size:3rem;margin:0.5rem 0">${WPUtils.fmt(netConverted, {signed:true, currency: pageCurrency})}</div>
      <div class="card-meta">${positive
        ? `Great! You have ${WPUtils.fmt(netConverted, {currency: pageCurrency})} left to save or invest.`
        : `You are spending ${WPUtils.fmt(Math.abs(netConverted), {currency: pageCurrency})} more than you earn. Review your expenses.`
      }</div>`;
  }

  function _inflowSection(label, entries, baseCur, pageCurrency) {
    if (!entries.length) return '';
    const total = entries.reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert(e.gross_amount||0, cur, baseCur);
    }, 0);
    const rows = entries.map(e => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      const pageAmt = WPUtils.convert(e.gross_amount||0, cur, pageCurrency);
      return `<div class="flex justify-between text-sm" style="padding:0.35rem 0;border-bottom:1px solid var(--clr-border)">
        <span class="text-muted">${e.source_name}</span>
        <span class="td-mono">${WPUtils.fmt(pageAmt, {currency: pageCurrency})}</span>
      </div>`;
    }).join('');
    return `
      <div class="text-xs fw-700 text-muted" style="margin:0.75rem 0 0.25rem;text-transform:uppercase;letter-spacing:0.06em">${label}</div>
      ${rows}
      <div class="flex justify-between text-sm fw-600" style="padding:0.35rem 0">
        <span>Subtotal</span><span class="td-mono text-accent">${WPUtils.fmt(WPUtils.convert(total, baseCur, pageCurrency), {currency: pageCurrency})}</span>
      </div>`;
  }

  function _renderPassive(passive, cf, baseCur, pageCurrency) {
    const pct = Math.min(100, passive.pctOfExpenses);
    const status = pct >= 100 ? 'accent' : pct >= 50 ? 'gold' : 'danger';
    const pagePassive = WPUtils.convert(passive.passiveKobo, baseCur, pageCurrency);
    const pageExpenses = WPUtils.convert(cf.totalExpenses, baseCur, pageCurrency);
    const pageGap = WPUtils.convert(Math.max(0, cf.totalExpenses - passive.passiveKobo), baseCur, pageCurrency);

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
          <span>${WPUtils.fmt(pagePassive, {currency: pageCurrency})} passive</span>
          <span>${WPUtils.fmt(pageExpenses, {currency: pageCurrency})} needed</span>
        </div>
      </div>
      <div class="grid-3" style="margin-top:1.5rem">
        <div class="card"><div class="card-title">Passive Income</div><div class="card-value gold">${WPUtils.fmt(pagePassive, {currency: pageCurrency})}</div></div>
        <div class="card"><div class="card-title">% of Total Income</div><div class="card-value">${passive.pctOfTotal.toFixed(1)}%</div></div>
        <div class="card"><div class="card-title">Gap to Independence</div>
          <div class="card-value ${passive.passiveKobo>=cf.totalExpenses?'accent':'danger'}">${WPUtils.fmt(pageGap, {currency: pageCurrency})}</div>
          <div class="card-meta">${passive.passiveKobo>=cf.totalExpenses?'&#x1F389; Financially independent!':'More passive income needed'}</div>
        </div>
      </div>`;
  }

  function destroy() {}
  return { init, destroy };
})();
