// ============================================================
// OlaFinancial — Expenses Page
// ============================================================

const WPExpenses = (() => {

  let _entries = [];
  let _startDate = '';
  let _endDate   = '';

  async function init(container) {
    const now   = new Date();
    _startDate  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    _endDate    = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Expenses</h1>
          <p class="page-subtitle">Track and categorize your spending</p>
        </div>
        <button class="btn btn-primary" id="add-expense-btn">&#x2795; Log Expense</button>
      </div>
      <div class="page-body">
        <div class="kpi-grid" id="expense-kpis" style="margin-bottom:1.5rem"></div>
        <div class="grid-2" style="margin-bottom:1.5rem">
          <div class="chart-wrap">
            <div class="chart-title">By Category</div>
            <div class="chart-container" style="height:220px"><canvas id="chart-exp-donut"></canvas></div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem">50/30/20 Budget Check</div>
            <div id="exp-budget-rule"><p class="text-muted text-sm">Log expenses to see your budget analysis.</p></div>
          </div>
        </div>
        <div class="card">
          <div class="section-header" style="flex-wrap:wrap;gap:0.75rem">
            <span class="section-title">Expense Log</span>
            <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
              <input class="input" type="date" id="exp-start" value="${_startDate}" style="width:145px">
              <span class="text-muted text-sm">to</span>
              <input class="input" type="date" id="exp-end"   value="${_endDate}"   style="width:145px">
              <button class="btn btn-secondary btn-sm" id="exp-filter-btn">Filter</button>
            </div>
          </div>
          <div class="table-wrap" id="expense-table"></div>
        </div>
      </div>`;

    document.getElementById('add-expense-btn').addEventListener('click', () => _openForm());
    document.getElementById('exp-filter-btn').addEventListener('click', async () => {
      _startDate = document.getElementById('exp-start').value;
      _endDate   = document.getElementById('exp-end').value;
      await _load();
    });

    await _load();
  }

  async function _load() {
    try {
      _entries = await WPDb.getExpensesByDateRange(WPApp.state.user.id, _startDate, _endDate);
      _renderKPIs();
      _renderTable();
      if (_entries.length > 0) { WPCharts.expenseDonut('chart-exp-donut', _entries); _renderBudgetRule(); }
    } catch (err) { WPToast.error('Failed to load expenses.'); }
  }

  function _renderKPIs() {
    const total   = _entries.reduce((s,e) => s+(e.amount||0), 0);
    const disc    = _entries.filter(e =>  e.is_discretionary).reduce((s,e) => s+(e.amount||0), 0);
    const nonDisc = total - disc;
    const recur   = _entries.filter(e =>  e.is_recurring).reduce((s,e) => s+(e.amount||0), 0);

    document.getElementById('expense-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Expenses</div><div class="card-value danger">${WPUtils.fmt(total)}</div><div class="card-meta">${_entries.length} transactions</div></div>
      <div class="card"><div class="card-title">Essential (Needs)</div><div class="card-value">${WPUtils.fmt(nonDisc)}</div><div class="card-meta">${WPUtils.fmtPct(nonDisc/Math.max(1,total))} of total</div></div>
      <div class="card"><div class="card-title">Discretionary (Wants)</div><div class="card-value gold">${WPUtils.fmt(disc)}</div><div class="card-meta">${WPUtils.fmtPct(disc/Math.max(1,total))} of total</div></div>
      <div class="card"><div class="card-title">Recurring</div><div class="card-value">${WPUtils.fmt(recur)}</div><div class="card-meta">${_entries.filter(e=>e.is_recurring).length} recurring items</div></div>`;
  }

  function _renderTable() {
    const wrap = document.getElementById('expense-table');
    if (!_entries.length) {
      wrap.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--clr-text-2)">No expenses in this date range. Click "Log Expense" to add one.</div>';
      return;
    }
    // Sort by date desc
    const sorted = [..._entries].sort((a,b) => new Date(b.expense_date) - new Date(a.expense_date));
    wrap.innerHTML = `<table>
      <thead><tr>
        <th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Type</th><th></th>
      </tr></thead>
      <tbody>${sorted.map(e => `<tr>
        <td class="text-muted text-sm">${WPUtils.fmtDate(e.expense_date)}</td>
        <td>
          <strong>${e.description||'—'}</strong>
          ${e.merchant?`<br><span class="text-xs text-muted">${e.merchant}</span>`:''}
        </td>
        <td><span class="badge badge-neutral">${e.category}</span></td>
        <td class="td-mono fw-600 ${e.amount>500000?'text-danger':''}">${WPUtils.fmt(e.amount)}</td>
        <td><span class="badge ${e.is_discretionary?'badge-gold':'badge-neutral'}">${e.is_discretionary?'Want':'Need'}</span>${e.is_recurring?'<span class="badge badge-info" style="margin-left:4px">Recurring</span>':''}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="WPExpenses._edit('${e.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="WPExpenses._delete('${e.id}')">Delete</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function _renderBudgetRule() {
    const total   = _entries.reduce((s,e) => s+(e.amount||0), 0);
    if (!total) return;
    const nonDisc = _entries.filter(e => !e.is_discretionary).reduce((s,e) => s+(e.amount||0), 0);
    const disc    = total - nonDisc;
    const needsPct  = (nonDisc/total*100).toFixed(0);
    const wantsPct  = (disc/total*100).toFixed(0);
    document.getElementById('exp-budget-rule').innerHTML = `
      <div class="progress-wrap">
        <div class="progress-labels"><span>Needs (target &le;50%)</span><span class="${nonDisc/total>0.6?'text-danger':'text-accent'}">${needsPct}%</span></div>
        <div class="progress-bar" style="height:10px"><div class="progress-fill ${nonDisc/total>0.6?'danger':''}" style="width:${Math.min(100,nonDisc/total*100)}%"></div></div>
      </div>
      <div class="progress-wrap" style="margin-top:0.75rem">
        <div class="progress-labels"><span>Wants (target &le;30%)</span><span class="${disc/total>0.35?'text-danger':'text-gold'}">${wantsPct}%</span></div>
        <div class="progress-bar" style="height:10px"><div class="progress-fill gold" style="width:${Math.min(100,disc/total*100)}%"></div></div>
      </div>
      <div class="disclaimer" style="margin-top:1rem">
        The 50/30/20 rule: 50% needs, 30% wants, 20% savings &amp; debt repayment.
        Remaining ${(100-parseInt(needsPct)-parseInt(wantsPct))}% should go to savings.
      </div>`;
  }

  function _openForm(existing = null) {
    const e = existing || {};
    const cats = [
      'Housing','Transportation','Education','Communication','Interest & Debt',
      'Insurance','Family Support','Shopping','Entertainment','Gifts & Charity',
      'Taxes','Health','Food','Dining Out','Utilities-Power Generation',
      'Utilities-Water','Utilities-Refuse','Security','Land Use Act/Tenement Rate',
      'Other'
    ];
    const body = `
      <form id="exp-form">
        <div class="form-row">
          <div class="form-group">
            <label for="ef-date">Date</label>
            <input class="input" type="date" id="ef-date" value="${e.expense_date||new Date().toISOString().slice(0,10)}" required>
          </div>
          <div class="form-group">
            <label for="ef-amount">Amount (&#x20A6;)</label>
            <div class="input-prefix-group">
              <span class="input-prefix">&#x20A6;</span>
              <input class="input" type="text" inputmode="decimal" id="ef-amount" value="${e.amount?WPUtils.koboToNaira(e.amount):''}" placeholder="0" required>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="ef-cat">Category</label>
            <select class="select" id="ef-cat">
              ${cats.map(c => `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="ef-desc">Description</label>
            <input class="input" id="ef-desc" value="${e.description||''}" placeholder="e.g. Monthly rent, Groceries">
          </div>
        </div>
        <div class="form-group">
          <label for="ef-merchant">Merchant / Payee (optional)</label>
          <input class="input" id="ef-merchant" value="${e.merchant||''}" placeholder="e.g. Shoprite, EKEDC, MTN">
        </div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:0.5rem">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ef-disc" ${e.is_discretionary?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Discretionary (want, not a need)</span>
          </div>
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ef-recur" ${e.is_recurring?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Recurring expense</span>
          </div>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Expense' : 'Log Expense', body, {
      confirmLabel: existing ? 'Update' : 'Add Expense',
      onConfirm: async () => { await _save(e.id); },
    });
    WPUtils.maskNumberInput(document.getElementById('ef-amount'));
  }

  async function _save(existingId) {
    const amount = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ef-amount').value));
    if (!amount) { WPToast.warning('Please enter an amount.'); return; }
    const row = {
      user_id:          WPApp.state.user.id,
      expense_date:     document.getElementById('ef-date').value,
      amount,
      category:         document.getElementById('ef-cat').value,
      description:      document.getElementById('ef-desc').value.trim(),
      merchant:         document.getElementById('ef-merchant').value.trim(),
      is_discretionary: document.getElementById('ef-disc').checked,
      is_recurring:     document.getElementById('ef-recur').checked,
    };
    try {
      if (existingId) await WPDb.update('expense_entries', existingId, row);
      else            await WPDb.insert('expense_entries', row);
      WPToast.success(existingId ? 'Expense updated.' : 'Expense logged.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
  }

  async function _edit(id) {
    const e = _entries.find(x => x.id === id);
    if (e) _openForm(e);
  }

  async function _delete(id) {
    WPModal.confirm('Delete Expense', 'Delete this expense entry? Cannot be undone.', async () => {
      try { await WPDb.remove('expense_entries', id); WPToast.success('Deleted.'); await _load(); }
      catch (err) { WPToast.error('Could not delete.'); }
    });
  }

  function destroy() {}
  return { init, destroy, _edit, _delete };
})();
