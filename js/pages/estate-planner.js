// ============================================================
// OlaFinancial — Estate Planning Questionnaire & Diagnostic
// ============================================================

const WPEstatePlanner = (() => {

  let _data = {};

  async function init(container) {
    const uid = WPApp.state.user.id;
    const local = localStorage.getItem('wp_estate_planning_' + uid);
    _data = local ? JSON.parse(local) : {};

    // Run calculations to pre-populate from database if not filled yet
    await _prepopulate(uid);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Estate Planner</h1>
          <p class="page-subtitle">Identify critical security gaps in your legacy plan and protect your loved ones</p>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-secondary" id="estate-reset-btn">🔄 Reset Form</button>
          <button class="btn btn-primary" id="estate-audit-btn">📊 Generate Report</button>
        </div>
      </div>
      <div class="page-body">
        <div class="grid-3" id="estate-layout-grid">
          <!-- Step Form Column (span 2) -->
          <div class="card" style="grid-column: span 2; padding: 2rem;" id="estate-wizard-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;border-bottom:1px solid var(--clr-border);padding-bottom:1rem">
              <h3 style="margin:0;font-weight:700;color:#ffffff" id="estate-step-title">Personal Details</h3>
              <span class="badge badge-accent" id="estate-step-progress">Step 1 of 5</span>
            </div>
            <div id="estate-step-container"></div>
            <div style="display:flex;justify-content:space-between;margin-top:2.5rem;border-top:1px solid var(--clr-border);padding-top:1.5rem">
              <button class="btn btn-secondary" id="estate-prev-btn" style="display:none">Back</button>
              <button class="btn btn-primary" id="estate-next-btn">Next Step</button>
            </div>
          </div>
          <!-- Real-Time Risk Bar Column -->
          <div class="card" style="display:flex;flex-direction:column;gap:1.5rem" id="estate-sidebar-card">
            <div class="section-title">Audit Diagnostic</div>
            <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--clr-border)">
              <div style="font-size:0.75rem;color:var(--clr-text-3);text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Risk Level</div>
              <div id="sidebar-risk-level" style="font-size:2rem;font-weight:800;margin:0.5rem 0;color:var(--clr-accent)">Adequate</div>
              <div id="sidebar-risk-score" style="font-size:0.8rem;color:var(--clr-text-2)">Score: 0 / 20 points</div>
            </div>
            <div style="font-size:0.82rem;line-height:1.5;color:var(--clr-text-2)">
              💡 Fill out the steps to compile your <strong>Legacy Risk Score</strong> and receive a customized checklist.
            </div>
          </div>
        </div>
        <div id="estate-report-view" style="display:none;margin-top:1.5rem"></div>
      </div>`;

    document.getElementById('estate-next-btn').addEventListener('click', _nextStep);
    document.getElementById('estate-prev-btn').addEventListener('click', _prevStep);
    document.getElementById('estate-reset-btn').addEventListener('click', _resetForm);
    document.getElementById('estate-audit-btn').addEventListener('click', () => _generateReport(true));

    _step = 1;
    _renderStep();
    _updateSidebarRisk();
  }

  let _step = 1;
  const TOTAL_STEPS = 5;

  async function _prepopulate(uid) {
    try {
      // 1. Fetch user data
      const profile = WPApp.state.profile || {};
      const user = WPApp.state.user || {};
      
      if (!_data.full_name) _data.full_name = profile.full_name || '';
      if (!_data.email) _data.email = user.email || '';
      if (!_data.marital_status) _data.marital_status = 'single';
      if (!_data.children) _data.children = (profile.dependents > 0) ? 'yes' : 'no';
      if (!_data.children_count) _data.children_count = profile.dependents || 0;
      if (!_data.prev_relationship) _data.prev_relationship = 'no';
      if (!_data.special_needs) _data.special_needs = 'no';

      // 2. Fetch assets to pre-populate ranges and ownership
      const assets = await WPDb.fetchAll('assets', { user_id: uid });
      const baseCur = profile.currency || 'NGN';
      
      const totalAssets = assets.reduce((sum, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return sum + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, baseCur);
      }, 0);
      const totalAssetsNaira = WPUtils.koboToNaira(totalAssets);

      if (!_data.asset_value) {
        if (totalAssetsNaira > 150000000) _data.asset_value = '150m_plus';
        else if (totalAssetsNaira > 75000000) _data.asset_value = '75m_150m';
        else if (totalAssetsNaira > 30000000) _data.asset_value = '30m_75m';
        else if (totalAssetsNaira > 10000000) _data.asset_value = '10m_30m';
        else _data.asset_value = '0_10m';
      }

      if (!_data.own_real_estate) {
        _data.own_real_estate = assets.some(a => a.asset_type === 'property') ? 'yes' : 'no';
      }

      if (!_data.own_business) {
        _data.own_business = assets.some(a => ['equity', 'alternative'].includes(a.asset_type) && /business|company|start|shares/i.test(a.asset_name || '')) ? 'yes' : 'no';
      }

      // Default document statuses
      if (!_data.will) _data.will = 'no';
      if (!_data.will_updated) _data.will_updated = 'never';
      if (!_data.trust) _data.trust = 'no';
      if (!_data.trust_updated) _data.trust_updated = 'never';
      if (!_data.poa_fin) _data.poa_fin = 'no';
      if (!_data.poa_fin_updated) _data.poa_fin_updated = 'never';
      if (!_data.poa_health) _data.poa_health = 'no';
      if (!_data.poa_health_updated) _data.poa_health_updated = 'never';
      if (!_data.living_will) _data.living_will = 'no';
      if (!_data.living_will_updated) _data.living_will_updated = 'never';
      if (!_data.beneficiary) _data.beneficiary = 'no';
      if (!_data.beneficiary_updated) _data.beneficiary_updated = 'never';

    } catch (e) {
      console.warn("Could not pre-populate: ", e);
    }
  }

  function _renderStep() {
    const titleEl = document.getElementById('estate-step-title');
    const progEl = document.getElementById('estate-step-progress');
    const container = document.getElementById('estate-step-container');
    const prevBtn = document.getElementById('estate-prev-btn');
    const nextBtn = document.getElementById('estate-next-btn');

    if (!container) return;

    prevBtn.style.display = _step > 1 ? '' : 'none';
    nextBtn.textContent = _step === TOTAL_STEPS ? 'View Report' : 'Next Step';
    progEl.textContent = `Step ${_step} of ${TOTAL_STEPS}`;

    const stepTitles = [
      "Personal & Family Details",
      "Core Legacy Documents",
      "Health & Financial Autonomy",
      "Asset & Business Summary",
      "Goals & Reference Support"
    ];
    titleEl.textContent = stepTitles[_step - 1];

    if (_step === 1) {
      container.innerHTML = `
        <div class="form-group">
          <label for="ep-name">Full Legal Name</label>
          <input class="input" id="ep-name" value="${_data.full_name||''}" placeholder="Full Legal Name">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="ep-dob">Date of Birth</label>
            <input class="input" type="date" id="ep-dob" value="${_data.dob||''}">
          </div>
          <div class="form-group">
            <label for="ep-marital">Marital Status</label>
            <select class="select" id="ep-marital">
              <option value="single" ${_data.marital_status==='single'?'selected':''}>Single</option>
              <option value="married" ${_data.marital_status==='married'?'selected':''}>Married</option>
              <option value="divorced" ${_data.marital_status==='divorced'?'selected':''}>Divorced</option>
              <option value="widowed" ${_data.marital_status==='widowed'?'selected':''}>Widowed</option>
              <option value="domestic_partnership" ${_data.marital_status==='domestic_partnership'?'selected':''}>Domestic Partnership</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="ep-children">Do you have children?</label>
            <select class="select" id="ep-children">
              <option value="no" ${_data.children==='no'?'selected':''}>No</option>
              <option value="yes" ${_data.children==='yes'?'selected':''}>Yes</option>
            </select>
          </div>
          <div class="form-group" id="ep-child-count-container" style="display:${_data.children==='yes'?'block':'none'}">
            <label for="ep-child-count">Number of Children</label>
            <input class="input" type="number" id="ep-child-count" min="0" max="20" value="${_data.children_count||0}">
          </div>
        </div>
        <div class="form-group" id="ep-complex-family-container" style="display:${_data.children==='yes'?'block':'none'}">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ep-prev" ${_data.prev_relationship==='yes'?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I have children from a previous relationship</span>
          </div>
        </div>
        <div class="form-group">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ep-special" ${_data.special_needs==='yes'?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I have dependents with special needs requiring long-term planning</span>
          </div>
        </div>`;

      document.getElementById('ep-children').addEventListener('change', (ev) => {
        const hasKids = ev.target.value === 'yes';
        document.getElementById('ep-child-count-container').style.display = hasKids ? 'block' : 'none';
        document.getElementById('ep-complex-family-container').style.display = hasKids ? 'block' : 'none';
      });
    }

    else if (_step === 2) {
      container.innerHTML = `
        <div class="card" style="background:rgba(255,255,255,0.01);margin-bottom:1.5rem;padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">1. Last Will and Testament</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Declares distribution of assets and names executors.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-will">
                <option value="no" ${_data.will==='no'?'selected':''}>No Will Created</option>
                <option value="yes" ${_data.will==='yes'?'selected':''}>Yes, Will Created</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-will-date-container" style="margin-top:1rem;display:${_data.will==='yes'?'block':'none'}">
            <label for="ep-will-updated">When was your Will last updated or reviewed?</label>
            <select class="select" id="ep-will-updated">
              <option value="recently" ${_data.will_updated==='recently'?'selected':''}>Recently (Within 5 years)</option>
              <option value="outdated" ${_data.will_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>

        <div class="card" style="background:rgba(255,255,255,0.01);margin-bottom:1.5rem;padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">2. Revocable Living Trust</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Allows assets to pass directly without public probate.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-trust">
                <option value="no" ${_data.trust==='no'?'selected':''}>No Trust Created</option>
                <option value="yes" ${_data.trust==='yes'?'selected':''}>Yes, Trust Created</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-trust-date-container" style="margin-top:1rem;display:${_data.trust==='yes'?'block':'none'}">
            <label for="ep-trust-updated">When was your Trust last updated?</label>
            <select class="select" id="ep-trust-updated">
              <option value="recently" ${_data.trust_updated==='recently'?'selected':''}>Recently (Within 5 years)</option>
              <option value="outdated" ${_data.trust_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>

        <div class="card" style="background:rgba(255,255,255,0.01);padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">3. Beneficiary Designations</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Assigned names on PFAs, bank accounts, and policies.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-beneficiary">
                <option value="no" ${_data.beneficiary==='no'?'selected':''}>Not Updated/Reviewed</option>
                <option value="yes" ${_data.beneficiary==='yes'?'selected':''}>Yes, Reviewed & Updated</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-ben-date-container" style="margin-top:1rem;display:${_data.beneficiary==='yes'?'block':'none'}">
            <label for="ep-beneficiary-updated">When were your designations last updated?</label>
            <select class="select" id="ep-beneficiary-updated">
              <option value="recently" ${_data.beneficiary_updated==='recently'?'selected':''}>Recently (Within 2 years)</option>
              <option value="2_5_years" ${_data.beneficiary_updated==='2_5_years'?'selected':''}>2 to 5 years ago</option>
              <option value="outdated" ${_data.beneficiary_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>`;

      document.getElementById('ep-will').addEventListener('change', (ev) => {
        document.getElementById('ep-will-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
      document.getElementById('ep-trust').addEventListener('change', (ev) => {
        document.getElementById('ep-trust-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
      document.getElementById('ep-beneficiary').addEventListener('change', (ev) => {
        document.getElementById('ep-ben-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
    }

    else if (_step === 3) {
      container.innerHTML = `
        <div class="card" style="background:rgba(255,255,255,0.01);margin-bottom:1.5rem;padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">1. Durable Power of Attorney (Financial)</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Authorizes someone to manage financial affairs if you are incapacitated.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-poa-fin">
                <option value="no" ${_data.poa_fin==='no'?'selected':''}>No POA Configured</option>
                <option value="yes" ${_data.poa_fin==='yes'?'selected':''}>Yes, POA Configured</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-poa-fin-date-container" style="margin-top:1rem;display:${_data.poa_fin==='yes'?'block':'none'}">
            <label for="ep-poa-fin-updated">When was this POA last updated?</label>
            <select class="select" id="ep-poa-fin-updated">
              <option value="recently" ${_data.poa_fin_updated==='recently'?'selected':''}>Recently (Within 5 years)</option>
              <option value="outdated" ${_data.poa_fin_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>

        <div class="card" style="background:rgba(255,255,255,0.01);margin-bottom:1.5rem;padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">2. Healthcare Power of Attorney</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Authorizes someone to make medical decisions if you cannot.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-poa-health">
                <option value="no" ${_data.poa_health==='no'?'selected':''}>No POA Configured</option>
                <option value="yes" ${_data.poa_health==='yes'?'selected':''}>Yes, POA Configured</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-poa-health-date-container" style="margin-top:1rem;display:${_data.poa_health==='yes'?'block':'none'}">
            <label for="ep-poa-health-updated">When was this POA last updated?</label>
            <select class="select" id="ep-poa-health-updated">
              <option value="recently" ${_data.poa_health_updated==='recently'?'selected':''}>Recently (Within 5 years)</option>
              <option value="outdated" ${_data.poa_health_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>

        <div class="card" style="background:rgba(255,255,255,0.01);padding:1.25rem;border-color:var(--clr-border)">
          <div class="form-row" style="align-items:center">
            <div class="form-group">
              <label style="font-weight:700;color:#ffffff">3. Living Will / Advance Directive</label>
              <span class="text-xs text-muted" style="display:block;margin-top:2px">Outlines preferred end-of-life treatments.</span>
            </div>
            <div class="form-group">
              <select class="select select-sm" id="ep-living-will">
                <option value="no" ${_data.living_will==='no'?'selected':''}>No Living Will</option>
                <option value="yes" ${_data.living_will==='yes'?'selected':''}>Yes, Configured</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="ep-living-will-date-container" style="margin-top:1rem;display:${_data.living_will==='yes'?'block':'none'}">
            <label for="ep-living-will-updated">When was this Directive last updated?</label>
            <select class="select" id="ep-living-will-updated">
              <option value="recently" ${_data.living_will_updated==='recently'?'selected':''}>Recently (Within 5 years)</option>
              <option value="outdated" ${_data.living_will_updated==='outdated'?'selected':''}>Outdated (More than 5 years ago)</option>
            </select>
          </div>
        </div>`;

      document.getElementById('ep-poa-fin').addEventListener('change', (ev) => {
        document.getElementById('ep-poa-fin-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
      document.getElementById('ep-poa-health').addEventListener('change', (ev) => {
        document.getElementById('ep-poa-health-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
      document.getElementById('ep-living-will').addEventListener('change', (ev) => {
        document.getElementById('ep-living-will-date-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
    }

    else if (_step === 4) {
      container.innerHTML = `
        <div class="form-group">
          <label for="ep-asset-value">Approximate Total Value of Investable Assets</label>
          <select class="select" id="ep-asset-value">
            <option value="0_10m" ${_data.asset_value==='0_10m'?'selected':''}>Below ₦10,000,000</option>
            <option value="10m_30m" ${_data.asset_value==='10m_30m'?'selected':''}>₦10,000,000 – ₦30,000,000</option>
            <option value="30m_75m" ${_data.asset_value==='30m_75m'?'selected':''}>₦30,000,000 – ₦75,000,000</option>
            <option value="75m_150m" ${_data.asset_value==='75m_150m'?'selected':''}>₦75,000,000 – ₦150,000,000</option>
            <option value="150m_plus" ${_data.asset_value==='150m_plus'?'selected':''}>Above ₦150,000,000</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="ep-realestate">Do you own real estate?</label>
            <select class="select" id="ep-realestate">
              <option value="no" ${_data.own_real_estate==='no'?'selected':''}>No</option>
              <option value="yes" ${_data.own_real_estate==='yes'?'selected':''}>Yes</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ep-business">Do you own or have an interest in a business?</label>
            <select class="select" id="ep-business">
              <option value="no" ${_data.own_business==='no'?'selected':''}>No</option>
              <option value="yes" ${_data.own_business==='yes'?'selected':''}>Yes</option>
            </select>
          </div>
        </div>
        <div class="form-group" id="ep-succession-container" style="display:${_data.own_business==='yes'?'block':'none'}">
          <div class="toggle-group">
            <label class="toggle"><input type="checkbox" id="ep-succession" ${_data.has_succession_plan==='yes'?'checked':''}><span class="toggle-slider"></span></label>
            <span class="toggle-label">I have a formally documented business succession plan</span>
          </div>
        </div>`;

      document.getElementById('ep-business').addEventListener('change', (ev) => {
        document.getElementById('ep-succession-container').style.display = ev.target.value === 'yes' ? 'block' : 'none';
      });
    }

    else if (_step === 5) {
      container.innerHTML = `
        <div class="form-group">
          <label for="ep-goals">What are your main goals for your estate plan?</label>
          <textarea class="textarea" id="ep-goals" rows="3" placeholder="e.g. Provide for children, ensure smooth transfer of property, support charity">${_data.goals_text||''}</textarea>
        </div>
        <div class="form-group">
          <label for="ep-concerns">Do you have any specific concerns about your current estate planning situation?</label>
          <textarea class="textarea" id="ep-concerns" rows="3" placeholder="e.g. Tax liabilities, guardian disputes, family conflicts">${_data.concerns_text||''}</textarea>
        </div>
        <div class="form-row" style="align-items:center">
          <div class="form-group">
            <div class="toggle-group">
              <label class="toggle"><input type="checkbox" id="ep-charity" ${_data.charitable_giving==='yes'?'checked':''}><span class="toggle-slider"></span></label>
              <span class="toggle-label">Would you like to include charitable giving in your estate plan?</span>
            </div>
          </div>
          <div class="form-group">
            <div class="toggle-group">
              <label class="toggle"><input type="checkbox" id="ep-attorney" ${_data.has_attorney==='yes'?'checked':''}><span class="toggle-slider"></span></label>
              <span class="toggle-label">I currently have an estate planning attorney</span>
            </div>
          </div>
        </div>`;
    }
  }

  function _collectStepData() {
    if (_step === 1) {
      _data.full_name = document.getElementById('ep-name')?.value.trim();
      _data.dob = document.getElementById('ep-dob')?.value;
      _data.marital_status = document.getElementById('ep-marital')?.value;
      _data.children = document.getElementById('ep-children')?.value;
      _data.children_count = parseInt(document.getElementById('ep-child-count')?.value) || 0;
      _data.prev_relationship = document.getElementById('ep-prev')?.checked ? 'yes' : 'no';
      _data.special_needs = document.getElementById('ep-special')?.checked ? 'yes' : 'no';
    }
    else if (_step === 2) {
      _data.will = document.getElementById('ep-will')?.value;
      _data.will_updated = document.getElementById('ep-will-updated')?.value || 'never';
      _data.trust = document.getElementById('ep-trust')?.value;
      _data.trust_updated = document.getElementById('ep-trust-updated')?.value || 'never';
      _data.beneficiary = document.getElementById('ep-beneficiary')?.value;
      _data.beneficiary_updated = document.getElementById('ep-beneficiary-updated')?.value || 'never';
    }
    else if (_step === 3) {
      _data.poa_fin = document.getElementById('ep-poa-fin')?.value;
      _data.poa_fin_updated = document.getElementById('ep-poa-fin-updated')?.value || 'never';
      _data.poa_health = document.getElementById('ep-poa-health')?.value;
      _data.poa_health_updated = document.getElementById('ep-poa-health-updated')?.value || 'never';
      _data.living_will = document.getElementById('ep-living-will')?.value;
      _data.living_will_updated = document.getElementById('ep-living-will-updated')?.value || 'never';
    }
    else if (_step === 4) {
      _data.asset_value = document.getElementById('ep-asset-value')?.value;
      _data.own_real_estate = document.getElementById('ep-realestate')?.value;
      _data.own_business = document.getElementById('ep-business')?.value;
      _data.has_succession_plan = document.getElementById('ep-succession')?.checked ? 'yes' : 'no';
    }
    else if (_step === 5) {
      _data.goals_text = document.getElementById('ep-goals')?.value.trim();
      _data.concerns_text = document.getElementById('ep-concerns')?.value.trim();
      _data.charitable_giving = document.getElementById('ep-charity')?.checked ? 'yes' : 'no';
      _data.has_attorney = document.getElementById('ep-attorney')?.checked ? 'yes' : 'no';
    }

    // Save state
    const uid = WPApp.state.user.id;
    localStorage.setItem('wp_estate_planning_' + uid, JSON.stringify(_data));
    _updateSidebarRisk();
  }

  function _updateSidebarRisk() {
    const scores = _calculateRiskScore();
    const total = scores.total;

    const levelEl = document.getElementById('sidebar-risk-level');
    const scoreEl = document.getElementById('sidebar-risk-score');

    if (!levelEl || !scoreEl) return;

    scoreEl.textContent = `Score: ${total} / 20 points`;
    if (total >= 9) {
      levelEl.textContent = "Critical";
      levelEl.className = "text-danger";
    } else if (total >= 5) {
      levelEl.textContent = "Moderate";
      levelEl.className = "text-gold";
    } else {
      levelEl.textContent = "Adequate";
      levelEl.className = "text-accent";
    }
  }

  function _calculateRiskScore() {
    let willScore = 0;
    let trustScore = 0;
    let poaScore = 0;
    let beneficiaryScore = 0;
    let guardianshipScore = 0;
    let businessScore = 0;
    let specialNeedsScore = 0;

    // 1. Will Score
    if (_data.will === 'no') {
      willScore = 3;
    } else if (_data.will === 'yes' && _data.will_updated === 'outdated') {
      willScore = 2;
    }

    // 2. Living Trust Score (High risk if no trust and assets > 75M / 150M)
    const complexAssets = ['75m_150m', '150m_plus'].includes(_data.asset_value);
    if (_data.trust === 'no') {
      trustScore = complexAssets ? 3 : 1;
    } else if (_data.trust === 'yes' && _data.trust_updated === 'outdated') {
      trustScore = 2;
    }

    // 3. Power of Attorney Score (Financial + Health)
    const hasFin = _data.poa_fin === 'yes';
    const hasHealth = _data.poa_health === 'yes';
    if (!hasFin && !hasHealth) poaScore = 3;
    else if (!hasFin || !hasHealth) poaScore = 2;

    // 4. Beneficiary Designation Score
    if (_data.beneficiary === 'no') {
      beneficiaryScore = 2;
    } else if (_data.beneficiary === 'yes') {
      if (_data.beneficiary_updated === 'outdated') beneficiaryScore = 2;
      else if (_data.beneficiary_updated === '2_5_years') beneficiaryScore = 1;
    }

    // 5. Minor Children / Guardianship Score
    if (_data.children === 'yes') {
      const hasGuardians = _data.guardians === 'yes';
      if (!hasGuardians) guardianshipScore = 3;
    }

    // 6. Business Score
    if (_data.own_business === 'yes' && _data.has_succession_plan === 'no') {
      businessScore = 2;
    }

    // 7. Special Needs Score
    if (_data.special_needs === 'yes') {
      specialNeedsScore = 3;
    }

    const total = willScore + trustScore + poaScore + beneficiaryScore + guardianshipScore + businessScore + specialNeedsScore;
    
    return {
      total,
      breakdown: {
        will: willScore,
        trust: trustScore,
        poa: poaScore,
        beneficiary: beneficiaryScore,
        guardianship: guardianshipScore,
        business: businessScore,
        specialNeeds: specialNeedsScore
      }
    };
  }

  function _nextStep() {
    _collectStepData();
    if (_step < TOTAL_STEPS) {
      _step++;
      _renderStep();
    } else {
      _generateReport();
    }
  }

  function _prevStep() {
    _collectStepData();
    if (_step > 1) {
      _step--;
      _renderStep();
    }
  }

  function _resetForm() {
    WPModal.confirm("Reset Questionnaire", "Are you sure you want to clear your answers? This will reset the diagnostic.", () => {
      _data = {};
      const uid = WPApp.state.user.id;
      localStorage.removeItem('wp_estate_planning_' + uid);
      _prepopulate(uid).then(() => {
        _step = 1;
        _renderStep();
        _updateSidebarRisk();
        document.getElementById('estate-report-view').style.display = 'none';
        document.getElementById('estate-layout-grid').style.display = '';
      });
    });
  }

  function _generateReport(force = false) {
    if (!force) _collectStepData();

    const scores = _calculateRiskScore();
    const total = scores.total;

    let riskTitle = "Adequate (Low Risk)";
    let riskClass = "text-accent";
    let riskDesc = "Your estate planning covers most primary safeguards. Continue reviewing periodically.";
    let timeline = "Review in 12–18 months";

    if (total >= 9) {
      riskTitle = "Critical (High Risk)";
      riskClass = "text-danger";
      riskDesc = "Significant gaps exist in your legacy safety net. Action is urgently recommended to protect your family and assets.";
      timeline = "Urgent action required within 2–4 weeks";
    } else if (total >= 5) {
      riskTitle = "Moderate Risk";
      riskClass = "text-gold";
      riskDesc = "Some important safeguards are missing. Addressing these gaps will secure your financial legacy.";
      timeline = "Address key gaps within 3–6 months";
    }

    const gaps = [];
    const actions = [];

    if (_data.will === 'no') {
      gaps.push("<strong>No Last Will & Testament</strong>: You run the risk of intestacy, meaning assets will be distributed according to rigid state laws rather than your choices.");
      actions.push("Draft a Last Will & Testament detailing asset distribution and naming an Executor.");
    } else if (_data.will === 'yes' && _data.will_updated === 'outdated') {
      gaps.push("<strong>Outdated Will (5+ years)</strong>: Important life milestones (births, property acquisition) may not be properly accounted for.");
      actions.push("Revise and update your Will with an estate attorney to include newer assets or changes in executors.");
    }

    if (_data.trust === 'no' && ['75m_150m', '150m_plus'].includes(_data.asset_value)) {
      gaps.push("<strong>No Living Trust for Complex Assets</strong>: Your heirs might face high probate costs, public disclosure, and delays before accessing inherited wealth.");
      actions.push("Consult an estate planner about establishing a Revocable Living Trust to bypass probate.");
    }

    if (_data.poa_fin === 'no' || _data.poa_health === 'no') {
      gaps.push("<strong>Missing Power of Attorney</strong>: If you are incapacitated, family members may have to go through a court process just to manage your finances or authorize healthcare.");
      actions.push("Draft durable Financial and Healthcare Powers of Attorney designating trusted trustees.");
    }

    if (_data.beneficiary === 'no' || _data.beneficiary_updated === 'outdated') {
      gaps.push("<strong>Outdated Beneficiary Designations</strong>: Account beneficiaries override Wills. Outdated files can direct assets to wrong individuals.");
      actions.push("Update primary/contingent beneficiaries on your Pension (PFA), insurance policies, and investment accounts.");
    }

    if (_data.children === 'yes' && _data.guardians === 'no') {
      gaps.push("<strong>No Guardians Named for Minor Children</strong>: The state will determine custody of minor children if both parents are absent.");
      actions.push("Formally designate legal guardians for minor children inside your Will.");
    }

    if (_data.own_business === 'yes' && _data.has_succession_plan === 'no') {
      gaps.push("<strong>No Business Succession Plan</strong>: The future operations and transfer of your business are at risk, which can lead to valuation losses.");
      actions.push("Establish a formal buy-sell agreement or succession plan for business interests.");
    }

    if (_data.special_needs === 'yes') {
      gaps.push("<strong>Special Needs Planning Needed</strong>: Leaving direct inheritances can disqualify special needs dependents from government benefits or support resources.");
      actions.push("Research setting up a Special Needs Trust (or equivalent asset trust) for dependents requiring long-term care.");
    }

    // Hide wizard and sidebar
    document.getElementById('estate-layout-grid').style.display = 'none';

    const reportEl = document.getElementById('estate-report-view');
    reportEl.style.display = '';
    reportEl.innerHTML = `
      <div class="card" style="padding: 2.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--clr-border);padding-bottom:1.5rem">
          <div>
            <h2 style="margin:0;font-weight:800;font-size:1.8rem;color:#ffffff">Legacy Risk Report</h2>
            <div style="font-size:0.85rem;color:var(--clr-text-3);margin-top:4px">Client Name: <strong>${_data.full_name||'—'}</strong> • Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Print Report</button>
        </div>
        
        <div class="grid-3" style="margin: 2rem 0; gap: 1.5rem">
          <div class="card" style="background:rgba(255,255,255,0.01);text-align:center;padding:1.5rem">
            <div class="card-title">Risk Level</div>
            <div class="card-value ${riskClass}" style="font-size:1.8rem;margin:0.5rem 0">${riskTitle}</div>
            <div style="font-size:0.75rem;color:var(--clr-text-2)">${riskDesc}</div>
          </div>
          <div class="card" style="background:rgba(255,255,255,0.01);text-align:center;padding:1.5rem">
            <div class="card-title">Risk Score</div>
            <div class="card-value" style="font-size:1.8rem;margin:0.5rem 0">${total} <span style="font-size:0.9rem;font-weight:400;color:var(--clr-text-3)">/ 20</span></div>
            <div style="font-size:0.75rem;color:var(--clr-text-2)">Points derived from safety gaps</div>
          </div>
          <div class="card" style="background:rgba(255,255,255,0.01);text-align:center;padding:1.5rem">
            <div class="card-title">Action Timeline</div>
            <div class="card-value text-accent" style="font-size:1.4rem;margin:0.5rem 0">${timeline}</div>
            <div style="font-size:0.75rem;color:var(--clr-text-2)">Recommended time to resolve gaps</div>
          </div>
        </div>

        <div style="margin-top:2.5rem">
          <h3 style="border-left:3px solid var(--clr-danger);padding-left:12px;margin-bottom:1rem;font-weight:700;color:#ffffff">Identified Safety Gaps (${gaps.length})</h3>
          ${gaps.length ? `
            <ul style="padding-left:1.2rem;display:flex;flex-direction:column;gap:0.75rem;line-height:1.6;font-size:0.93rem">
              ${gaps.map(g => `<li style="color:var(--clr-text-2)">${g}</li>`).join('')}
            </ul>
          ` : `
            <div style="padding:1.5rem;color:var(--clr-accent);background:var(--clr-accent-dim);border-radius:8px;font-size:0.9rem">
              🎉 Excellent! No significant gaps were identified in your current legacy safeguards.
            </div>
          `}
        </div>

        <div style="margin-top:2.5rem">
          <h3 style="border-left:3px solid var(--clr-accent);padding-left:12px;margin-bottom:1rem;font-weight:700;color:#ffffff">Personalized Action Items</h3>
          ${actions.length ? `
            <ol style="padding-left:1.2rem;display:flex;flex-direction:column;gap:0.75rem;line-height:1.6;font-size:0.93rem">
              ${actions.map(a => `<li style="color:var(--clr-text)">${a}</li>`).join('')}
            </ol>
          ` : `
            <p style="color:var(--clr-text-2);font-size:0.93rem">No actions required. Keep reviewing your estate planning files annually or upon major life changes.</p>
          `}
        </div>

        <div style="margin-top:3rem;text-align:center;border-top:1px solid var(--clr-border);padding-top:2rem">
          <button class="btn btn-secondary" id="estate-return-btn">⬅️ Edit Answers & Recalculate</button>
        </div>
      </div>`;

    document.getElementById('estate-return-btn').addEventListener('click', () => {
      document.getElementById('estate-report-view').style.display = 'none';
      document.getElementById('estate-layout-grid').style.display = '';
    });
  }

  function destroy() {}
  return { init, destroy };
})();
