// ============================================================
// WealthPath — Reports & Export Page
// ============================================================

const WPReports = (() => {

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports &amp; Insights</h1>
          <p class="page-subtitle">Financial health history and trend analysis</p>
        </div>
        <button class="btn btn-primary" id="export-btn">&#x1F4E5; Export PDF</button>
      </div>
      <div class="page-body">
        <div id="reports-kpis" style="margin-bottom:1.5rem"></div>
        <!-- Trend Charts -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-header">
            <span class="section-title">Net Worth Trend</span>
            <span class="badge badge-neutral">12 Months</span>
          </div>
          <div class="chart-container" style="height:280px"><canvas id="rpt-chart-nw"></canvas></div>
        </div>
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem">Income vs Expenses</div>
            <div class="chart-container" style="height:240px"><canvas id="rpt-chart-cf"></canvas></div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem">Savings Rate</div>
            <div class="chart-container" style="height:240px"><canvas id="rpt-chart-sr"></canvas></div>
          </div>
        </div>
        <!-- Snapshot Table -->
        <div class="card">
          <div class="section-title" style="margin-bottom:1rem">Monthly Snapshot History</div>
          <div class="table-wrap" id="rpt-snapshot-table"></div>
        </div>
        <!-- Ratios -->
        <div class="card" style="margin-top:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4CA; Financial Health Ratios</div>
          <div id="rpt-ratios"></div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    document.getElementById('export-btn').addEventListener('click', _exportPDF);
    await _load();
  }

  async function _load() {
    try {
      const uid       = WPApp.state.user.id;
      const snapshots = await WPDb.getMonthlySnapshots(uid, 12);
      const PERIOD    = WPUtils.currentPeriod();
      const now       = new Date();
      const start     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      const end       = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
      const [income, expenses, assets, liabs] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, PERIOD),
        WPDb.getExpensesByDateRange(uid, start, end),
        WPDb.getAssetsByPeriod(uid, PERIOD),
        WPDb.getLiabilitiesByPeriod(uid, PERIOD),
      ]);
      _renderKPIs(snapshots, income, expenses, assets, liabs);
      _renderCharts(snapshots);
      _renderTable(snapshots);
      _renderRatios(income, expenses, assets, liabs);
    } catch (err) { WPToast.error('Failed to load report data.'); }
  }

  function _renderKPIs(snapshots, income, expenses, assets, liabs) {
    const latest   = snapshots[snapshots.length - 1];
    const oldest   = snapshots[0];
    const nwChange = latest && oldest ? latest.net_worth - oldest.net_worth : 0;
    const totalAssets  = assets.reduce((s,a)  => s+(a.close_balance||a.open_balance||0), 0);
    const totalLiab    = liabs.reduce((s,l)   => s+(l.close_balance||l.open_balance||0), 0);
    const cf = WPUtils.calcCashFlow(income, expenses);

    document.getElementById('reports-kpis').innerHTML = `
      <div class="card"><div class="card-title">Net Worth (This Month)</div>
        <div class="card-value ${totalAssets-totalLiab>=0?'accent':'danger'}">${WPUtils.fmt(totalAssets-totalLiab, {compact:true})}</div></div>
      <div class="card"><div class="card-title">Net Worth Change (12M)</div>
        <div class="card-value ${nwChange>=0?'accent':'danger'}">${WPUtils.fmt(nwChange,{compact:true,signed:true})}</div></div>
      <div class="card"><div class="card-title">Avg Monthly Savings</div>
        <div class="card-value">${snapshots.length?WPUtils.fmt(snapshots.reduce((s,x)=>s+(x.net_cash_flow||0),0)/snapshots.length,{compact:true}):'—'}</div></div>
      <div class="card"><div class="card-title">Snapshots Recorded</div>
        <div class="card-value">${snapshots.length}</div><div class="card-meta">out of 12 months</div></div>`;
  }

  function _renderCharts(snapshots) {
    if (snapshots.length < 2) {
      ['rpt-chart-nw','rpt-chart-cf','rpt-chart-sr'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentElement.innerHTML = '<div style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--clr-text-3);font-size:0.85rem">Save monthly snapshots to see trends</div>';
      });
      return;
    }
    WPCharts.netWorthTrend('rpt-chart-nw', snapshots);
    WPCharts.incomeVsExpenses('rpt-chart-cf', snapshots);
    WPCharts.savingsRateLine('rpt-chart-sr', snapshots);
  }

  function _renderTable(snapshots) {
    const wrap = document.getElementById('rpt-snapshot-table');
    if (!snapshots.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No snapshots yet. Use the Dashboard to save monthly snapshots.</div>';
      return;
    }
    const rows = [...snapshots].reverse().map(s => {
      const sr = s.total_income ? (s.net_cash_flow / s.total_income * 100).toFixed(1) : '—';
      return `<tr>
        <td class="text-muted">${WPUtils.periodLabel(s.period_month)}</td>
        <td class="td-mono fw-600 ${s.net_worth>=0?'text-accent':'text-danger'}">${WPUtils.fmt(s.net_worth,{compact:true})}</td>
        <td class="td-mono">${WPUtils.fmt(s.total_income,{compact:true})}</td>
        <td class="td-mono">${WPUtils.fmt(s.total_expenses,{compact:true})}</td>
        <td class="td-mono ${s.net_cash_flow>=0?'text-accent':'text-danger'}">${WPUtils.fmt(s.net_cash_flow,{compact:true,signed:true})}</td>
        <td class="td-mono">${sr !== '—' ? sr+'%' : '—'}</td>
        <td class="td-mono text-gold">${WPUtils.fmt(s.passive_income_amt||0,{compact:true})}</td>
      </tr>`;
    }).join('');
    wrap.innerHTML = `<table>
      <thead><tr>
        <th>Period</th><th>Net Worth</th><th>Income</th><th>Expenses</th>
        <th>Cash Flow</th><th>Savings Rate</th><th>Passive</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function _renderRatios(income, expenses, assets, liabs) {
    const totalAssets  = assets.reduce((s,a)  => s+(a.close_balance||a.open_balance||0), 0);
    const totalLiab    = liabs.reduce((s,l)   => s+(l.close_balance||l.open_balance||0), 0);
    const cf           = WPUtils.calcCashFlow(income, expenses);
    const dta          = WPUtils.debtToAssetRatio(totalLiab, totalAssets);
    const coverage     = WPUtils.coverageRatio(totalAssets, totalLiab);
    const savingsRate  = cf.netCashFlow / Math.max(1, cf.netIncome) * 100;
    const passive      = WPUtils.passiveIncomeKPI(income, cf.totalExpenses);

    const ratios = [
      { name:'Savings Rate',          value:`${savingsRate.toFixed(1)}%`,           target:'≥ 20%',    ok: savingsRate >= 20 },
      { name:'Debt-to-Asset Ratio',   value:`${dta.toFixed(1)}%`,                  target:'< 50%',    ok: dta < 50 },
      { name:'Coverage Ratio',        value:`${isFinite(coverage)?coverage.toFixed(2)+'x':'∞'}`,target:'≥ 1×', ok: coverage >= 1 || !isFinite(coverage) },
      { name:'Passive Income Cover',  value:`${passive.pctOfExpenses.toFixed(1)}%`, target:'≥ 100%',  ok: passive.pctOfExpenses >= 100 },
    ];

    document.getElementById('rpt-ratios').innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Ratio</th><th>Your Value</th><th>Target</th><th>Status</th></tr></thead>
      <tbody>${ratios.map(r => `<tr>
        <td><strong>${r.name}</strong></td>
        <td class="td-mono fw-600 ${r.ok?'text-accent':'text-danger'}">${r.value}</td>
        <td class="text-muted">${r.target}</td>
        <td><span class="badge ${r.ok?'badge-accent':'badge-danger'}">${r.ok?'On Track':'Needs Work'}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function _exportPDF() {
    WPToast.info('PDF export — use your browser\'s Print function (Ctrl+P) and select "Save as PDF".');
    window.print();
  }

  function destroy() {}
  return { init, destroy };
})();
