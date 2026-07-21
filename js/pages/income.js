// ============================================================
// OlaFinancial — Income Page
// ============================================================

const WPIncome = (() => {

  let _entries = [];
  const PERIOD = WPUtils.currentPeriod();

  /** Parse NTA 2025 relief tags stored in income notes (kobo integers). */
  function _parseDeductionTags(notes) {
    const out = { nhis: null, mortgage: 0, life: 0, rent: 0 };
    if (!notes || typeof notes !== 'string') return out;
    const n = notes.match(/\[nhis:(\d+)\]/i);
    const m = notes.match(/\[mortgage_int:(\d+)\]/i);
    const l = notes.match(/\[life_ins:(\d+)\]/i);
    const r = notes.match(/\[annual_rent:(\d+)\]/i);
    if (n) out.nhis = parseInt(n[1], 10) || 0;
    if (m) out.mortgage = parseInt(m[1], 10) || 0;
    if (l) out.life = parseInt(l[1], 10) || 0;
    if (r) out.rent = parseInt(r[1], 10) || 0;
    return out;
  }

  function _stripDeductionTags(notes) {
    return (notes || '')
      .replace(/\[nhis:\d+\]/gi, '')
      .replace(/\[mortgage_int:\d+\]/gi, '')
      .replace(/\[life_ins:\d+\]/gi, '')
      .replace(/\[annual_rent:\d+\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _periodDivisor(freq) {
    if (freq === 'annual') return 1;
    if (freq === 'semiannual') return 2;
    if (freq === 'quarterly') return 4;
    if (freq === 'biweekly') return 26;
    return 12; // monthly
  }

  function _toAnnual(periodKobo, freq) {
    const d = _periodDivisor(freq);
    return d === 1 ? periodKobo : Math.round(periodKobo * d);
  }

  function _toPeriod(annualKobo, freq) {
    const d = _periodDivisor(freq);
    return d === 1 ? annualKobo : Math.round(annualKobo / d);
  }

  async function init(container) {
    container.innerHTML = `
      <div class="page-theme-income">
      <div class="page-header">
        <div>
          <h1 class="page-title">Income Statement · Income</h1>
          <p class="page-subtitle">Track all income sources for ${WPUtils.periodLabel(PERIOD)}</p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <select id="income-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
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
          <button class="btn btn-primary" id="add-income-btn">&#x2795; Add Income Source</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <!-- Insights Strip -->
        <div id="income-insights" style="display:none"></div>

        <!-- Mini Goal Widget -->
        <div class="card" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;padding:1.5rem">
          <div>
            <div class="section-title" style="margin:0;font-size:1.1rem">🎯 Income Target Goal</div>
            <p style="font-size:0.85rem;color:var(--clr-text-2);margin:0.25rem 0 0">Increase your gross income: current target set via goals page.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="location.hash='#/goals'">Manage Income Goals</button>
        </div>

        <div class="kpi-grid" id="income-kpis" style="margin-bottom:1.5rem"></div>
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">Income Segments (Active vs Passive vs Investment)</div>
          <div id="income-segments-visualizer"></div>
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
        ${(WPApp.state.profile?.state && WPApp.state.profile?.state !== 'non_resident') ? `
        <div class="card" style="margin-top:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4CA; Nigeria Tax Act 2025 — Tax Estimator</div>
          <div class="form-row">
            <div class="form-group">
              <label for="te-gross">Annual Gross Emoluments (&#x20A6;)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">&#x20A6;</span>
                <input class="input" type="text" inputmode="decimal" id="te-gross" placeholder="e.g. 3,600,000">
              </div>
            </div>
            <div class="form-group">
              <label for="te-rent">Annual Rent Paid (&#x20A6;)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">&#x20A6;</span>
                <input class="input" type="text" inputmode="decimal" id="te-rent" placeholder="e.g. 600,000">
              </div>
            </div>
          </div>
          <button class="btn btn-secondary" id="te-calc-btn">Calculate Tax</button>
          <div id="te-result" style="margin-top:1rem"></div>
        </div>` : `
        <div class="card" style="margin-top:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F4CA; Nigeria Tax Act 2025 — Tax Estimator</div>
          <div style="padding:1.5rem;background:rgba(255,255,255,0.01);border-radius:8px;border:1px solid var(--clr-border);line-height:1.6;font-size:0.92rem;color:var(--clr-text-2)">
            ℹ️ <strong>Disclaimer</strong>: Tax and tax estimator features only apply to Nigerian Residents. Since your residency is configured as Non-Resident, tax calculations are not applicable.
          </div>
        </div>`}
      </div>
      </div>`;

    document.getElementById('add-income-btn').addEventListener('click', () => _openForm());
    document.getElementById('income-type-filter').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('#income-type-filter .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      _renderTable(btn.dataset.type);
    });
    const calcBtn = document.getElementById('te-calc-btn');
    if (calcBtn) calcBtn.addEventListener('click', _runTaxEstimator);

    const teGross = document.getElementById('te-gross');
    const teRent = document.getElementById('te-rent');
    if (teGross) WPUtils.maskNumberInput(teGross);
    if (teRent) WPUtils.maskNumberInput(teRent);

    const curSelect = document.getElementById('income-page-currency');
    if (curSelect) {
      curSelect.value = localStorage.getItem('wp_page_currency_income') || WPApp.state.profile?.currency || 'NGN';
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_income', e.target.value);
        _renderKPIs();
        _renderTable(document.querySelector('#income-type-filter .tab-btn.active')?.dataset.type || 'all');
        _renderSegments(e.target.value);
      });
    }

    await _load();
  }

  async function _load() {
    try {
      _entries = await WPDb.getIncomeByPeriod(WPApp.state.user.id, PERIOD);
      _renderKPIs();
      _renderTable('all');
      _renderSegments(pageCurrency);
      // Insights
      const currencies = [...new Set(_entries.map(e => WPUtils.getEntryCurrency(e.notes)))];
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const totalGross = _entries.reduce((s,e) => s + WPUtils.convert(e.gross_amount||0, WPUtils.getEntryCurrency(e.notes), baseCur), 0);
      const totalTax   = _entries.reduce((s,e) => s + WPUtils.convert(e.paye_tax||0, WPUtils.getEntryCurrency(e.notes), baseCur), 0);
      WPInsights.evaluate('income', {
        sourceCount:        _entries.length,
        hasForeignCurrency: currencies.some(c => c !== 'NGN'),
        hasPassive:         _entries.some(e => e.income_type === 'passive' || e.income_type === 'investment'),
        effectiveTaxRate:   totalGross > 0 ? totalTax / totalGross : 0,
      }, document.getElementById('income-insights'));
    } catch (err) { WPToast.error('Failed to load income data.'); }
  }

  function _renderKPIs() {
    const baseCurrency = localStorage.getItem('wp_page_currency_income') || WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const isResident = WPApp.state.profile?.state && WPApp.state.profile?.state !== 'non_resident';

    const totalGross = _entries.reduce((s, e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert(e.gross_amount||0, cur, baseCurrency);
    }, 0);
    const totalTax   = isResident ? _entries.reduce((s, e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert(e.paye_tax||0, cur, baseCurrency);
    }, 0) : 0;
    const totalPen   = _entries.reduce((s, e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert(e.pension_contrib||0, cur, baseCurrency);
    }, 0);
    const totalOther = _entries.reduce((s, e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert((e.nhf_contrib||0) + (e.other_deductions||0), cur, baseCurrency);
    }, 0);
    const totalNet   = totalGross - totalTax - totalPen - totalOther;
    const passive    = _entries.filter(e => e.income_type==='passive').reduce((s,e) => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      return s + WPUtils.convert(e.gross_amount||0, cur, baseCurrency);
    }, 0);

    const taxFmt = isResident ? WPUtils.fmt(totalTax, { currency: baseCurrency }) : 'N/A (Non-Resident)';
    const taxMeta = isResident ? `Effective rate: ${WPUtils.fmtPct(totalTax/Math.max(1,totalGross))}` : 'Tax applies to Nigerian Residents only';

    document.getElementById('income-kpis').innerHTML = `
      <div class="card"><div class="card-title">Total Gross Income</div><div class="card-value income">${WPUtils.fmt(totalGross, { currency: baseCurrency })}</div><div class="card-meta">${_entries.length} source${_entries.length!==1?'s':''}</div></div>
      <div class="card"><div class="card-title">Total Net Income</div><div class="card-value income">${WPUtils.fmt(totalNet, { currency: baseCurrency })}</div><div class="card-meta">After all deductions</div></div>
      <div class="card"><div class="card-title">Tax</div><div class="card-value danger">${taxFmt}</div><div class="card-meta">${taxMeta}</div></div>
      <div class="card"><div class="card-title">Pension (8%)</div><div class="card-value gold">${WPUtils.fmt(totalPen, { currency: baseCurrency })}</div><div class="card-meta">PENCOM contributory scheme</div></div>
      <div class="card"><div class="card-title">Passive Income</div><div class="card-value income">${WPUtils.fmt(passive, { currency: baseCurrency })}</div><div class="card-meta">${WPUtils.fmtPct(passive/Math.max(1,totalGross))} of total income</div></div>`;
  }

  function _renderTable(type = 'all') {
    const pageCurrency = localStorage.getItem('wp_page_currency_income') || WPApp.state.profile?.currency || 'NGN';
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
        <th>Source</th><th>Type</th><th>Gross</th><th>Tax</th><th>Pension</th><th>Net Income</th><th>Frequency</th><th></th>
      </tr></thead>
      <tbody>${filtered.map(e => {
        const net = (e.gross_amount||0)-(e.paye_tax||0)-(e.pension_contrib||0)-(e.nhf_contrib||0)-(e.other_deductions||0);
        const typeBadge = {active:'badge-info',passive:'badge-gold',investment:'badge-accent'}[e.income_type]||'badge-neutral';
        const cur = WPUtils.getEntryCurrency(e.notes);
        const cleanNotes = (e.notes || '').replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').trim();

        const convertedGross = WPUtils.convert(e.gross_amount||0, cur, pageCurrency);
        const convertedTax   = WPUtils.convert(e.paye_tax||0, cur, pageCurrency);
        const convertedPension = WPUtils.convert(e.pension_contrib||0, cur, pageCurrency);
        const convertedNet   = WPUtils.convert(net, cur, pageCurrency);

        return `<tr>
          <td><strong>${e.source_name}</strong>${cleanNotes?`<br><span class="text-xs text-muted">${cleanNotes}</span>`:''}</td>
          <td><span class="badge ${typeBadge}">${e.income_type}</span></td>
          <td class="td-mono amount-income">${WPUtils.fmt(convertedGross, { currency: pageCurrency })}</td>
          <td class="td-mono text-danger">${WPUtils.fmt(convertedTax, { currency: pageCurrency })}</td>
          <td class="td-mono text-gold">${WPUtils.fmt(convertedPension, { currency: pageCurrency })}</td>
          <td class="td-mono amount-income fw-700">${WPUtils.fmt(convertedNet, { currency: pageCurrency })}</td>
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
    const grossEl = document.getElementById('te-gross');
    const rentEl = document.getElementById('te-rent');
    if (!grossEl || !rentEl) return;

    const pageCurrency = localStorage.getItem('wp_page_currency_income') || WPApp.state.profile?.currency || 'NGN';
    const grossVal = WPUtils.cleanNum(grossEl.value);
    const rentVal = WPUtils.cleanNum(rentEl.value);

    if (isNaN(grossVal) || grossVal < 0) {
      WPToast.warning("Please enter a valid positive gross emolument.");
      return;
    }

    const gross  = WPUtils.nairaToKobo(grossVal || 0);
    const rent   = WPUtils.nairaToKobo(rentVal || 0);
    const pension = WPUtils.calcPensionEmployee(gross);
    const tax     = WPUtils.calcPIT(gross, pension, rent);
    const net     = gross - tax - pension;
    const effective = WPUtils.effectiveTaxRate(gross, tax);
    const bracket   = WPUtils.taxBracket(gross - pension);

    document.getElementById('te-result').innerHTML = `
      <div class="grid-3" style="gap:1rem">
        <div class="card"><div class="card-title">Annual Tax</div><div class="card-value danger">${WPUtils.fmt(tax, { currency: pageCurrency })}</div><div class="card-meta">Effective rate: ${WPUtils.fmtPct(effective)}</div></div>
        <div class="card"><div class="card-title">Pension Contribution</div><div class="card-value gold">${WPUtils.fmt(pension, { currency: pageCurrency })}</div><div class="card-meta">8% of emoluments (PENCOM)</div></div>
        <div class="card"><div class="card-title">Annual Net Income</div><div class="card-value accent">${WPUtils.fmt(net, { currency: pageCurrency })}</div><div class="card-meta">Monthly: ${WPUtils.fmt(Math.round(net/12), { currency: pageCurrency })}</div></div>
      </div>
      <div class="alert alert-info" style="margin-top:1rem">
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>Your marginal tax bracket is <strong>${bracket.label || '—'}</strong> under the Nigeria Tax Act 2025.
        Rent relief applied: up to ₦500,000 (20% of annual rent).</span>
      </div>`;
  }

  function _openForm(existing = null) {
    const isEdit = !!existing;
    const e = existing || {};
    const currencyCode = WPUtils.getEntryCurrency(e.notes);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="income-form">
        <div class="form-row">
          <div class="form-group">
            <label for="if-currency">Currency</label>
            <select class="select" id="if-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="if-type">Income Type</label>
            <select class="select" id="if-type">
              <option value="active"     ${e.income_type==='active'    ?'selected':''}>Active (Salary / Business)</option>
              <option value="passive"    ${e.income_type==='passive'   ?'selected':''}>Passive (Rent / Royalties)</option>
              <option value="investment" ${e.income_type==='investment'?'selected':''}>Investment (Dividends / Interest)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="if-freq">Frequency</label>
            <select class="select" id="if-freq">
              <option value="biweekly"  ${e.frequency==='biweekly'?'selected':''}>Bi-Weekly</option>
              <option value="monthly"   ${(!e.frequency||e.frequency==='monthly')?'selected':''}>Monthly</option>
              <option value="quarterly" ${e.frequency==='quarterly'?'selected':''}>Quarterly</option>
              <option value="semiannual" ${e.frequency==='semiannual'?'selected':''}>Semi-Annual</option>
              <option value="annual"    ${e.frequency==='annual'   ?'selected':''}>Annual</option>
              <option value="one_time"  ${e.frequency==='one_time' ?'selected':''}>One-Time</option>
            </select>
          </div>
          <div class="form-group">
            <label for="if-name">Source Name</label>
            <input class="input" id="if-name" placeholder="e.g. Dangote Salary, Rental Property, Dividends" value="${e.source_name||''}" required>
          </div>
        </div>
        <div class="form-group">
          <label for="if-gross">Gross Amount (${symbol})</label>
          <div class="input-prefix-group">
            <span class="input-prefix">${symbol}</span>
            <input class="input" type="text" inputmode="decimal" id="if-gross" value="${e.gross_amount?WPUtils.koboToNaira(e.gross_amount):''}" placeholder="0" required>
          </div>
        </div>

        <!-- Active salary: six NTA 2025 §30(2) deductibles → net pay (#75) -->
        <div id="if-salary-panel" style="display:${e.income_type==='active'||!e.income_type?'block':'none'};margin-bottom:1rem;padding:1rem;border:1px solid var(--clr-border);border-radius:10px;background:var(--clr-surface-2)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
            <div class="fw-700" style="font-size:0.95rem">Six tax-free deductions → PAYE &amp; net pay</div>
            <a href="#/calculators" style="font-size:0.8rem;color:var(--clr-accent)" onclick="try{sessionStorage.setItem('wp_calc_tab','salary')}catch(e){}">Full salary calculator →</a>
          </div>
          <p class="text-xs text-muted" style="margin:0 0 0.75rem;line-height:1.45">
            NTA 2025 §30(2): <strong>1 Pension · 2 NHF · 3 NHIS · 4 Mortgage interest (owner-occupied) ·
            5 Life insurance (self/spouse) · 6 Rent relief (20% of rent, max ₦500k)</strong>.
            Items 1–3 usually leave payroll. Items 4–6 lower PAYE only (claim with evidence).
          </p>
          ${(() => {
            const tags = _parseDeductionTags(e.notes || e.deduction_notes || '');
            const nhisVal = tags.nhis != null ? tags.nhis : (e.other_deductions || 0);
            return `
          <div class="form-row">
            <div class="form-group" id="if-pension-group">
              <label for="if-pension">1. Pension / RSA (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-pension" value="${e.pension_contrib?WPUtils.koboToNaira(e.pension_contrib):''}" placeholder="8% emoluments">
              </div>
            </div>
            <div class="form-group">
              <label for="if-nhf">2. NHF (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-nhf" value="${e.nhf_contrib?WPUtils.koboToNaira(e.nhf_contrib):''}" placeholder="2.5% basic">
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="if-nhis">3. NHIS (${symbol} / period)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-nhis" value="${nhisVal?WPUtils.koboToNaira(nhisVal):''}" placeholder="Health insurance">
              </div>
            </div>
            <div class="form-group">
              <label for="if-mortgage">4. Mortgage interest (${symbol} / year)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-mortgage" value="${tags.mortgage?WPUtils.koboToNaira(tags.mortgage):''}" placeholder="Interest only">
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="if-life">5. Life insurance (${symbol} / year)</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-life" value="${tags.life?WPUtils.koboToNaira(tags.life):''}" placeholder="Self + spouse premiums">
              </div>
            </div>
            <div class="form-group">
              <label for="if-rent">6. Annual rent paid (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-rent" value="${tags.rent?WPUtils.koboToNaira(tags.rent):''}" placeholder="For rent relief">
              </div>
              <span class="text-xs text-muted" id="if-rent-hint" style="margin-top:0.25rem;display:block"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" id="if-tax-group">
              <label for="if-tax" id="if-tax-label">PAYE Tax (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-tax" value="${e.paye_tax?WPUtils.koboToNaira(e.paye_tax):''}" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="if-other">Other payroll deductions (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-other" value="" placeholder="Loan, union, etc. (not the six)">
              </div>
            </div>
          </div>`;
          })()}
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-top:0.5rem">
            <button type="button" class="btn btn-secondary btn-sm" id="if-auto-deduct" style="margin-bottom:0.5rem">Auto-calculate all six + PAYE (Tax Act 2025)</button>
            <div class="form-group" style="width:100%;margin-top:0.5rem">
              <label for="if-net">Net Salary (${symbol})</label>
              <div class="input-prefix-group">
                <span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="if-net" placeholder="0">
              </div>
              <span class="text-xs text-muted" style="margin-top:0.25rem;display:block">Gross − Pension − NHF − NHIS − other payroll − PAYE</span>
            </div>
          </div>
        </div>

        <!-- Passive/investment: simpler tax only -->
        <div id="if-simple-tax" style="display:${e.income_type&&e.income_type!=='active'?'block':'none'}">
          <div class="form-group">
            <label for="if-tax-simple">Tax (${symbol})</label>
            <div class="input-prefix-group">
              <span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="if-tax-simple" value="${e.paye_tax?WPUtils.koboToNaira(e.paye_tax):''}" placeholder="0">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="if-notes">Notes (optional)</label>
          <textarea class="textarea" id="if-notes" placeholder="e.g. Includes transport allowance">${e.notes ? _stripDeductionTags(e.notes).replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').trim() : ''}</textarea>
        </div>
      </form>`;

    WPModal.open(isEdit ? 'Edit Income Source' : 'Add Income Source', body, {
      confirmLabel: isEdit ? 'Update' : 'Add Income',
      onConfirm: async () => { return await _save(e.id); },
    });

    const grossInput = document.getElementById('if-gross');
    const taxInput = document.getElementById('if-tax');
    const pensionInput = document.getElementById('if-pension');
    const nhfInput = document.getElementById('if-nhf');
    const nhisInput = document.getElementById('if-nhis');
    const mortgageInput = document.getElementById('if-mortgage');
    const lifeInput = document.getElementById('if-life');
    const rentInput = document.getElementById('if-rent');
    const otherInput = document.getElementById('if-other');
    const taxSimple = document.getElementById('if-tax-simple');
    const currencySelect = document.getElementById('if-currency');
    const typeSelect = document.getElementById('if-type');
    const salaryPanel = document.getElementById('if-salary-panel');
    const simpleTax = document.getElementById('if-simple-tax');
    const taxLabel = document.getElementById('if-tax-label');
    const netInput = document.getElementById('if-net');
    const rentHint = document.getElementById('if-rent-hint');

    // Prefill "other payroll" = other_deductions − NHIS when we can separate
    if (otherInput && e.other_deductions) {
      const tags0 = _parseDeductionTags(e.notes || '');
      const nhisK = tags0.nhis != null ? tags0.nhis : 0;
      const extra = Math.max(0, (e.other_deductions || 0) - nhisK);
      if (extra > 0) otherInput.value = String(WPUtils.koboToNaira(extra));
    }

    [grossInput, taxInput, pensionInput, nhfInput, nhisInput, mortgageInput, lifeInput, rentInput, otherInput, taxSimple, netInput].forEach(el => {
      if (el) WPUtils.maskNumberInput(el);
    });

    let _isUpdatingCalculations = false;

    const payrollOtherNaira = () => {
      const nhis = WPUtils.cleanNum(nhisInput?.value) || 0;
      const extra = WPUtils.cleanNum(otherInput?.value) || 0;
      return nhis + extra;
    };

    const updateRentHint = () => {
      if (!rentHint) return;
      const rentKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(rentInput?.value) || 0);
      const relief = WPUtils.calcRentRelief(rentKobo);
      rentHint.textContent = rentKobo > 0
        ? `Rent relief (item 6): ${WPUtils.fmt(relief)} / year (20%, max ₦500,000)`
        : 'Rent relief = 20% of annual rent, capped at ₦500,000';
    };

    const updateNetDisplay = () => {
      if (_isUpdatingCalculations || !netInput) return;
      _isUpdatingCalculations = true;
      try {
        const type = typeSelect.value;
        const gross = WPUtils.cleanNum(grossInput.value) || 0;
        let tax = 0, pension = 0, nhf = 0, payrollOther = 0;
        if (type === 'active') {
          tax = WPUtils.cleanNum(taxInput?.value) || 0;
          pension = WPUtils.cleanNum(pensionInput?.value) || 0;
          nhf = WPUtils.cleanNum(nhfInput?.value) || 0;
          payrollOther = payrollOtherNaira();
        } else {
          tax = WPUtils.cleanNum(taxSimple?.value) || 0;
        }
        const net = Math.max(0, gross - tax - pension - nhf - payrollOther);
        netInput.value = net > 0 ? net.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';
        updateRentHint();
      } finally {
        _isUpdatingCalculations = false;
      }
    };

    const updateGrossFromNet = () => {
      if (_isUpdatingCalculations || !netInput || !grossInput) return;
      _isUpdatingCalculations = true;
      try {
        const type = typeSelect.value;
        const net = WPUtils.cleanNum(netInput.value) || 0;
        let tax = 0, pension = 0, nhf = 0, payrollOther = 0;
        if (type === 'active') {
          tax = WPUtils.cleanNum(taxInput?.value) || 0;
          pension = WPUtils.cleanNum(pensionInput?.value) || 0;
          nhf = WPUtils.cleanNum(nhfInput?.value) || 0;
          payrollOther = payrollOtherNaira();
        } else {
          tax = WPUtils.cleanNum(taxSimple?.value) || 0;
        }
        const gross = net + tax + pension + nhf + payrollOther;
        grossInput.value = gross > 0 ? gross.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';
      } finally {
        _isUpdatingCalculations = false;
      }
    };

    const autoDeduct = () => {
      const gross = WPUtils.nairaToKobo(WPUtils.cleanNum(grossInput.value) || 0);
      if (!gross) { WPToast.warning('Enter gross amount first.'); return; }
      const freq = document.getElementById('if-freq')?.value || 'monthly';
      const annualGross = _toAnnual(gross, freq);

      // 1 Pension — 8% of emoluments (approx full gross when structure unknown)
      const annualPension = WPUtils.calcPensionEmployee(annualGross);
      const periodPension = _toPeriod(annualPension, freq);

      // 2 NHF — 2.5% of basic; approximate basic ≈ 60% of gross when unknown
      const basicApprox = Math.round(gross * 0.6);
      const periodNhf = WPUtils.calcNHF(basicApprox);

      // 3 NHIS — 1.75% of basic estimate (keep user value if already entered)
      let periodNhis = WPUtils.nairaToKobo(WPUtils.cleanNum(nhisInput?.value) || 0);
      if (!periodNhis) {
        periodNhis = WPUtils.calcNHIS ? WPUtils.calcNHIS(basicApprox) : Math.round(basicApprox * 0.0175);
      }

      // 4–6 annual claim-based (use entered values)
      const mortgageAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(mortgageInput?.value) || 0);
      const lifeAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(lifeInput?.value) || 0);
      const rentAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(rentInput?.value) || 0);

      const annualTax = WPUtils.calcPIT(annualGross, {
        pension: annualPension,
        nhf: _toAnnual(periodNhf, freq),
        nhis: _toAnnual(periodNhis, freq),
        annualRent: rentAnnual,
        mortgageInterest: mortgageAnnual,
        lifeInsurance: lifeAnnual,
      });
      const periodTax = _toPeriod(annualTax, freq);

      if (pensionInput) pensionInput.value = WPUtils.koboToNaira(periodPension).toFixed(0);
      if (nhfInput) nhfInput.value = WPUtils.koboToNaira(periodNhf).toFixed(0);
      if (nhisInput) nhisInput.value = WPUtils.koboToNaira(periodNhis).toFixed(0);
      if (taxInput) taxInput.value = WPUtils.koboToNaira(periodTax).toFixed(0);
      [taxInput, pensionInput, nhfInput, nhisInput].forEach(el => el?.dispatchEvent(new Event('input')));
      updateNetDisplay();
      WPToast.info('All six deductibles applied for PAYE. Edit amounts as needed before saving.');
    };

    const updateFormLayout = () => {
      const isCur = currencySelect.value;
      const sym = symbols[isCur] || '₦';
      const type = typeSelect.value;
      const active = type === 'active';

      if (salaryPanel) salaryPanel.style.display = active ? 'block' : 'none';
      if (simpleTax) simpleTax.style.display = active ? 'none' : 'block';
      if (taxLabel) taxLabel.textContent = `PAYE Tax (${sym})`;
      document.querySelectorAll('#income-form .input-prefix').forEach(span => { span.textContent = sym; });
      document.querySelector('label[for="if-gross"]').textContent = `Gross Amount (${sym})`;
      updateNetDisplay();
    };

    typeSelect.addEventListener('change', updateFormLayout);
    currencySelect.addEventListener('change', updateFormLayout);
    [grossInput, taxInput, pensionInput, nhfInput, nhisInput, mortgageInput, lifeInput, rentInput, otherInput, taxSimple].forEach(el => {
      el?.addEventListener('input', updateNetDisplay);
    });
    netInput?.addEventListener('input', updateGrossFromNet);
    document.getElementById('if-auto-deduct')?.addEventListener('click', autoDeduct);
    document.getElementById('if-freq')?.addEventListener('change', () => {
      if (typeSelect.value === 'active') updateNetDisplay();
    });
    updateFormLayout();
  }

  async function _save(existingId = null) {
    const grossKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-gross').value) || 0);
    const notesVal = document.getElementById('if-notes').value.trim();
    const currency = document.getElementById('if-currency').value;
    const type = document.getElementById('if-type').value;
    const isActive = type === 'active';
    const freq = document.getElementById('if-freq')?.value || 'monthly';

    let taxVal = 0, pensionVal = 0, nhfVal = 0, otherVal = 0;
    let nhisKobo = 0, mortgageAnnual = 0, lifeAnnual = 0, rentAnnual = 0;

    if (isActive) {
      taxVal = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-tax')?.value) || 0);
      pensionVal = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-pension')?.value) || 0);
      nhfVal = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-nhf')?.value) || 0);
      nhisKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-nhis')?.value) || 0);
      mortgageAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-mortgage')?.value) || 0);
      lifeAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-life')?.value) || 0);
      rentAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-rent')?.value) || 0);
      const extraPayroll = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-other')?.value) || 0);
      otherVal = nhisKobo + extraPayroll;

      // Auto-fill if core deductibles empty but gross present
      if (!taxVal && !pensionVal && !nhfVal && !nhisKobo && grossKobo) {
        const annualGross = _toAnnual(grossKobo, freq);
        const annualPension = WPUtils.calcPensionEmployee(annualGross);
        const basicApprox = Math.round(grossKobo * 0.6);
        pensionVal = _toPeriod(annualPension, freq);
        nhfVal = WPUtils.calcNHF(basicApprox);
        nhisKobo = WPUtils.calcNHIS ? WPUtils.calcNHIS(basicApprox) : Math.round(basicApprox * 0.0175);
        otherVal = nhisKobo + extraPayroll;
        taxVal = _toPeriod(WPUtils.calcPIT(annualGross, {
          pension: annualPension,
          nhf: _toAnnual(nhfVal, freq),
          nhis: _toAnnual(nhisKobo, freq),
          annualRent: rentAnnual,
          mortgageInterest: mortgageAnnual,
          lifeInsurance: lifeAnnual,
        }), freq);
      }
    } else {
      taxVal = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('if-tax-simple')?.value) || 0);
    }

    // Persist relief detail in notes tags (survives re-edit)
    let cleanNotes = _stripDeductionTags(notesVal);
    if (isActive) {
      const tags = [];
      if (nhisKobo > 0) tags.push(`[nhis:${nhisKobo}]`);
      if (mortgageAnnual > 0) tags.push(`[mortgage_int:${mortgageAnnual}]`);
      if (lifeAnnual > 0) tags.push(`[life_ins:${lifeAnnual}]`);
      if (rentAnnual > 0) tags.push(`[annual_rent:${rentAnnual}]`);
      if (tags.length) cleanNotes = `${cleanNotes} ${tags.join(' ')}`.trim();
    }
    const finalNotes = WPUtils.setEntryCurrency(cleanNotes, currency);

    const row = {
      user_id:         WPApp.state.user.id,
      source_name:     document.getElementById('if-name').value.trim(),
      income_type:     type,
      frequency:       freq,
      gross_amount:    grossKobo,
      paye_tax:        taxVal,
      pension_contrib: pensionVal,
      nhf_contrib:     nhfVal,
      other_deductions: otherVal,
      period_month:    PERIOD,
      notes:           finalNotes,
    };
    if (!row.source_name || !row.gross_amount) { WPToast.warning('Name and amount are required.'); return false; }
    try {
      if (existingId) await WPDb.update('income_entries', existingId, row);
      else            await WPDb.insert('income_entries', row);
      const net = grossKobo - taxVal - pensionVal - nhfVal - otherVal;
      WPToast.success(
        existingId
          ? 'Income updated.'
          : `Income added. Net ≈ ₦${WPUtils.koboToNaira(net).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
      );
      await _load();
      return true;
    } catch (err) { WPToast.error('Could not save: ' + err.message); return false; }
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

  function _renderSegments(pageCurrency) {
    const visualizer = document.getElementById('income-segments-visualizer');
    if (!visualizer) return;

    let activeTotal = 0, passiveTotal = 0, investmentTotal = 0;
    _entries.forEach(e => {
      const cur = WPUtils.getEntryCurrency(e.notes);
      const convertedGross = WPUtils.convert(e.gross_amount||0, cur, pageCurrency);
      if (e.income_type === 'active') activeTotal += convertedGross;
      else if (e.income_type === 'passive') passiveTotal += convertedGross;
      else if (e.income_type === 'investment') investmentTotal += convertedGross;
    });

    const grandTotal = activeTotal + passiveTotal + investmentTotal;
    const activePct = grandTotal > 0 ? (activeTotal / grandTotal) * 100 : 0;
    const passivePct = grandTotal > 0 ? (passiveTotal / grandTotal) * 100 : 0;
    const investmentPct = grandTotal > 0 ? (investmentTotal / grandTotal) * 100 : 0;

    visualizer.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Segmented Bar -->
        <div style="display:flex;height:24px;width:100%;border-radius:12px;overflow:hidden;background:var(--clr-surface-3)">
          ${activeTotal > 0 ? `<div style="width:${activePct}%;background:#38BDF8;height:100%" title="Active Income: ${activePct.toFixed(1)}%"></div>` : ''}
          ${passiveTotal > 0 ? `<div style="width:${passivePct}%;background:#F59E0B;height:100%" title="Passive Income: ${passivePct.toFixed(1)}%"></div>` : ''}
          ${investmentTotal > 0 ? `<div style="width:${investmentPct}%;background:#00C896;height:100%" title="Investment Income: ${investmentPct.toFixed(1)}%"></div>` : ''}
        </div>
        <!-- Legend -->
        <div class="grid grid-3" style="gap:1rem">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#38BDF8"></span>
            <div>
              <div class="text-xs text-muted">Active Income</div>
              <div class="fw-700" style="font-size:0.95rem">${WPUtils.fmt(activeTotal, {currency: pageCurrency})} (${activePct.toFixed(1)}%)</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#F59E0B"></span>
            <div>
              <div class="text-xs text-muted">Passive Income</div>
              <div class="fw-700" style="font-size:0.95rem">${WPUtils.fmt(passiveTotal, {currency: pageCurrency})} (${passivePct.toFixed(1)}%)</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#00C896"></span>
            <div>
              <div class="text-xs text-muted">Investment Income</div>
              <div class="fw-700" style="font-size:0.95rem">${WPUtils.fmt(investmentTotal, {currency: pageCurrency})} (${investmentPct.toFixed(1)}%)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function destroy() {}
  return { init, destroy, _edit, _delete };
})();
