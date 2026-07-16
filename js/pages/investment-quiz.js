// ============================================================
// Pul Planning — Investor Profile Questionnaire (#41)
// Spec: merged Grok investment questionnaire (NG market)
// Score → Conservative / Balanced / Aggressive + Lifetime Glide Path
// ============================================================

const WPInvestmentQuiz = (() => {
  const STORAGE_KEY = (uid) => `wp_invest_quiz_${uid}`;

  // Midpoints used for pie chart (within published ranges)
  const STARTING_ALLOC = {
    aggressive: [
      { key: 'equities', label: 'Equities (NGX / equity funds & ETFs)', pct: 62, range: '55–70%' },
      { key: 'reits', label: 'Real Estate (NGX REITs e.g. UPDCREIT, NREIT)', pct: 12, range: '10–15%' },
      { key: 'alternatives', label: 'Alternatives / Digital Assets (crypto)', pct: 10, range: '5–15%' },
      { key: 'fixed_income', label: 'Fixed Income (FGN / corporate bonds & funds)', pct: 8, range: '5–10%' },
      { key: 'money_market', label: 'Money Market + Bank Fixed Deposits', pct: 8, range: '5–10%' },
    ],
    balanced: [
      { key: 'equities', label: 'Equities (NGX / equity funds & ETFs)', pct: 42, range: '35–50%' },
      { key: 'fixed_income', label: 'Fixed Income (FGN / corporate bonds & funds)', pct: 30, range: '25–35%' },
      { key: 'reits', label: 'Real Estate (NGX REITs)', pct: 12, range: '10–15%' },
      { key: 'money_market', label: 'Money Market + Bank Fixed Deposits', pct: 12, range: '10–15%' },
      { key: 'alternatives', label: 'Alternatives / Digital Assets (optional)', pct: 4, range: '0–10%' },
    ],
    conservative: [
      { key: 'fixed_income', label: 'Fixed Income (FGN / corporate bonds & funds)', pct: 48, range: '40–55%' },
      { key: 'money_market', label: 'Money Market + Bank Fixed Deposits', pct: 32, range: '25–40%' },
      { key: 'equities', label: 'Equities (NGX / equity funds & ETFs)', pct: 10, range: '5–15%' },
      { key: 'reits', label: 'Real Estate (NGX REITs)', pct: 8, range: '0–10%' },
      { key: 'alternatives', label: 'Alternatives / Digital Assets', pct: 2, range: '0–5%' },
    ],
  };

  // Glide path rows by years-to-goal bucket (from share: Balanced example table)
  const GLIDE_TABLE = {
    aggressive: [
      { years: '20+', equities: 58, reits: 14, fixed: 12, mm: 8, alt: 8 },
      { years: '15', equities: 52, reits: 12, fixed: 18, mm: 10, alt: 8 },
      { years: '10', equities: 42, reits: 10, fixed: 28, mm: 14, alt: 6 },
      { years: '5', equities: 28, reits: 8, fixed: 38, mm: 22, alt: 4 },
      { years: '0–2', equities: 15, reits: 5, fixed: 48, mm: 30, alt: 2 },
    ],
    balanced: [
      { years: '20+', equities: 42, reits: 12, fixed: 28, mm: 12, alt: 6 },
      { years: '15', equities: 38, reits: 11, fixed: 32, mm: 14, alt: 5 },
      { years: '10', equities: 32, reits: 9, fixed: 38, mm: 17, alt: 4 },
      { years: '5', equities: 22, reits: 7, fixed: 45, mm: 23, alt: 3 },
      { years: '0–2', equities: 12, reits: 5, fixed: 50, mm: 30, alt: 3 },
    ],
    conservative: [
      { years: '20+', equities: 18, reits: 10, fixed: 42, mm: 28, alt: 2 },
      { years: '15', equities: 15, reits: 8, fixed: 45, mm: 30, alt: 2 },
      { years: '10', equities: 12, reits: 7, fixed: 48, mm: 32, alt: 1 },
      { years: '5', equities: 8, reits: 5, fixed: 50, mm: 36, alt: 1 },
      { years: '0–2', equities: 5, reits: 3, fixed: 52, mm: 40, alt: 0 },
    ],
  };

  const QUESTIONS = [
    {
      id: 'q1',
      section: 'Personal & objectives',
      text: 'What is your age group?',
      options: [
        { label: 'Under 30 years', points: 5 },
        { label: '30–45 years', points: 4 },
        { label: '46–60 years', points: 3 },
        { label: 'Over 60 years', points: 2 },
      ],
    },
    {
      id: 'q2',
      section: 'Personal & objectives',
      text: 'What is your primary long-term goal and approximate target date?',
      hint: 'Examples: Retirement, child’s university, buying property, wealth transfer / legacy',
      options: [
        { label: 'Goal is more than 15 years away (or target age 55+)', points: 5 },
        { label: 'Goal is 8–15 years away', points: 3 },
        { label: 'Goal is less than 8 years away', points: 1 },
      ],
    },
    {
      id: 'q3',
      section: 'Personal & objectives',
      text: 'What is your primary investment objective?',
      options: [
        { label: 'Long-term capital growth and wealth accumulation', points: 5 },
        { label: 'Balanced mix of growth and regular income', points: 3 },
        { label: 'Capital preservation with steady income', points: 1 },
      ],
    },
    {
      id: 'q4',
      section: 'Risk tolerance',
      text: 'If your portfolio dropped 25% in value over 6 months due to market conditions, what would you most likely do?',
      options: [
        { label: 'Buy more or hold confidently (viewing it as a buying opportunity)', points: 5 },
        { label: 'Hold and monitor without selling', points: 3 },
        { label: 'Sell some investments to limit losses', points: 2 },
        { label: 'Sell most or all and move to cash / safe assets', points: 1 },
      ],
    },
    {
      id: 'q5',
      section: 'Risk tolerance',
      text: 'Which statement best describes your attitude to investment volatility?',
      options: [
        { label: 'I seek high returns and am comfortable with significant fluctuations', points: 5 },
        { label: 'I accept moderate ups and downs for better long-term potential', points: 3 },
        { label: 'I strongly prefer stable, predictable returns even if lower', points: 1 },
      ],
    },
    {
      id: 'q6',
      section: 'Risk tolerance',
      text: 'What portion of investable assets (excluding emergency fund and primary residence) are you comfortable allocating to higher-risk growth assets (equities, REITs, alternatives)?',
      options: [
        { label: '60% or more', points: 5 },
        { label: '30–59%', points: 3 },
        { label: 'Less than 30%', points: 1 },
      ],
    },
    {
      id: 'q7',
      section: 'Liquidity & capacity',
      text: 'Do you currently have a separate emergency fund (savings or Money Market Funds) covering at least 6 months of living expenses?',
      options: [
        { label: 'Yes, fully funded', points: 4 },
        { label: 'Partially funded', points: 3 },
        { label: 'No — I would need to access investments or borrow', points: 1 },
      ],
    },
    {
      id: 'q8',
      section: 'Liquidity & capacity',
      text: 'When do you anticipate needing to withdraw a large portion (>30%) of this investment portfolio?',
      options: [
        { label: 'More than 7 years from now or never', points: 5 },
        { label: 'In 4–7 years', points: 3 },
        { label: 'Within the next 1–3 years', points: 1 },
      ],
    },
    {
      id: 'q9',
      section: 'Liquidity & capacity',
      text: 'How stable is your primary source of income?',
      options: [
        { label: 'Very stable (e.g. salaried job with benefits or diversified business)', points: 4 },
        { label: 'Moderately stable', points: 3 },
        { label: 'Variable or heavily dependent on investments', points: 1 },
      ],
    },
    {
      id: 'q10',
      section: 'Experience',
      text: 'What is your level of investment knowledge and experience?',
      options: [
        { label: 'Experienced — stocks, funds, or similar; I understand market risks', points: 5 },
        { label: 'Moderate — savings products, mutual funds, or T-bills', points: 3 },
        { label: 'Beginner — limited or no prior investment experience', points: 1 },
      ],
    },
  ];

  const COLORS = ['#00C896', '#38BDF8', '#F59E0B', '#A78BFA', '#F43F5E'];

  let _answers = {};   // qId → option index
  let _notes = '';
  let _view = 'quiz'; // quiz | results
  let _chart = null;
  let _step = 0; // question index 0–9, then results

  function init(container) {
    const uid = WPApp.state.user?.id;
    const saved = uid ? localStorage.getItem(STORAGE_KEY(uid)) : null;
    if (saved) {
      try {
        const data = JSON.parse(saved);
        _answers = data.answers || {};
        _notes = data.notes || '';
        if (data.result) _view = 'results';
      } catch (_) {
        _answers = {};
      }
    }

    // Prefill age band from profile when empty
    if (_answers.q1 == null && WPApp.state.profile?.age) {
      const age = WPApp.state.profile.age;
      _answers.q1 = age < 30 ? 0 : age <= 45 ? 1 : age <= 60 ? 2 : 3;
    }
    // Prefill risk attitude loosely from profile risk_tolerance
    if (_answers.q5 == null && WPApp.state.profile?.risk_tolerance) {
      const r = WPApp.state.profile.risk_tolerance;
      _answers.q5 = r === 'aggressive' ? 0 : r === 'conservative' ? 2 : 1;
    }

    _step = 0;
    _render(container);
  }

  function _render(container) {
    if (_view === 'results') {
      _renderResults(container);
      return;
    }
    _renderQuiz(container);
  }

  function _renderQuiz(container) {
    const q = QUESTIONS[_step];
    const totalQ = QUESTIONS.length;
    const answered = Object.keys(_answers).length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Investment Profile</h1>
          <p class="page-subtitle">Nigerian-market risk, liquidity &amp; asset-class questionnaire · educational guide only</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          ${_hasCompleteAnswers() ? `<button type="button" class="btn btn-secondary btn-sm" id="iq-skip-results">View last results</button>` : ''}
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">
          <strong>Disclaimer:</strong> This questionnaire and the resulting allocations are for
          <em>educational and illustrative purposes only</em>. They do not constitute personalised
          financial, investment, or tax advice. Nigerian markets involve inflation, Naira, and
          regulatory risks. Consult a licensed advisor or SEC-registered professional before investing.
          ${APP_CONFIG.disclaimer || ''}
        </div>

        <div class="card" style="max-width:720px;padding:1.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
            <span class="badge badge-accent">${q.section}</span>
            <span class="text-muted text-sm">Question ${_step + 1} of ${totalQ} · ${answered}/${totalQ} answered</span>
          </div>
          <div class="progress-bar" style="height:6px;margin-bottom:1.5rem;background:var(--clr-surface-3);border-radius:99px;overflow:hidden">
            <div class="progress-fill" style="height:100%;width:${((_step + 1) / totalQ) * 100}%;background:var(--clr-accent);border-radius:99px"></div>
          </div>

          <h2 style="font-size:1.15rem;font-weight:700;margin:0 0 0.5rem;color:#fff">${q.text}</h2>
          ${q.hint ? `<p class="text-muted text-sm" style="margin:0 0 1.25rem">${q.hint}</p>` : '<div style="margin-bottom:1.25rem"></div>'}

          <div class="iq-options" id="iq-options">
            ${q.options.map((opt, i) => {
              const sel = _answers[q.id] === i;
              return `
                <label class="iq-option ${sel ? 'iq-option--selected' : ''}">
                  <input type="radio" name="iq-ans" value="${i}" ${sel ? 'checked' : ''} style="margin-top:0.2rem">
                  <span>
                    <span class="iq-option-label">${opt.label}</span>
                    <span class="iq-option-pts text-muted text-xs">(${opt.points} pts)</span>
                  </span>
                </label>`;
            }).join('')}
          </div>

          ${_step === totalQ - 1 ? `
            <div class="form-group" style="margin-top:1.5rem">
              <label for="iq-notes">Any other important factor? (optional)</label>
              <textarea class="input" id="iq-notes" rows="2" placeholder="e.g. health concerns, moving abroad, business ownership, ethical preferences…">${_esc(_notes)}</textarea>
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;margin-top:2rem;gap:0.75rem;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary" id="iq-back" ${_step === 0 ? 'style="visibility:hidden"' : ''}>Back</button>
            <button type="button" class="btn btn-primary" id="iq-next">
              ${_step === totalQ - 1 ? 'See my profile &amp; allocation' : 'Next'}
            </button>
          </div>
        </div>

        <div class="card" style="max-width:720px;margin-top:1.25rem;padding:1.25rem">
          <div class="section-title" style="margin:0 0 0.75rem;font-size:0.95rem">Asset classes we consider (Nigeria)</div>
          <ul class="text-sm" style="margin:0;padding-left:1.15rem;color:var(--clr-text-2);line-height:1.65">
            <li><strong>Money Market / cash</strong> — T-bills, Money Market Funds</li>
            <li><strong>Fixed Income</strong> — FGN Bonds, corporate bonds, fixed-income funds</li>
            <li><strong>Equities</strong> — NGX stocks, equity mutual funds / ETFs (e.g. Vetiva)</li>
            <li><strong>Real Estate</strong> — NGX-listed REITs (e.g. UPDCREIT, NREIT)</li>
            <li><strong>Bank fixed deposits</strong> — term deposits for stability</li>
            <li><strong>Alternatives</strong> — limited crypto via reputable platforms (high risk)</li>
          </ul>
        </div>
      </div>`;

    document.getElementById('iq-back')?.addEventListener('click', () => {
      _collectCurrent();
      if (_step > 0) { _step--; _render(container); }
    });
    document.getElementById('iq-next')?.addEventListener('click', () => {
      if (!_collectCurrent()) {
        WPToast.warning('Please select an answer to continue.');
        return;
      }
      if (_step < totalQ - 1) {
        _step++;
        _render(container);
      } else {
        _finish(container);
      }
    });
    document.getElementById('iq-skip-results')?.addEventListener('click', () => {
      _view = 'results';
      _render(container);
    });
    document.querySelectorAll('input[name="iq-ans"]').forEach(inp => {
      inp.addEventListener('change', () => {
        _answers[q.id] = parseInt(inp.value, 10);
        document.querySelectorAll('.iq-option').forEach((el, i) => {
          el.classList.toggle('iq-option--selected', i === _answers[q.id]);
        });
      });
    });
  }

  function _collectCurrent() {
    const q = QUESTIONS[_step];
    const sel = document.querySelector('input[name="iq-ans"]:checked');
    if (!sel && _answers[q.id] == null) return false;
    if (sel) _answers[q.id] = parseInt(sel.value, 10);
    if (_step === QUESTIONS.length - 1) {
      _notes = document.getElementById('iq-notes')?.value?.trim() || '';
    }
    return _answers[q.id] != null;
  }

  function _hasCompleteAnswers() {
    return QUESTIONS.every(q => _answers[q.id] != null);
  }

  function _score() {
    let total = 0;
    const detail = [];
    for (const q of QUESTIONS) {
      const idx = _answers[q.id];
      if (idx == null) continue;
      const pts = q.options[idx].points;
      total += pts;
      detail.push({ id: q.id, text: q.text, answer: q.options[idx].label, points: pts });
    }
    let profile = 'conservative';
    if (total >= 38) profile = 'aggressive';
    else if (total >= 26) profile = 'balanced';
    return { total, profile, detail, max: 48 };
  }

  function _profileLabel(p) {
    return ({ conservative: 'Conservative', balanced: 'Balanced', aggressive: 'Aggressive' })[p] || p;
  }

  function _profileBlurb(p) {
    return ({
      conservative: 'Lower risk — focus on stability, income, and capital preservation.',
      balanced: 'Moderate growth with diversification and downside awareness.',
      aggressive: 'Higher growth potential with more volatility — suited to longer horizons.',
    })[p] || '';
  }

  function _yearsBucketFromAnswers() {
    // Prefer Q2 (goal date) then Q8 (withdrawal) for glide starting row
    const q2 = _answers.q2; // 0 => 20+, 1 => ~10-15, 2 => <8
    if (q2 === 0) return 0;
    if (q2 === 1) return 2; // ~10 years row
    if (q2 === 2) return 3; // 5 years row
    return 1;
  }

  function _finish(container) {
    const result = _score();
    const uid = WPApp.state.user?.id;
    const payload = {
      answers: _answers,
      notes: _notes,
      result,
      completedAt: new Date().toISOString(),
    };
    if (uid) {
      try { localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(payload)); } catch (_) {}
    }
    _view = 'results';
    _render(container);
    WPToast.success(`Profile: ${_profileLabel(result.profile)} (${result.total} pts)`);
  }

  function _renderResults(container) {
    const { total, profile, detail } = _score();
    const alloc = STARTING_ALLOC[profile];
    const glide = GLIDE_TABLE[profile];
    const startIdx = _yearsBucketFromAnswers();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Your investment profile</h1>
          <p class="page-subtitle">Score-based allocation for the Nigerian retail market · not personalised advice</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-secondary" id="iq-retake">Retake questionnaire</button>
          <button type="button" class="btn btn-primary" id="iq-to-bs">Add holdings on Balance Sheet</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">
          <strong>Disclaimer:</strong> Educational / illustrative only. Not investment advice.
          Implement via SEC-licensed managers, NGX stockbrokers, or reputable platforms. Rebalance periodically.
        </div>

        ${APP_CONFIG.showShariaTools(WPApp.state.user?.id) ? `
        <div class="card" style="margin-bottom:1.25rem;padding:1.15rem 1.25rem;border-left:3px solid var(--clr-accent)">
          <div class="section-title" style="margin:0 0 0.5rem">🕌 Sharia-conscious investing notes</div>
          <p class="text-sm text-muted" style="margin:0 0 0.65rem;line-height:1.5">
            Your Settings preference highlights ethical / Halal-aware options. This quiz still shows a general market mix —
            it does <strong>not</strong> screen every ticker. Prefer:
          </p>
          <ul class="text-sm" style="margin:0 0 0.75rem;padding-left:1.15rem;color:var(--clr-text-2);line-height:1.55">
            <li>Sharia-compliant equity funds / ETFs where available (avoid pure interest-based fixed income if required)</li>
            <li>REITs and real assets after screening for core business activity</li>
            <li>Cash / money-market with care — conventional interest may not suit; ask your advisor for compliant alternatives</li>
            <li>Limit speculative crypto / high-gharar structures</li>
          </ul>
          <div class="flex gap-2" style="flex-wrap:wrap">
            <a href="#/assets" class="btn btn-secondary btn-sm">Flag holdings on Assets</a>
            <a href="#/calculators" class="btn btn-ghost btn-sm" onclick="sessionStorage.setItem('wp_calc_tab','zakat')">Zakat calculator</a>
            <a href="#/settings" class="btn btn-ghost btn-sm">Takaful preference</a>
          </div>
        </div>` : `
        <div class="card" style="margin-bottom:1.25rem;padding:1rem 1.15rem;background:var(--clr-surface-2)">
          <p class="text-sm text-muted" style="margin:0">
            Prefer Halal / Takaful framing? Set preference in
            <a href="#/settings" style="color:var(--clr-accent)">Settings → Sharia &amp; Takaful</a>
            for investing tips and Insurance Takaful wording.
          </p>
        </div>`}

        <div class="kpi-grid" style="margin-bottom:1.25rem">
          <div class="card">
            <div class="card-title">Total score</div>
            <div class="card-value accent">${total}<span style="font-size:1rem;font-weight:600;color:var(--clr-text-2)"> / 48</span></div>
            <div class="card-meta">Sum of Q1–Q10</div>
          </div>
          <div class="card">
            <div class="card-title">Risk profile</div>
            <div class="card-value ${profile === 'aggressive' ? 'gold' : profile === 'conservative' ? 'income' : 'accent'}">${_profileLabel(profile)}</div>
            <div class="card-meta">${_profileBlurb(profile)}</div>
          </div>
          <div class="card">
            <div class="card-title">Bands</div>
            <div class="card-meta" style="line-height:1.6;margin-top:0.5rem">
              Conservative 10–25 · Balanced 26–37 · Aggressive 38–48
            </div>
          </div>
        </div>

        <div class="grid-2" style="gap:1.25rem;margin-bottom:1.25rem;align-items:start">
          <div class="card">
            <div class="section-title" style="margin-bottom:0.75rem">Starting asset allocation</div>
            <p class="text-muted text-sm" style="margin:0 0 1rem">Target strategic mix (midpoints within published ranges). Naira-denominated diversification.</p>
            <div class="chart-container" style="height:220px;max-width:280px;margin:0 auto 1rem">
              <canvas id="iq-alloc-chart"></canvas>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Asset class</th><th>Target</th><th>Range</th></tr></thead>
                <tbody>
                  ${alloc.map(a => `
                    <tr>
                      <td>${a.label}</td>
                      <td class="td-mono fw-700 text-accent">${a.pct}%</td>
                      <td class="td-mono text-muted">${a.range}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="section-title" style="margin-bottom:0.75rem">Lifetime Glide Path</div>
            <p class="text-muted text-sm" style="margin:0 0 1rem">
              Allocation becomes more conservative as you near your primary goal
              (from Q2 goal date + Q8 withdrawal horizon). Review annually.
            </p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Years to goal</th>
                    <th>Equities</th>
                    <th>REITs</th>
                    <th>Fixed income</th>
                    <th>MM + deposits</th>
                    <th>Alts</th>
                  </tr>
                </thead>
                <tbody>
                  ${glide.map((row, i) => `
                    <tr ${i === startIdx ? 'style="background:var(--clr-accent-dim)"' : ''}>
                      <td class="fw-600">${row.years}${i === startIdx ? ' ← now' : ''}</td>
                      <td class="td-mono">${row.equities}%</td>
                      <td class="td-mono">${row.reits}%</td>
                      <td class="td-mono">${row.fixed}%</td>
                      <td class="td-mono">${row.mm}%</td>
                      <td class="td-mono">${row.alt}%</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
            <p class="text-xs text-muted" style="margin:0.75rem 0 0">
              Highlighted row is your approximate position on the path today (from goal-date answers).
            </p>
          </div>
        </div>

        <div class="card" style="margin-bottom:1.25rem">
          <div class="section-title" style="margin-bottom:0.75rem">Nigeria implementation notes</div>
          <ul class="text-sm" style="margin:0;padding-left:1.15rem;color:var(--clr-text-2);line-height:1.7">
            <li><strong>T-bills &amp; MMFs</strong> — liquid, competitive yields; good buffer / inflation-aware cash.</li>
            <li><strong>REITs</strong> (e.g. UPDCREIT, NREIT) — property exposure without direct ownership; NGX-listed.</li>
            <li><strong>ETFs / mutual funds</strong> — diversified equity or balanced exposure via reputable managers.</li>
            <li><strong>Bank fixed deposits</strong> — ultra-conservative, predictable.</li>
            <li><strong>Crypto</strong> — extreme volatility; keep as a small satellite only, if at all.</li>
          </ul>
        </div>

        <div class="card" style="margin-bottom:1.25rem">
          <div class="section-title" style="margin-bottom:0.75rem">When to review this allocation</div>
          <div class="grid-2" style="gap:1rem">
            <div>
              <div class="fw-600" style="margin-bottom:0.35rem">Scheduled</div>
              <ul class="text-sm text-muted" style="margin:0;padding-left:1.1rem;line-height:1.6">
                <li>Annual comprehensive review (minimum)</li>
                <li>Quarterly if Aggressive or high crypto exposure</li>
                <li>Milestone: every ~5 years closer to goal (glide path)</li>
              </ul>
            </div>
            <div>
              <div class="fw-600" style="margin-bottom:0.35rem">Triggers</div>
              <ul class="text-sm text-muted" style="margin:0;padding-left:1.1rem;line-height:1.6">
                <li>Asset class drifts ±5–10% from target</li>
                <li>Life events (marriage, job change, inheritance, health)</li>
                <li>NGX large moves; inflation / CBN rate shocks</li>
                <li>Change in goals or risk comfort</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:1.25rem">
          <div class="section-header">
            <span class="section-title">Your answers (score sheet)</span>
            <button type="button" class="btn btn-ghost btn-sm" id="iq-print">Print / save</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Question</th><th>Your answer</th><th>Pts</th></tr></thead>
              <tbody>
                ${detail.map((d, i) => `
                  <tr>
                    <td class="td-mono">${i + 1}</td>
                    <td class="text-sm">${d.text}</td>
                    <td class="text-sm">${d.answer}</td>
                    <td class="td-mono fw-600">${d.points}</td>
                  </tr>`).join('')}
                <tr style="background:var(--clr-surface-2)">
                  <td colspan="3" class="fw-700">Total</td>
                  <td class="td-mono fw-700 text-accent">${total}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ${_notes ? `<p class="text-sm" style="margin:1rem 0 0"><strong>Notes:</strong> ${_esc(_notes)}</p>` : ''}
        </div>

        <div class="quick-actions" style="margin-bottom:2rem">
          <button type="button" class="btn btn-secondary" onclick="WPRouter.navigate('/balance-sheet')">Balance Sheet</button>
          <button type="button" class="btn btn-secondary" onclick="WPRouter.navigate('/goals')">Set a Goal</button>
          <button type="button" class="btn btn-secondary" onclick="WPRouter.navigate('/retirement')">Retirement</button>
          <button type="button" class="btn btn-secondary" onclick="WPRouter.navigate('/calculators')">Calculators</button>
        </div>
      </div>`;

    document.getElementById('iq-retake')?.addEventListener('click', () => {
      _view = 'quiz';
      _step = 0;
      _render(container);
    });
    document.getElementById('iq-to-bs')?.addEventListener('click', () => WPRouter.navigate('/balance-sheet'));
    document.getElementById('iq-print')?.addEventListener('click', () => window.print());

    // Chart
    requestAnimationFrame(() => {
      const canvas = document.getElementById('iq-alloc-chart');
      if (!canvas || typeof Chart === 'undefined') return;
      if (_chart) { try { _chart.destroy(); } catch (_) {} }
      _chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: alloc.map(a => a.label.split('(')[0].trim()),
          datasets: [{
            data: alloc.map(a => a.pct),
            backgroundColor: COLORS.slice(0, alloc.length),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94A3B8', boxWidth: 12, font: { size: 10 } } },
          },
        },
      });
    });
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function destroy() {
    if (_chart) {
      try { _chart.destroy(); } catch (_) {}
      _chart = null;
    }
  }

  return { init, destroy };
})();
