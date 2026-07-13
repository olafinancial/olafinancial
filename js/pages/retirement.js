// ============================================================
// OlaFinancial — Retirement Planner (PENCOM + TVM)
// ============================================================

const WPRetirement = (() => {

  let _fetchedPrices = {};

  async function init(container) {
    const profile = WPApp.state.profile || {};
    const age     = profile.age || 35;
    const retAge  = profile.retirement_age || 60;
    const risk    = profile.risk_tolerance || 'moderate';

    const currencyCode = WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', AED: 'د.إ', CNY: '¥', XOF: 'CFA', XAF: 'FCFA', KES: 'KSh', GHS: 'GH₵', ZAR: 'R', SAR: 'ر.س' };
    const symbol = symbols[currencyCode] || '₦';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Retirement Planner</h1>
          <p class="page-subtitle">PENCOM contributory pension + personal investment projection</p>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <!-- Inputs -->
        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F527; Retirement Inputs</div>
          <div class="grid-3">
            <div class="form-group">
              <label for="ret-jurisdiction">Retirement Jurisdiction</label>
              <select class="select" id="ret-jurisdiction">
                <option value="NG" selected>Nigeria (PENCOM / RSA)</option>
                <option value="US">United States (401k / IRA)</option>
                <option value="UK">United Kingdom (Pension)</option>
                <option value="CA">Canada (RRSP / TFSA)</option>
                <option value="other">Other / Generic Savings</option>
              </select>
            </div>
            <div class="form-group">
              <label for="ret-age">Current Age</label>
              <input class="input" type="number" id="ret-age" min="18" max="70" value="${age}">
            </div>
            <div class="form-group">
              <label for="ret-retire">Target Retirement Age</label>
              <input class="input" type="number" id="ret-retire" min="40" max="75" value="${retAge}">
            </div>
            <div class="form-group">
              <label for="ret-life">Life Expectancy</label>
              <input class="input" type="number" id="ret-life" min="60" max="100" value="85">
            </div>

            <!-- NIGERIA SPECIFIC FIELDS -->
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-rsa">Current RSA Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-rsa" placeholder="0">
              </div>
            </div>
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-avc">Current AVC Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-avc" placeholder="0">
              </div>
            </div>
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-gratuity">Current Gratuity Benefit (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-gratuity" placeholder="0">
              </div>
            </div>

            <!-- US SPECIFIC FIELDS -->
            <div class="form-group ret-juris-field juris-US" style="display:none">
              <label for="ret-401k">Current 401(k) / IRA Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-401k" placeholder="0">
              </div>
            </div>
            <div class="form-group ret-juris-field juris-US" style="display:none">
              <label for="ret-us-employer-match">Employer Match (%)</label>
              <input class="input" type="number" id="ret-us-employer-match" min="0" max="20" step="0.5" value="3">
            </div>

            <!-- UK/CA/OTHER GENERIC FIELDS -->
            <div class="form-group ret-juris-field juris-UK juris-CA juris-other" style="display:none">
              <label for="ret-gen-pension">Current Local Pension Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-gen-pension" placeholder="0">
              </div>
            </div>

            <div class="form-group">
              <label for="ret-salary">Current Monthly Gross (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-salary" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-invest">Monthly Investment Savings (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-invest" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-monthly-need">Monthly Income Needed (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-monthly-need" placeholder="e.g. 500,000">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-inflation">Inflation Rate (%)</label>
              <input class="input" type="number" id="ret-inflation" min="0" max="50" step="0.5" value="18">
            </div>
            <div class="form-group">
              <label for="ret-risk">Risk Profile</label>
              <select class="select" id="ret-risk">
                <option value="conservative" ${risk==='conservative'?'selected':''}>Conservative (8–10%)</option>
                <option value="moderate"     ${risk==='moderate'    ?'selected':''}>Moderate (11–13%)</option>
                <option value="aggressive"   ${risk==='aggressive'  ?'selected':''}>Aggressive (14–18%)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="ret-calc-btn">Calculate Retirement Plan</button>
        </div>

        <!-- Stock Holdings Mark-to-Market Tracking -->
        <div class="card" style="margin-bottom:1.5rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem">
            <div class="section-title" style="margin:0">&#x1F4C8; Stock Assets (Mark-to-Market)</div>
            <div style="display:flex;gap:0.5rem">
              <button type="button" class="btn btn-secondary btn-sm" id="ret-refresh-stocks-btn" title="Refresh live prices">↻ Refresh prices</button>
              <button type="button" class="btn btn-secondary btn-sm" id="ret-add-stock-btn">+ Add Stock</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Qty</th>
                  <th>Purchase Price</th>
                  <th>Current Price</th>
                  <th>Cost Basis</th>
                  <th>Current Value</th>
                  <th>Gain / Loss</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="ret-stocks-list">
                <tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--clr-text-3)">No stock assets logged. Click "+ Add Stock" to begin tracking.</td></tr>
              </tbody>
            </table>
          </div>
          <div id="ret-stocks-total"></div>
        </div>

        <!-- Results -->
        <div id="ret-results" style="display:none"></div>
      </div>`;

    document.getElementById('ret-calc-btn').addEventListener('click', _calculate);
    document.getElementById('ret-add-stock-btn').addEventListener('click', _openStockForm);
    document.getElementById('ret-refresh-stocks-btn')?.addEventListener('click', () => {
      _fetchedPrices = {};
      _renderStocks();
    });

    // Show/hide fields based on jurisdiction selection
    const jurisSelect = document.getElementById('ret-jurisdiction');
    jurisSelect.addEventListener('change', () => {
      const val = jurisSelect.value;
      document.querySelectorAll('.ret-juris-field').forEach(el => {
        el.style.display = el.classList.contains(`juris-${val}`) ? 'block' : 'none';
      });
    });

    WPUtils.maskNumberInput(document.getElementById('ret-rsa'));
    WPUtils.maskNumberInput(document.getElementById('ret-avc'));
    WPUtils.maskNumberInput(document.getElementById('ret-gratuity'));
    WPUtils.maskNumberInput(document.getElementById('ret-401k'));
    WPUtils.maskNumberInput(document.getElementById('ret-gen-pension'));
    WPUtils.maskNumberInput(document.getElementById('ret-salary'));
    WPUtils.maskNumberInput(document.getElementById('ret-invest'));
    WPUtils.maskNumberInput(document.getElementById('ret-monthly-need'));

    // Pre-populate from income data
    await _prefillFromState();
    _renderStocks();
  }

  async function _prefillFromState() {
    try {
      const PERIOD = WPUtils.currentPeriod();
      const uid    = WPApp.state.user.id;
      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const pageCurrency = WPApp.state.profile?.currency || 'NGN';

      const [income, assets] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, PERIOD),
        WPDb.getAssetsByPeriod(uid, PERIOD)
      ]);

      const monthlyGross = income.reduce((s,e) => {
        const cur = WPUtils.getEntryCurrency(e.notes);
        return s + WPUtils.convert(e.gross_amount||0, cur, pageCurrency);
      }, 0);
      if (monthlyGross > 0) {
        document.getElementById('ret-salary').value = WPUtils.koboToNaira(monthlyGross).toFixed(0);
      }

      // 1. RSA
      const rsaAssets = assets.filter(a => {
        if (a.asset_type === 'pension') return true;
        if (a.asset_type === 'retirement_contribution') {
          if (a.notes && (a.notes.includes('[sub:avc]') || a.notes.includes('[sub:gratuity]'))) return false;
          return true;
        }
        return false;
      });
      const totalRSA = rsaAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
      }, 0);
      if (totalRSA > 0) {
        document.getElementById('ret-rsa').value = WPUtils.koboToNaira(totalRSA).toFixed(0);
      }

      // 2. AVC
      const avcAssets = assets.filter(a => a.asset_type === 'retirement_contribution' && a.notes && a.notes.includes('[sub:avc]'));
      const totalAVC = avcAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
      }, 0);
      if (totalAVC > 0) {
        document.getElementById('ret-avc').value = WPUtils.koboToNaira(totalAVC).toFixed(0);
      }

      // 3. Gratuity
      const gratAssets = assets.filter(a => a.asset_type === 'retirement_contribution' && a.notes && a.notes.includes('[sub:gratuity]'));
      const totalGrat = gratAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
      }, 0);
      if (totalGrat > 0) {
        document.getElementById('ret-gratuity').value = WPUtils.koboToNaira(totalGrat).toFixed(0);
      }

      // 4. US 401(k) / IRA & Generic pensions
      const totalUS = assets.filter(a => a.notes && a.notes.includes('[USD]')).reduce((s, a) => {
        if (a.asset_type === 'retirement_contribution' || a.asset_type === 'pension') {
          const cur = WPUtils.getEntryCurrency(a.notes);
          return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
        }
        return s;
      }, 0);
      if (totalUS > 0) {
        document.getElementById('ret-401k').value = WPUtils.koboToNaira(totalUS).toFixed(0);
      }

      const totalGen = assets.reduce((s, a) => {
        if (a.asset_type === 'retirement_contribution' || a.asset_type === 'pension') {
          const cur = WPUtils.getEntryCurrency(a.notes);
          return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
        }
        return s;
      }, 0);
      if (totalGen > 0) {
        document.getElementById('ret-gen-pension').value = WPUtils.koboToNaira(totalGen).toFixed(0);
      }

    } catch (e) {}
  }

  function _calculate() {
    const juris      = document.getElementById('ret-jurisdiction').value;
    const age        = parseInt(document.getElementById('ret-age').value) || 35;
    const retAge     = parseInt(document.getElementById('ret-retire').value) || 60;
    const lifeExp    = parseInt(document.getElementById('ret-life').value) || 85;

    let initialPensionKobo = 0;
    let avcKobo = 0;
    let gratuityKobo = 0;
    let matchPct = 3;

    if (juris === 'NG') {
      initialPensionKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-rsa').value));
      avcKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-avc').value));
      gratuityKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-gratuity').value));
    } else if (juris === 'US') {
      initialPensionKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-401k').value));
      matchPct = parseFloat(document.getElementById('ret-us-employer-match').value) || 0;
    } else {
      initialPensionKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-gen-pension').value));
    }

    const salaryKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-salary').value));
    
    // Compute current stock assets valuation (same mark-to-market as table)
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const stocks = _loadStocks();
    const { totalValue: totalStocksUSD } = _portfolioTotals(stocks);

    // Convert stock USD valuation to base page/profile currency in kobo
    const stocksValuationKobo = WPUtils.convert(Math.round(totalStocksUSD * 100), 'USD', baseCur);

    const investKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-invest').value));
    const needKobo   = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-monthly-need').value));
    const inflation  = parseFloat(document.getElementById('ret-inflation').value) || 18;
    const riskKey    = document.getElementById('ret-risk').value;

    if (retAge <= age) { WPToast.warning('Retirement age must be greater than current age.'); return; }

    const plan = WPUtils.calcRetirement({
      currentAge: age, retirementAge: retAge, lifeExpectancy: lifeExp,
      currentRSAKobo: initialPensionKobo, monthlyGrossKobo: salaryKobo,
      monthlyInvestmentKobo: investKobo, monthlyIncomeNeededKobo: needKobo,
      inflationPct: inflation, riskTolerance: riskKey,
      jurisdiction: juris, avcKobo, gratuityKobo, employerMatchPct: matchPct
    });

    // Add stock valuation to projected investment fund output
    const rates = { conservative: 0.09, moderate: 0.12, aggressive: 0.16 };
    const rate = rates[riskKey] || 0.12;
    const yearsToRetirement = retAge - age;
    const projectedStocksKobo = WPUtils.calcFV(rate, yearsToRetirement, 0, stocksValuationKobo);
    
    plan.projectedInvestKobo += projectedStocksKobo;
    plan.projectedFundKobo += projectedStocksKobo;

    _renderResults(plan, age, retAge, lifeExp, juris);
  }

  function _renderResults(plan, age, retAge, lifeExp, jurisdiction) {
    const el = document.getElementById('ret-results');
    el.style.display = '';
    const surplus = plan.projectedFundKobo - plan.requiredNestEggKobo;
    const onTrack = surplus >= 0;

    let detailsCard = '';
    if (jurisdiction === 'NG') {
      detailsCard = `
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; PENCOM Contributory Pension Scheme (Nigeria)</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Employer Contribution</td><td class="td-mono text-accent">10% of emoluments</td></tr>
            <tr><td>Employee Contribution</td><td class="td-mono text-accent">8% of emoluments</td></tr>
            <tr><td>Total Monthly Contribution</td><td class="td-mono fw-700">${WPUtils.fmt(plan.monthlyPensionTotalKobo)}</td></tr>
            <tr><td>Projected RSA at ${retAge} (incl. AVC &amp; Gratuity)</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>RSA Monthly Drawdown (${lifeExp - retAge} yrs)</td><td class="td-mono">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
          </tbody>
        </table></div>
        <div class="alert alert-info" style="margin-top:1rem">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span>Under PENCOM Regulation, you can access 25% of RSA balance if you are unemployed for 4+ months. Full withdrawal at age 50+ upon retirement.</span>
        </div>
      </div>`;
    } else if (jurisdiction === 'US') {
      detailsCard = `
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; 401(k) / IRA Pension Plan (United States)</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Estimated Employee Contribution</td><td class="td-mono text-accent">6% of salary</td></tr>
            <tr><td>Employer Match</td><td class="td-mono text-accent">Up to ${document.getElementById('ret-us-employer-match').value}%</td></tr>
            <tr><td>Projected Pension Value at ${retAge}</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>Monthly Portfolio Drawdown (${lifeExp - retAge} yrs)</td><td class="td-mono">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
          </tbody>
        </table></div>
        <div class="alert alert-info" style="margin-top:1rem">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span>2025 Contribution Limits apply: $23,000 max annual contribution limit ($30,500 if catch-up eligible). Regular withdrawals penalty-free starting age 59½.</span>
        </div>
      </div>`;
    } else {
      detailsCard = `
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; Pension Plan Summary</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Projected Pension Value at ${retAge}</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>Monthly Portfolio Drawdown (${lifeExp - retAge} yrs)</td><td class="td-mono">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
          </tbody>
        </table></div>
      </div>`;
    }

    el.innerHTML = `
      <!-- Summary Banner -->
      <div class="card" style="background:linear-gradient(135deg,${onTrack?'var(--clr-accent-dim)':'rgba(239,68,68,0.1)'},var(--clr-surface-2));margin-bottom:1.5rem;text-align:center;padding:2.5rem">
        <div class="card-title">${onTrack?'🌴 You are on track!':'⚠️ Retirement Gap Detected'}</div>
        <div class="card-value ${onTrack?'accent':'danger'}" style="font-size:3rem;margin:0.5rem 0">
          ${onTrack ? '+'+WPUtils.fmt(surplus,{compact:true}) : WPUtils.fmt(Math.abs(surplus),{compact:true})+' shortfall'}
        </div>
        <div class="card-meta">${onTrack
          ? `Your projected fund exceeds your target by ${WPUtils.fmt(surplus,{compact:true})} 🎉`
          : `You need to save an extra ${WPUtils.fmt(plan.additionalMonthlyKobo)}/month to close the gap.`
        }</div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="margin-bottom:1.5rem">
        <div class="card"><div class="card-title">Years to Retirement</div><div class="card-value">${retAge - age}</div></div>
        <div class="card"><div class="card-title">Projected Pension Fund</div><div class="card-value gold">${WPUtils.fmt(plan.projectedRSAKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Projected Investment Fund</div><div class="card-value accent">${WPUtils.fmt(plan.projectedInvestKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Total Projected Fund</div><div class="card-value ${onTrack?'accent':'danger'}">${WPUtils.fmt(plan.projectedFundKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Required Nest Egg</div><div class="card-value">${WPUtils.fmt(plan.requiredNestEggKobo,{compact:true})}</div><div class="card-meta">${lifeExp - retAge} yrs × inflation-adj.</div></div>
      </div>

      <!-- Localised details card -->
      ${detailsCard}

      <!-- Action Plan -->
      <div class="card">
        <div class="section-title" style="margin-bottom:1rem">&#x1F3AF; Your Action Plan</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${plan.recommendations.map((r,i) => `
            <div style="display:flex;gap:1rem;align-items:start">
              <span style="width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:0.8rem">${i+1}</span>
              <span style="font-size:0.9rem;padding-top:4px">${r}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function _loadStocks() {
    const uid = WPApp.state.user?.id;
    if (!uid) return [];
    try {
      const raw = JSON.parse(localStorage.getItem('wp_ret_stocks_' + uid) || '[]');
      return (Array.isArray(raw) ? raw : []).map(s => ({
        ...s,
        ticker: String(s.ticker || '').trim(),
        qty: Number(s.qty) || 0,
        purchasePrice: Number(s.purchasePrice) || 0,
      })).filter(s => s.ticker && s.qty > 0);
    } catch {
      return [];
    }
  }

  function _saveStocks(stocks) {
    const uid = WPApp.state.user?.id;
    if (!uid) return;
    localStorage.setItem('wp_ret_stocks_' + uid, JSON.stringify(stocks));
    _renderStocks();
  }

  function _getMockPrice(ticker, buyPrice) {
    const sym = ticker.toUpperCase().trim();
    const basePrices = {
      AAPL: 190, TSLA: 175, MSFT: 420, GOOG: 170, GOOGL: 170,
      AMZN: 180, NVDA: 125, NFLX: 620, META: 475, SPY: 520, QQQ: 450,
    };
    const base = basePrices[sym];
    const day = new Date().getDate();
    let hash = 0;
    for (let i = 0; i < sym.length; i++) hash += sym.charCodeAt(i);
    const dailyFluc = ((hash + day) % 6) - 3;
    if (base !== undefined) return Math.max(1, base * (1 + dailyFluc / 100));
    return Math.max(1, (buyPrice || 100) * (1.15 + dailyFluc / 100));
  }

  /** Live quote via Yahoo chart API through CORS proxies; null if unavailable. */
  async function _fetchLivePrice(ticker) {
    const yahooUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
      `?interval=1d&range=1d`;
    const proxies = [
      // raw body = Yahoo JSON
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      // JSON wrapper { contents: "..." }
      `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
    ];

    for (const url of proxies) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        let data = await res.json();
        // Unwrap allorigins /get shape
        if (data && typeof data.contents === 'string') {
          try { data = JSON.parse(data.contents); } catch { continue; }
        }
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          ?? data?.chart?.result?.[0]?.meta?.previousClose;
        if (price && Number(price) > 0) return Number(price);
      } catch {
        /* try next proxy */
      }
    }
    return null;
  }

  function _priceFor(sym, purchasePrice) {
    if (_fetchedPrices[sym] != null && _fetchedPrices[sym] > 0) return _fetchedPrices[sym];
    return _getMockPrice(sym, purchasePrice);
  }

  function _portfolioTotals(list) {
    let totalCost = 0;
    let totalValue = 0;
    for (const s of list) {
      const sym = s.ticker.toUpperCase().trim();
      const px = _priceFor(sym, s.purchasePrice);
      totalCost += s.qty * s.purchasePrice;
      totalValue += s.qty * px;
    }
    return { totalCost, totalValue, totalGain: totalValue - totalCost };
  }

  function _paintStocksTable(list, statusNote = '') {
    const el = document.getElementById('ret-stocks-list');
    const totalEl = document.getElementById('ret-stocks-total');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--clr-text-3)">No stock assets logged. Click "+ Add Stock" to begin tracking.</td></tr>`;
      if (totalEl) totalEl.innerHTML = '';
      return;
    }

    const { totalCost, totalValue, totalGain } = _portfolioTotals(list);
    const isGain = totalGain >= 0;
    const gainPct = (totalGain / Math.max(1, totalCost)) * 100;
    const liveCount = list.filter(s => _fetchedPrices[s.ticker.toUpperCase().trim()] != null).length;

    el.innerHTML = list.map((s, idx) => {
      const sym = s.ticker.toUpperCase().trim();
      const currentPrice = _priceFor(sym, s.purchasePrice);
      const isLive = _fetchedPrices[sym] != null;
      const costBasis = s.qty * s.purchasePrice;
      const currentValue = s.qty * currentPrice;
      const gainLoss = currentValue - costBasis;
      const rowPct = (gainLoss / Math.max(1, costBasis)) * 100;
      const rowGain = gainLoss >= 0;

      return `<tr>
        <td><strong>${sym}</strong>${isLive ? ' <span class="badge badge-accent" style="font-size:0.65rem">LIVE</span>' : ' <span class="badge badge-neutral" style="font-size:0.65rem">EST</span>'}</td>
        <td class="td-mono">${s.qty}</td>
        <td class="td-mono">$${s.purchasePrice.toFixed(2)}</td>
        <td class="td-mono text-accent">$${currentPrice.toFixed(2)}</td>
        <td class="td-mono">$${costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="td-mono fw-600">$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="td-mono fw-600 ${rowGain ? 'text-accent' : 'text-danger'}">
          ${rowGain ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${rowGain ? '+' : ''}${rowPct.toFixed(2)}%)
        </td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm text-danger" onclick="WPRetirement._deleteStock(${idx})">Delete</button>
        </td>
      </tr>`;
    }).join('') + `
      <tr style="border-top:2px solid var(--clr-border-2);background:var(--clr-surface-2)">
        <td colspan="4" class="fw-700">Portfolio total (${list.length} position${list.length === 1 ? '' : 's'})</td>
        <td class="td-mono fw-700">$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="td-mono fw-700 text-accent">$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="td-mono fw-700 ${isGain ? 'text-accent' : 'text-danger'}">
          ${isGain ? '+' : ''}${totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${isGain ? '+' : ''}${gainPct.toFixed(2)}%)
        </td>
        <td></td>
      </tr>`;

    if (totalEl) {
      totalEl.innerHTML = `
        <div class="card" style="margin-top:0.75rem;padding:1rem 1.25rem;display:flex;flex-wrap:wrap;gap:1.25rem;align-items:center;justify-content:space-between">
          <div>
            <div class="card-title" style="margin:0">Total stock holdings (mark-to-market)</div>
            <div class="text-xs text-muted" style="margin-top:0.25rem">${statusNote || (liveCount ? `${liveCount}/${list.length} live quotes` : 'Using estimated prices — live feed unavailable')}</div>
          </div>
          <div class="card-value income" style="font-size:1.4rem">$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>`;
    }
  }

  async function _renderStocks() {
    const list = _loadStocks();
    const el = document.getElementById('ret-stocks-list');
    if (!el) return;

    if (!list.length) {
      _paintStocksTable(list);
      return;
    }

    // Immediate paint with last-known / mock prices so UI is never empty
    _paintStocksTable(list, 'Refreshing live prices…');

    const tickers = [...new Set(list.map(s => s.ticker.toUpperCase().trim()))];
    const next = { ..._fetchedPrices };
    await Promise.all(tickers.map(async (ticker) => {
      const price = await _fetchLivePrice(ticker);
      if (price != null) next[ticker] = price;
    }));
    _fetchedPrices = next;

    const liveCount = tickers.filter(t => _fetchedPrices[t] != null).length;
    _paintStocksTable(
      list,
      liveCount
        ? `${liveCount}/${tickers.length} live quotes · total includes all positions`
        : 'Live quotes unavailable — showing estimates · total includes all positions'
    );
  }

  function _openStockForm() {
    const body = `
      <form id="ret-stock-form">
        <div class="form-group">
          <label for="rs-ticker">Ticker Symbol</label>
          <input class="input" id="rs-ticker" placeholder="e.g. TSLA, AAPL" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="rs-qty">Quantity</label>
            <input class="input" type="number" id="rs-qty" min="1" step="any" placeholder="10" required>
          </div>
          <div class="form-group">
            <label for="rs-price">Purchase Price ($)</label>
            <input class="input" type="number" id="rs-price" min="0.01" step="any" placeholder="150.00" required>
          </div>
        </div>
        <div class="form-group">
          <label for="rs-date">Date of Purchase</label>
          <input class="input" type="date" id="rs-date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </form>`;

    WPModal.open('Add Stock Asset', body, {
      confirmLabel: 'Add Stock',
      onConfirm: async () => {
        const ticker = document.getElementById('rs-ticker').value.trim();
        const qty = parseFloat(document.getElementById('rs-qty').value) || 0;
        const price = parseFloat(document.getElementById('rs-price').value) || 0;
        const date = document.getElementById('rs-date').value;

        if (!ticker || qty <= 0 || price <= 0) {
          WPToast.warning('Please enter valid stock details.');
          return;
        }

        const stocks = _loadStocks();
        stocks.push({ ticker, qty, purchasePrice: price, purchaseDate: date });
        _saveStocks(stocks);
        WPToast.success('Stock asset logged and marked-to-market!');
      }
    });
  }

  function _deleteStock(idx) {
    const stocks = _loadStocks();
    stocks.splice(idx, 1);
    _saveStocks(stocks);
    WPToast.success('Stock asset removed.');
  }

  function destroy() {}
  return { init, destroy, _deleteStock };
})();
