// ============================================================
// OlaFinancial — Salary Calculator & Tax-Year Ledger
// ============================================================

const WPSalaryCalculator = (() => {
  let _chart = null;
  let _monthlyGross = 0;
  let _basicPct = 60;
  let _housingPct = 20;
  let _transportPct = 20;
  let _annualRent = 0;           // rent paid (for rent relief #6)
  let _mortgageInterestAnnual = 0; // owner-occupied loan interest #4
  let _lifeInsuranceAnnual = 0;  // life / deferred annuity self+spouse #5
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
            <p class="text-xs text-muted" style="margin:0.35rem 0 0">All six NTA 2025 §30(2) tax-free deductions · gross-to-net · tax-year ledger</p>
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
              <hr style="border:0;border-top:1px solid var(--clr-border);margin:1.25rem 0">
              <div class="section-title" style="margin-bottom:0.35rem">Six tax-free deductions (NTA 2025 §30(2))</div>
              <p class="text-xs text-muted" style="margin:0 0 1rem;line-height:1.45">
                All six reduce chargeable income before PAYE. Items 1–3 are usually withheld from payroll
                (and reduce take-home). Items 4–6 are claim-based reliefs — enter annual amounts with
                documentary evidence. Rent relief is <strong>20% of rent paid, max ₦500,000</strong>.
              </p>

              <!-- 1 Pension -->
              <div class="form-group" style="margin-bottom:0.85rem">
                <div class="toggle-group" style="margin-bottom:0.5rem">
                  <label class="toggle"><input type="checkbox" id="sc-pension-toggle" checked><span class="toggle-slider"></span></label>
                  <span class="toggle-label"><strong>1. Pension</strong> (Pension Reform Act — 8% of emoluments)</span>
                </div>
                <label for="sc-avc" class="text-xs text-muted">Additional Voluntary Contribution — AVC monthly (tax-exempt if held ≥5 years)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-avc" value="0">
                </div>
              </div>

              <!-- 2 NHF -->
              <div class="toggle-group" style="margin-bottom:0.85rem">
                <label class="toggle"><input type="checkbox" id="sc-nhf-toggle" checked><span class="toggle-slider"></span></label>
                <span class="toggle-label"><strong>2. NHF</strong> — National Housing Fund (2.5% of basic)</span>
              </div>

              <!-- 3 NHIS -->
              <div class="toggle-group" style="margin-bottom:0.85rem">
                <label class="toggle"><input type="checkbox" id="sc-nhis-toggle" checked><span class="toggle-slider"></span></label>
                <span class="toggle-label"><strong>3. NHIS</strong> — National Health Insurance (1.75% of basic estimate)</span>
              </div>

              <!-- 4 Mortgage interest -->
              <div class="form-group" style="margin-bottom:0.85rem">
                <label for="sc-mortgage"><strong>4. Mortgage interest</strong> — owner-occupied home (annual interest only)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-mortgage" value="0" placeholder="Interest paid this year, not principal">
                </div>
                <span class="text-xs text-muted" style="margin-top:0.25rem;display:block">Interest on a loan to develop / own your residential house. Principal is not deductible.</span>
              </div>

              <!-- 5 Life insurance -->
              <div class="form-group" style="margin-bottom:0.85rem">
                <label for="sc-life"><strong>5. Life insurance / deferred annuity</strong> — self + spouse (annual premiums)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-life" value="0" placeholder="Premiums paid for self and/or spouse">
                </div>
                <span class="text-xs text-muted" style="margin-top:0.25rem;display:block">Life assurance or deferred annuity premiums for you or your spouse (proof of payment required).</span>
              </div>

              <!-- 6 Rent relief -->
              <div class="form-group" style="margin-bottom:0.5rem">
                <label for="sc-rent"><strong>6. Annual rent paid</strong> → rent relief (20%, max ₦500,000)</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">₦</span>
                  <input class="input" id="sc-rent" value="0" placeholder="Total rent paid in the year">
                </div>
                <span class="text-xs text-muted" style="margin-top:0.25rem;display:block" id="sc-rent-relief-hint">Computed rent relief: ₦0</span>
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
                    <tr id="row-pension-tr"><td>1. Pension (8% + AVC)</td><td class="td-mono text-right text-gold" id="row-pension">-₦0.00</td></tr>
                    <tr id="row-nhf-tr"><td>2. NHF (2.5% of basic)</td><td class="td-mono text-right text-gold" id="row-nhf">-₦0.00</td></tr>
                    <tr id="row-nhis-tr"><td>3. NHIS (1.75% of basic)</td><td class="td-mono text-right text-gold" id="row-nhis">-₦0.00</td></tr>
                    <tr id="row-mortgage-tr" style="display:none"><td>4. Mortgage interest (tax relief)</td><td class="td-mono text-right text-gold" id="row-mortgage">−₦0.00</td></tr>
                    <tr id="row-life-tr" style="display:none"><td>5. Life insurance (tax relief)</td><td class="td-mono text-right text-gold" id="row-life">−₦0.00</td></tr>
                    <tr id="row-rent-tr" style="display:none"><td>6. Rent relief (20% / ₦500k cap)</td><td class="td-mono text-right text-gold" id="row-rent">−₦0.00</td></tr>
                    <tr><td>PAYE Tax (after all six reliefs)</td><td class="td-mono text-right text-danger" id="row-tax">-₦0.00</td></tr>
                    <tr style="font-weight:700"><td>Net Salary (payroll take-home)</td><td class="td-mono text-right text-accent" id="row-net">₦0.00</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-muted" style="margin:0.75rem 0 0;line-height:1.45" id="sc-relief-note">
                Items 4–6 lower PAYE only (not withheld from salary). Net take-home = Gross − Pension − NHF − NHIS − PAYE.
              </p>
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
          <p class="text-xs text-muted" style="margin:0.5rem 0 0;line-height:1.5">
            <strong>§30(2) six deductible expenses:</strong>
            (1) Pension contributions (incl. approved AVC),
            (2) NHF contributions,
            (3) NHIS contributions,
            (4) Interest on loans for owner-occupied residential housing,
            (5) Life insurance / deferred annuity premiums (self or spouse),
            (6) Rent relief — 20% of annual rent paid, max ₦500,000.
            CRA abolished. Documentary evidence required for claim-based reliefs.
          </p>
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
    const mortgageEl = document.getElementById('sc-mortgage');
    const lifeEl = document.getElementById('sc-life');
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
    [rentEl, mortgageEl, lifeEl, avcEl].forEach(el => { if (el) WPUtils.maskNumberInput(el); });

    // Event listeners
    const triggerRecalc = () => {
      _monthlyGross = WPUtils.nairaToKobo(WPUtils.cleanNum(grossEl.value)) || 0;
      _basicPct = parseFloat(basicEl?.value) || 0;
      _housingPct = parseFloat(housingEl?.value) || 0;
      _transportPct = parseFloat(transEl?.value) || 0;
      _annualRent = WPUtils.nairaToKobo(WPUtils.cleanNum(rentEl?.value)) || 0;
      _mortgageInterestAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(mortgageEl?.value)) || 0;
      _lifeInsuranceAnnual = WPUtils.nairaToKobo(WPUtils.cleanNum(lifeEl?.value)) || 0;
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
    mortgageEl?.addEventListener('input', triggerRecalc);
    lifeEl?.addEventListener('input', triggerRecalc);
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

  function _toNGN(koboPage, pageCurrency) {
    return pageCurrency === 'USD' ? WPUtils.convert(koboPage, 'USD', 'NGN') : koboPage;
  }

  function _fromNGN(koboNGN, pageCurrency) {
    return pageCurrency === 'USD' ? WPUtils.convert(koboNGN, 'NGN', pageCurrency) : koboNGN;
  }

  function _recalculate() {
    const pageCurrency = localStorage.getItem('wp_page_currency_salary_calc') || 'NGN';

    // Work in NGN kobo for Tax Act 2025 brackets
    const monthlyGrossNGN = _toNGN(_monthlyGross, pageCurrency);
    const basicNGN = monthlyGrossNGN * (_basicPct / 100);
    const housingNGN = monthlyGrossNGN * (_housingPct / 100);
    const transportNGN = monthlyGrossNGN * (_transportPct / 100);
    const avcMonthlyNGN = _toNGN(_avc, pageCurrency);

    // 1. Pension (8% of emoluments + AVC) — payroll withholding
    const pensionStatutory = _pensionEnabled
      ? WPUtils.calcPensionEmployee(basicNGN, housingNGN, transportNGN)
      : 0;
    const pensionMonthlyNGN = pensionStatutory + avcMonthlyNGN;

    // 2. NHF — 2.5% of basic
    const nhfMonthlyNGN = _nhfEnabled ? WPUtils.calcNHF(basicNGN) : 0;

    // 3. NHIS — 1.75% of basic (estimate; override via income form if needed)
    const nhisMonthlyNGN = _nhisEnabled
      ? (WPUtils.calcNHIS ? WPUtils.calcNHIS(basicNGN) : Math.round(basicNGN * 0.0175))
      : 0;

    // 4–6 annual claim-based reliefs (entered as annual amounts)
    const annualRentNGN = _toNGN(_annualRent, pageCurrency);
    const mortgageAnnualNGN = _toNGN(_mortgageInterestAnnual, pageCurrency);
    const lifeAnnualNGN = _toNGN(_lifeInsuranceAnnual, pageCurrency);
    const rentReliefAnnualNGN = WPUtils.calcRentRelief(annualRentNGN);

    const annualGrossNGN = monthlyGrossNGN * 12;
    const pit = WPUtils.summarizePIT(annualGrossNGN, {
      pension: pensionMonthlyNGN * 12,
      nhf: nhfMonthlyNGN * 12,
      nhis: nhisMonthlyNGN * 12,
      annualRent: annualRentNGN,
      mortgageInterest: mortgageAnnualNGN,
      lifeInsurance: lifeAnnualNGN,
    });
    const monthlyPayeNGN = Math.round(pit.taxKobo / 12);

    // Payroll take-home: gross − (1)(2)(3) − PAYE. Reliefs 4–6 do not leave the paycheck.
    const netMonthlyNGN = monthlyGrossNGN - pensionMonthlyNGN - nhfMonthlyNGN - nhisMonthlyNGN - monthlyPayeNGN;

    const grossDisplay = _fromNGN(monthlyGrossNGN, pageCurrency);
    const pensionDisplay = _fromNGN(pensionMonthlyNGN, pageCurrency);
    const nhfDisplay = _fromNGN(nhfMonthlyNGN, pageCurrency);
    const nhisDisplay = _fromNGN(nhisMonthlyNGN, pageCurrency);
    const mortgageMoDisplay = _fromNGN(Math.round(mortgageAnnualNGN / 12), pageCurrency);
    const lifeMoDisplay = _fromNGN(Math.round(lifeAnnualNGN / 12), pageCurrency);
    const rentReliefMoDisplay = _fromNGN(Math.round(rentReliefAnnualNGN / 12), pageCurrency);
    const payeDisplay = _fromNGN(monthlyPayeNGN, pageCurrency);
    const netDisplay = _fromNGN(netMonthlyNGN, pageCurrency);

    const effectiveRate = monthlyGrossNGN > 0 ? (monthlyPayeNGN / monthlyGrossNGN) * 100 : 0;

    document.getElementById('sc-net-pay').textContent = WPUtils.fmt(netDisplay, { currency: pageCurrency });
    document.getElementById('sc-effective-rate').textContent =
      `Effective Tax Rate: ${effectiveRate.toFixed(1)}% · Chargeable (annual) ${WPUtils.fmt(_fromNGN(pit.taxableKobo, pageCurrency), { currency: pageCurrency, compact: true })}`;

    document.getElementById('row-gross').textContent = WPUtils.fmt(grossDisplay, { currency: pageCurrency });
    document.getElementById('row-pension').textContent = `−${WPUtils.fmt(pensionDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-nhf').textContent = `−${WPUtils.fmt(nhfDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-nhis').textContent = `−${WPUtils.fmt(nhisDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-mortgage').textContent = `−${WPUtils.fmt(mortgageMoDisplay, { currency: pageCurrency })}/mo relief`;
    document.getElementById('row-life').textContent = `−${WPUtils.fmt(lifeMoDisplay, { currency: pageCurrency })}/mo relief`;
    document.getElementById('row-rent').textContent = `−${WPUtils.fmt(rentReliefMoDisplay, { currency: pageCurrency })}/mo relief`;
    document.getElementById('row-tax').textContent = `−${WPUtils.fmt(payeDisplay, { currency: pageCurrency })}`;
    document.getElementById('row-net').textContent = WPUtils.fmt(netDisplay, { currency: pageCurrency });

    document.getElementById('row-pension-tr').style.display = (_pensionEnabled || _avc > 0) ? '' : 'none';
    document.getElementById('row-nhf-tr').style.display = _nhfEnabled ? '' : 'none';
    document.getElementById('row-nhis-tr').style.display = _nhisEnabled ? '' : 'none';
    document.getElementById('row-mortgage-tr').style.display = mortgageAnnualNGN > 0 ? '' : 'none';
    document.getElementById('row-life-tr').style.display = lifeAnnualNGN > 0 ? '' : 'none';
    document.getElementById('row-rent-tr').style.display = rentReliefAnnualNGN > 0 ? '' : 'none';

    const rentHint = document.getElementById('sc-rent-relief-hint');
    if (rentHint) {
      const annualReliefDisp = _fromNGN(rentReliefAnnualNGN, pageCurrency);
      rentHint.textContent = annualRentNGN > 0
        ? `Computed rent relief: ${WPUtils.fmt(annualReliefDisp, { currency: pageCurrency })} / year (20% of rent, max ₦500,000)`
        : 'Computed rent relief: ₦0 — enter annual rent paid to claim relief #6';
    }

    _highlightTaxBracket(pit.taxableKobo);
    _renderChart(netDisplay, pensionDisplay, nhfDisplay, nhisDisplay, payeDisplay);
    _recreateLedger(monthlyGrossNGN, pensionMonthlyNGN, nhfMonthlyNGN, nhisMonthlyNGN, monthlyPayeNGN, pageCurrency);
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
