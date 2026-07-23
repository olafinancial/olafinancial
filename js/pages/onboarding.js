// ============================================================
// OlaFinancial — Onboarding (6-step wizard)
// ============================================================

const WPOnboarding = (() => {

  let _step = 1;
  const TOTAL = 6; // profile → employment → goals → estate → your path → summary
  let _data = {};
  let _isReplay = false;

  async function init(container) {
    _step = 1;
    _isReplay = !!(WPApp.state.profile && WPApp.state.profile.onboarding_done);
    // Prefill from existing profile when replaying or resuming
    const p = WPApp.state.profile || {};
    _data = {
      full_name: p.full_name || '',
      age: p.age || null,
      state: p.state || '',
      currency: p.currency || 'NGN',
      employment_type: p.employment_type || '',
      dependents: p.dependents ?? 0,
      retirement_age: p.retirement_age || 60,
      risk_tolerance: p.risk_tolerance || 'moderate',
      goals: [],
      will: 'no',
      guardians: 'no',
    };
    container.innerHTML = `
      <div class="onboarding-shell">
        <div class="onboarding-card" id="onboarding-card">
          <div class="onboarding-logo sidebar-logo" style="border:none;padding:0;margin-bottom:1rem">
            <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="52" height="44" />
            <div>
              <div class="sidebar-logo-text">Pul Planning</div>
              <div class="sidebar-logo-sub">${_isReplay ? 'Refresh setup' : 'Setup'}</div>
            </div>
          </div>
          ${_isReplay ? `
            <div class="alert alert-info" style="margin-bottom:1.25rem">
              <span>You can update your profile anytime. When you finish, we will refresh your setup checklist.</span>
            </div>
            <div style="text-align:right;margin-bottom:0.75rem">
              <button type="button" class="btn btn-ghost btn-sm" id="ob-skip-exit">Exit without saving</button>
            </div>
          ` : ''}
          <div class="progress-steps" id="ob-progress"></div>
          <div id="ob-step-content"></div>
          <div class="modal-footer" id="ob-footer" style="border:none;padding-top:2rem;margin-top:0">
            <button class="btn btn-secondary" id="ob-back" style="display:none">Back</button>
            <button class="btn btn-primary" id="ob-next">Continue</button>
          </div>
        </div>
      </div>`;
    _renderProgress();
    _renderStep();
    document.getElementById('ob-next').addEventListener('click', _nextStep);
    document.getElementById('ob-back').addEventListener('click', _prevStep);
    document.getElementById('ob-skip-exit')?.addEventListener('click', () => {
      WPRouter.navigate('/dashboard', true);
    });
  }

  function _renderProgress() {
    const el = document.getElementById('ob-progress');
    if (!el) return;
    el.innerHTML = Array.from({ length: TOTAL }, (_, i) => {
      const cls = i + 1 < _step ? 'done' : i + 1 === _step ? 'active' : '';
      return `<div class="step-dot ${cls}"></div>`;
    }).join('');
  }

  function _renderStep() {
    const content = document.getElementById('ob-step-content');
    const back = document.getElementById('ob-back');
    const next = document.getElementById('ob-next');
    if (!content) return;
    back.style.display = _step > 1 ? '' : 'none';
    if (_step === TOTAL) {
      next.textContent = _isReplay ? 'Save & open dashboard' : 'Get Started';
    } else if (_step === 5) {
      next.textContent = 'I understand — continue';
    } else {
      next.textContent = 'Continue';
    }
    content.innerHTML = '';
    [_step1, _step2, _step3, _step4, _step5Path, _step6Summary][_step - 1](content);
  }

  function _step1(el) {
    const name = WPApp.state.profile?.full_name || '';
    el.innerHTML = `
      <h2 class="onboarding-step-title">Welcome to Pul Planning! 👋</h2>
      <p class="onboarding-step-desc">Let's personalize your experience. This takes about 2 minutes.</p>
      <div class="form-group">
        <label for="ob-name">Your Full Name</label>
        <input class="input" type="text" id="ob-name" value="${name}" placeholder="e.g. Adaeze Okonkwo">
      </div>
      <div class="form-group">
        <label for="ob-age">Your Current Age</label>
        <input class="input" type="number" id="ob-age" min="18" max="80" placeholder="e.g. 32" value="${_data.age||''}">
      </div>
      <div class="form-group">
        <label for="ob-state">State of Residence</label>
        <select class="select" id="ob-state">
          <option value="">Select a state…</option>
          <option value="LA" ${_data.state==='LA'?'selected':''}>Lagos</option>
          <option value="FC" ${_data.state==='FC'?'selected':''}>FCT — Abuja</option>
          <option value="RI" ${_data.state==='RI'?'selected':''}>Rivers</option>
          <option value="KN" ${_data.state==='KN'?'selected':''}>Kano</option>
          <option value="OY" ${_data.state==='OY'?'selected':''}>Oyo</option>
          <option value="AN" ${_data.state==='AN'?'selected':''}>Anambra</option>
          <option value="DE" ${_data.state==='DE'?'selected':''}>Delta</option>
          <option value="IM" ${_data.state==='IM'?'selected':''}>Imo</option>
          <option value="KD" ${_data.state==='KD'?'selected':''}>Kaduna</option>
          <option value="OG" ${_data.state==='OG'?'selected':''}>Ogun</option>
          <option value="EN" ${_data.state==='EN'?'selected':''}>Enugu</option>
          <option value="AB" ${_data.state==='AB'?'selected':''}>Abia</option>
          <option value="ED" ${_data.state==='ED'?'selected':''}>Edo</option>
          <option value="other" ${_data.state==='other'?'selected':''}>Other State (Nigeria)</option>
          <option value="non_resident" ${_data.state==='non_resident'?'selected':''}>Non-Resident (Outside Nigeria)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ob-currency">Base Currency</label>
        <select class="select" id="ob-currency">
          <option value="NGN" ${_data.currency==='NGN'||!_data.currency?'selected':''}>NGN (₦) — Nigerian Naira</option>
          <option value="USD" ${_data.currency==='USD'?'selected':''}>USD ($) — US Dollar</option>
          <option value="EUR" ${_data.currency==='EUR'?'selected':''}>EUR (€) — Euro</option>
          <option value="GBP" ${_data.currency==='GBP'?'selected':''}>GBP (£) — British Pound</option>
          <option value="AED" ${_data.currency==='AED'?'selected':''}>AED (د.إ) — UAE Dirham</option>
          <option value="CNY" ${_data.currency==='CNY'?'selected':''}>CNY (¥) — Chinese Yuan</option>
          <option value="XOF" ${_data.currency==='XOF'?'selected':''}>XOF (CFA) — West African CFA Franc</option>
          <option value="XAF" ${_data.currency==='XAF'?'selected':''}>XAF (FCFA) — Central African CFA Franc</option>
          <option value="KES" ${_data.currency==='KES'?'selected':''}>KES (KSh) — Kenyan Shilling</option>
          <option value="GHS" ${_data.currency==='GHS'?'selected':''}>GHS (GH₵) — Ghanaian Cedi</option>
          <option value="CAD" ${_data.currency==='CAD'?'selected':''}>CAD (CA$) — Canadian Dollar</option>
          <option value="ZAR" ${_data.currency==='ZAR'?'selected':''}>ZAR (R) — South African Rand</option>
          <option value="SAR" ${_data.currency==='SAR'?'selected':''}>SAR (ر.س) — Saudi Riyal</option>
          <option value="AUD" ${_data.currency==='AUD'?'selected':''}>AUD (A$) — Australian Dollar</option>
        </select>
      </div>`;
  }

  function _step2(el) {
    el.innerHTML = `
      <h2 class="onboarding-step-title">Your Employment</h2>
      <p class="onboarding-step-desc">This helps us show the right tax and pension calculations.</p>
      <div class="form-group">
        <label for="ob-emp">Employment Type</label>
        <select class="select" id="ob-emp">
          <option value="">Select…</option>
          <option value="salaried" ${_data.employment_type==='salaried'?'selected':''}>Salaried (PAYE)</option>
          <option value="self_employed" ${_data.employment_type==='self_employed'?'selected':''}>Self-Employed</option>
          <option value="business_owner" ${_data.employment_type==='business_owner'?'selected':''}>Business Owner</option>
          <option value="retired" ${_data.employment_type==='retired'?'selected':''}>Retired</option>
          <option value="student" ${_data.employment_type==='student'?'selected':''}>Student</option>
          <option value="other" ${_data.employment_type==='other'?'selected':''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ob-dependents">Number of Dependents</label>
        <input class="input" type="number" id="ob-dependents" min="0" max="20" placeholder="0" value="${_data.dependents||0}">
        <div class="input-hint">Children, parents, or anyone financially dependent on you</div>
      </div>`;
  }

  function _step3(el) {
    const goals = [
      { key: 'retire',    icon: '&#x1F334;', label: 'Retirement' },
      { key: 'debt_free', icon: '&#x2702;',  label: 'Become Debt-Free' },
      { key: 'home',      icon: '&#x1F3E0;', label: 'Buy a Home' },
      { key: 'emergency', icon: '&#x1F6E1;', label: 'Emergency Fund' },
      { key: 'invest',    icon: '&#x1F4C8;', label: 'Start Investing' },
      { key: 'education', icon: '&#x1F393;', label: "Children's Education" },
      { key: 'business',  icon: '&#x1F4BC;', label: 'Start a Business' },
    ];
    const selected = _data.goals || [];
    el.innerHTML = `
      <h2 class="onboarding-step-title">Retirement & Financial Goals</h2>
      <p class="onboarding-step-desc">Specify your target age, risk tolerance, and select primary goals.</p>
      <div class="form-row">
        <div class="form-group">
          <label for="ob-ret-age">Target Retirement Age</label>
          <input class="input" type="number" id="ob-ret-age" min="40" max="75" placeholder="60" value="${_data.retirement_age||60}">
        </div>
        <div class="form-group">
          <label for="ob-risk">Investment Risk Tolerance</label>
          <select class="select" id="ob-risk">
            <option value="conservative" ${_data.risk_tolerance==='conservative'?'selected':''}>Conservative — Preserve capital</option>
            <option value="moderate" ${(!_data.risk_tolerance||_data.risk_tolerance==='moderate')?'selected':''}>Moderate — Balanced growth</option>
            <option value="aggressive" ${_data.risk_tolerance==='aggressive'?'selected':''}>Aggressive — High growth</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Primary Financial Goals (Select all that apply)</label>
        <div class="goal-chips" style="margin-top:0.5rem">
          ${goals.map(g => `
            <div class="goal-chip ${selected.includes(g.key)?'active':''}" data-goal="${g.key}">
              <span>${g.icon}</span> ${g.label}
            </div>`).join('')}
        </div>
      </div>`;
    el.querySelectorAll('.goal-chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });
  }

  function _step4(el) {
    el.innerHTML = `
      <h2 class="onboarding-step-title">Estate & Legacy Planning 📜</h2>
      <p class="onboarding-step-desc">Let's audit your legacy readiness. These can be refined later.</p>
      <div class="form-group">
        <label for="ob-will">Do you currently have a Last Will & Testament?</label>
        <select class="select" id="ob-will">
          <option value="no" ${(!_data.will||_data.will==='no')?'selected':''}>No, I do not have one</option>
          <option value="yes_outdated" ${_data.will==='yes_outdated'?'selected':''}>Yes, but it is outdated (5+ years old)</option>
          <option value="yes_current" ${_data.will==='yes_current'?'selected':''}>Yes, and it is up-to-date</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ob-guardians">Have you designated guardians for minor children or dependents?</label>
        <select class="select" id="ob-guardians">
          <option value="no" ${(!_data.guardians||_data.guardians==='no')?'selected':''}>No</option>
          <option value="yes" ${_data.guardians==='yes'?'selected':''}>Yes</option>
          <option value="na" ${(_data.guardians==='na'||(_data.dependents===0 && !_data.guardians))?'selected':''}>Not Applicable</option>
        </select>
      </div>`;
  }

  /** Common path for first-time (and returning) users */
  function _step5Path(el) {
    const pathHtml = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.gettingStartedPathHTML)
      ? APP_CONFIG.gettingStartedPathHTML({ interactive: false })
      : '';
    el.innerHTML = `
      <h2 class="onboarding-step-title">Your simple path 🗺️</h2>
      <p class="onboarding-step-desc">
        New here? Follow this order after setup. You do not need to fill everything today —
        start at step 1, then move down the list when you are ready.
      </p>
      <div class="card" style="padding:1.25rem 1.25rem 0.5rem;margin-bottom:1rem;background:var(--clr-surface-2)">
        <div class="section-title" style="margin:0 0 1rem;font-size:1rem">Start here → then go there</div>
        ${pathHtml}
      </div>
      <div class="alert alert-info" style="margin-bottom:0">
        <span>Tip: After you finish, this same path appears on your <strong>Dashboard</strong>. You can also re-run this wizard anytime from <strong>Settings</strong>.</span>
      </div>`;
  }

  function _step6Summary(el) {
    el.innerHTML = `
      <h2 class="onboarding-step-title">${_isReplay ? 'Profile refreshed' : "You're all set!"} 🎉</h2>
      <p class="onboarding-step-desc">
        ${_isReplay
          ? 'Confirm your summary, then return to the dashboard. The getting-started checklist will show again so you can pick up where you left off.'
          : "Here's a summary of your profile. Click <strong>Get Started</strong> and follow the path: Goals → Income → Expenses → Balance Sheet → Dashboard."}
      </p>
      <div class="card" style="margin-bottom:1rem">
        <div class="card-title">Profile Summary</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.9rem">
          <div class="flex justify-between"><span class="text-muted">Name</span><strong>${_data.full_name||'—'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Age</span><strong>${_data.age||'—'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Employment</span><strong>${(_data.employment_type||'').replace('_',' ')}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Retirement Age</span><strong>${_data.retirement_age||60}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Risk Profile</span><strong>${_data.risk_tolerance||'moderate'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Will & Legacy</span><strong>${_data.will==='yes_current'?'Will (Current)':_data.will==='yes_outdated'?'Will (Outdated)':'No Will'}</strong></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:1rem;padding:1rem 1.25rem">
        <div class="card-title" style="margin-bottom:0.5rem">Remember the path</div>
        <ol style="margin:0;padding-left:1.25rem;color:var(--clr-text-2);font-size:0.9rem;line-height:1.7">
          <li><strong>Goals</strong> first (your strategic intent)</li>
          <li>Then <strong>Income</strong> → <strong>Expenses</strong> → <strong>Balance Sheet</strong></li>
          <li>Check <strong>Dashboard</strong> insights; optional Debt Planner &amp; Invest Profile</li>
        </ol>
      </div>
      <div class="disclaimer">${APP_CONFIG.disclaimer}</div>`;
  }

  function _collectStep() {
    if (_step === 1) {
      _data.full_name = document.getElementById('ob-name')?.value.trim();
      _data.age       = parseInt(document.getElementById('ob-age')?.value) || null;
      _data.state     = document.getElementById('ob-state')?.value;
      _data.currency  = document.getElementById('ob-currency')?.value || 'NGN';
      if (!_data.full_name || !_data.age) { WPToast.warning('Please fill in your name and age.'); return false; }
    }
    if (_step === 2) {
      _data.employment_type = document.getElementById('ob-emp')?.value;
      _data.dependents      = parseInt(document.getElementById('ob-dependents')?.value) || 0;
      if (!_data.employment_type) { WPToast.warning('Please select your employment type.'); return false; }
    }
    if (_step === 3) {
      _data.retirement_age = parseInt(document.getElementById('ob-ret-age')?.value) || 60;
      _data.risk_tolerance = document.getElementById('ob-risk')?.value;
      _data.goals = [...document.querySelectorAll('.goal-chip.active')].map(c => c.dataset.goal);
    }
    if (_step === 4) {
      _data.will      = document.getElementById('ob-will')?.value || 'no';
      _data.guardians = document.getElementById('ob-guardians')?.value || 'no';
    }
    return true;
  }

  async function _nextStep() {
    if (!_collectStep()) return;
    if (_step < TOTAL) {
      _step++;
      _renderProgress();
      _renderStep();
    } else {
      await _complete();
    }
  }

  function _prevStep() {
    if (_step > 1) { _step--; _renderProgress(); _renderStep(); }
  }

  async function _complete() {
    const btn = document.getElementById('ob-next');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const uid = WPApp.state.user.id;
      WPApp.state.profile = await WPDb.upsert('user_profiles', {
        user_id: uid, full_name: _data.full_name, age: _data.age,
        state: _data.state, employment_type: _data.employment_type,
        dependents: _data.dependents, retirement_age: _data.retirement_age || 60,
        risk_tolerance: _data.risk_tolerance || 'moderate', onboarding_done: true,
        currency: _data.currency || 'NGN',
      }, ['user_id']);
      // Save onboarding estate choices to localStorage
      const estateState = {
        will: _data.will,
        guardians: _data.guardians,
        trust: 'no',
        poa_fin: 'no',
        poa_health: 'no',
        living_will: 'no',
        beneficiary: 'no'
      };
      localStorage.setItem('wp_estate_planning_' + uid, JSON.stringify(estateState));
      
      // Show getting-started path on dashboard after (re)onboarding
      try {
        localStorage.setItem('wp_show_getting_started_' + uid, '1');
        localStorage.setItem('wp_onboarding_last_completed_' + uid, new Date().toISOString());
      } catch (_) { /* ignore */ }

      WPToast.success(_isReplay
        ? 'Profile updated. Follow the path on your dashboard when you are ready.'
        : 'Profile saved! Welcome to Pul Planning — start with Income.');
      // Reload the full app shell and navigate to dashboard
      history.replaceState(null, '', '#/dashboard');
      document.getElementById('root').innerHTML = '';
      await WPApp.boot();
    } catch (err) {
      WPToast.error('Failed to save profile: ' + err.message);
      btn.textContent = _isReplay ? 'Save & open dashboard' : 'Get Started';
      btn.disabled = false;
    }
  }

  function destroy() {}
  return { init, destroy };
})();
