// ============================================================
// OlaFinancial — Balance Sheet Page
// ============================================================

const WPBalanceSheet = (() => {

  let _assets      = [];
  let _liabilities = [];
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Balance Sheet</h1>
          <p class="page-subtitle">Assets, liabilities, and net worth for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <div class="flex gap-4">
          <button class="btn btn-secondary" id="add-asset-btn">&#x2795; Add Asset</button>
          <button class="btn btn-primary"   id="add-liab-btn">&#x2795; Add Liability</button>
        </div>
      </div>
      <div class="page-body">
        <!-- Net Worth Banner -->
        <div class="card" id="nw-banner" style="background:linear-gradient(135deg,var(--clr-surface-3),var(--clr-surface-2));margin-bottom:1.5rem;text-align:center;padding:2.5rem">
          <div class="card-title">Net Worth</div>
          <div class="card-value" id="nw-value" style="font-size:3rem">—</div>
          <div class="card-meta" id="nw-meta"></div>
        </div>
        <!-- KPIs -->
        <div class="kpi-grid" id="bs-kpis" style="margin-bottom:1.5rem"></div>
        <!-- NDIC Alert -->
        <div id="ndic-alert" style="display:none"></div>
        <!-- Assets -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-header">
            <span class="section-title">Assets</span>
            <span class="badge badge-accent" id="assets-total">—</span>
          </div>
          <div class="table-wrap" id="assets-table"></div>
        </div>
        <!-- Liabilities -->
        <div class="card">
          <div class="section-header">
            <span class="section-title">Liabilities</span>
            <span class="badge badge-danger" id="liab-total">—</span>
          </div>
          <div class="table-wrap" id="liab-table"></div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    document.getElementById('add-asset-btn').addEventListener('click', () => _openAssetForm());
    document.getElementById('add-liab-btn').addEventListener('click',  () => _openLiabForm());
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
    } catch (err) { WPToast.error('Failed to load balance sheet.'); }
  }

  function _render() {
    const totalAssets = _assets.reduce((s,a) => s + (a.close_balance || a.open_balance || 0), 0);
    const totalLiab   = _liabilities.reduce((s,l) => s + (l.close_balance || l.open_balance || 0), 0);
    const netWorth    = totalAssets - totalLiab;
    const nwColor     = netWorth >= 0 ? 'accent' : 'danger';
    const dta         = WPUtils.debtToAssetRatio(totalLiab, totalAssets);
    const coverage    = WPUtils.coverageRatio(totalAssets, totalLiab);

    document.getElementById('nw-value').textContent = WPUtils.fmt(netWorth);
    document.getElementById('nw-value').className   = `card-value ${nwColor}`;
    document.getElementById('nw-meta').textContent  =
      `Assets ${WPUtils.fmt(totalAssets, {compact:true})} − Liabilities ${WPUtils.fmt(totalLiab, {compact:true})}`;

    document.getElementById('assets-total').textContent = WPUtils.fmt(totalAssets, {compact:true});
    document.getElementById('liab-total').textContent   = WPUtils.fmt(totalLiab, {compact:true});

    document.getElementById('bs-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Assets</div><div class="card-value accent">${WPUtils.fmt(totalAssets,{compact:true})}</div><div class="card-meta">${_assets.length} asset${_assets.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Total Liabilities</div><div class="card-value danger">${WPUtils.fmt(totalLiab,{compact:true})}</div><div class="card-meta">${_liabilities.length} liabilit${_liabilities.length!==1?'ies':'y'}</div></div>
      <div class="card"><div class="card-title">Debt-to-Asset Ratio</div><div class="card-value ${dta>50?'danger':'accent'}">${dta.toFixed(1)}%</div><div class="card-meta">Target: below 50%</div></div>
      <div class="card"><div class="card-title">Coverage Ratio</div><div class="card-value ${coverage<1?'danger':'accent'}">${isFinite(coverage)?coverage.toFixed(2)+'x':'∞'}</div><div class="card-meta">Assets / Liabilities</div></div>`;

    // NDIC alerts
    const ndicAlerts = _assets.filter(a => {
      const check = WPUtils.checkNDIC(a.close_balance||a.open_balance||0, a.institution_type||'dmb');
      return check.alert;
    });
    const ndicEl = document.getElementById('ndic-alert');
    if (ndicAlerts.length) {
      ndicEl.style.display = '';
      ndicEl.innerHTML = ndicAlerts.map(a => {
        const check = WPUtils.checkNDIC(a.close_balance||a.open_balance||0, a.institution_type||'dmb');
        return `<div class="alert alert-warning">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <span><strong>${a.asset_name}</strong>: Balance ${WPUtils.fmt(a.close_balance||a.open_balance||0)} exceeds NDIC coverage of ${WPUtils.fmt(check.limit)}. Consider spreading across multiple institutions.</span>
        </div>`;
      }).join('');
    } else {
      ndicEl.style.display = 'none';
    }

    _renderAssetsTable(totalAssets);
    _renderLiabTable(totalLiab);
  }

  function _renderAssetsTable(total) {
    const wrap = document.getElementById('assets-table');
    if (!_assets.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No assets recorded. Click "Add Asset" to begin.</div>';
      return;
    }
    const typeIcon = { savings:'&#x1F3E6;', fixed_deposit:'&#x1F512;', equity:'&#x1F4C8;', property:'&#x1F3E0;', vehicle:'&#x1F697;', pension:'&#x1F334;', other:'&#x1F4B0;' };
    wrap.innerHTML = `<table>
      <thead><tr><th>Asset</th><th>Type</th><th>Institution</th><th>Opening</th><th>Closing</th><th>Rate</th><th>% of Total</th><th></th></tr></thead>
      <tbody>${_assets.map(a => {
        const bal = a.close_balance || a.open_balance || 0;
        return `<tr>
          <td><strong>${typeIcon[a.asset_type]||'&#x1F4B0;'} ${a.asset_name}</strong>
            ${a.is_income_generating?'<span class="badge badge-gold" style="margin-left:4px">Income</span>':''}
          </td>
          <td><span class="badge badge-neutral">${(a.asset_type||'').replace('_',' ')}</span></td>
          <td class="text-muted text-sm">${a.institution_name||'—'}</td>
          <td class="td-mono">${WPUtils.fmt(a.open_balance||0)}</td>
          <td class="td-mono fw-600">${WPUtils.fmt(bal)}</td>
          <td class="td-mono text-accent">${a.interest_rate?a.interest_rate+'%':'—'}</td>
          <td>
            <div class="flex items-center gap-4">
              <div class="progress-bar" style="height:6px;width:60px">
                <div class="progress-fill" style="width:${Math.min(100,(bal/Math.max(1,total)*100)).toFixed(0)}%"></div>
              </div>
              <span class="text-xs text-muted">${(bal/Math.max(1,total)*100).toFixed(1)}%</span>
            </div>
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPBalanceSheet._editAsset('${a.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPBalanceSheet._deleteAsset('${a.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _renderLiabTable(total) {
    const wrap = document.getElementById('liab-table');
    if (!_liabilities.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No liabilities. Great — or click "Add Liability" to record one.</div>';
      return;
    }
    wrap.innerHTML = `<table>
      <thead><tr><th>Liability</th><th>Type</th><th>Lender</th><th>Opening</th><th>Closing</th><th>APR</th><th>Monthly Pmt</th><th></th></tr></thead>
      <tbody>${_liabilities.map(l => {
        const bal = l.close_balance || l.open_balance || 0;
        return `<tr>
          <td><strong>${l.liability_name}</strong></td>
          <td><span class="badge badge-danger">${(l.liability_type||'').replace('_',' ')}</span></td>
          <td class="text-muted text-sm">${l.lender_name||'—'}</td>
          <td class="td-mono">${WPUtils.fmt(l.open_balance||0)}</td>
          <td class="td-mono fw-600 text-danger">${WPUtils.fmt(bal)}</td>
          <td class="td-mono ${l.apr>25?'text-danger':'text-gold'}">${l.apr||0}%</td>
          <td class="td-mono">${WPUtils.fmt(l.monthly_payment||0)}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPBalanceSheet._editLiab('${l.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPBalanceSheet._deleteLiab('${l.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _openAssetForm(existing = null) {
    const e = existing || {};
    const currencyCode = WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="asset-form">
        <div class="form-group">
          <label for="af-name">Asset Name</label>
          <input class="input" id="af-name" value="${e.asset_name||''}" placeholder="e.g. GTBank Savings, Lagos Property" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="af-type">Asset Type</label>
            <select class="select" id="af-type">
              <option value="savings"       ${e.asset_type==='savings'      ?'selected':''}>Savings Account</option>
              <option value="fixed_deposit" ${e.asset_type==='fixed_deposit'?'selected':''}>Fixed Deposit / T-Bill</option>
              <option value="equity"        ${e.asset_type==='equity'       ?'selected':''}>Equities / Stocks / ETFs</option>
              <option value="crypto"        ${e.asset_type==='crypto'       ?'selected':''}>Crypto</option>
              <option value="forex"         ${e.asset_type==='forex'        ?'selected':''}>Forex</option>
              <option value="commodities"   ${e.asset_type==='commodities'  ?'selected':''}>Commodities</option>
              <option value="alternative"   ${e.asset_type==='alternative'  ?'selected':''}>Alternative Investments</option>
              <option value="currency"      ${e.asset_type==='currency'     ?'selected':''}>Currency</option>
              <option value="property"      ${e.asset_type==='property'     ?'selected':''}>Property / Real Estate</option>
              <option value="vehicle"       ${e.asset_type==='vehicle'      ?'selected':''}>Vehicle</option>
              <option value="pension"       ${e.asset_type==='pension'      ?'selected':''}>Pension / RSA</option>
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
        <div class="form-group">
          <label for="af-inst">Institution / Bank Name</label>
          <input class="input" id="af-inst" value="${e.institution_name||''}" placeholder="e.g. Zenith Bank, Stanbic IBTC">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="af-open">Opening Balance (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="text" inputmode="decimal" id="af-open" value="${e.open_balance?WPUtils.koboToNaira(e.open_balance):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="af-date">Date Entered</label>
            <input class="input" type="date" id="af-date" value="${e.period_month || WPUtils.currentPeriod()}" required>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-income" ${e.is_income_generating?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Income-generating asset (rental, dividends, interest)</span>
          </div>
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="af-ef-source" ${e.notes && e.notes.includes('[Emergency Fund]') ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Use as an Emergency Fund source</span>
          </div>
        </div>
        <div class="form-row" id="yield-details-row" style="display: ${e.is_income_generating ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
          <div class="form-group">
            <label for="af-rate">Interest Rate (% p.a.)</label>
            <input class="input" type="number" id="af-rate" min="0" step="0.1" value="${e.interest_rate||''}" placeholder="e.g. 8.5">
          </div>
          <div class="form-group">
            <label for="af-income-amt">Expected Annual Income</label>
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

    WPUtils.maskNumberInput(openInput);
    WPUtils.maskNumberInput(incomeInput);

    if (e.is_income_generating && e.interest_rate && e.open_balance) {
      const annualIncome = (e.interest_rate / 100) * (e.open_balance / 100);
      incomeInput.value = annualIncome;
      incomeInput.dispatchEvent(new Event('input'));
    }

    incomeToggle.addEventListener('change', () => {
      const isChecked = incomeToggle.checked;
      yieldRow.style.display = isChecked ? 'grid' : 'none';
      if (!isChecked) {
        rateInput.value = '';
        incomeInput.value = '';
      }
    });

    rateInput.addEventListener('input', () => {
      const openVal = WPUtils.cleanNum(openInput.value);
      const rateVal = parseFloat(rateInput.value) || 0;
      if (openVal > 0) {
        const amt = (rateVal / 100) * openVal;
        incomeInput.value = amt;
        incomeInput.dispatchEvent(new Event('input'));
      }
    });

    incomeInput.addEventListener('input', () => {
      const openVal = WPUtils.cleanNum(openInput.value);
      const amtVal = WPUtils.cleanNum(incomeInput.value);
      if (openVal > 0) {
        const rate = (amtVal / openVal) * 100;
        rateInput.value = rate ? rate.toFixed(2) : '';
      }
    });

    openInput.addEventListener('input', () => {
      const openVal = WPUtils.cleanNum(openInput.value);
      const rateVal = parseFloat(rateInput.value) || 0;
      if (openVal > 0 && rateVal > 0) {
        const amt = (rateVal / 100) * openVal;
        incomeInput.value = amt;
        incomeInput.dispatchEvent(new Event('input'));
      }
    });
  }

  async function _saveAsset(existingId) {
    const dateVal = document.getElementById('af-date').value || PERIOD;
    const periodMonth = dateVal.substring(0, 7) + '-01';
    const rawOpen = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('af-open').value));

    const isEFSource = document.getElementById('af-ef-source').checked;

    const row = {
      user_id:              WPApp.state.user.id,
      asset_name:           document.getElementById('af-name').value.trim(),
      asset_type:           document.getElementById('af-type').value,
      institution_type:     document.getElementById('af-inst-type').value || null,
      institution_name:     document.getElementById('af-inst').value.trim(),
      open_balance:         rawOpen,
      close_balance:        rawOpen,
      interest_rate:        parseFloat(document.getElementById('af-rate').value)||0,
      tenor_months:         parseInt(document.getElementById('af-tenor').value)||null,
      is_income_generating: document.getElementById('af-income').checked,
      notes:                isEFSource ? '[Emergency Fund]' : null,
      period_month:         periodMonth,
    };
    if (!row.asset_name) { WPToast.warning('Please enter an asset name.'); return; }
    try {
      if (existingId) await WPDb.update('assets', existingId, row);
      else            await WPDb.insert('assets', row);
      WPToast.success(existingId ? 'Asset updated.' : 'Asset added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
  }

  function _openLiabForm(existing = null) {
    const e = existing || {};
    const body = `
      <form id="liab-form">
        <div class="form-group">
          <label for="lf-name">Liability Name</label>
          <input class="input" id="lf-name" value="${e.liability_name||''}" placeholder="e.g. GTBank Personal Loan, FCMB Mortgage" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="lf-type">Liability Type</label>
            <select class="select" id="lf-type">
              <option value="mortgage"      ${e.liability_type==='mortgage'     ?'selected':''}>Mortgage</option>
              <option value="personal_loan" ${e.liability_type==='personal_loan'?'selected':''}>Personal Loan</option>
              <option value="auto_loan"     ${e.liability_type==='auto_loan'    ?'selected':''}>Auto Loan</option>
              <option value="credit_card"   ${e.liability_type==='credit_card'  ?'selected':''}>Credit Card</option>
              <option value="student_loan"  ${e.liability_type==='student_loan' ?'selected':''}>Student Loan</option>
              <option value="other"         ${e.liability_type==='other'        ?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="lf-lender">Lender / Creditor</label>
            <input class="input" id="lf-lender" value="${e.lender_name||''}" placeholder="e.g. Access Bank, Renmoney">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="lf-open">Opening Balance (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="text" inputmode="decimal" id="lf-open" value="${e.open_balance?WPUtils.koboToNaira(e.open_balance):''}">
            </div>
          </div>
          <div class="form-group">
            <label for="lf-close">Closing Balance (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="text" inputmode="decimal" id="lf-close" value="${e.close_balance?WPUtils.koboToNaira(e.close_balance):''}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="lf-no-apr" ${!e.apr?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I don't know the APR (Enter monthly payment manually)</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" id="lf-apr-container" style="display: ${e.apr ? 'block' : 'none'}; flex: 1;">
            <label for="lf-apr">APR (%)</label>
            <input class="input" type="number" id="lf-apr" min="0" max="200" step="0.1" value="${e.apr||''}" placeholder="e.g. 22.5">
          </div>
          <div class="form-group" style="flex: 1;">
            <label for="lf-mpmt">Monthly Payment (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="text" inputmode="decimal" id="lf-mpmt" value="${e.monthly_payment?WPUtils.koboToNaira(e.monthly_payment):''}" ${e.apr?'readonly':''}>
            </div>
          </div>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Liability' : 'Add Liability', body, {
      confirmLabel: existing ? 'Update' : 'Add Liability',
      onConfirm: async () => { await _saveLiab(e.id); },
    });

    const noAprCheck = document.getElementById('lf-no-apr');
    const aprContainer = document.getElementById('lf-apr-container');
    const aprInput = document.getElementById('lf-apr');
    const mpmtInput = document.getElementById('lf-mpmt');
    const openInput = document.getElementById('lf-open');
    const closeInput = document.getElementById('lf-close');
    const typeSelect = document.getElementById('lf-type');

    WPUtils.maskNumberInput(openInput);
    WPUtils.maskNumberInput(closeInput);
    WPUtils.maskNumberInput(mpmtInput);

    function updateCalculatedPayment() {
      if (noAprCheck.checked) return;
      const aprVal = parseFloat(aprInput.value) || 0;
      const balVal = WPUtils.cleanNum(closeInput.value) || WPUtils.cleanNum(openInput.value) || 0;
      const typeVal = typeSelect.value;
      if (aprVal > 0 && balVal > 0) {
        let r = (aprVal / 100) / 12;
        let months = 36;
        if (typeVal === 'mortgage') months = 180;
        else if (typeVal === 'auto_loan') months = 60;
        else if (typeVal === 'credit_card') {
          mpmtInput.value = Math.round(balVal * Math.max(0.025, r + 0.01));
          mpmtInput.dispatchEvent(new Event('input'));
          return;
        }
        const pmt = Math.round(balVal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
        mpmtInput.value = pmt;
        mpmtInput.dispatchEvent(new Event('input'));
      } else {
        mpmtInput.value = '';
      }
    }

    noAprCheck.addEventListener('change', () => {
      const manual = noAprCheck.checked;
      aprContainer.style.display = manual ? 'none' : 'block';
      if (manual) {
        aprInput.value = '';
        mpmtInput.readOnly = false;
      } else {
        mpmtInput.readOnly = true;
        updateCalculatedPayment();
      }
    });

    aprInput.addEventListener('input', updateCalculatedPayment);
    openInput.addEventListener('input', updateCalculatedPayment);
    closeInput.addEventListener('input', updateCalculatedPayment);
    typeSelect.addEventListener('change', updateCalculatedPayment);
  }

  async function _saveLiab(existingId) {
    const isManual = document.getElementById('lf-no-apr').checked;
    const row = {
      user_id:          WPApp.state.user.id,
      liability_name:   document.getElementById('lf-name').value.trim(),
      liability_type:   document.getElementById('lf-type').value,
      lender_name:      document.getElementById('lf-lender').value.trim(),
      open_balance:     WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-open').value)),
      close_balance:    WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-close').value)),
      apr:              isManual ? 0 : (parseFloat(document.getElementById('lf-apr').value)||0),
      monthly_payment:  WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-mpmt').value)),
      is_interest_bearing: true,
      period_month:     PERIOD,
    };
    if (!row.liability_name) { WPToast.warning('Please enter a liability name.'); return; }
    try {
      if (existingId) await WPDb.update('liabilities', existingId, row);
      else            await WPDb.insert('liabilities', row);
      WPToast.success(existingId ? 'Liability updated.' : 'Liability added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
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
  async function _editLiab(id) {
    const l = _liabilities.find(x => x.id === id);
    if (l) _openLiabForm(l);
  }
  async function _deleteLiab(id) {
    WPModal.confirm('Delete Liability', 'Delete this liability?', async () => {
      try { await WPDb.remove('liabilities', id); WPToast.success('Liability deleted.'); await _load(); }
      catch (e) { WPToast.error('Could not delete.'); }
    });
  }

  function destroy() {}
  return { init, destroy, _editAsset, _deleteAsset, _editLiab, _deleteLiab };
})();
