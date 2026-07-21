// ============================================================
// OlaFinancial — Dashboard Page
// ============================================================

const WPDashboard = (() => {

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title" id="dash-greeting">Loading…</h1>
          <p class="page-subtitle" id="dash-period"></p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="dash-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-secondary" id="dash-refresh">&#x21BB; Refresh</button>
          <button class="btn btn-primary" id="dash-snapshot">&#x1F4F8; Save Snapshot</button>
        </div>
      </div>
      <div class="page-body">
        <!-- Getting started path for naive users (shown until dismissed) -->
        <div class="card dashboard-full" id="dash-getting-started" style="display:none;margin-bottom:1.25rem"></div>
        <!-- FI Score hero (#80) -->
        <div class="card fi-score-card dashboard-full" id="dash-fi-hero" style="display:none;margin-bottom:1.25rem;cursor:pointer" onclick="WPRouter.navigate('/cashflow')"></div>
        <div class="kpi-grid" id="dash-kpis">${_skeletons(5)}</div>
        <!-- Dashboard Insights -->
        <div id="dash-insights" style="display:none"></div>
        <!-- Insights & Alerts — above charts so visible on login -->
        <div class="card dashboard-full" id="dash-alerts" style="display:none"></div>
        <!-- Pay Yourself First surplus allocator -->
        <div class="card dashboard-full" id="dash-pyf" style="display:none"></div>
        <div class="dashboard-grid" id="dash-grid">
          <div class="card dashboard-wide">
            <div class="section-header">
              <span class="section-title">Net Worth Trend</span>
              <span class="badge badge-neutral">Last 12 Months</span>
            </div>
            <div class="chart-container" style="height:240px"><canvas id="chart-net-worth"></canvas></div>
          </div>
          <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
            <div class="card-title">Financial Health Score</div>
            <div style="position:relative;margin:1rem auto">
              <canvas id="chart-health" width="160" height="160" style="max-width:160px"></canvas>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:16px">
                <div class="card-value" id="dash-score" style="font-size:2.2rem">—</div>
                <div class="card-meta" id="dash-score-label">—</div>
              </div>
            </div>
          </div>
          <div class="card dashboard-wide">
            <div class="section-header">
              <span class="section-title">Income vs Expenses</span>
              <span class="badge badge-neutral">Trend</span>
            </div>
            <div class="chart-container" style="height:240px"><canvas id="chart-income-exp"></canvas></div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem">Expense Breakdown</div>
            <div class="chart-container" style="height:220px"><canvas id="chart-expense-donut"></canvas></div>
          </div>
          <div class="card dashboard-full">
            <div class="section-header"><span class="section-title">Quick Actions</span></div>
            <div class="quick-actions">
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/income')">&#x2795; Add Income</button>
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/expenses')">&#x1F4B8; Log Expense</button>
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/goals')">&#x1F3AF; Set a Goal</button>
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/debt')">&#x2702;&#xFE0F; Debt Planner</button>
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/retirement')">&#x1F334; Retirement</button>
              <button class="btn btn-secondary" onclick="WPRouter.navigate('/reports')">&#x1F4CA; Reports</button>
            </div>
          </div>
          <!-- CBN / NBS Macroeconomic Indices Dashboard Widget -->
          <div class="card dashboard-full" id="macroeconomic-card">
            <div class="section-header">
              <span class="section-title">🇳🇬 Macroeconomic Indicators (CBN &amp; NBS)</span>
              <span class="badge badge-neutral" id="macro-update-badge">Offline Reference Policy Rates</span>
            </div>
            <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-top: 1rem; gap: 1rem;">
              <div style="background:var(--clr-bg); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="card-title" style="font-size:0.8rem">Inflation Rate</div>
                <div class="card-value text-danger" style="font-size:1.5rem; font-weight:700" data-econ="inflation-val">32.15%</div>
                <div class="card-meta" style="font-size:0.75rem" data-econ="inflation-meta">NBS, May 2026</div>
              </div>
              <div style="background:var(--clr-bg); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="card-title" style="font-size:0.8rem">Monetary Policy Rate</div>
                <div class="card-value text-gold" style="font-size:1.5rem; font-weight:700" data-econ="mpr-val">27.25%</div>
                <div class="card-meta" style="font-size:0.75rem">CBN Policy Anchor</div>
              </div>
              <div style="background:var(--clr-bg); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="card-title" style="font-size:0.8rem">GDP Growth (Per Capita)</div>
                <div class="card-value text-accent" style="font-size:1.5rem; font-weight:700" data-econ="gdp-val">+3.46%</div>
                <div class="card-meta" style="font-size:0.75rem" data-econ="gdp-meta">Q1 2026 YoY</div>
              </div>
              <div style="background:var(--clr-bg); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="card-title" style="font-size:0.8rem">Foreign Reserves</div>
                <div class="card-value text-white" style="font-size:1.5rem; font-weight:700" data-econ="res-val">$36.89B</div>
                <div class="card-meta" style="font-size:0.75rem">CBN Liquid Buffer</div>
              </div>
              <div style="background:var(--clr-bg); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="card-title" style="font-size:0.8rem">Exchange Rates</div>
                <div class="card-value text-white" style="font-size:1.2rem; font-weight:600; line-height:1.2;" data-econ="fx-val">
                  $1 = ₦1,485<br>
                  £1 = ₦1,890
                </div>
                <div class="card-meta" style="font-size:0.75rem" data-econ="fx-meta">NAFEM Reference</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    _setGreeting();
    _setPeriod();
    document.getElementById('dash-refresh')?.addEventListener('click', () => _load());
    document.getElementById('dash-snapshot')?.addEventListener('click', _saveSnapshot);

    const curSelect = document.getElementById('dash-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_dashboard') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_dashboard', e.target.value);
        _load();
      });
    }

    _renderGettingStarted();
    await _load();
  }

  function _renderGettingStarted() {
    const el = document.getElementById('dash-getting-started');
    if (!el || typeof APP_CONFIG === 'undefined') return;
    const uid = WPApp.state.user?.id;
    if (!uid) return;

    const showKey = 'wp_show_getting_started_' + uid;
    const hideKey = 'wp_hide_getting_started_' + uid;
    let forceShow = false;
    let hidden = false;
    try {
      forceShow = localStorage.getItem(showKey) === '1';
      hidden = localStorage.getItem(hideKey) === '1';
    } catch (_) { /* ignore */ }

    // Default: show for everyone until they hide it; force show after onboarding/settings
    if (hidden && !forceShow) {
      el.style.display = 'none';
      return;
    }

    const pathHtml = APP_CONFIG.gettingStartedPathHTML({ interactive: true });
    el.style.display = '';
    el.innerHTML = `
      <div class="section-header" style="align-items:flex-start;flex-wrap:wrap;gap:0.75rem">
        <div>
          <div class="section-title" style="margin:0">🗺️ Your path — start here</div>
          <p class="text-muted text-sm" style="margin:0.35rem 0 0;max-width:36rem">
            Follow these steps in order. You can come back anytime — re-open this guide from <strong>Settings</strong>, or re-run the full setup wizard.
          </p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-secondary btn-sm" id="dash-gs-replay">Replay setup wizard</button>
          <button type="button" class="btn btn-ghost btn-sm" id="dash-gs-dismiss">Hide for now</button>
        </div>
      </div>
      ${pathHtml}`;

    el.querySelectorAll('[data-guide-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-guide-route');
        if (route) WPRouter.navigate(route);
      });
    });
    document.getElementById('dash-gs-dismiss')?.addEventListener('click', () => {
      try {
        localStorage.setItem(hideKey, '1');
        localStorage.removeItem(showKey);
      } catch (_) {}
      el.style.display = 'none';
      WPToast.info('Guide hidden. Find it again under Settings → Getting started.');
    });
    document.getElementById('dash-gs-replay')?.addEventListener('click', () => {
      WPRouter.navigate('/onboarding');
    });
  }

  function _skeletons(n) {
    return Array(n).fill(0).map(() =>
      `<div class="card"><div class="skeleton skeleton-text" style="width:55%"></div><div class="skeleton" style="height:2.5rem;margin-top:0.75rem;border-radius:8px"></div></div>`
    ).join('');
  }

  function _setGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const name = WPApp.state.profile?.full_name?.split(' ')[0] || 'there';
    const el = document.getElementById('dash-greeting');
    if (el) el.innerHTML = `${g}, ${name}! &#x1F44B;`;
  }

  function _setPeriod() {
    const el = document.getElementById('dash-period');
    if (el) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      el.textContent = 'Financial overview \u00b7 ' + dateStr;
    }
  }

  async function _load() {
    try {
      await WPApp.loadCurrentMonthData();
      const s = WPApp.computeSummary();
      _renderKPIs(s);
      _renderCharts(s);
      _renderAlerts(s);
      _renderPYF(s);

      // Fetch live econ data and update macro card
      try {
        const econRes = await fetch('/api/econ');
        if (econRes.ok) {
          const econ = await econRes.json();
          _updateEconCard(econ);
          // Pass inflation to WPInsights for dashboard rules
          WPInsights.evaluate('dashboard', {
            netWorthKobo:    s.netWorth,
            hasEmergencyFund: s.efBalance > 0,
            inflation:       econ.inflation?.value || 0,
            netWorthTrend:   'stable', // Future: compute from snapshots
            incomeCount:     WPApp.state.data.income?.length || 0,
          }, document.getElementById('dash-insights'));
        }
      } catch (_) { /* econ fetch optional — don't fail the page */ }
    } catch (err) {
      WPToast.error('Failed to load dashboard data.');
      console.error(err);
    }
  }

  function _updateEconCard(econ) {
    const card = document.getElementById('macroeconomic-card');
    if (!card) return;
    const updateBadge = card.querySelector('#macro-update-badge');
    if (updateBadge && econ.updatedAt) {
      updateBadge.textContent = `Offline Reference · Updated: ${econ.updatedAt}`;
    }
    const inf = econ.inflation; const mpr = econ.mpr; const gdp = econ.gdpPerCapita; const res = econ.reserves; const fx = econ.fx;
    card.querySelector('[data-econ="inflation-val"]')  && (card.querySelector('[data-econ="inflation-val"]').textContent  = inf  ? inf.value + '%'  : '—');
    card.querySelector('[data-econ="inflation-meta"]') && (card.querySelector('[data-econ="inflation-meta"]').textContent = inf  ? `NBS, ${inf.period}` : '—');
    card.querySelector('[data-econ="mpr-val"]')        && (card.querySelector('[data-econ="mpr-val"]').textContent        = mpr  ? mpr.value + '%'  : '—');
    card.querySelector('[data-econ="gdp-val"]')        && (card.querySelector('[data-econ="gdp-val"]').textContent        = gdp  ? `+${gdp.value}%` : '—');
    card.querySelector('[data-econ="gdp-meta"]')       && (card.querySelector('[data-econ="gdp-meta"]').textContent       = gdp  ? gdp.period : '—');
    card.querySelector('[data-econ="res-val"]')        && (card.querySelector('[data-econ="res-val"]').textContent        = res  ? `$${res.value}B` : '—');
    card.querySelector('[data-econ="fx-val"]')         && (card.querySelector('[data-econ="fx-val"]').innerHTML           = fx   ? `$1 = ₦${fx.usd?.toLocaleString()}<br>£1 = ₦${fx.gbp?.toLocaleString()}` : '—');
    card.querySelector('[data-econ="fx-meta"]')        && (card.querySelector('[data-econ="fx-meta"]').textContent        = fx   ? `${fx.source} · ${fx.period}` : '—');
  }

  function _renderKPIs(s) {
    const pageCurrency = localStorage.getItem('wp_page_currency_dashboard') || WPApp.state.profile?.currency || 'NGN';
    const baseCurrency = WPApp.state.profile?.currency || 'NGN';

    const netWorth = WPUtils.convert(s.netWorth, baseCurrency, pageCurrency);
    const totalAssets = WPUtils.convert(s.totalAssets, baseCurrency, pageCurrency);
    const totalLiabilities = WPUtils.convert(s.totalLiabilities, baseCurrency, pageCurrency);
    const netCashFlow = WPUtils.convert(s.cf.netCashFlow, baseCurrency, pageCurrency);
    const netIncome = WPUtils.convert(s.cf.netIncome, baseCurrency, pageCurrency);
    const passiveKobo = WPUtils.convert(s.passiveKPIs.passiveKobo, baseCurrency, pageCurrency);
    const efBalance = WPUtils.convert(s.efBalance, baseCurrency, pageCurrency);
    const efTarget = WPUtils.convert(s.efTarget, baseCurrency, pageCurrency);

    const nwColor = netWorth >= 0 ? 'accent' : 'danger';
    const srPct   = s.cf.netCashFlow / Math.max(1, s.cf.netIncome);

    const fis = s.passiveKPIs.pctOfExpenses;
    const fisTone = fis >= 100 ? 'accent' : fis >= 50 ? 'gold' : 'danger';
    const fisLabel = fis >= 100 ? 'Financially independent — passive income covers outflows'
      : fis >= 50 ? 'Halfway there — keep growing passive income'
      : 'Building — passive income still covers a small share of outflows';

    const fiHero = document.getElementById('dash-fi-hero');
    if (fiHero) {
      fiHero.style.display = '';
      fiHero.innerHTML = `
        <div class="fi-score-inner">
          <div class="fi-score-label">
            <span class="fi-score-badge">Primary KPI</span>
            <div class="card-title" style="margin:0.5rem 0 0.25rem;font-size:0.85rem;letter-spacing:0.1em">Financial Independence Score (FIS)</div>
            <p class="text-sm text-muted" style="margin:0;max-width:28rem;line-height:1.45">${fisLabel}</p>
          </div>
          <div class="fi-score-value-wrap">
            <div class="card-value ${fisTone} fi-score-value">${fis.toFixed(1)}%</div>
            <div class="card-meta">Passive income covers this share of monthly outflows · open Cash Flow</div>
          </div>
          <div class="fi-score-bar-wrap" aria-hidden="true">
            <div class="fi-score-bar"><div class="fi-score-bar-fill fi-score-bar-fill--${fisTone}" style="width:${Math.min(100, Math.max(2, fis))}%"></div></div>
            <div class="fi-score-bar-meta"><span>0%</span><span>Goal 100%</span></div>
          </div>
        </div>`;
    }

    document.getElementById('dash-kpis').innerHTML = `
      <div class="card animate-in">
        <div class="card-title">Net Worth</div>
        <div class="card-value ${nwColor}">${WPUtils.fmt(netWorth, {compact:true, currency: pageCurrency})}</div>
        <div class="card-meta">Assets ${WPUtils.fmt(totalAssets,{compact:true, currency: pageCurrency})} &minus; Liabilities ${WPUtils.fmt(totalLiabilities,{compact:true, currency: pageCurrency})}</div>
      </div>
      <div class="card animate-in" style="animation-delay:0.05s">
        <div class="card-title">Net Cash Flow</div>
        <div class="card-value ${netCashFlow>=0?'income':'expense'}">${WPUtils.fmt(netCashFlow,{compact:true,signed:true, currency: pageCurrency})}</div>
        <div class="card-meta">Net income <span class="amount-income">${WPUtils.fmt(netIncome,{compact:true, currency: pageCurrency})}</span></div>
      </div>
      <div class="card animate-in" style="animation-delay:0.1s">
        <div class="card-title">Savings Rate</div>
        <div class="card-value ${srPct>=0.2?'accent':'gold'}">${WPUtils.fmtPct(srPct)}</div>
        <div class="card-meta">Target: &ge; 20% of net income</div>
      </div>
      <div class="card animate-in" style="animation-delay:0.15s">
        <div class="card-title">Passive Income</div>
        <div class="card-value income">${WPUtils.fmt(passiveKobo,{compact:true, currency: pageCurrency})}</div>
        <div class="card-meta">${WPUtils.fmtPct(s.passiveKPIs.pctOfExpenses/100)} of expenses covered</div>
      </div>
      <div class="card animate-in" style="animation-delay:0.2s">
        <div class="card-title">Emergency Fund</div>
        <div class="card-value ${s.efStatus.status==='on_track'?'accent':s.efStatus.status==='critical'?'danger':'gold'}">${WPUtils.fmt(efBalance,{compact:true, currency: pageCurrency})}</div>
        <div class="card-meta">${s.efStatus.label||'—'} · Target ${WPUtils.fmt(efTarget,{compact:true, currency: pageCurrency})}</div>
      </div>`;
  }

  function _renderCharts(s) {
    let snaps = WPApp.state.data.snapshots;

    // If no snapshots saved yet, create a synthetic one from current live data
    if (snaps.length === 0) {
      const period = WPUtils.currentPeriod();
      snaps = [{
        period_month: period,
        net_worth: s.netWorth,
        total_assets: s.totalAssets,
        total_liabilities: s.totalLiabilities,
        total_income: s.cf.netIncome,
        total_expenses: s.cf.totalExpenses,
        net_cash_flow: s.cf.netCashFlow,
        passive_income_amt: s.passiveKPIs.passiveKobo,
      }];
    }

    // Always render charts — even with a single data point
    WPCharts.netWorthTrend('chart-net-worth', snaps);
    WPCharts.incomeVsExpenses('chart-income-exp', snaps);

    if (WPApp.state.data.expenses.length > 0) {
      WPCharts.expenseDonut('chart-expense-donut', WPApp.state.data.expenses);
    }
    // Health gauge
    const score = WPUtils.healthScore({
      netWorthKobo:     s.netWorth,
      passivePct:       s.passiveKPIs.pctOfTotal,
      debtToAssetPct:   s.debtToAsset,
      emergencyFundPct: s.efStatus.pct,
      retirementGap:    0,
    });
    const { label, color } = WPUtils.healthScoreLabel(score);
    const scoreEl = document.getElementById('dash-score');
    const labelEl = document.getElementById('dash-score-label');
    if (scoreEl) { scoreEl.textContent = score; scoreEl.className = `card-value ${color}`; }
    if (labelEl) labelEl.textContent = label;
    WPCharts.drawHealthGauge('chart-health', score);
  }

  function _renderAlerts(s) {
    const alerts = [];
    if (s.cf.netCashFlow < 0)
      alerts.push({ type:'danger', msg:'Your expenses exceed income this month. Review your spending.' });
    if (s.efStatus.status === 'critical')
      alerts.push({ type:'warning', msg:'Emergency fund critically low (< 1 month). Prioritize building to 3 months of essential expenses.' });
    if (s.passiveKPIs.pctOfExpenses < 10 && s.totalAssets > 0)
      alerts.push({ type:'info', msg:'Passive income covers less than 10% of expenses. Consider income-generating assets.' });
    if (s.debtToAsset > 50)
      alerts.push({ type:'warning', msg:`Debt-to-asset ratio is ${s.debtToAsset.toFixed(0)}% (above 50% threshold). Visit the Debt Planner.` });

    const el = document.getElementById('dash-alerts');
    if (!el) return;
    if (!alerts.length) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = `<div class="section-title" style="margin-bottom:1rem">&#x26A0;&#xFE0F; Insights &amp; Alerts</div>` +
      alerts.map(a => `<div class="alert alert-${a.type}"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span>${a.msg}</span></div>`).join('');
  }

  async function _saveSnapshot() {
    try {
      const s = WPApp.computeSummary();
      await WPDb.saveSnapshot(WPApp.state.user.id, WPUtils.currentPeriod(), {
        net_worth:          s.netWorth,
        total_assets:       s.totalAssets,
        total_liabilities:  s.totalLiabilities,
        total_income:       s.cf.netIncome,
        total_expenses:     s.cf.totalExpenses,
        net_cash_flow:      s.cf.netCashFlow,
        passive_income_amt: s.passiveKPIs.passiveKobo,
        passive_income_pct: s.passiveKPIs.pctOfTotal,
        emergency_fund_bal: s.efBalance,
      });
      WPToast.success('Monthly snapshot saved!');
    } catch (err) { WPToast.error('Could not save snapshot: ' + err.message); }
  }

  function _renderPYF(s) {
    const el = document.getElementById('dash-pyf');
    if (!el) return;

    const surplus = WPUtils.koboToNaira(s.cf.netCashFlow);
    if (surplus <= 0) { el.style.display = 'none'; return; }

    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_dashboard') || baseCur;
    const surplusConverted = WPUtils.koboToNaira(WPUtils.convert(s.cf.netCashFlow, baseCur, pageCurrency));

    // Load saved PYF allocations or defaults
    const uid = WPApp.state.user.id;
    const saved = JSON.parse(localStorage.getItem('wp_pyf_' + uid) || 'null');
    const allocs = saved || [
      { key:'emergency',   label:'Emergency Fund',          pct: 5,  icon:'🛡️' },
      { key:'retirement',  label:'Extra Retirement Savings', pct: 5,  icon:'🌴' },
      { key:'college',     label:'College Fund',             pct: 0,  icon:'🎓' },
      { key:'mortgage',    label:'Mortgage / Rent',          pct: 0,  icon:'🏠' },
      { key:'debt',        label:'Pay Down Debt / Interest', pct: 0,  icon:'✂️' },
      { key:'investment',  label:'Investment',               pct: 10, icon:'📈' },
      { key:'spend',       label:'Spend at Will',            pct: 0,  icon:'🎉' },
    ];

    const totalPct = allocs.reduce((s, a) => s + (parseFloat(a.pct) || 0), 0);
    const remaining = Math.max(0, 100 - totalPct);

    el.style.display = '';
    el.innerHTML = `
      <div class="section-header" style="margin-bottom:1rem">
        <span class="section-title">💰 Pay Yourself First (PYF)</span>
        <span class="badge ${totalPct > 100 ? 'badge-danger' : totalPct === 100 ? 'badge-accent' : 'badge-neutral'}">${totalPct}% allocated</span>
      </div>
      <p style="font-size:0.85rem;color:var(--clr-text-2);margin-bottom:1rem">
        You have a surplus of <strong style="color:var(--clr-accent)">${WPUtils.fmt(WPUtils.nairaToKobo(surplusConverted), {currency: pageCurrency})}</strong> this period.
        Allocate it intentionally — edit the % column to customise.
      </p>
      <div class="table-wrap">
        <table id="pyf-table">
          <thead><tr>
            <th>Allocation Bucket</th>
            <th style="text-align:center">% of Net Income</th>
            <th style="text-align:right">Amount</th>
          </tr></thead>
          <tbody>
            ${allocs.map((a, i) => `<tr>
              <td><span style="margin-right:6px">${a.icon}</span>${a.label}</td>
              <td style="text-align:center">
                <input type="number" class="input pyf-pct-input" data-i="${i}" min="0" max="100" step="1"
                  value="${a.pct}" style="width:70px;text-align:center;padding:4px 8px">
              </td>
              <td class="td-mono fw-600 text-accent" style="text-align:right" id="pyf-amt-${i}">
                ${WPUtils.fmt(WPUtils.nairaToKobo(surplusConverted * (a.pct / 100)), {currency: pageCurrency})}
              </td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr style="border-top:2px solid var(--clr-border)">
            <td><strong>Total PYF</strong></td>
            <td style="text-align:center"><strong id="pyf-total-pct" class="${totalPct > 100 ? 'text-danger' : 'text-accent'}">${totalPct}%</strong></td>
            <td class="td-mono fw-700 text-accent" style="text-align:right" id="pyf-total-amt">
              ${WPUtils.fmt(WPUtils.nairaToKobo(surplusConverted * totalPct / 100), {currency: pageCurrency})}
            </td>
          </tr>
          ${remaining > 0 ? `<tr><td colspan="3" style="font-size:0.8rem;color:var(--clr-text-3);padding-top:4px">
            ⚠️ ${remaining}% unallocated — consider adding to a bucket above.
          </td></tr>` : ''}</tfoot>
        </table>
      </div>
      <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" id="pyf-flow-btn">💰 Flow to Goals</button>
        <button class="btn btn-secondary btn-sm" id="pyf-save-btn">💾 Save Allocation</button>
        <button class="btn btn-ghost btn-sm" id="pyf-reset-btn">Reset to Defaults</button>
      </div>`;

    // Live update on pct change
    document.querySelectorAll('.pyf-pct-input').forEach(input => {
      input.addEventListener('input', () => {
        const inputs = document.querySelectorAll('.pyf-pct-input');
        let total = 0;
        inputs.forEach((inp, i) => {
          const pct = parseFloat(inp.value) || 0;
          allocs[i].pct = pct;
          total += pct;
          const amtEl = document.getElementById('pyf-amt-' + i);
          if (amtEl) amtEl.textContent = WPUtils.fmt(WPUtils.nairaToKobo(surplusConverted * pct / 100), {currency: pageCurrency});
        });
        const totalPctEl = document.getElementById('pyf-total-pct');
        const totalAmtEl = document.getElementById('pyf-total-amt');
        if (totalPctEl) { totalPctEl.textContent = total + '%'; totalPctEl.className = total > 100 ? 'text-danger' : 'text-accent'; }
        if (totalAmtEl) totalAmtEl.textContent = WPUtils.fmt(WPUtils.nairaToKobo(surplusConverted * total / 100), {currency: pageCurrency});
      });
    });

    document.getElementById('pyf-save-btn')?.addEventListener('click', () => {
      localStorage.setItem('wp_pyf_' + uid, JSON.stringify(allocs));
      WPToast.success('PYF allocation saved!');
    });
    document.getElementById('pyf-reset-btn')?.addEventListener('click', () => {
      localStorage.removeItem('wp_pyf_' + uid);
      _renderPYF(s);
    });

    document.getElementById('pyf-flow-btn')?.addEventListener('click', async () => {
      try {
        const activeGoals = await WPDb.fetchAll('goals', { user_id: uid });
        if (!activeGoals.length) {
          WPToast.warning('You do not have any active goals yet. Please create goals first!');
          return;
        }

        let totalFlowed = 0;
        for (const alloc of allocs) {
          if (alloc.pct <= 0) continue;
          
          // Match by bucket goal_type mapping
          const matched = activeGoals.find(g => g.goal_type === alloc.key && g.current_savings < g.target_amount);
          if (matched) {
            const amountToAdd = Math.round(s.cf.netCashFlow * (alloc.pct / 100));
            const newAmt = matched.current_savings + amountToAdd;
            await WPDb.update('goals', matched.id, { current_savings: newAmt });
            totalFlowed += amountToAdd;
          }
        }

        if (totalFlowed > 0) {
          WPToast.success(`🎉 Successfully allocated ${WPUtils.fmt(totalFlowed, {currency: baseCur})} across your matched goals!`);
          await WPApp.loadData();
          _renderPYF(WPApp.computeSummary());
        } else {
          WPToast.info('No active goals matched your allocated surplus buckets.');
        }
      } catch (err) {
        WPToast.error('Could not allocate: ' + err.message);
      }
    });
  }

  function destroy() {}
  return { init, destroy };
})();
