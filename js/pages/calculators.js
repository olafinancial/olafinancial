// ============================================================
// OlaFinancial — Financial Calculators Hub
// ============================================================

const WPCalculators = (() => {

  let _activeTab = 'savings-goal';

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Calculators</h1>
          <p class="page-subtitle">Verify investment yields, simulate loans, and project saving goals</p>
        </div>
      </div>
      <div class="page-body">
        <!-- Calculators Tab Bar -->
        <div class="tab-container" style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.75rem;margin-bottom:1.5rem;border-bottom:1px solid var(--clr-border)">
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="savings-goal">🎯 Savings Goal</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="savings-compound">📈 Savings (Compound)</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="roi">📊 Investment ROI</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="loan-simple">💸 Simple Loan</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="loan-detailed">🏦 Detailed Loan</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="car-loan">🚗 Car Loan</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="mortgage">🏠 Mortgage</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="fixed-deposit">🔒 Fixed Deposit / CD</button>
          <button class="btn btn-ghost btn-sm calc-tab-btn" data-tab="inflation">🎈 Inflation Impact</button>
        </div>
        
        <!-- Calculator Content Area -->
        <div id="calc-content-wrap"></div>
      </div>`;

    container.querySelectorAll('.calc-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        _activeTab = e.currentTarget.dataset.tab;
        _renderActiveTab();
      });
    });

    _renderActiveTab();
  }

  function _renderActiveTab() {
    // Set active tab buttons styling
    document.querySelectorAll('.calc-tab-btn').forEach(btn => {
      btn.classList.toggle('btn-primary', btn.dataset.tab === _activeTab);
      btn.classList.toggle('btn-ghost', btn.dataset.tab !== _activeTab);
    });

    const wrap = document.getElementById('calc-content-wrap');
    if (!wrap) return;

    const baseCurrency = WPApp.state.profile?.currency || 'NGN';
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[baseCurrency] || '₦';

    let html = '';

    if (_activeTab === 'savings-goal') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Savings Goal Calculator</h3>
            <div class="form-group">
              <label for="cg-target">Target Savings Goal (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="cg-target" placeholder="e.g. 5,000,000" value="5,000,000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="cg-rate">Annual Interest Rate (%)</label>
                <input class="input" type="number" step="0.1" id="cg-rate" placeholder="e.g. 10" value="8">
              </div>
              <div class="form-group">
                <label for="cg-years">Time Period (Years)</label>
                <input class="input" type="number" id="cg-years" placeholder="e.g. 5" value="5">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-savings-goal">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:2rem">
            <div class="section-title" style="margin-bottom:1.5rem">Monthly Savings Needed</div>
            <div class="card-value text-accent" id="cg-result" style="font-size:2.8rem;font-weight:800">₦0.00</div>
            <div style="font-size:0.85rem;color:var(--clr-text-2);margin-top:1.5rem" id="cg-summary">
              Save this amount monthly to reach your target of ${symbol}5,000,000 in 5 years.
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'savings-compound') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Compound Savings Calculator</h3>
            <div class="form-group">
              <label for="cs-init">Initial Deposit (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="cs-init" placeholder="e.g. 1,000,000" value="1,000,000">
              </div>
            </div>
            <div class="form-group">
              <label for="cs-monthly">Monthly Contribution (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="cs-monthly" placeholder="e.g. 50,000" value="100,000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="cs-rate">Annual Interest Rate (%)</label>
                <input class="input" type="number" step="0.1" id="cs-rate" placeholder="e.g. 12" value="10">
              </div>
              <div class="form-group">
                <label for="cs-years">Time Period (Years)</label>
                <input class="input" type="number" id="cs-years" placeholder="e.g. 10" value="10">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-savings-compound">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">Projection Results</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Total Future Balance</div>
                <div class="card-value text-accent" id="cs-res-total" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Total Contributions</div>
                <div class="card-value" id="cs-res-contrib" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Total Interest Earned</div>
              <div class="card-value text-gold" id="cs-res-interest" style="font-size:2rem;font-weight:800">₦0.00</div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'roi') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Return on Investment (ROI)</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="roi-init">Amount Invested (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="roi-init" placeholder="0" value="5,000,000">
                </div>
              </div>
              <div class="form-group">
                <label for="roi-final">Amount Returned (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="roi-final" placeholder="0" value="7,500,000">
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="roi-years">Investment Length (Years - optional)</label>
              <input class="input" type="number" step="0.1" id="roi-years" placeholder="e.g. 3" value="3">
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-roi">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">ROI Summary</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Total Investment Gain</div>
                <div class="card-value text-accent" id="roi-res-gain" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Total ROI (%)</div>
                <div class="card-value text-gold" id="roi-res-pct" style="font-size:2rem;font-weight:800">0.0%</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Annualized ROI (%)</div>
              <div class="card-value" id="roi-res-annual" style="font-size:2rem;font-weight:800">0.0%</div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'loan-simple') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Simple Loan Calculator</h3>
            <div class="form-group">
              <label for="ls-amount">Loan Amount (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ls-amount" placeholder="0" value="1,000,000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="ls-rate">Interest Rate (% per year)</label>
                <input class="input" type="number" step="0.1" id="ls-rate" value="15">
              </div>
              <div class="form-group">
                <label for="ls-months">Loan Term (Months)</label>
                <input class="input" type="number" id="ls-months" value="12">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-loan-simple">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">Loan Results (Simple Interest)</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Monthly Repayment</div>
                <div class="card-value text-danger" id="ls-res-monthly" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Total Interest Paid</div>
                <div class="card-value" id="ls-res-interest" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Total Repayment Amount</div>
              <div class="card-value" id="ls-res-total" style="font-size:2rem;font-weight:800">₦0.00</div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'loan-detailed') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Detailed Loan Calculator</h3>
            <div class="form-group">
              <label for="ld-amount">Loan Amount (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ld-amount" placeholder="0" value="5,000,000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="ld-rate">Annual Interest Rate (%)</label>
                <input class="input" type="number" step="0.1" id="ld-rate" value="22">
              </div>
              <div class="form-group">
                <label for="ld-years">Term (Years)</label>
                <input class="input" type="number" id="ld-years" value="3">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-loan-detailed">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">Loan Results (Amortized)</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Monthly Amortized Payment</div>
                <div class="card-value text-danger" id="ld-res-monthly" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Total Interest Cost</div>
                <div class="card-value" id="ld-res-interest" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Total Cost of Loan</div>
              <div class="card-value" id="ld-res-total" style="font-size:2rem;font-weight:800">₦0.00</div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'car-loan') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Car Loan Calculator</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="cl-price">Vehicle Price (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="cl-price" placeholder="0" value="12,000,000">
                </div>
              </div>
              <div class="form-group">
                <label for="cl-down">Down Payment (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="cl-down" placeholder="0" value="3,000,000">
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="cl-trade">Trade-In Value (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="cl-trade" placeholder="0" value="0">
                </div>
              </div>
              <div class="form-group">
                <label for="cl-tax">Sales Tax (%)</label>
                <input class="input" type="number" step="0.1" id="cl-tax" value="7.5">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="cl-rate">Interest Rate (%)</label>
                <input class="input" type="number" step="0.1" id="cl-rate" value="18">
              </div>
              <div class="form-group">
                <label for="cl-months">Term (Months)</label>
                <input class="input" type="number" id="cl-months" value="60">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-car-loan">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">Car Loan Summary</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Monthly Repayment</div>
                <div class="card-value text-danger" id="cl-res-monthly" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Total Financed Amount</div>
                <div class="card-value" id="cl-res-financed" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Total Payments & Taxes</div>
              <div class="card-value" id="cl-res-total" style="font-size:2rem;font-weight:800">₦0.00</div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'mortgage') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Mortgage Calculator</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="mc-price">Home Purchase Price (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="mc-price" value="45,000,000">
                </div>
              </div>
              <div class="form-group">
                <label for="mc-down">Down Payment (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="mc-down" value="9,000,000">
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="mc-rate">Interest Rate (%)</label>
                <input class="input" type="number" step="0.1" id="mc-rate" value="16.5">
              </div>
              <div class="form-group">
                <label for="mc-years">Term (Years)</label>
                <input class="input" type="number" id="mc-years" value="25">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="mc-tax">Annual Property Tax (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="mc-tax" value="250,000">
                </div>
              </div>
              <div class="form-group">
                <label for="mc-ins">Annual Insurance (${symbol})</label>
                <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                  <input class="input" type="text" inputmode="decimal" id="mc-ins" value="120,000">
                </div>
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-mortgage">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.25rem;padding:2rem">
            <div class="section-title">Monthly Mortgage Cost</div>
            <div>
              <div class="text-xs text-muted">Total Monthly Payment</div>
              <div class="card-value text-danger" id="mc-res-total" style="font-size:2.2rem;font-weight:800">₦0.00</div>
            </div>
            <div style="border-top:1px solid var(--clr-border);padding-top:1rem;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem">
              <div class="flex justify-between"><span class="text-muted">Principal & Interest</span><strong id="mc-res-pi">₦0.00</strong></div>
              <div class="flex justify-between"><span class="text-muted">Monthly Property Tax</span><strong id="mc-res-tax">₦0.00</strong></div>
              <div class="flex justify-between"><span class="text-muted">Monthly Insurance</span><strong id="mc-res-ins">₦0.00</strong></div>
            </div>
          </div>
        </div>`;
    }

    else if (_activeTab === 'inflation') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Inflation Impact Calculator</h3>
            <div class="form-group">
              <label for="inf-amount">Current Cash Savings (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="inf-amount" placeholder="0" value="10,000,000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="inf-rate">Annual Inflation Rate (%)</label>
                <input class="input" type="number" step="0.1" id="inf-rate" placeholder="e.g. 25" value="22">
              </div>
              <div class="form-group">
                <label for="inf-years">Time Period (Years)</label>
                <input class="input" type="number" id="inf-years" placeholder="e.g. 5" value="5">
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="run-inflation">Calculate</button>
          </div>
          <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:1.5rem;padding:2rem">
            <div class="section-title">Purchasing Power Loss</div>
            <div class="form-row">
              <div>
                <div class="text-xs text-muted">Future Purchasing Power</div>
                <div class="card-value text-danger" id="inf-res-future" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
              <div>
                <div class="text-xs text-muted">Depreciation Loss</div>
                <div class="card-value" id="inf-res-loss" style="font-size:2rem;font-weight:800">₦0.00</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-muted">Remaining Purchase Power Percentage</div>
              <div class="card-value text-gold" id="inf-res-pct" style="font-size:2rem;font-weight:800">0.0%</div>
            </div>
          </div>
        </div>`;
    }

    wrap.innerHTML = html;
    _bindCalculatorLogic(baseCurrency);
  }

  function _bindCalculatorLogic(currency) {
    // Commas Masking
    document.querySelectorAll('#calc-content-wrap input[type="text"]').forEach(input => {
      WPUtils.maskNumberInput(input);
    });

    if (_activeTab === 'savings-goal') {
      const calc = () => {
        const target = WPUtils.cleanNum(document.getElementById('cg-target').value) || 0;
        const rateVal = parseFloat(document.getElementById('cg-rate').value) || 0;
        const yearsVal = parseFloat(document.getElementById('cg-years').value) || 0;

        const months = yearsVal * 12;
        const r = (rateVal / 100) / 12;
        let monthly = 0;

        if (months > 0) {
          if (r === 0) {
            monthly = target / months;
          } else {
            // Sinking fund formula: PMT = FV * r / ((1 + r)^n - 1)
            monthly = target * r / (Math.pow(1 + r, months) - 1);
          }
        }

        document.getElementById('cg-result').textContent = WPUtils.fmt(monthly * 100, { currency: currency });
        document.getElementById('cg-summary').innerHTML = `To reach a goal of <strong>${WPUtils.fmt(target * 100, { currency: currency })}</strong> in <strong>${yearsVal} years</strong> (at ${rateVal}% interest), you need to save <strong>${WPUtils.fmt(monthly * 100, { currency: currency })}</strong> per month.`;
      };
      document.getElementById('run-savings-goal').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'savings-compound') {
      const calc = () => {
        const init = WPUtils.cleanNum(document.getElementById('cs-init').value) || 0;
        const monthly = WPUtils.cleanNum(document.getElementById('cs-monthly').value) || 0;
        const rateVal = parseFloat(document.getElementById('cs-rate').value) || 0;
        const yearsVal = parseFloat(document.getElementById('cs-years').value) || 0;

        const months = yearsVal * 12;
        const r = (rateVal / 100) / 12;
        let total = init;

        if (r === 0) {
          total = init + (monthly * months);
        } else {
          // Future value of initial deposit + future value of annuity
          const fvInit = init * Math.pow(1 + r, months);
          const fvAnnuity = monthly * (Math.pow(1 + r, months) - 1) / r;
          total = fvInit + fvAnnuity;
        }

        const contributions = init + (monthly * months);
        const interest = Math.max(0, total - contributions);

        document.getElementById('cs-res-total').textContent = WPUtils.fmt(total * 100, { currency: currency });
        document.getElementById('cs-res-contrib').textContent = WPUtils.fmt(contributions * 100, { currency: currency });
        document.getElementById('cs-res-interest').textContent = WPUtils.fmt(interest * 100, { currency: currency });
      };
      document.getElementById('run-savings-compound').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'roi') {
      const calc = () => {
        const initial = WPUtils.cleanNum(document.getElementById('roi-init').value) || 0;
        const returned = WPUtils.cleanNum(document.getElementById('roi-final').value) || 0;
        const years = parseFloat(document.getElementById('roi-years').value) || 0;

        const gain = returned - initial;
        let roiPct = 0;
        let annualized = 0;

        if (initial > 0) {
          roiPct = (gain / initial) * 100;
          if (years > 0) {
            // CAGR formula: ((returned / initial)^(1/years) - 1) * 100
            annualized = (Math.pow(returned / initial, 1 / years) - 1) * 100;
          }
        }

        document.getElementById('roi-res-gain').textContent = WPUtils.fmt(gain * 100, { currency: currency });
        document.getElementById('roi-res-pct').textContent = roiPct.toFixed(2) + '%';
        document.getElementById('roi-res-annual').textContent = years > 0 ? annualized.toFixed(2) + '%' : '—';
      };
      document.getElementById('run-roi').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'loan-simple') {
      const calc = () => {
        const amount = WPUtils.cleanNum(document.getElementById('ls-amount').value) || 0;
        const rate = parseFloat(document.getElementById('ls-rate').value) || 0;
        const months = parseFloat(document.getElementById('ls-months').value) || 0;

        // Simple Interest: I = P * r * t
        const interest = amount * (rate / 100) * (months / 12);
        const total = amount + interest;
        const monthly = months > 0 ? total / months : 0;

        document.getElementById('ls-res-monthly').textContent = WPUtils.fmt(monthly * 100, { currency: currency });
        document.getElementById('ls-res-interest').textContent = WPUtils.fmt(interest * 100, { currency: currency });
        document.getElementById('ls-res-total').textContent = WPUtils.fmt(total * 100, { currency: currency });
      };
      document.getElementById('run-loan-simple').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'loan-detailed') {
      const calc = () => {
        const amount = WPUtils.cleanNum(document.getElementById('ld-amount').value) || 0;
        const rate = parseFloat(document.getElementById('ld-rate').value) || 0;
        const years = parseFloat(document.getElementById('ld-years').value) || 0;

        const months = years * 12;
        const r = (rate / 100) / 12;
        let monthly = 0;

        if (months > 0) {
          if (r === 0) {
            monthly = amount / months;
          } else {
            // Amortization formula: PMT = P * r * (1+r)^n / ((1+r)^n - 1)
            monthly = amount * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
          }
        }

        const total = monthly * months;
        const interest = Math.max(0, total - amount);

        document.getElementById('ld-res-monthly').textContent = WPUtils.fmt(monthly * 100, { currency: currency });
        document.getElementById('ld-res-interest').textContent = WPUtils.fmt(interest * 100, { currency: currency });
        document.getElementById('ld-res-total').textContent = WPUtils.fmt(total * 100, { currency: currency });
      };
      document.getElementById('run-loan-detailed').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'car-loan') {
      const calc = () => {
        const price = WPUtils.cleanNum(document.getElementById('cl-price').value) || 0;
        const down = WPUtils.cleanNum(document.getElementById('cl-down').value) || 0;
        const trade = WPUtils.cleanNum(document.getElementById('cl-trade').value) || 0;
        const taxRate = parseFloat(document.getElementById('cl-tax').value) || 0;
        const rateVal = parseFloat(document.getElementById('cl-rate').value) || 0;
        const months = parseFloat(document.getElementById('cl-months').value) || 0;

        const tax = price * (taxRate / 100);
        const financed = Math.max(0, price + tax - down - trade);
        const r = (rateVal / 100) / 12;
        let monthly = 0;

        if (months > 0) {
          if (r === 0) {
            monthly = financed / months;
          } else {
            monthly = financed * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
          }
        }

        const totalCost = (monthly * months) + down + trade;

        document.getElementById('cl-res-monthly').textContent = WPUtils.fmt(monthly * 100, { currency: currency });
        document.getElementById('cl-res-financed').textContent = WPUtils.fmt(financed * 100, { currency: currency });
        document.getElementById('cl-res-total').textContent = WPUtils.fmt(totalCost * 100, { currency: currency });
      };
      document.getElementById('run-car-loan').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'mc-price' || _activeTab === 'mortgage') {
      const calc = () => {
        const price = WPUtils.cleanNum(document.getElementById('mc-price').value) || 0;
        const down = WPUtils.cleanNum(document.getElementById('mc-down').value) || 0;
        const rateVal = parseFloat(document.getElementById('mc-rate').value) || 0;
        const years = parseFloat(document.getElementById('mc-years').value) || 0;
        const tax = WPUtils.cleanNum(document.getElementById('mc-tax').value) || 0;
        const ins = WPUtils.cleanNum(document.getElementById('mc-ins').value) || 0;

        const loan = Math.max(0, price - down);
        const months = years * 12;
        const r = (rateVal / 100) / 12;
        let monthlyPI = 0;

        if (months > 0) {
          if (r === 0) {
            monthlyPI = loan / months;
          } else {
            monthlyPI = loan * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
          }
        }

        const monthlyTax = tax / 12;
        const monthlyIns = ins / 12;
        const total = monthlyPI + monthlyTax + monthlyIns;

        document.getElementById('mc-res-total').textContent = WPUtils.fmt(total * 100, { currency: currency });
        document.getElementById('mc-res-pi').textContent = WPUtils.fmt(monthlyPI * 100, { currency: currency });
        document.getElementById('mc-res-tax').textContent = WPUtils.fmt(monthlyTax * 100, { currency: currency });
        document.getElementById('mc-res-ins').textContent = WPUtils.fmt(monthlyIns * 100, { currency: currency });
      };
      document.getElementById('run-mortgage').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'fixed-deposit') {
      html = `
        <div class="grid-2">
          <div class="card" style="padding:2rem">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Fixed Deposit / CD Calculator</h3>
            <div class="form-group">
              <label for="fd-principal">Deposit Amount / Principal (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="fd-principal" value="1,000,000">
              </div>
            </div>
            <div class="form-group">
              <label for="fd-rate">Interest Rate (% p.a.)</label>
              <input class="input" type="number" id="fd-rate" min="0" step="0.1" value="12">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="fd-term">Term Value</label>
                <input class="input" type="number" id="fd-term" min="1" value="12">
              </div>
              <div class="form-group">
                <label for="fd-term-unit">Term Unit</label>
                <select class="select" id="fd-term-unit">
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="fd-compound">Compounding Frequency</label>
              <select class="select" id="fd-compound">
                <option value="365">Daily</option>
                <option value="12" selected>Monthly</option>
                <option value="4">Quarterly</option>
                <option value="2">Semi-annually</option>
                <option value="1">Annually</option>
              </select>
            </div>
            <button class="btn btn-primary" id="run-fd" style="margin-top:1rem;width:100%">Calculate Yield</button>
          </div>
          
          <div class="card" style="padding:2rem;background:linear-gradient(135deg,var(--clr-surface-3),var(--clr-surface-2))">
            <h3 style="margin-bottom:1.5rem;font-weight:700;color:var(--clr-accent)">Maturity Breakdown</h3>
            <div style="display:flex;flex-direction:column;gap:1.25rem">
              <div>
                <div style="font-size:0.8rem;color:var(--clr-text-3);text-transform:uppercase">Maturity Value</div>
                <div id="fd-res-maturity" class="accent" style="font-size:2.2rem;font-weight:800;font-family:var(--font-mono)">—</div>
              </div>
              <div>
                <div style="font-size:0.8rem;color:var(--clr-text-3);text-transform:uppercase">Total Interest Earned</div>
                <div id="fd-res-interest" class="gold" style="font-size:1.6rem;font-weight:700;font-family:var(--font-mono)">—</div>
              </div>
              <div>
                <div style="font-size:0.8rem;color:var(--clr-text-3);text-transform:uppercase">Effective Annual Yield (EAY)</div>
                <div id="fd-res-eay" class="text-white" style="font-size:1.3rem;font-weight:600;font-family:var(--font-mono)">—</div>
              </div>
            </div>
          </div>
        </div>`;
      wrap.innerHTML = html;
      WPUtils.maskNumberInput(document.getElementById('fd-principal'));

      const calc = () => {
        const principal = WPUtils.cleanNum(document.getElementById('fd-principal').value) || 0;
        const rate = parseFloat(document.getElementById('fd-rate').value) || 0;
        const term = parseFloat(document.getElementById('fd-term').value) || 0;
        const termUnit = document.getElementById('fd-term-unit').value;
        const compound = parseFloat(document.getElementById('fd-compound').value);

        // Convert term to years
        const t = termUnit === 'years' ? term : term / 12;
        const r = rate / 100;
        
        // Maturity = P * (1 + r/n)^(n*t)
        const maturity = principal * Math.pow(1 + (r / compound), compound * t);
        const interest = Math.max(0, maturity - principal);
        
        // EAY = (1 + r/n)^n - 1
        const eay = (Math.pow(1 + (r / compound), compound) - 1) * 100;

        document.getElementById('fd-res-maturity').textContent = WPUtils.fmt(maturity * 100, { currency: currency });
        document.getElementById('fd-res-interest').textContent = WPUtils.fmt(interest * 100, { currency: currency });
        document.getElementById('fd-res-eay').textContent = eay.toFixed(3) + '%';
      };

      document.getElementById('run-fd').addEventListener('click', calc);
      calc();
    }

    else if (_activeTab === 'inflation') {
      const calc = () => {
        const amount = WPUtils.cleanNum(document.getElementById('inf-amount').value) || 0;
        const rate = parseFloat(document.getElementById('inf-rate').value) || 0;
        const years = parseFloat(document.getElementById('inf-years').value) || 0;

        // Future Purchasing Power = Current / (1 + inflation)^years
        const future = amount / Math.pow(1 + (rate / 100), years);
        const loss = amount - future;
        const pct = (future / Math.max(1, amount)) * 100;

        document.getElementById('inf-res-future').textContent = WPUtils.fmt(future * 100, { currency: currency });
        document.getElementById('inf-res-loss').textContent = WPUtils.fmt(loss * 100, { currency: currency });
        document.getElementById('inf-res-pct').textContent = pct.toFixed(2) + '%';
      };
      document.getElementById('run-inflation').addEventListener('click', calc);
      calc();
    }
  }

  function destroy() {}
  return { init, destroy };
})();
