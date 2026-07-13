// ============================================================
// OlaFinancial — Assets Page
// ============================================================

const WPAssets = (() => {
  let _assets = [];
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
        <!-- Insights Strip -->
        <div id="assets-insights" style="display:none"></div>
        <!-- Sponsor Slot: Insurance -->
        <div id="assets-sponsor-insurance"></div>
        <!-- KPIs -->
        <div class="kpi-grid" id="assets-kpis" style="margin-bottom:1.5rem"></div>
        <!-- NDIC Alert -->
        <div id="assets-ndic-alert" style="display:none"></div>
        <!-- Assets Table Card -->
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

    const curSelect = document.getElementById('assets-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_assets') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_assets', e.target.value);
        _render();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;
      _assets = await WPDb.getAssetsByPeriod(uid, PERIOD);
      _render();

      // Evaluate Insights specific to assets/balance-sheet
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const totalAssets = _assets.reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const liquidTypes = ['savings','cash','current_account'];
      const liquidTotal = _assets.filter(a => liquidTypes.includes((a.asset_type||'').toLowerCase()))
        .reduce((s,a) => s + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur), 0);
      const categoryCounts = {};
      _assets.forEach(a => { categoryCounts[a.asset_type||'other'] = (categoryCounts[a.asset_type||'other']||0) + WPUtils.convert(a.close_balance||a.open_balance||0, WPUtils.getEntryCurrency(a.notes), baseCur); });
      const topCatVal = Math.max(0, ...Object.values(categoryCounts));
      
      WPInsights.evaluate('balance-sheet', {
        netWorthKobo:        totalAssets, // Simplified context
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

    document.getElementById('assets-page-total').textContent = WPUtils.fmt(totalAssets, {compact:true, currency: pageCurrency});

    document.getElementById('assets-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Assets</div><div class="card-value accent">${WPUtils.fmt(totalAssets,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_assets.length} asset${_assets.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Income-Generating Assets</div><div class="card-value accent">${WPUtils.fmt(incomeGenerating,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_assets.filter(a => a.is_income_generating).length} assets</div></div>
      <div class="card"><div class="card-title">Emergency Fund Sources</div><div class="card-value gold">${emergencySources}</div><div class="card-meta">Assets flagged for emergency use</div></div>`;

    // NDIC alerts
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
        
        let subTypeLabel = '';
        if (a.asset_type === 'retirement_contribution' && a.notes) {
          const match = a.notes.match(/\[sub:([^\]]+)\]/);
          if (match) {
            const sub = match[1];
            subTypeLabel = sub === 'rsa' ? ' (RSA)' : sub === 'avc' ? ' (AVC)' : ' (Gratuity)';
          }
        }

        let parsedQty = 0;
        let parsedUnitCost = 0;
        if (a.notes && typeof a.notes === 'string') {
          const qtyMatch = a.notes.match(/\[qty:([^\]]+)\]/);
          const costMatch = a.notes.match(/\[unit_cost:([^\]]+)\]/);
          if (qtyMatch) parsedQty = parseFloat(qtyMatch[1]);
          if (costMatch) parsedUnitCost = parseInt(costMatch[1]);
        }

        let stockInfo = '';
        if (a.is_income_generating && parsedQty > 0) {
          const unitCostPage = WPUtils.convert(parsedUnitCost, cur, pageCurrency);
          const basisPage = WPUtils.convert(parsedQty * parsedUnitCost, cur, pageCurrency);
          stockInfo = `<br><span class="text-xs text-accent">Qty: ${parsedQty} | Avg Cost: ${WPUtils.fmt(unitCostPage, { currency: pageCurrency })} | Basis: ${WPUtils.fmt(basisPage, { currency: pageCurrency })}</span>`;
        }

        const cleanNotes = (a.notes || '')
          .replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '')
          .replace(/\[Emergency Fund\]/g, '')
          .replace(/\[sub:[^\]]+\]/g, '')
          .replace(/\[qty:[^\]]+\]/g, '')
          .replace(/\[unit_cost:[^\]]+\]/g, '')
          .trim();

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
    const currencyCode = WPUtils.getEntryCurrency(e.notes);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

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
            <input class="input" id="af-name" value="${e.asset_name||''}" placeholder="e.g. GTBank Savings, Lagos Property" required>
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
              <option value="equity"        ${e.asset_type==='equity'       ?'selected':''}>Equities / Stocks / ETFs</option>
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
              <option value="investment" ${e.institution_type==='investment'?'selected':''}>Investment / Brokerage</option>
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
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; margin-top:1rem">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-income" ${e.is_income_generating?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Income-generating/financial asset (rental, dividends, stocks)</span>
          </div>
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-ef-source" ${e.notes && e.notes.includes('[Emergency Fund]') ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Use as an Emergency Fund source</span>
          </div>
        </div>
        
        <div id="af-financial-details" style="display: none; border: 1px solid var(--clr-border); border-radius: var(--radius-md); padding: var(--sp-4); margin-bottom: 1rem;">
          <div class="form-row">
            <div class="form-group">
              <label for="af-qty">Quantity</label>
              <input class="input" type="number" step="any" id="af-qty" placeholder="e.g. 10">
            </div>
            <div class="form-group">
              <label for="af-unit-cost">Cost per Unit (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="af-unit-cost" placeholder="0">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Auto-Calculated Total Cost Basis: <span id="af-total-basis-label" style="font-weight:700;color:var(--clr-text-1)">${symbol}0</span></label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="af-open">Opening Balance (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="af-open" value="${e.open_balance?WPUtils.koboToNaira(e.open_balance):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="af-date">Date Entered</label>
            <input class="input" type="date" id="af-date" value="${e.period_month || WPUtils.currentPeriod()}" required>
          </div>
        </div>

        <div class="form-row" id="yield-details-row" style="display: ${e.is_income_generating ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
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

    WPModal.open(existing ? 'Edit Asset' : 'Add Asset', body, {
      confirmLabel: existing ? 'Update' : 'Add Asset',
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

    WPUtils.maskNumberInput(openInput);
    WPUtils.maskNumberInput(incomeInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelectorAll('#asset-form .input-prefix').forEach(span => span.textContent = newSym);
      document.querySelector('label[for="af-open"]').textContent = `Opening Balance (${newSym})`;
    });

    if (assetTypeSelect && subContainer) {
      assetTypeSelect.addEventListener('change', () => {
        subContainer.style.display = assetTypeSelect.value === 'retirement_contribution' ? 'block' : 'none';
      });
    }

    const financialDetails = document.getElementById('af-financial-details');
    const qtyInput = document.getElementById('af-qty');
    const unitCostInput = document.getElementById('af-unit-cost');
    const totalBasisLabel = document.getElementById('af-total-basis-label');

    WPUtils.maskNumberInput(unitCostInput);

    let parsedQty = '';
    let parsedUnitCost = '';
    if (e.notes && typeof e.notes === 'string') {
      const qtyMatch = e.notes.match(/\[qty:([^\]]+)\]/);
      const costMatch = e.notes.match(/\[unit_cost:([^\]]+)\]/);
      if (qtyMatch) parsedQty = qtyMatch[1];
      if (costMatch) parsedUnitCost = costMatch[1];
    }
    if (parsedQty) qtyInput.value = parsedQty;
    if (parsedUnitCost) unitCostInput.value = WPUtils.koboToNaira(parseInt(parsedUnitCost)).toFixed(0);

    const updateFinancialDetailsVisibility = () => {
      const isChecked = incomeToggle.checked;
      financialDetails.style.display = isChecked ? 'block' : 'none';
      if (isChecked) updateCostBasis();
    };

    const updateCostBasis = () => {
      const sym = symbols[currencySelect.value] || '₦';
      const qty = parseFloat(qtyInput.value) || 0;
      const unitCost = WPUtils.cleanNum(unitCostInput.value) || 0;
      const total = qty * unitCost;

      totalBasisLabel.textContent = `${sym}${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (total > 0) {
        openInput.value = total.toFixed(0);
      }
    };

    qtyInput.addEventListener('input', updateCostBasis);
    unitCostInput.addEventListener('input', updateCostBasis);

    incomeToggle.addEventListener('change', () => {
      const isChecked = incomeToggle.checked;
      yieldRow.style.display = isChecked ? 'grid' : 'none';
      updateFinancialDetailsVisibility();
      if (!isChecked) {
        rateInput.value = '';
        incomeInput.value = '';
        qtyInput.value = '';
        unitCostInput.value = '';
      }
    });

    updateFinancialDetailsVisibility();
  }

  async function _saveAsset(existingId) {
    const dateVal = document.getElementById('af-date').value || PERIOD;
    const periodMonth = dateVal.substring(0, 7) + '-01';
    const rawOpen = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('af-open').value));

    const isEFSource = document.getElementById('af-ef-source').checked;
    const currency = document.getElementById('af-currency').value;
    const typeVal = document.getElementById('af-type').value;

    const isFinancial = document.getElementById('af-income').checked;
    const qtyVal = parseFloat(document.getElementById('af-qty').value) || 0;
    const unitCostNaira = WPUtils.cleanNum(document.getElementById('af-unit-cost').value) || 0;
    const unitCostKobo = WPUtils.nairaToKobo(unitCostNaira);

    let finalNotes = isEFSource ? '[Emergency Fund]' : '';
    if (typeVal === 'retirement_contribution') {
      const subVal = document.getElementById('af-retirement-sub').value;
      finalNotes += ` [sub:${subVal}]`;
    }
    if (isFinancial && qtyVal > 0) {
      finalNotes += ` [qty:${qtyVal}] [unit_cost:${unitCostKobo}]`;
    }
    finalNotes = WPUtils.setEntryCurrency(finalNotes.trim(), currency);

    const row = {
      user_id:              WPApp.state.user.id,
      asset_name:           document.getElementById('af-name').value.trim(),
      asset_type:           typeVal,
      institution_type:     document.getElementById('af-inst-type').value || null,
      institution_name:     document.getElementById('af-inst').value.trim(),
      open_balance:         rawOpen,
      close_balance:        rawOpen,
      interest_rate:        parseFloat(document.getElementById('af-rate').value)||0,
      tenor_months:         parseInt(document.getElementById('af-tenor').value)||null,
      is_income_generating: isFinancial,
      notes:                finalNotes,
      period_month:         periodMonth,
    };
    if (!row.asset_name) { WPToast.warning('Please enter an asset name.'); return false; }
    try {
      if (existingId) await WPDb.update('assets', existingId, row);
      else            await WPDb.insert('assets', row);
      WPToast.success(existingId ? 'Asset updated.' : 'Asset added.');
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

  function destroy() {}

  return { init, destroy, _editAsset, _deleteAsset };
})();
