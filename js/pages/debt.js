// ============================================================
// OlaFinancial — Debt Planner (Debt Avalanche Strategy)
// ============================================================

const WPDebt = (() => {

  let _liabilities = [];
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Debt Planner</h1>
          <p class="page-subtitle">Choose between Debt Avalanche (highest APR first) or Debt Snowball (lowest balance first)</p>
        </div>
        <button class="btn btn-primary" id="add-debt-btn">&#x2795; Add Debt</button>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <div class="kpi-grid" id="debt-kpis" style="margin-bottom:1.5rem"></div>
        <!-- Extra Payment & Strategy Simulator -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4B8; Extra Payment & Strategy Simulator</div>
          <div class="form-row">
            <div class="form-group" style="margin:0;flex:1;min-width:200px">
              <label for="extra-payment">Extra Monthly Payment (&#x20A6;)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">&#x20A6;</span>
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
    await _load();
  }

  async function _load() {
    try {
      _liabilities = await WPDb.getLiabilitiesByPeriod(WPApp.state.user.id, PERIOD);
      _liabilities = _liabilities.filter(l => l.is_interest_bearing && (l.close_balance || l.open_balance) > 0);
      _renderKPIs();
      _renderDebtCards();
      if (_liabilities.length > 0) _simulate();
    } catch (err) { WPToast.error('Failed to load debts.'); }
  }

  function _renderKPIs() {
    const totalDebt = _liabilities.reduce((s,l) => s + (l.close_balance||l.open_balance||0), 0);
    const totalPmt  = _liabilities.reduce((s,l) => s + (l.monthly_payment||0), 0);
    const avgAPR    = _liabilities.length
      ? (_liabilities.reduce((s,l) => s + (l.apr||0), 0) / _liabilities.length).toFixed(1)
      : 0;
    const highestAPR = _liabilities.reduce((max,l) => Math.max(max, l.apr||0), 0);

    document.getElementById('debt-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Debt</div><div class="card-value danger">${WPUtils.fmt(totalDebt)}</div><div class="card-meta">${_liabilities.length} active debt${_liabilities.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Monthly Payments</div><div class="card-value">${WPUtils.fmt(totalPmt)}</div><div class="card-meta">Minimum payments</div></div>
      <div class="card"><div class="card-title">Average APR</div><div class="card-value ${avgAPR>25?'danger':'gold'}">${avgAPR}%</div><div class="card-meta">Across all debts</div></div>
      <div class="card"><div class="card-title">Highest APR</div><div class="card-value danger">${highestAPR}%</div><div class="card-meta">Avalanche target first</div></div>`;
  }

  function _renderDebtCards() {
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
      const priorityClass = i === 0 ? 'priority-1' : i === 1 ? 'priority-2' : 'priority-3';
      return `<div class="debt-card ${priorityClass}">
        <div class="debt-header">
          <div>
            <div class="debt-name">
              ${i === 0 ? '&#x1F525; ' : i === 1 ? '&#x1F7E0; ' : '&#x1F7E2; '}
              ${l.liability_name}
              ${i === 0 ? '<span class="badge badge-danger" style="margin-left:8px">Avalanche Target #1</span>' : ''}
            </div>
            <div class="text-xs text-muted">${l.lender_name||''}</div>
          </div>
          <div class="debt-apr">${l.apr||0}% APR</div>
        </div>
        <div class="debt-stats">
          <div><div class="debt-stat-label">Balance</div><div class="debt-stat-value text-danger">${WPUtils.fmt(bal)}</div></div>
          <div><div class="debt-stat-label">Monthly Payment</div><div class="debt-stat-value">${WPUtils.fmt(l.monthly_payment||0)}</div></div>
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
    const extra = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('extra-payment')?.value));
    const strategy = document.getElementById('payoff-strategy').value;

    const debts = _liabilities.map(l => ({
      id: l.id, name: l.liability_name,
      balanceKobo:      l.close_balance || l.open_balance || 0,
      apr:              l.apr || 0,
      monthlyPaymentKobo: l.monthly_payment || 0,
    }));
    const results = WPUtils.calcDebtStrategy(debts, extra, strategy);

    const stratLabel = strategy === 'snowball' ? 'Snowball' : 'Avalanche';

    // Show chart
    document.getElementById('debt-chart-wrap').style.display = '';
    WPCharts.debtTimeline('chart-debt-timeline', debts);

    // Update section title
    document.getElementById('debt-savings-title').textContent = `Interest Savings with ${stratLabel}`;

    // Show savings table
    document.getElementById('debt-savings-wrap').style.display = '';
    const tbody = results.map(r => `<tr>
      <td><strong>${r.name}</strong></td>
      <td class="td-mono text-danger">${WPUtils.fmt(r.balanceKobo)}</td>
      <td class="td-mono">${r.apr}%</td>
      <td>${r.monthsToPayoff ? r.monthsToPayoff + ' months' : '—'}</td>
      <td class="td-mono text-accent fw-600">${WPUtils.fmt(r.interestSaved)}</td>
    </tr>`).join('');
    const totalSaved = results.reduce((s,r) => s + (r.interestSaved||0), 0);
    document.getElementById('debt-savings-table').innerHTML = `
      <table>
        <thead><tr><th>Debt</th><th>Balance</th><th>APR</th><th>Payoff (${stratLabel})</th><th>Interest Saved</th></tr></thead>
        <tbody>${tbody}</tbody>
        <tfoot><tr style="border-top:2px solid var(--clr-accent)">
          <td colspan="4" class="fw-700">Total Interest Saved with ${stratLabel}</td>
          <td class="td-mono text-accent fw-700">${WPUtils.fmt(totalSaved)}</td>
        </tr></tfoot>
      </table>`;

    if (totalSaved > 0) {
      WPToast.success(`${stratLabel} saves you ${WPUtils.fmt(totalSaved, {compact:true})} in interest!`);
    }
  }

  function _openForm(existing = null) {
    const e = existing || {};
    const body = `
      <form id="debt-form">
        <div class="form-group">
          <label for="df-name">Debt Name</label>
          <input class="input" id="df-name" value="${e.liability_name||''}" placeholder="e.g. UBA Personal Loan" required>
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
          <div class="form-group">
            <label for="df-bal">Current Balance (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="number" id="df-bal" min="0" step="1000" value="${e.close_balance?WPUtils.koboToNaira(e.close_balance):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="df-apr">APR (%)</label>
            <input class="input" type="number" id="df-apr" min="0" max="200" step="0.1" value="${e.apr||''}" placeholder="e.g. 24" required>
          </div>
        </div>
        <div class="form-group">
          <label for="df-mpmt">Monthly Minimum Payment (&#x20A6;)</label>
          <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
            <input class="input" type="number" id="df-mpmt" min="0" step="500" value="${e.monthly_payment?WPUtils.koboToNaira(e.monthly_payment):''}" placeholder="0" required>
          </div>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Debt' : 'Add Debt', body, {
      confirmLabel: existing ? 'Update' : 'Add Debt',
      onConfirm: async () => { await _save(e.id); },
    });
  }

  async function _save(existingId) {
    const row = {
      user_id:          WPApp.state.user.id,
      liability_name:   document.getElementById('df-name').value.trim(),
      liability_type:   document.getElementById('df-type').value,
      lender_name:      document.getElementById('df-lender').value.trim(),
      close_balance:    WPUtils.nairaToKobo(parseFloat(document.getElementById('df-bal').value)||0),
      open_balance:     WPUtils.nairaToKobo(parseFloat(document.getElementById('df-bal').value)||0),
      apr:              parseFloat(document.getElementById('df-apr').value)||0,
      monthly_payment:  WPUtils.nairaToKobo(parseFloat(document.getElementById('df-mpmt').value)||0),
      is_interest_bearing: true,
      period_month:     PERIOD,
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
