// ============================================================
// OlaFinancial — Net Worth & Balance Sheet Summary Page
// ============================================================

const WPBalanceSheet = (() => {
  let _assets = [];
  let _liabilities = [];
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Balance Sheet Summary</h1>
          <p class="page-subtitle">Unified Net Worth, coverage, and ratios for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="bs-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
      </div>
      <div class="page-body">
        <!-- Net Worth Banner -->
        <div class="card" id="nw-banner" style="background:linear-gradient(135deg,var(--clr-surface-3),var(--clr-surface-2));margin-bottom:1.5rem;text-align:center;padding:2.5rem">
          <div class="card-title">Net Worth</div>
          <div class="card-value" id="nw-value" style="font-size:3rem">—</div>
          <div class="card-meta" id="nw-meta"></div>
        </div>
        <!-- Insights Strip -->
        <div id="bs-insights" style="display:none"></div>
        <!-- Sponsor Slot: Insurance -->
        <div id="bs-sponsor-insurance"></div>
        <!-- KPIs -->
        <div class="kpi-grid" id="bs-kpis" style="margin-bottom:1.5rem"></div>
        <!-- NDIC Alert -->
        <div id="ndic-alert" style="display:none"></div>

        <div class="grid grid-2" style="gap:1.5rem">
          <!-- Top Assets Card -->
          <div class="card flex flex-col justify-between" style="margin-bottom:1.5rem">
            <div>
              <div class="section-header">
                <span class="section-title">Top Assets</span>
                <span class="badge badge-accent" id="assets-total">—</span>
              </div>
              <div class="table-wrap" id="assets-summary-table" style="margin-top:1rem"></div>
            </div>
            <div style="margin-top:1rem;text-align:right">
              <a href="#/assets" class="btn btn-secondary btn-sm">View All Assets →</a>
            </div>
          </div>
          <!-- Top Liabilities Card -->
          <div class="card flex flex-col justify-between" style="margin-bottom:1.5rem">
            <div>
              <div class="section-header">
                <span class="section-title">Top Liabilities</span>
                <span class="badge badge-danger" id="liab-total">—</span>
              </div>
              <div class="table-wrap" id="liab-summary-table" style="margin-top:1rem"></div>
            </div>
            <div style="margin-top:1rem;text-align:right">
              <a href="#/liabilities" class="btn btn-secondary btn-sm">View All Liabilities →</a>
            </div>
          </div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    const curSelect = document.getElementById('bs-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_balance_sheet') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_balance_sheet', e.target.value);
        _render();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;
      [_assets, _liabilities] = await Promise.all([
        WPDb.getAssetsByPeriod(uid, PERIOD),
        WPDb.getLiabilitiesByPeriod(uid, PERIOD),
      ]);
      _render();

      // Insights
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const totalAssets = _assets.reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const totalLiab = _liabilities.reduce((s,l) => s + WPUtils.convert(l.close_balance||l.open_balance||0, WPUtils.getEntryCurrency(l.notes), baseCur), 0);
      const liquidTypes = ['savings','cash','current_account'];
      const liquidTotal = _assets.filter(a => liquidTypes.includes((a.asset_type||'').toLowerCase()))
        .reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const categoryCounts = {};
      _assets.forEach(a => { categoryCounts[a.asset_type||'other'] = (categoryCounts[a.asset_type||'other']||0) + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur); });
      const topCatVal = Math.max(0, ...Object.values(categoryCounts));
      WPInsights.evaluate('balance-sheet', {
        netWorthKobo:        totalAssets - totalLiab,
        hasInsurance:        false,
        liquidRatio:         totalAssets > 0 ? liquidTotal / totalAssets : 0,
        topAssetCategoryRatio: totalAssets > 0 ? topCatVal / totalAssets : 0,
        totalAssetsKobo:     totalAssets,
      }, document.getElementById('bs-insights'));

      WPSponsor.render('insurance', document.getElementById('bs-sponsor-insurance'), false);
    } catch (err) { WPToast.error('Failed to load balance sheet summary.'); }
  }

  function _render() {
    const pageCurrency = localStorage.getItem('wp_page_currency_balance_sheet') || WPApp.state.profile?.currency || 'NGN';

    const totalAssets = _assets.reduce((s,a) => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
    }, 0);
    const totalLiab   = _liabilities.reduce((s,l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance || l.open_balance || 0, cur, pageCurrency);
    }, 0);
    const netWorth    = totalAssets - totalLiab;
    const nwColor     = netWorth >= 0 ? 'accent' : 'danger';
    const dta         = WPUtils.debtToAssetRatio(totalLiab, totalAssets);
    const coverage    = WPUtils.coverageRatio(totalAssets, totalLiab);

    document.getElementById('nw-value').textContent = WPUtils.fmt(netWorth, { currency: pageCurrency });
    document.getElementById('nw-value').className   = `card-value ${nwColor}`;
    document.getElementById('nw-meta').textContent  =
      `Assets ${WPUtils.fmt(totalAssets, {compact:true, currency: pageCurrency})} − Liabilities ${WPUtils.fmt(totalLiab, {compact:true, currency: pageCurrency})}`;

    document.getElementById('assets-total').textContent = WPUtils.fmt(totalAssets, {compact:true, currency: pageCurrency});
    document.getElementById('liab-total').textContent   = WPUtils.fmt(totalLiab, {compact:true, currency: pageCurrency});

    document.getElementById('bs-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Assets</div><div class="card-value accent">${WPUtils.fmt(totalAssets,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_assets.length} asset${_assets.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Total Liabilities</div><div class="card-value danger">${WPUtils.fmt(totalLiab,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_liabilities.length} liabilit${_liabilities.length!==1?'ies':'y'}</div></div>
      <div class="card"><div class="card-title">Debt-to-Asset Ratio</div><div class="card-value ${dta>50?'danger':'accent'}">${dta.toFixed(1)}%</div><div class="card-meta">Target: below 50%</div></div>
      <div class="card"><div class="card-title">Coverage Ratio</div><div class="card-value ${coverage<1?'danger':'accent'}">${isFinite(coverage)?coverage.toFixed(2)+'x':'∞'}</div><div class="card-meta">Assets / Liabilities</div></div>`;

    // NDIC alerts
    const ndicAlerts = _assets.filter(a => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      const balBase = WPUtils.convert(a.close_balance||a.open_balance||0, cur, 'NGN');
      const check = WPUtils.checkNDIC(balBase, a.institution_type||'dmb');
      return check.alert;
    });
    const ndicEl = document.getElementById('ndic-alert');
    if (ndicAlerts.length) {
      ndicEl.style.display = '';
      ndicEl.innerHTML = ndicAlerts.map(a => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        const balBase = WPUtils.convert(a.close_balance||a.open_balance||0, cur, 'NGN');
        const check = WPUtils.checkNDIC(balBase, a.institution_type||'dmb');
        return `<div class="alert alert-warning">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <span><strong>${a.asset_name}</strong>: Balance ${WPUtils.fmt(a.close_balance||a.open_balance||0, { currency: cur })} exceeds NDIC coverage of ${WPUtils.fmt(check.limit)}. Consider spreading across multiple institutions.</span>
        </div>`;
      }).join('');
    } else {
      ndicEl.style.display = 'none';
    }

    _renderTopAssets(pageCurrency);
    _renderTopLiabilities(pageCurrency);
  }

  function _renderTopAssets(pageCurrency) {
    const wrap = document.getElementById('assets-summary-table');
    if (!_assets.length) {
      wrap.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--clr-text-2)">No assets recorded.</div>';
      return;
    }
    // Sort descending by balance, take top 5
    const topAssets = [..._assets].sort((a, b) => {
      const balA = WPUtils.convert(a.close_balance || a.open_balance || 0, WPUtils.getEntryCurrency(a.notes), pageCurrency);
      const balB = WPUtils.convert(b.close_balance || b.open_balance || 0, WPUtils.getEntryCurrency(b.notes), pageCurrency);
      return balB - balA;
    }).slice(0, 5);

    wrap.innerHTML = `<table>
      <thead><tr><th>Asset</th><th>Type</th><th class="text-right">Balance</th></tr></thead>
      <tbody>${topAssets.map(a => {
        const bal = a.close_balance || a.open_balance || 0;
        const cur = WPUtils.getEntryCurrency(a.notes);
        const balPage = WPUtils.convert(bal, cur, pageCurrency);
        return `<tr style="cursor:pointer" onclick="location.hash='#/assets'">
          <td><strong>${a.asset_name}</strong></td>
          <td><span class="badge badge-neutral">${(a.asset_type||'').replace('_',' ')}</span></td>
          <td class="td-mono text-right fw-600">${WPUtils.fmt(balPage, { currency: pageCurrency })}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _renderTopLiabilities(pageCurrency) {
    const wrap = document.getElementById('liab-summary-table');
    if (!_liabilities.length) {
      wrap.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--clr-text-2)">No liabilities recorded.</div>';
      return;
    }
    // Sort descending by balance, take top 5
    const topLiab = [..._liabilities].sort((a, b) => {
      const balA = WPUtils.convert(a.close_balance || a.open_balance || 0, WPUtils.getEntryCurrency(a.notes), pageCurrency);
      const balB = WPUtils.convert(b.close_balance || b.open_balance || 0, WPUtils.getEntryCurrency(b.notes), pageCurrency);
      return balB - balA;
    }).slice(0, 5);

    wrap.innerHTML = `<table>
      <thead><tr><th>Liability</th><th>Type</th><th class="text-right">Balance</th></tr></thead>
      <tbody>${topLiab.map(l => {
        const bal = l.open_balance || 0;
        const cur = WPUtils.getEntryCurrency(l.notes);
        const balPage = WPUtils.convert(bal, cur, pageCurrency);
        return `<tr style="cursor:pointer" onclick="location.hash='#/liabilities'">
          <td><strong>${l.liability_name}</strong></td>
          <td><span class="badge badge-danger">${(l.liability_type||'').replace('_',' ')}</span></td>
          <td class="td-mono text-right fw-600 text-danger">${WPUtils.fmt(balPage, { currency: pageCurrency })}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function destroy() {}
  return { init, destroy };
})();
