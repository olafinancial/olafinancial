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
      <div class="page-theme-expenses">
      <div class="page-header">
        <div>
          <h1 class="page-title">Income Statement · Expenses</h1>
          <p class="page-subtitle">Track and categorize your spending</p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <select id="expense-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="add-expense-btn">&#x2795; Log Expense</button>
        </div>
      </div>
      <div class="page-body">
        <!-- Mini Goal Widget -->
        <div class="card" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;padding:1.5rem">
          <div>
            <div class="section-title" style="margin:0;font-size:1.1rem">🎯 Expense Minimisation Goal</div>
            <p style="font-size:0.85rem;color:var(--clr-text-2);margin:0.25rem 0 0">Control your discretionary spending: track targets dynamically.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="location.hash='#/goals'">Manage Budget Goals</button>
        </div>
        <div class="kpi-grid" id="expense-kpis" style="margin-bottom:1.5rem"></div>
        <!-- Insights Strip -->
        <div id="expense-insights" style="display:none"></div>
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
      </div>
      </div>`;

    document.getElementById('add-expense-btn').addEventListener('click', () => _openForm());
    document.getElementById('exp-filter-btn').addEventListener('click', async () => {
      _startDate = document.getElementById('exp-start').value;
      _endDate   = document.getElementById('exp-end').value;
      await _load();
    });

    const curSelect = document.getElementById('expense-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_expenses') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_expenses', e.target.value);
        _renderKPIs();
        _renderTable();
        _renderBudgetRule();
      });
    }

    await _load();
  }

  async function _load() {
    try {
      _entries = await WPDb.getExpensesByDateRange(WPApp.state.user.id, _startDate, _endDate);
      _renderKPIs();
      _renderTable();
      if (_entries.length > 0) { WPCharts.expenseDonut('chart-exp-donut', _entries); _renderBudgetRule(); }
      // Insights
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const total = _entries.reduce((s,e) => s + WPUtils.convert(e.amount||0, WPUtils.getEntryCurrency(e.description), baseCur), 0);
      const foodCats = ['food','dining','restaurant','grocery','groceries'];
      const foodTotal = _entries.filter(e => foodCats.includes((e.category||'').toLowerCase()))
        .reduce((s,e) => s + WPUtils.convert(e.amount||0, WPUtils.getEntryCurrency(e.description), baseCur), 0);
      const subCats = ['subscription','subscriptions'];
      const subTotal = _entries.filter(e => subCats.includes((e.category||'').toLowerCase()))
        .reduce((s,e) => s + WPUtils.convert(e.amount||0, WPUtils.getEntryCurrency(e.description), baseCur), 0);
      WPInsights.evaluate('expenses', {
        expenseCount:      _entries.length,
        foodRatio:         total > 0 ? foodTotal / total : 0,
        subscriptionTotal: subTotal,
        hasBudgetGoal:     true, // Future: check goals table for expense targets
        spendingGrowth:    0,    // Future: compare vs prior month snapshot
      }, document.getElementById('expense-insights'));
    } catch (err) { WPToast.error('Failed to load expenses.'); }
  }

  function _renderKPIs() {
    const baseCurrency = localStorage.getItem('wp_page_currency_expenses') || WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const total = _entries.reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.description);
      return s + WPUtils.convert(e.amount||0, cur, baseCurrency);
    }, 0);
    const disc = _entries.filter(e => e.is_discretionary).reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.description);
      return s + WPUtils.convert(e.amount||0, cur, baseCurrency);
    }, 0);
    const nonDisc = total - disc;
    const recur = _entries.filter(e => e.is_recurring).reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.description);
      return s + WPUtils.convert(e.amount||0, cur, baseCurrency);
    }, 0);

    document.getElementById('expense-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Expenses</div><div class="card-value expense">${WPUtils.fmt(total, { currency: baseCurrency })}</div><div class="card-meta">${_entries.length} transactions</div></div>
      <div class="card"><div class="card-title">Essential (Needs)</div><div class="card-value expense">${WPUtils.fmt(nonDisc, { currency: baseCurrency })}</div><div class="card-meta">${WPUtils.fmtPct(nonDisc/Math.max(1,total))} of total</div></div>
      <div class="card"><div class="card-title">Discretionary (Wants)</div><div class="card-value expense">${WPUtils.fmt(disc, { currency: baseCurrency })}</div><div class="card-meta">${WPUtils.fmtPct(disc/Math.max(1,total))} of total</div></div>
      <div class="card"><div class="card-title">Recurring</div><div class="card-value expense">${WPUtils.fmt(recur, { currency: baseCurrency })}</div><div class="card-meta">${_entries.filter(e=>e.is_recurring).length} recurring items</div></div>`;
  }

  function _renderTable() {
    const pageCurrency = localStorage.getItem('wp_page_currency_expenses') || WPApp.state.profile?.currency || 'NGN';
    const wrap = document.getElementById('expense-table');
    if (!_entries.length) {
      wrap.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--clr-text-2)">No expenses in this date range. Click "Log Expense" to add one.</div>';
      return;
    }
    const sorted = [..._entries].sort((a,b) => new Date(b.expense_date) - new Date(a.expense_date));
    wrap.innerHTML = `<table>
      <thead><tr>
        <th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Type</th><th></th>
      </tr></thead>
      <tbody>${sorted.map(e => {
        const cur = WPUtils.getEntryCurrency(e.description);
        const cleanDesc = (e.description || '')
          .replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '')
          .replace(/\[freq:[^\]]+\]/g, '')
          .replace(/\[prepaid:\d+\]/g, '')
          .trim();
        const convertedAmount = WPUtils.convert(e.amount||0, cur, pageCurrency);

        const freqMatch = (e.description || '').match(/\[freq:([^\]]+)\]/);
        let freqText = '';
        if (freqMatch) {
          const rawFreq = freqMatch[1];
          freqText = rawFreq.startsWith('custom:') ? rawFreq.replace('custom:','') : rawFreq;
        }

        const prepaidMatch = (e.description || '').match(/\[prepaid:(\d+)\]/);
        let prepaidText = '';
        let amortizedCostLabel = '';
        if (prepaidMatch) {
          const months = parseInt(prepaidMatch[1]);
          prepaidText = `<span class="badge badge-gold" style="margin-left:4px">Prepaid (${months}M)</span>`;
          const amortizedKobo = Math.round((e.amount || 0) / months);
          const amortizedPage = WPUtils.convert(amortizedKobo, cur, pageCurrency);
          amortizedCostLabel = `<br><span class="text-xs text-accent">Amortised: ${WPUtils.fmt(amortizedPage, { currency: pageCurrency })}/month</span>`;
        }

        return `<tr>
          <td class="text-muted text-sm">${WPUtils.fmtDate(e.expense_date)}</td>
          <td>
            <strong>${cleanDesc||'—'}</strong>
            ${e.merchant?`<br><span class="text-xs text-muted">${e.merchant}</span>`:''}
            ${amortizedCostLabel}
          </td>
          <td><span class="badge badge-neutral">${e.category}</span></td>
          <td class="td-mono amount-expense fw-600">${WPUtils.fmt(convertedAmount, { currency: pageCurrency })}</td>
          <td>
            <span class="badge ${e.is_discretionary?'badge-gold':'badge-neutral'}">${e.is_discretionary?'Want':'Need'}</span>
            ${e.is_recurring?`<span class="badge badge-info" style="margin-left:4px">Recurring${freqText?` (${freqText})`:''}</span>`:''}
            ${prepaidText}
            ${e.category==='Investment'?`<span class="badge badge-accent" style="margin-left:4px" title="Double entry: Flowed to Asset Side">→ Asset</span>`:''}
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="WPExpenses._edit('${e.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="WPExpenses._delete('${e.id}')">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function _renderBudgetRule() {
    const baseCurrency = WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const total = _entries.reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.description);
      return s + WPUtils.convert(e.amount||0, cur, baseCurrency);
    }, 0);
    if (!total) return;
    const nonDisc = _entries.filter(e => !e.is_discretionary).reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.description);
      return s + WPUtils.convert(e.amount||0, cur, baseCurrency);
    }, 0);
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
    const currencyCode = WPUtils.getEntryCurrency(e.description);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

    const cats = [
      'Communication',
      'Dining Out',
      'Education',
      'Entertainment',
      'Family Support',
      'Food',
      'Gifts & Charity',
      'Health',
      'Housing',
      'Insurance',
      'Interest & Debt',
      'Investment',
      'Land Use Act/Tenement Rate',
      'Security',
      'Shopping',
      'Taxes',
      'Transportation',
      'Utilities-Power Generation',
      'Utilities-Refuse',
      'Utilities-Water',
      'Other'
    ];
    const assetTypes = [
      { value: 'alternative', label: 'Alternative Investments' },
      { value: 'commodities', label: 'Commodities' },
      { value: 'crypto', label: 'Crypto' },
      { value: 'currency', label: 'Foreign Currency Account' },
      { value: 'equity', label: 'Equities / Stocks / ETFs' },
      { value: 'fixed_deposit', label: 'Fixed Deposit / CD / T-Bill' },
      { value: 'forex', label: 'Forex' },
      { value: 'retirement_contribution', label: 'Retirement Contribution (RSA / AVC / Gratuity)' },
      { value: 'property', label: 'Property / Real Estate' },
      { value: 'savings', label: 'Savings Account' },
      { value: 'other', label: 'Other Asset' }
    ];
    const body = `
      <form id="exp-form">
        <div class="form-row">
          <div class="form-group">
            <label for="ef-currency">Currency</label>
            <select class="select" id="ef-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
              <option value="AED" ${currencyCode==='AED'?'selected':''}>AED (د.إ)</option>
              <option value="CNY" ${currencyCode==='CNY'?'selected':''}>CNY (¥)</option>
              <option value="XOF" ${currencyCode==='XOF'?'selected':''}>XOF (CFA)</option>
              <option value="XAF" ${currencyCode==='XAF'?'selected':''}>XAF (FCFA)</option>
              <option value="KES" ${currencyCode==='KES'?'selected':''}>KES (KSh)</option>
              <option value="GHS" ${currencyCode==='GHS'?'selected':''}>GHS (GH₵)</option>
              <option value="CAD" ${currencyCode==='CAD'?'selected':''}>CAD (CA$)</option>
              <option value="ZAR" ${currencyCode==='ZAR'?'selected':''}>ZAR (R)</option>
              <option value="SAR" ${currencyCode==='SAR'?'selected':''}>SAR (ر.س)</option>
              <option value="AUD" ${currencyCode==='AUD'?'selected':''}>AUD (A$)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ef-date">Date</label>
            <input class="input" type="date" id="ef-date" value="${e.expense_date||new Date().toISOString().slice(0,10)}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="ef-amount">Amount (${symbol})</label>
            <div class="input-prefix-group">
              <span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="ef-amount" value="${e.amount?WPUtils.koboToNaira(e.amount):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="ef-cat">Category</label>
            <select class="select" id="ef-cat">
              ${cats.map(c => `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <!-- Budget bucket tip for Savings & Debt (#46) -->
        <div id="exp-budget-bucket-tip" style="display:none; border: 1px solid var(--clr-border); background:var(--clr-surface-2); padding: 0.75rem 1rem; border-radius: 8px; margin: 0.75rem 0; font-size:0.8rem; color:var(--clr-text-2)">
        </div>

        <!-- Double Entry Asset Sub-form (shown only when Category === Investment) -->
        <div id="exp-asset-subform" style="display:none; border: 1px dashed var(--clr-accent); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          <h4 style="margin-top:0; color:var(--clr-accent); font-weight:700;">🌱 Double Entry: Create Asset</h4>
          <p style="font-size:0.75rem; color:var(--clr-text-2); margin-bottom:1rem">Since you selected 'Investment', this expense will automatically flow to your Balance Sheet as an asset. It also counts toward <strong>Budget → Savings &amp; Debt Payoff</strong>.</p>
          <div class="form-row">
            <div class="form-group">
              <label for="ef-asset-type">Asset Type</label>
              <select class="select" id="ef-asset-type">
                ${assetTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="ef-retirement-sub-container" style="display:none">
              <label for="ef-retirement-sub">Retirement Sub-type</label>
              <select class="select" id="ef-retirement-sub">
                <option value="rsa">RSA (Regular Pension)</option>
                <option value="avc">AVC (Additional Voluntary Contribution)</option>
                <option value="gratuity">Gratuity</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="ef-asset-inst">Institution / Broker Name</label>
              <input class="input" id="ef-asset-inst" placeholder="e.g. Stanbic IBTC, Bamboo, Cowrywise">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="ef-desc">Description</label>
          <input class="input" id="ef-desc" value="${e.description?e.description.replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').replace(/\[freq:[^\]]+\]/g, '').trim():''}" placeholder="e.g. Monthly rent, Groceries">
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
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ef-prepaid" ${e.description && e.description.includes('[prepaid:') ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">Prepaid Expense (e.g. rent paid in advance)</span>
          </div>
        </div>

        <!-- Prepaid amortization months selector -->
        <div id="ef-prepaid-container" style="display:none; margin-top:0.75rem;">
          <div class="form-row">
            <div class="form-group">
              <label for="ef-prepaid-months">Amortisation Period (Months)</label>
              <input class="input" type="number" id="ef-prepaid-months" min="1" max="60" placeholder="e.g. 12 or 24">
            </div>
          </div>
        </div>

        <!-- Frequency select dropdown -->
        ${(() => {
          const freqMatch = (e.description || '').match(/\[freq:([^\]]+)\]/);
          const freq = freqMatch ? freqMatch[1] : '';
          const isCustom = freq.startsWith('custom:');
          return `
          <div id="ef-recur-freq-container" style="display:${e.is_recurring?'block':'none'};margin-top:0.75rem">
            <div class="form-row">
              <div class="form-group">
                <label for="ef-freq">Frequency</label>
                <select class="select" id="ef-freq">
                  <option value="weekly" ${freq==='weekly'?'selected':''}>Weekly</option>
                  <option value="bi-weekly" ${freq==='bi-weekly'?'selected':''}>Bi-weekly</option>
                  <option value="monthly" ${freq==='monthly'||!freq?'selected':''}>Monthly</option>
                  <option value="quarterly" ${freq==='quarterly'?'selected':''}>Quarterly</option>
                  <option value="annually" ${freq==='annually'?'selected':''}>Annually</option>
                  <option value="custom" ${isCustom?'selected':''}>Custom (specify)</option>
                </select>
              </div>
              <div class="form-group" id="ef-freq-custom-container" style="display:${isCustom?'block':'none'}">
                <label for="ef-freq-custom">Specify Custom Frequency</label>
                <input class="input" id="ef-freq-custom" value="${isCustom?freq.replace('custom:',''):''}" placeholder="e.g. Every 10 days">
              </div>
            </div>
          </div>`;
        })()}
      </form>`;

    WPModal.open(existing ? 'Edit Expense' : 'Log Expense', body, {
      confirmLabel: existing ? 'Update' : 'Add Expense',
      onConfirm: async () => { await _save(e.id); },
    });
    const amountInput = document.getElementById('ef-amount');
    const currencySelect = document.getElementById('ef-currency');
    WPUtils.maskNumberInput(amountInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelector('#exp-form .input-prefix').textContent = newSym;
      document.querySelector('label[for="ef-amount"]').textContent = `Amount (${newSym})`;
    });

    const recurToggle = document.getElementById('ef-recur');
    const freqContainer = document.getElementById('ef-recur-freq-container');
    const freqSelect = document.getElementById('ef-freq');
    const customContainer = document.getElementById('ef-freq-custom-container');

    const catSelect = document.getElementById('ef-cat');
    const assetSubform = document.getElementById('exp-asset-subform');
    const assetTypeSelect = document.getElementById('ef-asset-type');
    const retirementContainer = document.getElementById('ef-retirement-sub-container');

    if (catSelect && assetSubform) {
      const budgetTip = document.getElementById('exp-budget-bucket-tip');
      const toggleSubform = () => {
        const v = catSelect.value;
        assetSubform.style.display = v === 'Investment' ? 'block' : 'none';
        if (budgetTip) {
          if (v === 'Investment') {
            budgetTip.style.display = 'block';
            budgetTip.innerHTML = '📈 Counts in <a href="#/budget" style="color:var(--clr-accent)">Budget Planner</a> as <strong>Savings &amp; Debt Payoff</strong> (investing).';
          } else if (v === 'Interest & Debt') {
            budgetTip.style.display = 'block';
            budgetTip.innerHTML = '💳 Counts in <a href="#/budget" style="color:var(--clr-accent)">Budget Planner</a> as <strong>Savings &amp; Debt Payoff</strong> (debt repayment). Adding a liability alone is not enough — log the payment here or set a monthly payment on the liability.';
          } else {
            budgetTip.style.display = 'none';
            budgetTip.innerHTML = '';
          }
        }
      };
      catSelect.addEventListener('change', toggleSubform);
      toggleSubform();
    }

    if (assetTypeSelect && retirementContainer) {
      const toggleRetirement = () => {
        retirementContainer.style.display = assetTypeSelect.value === 'retirement_contribution' ? 'block' : 'none';
      };
      assetTypeSelect.addEventListener('change', toggleRetirement);
      toggleRetirement();
    }

    const prepaidToggle = document.getElementById('ef-prepaid');
    const prepaidContainer = document.getElementById('ef-prepaid-container');
    const prepaidMonthsInput = document.getElementById('ef-prepaid-months');

    if (prepaidToggle && prepaidContainer) {
      const togglePrepaid = () => {
        prepaidContainer.style.display = prepaidToggle.checked ? 'block' : 'none';
      };
      prepaidToggle.addEventListener('change', togglePrepaid);

      // Parse existing prepaid value if present
      if (e.description && e.description.includes('[prepaid:')) {
        const match = e.description.match(/\[prepaid:(\d+)\]/);
        if (match) {
          prepaidMonthsInput.value = match[1];
        }
      }
      togglePrepaid();
    }

    if (recurToggle && freqContainer) {
      recurToggle.addEventListener('change', (ev) => {
        freqContainer.style.display = ev.target.checked ? 'block' : 'none';
      });
    }
    if (freqSelect && customContainer) {
      freqSelect.addEventListener('change', (ev) => {
        customContainer.style.display = ev.target.value === 'custom' ? 'block' : 'none';
      });
    }
  }
  async function _save(existingId) {
    const amount = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ef-amount').value));
    if (!amount) { WPToast.warning('Please enter an amount.'); return false; }
    const descVal = document.getElementById('ef-desc').value.trim();
    const currency = document.getElementById('ef-currency').value;

    const isRecur = document.getElementById('ef-recur').checked;
    let freq = '';
    if (isRecur) {
      const selectedFreq = document.getElementById('ef-freq').value;
      if (selectedFreq === 'custom') {
        const customVal = document.getElementById('ef-freq-custom').value.trim();
        freq = `custom:${customVal || 'Other'}`;
      } else {
        freq = selectedFreq;
      }
    }

    const isPrepaid = document.getElementById('ef-prepaid').checked;
    let prepaidMonths = 0;
    if (isPrepaid) {
      prepaidMonths = parseInt(document.getElementById('ef-prepaid-months').value) || 12;
    }

    let cleanDesc = descVal
      .replace(/\[freq:[^\]]+\]/g, '')
      .replace(/\[prepaid:\d+\]/g, '')
      .trim();

    if (freq) {
      cleanDesc = `${cleanDesc} [freq:${freq}]`.trim();
    }
    if (isPrepaid) {
      cleanDesc = `${cleanDesc} [prepaid:${prepaidMonths}]`.trim();
    }
    const finalDesc = WPUtils.setEntryCurrency(cleanDesc, currency);

    const cat = document.getElementById('ef-cat').value;
    const isInvestment = cat === 'Investment';

    const row = {
      user_id:          WPApp.state.user.id,
      expense_date:     document.getElementById('ef-date').value,
      amount,
      category:         cat,
      description:      isInvestment ? `[Investment] ${finalDesc}`.trim() : finalDesc,
      merchant:         document.getElementById('ef-merchant').value.trim(),
      is_discretionary: document.getElementById('ef-disc').checked,
      is_recurring:     document.getElementById('ef-recur').checked,
    };
    try {
      if (existingId) {
        await WPDb.update('expense_entries', existingId, row);
      } else {
        await WPDb.insert('expense_entries', row);
        
        // Flow to Asset side on balance sheet if newly added investment
        if (isInvestment) {
          const typeVal = document.getElementById('ef-asset-type').value;
          const instVal = document.getElementById('ef-asset-inst').value.trim() || 'Double Entry';
          
          let notes = `[Double Entry from Expense] [${currency}]`;
          if (typeVal === 'retirement_contribution') {
            const subType = document.getElementById('ef-retirement-sub').value;
            notes = `[Double Entry from Expense] [sub:${subType}] [${currency}]`;
          }

          const assetRow = {
            user_id:            WPApp.state.user.id,
            asset_name:         descVal || 'Investment Asset',
            asset_type:         typeVal,
            institution_name:   instVal,
            open_balance:       amount,
            close_balance:      amount,
            period_month:       row.expense_date.slice(0, 7) + '-01',
            is_income_generating: true,
            notes:              notes,
          };
          await WPDb.insert('assets', assetRow);
          WPToast.success('Double-entry: Asset created on Balance Sheet!');
        }
      }
      WPToast.success(existingId ? 'Expense updated.' : 'Expense logged.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); return false; }
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
