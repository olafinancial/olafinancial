// ============================================================
// OlaFinancial — Retirement Planner (PENCOM + TVM)
// ============================================================

const WPRetirement = (() => {

  async function init(container) {
    const profile = WPApp.state.profile || {};
    const age     = profile.age || 35;
    const retAge  = profile.retirement_age || 60;
    const risk    = profile.risk_tolerance || 'moderate';

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
            <div class="form-group">
              <label for="ret-rsa">Current RSA Balance (&#x20A6;)</label>
              <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
                <input class="input" type="text" inputmode="decimal" id="ret-rsa" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-salary">Current Monthly Gross (&#x20A6;)</label>
              <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
                <input class="input" type="text" inputmode="decimal" id="ret-salary" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-invest">Monthly Investment Savings (&#x20A6;)</label>
              <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
                <input class="input" type="text" inputmode="decimal" id="ret-invest" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label for="ret-monthly-need">Monthly Income Needed (&#x20A6;)</label>
              <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
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
        <!-- Results -->
        <div id="ret-results" style="display:none"></div>
      </div>`;

    document.getElementById('ret-calc-btn').addEventListener('click', _calculate);

    WPUtils.maskNumberInput(document.getElementById('ret-rsa'));
    WPUtils.maskNumberInput(document.getElementById('ret-salary'));
    WPUtils.maskNumberInput(document.getElementById('ret-invest'));
    WPUtils.maskNumberInput(document.getElementById('ret-monthly-need'));

    // Pre-populate from income data
    _prefillFromState();
  }

  async function _prefillFromState() {
    try {
      const PERIOD = WPUtils.currentPeriod();
      const uid    = WPApp.state.user.id;
      const income = await WPDb.getIncomeByPeriod(uid, PERIOD);
      const monthlyGross = income.reduce((s,e) => s+(e.gross_amount||0), 0);
      if (monthlyGross > 0) {
        document.getElementById('ret-salary').value = WPUtils.koboToNaira(monthlyGross).toFixed(0);
      }
    } catch (e) {}
  }

  function _calculate() {
    const age        = parseInt(document.getElementById('ret-age').value) || 35;
    const retAge     = parseInt(document.getElementById('ret-retire').value) || 60;
    const lifeExp    = parseInt(document.getElementById('ret-life').value) || 85;
    const rsaKobo    = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-rsa').value));
    const salaryKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-salary').value));
    const investKobo = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-invest').value));
    const needKobo   = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-monthly-need').value));
    const inflation  = parseFloat(document.getElementById('ret-inflation').value) || 18;
    const riskKey    = document.getElementById('ret-risk').value;

    if (retAge <= age) { WPToast.warning('Retirement age must be greater than current age.'); return; }

    const plan = WPUtils.calcRetirement({
      currentAge: age, retirementAge: retAge, lifeExpectancy: lifeExp,
      currentRSAKobo: rsaKobo, monthlyGrossKobo: salaryKobo,
      monthlyInvestmentKobo: investKobo, monthlyIncomeNeededKobo: needKobo,
      inflationPct: inflation, riskTolerance: riskKey,
    });

    _renderResults(plan, age, retAge, lifeExp);
  }

  function _renderResults(plan, age, retAge, lifeExp) {
    const el = document.getElementById('ret-results');
    el.style.display = '';
    const surplus = plan.projectedFundKobo - plan.requiredNestEggKobo;
    const onTrack = surplus >= 0;

    el.innerHTML = `
      <!-- Summary Banner -->
      <div class="card" style="background:linear-gradient(135deg,${onTrack?'var(--clr-accent-dim)':'rgba(239,68,68,0.1)'},var(--clr-surface-2));margin-bottom:1.5rem;text-align:center;padding:2.5rem">
        <div class="card-title">${onTrack?'&#x1F334; You are on track!':'&#x26A0;&#xFE0F; Retirement Gap Detected'}</div>
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
        <div class="card"><div class="card-title">Projected RSA at Retirement</div><div class="card-value gold">${WPUtils.fmt(plan.projectedRSAKobo,{compact:true})}</div><div class="card-meta">PENCOM CPS (18%)</div></div>
        <div class="card"><div class="card-title">Projected Investment Fund</div><div class="card-value accent">${WPUtils.fmt(plan.projectedInvestKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Total Projected Fund</div><div class="card-value ${onTrack?'accent':'danger'}">${WPUtils.fmt(plan.projectedFundKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Required Nest Egg</div><div class="card-value">${WPUtils.fmt(plan.requiredNestEggKobo,{compact:true})}</div><div class="card-meta">${lifeExp - retAge} yrs × inflation-adj.</div></div>
      </div>

      <!-- PENCOM Details -->
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; PENCOM Contributory Pension Scheme</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Employer Contribution</td><td class="td-mono text-accent">10% of emoluments</td></tr>
            <tr><td>Employee Contribution</td><td class="td-mono text-accent">8% of emoluments</td></tr>
            <tr><td>Total Monthly Contribution</td><td class="td-mono fw-700">${WPUtils.fmt(plan.monthlyPensionTotalKobo)}</td></tr>
            <tr><td>Projected RSA at ${retAge}</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>RSA Monthly Drawdown (${lifeExp - retAge} yrs)</td><td class="td-mono">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
          </tbody>
        </table></div>
        <div class="alert alert-info" style="margin-top:1rem">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span>Under PENCOM Regulation, you can access 25% of RSA balance if you are unemployed for 4+ months. Full withdrawal at age 50+ upon retirement.</span>
        </div>
      </div>

      <!-- Action Plan -->
      <div class="card">
        <div class="section-title" style="margin-bottom:1rem">&#x1F3AF; Your Action Plan</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${plan.recommendations.map((r,i) => `
            <div class="flex gap-4 items-start">
              <span style="width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:0.8rem">${i+1}</span>
              <span style="font-size:0.9rem;padding-top:4px">${r}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function destroy() {}
  return { init, destroy };
})();
