// ============================================================
// OlaFinancial — Onboarding (5-step wizard)
// ============================================================

const WPOnboarding = (() => {

  let _step = 1;
  const TOTAL = 5;
  let _data = {};

  async function init(container) {
    _step = 1;
    _data = {};
    container.innerHTML = `
      <div class="onboarding-shell">
        <div class="onboarding-card" id="onboarding-card">
          <div class="onboarding-logo">
            <div class="sidebar-logo-icon">&#x26A1;</div>
            <div>
              <div class="sidebar-logo-text">Ola Financial</div>
              <div class="sidebar-logo-sub">Setup</div>
            </div>
          </div>
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
    next.textContent = _step === TOTAL ? 'Get Started' : 'Continue';
    content.innerHTML = '';
    [_step1, _step2, _step3, _step4, _step5][_step - 1](content);
  }

  function _step1(el) {
    const name = WPApp.state.profile?.full_name || '';
    el.innerHTML = `
      <h2 class="onboarding-step-title">Welcome to Ola Financial! &#x1F44B;</h2>
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
          <option value="other" ${_data.state==='other'?'selected':''}>Other State</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ob-currency">Base Currency</label>
        <select class="select" id="ob-currency">
          <option value="NGN" ${_data.currency==='NGN'||!_data.currency?'selected':''}>NGN (₦) — Nigerian Naira</option>
          <option value="USD" ${_data.currency==='USD'?'selected':''}>USD ($) — US Dollar</option>
          <option value="EUR" ${_data.currency==='EUR'?'selected':''}>EUR (€) — Euro</option>
          <option value="GBP" ${_data.currency==='GBP'?'selected':''}>GBP (£) — British Pound</option>
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
    el.innerHTML = `
      <h2 class="onboarding-step-title">Retirement Goal</h2>
      <p class="onboarding-step-desc">When do you want to retire? We'll work backwards from there.</p>
      <div class="form-group">
        <label for="ob-ret-age">Target Retirement Age</label>
        <input class="input" type="number" id="ob-ret-age" min="40" max="75" placeholder="60" value="${_data.retirement_age||60}">
      </div>
      <div class="form-group">
        <label for="ob-risk">Investment Risk Tolerance</label>
        <select class="select" id="ob-risk">
          <option value="conservative" ${_data.risk_tolerance==='conservative'?'selected':''}>Conservative — Preserve capital, steady returns</option>
          <option value="moderate" ${(!_data.risk_tolerance||_data.risk_tolerance==='moderate')?'selected':''}>Moderate — Balanced growth and security</option>
          <option value="aggressive" ${_data.risk_tolerance==='aggressive'?'selected':''}>Aggressive — Maximum growth, higher risk</option>
        </select>
      </div>`;
  }

  function _step4(el) {
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
      <h2 class="onboarding-step-title">Your Financial Goals</h2>
      <p class="onboarding-step-desc">Select all that apply. You can change these later.</p>
      <div class="goal-chips">
        ${goals.map(g => `
          <div class="goal-chip ${selected.includes(g.key)?'active':''}" data-goal="${g.key}">
            <span>${g.icon}</span> ${g.label}
          </div>`).join('')}
      </div>`;
    el.querySelectorAll('.goal-chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });
  }

  function _step5(el) {
    el.innerHTML = `
      <h2 class="onboarding-step-title">You're all set! &#x1F389;</h2>
      <p class="onboarding-step-desc">Here's a summary of your profile. Click 'Get Started' to open your dashboard.</p>
      <div class="card" style="margin-bottom:1rem">
        <div class="card-title">Profile Summary</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.9rem">
          <div class="flex justify-between"><span class="text-muted">Name</span><strong>${_data.full_name||'—'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Age</span><strong>${_data.age||'—'}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Employment</span><strong>${(_data.employment_type||'').replace('_',' ')}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Retirement Age</span><strong>${_data.retirement_age||60}</strong></div>
          <div class="flex justify-between"><span class="text-muted">Risk Profile</span><strong>${_data.risk_tolerance||'moderate'}</strong></div>
        </div>
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
    }
    if (_step === 4) {
      _data.goals = [...document.querySelectorAll('.goal-chip.active')].map(c => c.dataset.goal);
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
      WPToast.success('Profile saved! Welcome to Ola Financial.');
      // Reload the full app shell
      document.getElementById('root').innerHTML = '';
      await WPApp.boot();
    } catch (err) {
      WPToast.error('Failed to save profile: ' + err.message);
      btn.textContent = 'Get Started'; btn.disabled = false;
    }
  }

  function destroy() {}
  return { init, destroy };
})();
