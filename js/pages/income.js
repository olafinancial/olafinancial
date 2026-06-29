// ============================================================
// OlaFinancial — Income Page
// ============================================================

const WPIncome = (() => {

  let _entries = [];
  const PERIOD = WPUtils.currentPeriod();

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Income</h1>
          <p class="page-subtitle">Track all income sources for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <button class="btn btn-primary" id="add-income-btn">&#x2795; Add Income Source</button>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <div class="kpi-grid" id="income-kpis" style="margin-bottom:1.5rem"></div>
        <div class="chart-wrap" style="margin-bottom:1.5rem">
          <div class="chart-title">Gross vs Net Income by Source</div>
          <div class="chart-container" style="height:200px"><canvas id="chart-income-breakdown"></canvas></div>
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">Income Sources</span>
            <div class="tabs" id="income-type-filter">
              <button class="tab-btn active" data-type="all">All</button>
              <button class="tab-btn" data-type="active">Active</button>
              <button class="tab-btn" data-type="passive">Passive</button>
              <button class="tab-btn" data-type="investment">Investment</button>
            </div>
          </div>
          <div class="table-wrap" id="income-table-wrap"></div>
        </div>
        <!-- Tax Estimator -->
        <div class="card" style="margin-top:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4CA; Nigeria Tax Act 2025 — Tax Estimator</div>
          <div class="form-row">
            <div class="form-group">
              <label for="te-gross">Annual Gross Emoluments (&#x20A6;)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">&#x20A6;</span>
                <input class="input" type="number" id="te-gross" placeholder="e.g. 3600000" min="0" step="1000">
              </div>
            </div>
            <div class="form-group">
              <label for="te-rent">Annual Rent Paid (&#x20A6;)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">&#x20A6;</span>
                <input class="input" type="number" id="te-rent" placeholder="e.g. 600000" min="0" step="1000">
              </div>
            </div>
          </div>
          <button class="btn btn-secondary" id="te-calc-btn">Calculate Tax</button>
          <div id="te-result" style="margin-top:1rem"></div>
        </div>
      </div>`;

    document.getElementById('add-income-btn').addEventListener('click', () => _openForm());
    document.getElementById('income-type-filter').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('#income-type-filter .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      _renderTable(btn.dataset.type);
    });
    document.getElementById('te-calc-btn').addEventListener('click', _runTaxEstimator);

    await _load();
  }

  async function _load() {
    try {
      _entries = await WPDb.getIncomeByPeriod(WPApp.state.user.id, PERIOD);
      _renderKPIs();
      _renderTable('all');
      if (_entries.length > 0) WPCharts.incomeBreakdown('chart-income-breakdown', _entries);
    } catch (err) { WPToast.error('Failed to load income data.'); }
  }

  function _renderKPIs() {
    const totalGross = _entries.reduce((s, e) => s + (e.gross_amount||0), 0);
    const totalTax   = _entries.reduce((s, e) => s + (e.paye_tax||0), 0);
    const totalPen   = _entries.reduce((s, e) => s + (e.pension_contrib||0), 0);
    const totalOther = _entries.reduce((s, e) => s + (e.nhf_contrib||0) + (e.other_deductions||0), 0);
    const totalNet   = totalGross - totalTax - totalPen - totalOther;
    const passive    = _entries.filter(e => e.income_type==='passive').reduce((s,e) => s+(e.gross_amount||0), 0);

    document.getElementById('income-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Gross Income</div><div class="card-value">${WPUtils.fmt(totalGross)}</div><div class="card-meta">${_entries.length} source${_entries.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Total Net Income</div><div class="card-value accent">${WPUtils.fmt(totalNet)}</div><div class="card-meta">After all deductions</div></div>
      <div class="card"><div class="card-title">PAYE Tax</div><div class="card-value danger">${WPUtils.fmt(totalTax)}</div><div class="card-meta">Effective rate: ${WPUtils.fmtPct(totalTax/Math.max(1,totalGross))}</div></div>
      <div class="card"><div class="card-title">Pension (8%)</div><div class="card-value gold">${WPUtils.fmt(totalPen)}</div><div class="card-meta">PENCOM contributory scheme</div></div>
      <div class="card"><div class="card-title">Passive Income</div><div class="card-value gold">${WPUtils.fmt(passive)}</div><div class="card-meta">${WPUtils.fmtPct(passive/Math.max(1,totalGross))} of total income</div></div>`;
  }

  function _renderTable(type = 'all') {
    const filtered = type === 'all' ? _entries : _entries.filter(e => e.income_type === type);
    const wrap = document.getElementById('income-table-wrap');
    if (!filtered.length) {
      wrap.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--clr-text-2)">
        ${type === 'all' ? 'No income entries yet. Click "Add Income Source" to begin.' : `No ${type} income entries this month.`}
      </div>`;
      return;
    }
    wrap.innerHTML = `<table>
      <thead><tr>
        <th>Source</th><th>Type</th><th>Gross</th><th>PAYE Tax</th><th>Pension</th><th>Net Income</th><th>Frequency</th><th></th>
      </tr></thead>
      <tbody>${filtered.map(e => {
        const net = (e.gross_amount||0)-(e.paye_tax||0)-(e.pension_contrib||0)-(e.nhf_contrib||0)-(e.other_deductions||0);
        const typeBadge = {active:'badge-info',passive:'badge-gold',investment:'badge-accent'}[e.income_type]||'badge-neutral';
        return `<tr>
          <td><strong>${e.source_name}</strong>${e.notes?`<br><span class="text-xs text-muted">${e.notes}</span>`:''}</td>
          <td><span class="badge ${typeBadge}">${e.income_type}</span></td>
          <td class="td-mono">${WPUtils.fmt(e.gross_amount||0)}</td>
          <td class="td-mono text-danger">${WPUtils.fmt(e.paye_tax||0)}</td>
          <td class="td-mono text-gold">${WPUtils.fmt(e.pension_contrib||0)}</td>
          <td class="td-mono text-accent fw-700">${WPUtils.fmt(net)}</td>
          <td><span class="badge badge-neutral">${e.frequency}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPIncome._edit('${e.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPIncome._delete('${e.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _runTaxEstimator() {
    const gross  = WPUtils.nairaToKobo(parseFloat(document.getElementById('te-gross').value)||0);
    const rent   = WPUtils.nairaToKobo(parseFloat(document.getElementById('te-rent').value)||0);
    const pension = WPUtils.calcPensionEmployee(gross);
    const tax     = WPUtils.calcPIT(gross, pension, rent);
    const net     = gross - tax - pension;
    const effective = WPUtils.effectiveTaxRate(gross, tax);
    const bracket   = WPUtils.taxBracket(gross - pension);

    document.getElementById('te-result').innerHTML = `
      <div class="grid-3" style="gap:1rem">
        <div class="card"><div class="card-title">Annual PAYE Tax</div><div class="card-value danger">${WPUtils.fmt(tax)}</div><div class="card-meta">Effective rate: ${WPUtils.fmtPct(effective)}</div></div>
        <div class="card"><div class="card-title">Pension Contribution</div><div class="card-value gold">${WPUtils.fmt(pension)}</div><div class="card-meta">8% of emoluments (PENCOM)</div></div>
        <div class="card"><div class="card-title">Annual Net Income</div><div class="card-value accent">${WPUtils.fmt(net)}</div><div class="card-meta">Monthly: ${WPUtils.fmt(Math.round(net/12))}</div></div>
      </div>
      <div class="alert alert-info" style="margin-top:1rem">
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>Your marginal tax bracket is <strong>${bracket.label}</strong> under the Nigeria Tax Act 2025.
        Rent relief applied: up to ₦500,000 (20% of annual rent).</span>
      </div>`;
  }

  function _openForm(existing = null) {
    const isEdit = !!existing;
    const e = existing || {};
    const currencyCode = WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="income-form">
        <div class="form-group">
          <label for="if-name">Source Name</label>
          <input class="input" id="if-name" placeholder="e.g. Dangote Salary, Rental Property, Dividends" value="${e.source_name||''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="if-type">Income Type</label>
            <select class="select" id="if-type">
              <option value="active"     ${e.income_type==='active'    ?'selected':''}>Active (Salary / Business)</option>
              <option value="passive"    ${e.income_type==='passive'   ?'selected':''}>Passive (Rent / Royalties)</option>
              <option value="investment" ${e.income_type==='investment'?'selected':''}>Investment (Dividends / Interest)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="if-freq">Frequency</label>
            <select class="select" id="if-freq">
              <option value="monthly"   ${(!e.frequency||e.frequency==='monthly')?'selected':''}>Monthly</option>
              <option value="quarterly" ${e.frequency==='quarterly'?'selected':''}>Quarterly</option>
              <option value="annual"    ${e.frequency==='annual'   ?'selected':''}>Annual</option>
              <option value="one_time"  ${e.frequency==='one_time' ?'selected':''}>One-Time</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="if-gross">Gross Amount (${symbol})</label>
          <div class="input-prefix-group">
            <span class="input-prefix">${symbol}</span>
            <input class="input" type="text" inputmode="decimal" id="if-gross" value="${e.gross_amount?WPUtils.koboToNaira(e.gross_amount):''}" placeholder="0" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="if-tax">PAYE Tax (${symbol})</label>
            <div class="input-prefix-group">
              <span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="if-tax" value="${e.paye_tax?WPUtils.koboToNaira(e.paye_tax):''}" placeholder="0">
            </div>
            <div class="input-hint"><a id="calc-tax-link" style="color:var(--clr-accent);cursor:pointer">Auto-calculate from gross (Tax Act 2025)</a></div>
          </div>
          <div class="form-group">
            <label for="if-pension">Pension 8% (${symbol})</label>
            <div class="input-prefix-group">
              <span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="if-pension" value="${e.pension_contrib?WPUtils.koboToNaira(e.pension_contrib):''}" placeholder="0">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="if-notes">Notes (optional)</label>
          <textarea class="textarea" id="if-notes" placeholder="e.g. Includes ₦80,000 transport allowance">${e.notes||''}</textarea>
        </div>
      </form>`;

    WPModal.open(isEdit ? 'Edit Income Source' : 'Add Income Source', body, {
      confirmLabel: isEdit ? 'Update' : 'Add Income',
      onConfirm: async () => { await _save(e.id); },
    });

    const grossInput = document.getElementById('if-gross');
    const taxInput = document.getElementById('if-tax');
    const pensionInput = document.getElementById('if-pension');

    WPUtils.maskNumberInput(grossInput);
    WPUtils.maskNumberInput(taxInput);
    WPUtils.maskNumberInput(pensionInput);

    document.getElementById('calc-tax-link')?.addEventListener('click', () => {
      const gross  = WPUtils.nairaToKobo(WPUtils.cleanNum(grossInput.value)||0);
      const pension = WPUtils.calcPensionEmployee(gross);
      const tax     = WPUtils.calcPIT(gross, pension);
      taxInput.value    = WPUtils.koboToNaira(tax).toFixed(0);
      pensionInput.value = WPUtils.koboToNaira(pension).toFixed(0);
      // Trigger inputs to update comma masks
      taxInput.dispatchEvent(new Event('input'));
      pensionInput.dispatchEvent(new Event('input'));
      WPToast.info('Calculated using Nigeria Tax Act 2025 brackets.');
    });
  }

  async function _save(existingId = null) {
    const grossKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-gross').value)||0);
    const row = {
      user_id:         WPApp.state.user.id,
      source_name:     document.getElementById('if-name').value.trim(),
      income_type:     document.getElementById('if-type').value,
      frequency:       document.getElementById('if-freq').value,
      gross_amount:    grossKobo,
      paye_tax:        WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-tax').value)||0),
      pension_contrib: WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-pension').value)||0),
      period_month:    PERIOD,
      notes:           document.getElementById('if-notes').value.trim(),
    };
    if (!row.source_name || !row.gross_amount) { WPToast.warning('Name and amount are required.'); return; }
    try {
      if (existingId) await WPDb.update('income_entries', existingId, row);
      else            await WPDb.insert('income_entries', row);
      WPToast.success(existingId ? 'Income updated.' : 'Income added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
  }

  async function _edit(id) {
    const entry = _entries.find(e => e.id === id);
    if (entry) _openForm(entry);
  }

  async function _delete(id) {
    WPModal.confirm('Delete Income Source', 'Delete this income entry? This cannot be undone.', async () => {
      try { await WPDb.remove('income_entries', id); WPToast.success('Deleted.'); await _load(); }
      catch (err) { WPToast.error('Could not delete.'); }
    });
  }

  function destroy() {}
  return { init, destroy, _edit, _delete };
})();
