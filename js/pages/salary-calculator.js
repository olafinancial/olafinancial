// ============================================================
// OlaFinancial — Salary Calculator & Tax-Year Ledger
// ============================================================

const WPSalaryCalculator = (() => {
  let _chart = null;
  let _monthlyGross = 0;
  let _basicPct = 60;
  let _housingPct = 20;
  let _transportPct = 20;
  let _annualRent = 0;
  let _avc = 0;
  let _pensionEnabled = true;
  let _nhfEnabled = true;
  let _nhisEnabled = true;
  let _historicalIncome = [];

  const PERIOD = WPUtils.currentPeriod();

  /**
   * @param {HTMLElement} container
   * @param {{ embedded?: boolean }} [opts] embedded=true when mounted inside Calculators hub
   */
  async function init(container, opts = {}) {
    destroy();
    const embedded = !!opts.embedded;
    const headerHtml = embedded
      ? `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.25rem">
          <div>
            <h3 style="margin:0;font-weight:700;color:#ffffff">🇳🇬 Salary Calculator (Gross → Net / PAYE)</h3>
            <p class="text-xs text-muted" style="margin:0.35rem 0 0">Interactive gross-to-net, NHF, rent relief &amp; tax-year ledger (Nigeria Tax Act 2025). Replaces the simple PAYE SME tool.</p>
          </div>
          <select id="sc-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>`
      : `
      <div class="page-header">
        <div>
          <h1 class="page-title">Salary Calculator</h1>
          <p class="page-subtitle">Interactive Gross-to-Net breakdown & Tax-Year Ledger (Tax Act 2025)</p>
        </div>
        <div class="flex gap-4" style="align-items:center">
          <select id="sc-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>`;

    container.innerHTML = `
      ${headerHtml}
      <div class="${embedded ? '' : 'page-body'}">
        <div class="grid grid-2" style="gap:1.5rem;margin-bottom:1.5rem">
          <!-- Inputs Card -->
          <div class="card">
            <div class="section-title" style="margin-bottom:1rem">Salary Details</div>
            <form id="sc-form">
              <div class="form-group">
                <label for="sc-gross">Monthly Gross Salary</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-gross" value="500,000" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="sc-basic-pct">Basic Salary (%)</label>
                  <input class="input" type="number" id="sc-basic-pct" value="60" min="0" max="100">
                </div>
                <div class="form-group">
                  <label for="sc-housing-pct">Housing (%)</label>
                  <input class="input" type="number" id="sc-housing-pct" value="20" min="0" max="100">
                </div>
                <div class="form-group">
                  <label for="sc-transport-pct">Transport (%)</label>
                  <input class="input" type="number" id="sc-transport-pct" value="20" min="0" max="100">
                </div>
              </div>
              <div class="form-group">
                <label for="sc-rent">Annual Rent Paid (for Rent Relief)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-rent" value="0">
                </div>
              </div>
              <div class="form-group" style="margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem">
                <div class="toggle-group">
                  <label class="toggle"><input type="checkbox" id="sc-pension-toggle" checked><span class="toggle-slider"></span></label>
                  <span class="toggle-label">Deduct Pension Contribution (8%)</span>
                </div>
                <div class="toggle-group">
                  <label class="toggle"><input type="checkbox" id="sc-nhf-toggle" checked><span class="toggle-slider"></span></label>
                  <span class="toggle-label">Deduct National Housing Fund (NHF 2.5%)</span>
                </div>
                <div class="toggle-group">
                  <label class="toggle"><input type="checkbox" id="sc-nhis-toggle" checked><span class="toggle-slider"></span></label>
                  <span class="toggle-label">Deduct National Health Insurance (NHIS 1.75%)</span>
                </div>
              </div>
              <hr style="border:0;border-top:1px solid var(--clr-border);margin:1.5rem 0">
              <div class="section-title" style="margin-bottom:1rem">What-If Tax Optimizer</div>
              <div class="form-group">
                <label for="sc-avc">Voluntary Pension Contribution (Monthly)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-avc" value="0">
                </div>
                <span class="text-xs text-muted" style="margin-top:0.25rem;display:block">Voluntary contributions to pension are tax-exempt, lowering taxable income.</span>
              </div>
            </form>
          </div>

          <!-- Breakdown & Chart Card -->
          <div class="card flex flex-col justify-between">
            <div>
              <div class="section-title" style="margin-bottom:1rem">Monthly Net Breakdown</div>
              <div class="kpi-grid" style="grid-template-columns:1fr;margin-bottom:1rem">
                <div class="card" style="background:var(--clr-surface-2);border-color:var(--clr-accent)">
                  <div class="card-title">Net Take-Home Pay</div>
                  <div class="card-value accent" id="sc-net-pay" style="font-size:2rem">₦0.00</div>
                  <div class="card-meta" id="sc-effective-rate">Effective Tax Rate: 0%</div>
                </div>
              </div>
              <div class="table-wrap">
                <table class="text-sm">
                  <tbody>
                    <tr><td>Gross Salary</td><td class="td-mono text-right" id="row-gross">₦0.00</td></tr>
                    <tr id="row-pension-tr"><td>Pension Contribution (8% + AVC)</td><td class="td-mono text-right text-gold" id="row-pension">-₦0.00</td></tr>
                    <tr id="row-nhf-tr"><td>NHF Deduction (2.5% of Basic)</td><td class="td-mono text-right text-gold" id="row-nhf">-₦0.00</td></tr>
                    <tr id="row-nhis-tr"><td>NHIS Deduction (1.75% of Basic)</td><td class="td-mono text-right text-gold" id="row-nhis">-₦0.00</td></tr>
                    <tr><td>PAYE Tax (Estimated)</td><td class="td-mono text-right text-danger" id="row-tax">-₦0.00</td></tr>
                    <tr style="font-weight:700"><td>Net Salary</td><td class="td-mono text-right text-accent" id="row-net">₦0.00</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style="max-height:200px;margin-top:1rem;display:flex;justify-content:center">
              <canvas id="sc-chart" style="max-height:180px"></canvas>
            </div>
          </div>
        </div>

        <!-- Ledger -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-header">
            <span class="section-title">Tax-Year Ledger</span>
            <span class="badge badge-neutral">12-Month Projection & Actuals</span>
          </div>
          <div class="table-wrap">
            <table class="text-sm" id="sc-ledger-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="text-right">Gross Salary</th>
                  <th class="text-right">Pension</th>
                  <th class="text-right">NHF</th>
                  <th class="text-right">NHIS</th>
                  <th class="text-right">PAYE Tax</th>
                  <th class="text-right">Net Take-Home</th>
                  <th class="text-right">Cumulative YTD</th>
                </tr>
              </thead>
              <tbody id="sc-ledger-body"></tbody>
            </table>
          </div>
        </div>

        <!-- Tax Reference -->
        <div class="card">
          <div class="section-title">Tax Reference (Nigeria Tax Act 2025)</div>
          <div class="table-wrap" style="margin-top:1rem">
            <table class="text-xs">
              <thead>
                <tr>
                  <th>Annual Taxable Income Band</th>
                  <th>Tax Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr id="band-0"><td>First ₦800,000</td><td>0%</td><td>—</td></tr>
                <tr id="band-15"><td>Next ₦2,200,000 (₦800,001 to ₦3,000,000)</td><td>15%</td><td>—</td></tr>
                <tr id="band-18"><td>Next ₦9,000,000 (₦3,000,001 to ₦12,000,000)</td><td>18%</td><td>—</td></tr>
                <tr id="band-21"><td>Next ₦13,000,000 (₦12,000,001 to ₦25,000,000)</td><td>21%</td><td>—</td></tr>
                <tr id="band-23"><td>Next ₦25,000,000 (₦25,000,001 to ₦50,000,000)</td><td>23%</td><td>—</td></tr>
                <tr id="band-25"><td>Above ₦50,000,000</td><td>25%</td><td>—</td></tr>
              </tbody>
            </table>
          </div>
          <div class="disclaimer" style="margin-top:1rem">${APP_CONFIG.disclaimer}</div>
        </div>
      </div>
    `;

    // Elements
    const grossEl = document.getElementById('sc-gross');
    const basicEl = document.getElementById('sc-basic-pct');
    const housingEl = document.getElementById('sc-housing-pct');
    const transEl = document.getElementById('sc-transport-pct');
    const rentEl = document.getElementById('sc-rent');
    const avcEl = document.getElementById('sc-avc');
    const pensionToggle = document.getElementById('sc-pension-toggle');
    const nhfToggle = document.getElementById('sc-nhf-toggle');
    const nhisToggle = document.getElementById('sc-nhis-toggle');
    const currencySelect = document.getElementById('sc-sc-page-currency') || document.getElementById('sc-page-currency');

    if (!grossEl) {
      console.error('[salary-calc] form not mounted');
      return;
    }

    WPUtils.maskNumberInput(grossEl);
    if (rentEl) WPUtils.maskNumberInput(rentEl);
    if (avcEl) WPUtils.maskNumberInput(avcEl);

    // Event listeners
    const triggerRecalc = () => {
      _monthlyGross = WPUtils.nairaToKobo(WPUtils.cleanNum(grossEl.value)) || 0;
      _basicPct = parseFloat(basicEl?.value) || 0;
      _housingPct = parseFloat(housingEl?.value) || 0;
      _transportPct = parseFloat(transEl?.value) || 0;
      _annualRent = WPUtils.nairaToKobo(WPUtils.cleanNum(rentEl?.value)) || 0;
      _avc = WPUtils.nairaToKobo(WPUtils.cleanNum(avcEl?.value)) || 0;
      _pensionEnabled = pensionToggle ? pensionToggle.checked : true;
      _nhfEnabled = nhfToggle ? nhfToggle.checked : true;
      _nhisEnabled = nhisToggle ? nhisToggle.checked : true;
      try { _recalculate(); } catch (e) { console.error('[salary-calc recalc]', e); }
    };

    grossEl.addEventListener('input', triggerRecalc);
    basicEl?.addEventListener('input', triggerRecalc);
    housingEl?.addEventListener('input', triggerRecalc);
    transEl?.addEventListener('input', triggerRecalc);
    rentEl?.addEventListener('input', triggerRecalc);
    avcEl?.addEventListener('input', triggerRecalc);
    pensionToggle?.addEventListener('change', triggerRecalc);
    nhfToggle?.addEventListener('change', triggerRecalc);
    nhisToggle?.addEventListener('change', triggerRecalc);

    if (currencySelect) {
      currencySelect.value = localStorage.getItem('wp_page_currency_salary_calc') || 'NGN';
      currencySelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_salary_calc', e.target.value);
        const sym = e.target.value === 'USD' ? '$' : '₦';
        document.querySelectorAll('#sc-form .input-prefix').forEach(span => span.textContent = sym);
        _recalculate();
      });
    }

    // Load actual active income historical logs
    try {
      const uid = WPApp.state.user.id;
      const snapshots = await WPDb.fetchAll('income_entries', { user_id: uid, income_type: 'active' });
      _historicalIncome = snapshots;
      // Pre-fill fields using the latest entry if any
      if (snapshots.length > 0) {
        const latest = snapshots[0];
        grossEl.value = WPUtils.koboToNaira(latest.gross_amount).toLocaleString();
      }
    } catch(err) {
      console.warn("Failed to fetch active income logs for pre-fill", err);
    }

    triggerRecalc();
  }

  function _recalculate() {
    const pageCurrency = localStorage.getItem('wp_page_currency_salary_calc') || 'NGN';
    const sym = pageCurrency === 'USD' ? '$' : '₦';

    // Conversions internally to NGN for Tax Act calculations (Nigerian brackets are NGN based)
    const monthlyGrossNGN = pageCurrency === 'USD' ? WPUtils.convert(_monthlyGross, 'USD', 'NGN') : _monthlyGross;
    const basicNGN = monthlyGrossNGN * (_basicPct / 100);
    const housingNGN = monthlyGrossNGN * (_housingPct / 100);
    const transportNGN = monthlyGrossNGN * (_transportPct / 100);
    
    // Pension Employee 8%
    const pensionBaseNGN = basicNGN + housingNGN + transportNGN;
    const pensionEmployeeNGN = _pensionEnabled ? (Math.round(pensionBaseNGN * 0.08) + (pageCurrency === 'USD' ? WPUtils.convert(_avc, 'USD', 'NGN') : _avc)) : (pageCurrency === 'USD' ? WPUtils.convert(_avc, 'USD', 'NGN') : _avc);
    
    // NHF 2.5% of basic
    const nhfNGN = _nhfEnabled ? Math.round(basicNGN * 0.025) : 0;

    // NHIS 1.75% of basic
    const nhisNGN = _nhisEnabled ? Math.round(basicNGN * 0.0175) : 0;
    
    // Rent Relief & PAYE
    const rentNGN = pageCurrency === 'USD' ? WPUtils.convert(_annualRent, 'USD', 'NGN') : _annualRent;
    const annualGrossNGN = monthlyGrossNGN * 12;
    const annualPensionNGN = pensionEmployeeNGN * 12;
    const annualRentNGN = rentNGN;

    // NHF and NHIS are also tax-exempt, so they reduce taxable income in PAYE
    const totalTaxExemptDeductionsNGN = pensionEmployeeNGN + nhfNGN + nhisNGN;

    const annualPayeNGN = WPUtils.calcPIT(annualGrossNGN, totalTaxExemptDeductionsNGN * 12, annualRentNGN);
    const monthlyPayeNGN = Math.round(annualPayeNGN / 12);

    // Total deductions
    const totalDeductionsNGN = pensionEmployeeNGN + nhfNGN + monthlyPayeNGN;
    const netPayNGN = monthlyGrossNGN - totalDeductionsNGN;

    // Convert back to page currency for display
    const grossDisplay = pageCurrency === 'USD' ? WPUtils.convert(_monthlyGross, 'USD', pageCurrency) : _monthlyGross;
    const pensionDisplay = pageCurrency === 'USD' ? WPUtils.convert(pensionEmployeeNGN, 'NGN', pageCurrency) : pensionEmployeeNGN;
    const nhfDisplay = pageCurrency === 'USD' ? WPUtils.convert(nhfNGN, 'NGN', pageCurrency) : nhfNGN;
    const nhisDisplay = pageCurrency === 'USD' ? WPUtils.convert(nhisNGN, 'NGN', pageCurrency) : nhisNGN;
    const payeDisplay = pageCurrency === 'USD' ? WPUtils.convert(monthlyPayeNGN, 'NGN', pageCurrency) : monthlyPayeNGN;
    const netDisplay = grossDisplay - pensionDisplay - nhfDisplay - nhisDisplay - payeDisplay;

    const effectiveRate = monthlyGrossNGN > 0 ? (monthlyPayeNGN / monthlyGrossNGN) * 100 : 0;

    // Update UI Elements
    document.getElementById('sc-net-pay').textContent = WPUtils.fmt(netDisplay, { currency: pageCurrency });
    document.getElementById('sc-effective-rate').textContent = `Effective Tax Rate: ${effectiveRate.toFixed(1)}%`;

    document.getElementById('row-gross').textContent = WPUtils.fmt(grossDisplay, { currency: pageCurrency });
    document.getElementById('row-pension').textContent = `-${WPUtils.fmt(pensionDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-nhf').textContent = `-${WPUtils.fmt(nhfDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-nhis').textContent = `-${WPUtils.fmt(nhisDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-tax').textContent = `-${WPUtils.fmt(payeDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-net').textContent = WPUtils.fmt(netDisplay, { currency: pageCurrency });

    document.getElementById('row-pension-tr').style.display = _pensionEnabled || _avc > 0 ? '' : 'none';
    document.getElementById('row-nhf-tr').style.display = _nhfEnabled ? '' : 'none';
    document.getElementById('row-nhis-tr').style.display = _nhisEnabled ? '' : 'none';

    // Highlight current tax bracket row
    const annualTaxableNGN = Math.max(0, annualGrossNGN - annualPensionNGN - Math.min(annualRentNGN * 0.2, 50000000));
    _highlightTaxBracket(annualTaxableNGN);

    // Chart.js render
    _renderChart(netDisplay, pensionDisplay, nhfDisplay, nhisDisplay, payeDisplay);

    // Render YTD Ledger
    _recreateLedger(monthlyGrossNGN, pensionEmployeeNGN, nhfNGN, nhisNGN, monthlyPayeNGN, pageCurrency);
  }

  function _highlightTaxBracket(taxableKobo) {
    const bands = [
      { id: 'band-0', limit: 80000000 },
      { id: 'band-15', limit: 300000000 },
      { id: 'band-18', limit: 1200000000 },
      { id: 'band-21', limit: 2500000000 },
      { id: 'band-23', limit: 5000000000 },
      { id: 'band-25', limit: Infinity }
    ];

    bands.forEach(b => {
      const el = document.getElementById(b.id);
      if (el) {
        el.style.background = '';
        el.querySelector('td:last-child').textContent = '—';
      }
    });

    let currentBand = bands[0];
    if (taxableKobo > 5000000000) currentBand = bands[5];
    else if (taxableKobo > 2500000000) currentBand = bands[4];
    else if (taxableKobo > 1200000000) currentBand = bands[3];
    else if (taxableKobo > 30000000) currentBand = bands[2];
    else if (taxableKobo > 80000000) currentBand = bands[1];

    const currentEl = document.getElementById(currentBand.id);
    if (currentEl) {
      currentEl.style.background = 'rgba(0, 200, 150, 0.15)';
      currentEl.querySelector('td:last-child').textContent = '★ Active Bracket';
    }
  }

  function _renderChart(net, pension, nhf, nhis, tax) {
    const ctx = document.getElementById('sc-chart');
    if (!ctx) return;

    if (_chart) _chart.destroy();

    const data = [net / 100];
    const labels = ['Net Take-Home'];
    const colors = ['#00C896'];

    if (_pensionEnabled || _avc > 0) {
      data.push(pension / 100);
      labels.push('Pension');
      colors.push('#F59E0B');
    }
    if (_nhfEnabled) {
      data.push(nhf / 100);
      labels.push('NHF');
      colors.push('#38BDF8');
    }
    if (_nhisEnabled) {
      data.push(nhis / 100);
      labels.push('NHIS');
      colors.push('#A78BFA');
    }
    data.push(tax / 100);
    labels.push('PAYE Tax');
    colors.push('#F43F5E');

    _chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#8B949E', boxWidth: 12 }
          }
        }
      }
    });
  }

  function _recreateLedger(monthlyGrossNGN, pensionNGN, nhfNGN, nhisNGN, payeNGN, pageCurrency) {
    const tbody = document.getElementById('sc-ledger-body');
    if (!tbody) return;

    const months = WPUtils.last12Months();
    let cumulativeGross = 0;
    let cumulativePAYE = 0;

    let html = '';
    let totalGross = 0, totalPension = 0, totalNHF = 0, totalNHIS = 0, totalPAYE = 0, totalNet = 0;

    months.forEach((m, idx) => {
      const periodLabel = WPUtils.periodLabel(m);
      const actualLog = _historicalIncome.find(i => i.period_month === m);
      
      let mg = monthlyGrossNGN;
      let pen = pensionNGN;
      let nh = nhfNGN;
      let nhis = nhisNGN;
      let tx = payeNGN;

      if (actualLog) {
        mg = actualLog.gross_amount;
        tx = actualLog.paye_tax || 0;
        pen = actualLog.pension_contrib || 0;
        nh = actualLog.nhf_contrib || 0;
        nhis = actualLog.other_deductions || 0; // standard container in actual log
      }

      const net = mg - pen - nh - nhis - tx;
      cumulativeGross += mg;
      cumulativePAYE += tx;

      totalGross += mg;
      totalPension += pen;
      totalNHF += nh;
      totalNHIS += nhis;
      totalPAYE += tx;
      totalNet += net;

      const displayMg = pageCurrency === 'USD' ? WPUtils.convert(mg, 'NGN', pageCurrency) : mg;
      const displayPen = pageCurrency === 'USD' ? WPUtils.convert(pen, 'NGN', pageCurrency) : pen;
      const displayNh = pageCurrency === 'USD' ? WPUtils.convert(nh, 'NGN', pageCurrency) : nh;
      const displayNhis = pageCurrency === 'USD' ? WPUtils.convert(nhis, 'NGN', pageCurrency) : nhis;
      const displayTx = pageCurrency === 'USD' ? WPUtils.convert(tx, 'NGN', pageCurrency) : tx;
      const displayNet = pageCurrency === 'USD' ? WPUtils.convert(net, 'NGN', pageCurrency) : net;
      const displayCumGross = pageCurrency === 'USD' ? WPUtils.convert(cumulativeGross, 'NGN', pageCurrency) : cumulativeGross;

      const prevCumGross = cumulativeGross - mg;
      const brackets = [80000000, 300000000, 1200000000, 2500000000, 5000000000];
      let crossed = false;
      brackets.forEach(b => {
        if (prevCumGross <= b && cumulativeGross > b) crossed = true;
      });

      html += `<tr ${crossed ? 'style="background:rgba(245, 158, 11, 0.08)"' : ''}>
        <td>${periodLabel} ${actualLog ? '<span class="badge badge-accent" style="font-size:10px">Actual</span>' : ''}</td>
        <td class="td-mono text-right">${WPUtils.fmt(displayMg, { currency: pageCurrency })}</td>
        <td class="td-mono text-right">${_pensionEnabled || actualLog ? WPUtils.fmt(displayPen, { currency: pageCurrency }) : '—'}</td>
        <td class="td-mono text-right">${_nhfEnabled || actualLog ? WPUtils.fmt(displayNh, { currency: pageCurrency }) : '—'}</td>
        <td class="td-mono text-right">${_nhisEnabled || actualLog ? WPUtils.fmt(displayNhis, { currency: pageCurrency }) : '—'}</td>
        <td class="td-mono text-right text-danger">${WPUtils.fmt(displayTx, { currency: pageCurrency })}</td>
        <td class="td-mono text-right fw-600 text-accent">${WPUtils.fmt(displayNet, { currency: pageCurrency })}</td>
        <td class="td-mono text-right text-muted">${WPUtils.fmt(displayCumGross, { currency: pageCurrency })}</td>
      </tr>`;
    });

    const displayTotalGross = pageCurrency === 'USD' ? WPUtils.convert(totalGross, 'NGN', pageCurrency) : totalGross;
    const displayTotalPen = pageCurrency === 'USD' ? WPUtils.convert(totalPension, 'NGN', pageCurrency) : totalPension;
    const displayTotalNh = pageCurrency === 'USD' ? WPUtils.convert(totalNHF, 'NGN', pageCurrency) : totalNHF;
    const displayTotalNhis = pageCurrency === 'USD' ? WPUtils.convert(totalNHIS, 'NGN', pageCurrency) : totalNHIS;
    const displayTotalTx = pageCurrency === 'USD' ? WPUtils.convert(totalPAYE, 'NGN', pageCurrency) : totalPAYE;
    const displayTotalNet = pageCurrency === 'USD' ? WPUtils.convert(totalNet, 'NGN', pageCurrency) : totalNet;

    html += `<tr style="font-weight:700;border-top:2px solid var(--clr-border)">
      <td>Annual Total</td>
      <td class="td-mono text-right">${WPUtils.fmt(displayTotalGross, { currency: pageCurrency })}</td>
      <td class="td-mono text-right text-gold">${WPUtils.fmt(displayTotalPen, { currency: pageCurrency })}</td>
      <td class="td-mono text-right">${_nhfEnabled ? WPUtils.fmt(displayTotalNh, { currency: pageCurrency }) : '—'}</td>
      <td class="td-mono text-right">${_nhisEnabled ? WPUtils.fmt(displayTotalNhis, { currency: pageCurrency }) : '—'}</td>
      <td class="td-mono text-right text-danger">${WPUtils.fmt(displayTotalTx, { currency: pageCurrency })}</td>
      <td class="td-mono text-right text-accent">${WPUtils.fmt(displayTotalNet, { currency: pageCurrency })}</td>
      <td></td>
    </tr>`;

    tbody.innerHTML = html;
  }

  function destroy() {
    if (_chart) {
      _chart.destroy();
      _chart = null;
    }
  }

  return { init, destroy };
})();
