// ============================================================
// OlaFinancial — Debt Planner (Debt Avalanche Strategy)
// ============================================================

const WPDebt = (() => {

  let _liabilities = [];
  const PERIOD = WPUtils.currentPeriod();

    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_debt') || baseCur;
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[pageCurrency] || '₦';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Debt Planner</h1>
          <p class="page-subtitle">Choose between Debt Avalanche (highest APR first) or Debt Snowball (lowest balance first)</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="debt-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="add-debt-btn">&#x2795; Add Debt</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <!-- Mini Goal Widget -->
        <div class="card" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;padding:1.5rem">
          <div>
            <div class="section-title" style="margin:0;font-size:1.1rem">🎯 Debt Paydown Goal</div>
            <p style="font-size:0.85rem;color:var(--clr-text-2);margin:0.25rem 0 0">Set targets to pay off specific loans and liabilities.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="location.hash='#/goals'">Manage Debt Goals</button>
        </div>
        <div class="kpi-grid" id="debt-kpis" style="margin-bottom:1.5rem"></div>
        <!-- Extra Payment & Strategy Simulator -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4B8; Extra Payment & Strategy Simulator</div>
          <div class="form-row">
            <div class="form-group" style="margin:0;flex:1;min-width:200px">
              <label for="extra-payment-label" id="extra-payment-label">Extra Monthly Payment (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="extra-payment" placeholder="0" value="0">
              </div>
            </div>
            <div class="form-group" style="margin:0;flex:1;min-width:200px">
              <label for="payoff-strategy">Payoff Strategy</label>
              <select class="select" id="payoff-strategy">
                <option value="avalanche">Debt Avalanche (Highest APR First)</option>
                <option value="snowball">Debt Snowball (Lowest Balance First)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-secondary" id="simulate-btn" style="margin-top:1.5rem;width:100%">Run Payoff Simulation</button>
        </div>
        <!-- Debt Cards -->
        <div id="debt-list"></div>
        <!-- Payoff Timeline Chart -->
        <div class="chart-wrap" style="margin-top:1.5rem;display:none" id="debt-chart-wrap">
          <div class="chart-title">Debt Payoff Timeline (60 months)</div>
          <div class="chart-container" style="height:280px"><canvas id="chart-debt-timeline"></canvas></div>
        </div>
        <!-- Interest Saved Table -->
        <div class="card" style="margin-top:1.5rem;display:none" id="debt-savings-wrap">
          <div class="section-title" id="debt-savings-title" style="margin-bottom:1rem">Interest Savings</div>
          <div class="table-wrap" id="debt-savings-table"></div>
        </div>
      </div>`;

    document.getElementById('add-debt-btn').addEventListener('click', () => _openForm());
    document.getElementById('simulate-btn').addEventListener('click', _simulate);
    WPUtils.maskNumberInput(document.getElementById('extra-payment'));

    const curSelect = document.getElementById('debt-page-currency');
    if (curSelect) {
      curSelect.value = pageCurrency;
      curSelect.addEventListener('change', (e) => {
        const newCur = e.target.value;
        const newSym = symbols[newCur] || '₦';
        localStorage.setItem('wp_page_currency_debt', newCur);
        const lbl = document.getElementById('extra-payment-label');
        if (lbl) lbl.textContent = `Extra Monthly Payment (${newSym})`;
        const pfx = document.querySelector('.input-prefix');
        if (pfx) pfx.textContent = newSym;
        _load();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      _liabilities = await WPDb.getLiabilitiesByPeriod(WPApp.state.user.id, PERIOD);
      _liabilities = _liabilities.filter(l => l.is_interest_bearing && (l.close_balance || l.open_balance) > 0);
      
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const pageCurrency = localStorage.getItem('wp_page_currency_debt') || baseCur;

      _renderKPIs(baseCur, pageCurrency);
      _renderDebtCards(baseCur, pageCurrency);
      if (_liabilities.length > 0) _simulate();
    } catch (err) { WPToast.error('Failed to load debts.'); }
  }

  function _renderKPIs(baseCur, pageCurrency) {
    const totalDebt = _liabilities.reduce((s,l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance||l.open_balance||0, cur, baseCur);
    }, 0);
    const totalPmt  = _liabilities.reduce((s,l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.monthly_payment||0, cur, baseCur);
    }, 0);
    const avgAPR    = _liabilities.length
      ? (_liabilities.reduce((s,l) => s + (l.apr||0), 0) / _liabilities.length).toFixed(1)
      : 0;
    const highestAPR = _liabilities.reduce((max,l) => Math.max(max, l.apr||0), 0);

    const totalDebtPage = WPUtils.convert(totalDebt, baseCur, pageCurrency);
    const totalPmtPage = WPUtils.convert(totalPmt, baseCur, pageCurrency);

    document.getElementById('debt-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Debt</div><div class="card-value danger">${WPUtils.fmt(totalDebtPage, {currency: pageCurrency})}</div><div class="card-meta">${_liabilities.length} active debt${_liabilities.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Monthly Payments</div><div class="card-value">${WPUtils.fmt(totalPmtPage, {currency: pageCurrency})}</div><div class="card-meta">Minimum payments</div></div>
      <div class="card"><div class="card-title">Average APR</div><div class="card-value ${avgAPR>25?'danger':'gold'}">${avgAPR}%</div><div class="card-meta">Across all debts</div></div>
      <div class="card"><div class="card-title">Highest APR</div><div class="card-value danger">${highestAPR}%</div><div class="card-meta">Avalanche target first</div></div>`;
  }

  function _renderDebtCards(baseCur, pageCurrency) {
    const sorted = [..._liabilities].sort((a,b) => (b.apr||0) - (a.apr||0));
    const el = document.getElementById('debt-list');
    if (!sorted.length) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--clr-text-2)">
        &#x1F389; No active debts recorded — or click "Add Debt" to add one.
      </div>`;
      return;
    }
    el.innerHTML = sorted.map((l, i) => {
      const bal = l.close_balance || l.open_balance || 0;
      const cur = WPUtils.getEntryCurrency(l.notes);
      const priorityClass = i === 0 ? 'priority-1' : i === 1 ? 'priority-2' : 'priority-3';
      const cleanNotes = (l.notes || '').replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').trim();

      const balPage = WPUtils.convert(bal, cur, pageCurrency);
      const pmtPage = WPUtils.convert(l.monthly_payment||0, cur, pageCurrency);

      return `<div class="debt-card ${priorityClass}">
        <div class="debt-header">
          <div>
            <div class="debt-name">
              ${i === 0 ? '&#x1F525; ' : i === 1 ? '&#x1F7E0; ' : '&#x1F7E2; '}
              ${l.liability_name}
              ${i === 0 ? '<span class="badge badge-danger" style="margin-left:8px">Avalanche Target #1</span>' : ''}
              ${cleanNotes ? `<span class="text-xs text-muted" style="display:block;margin-top:4px">${cleanNotes}</span>` : ''}
            </div>
            <div class="text-xs text-muted">${l.lender_name||''}</div>
          </div>
          <div class="debt-apr">${l.apr||0}% APR</div>
        </div>
        <div class="debt-stats">
          <div><div class="debt-stat-label">Balance</div><div class="debt-stat-value text-danger">${WPUtils.fmt(balPage, { currency: pageCurrency })}</div></div>
          <div><div class="debt-stat-label">Monthly Payment</div><div class="debt-stat-value">${WPUtils.fmt(pmtPage, { currency: pageCurrency })}</div></div>
          <div><div class="debt-stat-label">Type</div><div class="debt-stat-value">${(l.liability_type||'').replace('_',' ')}</div></div>
        </div>
        <div style="margin-top:0.75rem;text-align:right">
          <button class="btn btn-ghost btn-sm" onclick="WPDebt._edit('${l.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="WPDebt._delete('${l.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  function _simulate() {
    if (!_liabilities.length) return;
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_debt') || baseCur;

    // The simulation runs in baseCur (using the converted user extra payment in baseCur)
    const extraRaw = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('extra-payment')?.value));
    const extra = WPUtils.convert(extraRaw, pageCurrency, baseCur);

    const strategy = document.getElementById('payoff-strategy').value;


    const debts = _liabilities.map(l => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return {
        id: l.id, name: l.liability_name,
        balanceKobo:      WPUtils.convert(l.close_balance || l.open_balance || 0, cur, baseCur),
        apr:              l.apr || 0,
        monthlyPaymentKobo: WPUtils.convert(l.monthly_payment || 0, cur, baseCur),
      };
    });
    const results = WPUtils.calcDebtStrategy(debts, extra, strategy);

    const stratLabel = strategy === 'snowball' ? 'Snowball' : 'Avalanche';

    // Show chart
    document.getElementById('debt-chart-wrap').style.display = '';
    WPCharts.debtTimeline('chart-debt-timeline', debts);

    // Update section title
    document.getElementById('debt-savings-title').textContent = `Interest Savings with ${stratLabel}`;

    // Show savings table
    document.getElementById('debt-savings-wrap').style.display = '';
    const tbody = results.map(r => {
      const balPage = WPUtils.convert(r.balanceKobo, baseCur, pageCurrency);
      const savedPage = WPUtils.convert(r.interestSaved||0, baseCur, pageCurrency);
      return `<tr>
        <td><strong>${r.name}</strong></td>
        <td class="td-mono text-danger">${WPUtils.fmt(balPage, {currency: pageCurrency})}</td>
        <td class="td-mono">${r.apr}%</td>
        <td>${r.monthsToPayoff ? r.monthsToPayoff + ' months' : '—'}</td>
        <td class="td-mono text-accent fw-600">${WPUtils.fmt(savedPage, {currency: pageCurrency})}</td>
      </tr>`;
    }).join('');
    
    const totalSaved = results.reduce((s,r) => s + (r.interestSaved||0), 0);
    const totalSavedPage = WPUtils.convert(totalSaved, baseCur, pageCurrency);
    
    document.getElementById('debt-savings-table').innerHTML = `
      <table>
        <thead><tr><th>Debt</th><th>Balance</th><th>APR</th><th>Payoff (${stratLabel})</th><th>Interest Saved</th></tr></thead>
        <tbody>${tbody}</tbody>
        <tfoot><tr style="border-top:2px solid var(--clr-accent)">
          <td colspan="4" class="fw-700">Total Interest Saved with ${stratLabel}</td>
          <td class="td-mono text-accent fw-700">${WPUtils.fmt(totalSavedPage, {currency: pageCurrency})}</td>
        </tr></tfoot>
      </table>`;

    if (totalSaved > 0) {
      WPToast.success(`${stratLabel} saves you ${WPUtils.fmt(totalSavedPage, {compact:true, currency: pageCurrency})} in interest!`);
    }
  }

  function _openForm(existing = null) {
    const e = existing || {};
    const currencyCode = WPUtils.getEntryCurrency(e.notes);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="debt-form">
        <div class="form-row">
          <div class="form-group">
            <label for="df-currency">Currency</label>
            <select class="select" id="df-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="df-name">Debt Name</label>
            <input class="input" id="df-name" value="${e.liability_name||''}" placeholder="e.g. UBA Personal Loan" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="df-type">Debt Type</label>
            <select class="select" id="df-type">
              <option value="personal_loan" ${e.liability_type==='personal_loan'?'selected':''}>Personal Loan</option>
              <option value="mortgage"      ${e.liability_type==='mortgage'     ?'selected':''}>Mortgage</option>
              <option value="auto_loan"     ${e.liability_type==='auto_loan'    ?'selected':''}>Auto Loan</option>
              <option value="credit_card"   ${e.liability_type==='credit_card'  ?'selected':''}>Credit Card</option>
              <option value="student_loan"  ${e.liability_type==='student_loan' ?'selected':''}>Student Loan</option>
              <option value="other"         ${e.liability_type==='other'        ?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="df-lender">Lender</label>
            <input class="input" id="df-lender" value="${e.lender_name||''}" placeholder="e.g. Access Bank, Renmoney">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label for="df-bal">Current Balance (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="df-bal" value="${e.close_balance?WPUtils.koboToNaira(e.close_balance):''}" placeholder="0" required>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="df-no-apr" ${!e.apr?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I don't know the APR (Enter monthly payment manually)</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" id="df-apr-container" style="display: ${e.apr ? 'block' : 'none'}; flex: 1;">
            <label for="df-apr">APR (%)</label>
            <input class="input" type="number" id="df-apr" min="0" max="200" step="0.1" value="${e.apr||''}" placeholder="e.g. 24">
          </div>
          <div class="form-group" style="flex: 1;">
            <label for="df-mpmt">Monthly Minimum Payment (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="df-mpmt" value="${e.monthly_payment?WPUtils.koboToNaira(e.monthly_payment):''}" placeholder="0" ${e.apr?'readonly':''} required>
            </div>
          </div>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Debt' : 'Add Debt', body, {
      confirmLabel: existing ? 'Update' : 'Add Debt',
      onConfirm: async () => { await _save(e.id); },
    });

    const noAprCheck = document.getElementById('df-no-apr');
    const aprContainer = document.getElementById('df-apr-container');
    const aprInput = document.getElementById('df-apr');
    const mpmtInput = document.getElementById('df-mpmt');
    const balInput = document.getElementById('df-bal');
    const typeSelect = document.getElementById('df-type');
    const currencySelect = document.getElementById('df-currency');

    WPUtils.maskNumberInput(balInput);
    WPUtils.maskNumberInput(mpmtInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelectorAll('#debt-form .input-prefix').forEach(span => span.textContent = newSym);
      document.querySelector('label[for="df-bal"]').textContent = `Current Balance (${newSym})`;
      document.querySelector('label[for="df-mpmt"]').textContent = `Monthly Minimum Payment (${newSym})`;
    });

    function updateCalculatedPayment() {
      if (noAprCheck.checked) return;
      const aprVal = parseFloat(aprInput.value) || 0;
      const balVal = WPUtils.cleanNum(balInput.value) || 0;
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
    balInput.addEventListener('input', updateCalculatedPayment);
    typeSelect.addEventListener('change', updateCalculatedPayment);
  }

  async function _save(existingId) {
    const isManual = document.getElementById('df-no-apr').checked;
    const rawBal = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('df-bal').value));
    const currency = document.getElementById('df-currency').value;
    const finalNotes = WPUtils.setEntryCurrency('', currency);

    const row = {
      user_id:          WPApp.state.user.id,
      liability_name:   document.getElementById('df-name').value.trim(),
      liability_type:   document.getElementById('df-type').value,
      lender_name:      document.getElementById('df-lender').value.trim(),
      close_balance:    rawBal,
      open_balance:     rawBal,
      apr:              isManual ? 0 : (parseFloat(document.getElementById('df-apr').value)||0),
      monthly_payment:  WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('df-mpmt').value)),
      is_interest_bearing: true,
      period_month:     PERIOD,
      notes:            finalNotes,
    };
    if (!row.liability_name || !row.close_balance) { WPToast.warning('Name and balance are required.'); return; }
    try {
      if (existingId) await WPDb.update('liabilities', existingId, row);
      else            await WPDb.insert('liabilities', row);
      WPToast.success(existingId ? 'Debt updated.' : 'Debt added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
  }

  async function _edit(id) { const l = _liabilities.find(x => x.id===id); if (l) _openForm(l); }
  async function _delete(id) {
    WPModal.confirm('Delete Debt', 'Delete this debt entry?', async () => {
      try { await WPDb.remove('liabilities', id); WPToast.success('Debt deleted.'); await _load(); }
      catch (e) { WPToast.error('Could not delete.'); }
    });
  }

  function destroy() {}
  return { init, destroy, _edit, _delete };
})();
