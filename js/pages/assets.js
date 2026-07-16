// ============================================================
// OlaFinancial — Assets Page
// Mark-to-market equities live here (not Retirement) — #47
// ============================================================

const WPAssets = (() => {
  let _assets = [];
  let _fetchedPrices = {}; // ticker → major-unit price
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <a href="#/balance-sheet" class="text-xs text-accent" style="text-decoration:none;display:inline-block;margin-bottom:0.5rem">← Back to Net Worth</a>
          <h1 class="page-title">Assets</h1>
          <p class="page-subtitle">Manage your cash, savings, property, and investments for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="assets-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="add-asset-page-btn">&#x2795; Add Asset</button>
        </div>
      </div>
      <div class="page-body">
        <div id="assets-insights" style="display:none"></div>
        <div id="assets-sponsor-insurance"></div>
        <div class="kpi-grid" id="assets-kpis" style="margin-bottom:1.5rem"></div>
        <div id="assets-ndic-alert" style="display:none"></div>

        <!-- Mark-to-market equities (#47) -->
        <div class="card" style="margin-bottom:1.5rem" id="assets-mtm-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem">
            <div>
              <div class="section-title" style="margin:0">&#x1F4C8; Equities — Mark-to-Market</div>
              <p class="text-xs text-muted" style="margin:0.35rem 0 0;max-width:40rem">
                Add stocks/ETFs/bonds with a <strong>ticker</strong> so holdings can auto-update from market prices.
                Use <em>Add Asset → Equities → Ticker valuation</em>.
              </p>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" id="assets-refresh-mtm-btn" title="Refresh live prices">↻ Refresh prices</button>
              <button type="button" class="btn btn-secondary btn-sm" id="assets-add-equity-btn">+ Add equity</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker / Name</th>
                  <th>Qty</th>
                  <th>Avg cost</th>
                  <th>Market price</th>
                  <th>Cost basis</th>
                  <th>Market value</th>
                  <th>Gain / Loss</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="assets-mtm-list">
                <tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--clr-text-3)">No ticker holdings yet. Add an equity with a ticker to track mark-to-market.</td></tr>
              </tbody>
            </table>
          </div>
          <div id="assets-mtm-total"></div>
        </div>

        <div class="card">
          <div class="section-header">
            <span class="section-title">All Assets</span>
            <span class="badge badge-accent" id="assets-page-total">—</span>
          </div>
          <div class="table-wrap" id="assets-page-table"></div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    document.getElementById('add-asset-page-btn').addEventListener('click', () => _openAssetForm());
    document.getElementById('assets-add-equity-btn')?.addEventListener('click', () =>
      _openAssetForm({ asset_type: 'equity', is_income_generating: true, _preferTicker: true })
    );
    document.getElementById('assets-refresh-mtm-btn')?.addEventListener('click', () => {
      _fetchedPrices = {};
      _renderMtm();
    });

    const curSelect = document.getElementById('assets-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_assets') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_assets', e.target.value);
        _render();
        _renderMtm();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;
      _assets = await WPDb.getAssetsByPeriod(uid, PERIOD);
      await _migrateLegacyRetirementStocks();
      _render();
      _renderMtm();

      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const totalAssets = _assets.reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const liquidTypes = ['savings','cash','current_account'];
      const liquidTotal = _assets.filter(a => liquidTypes.includes((a.asset_type||'').toLowerCase()))
        .reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const categoryCounts = {};
      _assets.forEach(a => { categoryCounts[a.asset_type||'other'] = (categoryCounts[a.asset_type||'other']||0) + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur); });
      const topCatVal = Math.max(0, ...Object.values(categoryCounts));

      WPInsights.evaluate('balance-sheet', {
        netWorthKobo:        totalAssets,
        hasInsurance:        false,
        liquidRatio:         totalAssets > 0 ? liquidTotal / totalAssets : 0,
        topAssetCategoryRatio: totalAssets > 0 ? topCatVal / totalAssets : 0,
        totalAssetsKobo:     totalAssets,
      }, document.getElementById('assets-insights'));

      WPSponsor.render('insurance', document.getElementById('assets-sponsor-insurance'), false);
    } catch (err) {
      WPToast.error('Failed to load assets.');
    }
  }

  /**
   * One-time: move Retirement-page localStorage stocks into Assets equity rows.
   */
  async function _migrateLegacyRetirementStocks() {
    const uid = WPApp.state.user?.id;
    if (!uid) return;
    const key = 'wp_ret_stocks_' + uid;
    const flag = key + '_migrated_to_assets';
    if (localStorage.getItem(flag)) return;

    let stocks = [];
    try {
      stocks = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(stocks) || !stocks.length) {
        localStorage.setItem(flag, '1');
        return;
      }
    } catch {
      localStorage.setItem(flag, '1');
      return;
    }

    const already = _assets.some(a => WPUtils.parseNotesTags(a.notes).ticker);
    if (already) {
      localStorage.setItem(flag, '1');
      return;
    }

    let imported = 0;
    for (const s of stocks) {
      const ticker = String(s.ticker || '').trim().toUpperCase();
      const qty = Number(s.qty) || 0;
      const purchasePrice = Number(s.purchasePrice) || 0;
      if (!ticker || qty <= 0 || purchasePrice <= 0) continue;
      const unitCostKobo = WPUtils.nairaToKobo(purchasePrice);
      const basisKobo = Math.round(qty * unitCostKobo);
      const notes = WPUtils.setEntryCurrency(
        `[ticker:${ticker}] [qty:${qty}] [unit_cost:${unitCostKobo}]`,
        'USD'
      );
      try {
        await WPDb.insert('assets', {
          user_id: uid,
          asset_name: ticker,
          asset_type: 'equity',
          institution_type: 'investment',
          institution_name: '',
          open_balance: basisKobo,
          close_balance: basisKobo,
          interest_rate: 0,
          tenor_months: null,
          is_income_generating: true,
          notes,
          period_month: PERIOD,
        });
        imported++;
      } catch {
        /* continue remaining */
      }
    }

    localStorage.setItem(flag, '1');
    if (imported > 0) {
      _assets = await WPDb.getAssetsByPeriod(uid, PERIOD);
      WPToast.success(`Imported ${imported} stock holding${imported === 1 ? '' : 's'} from Retirement into Assets.`);
    }
  }

  function _tickerHoldings() {
    return _assets
      .map(a => {
        const tags = WPUtils.parseNotesTags(a.notes);
        if (!tags.ticker || tags.qty <= 0) return null;
        return { asset: a, tags };
      })
      .filter(Boolean);
  }

  function _priceFor(sym, buyMajor) {
    if (_fetchedPrices[sym] != null && _fetchedPrices[sym] > 0) return _fetchedPrices[sym];
    return WPUtils.estimateMarketPrice(sym, buyMajor);
  }

  function _render() {
    const pageCurrency = localStorage.getItem('wp_page_currency_assets') || WPApp.state.profile?.currency || 'NGN';

    const totalAssets = _assets.reduce((s,a) => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
    }, 0);

    const incomeGenerating = _assets.filter(a => a.is_income_generating).reduce((s,a) => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
    }, 0);

    const emergencySources = _assets.filter(a => a.notes && a.notes.includes('[Emergency Fund]')).length;
    const tickerCount = _tickerHoldings().length;

    document.getElementById('assets-page-total').textContent = WPUtils.fmt(totalAssets, {compact:true, currency: pageCurrency});

    document.getElementById('assets-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Assets</div><div class="card-value accent">${WPUtils.fmt(totalAssets,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_assets.length} asset${_assets.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Income-Generating Assets</div><div class="card-value accent">${WPUtils.fmt(incomeGenerating,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_assets.filter(a => a.is_income_generating).length} assets</div></div>
      <div class="card"><div class="card-title">Ticker holdings (MTM)</div><div class="card-value gold">${tickerCount}</div><div class="card-meta">Auto-updatable equities</div></div>
      <div class="card"><div class="card-title">Emergency Fund Sources</div><div class="card-value gold">${emergencySources}</div><div class="card-meta">Assets flagged for emergency use</div></div>`;

    const ndicAlerts = _assets.filter(a => {
      const cur = WPUtils.getEntryCurrency(a.notes);
      const balBase = WPUtils.convert(a.close_balance||a.open_balance||0, cur, 'NGN');
      const check = WPUtils.checkNDIC(balBase, a.institution_type||'dmb');
      return check.alert;
    });
    const ndicEl = document.getElementById('assets-ndic-alert');
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

    _renderAssetsTable(totalAssets, pageCurrency);
  }

  async function _renderMtm() {
    const list = _tickerHoldings();
    const el = document.getElementById('assets-mtm-list');
    const totalEl = document.getElementById('assets-mtm-total');
    if (!el) return;

    const pageCurrency = localStorage.getItem('wp_page_currency_assets') || WPApp.state.profile?.currency || 'NGN';

    if (!list.length) {
      el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--clr-text-3)">No ticker holdings yet. Add an equity with a ticker so the portfolio can auto-update.</td></tr>`;
      if (totalEl) totalEl.innerHTML = '';
      return;
    }

    _paintMtmTable(list, pageCurrency, 'Refreshing live prices…');

    const tickers = [...new Set(list.map(h => h.tags.ticker))];
    const next = { ..._fetchedPrices };
    await Promise.all(tickers.map(async (ticker) => {
      const price = await WPUtils.fetchMarketPrice(ticker);
      if (price != null) next[ticker] = price;
    }));
    _fetchedPrices = next;

    // Persist MTM close balances when we have live (or estimate) prices
    await _syncMtmCloseBalances(list);

    const liveCount = tickers.filter(t => _fetchedPrices[t] != null).length;
    _paintMtmTable(
      list,
      pageCurrency,
      liveCount
        ? `${liveCount}/${tickers.length} live quotes · values reflected in Total Assets`
        : 'Live quotes unavailable — showing estimates · values still included in totals'
    );
    _render(); // refresh KPIs / all-assets table with updated close balances
  }

  async function _syncMtmCloseBalances(list) {
    for (const { asset, tags } of list) {
      const sym = tags.ticker;
      const buyMajor = WPUtils.koboToNaira(tags.unitCostKobo);
      const pxMajor = _priceFor(sym, buyMajor);
      // Yahoo / mock prices are in the instrument's quote currency; we treat
      // them as major units of the asset's stored currency (USD for migrated US stocks).
      const mtmKobo = Math.round(tags.qty * WPUtils.nairaToKobo(pxMajor));
      if (mtmKobo > 0 && mtmKobo !== (asset.close_balance || 0)) {
        try {
          await WPDb.update('assets', asset.id, { close_balance: mtmKobo });
          asset.close_balance = mtmKobo;
        } catch {
          /* offline / RLS — keep UI estimate only */
        }
      }
    }
  }

  function _paintMtmTable(list, pageCurrency, statusNote = '') {
    const el = document.getElementById('assets-mtm-list');
    const totalEl = document.getElementById('assets-mtm-total');
    if (!el) return;

    let totalCostPage = 0;
    let totalValuePage = 0;
    let liveCount = 0;

    el.innerHTML = list.map(({ asset, tags }) => {
      const cur = WPUtils.getEntryCurrency(asset.notes);
      const sym = tags.ticker;
      const buyMajor = WPUtils.koboToNaira(tags.unitCostKobo);
      const isLive = _fetchedPrices[sym] != null;
      if (isLive) liveCount++;
      const currentPrice = _priceFor(sym, buyMajor);
      const costKobo = Math.round(tags.qty * tags.unitCostKobo);
      const valueKobo = Math.round(tags.qty * WPUtils.nairaToKobo(currentPrice));
      const costPage = WPUtils.convert(costKobo, cur, pageCurrency);
      const valuePage = WPUtils.convert(valueKobo, cur, pageCurrency);
      const buyPage = WPUtils.convert(tags.unitCostKobo, cur, pageCurrency);
      const pxPage = WPUtils.convert(WPUtils.nairaToKobo(currentPrice), cur, pageCurrency);
      totalCostPage += costPage;
      totalValuePage += valuePage;
      const gain = valuePage - costPage;
      const rowPct = (gain / Math.max(1, costPage)) * 100;
      const rowGain = gain >= 0;

      return `<tr class="mtm-row" data-asset-id="${asset.id}" style="cursor:pointer" title="Click to edit">
        <td>
          <strong>${sym}</strong>
          ${isLive ? ' <span class="badge badge-accent" style="font-size:0.65rem">LIVE</span>' : ' <span class="badge badge-neutral" style="font-size:0.65rem">EST</span>'}
          ${asset.asset_name && asset.asset_name.toUpperCase() !== sym ? `<br><span class="text-xs text-muted">${asset.asset_name}</span>` : ''}
        </td>
        <td class="td-mono">${tags.qty}</td>
        <td class="td-mono">${WPUtils.fmt(buyPage, { currency: pageCurrency })}</td>
        <td class="td-mono text-accent">${WPUtils.fmt(pxPage, { currency: pageCurrency })}</td>
        <td class="td-mono">${WPUtils.fmt(costPage, { currency: pageCurrency })}</td>
        <td class="td-mono fw-600">${WPUtils.fmt(valuePage, { currency: pageCurrency })}</td>
        <td class="td-mono fw-600 ${rowGain ? 'text-accent' : 'text-danger'}">
          ${WPUtils.fmt(gain, { signed: true, currency: pageCurrency })} (${rowGain ? '+' : ''}${rowPct.toFixed(2)}%)
        </td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button type="button" class="btn btn-ghost btn-sm" onclick="WPAssets._editAsset('${asset.id}')">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm text-danger" onclick="WPAssets._deleteAsset('${asset.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('') + `
      <tr style="border-top:2px solid var(--clr-border-2);background:var(--clr-surface-2)">
        <td colspan="4" class="fw-700">Portfolio total (${list.length} position${list.length === 1 ? '' : 's'})</td>
        <td class="td-mono fw-700">${WPUtils.fmt(totalCostPage, { currency: pageCurrency })}</td>
        <td class="td-mono fw-700 text-accent">${WPUtils.fmt(totalValuePage, { currency: pageCurrency })}</td>
        <td class="td-mono fw-700 ${(totalValuePage - totalCostPage) >= 0 ? 'text-accent' : 'text-danger'}">
          ${WPUtils.fmt(totalValuePage - totalCostPage, { signed: true, currency: pageCurrency })}
        </td>
        <td></td>
      </tr>`;

    if (totalEl) {
      totalEl.innerHTML = `
        <div class="card" style="margin-top:0.75rem;padding:1rem 1.25rem;display:flex;flex-wrap:wrap;gap:1.25rem;align-items:center;justify-content:space-between">
          <div>
            <div class="card-title" style="margin:0">Total equity holdings (mark-to-market)</div>
            <div class="text-xs text-muted" style="margin-top:0.25rem">${statusNote || (liveCount ? `${liveCount}/${list.length} live quotes` : 'Using estimated prices')} · Click a row to edit</div>
          </div>
          <div class="card-value income" style="font-size:1.4rem">${WPUtils.fmt(totalValuePage, { currency: pageCurrency })}</div>
        </div>`;
    }

    el.querySelectorAll('tr.mtm-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.assetId;
        if (id) _editAsset(id);
      });
    });
  }

  function _renderAssetsTable(total, pageCurrency) {
    const wrap = document.getElementById('assets-page-table');
    if (!_assets.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No assets recorded. Click "Add Asset" to begin.</div>';
      return;
    }
    const typeIcon = { savings:'&#x1F3E6;', fixed_deposit:'&#x1F512;', equity:'&#x1F4C8;', property:'&#x1F3E0;', vehicle:'&#x1F697;', retirement_contribution:'🌴', not_applicable:'&#x1F4BC;', other:'&#x1F4B0;' };
    wrap.innerHTML = `<table>
      <thead><tr><th>Asset</th><th>Type</th><th>Institution</th><th>Opening</th><th>Closing</th><th>Rate</th><th>% of Total</th><th></th></tr></thead>
      <tbody>${_assets.map(a => {
        const bal = a.close_balance || a.open_balance || 0;
        const cur = WPUtils.getEntryCurrency(a.notes);
        const balPage = WPUtils.convert(bal, cur, pageCurrency);
        const openBalPage = WPUtils.convert(a.open_balance||0, cur, pageCurrency);
        const isEFSource = a.notes && a.notes.includes('[Emergency Fund]');
        const tags = WPUtils.parseNotesTags(a.notes);

        let subTypeLabel = '';
        if (a.asset_type === 'retirement_contribution' && tags.sub) {
          subTypeLabel = tags.sub === 'rsa' ? ' (RSA)' : tags.sub === 'avc' ? ' (AVC)' : ' (Gratuity)';
        }

        let stockInfo = '';
        if (tags.ticker || tags.qty > 0) {
          const unitCostPage = WPUtils.convert(tags.unitCostKobo, cur, pageCurrency);
          const basisPage = WPUtils.convert(Math.round(tags.qty * tags.unitCostKobo), cur, pageCurrency);
          const tickerBit = tags.ticker ? `<span class="badge badge-accent" style="margin-right:4px">${tags.ticker}</span>` : '';
          stockInfo = `<br>${tickerBit}<span class="text-xs text-accent">Qty: ${tags.qty || '—'} | Avg Cost: ${WPUtils.fmt(unitCostPage, { currency: pageCurrency })} | Basis: ${WPUtils.fmt(basisPage, { currency: pageCurrency })}</span>`;
        }

        const cleanNotes = WPUtils.cleanNotesDisplay(a.notes);

        return `<tr>
          <td><strong>${typeIcon[a.asset_type]||'&#x1F4B0;'} ${a.asset_name}</strong>
            ${isEFSource?'<span class="badge badge-gold" style="margin-left:4px">EF Source</span>':''}
            ${stockInfo}
            ${cleanNotes?`<br><span class="text-xs text-muted">${cleanNotes}</span>`:''}
          </td>
          <td><span class="badge badge-neutral">${(a.asset_type||'').replace('_',' ')}${subTypeLabel}</span></td>
          <td class="text-muted text-sm">${a.institution_name||'—'}</td>
          <td class="td-mono">${WPUtils.fmt(openBalPage, { currency: pageCurrency })}</td>
          <td class="td-mono fw-600">${WPUtils.fmt(balPage, { currency: pageCurrency })}</td>
          <td class="td-mono text-accent">${a.interest_rate?a.interest_rate+'%':'—'}</td>
          <td>
            <div class="flex items-center gap-4">
              <div class="progress-bar" style="height:6px;width:60px">
                <div class="progress-fill" style="width:${Math.min(100,(balPage/Math.max(1,total)*100)).toFixed(0)}%"></div>
              </div>
              <span class="text-xs text-muted">${(balPage/Math.max(1,total)*100).toFixed(1)}%</span>
            </div>
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPAssets._editAsset('${a.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPAssets._deleteAsset('${a.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _openAssetForm(existing = null) {
    const e = existing || {};
    const currencyCode = WPUtils.getEntryCurrency(e.notes) || (e._preferTicker ? 'USD' : (WPApp.state.profile?.currency || 'NGN'));
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';
    const tags = WPUtils.parseNotesTags(e.notes);
    const preferTicker = !!(e._preferTicker || tags.ticker || (e.asset_type === 'equity' && tags.qty > 0));
    const modeTicker = preferTicker;

    const body = `
      <form id="asset-form">
        <div class="form-row">
          <div class="form-group">
            <label for="af-currency">Currency</label>
            <select class="select" id="af-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="af-name">Asset Name</label>
            <input class="input" id="af-name" value="${e.asset_name||''}" placeholder="e.g. GTBank Savings, AAPL shares" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="af-type">Asset Type</label>
            <select class="select" id="af-type">
              <option value="alternative"   ${e.asset_type==='alternative'  ?'selected':''}>Alternative Investments</option>
              <option value="commodities"   ${e.asset_type==='commodities'  ?'selected':''}>Commodities</option>
              <option value="crypto"        ${e.asset_type==='crypto'       ?'selected':''}>Crypto</option>
              <option value="currency"      ${e.asset_type==='currency'     ?'selected':''}>Currency</option>
              <option value="equity"        ${e.asset_type==='equity'||!e.asset_type&&e._preferTicker?'selected':''}>Equities / Stocks / ETFs</option>
              <option value="fixed_deposit" ${e.asset_type==='fixed_deposit'?'selected':''}>Fixed Deposit / T-Bill</option>
              <option value="forex"         ${e.asset_type==='forex'        ?'selected':''}>Forex</option>
              <option value="not_applicable" ${e.asset_type==='not_applicable'?'selected':''}>Not Applicable</option>
              <option value="retirement_contribution" ${e.asset_type==='retirement_contribution'?'selected':''}>Retirement Contribution</option>
              <option value="property"      ${e.asset_type==='property'     ?'selected':''}>Property / Real Estate</option>
              <option value="savings"       ${e.asset_type==='savings'      ?'selected':''}>Savings Account</option>
              <option value="vehicle"       ${e.asset_type==='vehicle'      ?'selected':''}>Vehicle</option>
              <option value="other"         ${e.asset_type==='other'        ?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="af-inst-type">Institution Type</label>
            <select class="select" id="af-inst-type">
              <option value=""           ${!e.institution_type              ?'selected':''}>Not Applicable</option>
              <option value="dmb"        ${e.institution_type==='dmb'       ?'selected':''}>DMB (Commercial Bank)</option>
              <option value="mfb"        ${e.institution_type==='mfb'       ?'selected':''}>Microfinance / Neobank</option>
              <option value="investment" ${e.institution_type==='investment'||e._preferTicker?'selected':''}>Investment / Brokerage</option>
              <option value="mmo"        ${e.institution_type==='mmo'       ?'selected':''}>Mobile Money (PSB)</option>
              <option value="other"      ${e.institution_type==='other'     ?'selected':''}>Other</option>
            </select>
          </div>
        </div>

        <div id="af-retirement-sub-container" class="form-group" style="display:${e.asset_type==='retirement_contribution'?'block':'none'}; margin-top:0.75rem">
          <label for="af-retirement-sub">Retirement Sub-type</label>
          <select class="select" id="af-retirement-sub">
            <option value="rsa" ${e.notes && e.notes.includes('[sub:rsa]')?'selected':''}>RSA (Regular Pension)</option>
            <option value="avc" ${e.notes && e.notes.includes('[sub:avc]')?'selected':''}>AVC (Additional Voluntary Contribution)</option>
            <option value="gratuity" ${e.notes && e.notes.includes('[sub:gratuity]')?'selected':''}>Gratuity</option>
          </select>
        </div>

        <div class="form-group" style="margin-top:0.75rem">
          <label for="af-inst">Institution / Bank Name</label>
          <input class="input" id="af-inst" value="${e.institution_name||''}" placeholder="e.g. Zenith Bank, Stanbic IBTC">
        </div>

        <!-- Valuation mode: Manual vs Ticker (#47) -->
        <div id="af-valuation-mode" class="card" style="padding:1rem;margin:1rem 0;background:var(--clr-surface-2);border:1px solid var(--clr-border)">
          <div class="text-sm fw-700" style="margin-bottom:0.5rem">Valuation method</div>
          <div style="display:flex;flex-direction:column;gap:0.6rem">
            <label style="display:flex;gap:0.6rem;align-items:flex-start;cursor:pointer">
              <input type="radio" name="af-val-mode" id="af-mode-manual" value="manual" ${modeTicker ? '' : 'checked'} style="margin-top:0.25rem">
              <span>
                <strong>Manual value</strong>
                <span class="text-xs text-muted" style="display:block">You enter opening/closing balances yourself (property, vehicles, private assets).</span>
              </span>
            </label>
            <label style="display:flex;gap:0.6rem;align-items:flex-start;cursor:pointer">
              <input type="radio" name="af-val-mode" id="af-mode-ticker" value="ticker" ${modeTicker ? 'checked' : ''} style="margin-top:0.25rem">
              <span>
                <strong>Ticker (mark-to-market)</strong>
                <span class="text-xs text-muted" style="display:block">
                  Enter a stock/bond/ETF symbol. The portfolio can <strong>auto-update</strong> market value from live prices.
                  Best for listed equities (e.g. AAPL, TSLA, DANGCEM.LG).
                </span>
              </span>
            </label>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-income" ${e.is_income_generating || e._preferTicker || tags.ticker ?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Income-generating/financial asset (rental, dividends, stocks)</span>
          </div>
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-ef-source" ${e.notes && e.notes.includes('[Emergency Fund]') ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Use as an Emergency Fund source</span>
          </div>
        </div>

        <div id="af-ticker-details" style="display:none; border: 1px solid var(--clr-border); border-radius: var(--radius-md); padding: var(--sp-4); margin-bottom: 1rem;">
          <div class="form-group">
            <label for="af-ticker">Ticker symbol</label>
            <input class="input" id="af-ticker" value="${tags.ticker || ''}" placeholder="e.g. AAPL, TSLA, MTNN.LG" autocomplete="off" style="text-transform:uppercase">
            <span class="text-xs text-muted" style="display:block;margin-top:0.35rem">With a ticker, closing value refreshes from market data so your balance sheet stays current.</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="af-qty">Quantity</label>
              <input class="input" type="number" step="any" id="af-qty" placeholder="e.g. 10" value="${tags.qty || ''}">
            </div>
            <div class="form-group">
              <label for="af-unit-cost">Cost per Unit (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="af-unit-cost" placeholder="0" value="${tags.unitCostKobo ? WPUtils.koboToNaira(tags.unitCostKobo).toFixed(2) : ''}">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Cost basis (opening): <span id="af-total-basis-label" style="font-weight:700;color:var(--clr-text-1)">${symbol}0</span></label>
          </div>
        </div>

        <div id="af-manual-balances">
          <div class="form-row">
            <div class="form-group">
              <label for="af-open">Opening Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="af-open" value="${e.open_balance!=null?WPUtils.koboToNaira(e.open_balance):''}" placeholder="0" required>
              </div>
            </div>
            <div class="form-group">
              <label for="af-date">Date Entered</label>
              <input class="input" type="date" id="af-date" value="${e.period_month || WPUtils.currentPeriod()}" required>
            </div>
          </div>
        </div>

        <div class="form-row" id="af-date-ticker-row" style="display:none">
          <div class="form-group" style="flex:1">
            <label for="af-date-ticker">Date Entered / Purchased</label>
            <input class="input" type="date" id="af-date-ticker" value="${e.period_month || WPUtils.currentPeriod()}">
          </div>
        </div>

        <div class="form-row" id="yield-details-row" style="display: ${e.is_income_generating && !modeTicker ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
          <div class="form-group">
            <label for="af-rate">Interest Rate (% p.a. / APY)</label>
            <input class="input" type="number" id="af-rate" min="0" max="30" step="0.1" value="${e.interest_rate||''}" placeholder="e.g. 8.5">
          </div>
          <div class="form-group">
            <label for="af-income-amt">Expected Annual Income (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="af-income-amt" placeholder="0">
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label for="af-tenor">Tenor (months)</label>
            <input class="input" type="number" id="af-tenor" min="0" value="${e.tenor_months||''}" placeholder="e.g. 12">
          </div>
        </div>
      </form>`;

    WPModal.open(existing && existing.id ? 'Edit Asset' : 'Add Asset', body, {
      confirmLabel: existing && existing.id ? 'Update' : 'Add Asset',
      onConfirm: async () => { await _saveAsset(e.id); },
    });

    const openInput = document.getElementById('af-open');
    const rateInput = document.getElementById('af-rate');
    const incomeInput = document.getElementById('af-income-amt');
    const incomeToggle = document.getElementById('af-income');
    const yieldRow = document.getElementById('yield-details-row');
    const currencySelect = document.getElementById('af-currency');
    const assetTypeSelect = document.getElementById('af-type');
    const subContainer = document.getElementById('af-retirement-sub-container');
    const tickerDetails = document.getElementById('af-ticker-details');
    const manualBalances = document.getElementById('af-manual-balances');
    const dateTickerRow = document.getElementById('af-date-ticker-row');
    const modeManual = document.getElementById('af-mode-manual');
    const modeTickerEl = document.getElementById('af-mode-ticker');
    const qtyInput = document.getElementById('af-qty');
    const unitCostInput = document.getElementById('af-unit-cost');
    const tickerInput = document.getElementById('af-ticker');
    const totalBasisLabel = document.getElementById('af-total-basis-label');
    const nameInput = document.getElementById('af-name');

    WPUtils.maskNumberInput(openInput);
    WPUtils.maskNumberInput(incomeInput);
    WPUtils.maskNumberInput(unitCostInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelectorAll('#asset-form .input-prefix').forEach(span => span.textContent = newSym);
      const openLab = document.querySelector('label[for="af-open"]');
      if (openLab) openLab.textContent = `Opening Balance (${newSym})`;
      const unitLab = document.querySelector('label[for="af-unit-cost"]');
      if (unitLab) unitLab.textContent = `Cost per Unit (${newSym})`;
      updateCostBasis();
    });

    if (assetTypeSelect && subContainer) {
      assetTypeSelect.addEventListener('change', () => {
        subContainer.style.display = assetTypeSelect.value === 'retirement_contribution' ? 'block' : 'none';
        if (assetTypeSelect.value === 'equity') {
          incomeToggle.checked = true;
        }
        syncModeUi();
      });
    }

    const updateCostBasis = () => {
      const sym = symbols[currencySelect.value] || '₦';
      const qty = parseFloat(qtyInput.value) || 0;
      const unitCost = WPUtils.cleanNum(unitCostInput.value) || 0;
      const total = qty * unitCost;
      totalBasisLabel.textContent = `${sym}${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (total > 0 && openInput) {
        openInput.value = total.toFixed(2);
      }
    };

    const syncModeUi = () => {
      const useTicker = modeTickerEl.checked;
      tickerDetails.style.display = useTicker ? 'block' : 'none';
      manualBalances.style.display = useTicker ? 'none' : 'block';
      dateTickerRow.style.display = useTicker ? 'block' : 'none';
      if (useTicker) {
        incomeToggle.checked = true;
        if (assetTypeSelect.value !== 'equity' && assetTypeSelect.value !== 'crypto' && assetTypeSelect.value !== 'commodities') {
          assetTypeSelect.value = 'equity';
        }
        updateCostBasis();
        // Prefill name from ticker when empty
        if (tickerInput.value && (!nameInput.value || nameInput.value === tags.ticker)) {
          nameInput.value = tickerInput.value.trim().toUpperCase();
        }
      }
      yieldRow.style.display = (!useTicker && incomeToggle.checked) ? 'grid' : 'none';
    };

    modeManual.addEventListener('change', syncModeUi);
    modeTickerEl.addEventListener('change', syncModeUi);
    qtyInput.addEventListener('input', updateCostBasis);
    unitCostInput.addEventListener('input', updateCostBasis);
    tickerInput.addEventListener('input', () => {
      const t = tickerInput.value.trim().toUpperCase();
      tickerInput.value = t;
      if (t && (!nameInput.value || nameInput.dataset.auto === '1' || nameInput.value === tags.ticker)) {
        nameInput.value = t;
        nameInput.dataset.auto = '1';
      }
    });
    nameInput.addEventListener('input', () => { nameInput.dataset.auto = '0'; });

    incomeToggle.addEventListener('change', () => {
      if (!incomeToggle.checked && modeTickerEl.checked) {
        modeManual.checked = true;
        modeTickerEl.checked = false;
      }
      syncModeUi();
      if (!incomeToggle.checked) {
        rateInput.value = '';
        incomeInput.value = '';
      }
    });

    updateCostBasis();
    syncModeUi();
  }

  async function _saveAsset(existingId) {
    const useTicker = document.getElementById('af-mode-ticker')?.checked;
    const dateEl = useTicker
      ? document.getElementById('af-date-ticker')
      : document.getElementById('af-date');
    const dateVal = (dateEl && dateEl.value) || PERIOD;
    const periodMonth = dateVal.substring(0, 7) + '-01';

    const isEFSource = document.getElementById('af-ef-source').checked;
    const currency = document.getElementById('af-currency').value;
    const typeVal = document.getElementById('af-type').value;
    const isFinancial = document.getElementById('af-income').checked || useTicker;

    const ticker = (document.getElementById('af-ticker')?.value || '').trim().toUpperCase();
    const qtyVal = parseFloat(document.getElementById('af-qty')?.value) || 0;
    const unitCostNaira = WPUtils.cleanNum(document.getElementById('af-unit-cost')?.value) || 0;
    const unitCostKobo = WPUtils.nairaToKobo(unitCostNaira);

    if (useTicker) {
      if (!ticker || qtyVal <= 0 || unitCostNaira <= 0) {
        WPToast.warning('Ticker mode needs a symbol, quantity, and cost per unit.');
        return false;
      }
    }

    let rawOpen;
    if (useTicker) {
      rawOpen = Math.round(qtyVal * unitCostKobo);
    } else {
      rawOpen = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('af-open').value));
    }

    // Optional: seed close_balance with live quote when ticker is set
    let rawClose = rawOpen;
    if (useTicker && ticker) {
      let px = _fetchedPrices[ticker];
      if (px == null) px = await WPUtils.fetchMarketPrice(ticker);
      if (px == null) px = WPUtils.estimateMarketPrice(ticker, unitCostNaira);
      else _fetchedPrices[ticker] = px;
      rawClose = Math.round(qtyVal * WPUtils.nairaToKobo(px));
    }

    let finalNotes = isEFSource ? '[Emergency Fund]' : '';
    if (typeVal === 'retirement_contribution') {
      const subVal = document.getElementById('af-retirement-sub').value;
      finalNotes += ` [sub:${subVal}]`;
    }
    if (useTicker && ticker) {
      finalNotes += ` [ticker:${ticker}] [qty:${qtyVal}] [unit_cost:${unitCostKobo}]`;
    } else if (isFinancial && qtyVal > 0 && unitCostKobo > 0) {
      finalNotes += ` [qty:${qtyVal}] [unit_cost:${unitCostKobo}]`;
    }
    finalNotes = WPUtils.setEntryCurrency(finalNotes.trim(), currency);

    let assetName = document.getElementById('af-name').value.trim();
    if (!assetName && ticker) assetName = ticker;
    if (!assetName) { WPToast.warning('Please enter an asset name.'); return false; }

    const row = {
      user_id:              WPApp.state.user.id,
      asset_name:           assetName,
      asset_type:           typeVal,
      institution_type:     document.getElementById('af-inst-type').value || null,
      institution_name:     document.getElementById('af-inst').value.trim(),
      open_balance:         rawOpen,
      close_balance:        rawClose,
      interest_rate:        parseFloat(document.getElementById('af-rate').value)||0,
      tenor_months:         parseInt(document.getElementById('af-tenor').value)||null,
      is_income_generating: isFinancial,
      notes:                finalNotes,
      period_month:         periodMonth,
    };

    try {
      if (existingId) await WPDb.update('assets', existingId, row);
      else            await WPDb.insert('assets', row);
      WPToast.success(existingId
        ? (useTicker ? `${ticker || assetName} updated (mark-to-market).` : 'Asset updated.')
        : (useTicker ? `${ticker} added — portfolio can auto-update.` : 'Asset added.'));
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); return false; }
  }

  async function _editAsset(id) {
    const a = _assets.find(x => x.id === id);
    if (a) _openAssetForm(a);
  }

  async function _deleteAsset(id) {
    WPModal.confirm('Delete Asset', 'Delete this asset?', async () => {
      try { await WPDb.remove('assets', id); WPToast.success('Asset deleted.'); await _load(); }
      catch (e) { WPToast.error('Could not delete.'); }
    });
  }

  /** Total MTM equity value in a target currency (kobo/minor units) — used by Retirement planner. */
  function mtmEquityValueKobo(targetCurrency) {
    const list = _tickerHoldings();
    let total = 0;
    for (const { asset, tags } of list) {
      const cur = WPUtils.getEntryCurrency(asset.notes);
      const buyMajor = WPUtils.koboToNaira(tags.unitCostKobo);
      const px = _priceFor(tags.ticker, buyMajor);
      const valueKobo = Math.round(tags.qty * WPUtils.nairaToKobo(px));
      total += WPUtils.convert(valueKobo, cur, targetCurrency);
    }
    return total;
  }

  function destroy() {}

  return { init, destroy, _editAsset, _deleteAsset, mtmEquityValueKobo };
})();
