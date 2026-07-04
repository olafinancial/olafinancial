// ============================================================
// OlaFinancial — Reports & Export Page
// ============================================================

const WPReports = (() => {

  async function init(container) {
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_reports') || baseCur;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Reports &amp; Insights</h1>
          <p class="page-subtitle">Financial health history and trend analysis</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="reports-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="export-btn">&#x1F4E5; Export PDF</button>
        </div>
      </div>
      <div class="page-body">
        <!-- Print Header (only visible when printing) -->
        <div id="print-header" class="print-header" style="display:none">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px">
            <div>
              <div style="font-size:1.4rem;font-weight:800">Ola Financial — Financial Report</div>
              <div style="font-size:0.85rem;color:#555;margin-top:4px">Prepared for: <strong id="print-client-name"></strong></div>
            </div>
            <div style="text-align:right;font-size:0.8rem;color:#555">
              <div>Date Generated: <strong id="print-date"></strong></div>
              <div style="margin-top:2px">Confidential</div>
            </div>
          </div>
        </div>
        <!-- Scheduled Reports Preference Settings -->
        <div class="card" style="margin-bottom:1.5rem;background:linear-gradient(135deg,var(--clr-surface-2),var(--clr-surface-3))">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
            <div>
              <div class="section-title" style="margin:0;font-size:1.1rem">📬 Scheduled &amp; Email Reports</div>
              <p style="font-size:0.85rem;color:var(--clr-text-2);margin:0.25rem 0 0">Receive automated reports on demand or set up weekly Sunday digests by default.</p>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center">
              <select id="rpt-frequency" class="select select-sm" style="width:180px">
                <option value="weekly_sunday">Weekly (Sundays, default)</option>
                <option value="daily">Daily digest</option>
                <option value="monthly">Monthly summary</option>
                <option value="off">Turn off notifications</option>
              </select>
              <button class="btn btn-secondary btn-sm" id="rpt-freq-save">Save Setup</button>
            </div>
          </div>
        </div>

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
    
    const curSelect = document.getElementById('reports-page-currency');
    if (curSelect) {
      curSelect.value = pageCurrency;
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_reports', e.target.value);
        _load();
      });
    }

    const freqSelect = document.getElementById('rpt-frequency');
    const freqSaveBtn = document.getElementById('rpt-freq-save');
    const savedFreq = localStorage.getItem('wp_report_frequency_' + WPApp.state.user.id) || 'weekly_sunday';
    if (freqSelect) {
      freqSelect.value = savedFreq;
    }
    freqSaveBtn?.addEventListener('click', () => {
      const selected = freqSelect.value;
      localStorage.setItem('wp_report_frequency_' + WPApp.state.user.id, selected);
      if (selected === 'off') {
        WPToast.success('Notifications and scheduled email digests disabled.');
      } else {
        WPToast.success(`Preferences updated! Reports scheduled: ${selected.replace('_', ' ')}.`);
      }
    });
    
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
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const pageCurrency = localStorage.getItem('wp_page_currency_reports') || baseCur;

      _renderKPIs(snapshots, income, expenses, assets, liabs, baseCur, pageCurrency);
      _renderCharts(snapshots); // WPCharts handles inside canvas
      _renderTable(snapshots, baseCur, pageCurrency);
      _renderRatios(income, expenses, assets, liabs, baseCur, pageCurrency);
    } catch (err) { WPToast.error('Failed to load report data.'); }
  }

  function _renderKPIs(snapshots, income, expenses, assets, liabs, baseCur, pageCurrency) {
    const latest   = snapshots[snapshots.length - 1];
    const oldest   = snapshots[0];
    
    // latest / oldest snapshots are stored in the user profile base currency
    const nwChange = latest && oldest ? latest.net_worth - oldest.net_worth : 0;
    
    const totalAssets  = assets.reduce((s,a)  => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      return s + WPUtils.convert(a.close_balance||a.open_balance||0, cur, baseCur);
    }, 0);
    const totalLiab    = liabs.reduce((s,l)   => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance||l.open_balance||0, cur, baseCur);
    }, 0);
    
    const avgSavings = snapshots.length ? snapshots.reduce((s,x)=>s+(x.net_cash_flow||0),0)/snapshots.length : 0;

    const nwPage = WPUtils.convert(totalAssets - totalLiab, baseCur, pageCurrency);
    const nwChangePage = WPUtils.convert(nwChange, baseCur, pageCurrency);
    const avgSavingsPage = WPUtils.convert(avgSavings, baseCur, pageCurrency);

    document.getElementById('reports-kpis').innerHTML = `
      <div class="card"><div class="card-title">Net Worth (This Month)</div>
        <div class="card-value ${totalAssets-totalLiab>=0?'accent':'danger'}">${WPUtils.fmt(nwPage, {compact:true, currency: pageCurrency})}</div></div>
      <div class="card"><div class="card-title">Net Worth Change (12M)</div>
        <div class="card-value ${nwChange>=0?'accent':'danger'}">${WPUtils.fmt(nwChangePage,{compact:true,signed:true, currency: pageCurrency})}</div></div>
      <div class="card"><div class="card-title">Avg Monthly Savings</div>
        <div class="card-value">${snapshots.length?WPUtils.fmt(avgSavingsPage,{compact:true, currency: pageCurrency}):'—'}</div></div>
      <div class="card"><div class="card-title">Snapshots Recorded</div>
        <div class="card-value">${snapshots.length}</div><div class="card-meta">out of 12 months</div></div>`;
  }

  function _renderCharts(snapshots) {
    if (snapshots.length === 0) {
      ['rpt-chart-nw','rpt-chart-cf','rpt-chart-sr'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentElement.innerHTML = '<div style="height:240px;display:flex;align-items:center;justify-content:center;color:var(--clr-text-3);font-size:0.85rem">No data yet. Add income and expenses to see charts.</div>';
      });
      return;
    }
    // Show charts even with a single snapshot
    WPCharts.netWorthTrend('rpt-chart-nw', snapshots);
    WPCharts.incomeVsExpenses('rpt-chart-cf', snapshots);
    WPCharts.savingsRateLine('rpt-chart-sr', snapshots);
  }

  function _renderTable(snapshots, baseCur, pageCurrency) {
    const wrap = document.getElementById('rpt-snapshot-table');
    if (!snapshots.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No snapshots yet. Use the Dashboard to save monthly snapshots.</div>';
      return;
    }
    const rows = [...snapshots].reverse().map(s => {
      const sr = s.total_income ? (s.net_cash_flow / s.total_income * 100).toFixed(1) : '—';
      
      const nwPage = WPUtils.convert(s.net_worth||0, baseCur, pageCurrency);
      const incPage = WPUtils.convert(s.total_income||0, baseCur, pageCurrency);
      const expPage = WPUtils.convert(s.total_expenses||0, baseCur, pageCurrency);
      const cfPage = WPUtils.convert(s.net_cash_flow||0, baseCur, pageCurrency);
      const pasPage = WPUtils.convert(s.passive_income_amt||0, baseCur, pageCurrency);

      return `<tr>
        <td class="text-muted">${WPUtils.periodLabel(s.period_month)}</td>
        <td class="td-mono fw-600 ${s.net_worth>=0?'text-accent':'text-danger'}">${WPUtils.fmt(nwPage,{compact:true, currency: pageCurrency})}</td>
        <td class="td-mono">${WPUtils.fmt(incPage,{compact:true, currency: pageCurrency})}</td>
        <td class="td-mono">${WPUtils.fmt(expPage,{compact:true, currency: pageCurrency})}</td>
        <td class="td-mono ${s.net_cash_flow>=0?'text-accent':'text-danger'}">${WPUtils.fmt(cfPage,{compact:true,signed:true, currency: pageCurrency})}</td>
        <td class="td-mono">${sr !== '—' ? sr+'%' : '—'}</td>
        <td class="td-mono text-gold">${WPUtils.fmt(pasPage,{compact:true, currency: pageCurrency})}</td>
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

  function _renderRatios(income, expenses, assets, liabs, baseCur, pageCurrency) {
    const totalAssets  = assets.reduce((s,a)  => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      return s + WPUtils.convert(a.close_balance||a.open_balance||0, cur, baseCur);
    }, 0);
    const totalLiab    = liabs.reduce((s,l)   => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance||l.open_balance||0, cur, baseCur);
    }, 0);
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
    // Populate print header with user name and date
    const name = WPApp.state.profile?.full_name || 'Client';
    const nameEl = document.getElementById('print-client-name');
    const dateEl = document.getElementById('print-date');
    if (nameEl) nameEl.textContent = name;
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    WPToast.info('PDF export — use your browser\'s Print function (Ctrl+P) and select "Save as PDF".');
    window.print();
  }

  function destroy() {}
  return { init, destroy };
})();
