// ============================================================
// OlaFinancial — Liabilities Page
// ============================================================

const WPLiabilities = (() => {
  let _liabilities = [];
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <a href="#/balance-sheet" class="text-xs text-accent" style="text-decoration:none;display:inline-block;margin-bottom:0.5rem">← Back to Net Worth</a>
          <h1 class="page-title">Liabilities</h1>
          <p class="page-subtitle">Track your loans, credit cards, and other debts for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="liab-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="add-liab-page-btn">&#x2795; Add Liability</button>
        </div>
      </div>
      <div class="page-body">
        <!-- KPIs -->
        <div class="kpi-grid" id="liab-kpis" style="margin-bottom:1.5rem"></div>
        
        <!-- Debt Strategy CTA -->
        <div class="card" style="margin-bottom:1.5rem;background:rgba(244, 63, 94, 0.05);border-color:var(--clr-danger)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
            <div>
              <div style="font-weight:600">Want to payoff your debt faster?</div>
              <div class="text-xs text-muted">Model Snowball/Avalanche paydown strategies using the Debt Planner tool.</div>
            </div>
            <a href="#/debt" class="btn btn-primary btn-sm" style="background:var(--clr-danger)">View Debt Payoff Strategy →</a>
          </div>
        </div>

        <!-- Liabilities Table Card -->
        <div class="card">
          <div class="section-header">
            <span class="section-title">All Liabilities</span>
            <span class="badge badge-danger" id="liab-page-total">—</span>
          </div>
          <div class="table-wrap" id="liab-page-table"></div>
        </div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    document.getElementById('add-liab-page-btn').addEventListener('click', () => _openLiabForm());

    const curSelect = document.getElementById('liab-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_liabilities') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_liabilities', e.target.value);
        _render();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;
      _liabilities = await WPDb.getLiabilitiesByPeriod(uid, PERIOD);
      _render();
    } catch (err) {
      WPToast.error('Failed to load liabilities.');
    }
  }

  function _render() {
    const pageCurrency = localStorage.getItem('wp_page_currency_liabilities') || WPApp.state.profile?.currency || 'NGN';

    const totalLiab = _liabilities.reduce((s,l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance || l.open_balance || 0, cur, pageCurrency);
    }, 0);

    const interestBearing = _liabilities.filter(l => WPUtils.isInterestBearingLiability(l)).reduce((s,l) => {
      const cur = WPUtils.getEntryCurrency(l.notes);
      return s + WPUtils.convert(l.close_balance || l.open_balance || 0, cur, pageCurrency);
    }, 0);
    const nonInterest = totalLiab - interestBearing;

    const maxApr = Math.max(0, ..._liabilities.map(l => l.apr || 0));
    const ibCount = _liabilities.filter(l => WPUtils.isInterestBearingLiability(l)).length;

    document.getElementById('liab-page-total').textContent = WPUtils.fmt(totalLiab, {compact:true, currency: pageCurrency});

    document.getElementById('liab-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Liabilities</div><div class="card-value danger">${WPUtils.fmt(totalLiab,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${_liabilities.length} debt${_liabilities.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Interest-Bearing</div><div class="card-value danger">${WPUtils.fmt(interestBearing,{compact:true, currency: pageCurrency})}</div><div class="card-meta">${ibCount} debt${ibCount!==1?'s':''} accruing interest</div></div>
      <div class="card"><div class="card-title">Non-Interest</div><div class="card-value">${WPUtils.fmt(nonInterest,{compact:true, currency: pageCurrency})}</div><div class="card-meta">0% / non-interest debts</div></div>
      <div class="card"><div class="card-title">Highest APR</div><div class="card-value gold">${maxApr}%</div><div class="card-meta">Highest rate in portfolio</div></div>`;

    _renderLiabTable(totalLiab, pageCurrency);
  }

  function _renderLiabTable(total, pageCurrency) {
    const wrap = document.getElementById('liab-page-table');
    if (!_liabilities.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-2)">No liabilities recorded. Great!</div>';
      return;
    }
    wrap.innerHTML = `<table>
      <thead><tr><th>Liability</th><th>Type</th><th>Lender</th><th>Balance</th><th>Interest</th><th>APR</th><th>Monthly Pmt</th><th></th></tr></thead>
      <tbody>${_liabilities.map(l => {
        const bal = l.close_balance || l.open_balance || 0;
        const cur = WPUtils.getEntryCurrency(l.notes);
        const balPage = WPUtils.convert(bal, cur, pageCurrency);
        const pmtPage = WPUtils.convert(l.monthly_payment||0, cur, pageCurrency);
        const cleanNotes = (l.notes || '').replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').trim();
        const ib = WPUtils.isInterestBearingLiability(l);
        return `<tr>
          <td><strong>${l.liability_name}</strong>${cleanNotes?`<br><span class="text-xs text-muted">${cleanNotes}</span>`:''}</td>
          <td><span class="badge badge-danger">${(l.liability_type||'').replace('_',' ')}</span></td>
          <td class="text-muted text-sm">${l.lender_name||'—'}</td>
          <td class="td-mono fw-600 text-danger">${WPUtils.fmt(balPage, { currency: pageCurrency })}</td>
          <td>${ib ? '<span class="badge badge-danger">Interest-bearing</span>' : '<span class="badge badge-neutral">Non-interest</span>'}</td>
          <td class="td-mono ${l.apr>25?'text-danger':'text-gold'}">${l.apr||0}%</td>
          <td class="td-mono">${WPUtils.fmt(pmtPage, { currency: pageCurrency })}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPLiabilities._editLiab('${l.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPLiabilities._deleteLiab('${l.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _openLiabForm(existing = null) {
    const e = existing || {};
    const currencyCode = WPUtils.getEntryCurrency(e.notes);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="liab-form">
        <div class="form-row">
          <div class="form-group">
            <label for="lf-currency">Currency</label>
            <select class="select" id="lf-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="lf-name">Liability Name</label>
            <input class="input" id="lf-name" value="${e.liability_name||''}" placeholder="e.g. GTBank Personal Loan, FCMB Mortgage" required>
          </div>
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
              <option value="qard_hasan"    ${e.liability_type==='qard_hasan'   ?'selected':''}>Qard Hasan (interest-free)</option>
              <option value="other"         ${e.liability_type==='other'        ?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="lf-lender">Lender / Creditor</label>
            <input class="input" id="lf-lender" value="${e.lender_name||''}" placeholder="e.g. Access Bank, Renmoney, family">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="lf-open">Current Balance (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="lf-open" value="${e.open_balance?WPUtils.koboToNaira(e.open_balance):''}">
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin:0.75rem 0 1rem">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="lf-interest" ${e.id ? (e.is_interest_bearing !== false && e.is_interest_bearing !== 0 ? 'checked' : '') : (e.liability_type === 'qard_hasan' ? '' : 'checked')}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Interest-bearing (loan/credit that charges interest/riba)</span>
          </div>
          <p class="text-xs text-muted" style="margin:0;padding-left:0.25rem">
            Turn off Qard Hasan, 0% family loans, or interest-free advances.
          </p>
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="lf-no-apr" ${!e.apr?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I don't know the APR (Enter monthly payment manually)</span>
          </div>
        </div>
        <div class="form-row" id="lf-apr-row">
          <div class="form-group" id="lf-apr-container" style="display: ${e.apr ? 'block' : 'none'}; flex: 1;">
            <label for="lf-apr">APR (%)</label>
            <input class="input" type="number" id="lf-apr" min="0" max="200" step="0.1" value="${e.apr||''}" placeholder="e.g. 22.5">
          </div>
          <div class="form-group" style="flex: 1;">
            <label for="lf-mpmt">Monthly Payment (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="lf-mpmt" value="${e.monthly_payment?WPUtils.koboToNaira(e.monthly_payment):''}" ${e.apr?'readonly':''}>
            </div>
          </div>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Liability' : 'Add Liability', body, {
      confirmLabel: existing ? 'Update' : 'Add Liability',
      onConfirm: async () => { return await _saveLiab(e.id); },
    });

    const noAprCheck = document.getElementById('lf-no-apr');
    const aprContainer = document.getElementById('lf-apr-container');
    const aprInput = document.getElementById('lf-apr');
    const mpmtInput = document.getElementById('lf-mpmt');
    const openInput = document.getElementById('lf-open');
    const typeSelect = document.getElementById('lf-type');
    const currencySelect = document.getElementById('lf-currency');

    WPUtils.maskNumberInput(openInput);
    WPUtils.maskNumberInput(mpmtInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelectorAll('#liab-form .input-prefix').forEach(span => span.textContent = newSym);
      document.querySelector('label[for="lf-open"]').textContent = `Current Balance (${newSym})`;
      document.querySelector('label[for="lf-mpmt"]').textContent = `Monthly Payment (${newSym})`;
    });

    function updateCalculatedPayment() {
      if (noAprCheck.checked) return;
      const aprVal = parseFloat(aprInput.value) || 0;
      const balVal = WPUtils.cleanNum(openInput.value) || 0;
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
    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'qard_hasan') {
        const ib = document.getElementById('lf-interest');
        if (ib) ib.checked = false;
        noAprCheck.checked = true;
        noAprCheck.dispatchEvent(new Event('change'));
      }
      updateCalculatedPayment();
    });
  }

  async function _saveLiab(existingId) {
    const isManual = document.getElementById('lf-no-apr').checked;
    const currency = document.getElementById('lf-currency').value;
    const finalNotes = WPUtils.setEntryCurrency('', currency);

    const row = {
      user_id:          WPApp.state.user.id,
      liability_name:   document.getElementById('lf-name').value.trim(),
      liability_type:   document.getElementById('lf-type').value,
      lender_name:      document.getElementById('lf-lender').value.trim(),
      open_balance:     WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-open').value)),
      close_balance:    WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-open').value)),
      apr:              isManual ? 0 : (parseFloat(document.getElementById('lf-apr').value)||0),
      monthly_payment:  WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('lf-mpmt').value)),
      is_interest_bearing: !!(document.getElementById('lf-interest')?.checked),
      period_month:     PERIOD,
      notes:            finalNotes,
    };
    if (!row.liability_name) {
      const nameInput = document.getElementById('lf-name');
      if (nameInput) {
        nameInput.style.borderColor = 'var(--clr-danger)';
        nameInput.focus();
      }
      WPToast.warning('Please enter a liability name.');
      return false;
    }
    try {
      if (existingId) await WPDb.update('liabilities', existingId, row);
      else            await WPDb.insert('liabilities', row);
      WPToast.success(existingId ? 'Liability updated.' : 'Liability added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); return false; }
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

  return { init, destroy, _editLiab, _deleteLiab };
})();
