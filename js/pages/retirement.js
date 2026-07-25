// ============================================================
// OlaFinancial — Retirement Planner (PENCOM / PFA-style)
// Modelled after Nigerian PFA calculators (e.g. Stanbic IBTC):
// RSA balance + monthly contribution → RSA at retirement,
// with Lump Sum vs Programmed Withdrawal goals.
// ============================================================

const WPRetirement = (() => {

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
          <p class="page-subtitle">RSA projection · lump sum &amp; programmed withdrawal (PENCOM-style)</p>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>

        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:1rem">&#x1F527; Profile &amp; balances</div>
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
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">Used for programmed withdrawal length</span>
            </div>

            <!-- NIGERIA -->
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-rsa">Current RSA Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-rsa" placeholder="0">
              </div>
            </div>
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-avc">Additional Voluntary Contribution (AVC) Balance (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-avc" placeholder="0">
              </div>
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">AVC balance in your RSA (PENCOM) — not a separate investment account</span>
            </div>
            <div class="form-group ret-juris-field juris-NG">
              <label for="ret-gratuity">Gratuity Benefit (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-gratuity" placeholder="0">
              </div>
            </div>

            <!-- US -->
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

            <!-- UK/CA/OTHER -->
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
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">Monthly figure (annual income is converted when prefilled)</span>
            </div>
            <div class="form-group">
              <label for="ret-monthly-contrib">Monthly RSA / pension contribution (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-monthly-contrib" placeholder="Auto: 18% of gross">
              </div>
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block" id="ret-contrib-hint">Nigeria default: 18% of monthly gross (8% + 10%). Override with your remittance slip.</span>
            </div>
            <div class="form-group">
              <label for="ret-return">Expected RSA return (% / year)</label>
              <input class="input" type="number" id="ret-return" min="0" max="25" step="0.5" value="10">
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">PFA long-run assumption (typical 8–12%). Updated when Risk Profile changes unless you override.</span>
            </div>
            <div class="form-group">
              <label for="ret-risk">Risk Profile</label>
              <select class="select" id="ret-risk">
                <option value="conservative" ${risk==='conservative'?'selected':''}>Conservative (~8%)</option>
                <option value="moderate"     ${risk==='moderate'    ?'selected':''}>Moderate (~10%)</option>
                <option value="aggressive"   ${risk==='aggressive'  ?'selected':''}>Aggressive (~12%)</option>
              </select>
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">Guides assumed RSA return; contributions still go through RSA / AVC</span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:1.5rem">
          <div class="section-title" style="margin-bottom:0.75rem">&#x1F3AF; Retirement goal</div>
          <p class="text-sm text-muted" style="margin:0 0 1rem;max-width:40rem">
            Choose how you want to use your RSA at retirement — same framing as major Nigerian PFA calculators.
          </p>
          <div class="flex gap-4" style="flex-wrap:wrap;margin-bottom:1rem" id="ret-goal-toggle">
            <button type="button" class="btn btn-primary btn-sm" id="ret-goal-pw" data-goal="programmed_withdrawal">Programmed Withdrawal</button>
            <button type="button" class="btn btn-secondary btn-sm" id="ret-goal-ls" data-goal="lump_sum">Lump Sum</button>
          </div>
          <input type="hidden" id="ret-goal-type" value="programmed_withdrawal">

          <div class="grid-3" id="ret-goal-pw-fields">
            <div class="form-group">
              <label for="ret-replace-ratio">Desired Replacement Ratio (%)</label>
              <input class="input" type="number" id="ret-replace-ratio" min="40" max="100" step="5" value="70">
            </div>
            <div class="form-group">
              <label for="ret-monthly-need">Desired monthly pension (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-monthly-need" placeholder="e.g. 500,000">
              </div>
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">Programmed withdrawal target in retirement</span>
            </div>
            <div class="form-group">
              <label for="ret-wd-return">Drawdown return (% / year)</label>
              <input class="input" type="number" id="ret-wd-return" min="0" max="15" step="0.5" value="6">
              <span class="text-xs text-muted" style="margin-top:0.2rem;display:block">Conservative rate while drawing pension</span>
            </div>
          </div>

          <div class="grid-3" id="ret-goal-ls-fields" style="display:none">
            <div class="form-group">
              <label for="ret-lump-sum">Desired lump sum at retirement (${symbol})</label>
              <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
                <input class="input" type="text" inputmode="decimal" id="ret-lump-sum" placeholder="e.g. 50,000,000">
              </div>
            </div>
          </div>

          <button class="btn btn-primary" id="ret-calc-btn" style="margin-top:0.5rem">Calculate Retirement Plan</button>
        </div>

        <div class="card" style="margin-bottom:1.5rem;padding:1.1rem 1.25rem;background:var(--clr-surface-2)">
          <div class="section-title" style="margin:0 0 0.5rem">Investment holdings</div>
          <p class="text-sm text-muted" style="margin:0 0 0.75rem;max-width:40rem">
            Track stocks and tickers on <strong>Assets</strong> (<em>Marked to market</em>).
            This planner projects your <strong>RSA</strong> (including AVC) — retirement top-ups are modelled via monthly RSA contribution and AVC balance, not a separate investment line.
          </p>
          <a href="#/assets" class="btn btn-secondary btn-sm">Open Assets</a>
        </div>

        <div id="ret-results" style="display:none"></div>
      </div>`;

    document.getElementById('ret-calc-btn').addEventListener('click', () => {
      try { _calculate(); }
      catch (err) {
        console.error(err);
        WPToast.error('Could not calculate retirement plan. Check inputs and try again.');
      }
    });

    const jurisSelect = document.getElementById('ret-jurisdiction');
    jurisSelect.addEventListener('change', () => {
      const val = jurisSelect.value;
      document.querySelectorAll('.ret-juris-field').forEach(el => {
        el.style.display = el.classList.contains(`juris-${val}`) ? 'block' : 'none';
      });
      const hint = document.getElementById('ret-contrib-hint');
      if (hint) {
        hint.textContent = val === 'NG'
          ? 'Nigeria default: 18% of monthly gross (8% + 10%). Override with your remittance slip.'
          : 'Leave blank to use jurisdiction default from monthly gross, or enter your actual contribution.';
      }
      _syncDefaultContribution();
    });

    document.getElementById('ret-goal-pw')?.addEventListener('click', () => _setGoalType('programmed_withdrawal'));
    document.getElementById('ret-goal-ls')?.addEventListener('click', () => _setGoalType('lump_sum'));

    ['ret-rsa','ret-avc','ret-gratuity','ret-401k','ret-gen-pension','ret-salary','ret-monthly-contrib','ret-monthly-need','ret-lump-sum']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) WPUtils.maskNumberInput(el);
      });

    document.getElementById('ret-salary')?.addEventListener('input', () => {
      _syncDefaultContribution();
      _syncNeedFromRatio();
    });
    document.getElementById('ret-replace-ratio')?.addEventListener('input', _syncNeedFromRatio);

    // Risk Profile presets → Expected RSA return (unless user overrode return)
    const riskEl = document.getElementById('ret-risk');
    const returnEl = document.getElementById('ret-return');
    const riskToReturn = { conservative: 8, moderate: 10, aggressive: 12 };
    if (riskEl && returnEl) {
      // Align return with initial risk once
      if (!returnEl.dataset.manual) {
        returnEl.value = riskToReturn[riskEl.value] ?? 10;
      }
      riskEl.addEventListener('change', () => {
        if (returnEl.dataset.manual === '1') return;
        returnEl.value = riskToReturn[riskEl.value] ?? 10;
      });
      returnEl.addEventListener('input', () => { returnEl.dataset.manual = '1'; });
    }

    await _prefillFromState();
    _syncDefaultContribution();
  }

  function _setGoalType(type) {
    document.getElementById('ret-goal-type').value = type;
    const pwBtn = document.getElementById('ret-goal-pw');
    const lsBtn = document.getElementById('ret-goal-ls');
    const pwFields = document.getElementById('ret-goal-pw-fields');
    const lsFields = document.getElementById('ret-goal-ls-fields');
    const isPW = type === 'programmed_withdrawal';
    if (pwBtn) {
      pwBtn.className = isPW ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    }
    if (lsBtn) {
      lsBtn.className = !isPW ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    }
    if (pwFields) pwFields.style.display = isPW ? '' : 'none';
    if (lsFields) lsFields.style.display = isPW ? 'none' : '';
  }

  function _syncDefaultContribution() {
    const contribEl = document.getElementById('ret-monthly-contrib');
    if (!contribEl) return;
    // Only auto-fill when empty or last value was auto-derived
    if (contribEl.dataset.manual === '1' && contribEl.value) return;
    const sal = WPUtils.cleanNum(document.getElementById('ret-salary')?.value);
    const juris = document.getElementById('ret-jurisdiction')?.value || 'NG';
    if (sal <= 0) return;
    let pct = 0.18;
    if (juris === 'US') {
      const match = parseFloat(document.getElementById('ret-us-employer-match')?.value) || 0;
      pct = 0.06 + Math.min(6, match) / 100;
    } else if (juris === 'UK') pct = 0.08;
    else if (juris === 'CA') pct = 0.18;
    else if (juris === 'other') pct = 0.10;
    contribEl.value = Math.round(sal * pct).toLocaleString('en-NG');
    contribEl.dataset.manual = '0';
  }

  function _syncNeedFromRatio() {
    const sal = WPUtils.cleanNum(document.getElementById('ret-salary')?.value);
    const ratio = parseFloat(document.getElementById('ret-replace-ratio')?.value) || 70;
    const needInput = document.getElementById('ret-monthly-need');
    if (sal > 0 && needInput && needInput.dataset.manual !== '1') {
      needInput.value = Math.round(sal * (ratio / 100)).toLocaleString('en-NG');
    }
  }

  async function _prefillFromState() {
    try {
      const PERIOD = WPUtils.currentPeriod();
      const uid    = WPApp.state.user.id;
      const pageCurrency = WPApp.state.profile?.currency || 'NGN';

      const [income, assets] = await Promise.all([
        WPDb.getIncomeByPeriod(uid, PERIOD),
        WPDb.getAssetsByPeriod(uid, PERIOD)
      ]);

      // Sum to monthly using frequency (fixes annual entries treated as monthly)
      const monthlyGross = income.reduce((s, e) => {
        const cur = WPUtils.getEntryCurrency(e.notes);
        const kobo = WPUtils.convert(e.gross_amount || 0, cur, pageCurrency);
        return s + WPUtils.toMonthlyKobo(kobo, e.frequency || 'monthly');
      }, 0);

      if (monthlyGross > 0) {
        const salNaira = Math.round(WPUtils.koboToNaira(monthlyGross));
        document.getElementById('ret-salary').value = salNaira.toLocaleString('en-NG');
        _syncNeedFromRatio();
      }

      document.getElementById('ret-monthly-need')?.addEventListener('input', (e) => {
        e.target.dataset.manual = '1';
      });
      document.getElementById('ret-monthly-contrib')?.addEventListener('input', (e) => {
        e.target.dataset.manual = '1';
      });

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
        document.getElementById('ret-rsa').value = Math.round(WPUtils.koboToNaira(totalRSA)).toLocaleString('en-NG');
      }

      const avcAssets = assets.filter(a => a.asset_type === 'retirement_contribution' && a.notes && a.notes.includes('[sub:avc]'));
      const totalAVC = avcAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
      }, 0);
      if (totalAVC > 0) {
        document.getElementById('ret-avc').value = Math.round(WPUtils.koboToNaira(totalAVC)).toLocaleString('en-NG');
      }

      const gratAssets = assets.filter(a => a.asset_type === 'retirement_contribution' && a.notes && a.notes.includes('[sub:gratuity]'));
      const totalGrat = gratAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
      }, 0);
      if (totalGrat > 0) {
        document.getElementById('ret-gratuity').value = Math.round(WPUtils.koboToNaira(totalGrat)).toLocaleString('en-NG');
      }

      const totalGen = assets.reduce((s, a) => {
        if (a.asset_type === 'retirement_contribution' || a.asset_type === 'pension') {
          const cur = WPUtils.getEntryCurrency(a.notes);
          return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, pageCurrency);
        }
        return s;
      }, 0);
      if (totalGen > 0) {
        const el401 = document.getElementById('ret-401k');
        const elGen = document.getElementById('ret-gen-pension');
        if (el401) el401.value = Math.round(WPUtils.koboToNaira(totalGen)).toLocaleString('en-NG');
        if (elGen) elGen.value = Math.round(WPUtils.koboToNaira(totalGen)).toLocaleString('en-NG');
      }
    } catch (e) {
      console.warn('Retirement prefill:', e?.message || e);
    }
  }

  function _calculate() {
    const juris      = document.getElementById('ret-jurisdiction').value;
    const age        = parseInt(document.getElementById('ret-age').value) || 35;
    const retAge     = parseInt(document.getElementById('ret-retire').value) || 60;
    const lifeExp    = parseInt(document.getElementById('ret-life').value) || 85;
    const goalType   = document.getElementById('ret-goal-type')?.value || 'programmed_withdrawal';

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
    // Extra non-RSA monthly investment removed (#94) — AVC is the only top-up path into RSA
    const investKobo = 0;
    const needKobo   = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-monthly-need').value));
    const lumpKobo   = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('ret-lump-sum')?.value));
    const riskKey    = document.getElementById('ret-risk').value;
    const expectedReturnPct = parseFloat(document.getElementById('ret-return').value);
    const withdrawalReturnPct = parseFloat(document.getElementById('ret-wd-return')?.value);

    const contribRaw = document.getElementById('ret-monthly-contrib').value;
    const monthlyContributionKobo = contribRaw && WPUtils.cleanNum(contribRaw) > 0
      ? WPUtils.nairaToKobo(WPUtils.cleanNum(contribRaw))
      : null;

    if (retAge <= age) {
      WPToast.warning('Retirement age must be greater than current age.');
      return;
    }

    const plan = WPUtils.calcRetirement({
      currentAge: age,
      retirementAge: retAge,
      lifeExpectancy: lifeExp,
      currentRSAKobo: initialPensionKobo,
      monthlyGrossKobo: salaryKobo,
      monthlyInvestmentKobo: investKobo,
      monthlyIncomeNeededKobo: needKobo,
      riskTolerance: riskKey,
      jurisdiction: juris,
      avcKobo,
      gratuityKobo,
      employerMatchPct: matchPct,
      monthlyContributionKobo,
      expectedReturnPct: Number.isFinite(expectedReturnPct) ? expectedReturnPct : null,
      goalType,
      desiredLumpSumKobo: lumpKobo,
      desiredMonthlyPensionKobo: needKobo,
      withdrawalReturnPct: Number.isFinite(withdrawalReturnPct) ? withdrawalReturnPct : 6,
    });

    _renderResults(plan, age, retAge, lifeExp, juris);
  }

  function _renderResults(plan, age, retAge, lifeExp, jurisdiction) {
    const el = document.getElementById('ret-results');
    if (!el) return;
    el.style.display = '';

    const onTrack = plan.goalMet !== false && (plan.goalGapKobo || 0) <= 0;
    const yearsRet = plan.yearsInRetirement != null ? plan.yearsInRetirement : (lifeExp - retAge);
    const isPW = (plan.goalType || 'programmed_withdrawal') === 'programmed_withdrawal';
    const hasGoal = isPW
      ? (plan.desiredMonthlyPensionKobo || 0) > 0
      : (plan.desiredLumpSumKobo || 0) > 0;

    let bannerTitle = 'Your estimated RSA at retirement';
    let bannerValue = WPUtils.fmt(plan.projectedRSAKobo, { compact: true });
    let bannerMeta = `Assumes ${Number(plan.expectedReturnPct || 0).toFixed(1)}% p.a. RSA return · ${plan.yearsToRetirement} years to retire`;

    if (hasGoal) {
      if (onTrack) {
        bannerTitle = isPW ? 'Programmed withdrawal goal on track' : 'Lump sum goal on track';
        bannerMeta = isPW
          ? `Estimated monthly pension ${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)} vs target ${WPUtils.fmt(plan.desiredMonthlyPensionKobo)}`
          : `Projected RSA ${WPUtils.fmt(plan.projectedRSAKobo, { compact: true })} meets target ${WPUtils.fmt(plan.desiredLumpSumKobo, { compact: true })}`;
      } else {
        bannerTitle = isPW ? 'Monthly pension shortfall' : 'Lump sum shortfall';
        bannerValue = WPUtils.fmt(Math.abs(plan.goalGapKobo || 0), { compact: true });
        bannerMeta = plan.additionalMonthlyKobo > 0
          ? `Save about ${WPUtils.fmt(plan.additionalMonthlyKobo)} more per month to close the gap`
          : 'Increase contributions or adjust your goal';
      }
    }

    const pencomCard = jurisdiction === 'NG' ? `
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; PENCOM / RSA summary</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Monthly RSA contribution (used)</td><td class="td-mono fw-700">${WPUtils.fmt(plan.monthlyPensionTotalKobo)}</td></tr>
            <tr><td>Expected RSA return</td><td class="td-mono">${Number(plan.expectedReturnPct || 0).toFixed(1)}% p.a.</td></tr>
            <tr><td>Projected RSA at age ${retAge}</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>Programmed withdrawal (${yearsRet} yrs @ ${Number(plan.drawdownReturnPct || 6).toFixed(1)}%)</td>
                <td class="td-mono fw-700">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
            <tr><td>Full RSA as lump sum (illustrative)</td><td class="td-mono">${WPUtils.fmt(plan.lumpSumAtRetirementKobo)}</td></tr>
          </tbody>
        </table></div>
        <div class="alert alert-info" style="margin-top:1rem">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span>At retirement, many PFAs allow a partial lump sum with the remainder on programmed withdrawal or annuity.
          Exact rules depend on your PFA and PENCOM guidelines. This is an estimate only.</span>
        </div>
      </div>` : `
      <div class="card" style="margin-bottom:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4CB; Pension plan summary</div>
        <div class="table-wrap"><table>
          <tbody>
            <tr><td>Monthly contribution (used)</td><td class="td-mono fw-700">${WPUtils.fmt(plan.monthlyPensionTotalKobo)}</td></tr>
            <tr><td>Projected pension at ${retAge}</td><td class="td-mono text-accent fw-700">${WPUtils.fmt(plan.projectedRSAKobo)}</td></tr>
            <tr><td>Programmed monthly drawdown (${yearsRet} yrs)</td>
                <td class="td-mono">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo)}/month</td></tr>
          </tbody>
        </table></div>
      </div>`;

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,${onTrack || !hasGoal ? 'var(--clr-accent-dim)' : 'rgba(239,68,68,0.1)'},var(--clr-surface-2));margin-bottom:1.5rem;text-align:center;padding:2.5rem">
        <div class="card-title">${bannerTitle}</div>
        <div class="card-value ${onTrack || !hasGoal ? 'accent' : 'danger'}" style="font-size:2.6rem;margin:0.5rem 0">
          ${bannerValue}
        </div>
        <div class="card-meta">${bannerMeta}</div>
      </div>

      <div class="kpi-grid" style="margin-bottom:1.5rem">
        <div class="card"><div class="card-title">Years to Retirement</div><div class="card-value">${retAge - age}</div></div>
        <div class="card"><div class="card-title">Projected RSA (incl. AVC)</div><div class="card-value gold">${WPUtils.fmt(plan.projectedRSAKobo,{compact:true})}</div></div>
        <div class="card"><div class="card-title">Programmed Withdrawal</div><div class="card-value accent">${WPUtils.fmt(plan.rsaMonthlyDrawdownKobo,{compact:true})}<span class="text-xs text-muted">/mo</span></div></div>
        <div class="card"><div class="card-title">Total Projected Fund</div><div class="card-value">${WPUtils.fmt(plan.projectedFundKobo,{compact:true})}</div></div>
        ${hasGoal && isPW ? `<div class="card"><div class="card-title">Capital for target PW</div><div class="card-value">${WPUtils.fmt(plan.requiredNestEggKobo,{compact:true})}</div><div class="card-meta">At ${Number(plan.drawdownReturnPct||6).toFixed(1)}% drawdown</div></div>` : ''}
        ${hasGoal && !isPW ? `<div class="card"><div class="card-title">Target lump sum</div><div class="card-value">${WPUtils.fmt(plan.desiredLumpSumKobo,{compact:true})}</div></div>` : ''}
      </div>

      ${pencomCard}

      <div class="card">
        <div class="section-title" style="margin-bottom:1rem">&#x1F3AF; Your Action Plan</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${(plan.recommendations || []).map((r,i) => `
            <div style="display:flex;gap:1rem;align-items:start">
              <span style="width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:0.8rem">${i+1}</span>
              <span style="font-size:0.9rem;padding-top:4px">${r}</span>
            </div>`).join('')}
        </div>
      </div>`;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function destroy() {}
  return { init, destroy };
})();
