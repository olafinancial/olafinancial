// ============================================================
// Pul Planning — Financial Independence Calculator
// Opens from FIS hero / score cards. Educational FI coverage +
// years-to-FI projection (25× rule + portfolio growth).
// ============================================================

const WPFICalculator = (() => {
  const STORAGE_KEY = (uid) => `wp_fi_calc_${uid || 'anon'}`;

  let _currency = 'NGN';
  let _syncingPassive = false;

  async function init(container) {
    _currency = WPApp.state.profile?.currency || 'NGN';
    const defaults = _defaultsFromApp();
    const saved = _loadSaved();
    const v = { ...defaults, ...saved };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Independence Calculator</h1>
          <p class="page-subtitle">Passive coverage, FI number (25×), and years-to-FI projection</p>
        </div>
        <div class="flex gap-2" style="align-items:center;flex-wrap:wrap">
          <select id="fi-currency" class="select select-sm" style="width:110px">
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" id="fi-reset">↺ Reset</button>
          <button type="button" class="btn btn-secondary btn-sm" id="fi-share">↪ Share</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer || ''}</div>

        <div class="grid-2" style="gap:1.25rem;align-items:start" id="fi-share-card">
          <!-- INPUTS -->
          <div class="card" style="padding:1.5rem">
            <div class="section-title" style="margin:0 0 1.25rem;display:flex;align-items:center;gap:0.5rem">
              <span>🎛️</span> Your Numbers
            </div>

            <div class="form-group">
              <label for="fi-expenses">Monthly Expenses</label>
              <div class="input-prefix-group">
                <span class="input-prefix" data-fi-sym>₦</span>
                <input class="input" type="text" inputmode="decimal" id="fi-expenses" value="${_fmtInput(v.expenses)}">
              </div>
              <span class="text-xs text-muted">What you need each month to live (outflows)</span>
            </div>

            <div class="form-group" style="margin-top:1.25rem">
              <label for="fi-passive">Current Monthly Passive Income</label>
              <div class="input-prefix-group">
                <span class="input-prefix" data-fi-sym>₦</span>
                <input class="input" type="text" inputmode="decimal" id="fi-passive" value="${_fmtInput(v.passive)}">
              </div>
              <div class="grid-2" style="gap:0.65rem;margin-top:0.75rem">
                <div class="form-group" style="margin:0">
                  <label class="text-xs text-muted" for="fi-dividends">Dividends &amp; Interest</label>
                  <div class="input-prefix-group">
                    <span class="input-prefix" data-fi-sym>₦</span>
                    <input class="input" type="text" inputmode="decimal" id="fi-dividends" value="${_fmtInput(v.dividends)}">
                  </div>
                </div>
                <div class="form-group" style="margin:0">
                  <label class="text-xs text-muted" for="fi-rentals">Rentals</label>
                  <div class="input-prefix-group">
                    <span class="input-prefix" data-fi-sym>₦</span>
                    <input class="input" type="text" inputmode="decimal" id="fi-rentals" value="${_fmtInput(v.rentals)}">
                  </div>
                </div>
                <div class="form-group" style="margin:0">
                  <label class="text-xs text-muted" for="fi-pensions">Pensions / RSA</label>
                  <div class="input-prefix-group">
                    <span class="input-prefix" data-fi-sym>₦</span>
                    <input class="input" type="text" inputmode="decimal" id="fi-pensions" value="${_fmtInput(v.pensions)}">
                  </div>
                </div>
                <div class="form-group" style="margin:0">
                  <label class="text-xs text-muted" for="fi-other-passive">Other Passive</label>
                  <div class="input-prefix-group">
                    <span class="input-prefix" data-fi-sym>₦</span>
                    <input class="input" type="text" inputmode="decimal" id="fi-other-passive" value="${_fmtInput(v.otherPassive)}">
                  </div>
                </div>
              </div>
              <span class="text-xs text-muted" style="display:block;margin-top:0.35rem">Breakdown auto-totals into passive income when you edit the four fields.</span>
            </div>

            <div class="grid-2" style="gap:0.75rem;margin-top:1.25rem">
              <div class="form-group" style="margin:0">
                <label for="fi-portfolio">Current Portfolio</label>
                <div class="input-prefix-group">
                  <span class="input-prefix" data-fi-sym>₦</span>
                  <input class="input" type="text" inputmode="decimal" id="fi-portfolio" value="${_fmtInput(v.portfolio)}">
                </div>
              </div>
              <div class="form-group" style="margin:0">
                <label for="fi-return">Expected Annual Return (%)</label>
                <input class="input" type="number" step="0.5" id="fi-return" value="${v.returnRate}">
              </div>
            </div>

            <div class="form-group" style="margin-top:1rem">
              <label for="fi-savings">Monthly Additional Savings</label>
              <div class="input-prefix-group">
                <span class="input-prefix" data-fi-sym>₦</span>
                <input class="input" type="text" inputmode="decimal" id="fi-savings" value="${_fmtInput(v.monthlySavings)}">
              </div>
              <span class="text-xs text-muted">What you invest each month toward the FI portfolio</span>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="fi-from-app" style="margin-top:1rem;width:100%">
              ↻ Load from my logged data
            </button>
          </div>

          <!-- RESULTS -->
          <div style="display:flex;flex-direction:column;gap:1rem">
            <div class="card fi-score-card" style="padding:1.5rem">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
                <div>
                  <div class="card-title" style="margin:0">Financial Independence Status</div>
                  <div id="fi-status" class="card-value" style="font-size:clamp(1.6rem,4vw,2.2rem);margin-top:0.35rem">—</div>
                </div>
                <div id="fi-badge"></div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.4rem">
                  <span class="text-muted">FI Progress (passive cover)</span>
                  <span id="fi-progress-text" class="fw-600 text-accent">0%</span>
                </div>
                <div class="fi-score-bar"><div id="fi-progress-bar" class="fi-score-bar-fill fi-score-bar-fill--accent" style="width:2%"></div></div>
              </div>
            </div>

            <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:0">
              <div class="card">
                <div class="card-title">Passive Income Coverage</div>
                <div class="card-value accent" id="fi-coverage" style="font-size:2rem">0%</div>
                <div class="card-meta">of your expenses</div>
              </div>
              <div class="card">
                <div class="card-title">Monthly</div>
                <div class="card-value" id="fi-gap" style="font-size:1.6rem">—</div>
                <div class="card-meta" id="fi-gap-label">Gap / Surplus</div>
              </div>
              <div class="card">
                <div class="card-title">Traditional FI Number</div>
                <div class="card-value" id="fi-number" style="font-size:1.35rem">—</div>
                <div class="card-meta">25× annual expenses</div>
              </div>
            </div>

            <div class="card" style="padding:1.5rem">
              <div class="section-title" style="margin:0 0 1rem">📈 Projection to Financial Independence</div>
              <div class="grid-2" style="gap:1.25rem">
                <div>
                  <div class="card-title">Years to FI</div>
                  <div class="card-value" id="fi-years" style="font-size:2.4rem">—</div>
                </div>
                <div>
                  <div class="card-title">Projected Portfolio at FI</div>
                  <div class="card-value" id="fi-projected" style="font-size:1.5rem">—</div>
                </div>
              </div>
              <p class="text-xs text-muted" style="margin:1rem 0 0;line-height:1.5">
                Projection compounds portfolio at your expected return and adds annual savings until
                portfolio ≥ FI number (or passive already covers expenses). Cap 50 years. Educational only.
              </p>
            </div>
          </div>
        </div>
      </div>`;

    _currency = document.getElementById('fi-currency')?.value || _currency;
    const curSel = document.getElementById('fi-currency');
    if (curSel) {
      curSel.value = _currency;
      curSel.addEventListener('change', () => {
        _currency = curSel.value;
        _updateSymbols();
        _recalculate();
      });
    }

    const moneyIds = ['fi-expenses', 'fi-passive', 'fi-dividends', 'fi-rentals', 'fi-pensions', 'fi-other-passive', 'fi-portfolio', 'fi-savings'];
    moneyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) WPUtils.maskNumberInput(el);
      el?.addEventListener('input', () => {
        if (['fi-dividends', 'fi-rentals', 'fi-pensions', 'fi-other-passive'].includes(id)) {
          _syncPassiveFromBreakdown();
        }
        _recalculate();
        _persist();
      });
    });
    document.getElementById('fi-return')?.addEventListener('input', () => { _recalculate(); _persist(); });
    document.getElementById('fi-passive')?.addEventListener('input', () => {
      if (!_syncingPassive) _recalculate();
    });

    document.getElementById('fi-reset')?.addEventListener('click', () => {
      const d = {
        expenses: 450000,
        passive: 180000,
        dividends: 65000,
        rentals: 95000,
        pensions: 20000,
        otherPassive: 0,
        portfolio: 18500000,
        returnRate: 9,
        monthlySavings: 250000,
      };
      _fill(d);
      _recalculate();
      _persist();
      WPToast.info('Reset to sample figures.');
    });

    document.getElementById('fi-from-app')?.addEventListener('click', () => {
      const d = _defaultsFromApp();
      _fill(d);
      _recalculate();
      _persist();
      WPToast.success('Loaded from your income, expenses, and assets.');
    });

    document.getElementById('fi-share')?.addEventListener('click', async () => {
      const btn = document.getElementById('fi-share');
      const orig = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }
      try {
        const cov = document.getElementById('fi-coverage')?.textContent || '';
        const text = WPUtils.calcShareCopy
          ? WPUtils.calcShareCopy('Financial Independence', `FIS coverage ${cov}`)
          : `My FI coverage is ${cov} on Pul Planning — https://pul.llc`;
        const target = document.getElementById('fi-share-card');
        await WPUtils.shareBrandedCapture(target, {
          title: 'Financial Independence · Pul Planning',
          text,
          url: 'https://pul.llc',
          filename: 'pul-llc-fi.png',
        });
        WPToast.success('FI snapshot ready to share!');
      } catch (err) {
        if (err?.name !== 'AbortError') WPToast.error(err.message || 'Share failed');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      }
    });

    _updateSymbols();
    _recalculate();
  }

  function _fmtInput(naira) {
    const n = Number(naira) || 0;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function _readNaira(id) {
    const el = document.getElementById(id);
    return WPUtils.cleanNum(el?.value) || 0;
  }

  function _fill(v) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'fi-return') el.value = val;
      else el.value = _fmtInput(val);
    };
    set('fi-expenses', v.expenses);
    set('fi-passive', v.passive);
    set('fi-dividends', v.dividends);
    set('fi-rentals', v.rentals);
    set('fi-pensions', v.pensions);
    set('fi-other-passive', v.otherPassive);
    set('fi-portfolio', v.portfolio);
    set('fi-return', v.returnRate);
    set('fi-savings', v.monthlySavings);
  }

  function _updateSymbols() {
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
    const sym = symbols[_currency] || '₦';
    document.querySelectorAll('[data-fi-sym]').forEach(el => { el.textContent = sym; });
  }

  function _syncPassiveFromBreakdown() {
    _syncingPassive = true;
    const total = _readNaira('fi-dividends') + _readNaira('fi-rentals')
      + _readNaira('fi-pensions') + _readNaira('fi-other-passive');
    const el = document.getElementById('fi-passive');
    if (el) el.value = _fmtInput(total);
    _syncingPassive = false;
  }

  function _defaultsFromApp() {
    // Fallback sample (matches mockup) if no data
    const sample = {
      expenses: 450000,
      passive: 180000,
      dividends: 65000,
      rentals: 95000,
      pensions: 20000,
      otherPassive: 0,
      portfolio: 18500000,
      returnRate: 9,
      monthlySavings: 250000,
    };

    try {
      if (!WPApp.state?.data) return sample;
      const s = WPApp.computeSummary();
      const base = WPApp.state.profile?.currency || 'NGN';
      // Amounts in kobo → major units for display inputs (naira-like)
      const expKobo = s.cf?.totalExpenses || 0;
      const passiveKobo = s.passiveKPIs?.passiveKobo || 0;
      const assetsKobo = s.totalAssets || 0;
      const savingsKobo = Math.max(0, s.cf?.netCashFlow || 0);

      const expenses = Math.round(WPUtils.koboToNaira(expKobo));
      const passive = Math.round(WPUtils.koboToNaira(passiveKobo));
      const portfolio = Math.round(WPUtils.koboToNaira(assetsKobo));
      const monthlySavings = Math.round(WPUtils.koboToNaira(savingsKobo));

      // Categorize passive income entries by name keywords
      const buckets = { dividends: 0, rentals: 0, pensions: 0, otherPassive: 0 };
      (WPApp.state.data.income || []).filter(e => e.income_type === 'passive').forEach(e => {
        const name = `${e.source_name || ''} ${e.notes || ''}`.toLowerCase();
        const amt = WPUtils.koboToNaira(e.gross_amount || 0);
        if (/dividend|interest|bond|tbill|t-bill|fixed deposit|fd|coupon/.test(name)) buckets.dividends += amt;
        else if (/rent|rental|lease|property|tenant/.test(name)) buckets.rentals += amt;
        else if (/pension|rsa|annuity|pfa/.test(name)) buckets.pensions += amt;
        else buckets.otherPassive += amt;
      });
      Object.keys(buckets).forEach(k => { buckets[k] = Math.round(buckets[k]); });

      // If no breakdown but have passive total, put all in other
      const breakdownSum = buckets.dividends + buckets.rentals + buckets.pensions + buckets.otherPassive;
      if (passive > 0 && breakdownSum === 0) buckets.otherPassive = passive;

      if (expenses <= 0 && passive <= 0 && portfolio <= 0) return sample;

      return {
        expenses: expenses || sample.expenses,
        passive: passive || breakdownSum || sample.passive,
        dividends: buckets.dividends,
        rentals: buckets.rentals,
        pensions: buckets.pensions,
        otherPassive: buckets.otherPassive,
        portfolio: portfolio || sample.portfolio,
        returnRate: 9,
        monthlySavings: monthlySavings || sample.monthlySavings,
        _baseCurrency: base,
      };
    } catch {
      return sample;
    }
  }

  function _loadSaved() {
    try {
      const uid = WPApp.state.user?.id;
      const raw = localStorage.getItem(STORAGE_KEY(uid));
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  function _persist() {
    try {
      const uid = WPApp.state.user?.id;
      const payload = {
        expenses: _readNaira('fi-expenses'),
        passive: _readNaira('fi-passive'),
        dividends: _readNaira('fi-dividends'),
        rentals: _readNaira('fi-rentals'),
        pensions: _readNaira('fi-pensions'),
        otherPassive: _readNaira('fi-other-passive'),
        portfolio: _readNaira('fi-portfolio'),
        returnRate: parseFloat(document.getElementById('fi-return')?.value) || 0,
        monthlySavings: _readNaira('fi-savings'),
      };
      localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  function _recalculate() {
    const expenses = _readNaira('fi-expenses');
    let passive = _readNaira('fi-passive');
    const portfolio = _readNaira('fi-portfolio');
    const returnRate = parseFloat(document.getElementById('fi-return')?.value) || 0;
    const monthlySavings = _readNaira('fi-savings');

    const breakdown = _readNaira('fi-dividends') + _readNaira('fi-rentals')
      + _readNaira('fi-pensions') + _readNaira('fi-other-passive');
    // Prefer breakdown sum when user filled components
    if (breakdown > 0 && Math.abs(breakdown - passive) > 1) {
      // keep passive as total field; don't force overwrite if user typed total alone
    }

    const coverage = expenses > 0 ? (passive / expenses) * 100 : 0;
    const gap = passive - expenses;
    const annualExpenses = expenses * 12;
    const fiNumber = annualExpenses * 25;

    let yearsToFI = 0;
    let projectedPortfolio = portfolio;

    if (coverage >= 100) {
      yearsToFI = 0;
      projectedPortfolio = portfolio;
    } else {
      let current = portfolio;
      const r = returnRate / 100;
      const annualSave = monthlySavings * 12;
      while (current < fiNumber && yearsToFI < 50) {
        current = current * (1 + r) + annualSave;
        yearsToFI += 1;
        if (yearsToFI >= 50) break;
      }
      projectedPortfolio = current;
    }

    _updateUI({ coverage, gap, fiNumber, yearsToFI, projectedPortfolio, expenses });
  }

  function _updateUI({ coverage, gap, fiNumber, yearsToFI, projectedPortfolio }) {
    const cur = _currency;
    const fmt = (n) => WPUtils.fmt(WPUtils.nairaToKobo(n), { currency: cur, compact: Math.abs(n) >= 1e7 });

    const covEl = document.getElementById('fi-coverage');
    if (covEl) {
      covEl.textContent = coverage.toFixed(1) + '%';
      covEl.className = 'card-value ' + (coverage >= 100 ? 'accent' : coverage >= 50 ? 'gold' : 'danger');
    }

    let statusText = 'Early Stage';
    let badgeHTML = '<span class="badge badge-neutral">Getting Started</span>';
    let barTone = 'danger';
    const progress = Math.min(100, Math.max(0, coverage));

    if (coverage >= 100) {
      statusText = 'Financially Independent!';
      badgeHTML = '<span class="badge badge-accent">✓ FI Achieved</span>';
      barTone = 'accent';
    } else if (coverage >= 70) {
      statusText = 'Very Close!';
      badgeHTML = '<span class="badge badge-accent" style="background:rgba(245,158,11,0.2);color:var(--clr-gold);border-color:rgba(245,158,11,0.4)">On Track</span>';
      barTone = 'gold';
    } else if (coverage >= 40) {
      statusText = 'Making Progress';
      badgeHTML = '<span class="badge badge-neutral">Building Momentum</span>';
      barTone = 'gold';
    }

    const statusEl = document.getElementById('fi-status');
    if (statusEl) statusEl.textContent = statusText;
    const badgeEl = document.getElementById('fi-badge');
    if (badgeEl) badgeEl.innerHTML = badgeHTML;

    const bar = document.getElementById('fi-progress-bar');
    if (bar) {
      bar.style.width = Math.max(2, progress) + '%';
      bar.className = `fi-score-bar-fill fi-score-bar-fill--${barTone}`;
    }
    const pt = document.getElementById('fi-progress-text');
    if (pt) pt.textContent = progress.toFixed(1) + '%';

    const gapEl = document.getElementById('fi-gap');
    const gapLabel = document.getElementById('fi-gap-label');
    if (gapEl) {
      if (gap >= 0) {
        gapEl.textContent = '+' + fmt(gap);
        gapEl.className = 'card-value accent';
        if (gapLabel) { gapLabel.textContent = 'Monthly Surplus'; gapLabel.className = 'card-meta'; }
      } else {
        gapEl.textContent = fmt(Math.abs(gap));
        gapEl.className = 'card-value danger';
        if (gapLabel) { gapLabel.textContent = 'Monthly Gap'; gapLabel.className = 'card-meta'; }
      }
    }

    const numEl = document.getElementById('fi-number');
    if (numEl) numEl.textContent = fmt(fiNumber);

    const yearsEl = document.getElementById('fi-years');
    if (yearsEl) {
      if (coverage >= 100) {
        yearsEl.innerHTML = '<span class="text-accent">Already FI!</span>';
      } else if (yearsToFI >= 50) {
        yearsEl.textContent = '50+ years';
      } else {
        yearsEl.textContent = yearsToFI + (yearsToFI === 1 ? ' year' : ' years');
      }
    }

    const projEl = document.getElementById('fi-projected');
    if (projEl) projEl.textContent = fmt(projectedPortfolio);
  }

  function destroy() {}

  return { init, destroy };
})();
