// ============================================================
// OlaFinancial — Standalone Insurance & Takaful Questionnaire Page
// ============================================================

const WPInsurance = (() => {
  let _data = {};
  let _step = 1;
  const TOTAL_STEPS = 5;

  async function init(container) {
    const uid = WPApp.state.user.id;
    const local = localStorage.getItem('wp_insurance_data_' + uid);
    _data = local ? JSON.parse(local) : {
      takaful: 'no_preference',
      policies: [],
      answers: {
        age: WPApp.state.profile?.age || '',
        gender: 'prefer_not_say',
        dependents: 'no',
        dependentsDetails: '',
        income: 'under_50k',
        marital: 'single',
        goals: [],
        coverageNeeds: '',
        premiumBudget: '',
        lifeInterest: 'yes',
        cashValue: 'no',
        growthStyle: 'e',
        riskTolerance: 'moderate',
        cashAccess: 'somewhat',
        hasCurrentLife: 'no',
        currentLifeDetails: '',
        tobacco: 'no',
        healthHistory: '',
        otherInterests: [],
        otherConcerns: ''
      }
    };

    if (!_data.answers) {
      _data.answers = {
        age: WPApp.state.profile?.age || '',
        gender: 'prefer_not_say',
        dependents: 'no',
        dependentsDetails: '',
        income: 'under_50k',
        marital: 'single',
        goals: [],
        coverageNeeds: '',
        premiumBudget: '',
        lifeInterest: 'yes',
        cashValue: 'no',
        growthStyle: 'e',
        riskTolerance: 'moderate',
        cashAccess: 'somewhat',
        hasCurrentLife: 'no',
        currentLifeDetails: '',
        tobacco: 'no',
        healthHistory: '',
        otherInterests: [],
        otherConcerns: ''
      };
    }

    _step = 1;
    _renderLayout(container);
  }

  function _renderLayout(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Insurance Needs Assessment</h1>
          <p class="page-subtitle">Complete our comprehensive assessment to identify coverage gaps and get product recommendations</p>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-secondary" id="ins-reset-btn">🔄 Reset Assessment</button>
          <button class="btn btn-primary" id="ins-view-policies-btn">📋 Manage Policies</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>
        <!-- Insights Strip -->
        <div id="insurance-insights" style="display:none"></div>
        <!-- Sponsor Slot -->
        <div id="ins-sponsor-slot"></div>

        <div class="grid-3" id="ins-layout-grid">
          <!-- Step Form Column (span 2) -->
          <div class="card" style="grid-column: span 2; padding: 2rem;" id="ins-wizard-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;border-bottom:1px solid var(--clr-border);padding-bottom:1rem">
              <h3 style="margin:0;font-weight:700;color:#ffffff" id="ins-step-title">Personal Profile</h3>
              <span class="badge badge-accent" id="ins-step-progress">Step 1 of 5</span>
            </div>
            <div id="ins-step-container"></div>
            <div style="display:flex;justify-content:space-between;margin-top:2.5rem;border-top:1px solid var(--clr-border);padding-top:1.5rem">
              <button class="btn btn-secondary" id="ins-prev-btn" style="display:none">Back</button>
              <button class="btn btn-primary" id="ins-next-btn">Next Step</button>
            </div>
          </div>

          <!-- Recommendation Sidebar -->
          <div class="card" style="display:flex;flex-direction:column;gap:1.5rem;padding:1.5rem" id="ins-sidebar-card">
            <div class="section-title" style="margin:0">Recommendation Logic</div>
            <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--clr-border)">
              <div style="font-size:0.75rem;color:var(--clr-text-3);text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Recommended Class</div>
              <div id="sidebar-rec-product" style="font-size:1.6rem;font-weight:800;margin:0.5rem 0;color:var(--clr-accent)">Pending Assessment</div>
              <div id="sidebar-rec-details" style="font-size:0.8rem;color:var(--clr-text-2)">Fill questionnaire to trigger recommendation.</div>
            </div>
            <div style="font-size:0.82rem;line-height:1.5;color:var(--clr-text-2)">
              🕌 <strong class="text-white">Takaful Focus:</strong> Islamic Sharia-compliant cooperative insurance will be recommended if Takaful preference is selected in step 1.
            </div>
          </div>
        </div>
        <div id="ins-report-view" style="display:none;margin-top:1.5rem"></div>
      </div>
    `;

    document.getElementById('ins-next-btn').addEventListener('click', _nextStep);
    document.getElementById('ins-prev-btn').addEventListener('click', _prevStep);
    document.getElementById('ins-reset-btn').addEventListener('click', _resetForm);
    document.getElementById('ins-view-policies-btn').addEventListener('click', _renderPoliciesView);

    _renderStep();
    _updateRecommendation();

    // Evaluate insights
    WPInsights.evaluate('insurance', {
      hasLife:   (_data.answers?.hasCurrentLife === 'yes') || (_data.policies || []).some(p => p.type === 'life'),
      hasHealth: (_data.policies || []).some(p => p.type === 'health'),
    }, document.getElementById('insurance-insights'));
    // Show sponsor if no policies logged yet
    const hasPolicies = (_data.policies || []).length > 0;
    WPSponsor.render('insurance', document.getElementById('ins-sponsor-slot'), hasPolicies);
  }

  function _renderStep() {
    const container = document.getElementById('ins-step-container');
    const titleEl = document.getElementById('ins-step-title');
    const progEl = document.getElementById('ins-step-progress');
    const prevBtn = document.getElementById('ins-prev-btn');
    const nextBtn = document.getElementById('ins-next-btn');

    if (!container) return;

    prevBtn.style.display = _step > 1 ? '' : 'none';
    nextBtn.textContent = _step === TOTAL_STEPS ? 'Generate Assessment' : 'Next Step';
    progEl.textContent = `Step ${_step} of ${TOTAL_STEPS}`;

    const stepTitles = [
      "Personal Profile",
      "Insurance Goals & Needs",
      "Life Insurance & Investment",
      "Additional Details",
      "Other Insurance Interests"
    ];
    titleEl.textContent = stepTitles[_step - 1];
    container.innerHTML = '';

    const answers = _data.answers;

    if (_step === 1) {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-age">What is your age?</label>
            <input class="input" type="number" id="ob-ins-age" placeholder="e.g. 32" value="${answers.age || ''}" required>
          </div>
          <div class="form-group">
            <label for="ob-ins-gender">What is your gender? (Optional)</label>
            <select class="select" id="ob-ins-gender">
              <option value="male" ${answers.gender === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${answers.gender === 'female' ? 'selected' : ''}>Female</option>
              <option value="prefer_not_say" ${answers.gender === 'prefer_not_say' ? 'selected' : ''}>Prefer not to say</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-dependents">Do you have any dependents?</label>
            <select class="select" id="ob-ins-dependents">
              <option value="no" ${answers.dependents === 'no' ? 'selected' : ''}>No</option>
              <option value="yes" ${answers.dependents === 'yes' ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="form-group" id="dep-details-grp" style="display:${answers.dependents === 'yes' ? 'block' : 'none'}">
            <label for="ob-ins-dep-details">Specify dependents number & approximate ages</label>
            <input class="input" type="text" id="ob-ins-dep-details" placeholder="e.g. Spouse 30, Child 4" value="${answers.dependentsDetails || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-income">What is your approximate annual household income?</label>
            <select class="select" id="ob-ins-income">
              <option value="under_50k" ${answers.income === 'under_50k' ? 'selected' : ''}>Under $50,000</option>
              <option value="50k_100k" ${answers.income === '50k_100k' ? 'selected' : ''}>$50,000 – $99,999</option>
              <option value="100k_200k" ${answers.income === '100k_200k' ? 'selected' : ''}>$100,000 – $199,999</option>
              <option value="over_200k" ${answers.income === 'over_200k' ? 'selected' : ''}>$200,000+</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ob-ins-marital">What is your current marital status?</label>
            <select class="select" id="ob-ins-marital">
              <option value="single" ${answers.marital === 'single' ? 'selected' : ''}>Single</option>
              <option value="married" ${answers.marital === 'married' ? 'selected' : ''}>Married / Domestic Partner</option>
              <option value="divorced" ${answers.marital === 'divorced' ? 'selected' : ''}>Divorced / Separated</option>
              <option value="widowed" ${answers.marital === 'widowed' ? 'selected' : ''}>Widowed</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="ob-ins-takaful">Do you prefer Sharia-compliant (Takaful) insurance products?</label>
          <select class="select" id="ob-ins-takaful">
            <option value="yes" ${_data.takaful === 'yes' ? 'selected' : ''}>Yes – I only want Sharia-compliant (Takaful) products</option>
            <option value="no_preference" ${_data.takaful === 'no_preference' ? 'selected' : ''}>No preference – Conventional insurance is acceptable</option>
            <option value="both" ${_data.takaful === 'both' ? 'selected' : ''}>Open to both / Not sure</option>
          </select>
          <div class="input-hint">Takaful is Islamic insurance based on mutual cooperation, where participants share risks according to Sharia principles without interest (riba) or gambling elements.</div>
        </div>
      `;

      document.getElementById('ob-ins-dependents').addEventListener('change', (e) => {
        document.getElementById('dep-details-grp').style.display = e.target.value === 'yes' ? 'block' : 'none';
      });
    }

    if (_step === 2) {
      const goalsList = [
        { key: 'family_protect', label: 'Protect family/dependents financially if I pass away' },
        { key: 'build_savings', label: 'Build savings or wealth while having protection' },
        { key: 'pay_debts', label: 'Pay off debts (mortgage, loans, etc.)' },
        { key: 'fund_edu', label: "Fund children's education or future expenses" },
        { key: 'leave_legacy', label: 'Estate planning / leave a legacy' },
        { key: 'tax_grow', label: 'Tax-advantaged growth or retirement income' }
      ];
      container.innerHTML = `
        <div class="form-group">
          <label>What is your primary goal with this insurance? (Select all that apply)</label>
          <div class="goal-chips" style="margin-top:0.5rem">
            ${goalsList.map(g => `
              <div class="goal-chip ${answers.goals.includes(g.key) ? 'active' : ''}" data-goal-ins="${g.key}">
                ${g.label}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-cov-needs">How much life insurance coverage do you think you need?</label>
            <input class="input" type="text" id="ob-ins-cov-needs" placeholder="e.g. 10x my income, $500,000, cover mortgage" value="${answers.coverageNeeds || ''}">
          </div>
          <div class="form-group">
            <label for="ob-ins-budget">What is your approximate monthly budget for premiums?</label>
            <input class="input" type="text" id="ob-ins-budget" placeholder="e.g. $50-$100 per month" value="${answers.premiumBudget || ''}">
          </div>
        </div>
      `;

      container.querySelectorAll('.goal-chip').forEach(c => {
        c.addEventListener('click', () => c.classList.toggle('active'));
      });
    }

    if (_step === 3) {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-life-interest">Are you interested in Life Insurance?</label>
            <select class="select" id="ob-ins-life-interest">
              <option value="yes" ${answers.lifeInterest === 'yes' ? 'selected' : ''}>Yes</option>
              <option value="no" ${answers.lifeInterest === 'no' ? 'selected' : ''}>No</option>
            </select>
          </div>
          <div class="form-group" id="cash-value-grp" style="display:${answers.lifeInterest === 'yes' ? 'block' : 'none'}">
            <label for="ob-ins-cash-value">Do you want a policy that builds cash value?</label>
            <select class="select" id="ob-ins-cash-value">
              <option value="no" ${answers.cashValue === 'no' ? 'selected' : ''}>No — I only want pure protection (Term Life)</option>
              <option value="yes" ${answers.cashValue === 'yes' ? 'selected' : ''}>Yes — permanent coverage + investment growth</option>
            </select>
          </div>
        </div>

        <div id="ins-investment-detail-grp" style="display:${answers.lifeInterest === 'yes' && answers.cashValue === 'yes' ? 'block' : 'none'}">
          <div class="form-group">
            <label for="ob-ins-growth-style">Which investment/growth style appeals to you most?</label>
            <select class="select" id="ob-ins-growth-style">
              <option value="a" ${answers.growthStyle === 'a' ? 'selected' : ''}>A. Traditional Whole Life (Guaranteed Value + Dividends — Very Low Risk)</option>
              <option value="b" ${answers.growthStyle === 'b' ? 'selected' : ''}>B. Universal Life (Flexible + Current Interest Rate — Low-Medium Risk)</option>
              <option value="c" ${answers.growthStyle === 'c' ? 'selected' : ''}>C. Indexed Universal Life (Market-Linked with Downside Protection Floor — Medium Risk)</option>
              <option value="d" ${answers.growthStyle === 'd' ? 'selected' : ''}>D. Variable Universal Life (Direct Market Investment — Medium-High Risk)</option>
              <option value="e" ${answers.growthStyle === 'e' ? 'selected' : ''}>E. Not sure / Need explanation</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ob-ins-risk">Investment Risk Tolerance</label>
              <select class="select" id="ob-ins-risk">
                <option value="conservative" ${answers.riskTolerance === 'conservative' ? 'selected' : ''}>Conservative (prefer guarantees)</option>
                <option value="moderate" ${answers.riskTolerance === 'moderate' ? 'selected' : ''}>Moderate</option>
                <option value="aggressive" ${answers.riskTolerance === 'aggressive' ? 'selected' : ''}>Aggressive (accept volatility for returns)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="ob-ins-access">Importance of lifetime cash access</label>
              <select class="select" id="ob-ins-access">
                <option value="very" ${answers.cashAccess === 'very' ? 'selected' : ''}>Very important</option>
                <option value="somewhat" ${answers.cashAccess === 'somewhat' ? 'selected' : ''}>Somewhat important</option>
                <option value="not" ${answers.cashAccess === 'not' ? 'selected' : ''}>Not important</option>
              </select>
            </div>
          </div>
        </div>
      `;

      const lifeInt = document.getElementById('ob-ins-life-interest');
      const cashVal = document.getElementById('ob-ins-cash-value');
      
      lifeInt.addEventListener('change', (e) => {
        const showCash = e.target.value === 'yes';
        document.getElementById('cash-value-grp').style.display = showCash ? 'block' : 'none';
        document.getElementById('ins-investment-detail-grp').style.display = showCash && cashVal.value === 'yes' ? 'block' : 'none';
      });

      cashVal.addEventListener('change', (e) => {
        document.getElementById('ins-investment-detail-grp').style.display = lifeInt.value === 'yes' && e.target.value === 'yes' ? 'block' : 'none';
      });
    }

    if (_step === 4) {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="ob-ins-current-toggle">Do you currently have any life insurance?</label>
            <select class="select" id="ob-ins-current-toggle">
              <option value="no" ${answers.hasCurrentLife === 'no' ? 'selected' : ''}>No</option>
              <option value="yes" ${answers.hasCurrentLife === 'yes' ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="form-group" id="current-life-details-grp" style="display:${answers.hasCurrentLife === 'yes' ? 'block' : 'none'}">
            <label for="ob-ins-current-details">Please share type and approximate amount</label>
            <input class="input" type="text" id="ob-ins-current-details" placeholder="e.g. $100k term life through work" value="${answers.currentLifeDetails || ''}">
          </div>
        </div>

        <div class="form-group">
          <label for="ob-ins-tobacco">Do you smoke or use tobacco/nicotine products?</label>
          <select class="select" id="ob-ins-tobacco">
            <option value="no" ${answers.tobacco === 'no' ? 'selected' : ''}>No</option>
            <option value="yes" ${answers.tobacco === 'yes' ? 'selected' : ''}>Yes</option>
          </select>
        </div>

        <div class="form-group">
          <label for="ob-ins-health">Any major health conditions or family medical history?</label>
          <textarea class="textarea" id="ob-ins-health" style="height:100px" placeholder="Optional notes...">${answers.healthHistory || ''}</textarea>
        </div>
      `;

      document.getElementById('ob-ins-current-toggle').addEventListener('change', (e) => {
        document.getElementById('current-life-details-grp').style.display = e.target.value === 'yes' ? 'block' : 'none';
      });
    }

    if (_step === 5) {
      const optionals = [
        { key: 'health', label: 'Health / Medical Insurance' },
        { key: 'disability', label: 'Disability Income Protection' },
        { key: 'critical', label: 'Critical Illness Insurance' },
        { key: 'longterm', label: 'Long-term Care Insurance' },
        { key: 'home', label: 'Homeowners / Renters Insurance' },
        { key: 'auto', label: 'Auto Insurance' },
        { key: 'annuity', label: 'Retirement / Annuity products' }
      ];
      container.innerHTML = `
        <div class="form-group">
          <label>Are you also interested in any of the following? (Select all that apply)</label>
          <div class="goal-chips" style="margin-top:0.5rem">
            ${optionals.map(o => `
              <div class="goal-chip ${answers.otherInterests.includes(o.key) ? 'active' : ''}" data-opt-ins="${o.key}">
                ${o.label}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="ob-ins-concerns">Any other specific needs or concerns?</label>
          <textarea class="textarea" id="ob-ins-concerns" style="height:120px" placeholder="e.g. I want to leave money for kids college, I have a mortgage...">${answers.otherConcerns || ''}</textarea>
        </div>
      `;

      container.querySelectorAll('.goal-chip').forEach(c => {
        c.addEventListener('click', () => c.classList.toggle('active'));
      });
    }
  }

  function _collectStep() {
    const answers = _data.answers;

    if (_step === 1) {
      answers.age = parseInt(document.getElementById('ob-ins-age').value) || null;
      answers.gender = document.getElementById('ob-ins-gender').value;
      answers.dependents = document.getElementById('ob-ins-dependents').value;
      answers.dependentsDetails = document.getElementById('ob-ins-dep-details')?.value.trim() || '';
      answers.income = document.getElementById('ob-ins-income').value;
      answers.marital = document.getElementById('ob-ins-marital').value;
      _data.takaful = document.getElementById('ob-ins-takaful').value;
      
      if (!answers.age) {
        WPToast.warning("Please fill in your age.");
        return false;
      }
    }

    if (_step === 2) {
      answers.goals = [...document.querySelectorAll('[data-goal-ins].active')].map(c => c.dataset.goalIns);
      answers.coverageNeeds = document.getElementById('ob-ins-cov-needs').value.trim();
      answers.premiumBudget = document.getElementById('ob-ins-budget').value.trim();
    }

    if (_step === 3) {
      answers.lifeInterest = document.getElementById('ob-ins-life-interest').value;
      answers.cashValue = document.getElementById('ob-ins-cash-value').value;
      if (answers.lifeInterest === 'yes' && answers.cashValue === 'yes') {
        answers.growthStyle = document.getElementById('ob-ins-growth-style').value;
        answers.riskTolerance = document.getElementById('ob-ins-risk').value;
        answers.cashAccess = document.getElementById('ob-ins-access').value;
      }
    }

    if (_step === 4) {
      answers.hasCurrentLife = document.getElementById('ob-ins-current-toggle').value;
      answers.currentLifeDetails = document.getElementById('ob-ins-current-details')?.value.trim() || '';
      answers.tobacco = document.getElementById('ob-ins-tobacco').value;
      answers.healthHistory = document.getElementById('ob-ins-health').value.trim();
    }

    if (_step === 5) {
      answers.otherInterests = [...document.querySelectorAll('[data-opt-ins].active')].map(c => c.dataset.optIns);
      answers.otherConcerns = document.getElementById('ob-ins-concerns').value.trim();
    }

    localStorage.setItem('wp_takaful_preference_' + WPApp.state.user.id, _data.takaful);
    localStorage.setItem('wp_insurance_data_' + WPApp.state.user.id, JSON.stringify(_data));
    return true;
  }

  function _nextStep() {
    if (!_collectStep()) return;
    if (_step < TOTAL_STEPS) {
      _step++;
      _renderStep();
      _updateRecommendation();
    } else {
      _generateAssessment();
    }
  }

  function _prevStep() {
    if (_step > 1) {
      _step--;
      _renderStep();
      _updateRecommendation();
    }
  }

  function _resetForm() {
    if (confirm("Reset assessment? This clears questionnaire answers.")) {
      const uid = WPApp.state.user.id;
      _data.answers = {
        age: WPApp.state.profile?.age || '',
        gender: 'prefer_not_say',
        dependents: 'no',
        dependentsDetails: '',
        income: 'under_50k',
        marital: 'single',
        goals: [],
        coverageNeeds: '',
        premiumBudget: '',
        lifeInterest: 'yes',
        cashValue: 'no',
        growthStyle: 'e',
        riskTolerance: 'moderate',
        cashAccess: 'somewhat',
        hasCurrentLife: 'no',
        currentLifeDetails: '',
        tobacco: 'no',
        healthHistory: '',
        otherInterests: [],
        otherConcerns: ''
      };
      localStorage.setItem('wp_insurance_data_' + uid, JSON.stringify(_data));
      _step = 1;
      _renderLayout(document.getElementById('page-container'));
    }
  }

  function _updateRecommendation() {
    const sidebarProd = document.getElementById('sidebar-rec-product');
    const sidebarDetails = document.getElementById('sidebar-rec-details');
    if (!sidebarProd || !sidebarDetails) return;

    const answers = _data.answers;
    const isTakaful = _data.takaful === 'yes';

    if (answers.lifeInterest === 'no') {
      sidebarProd.textContent = isTakaful ? "General Takaful" : "Health / Property";
      sidebarDetails.textContent = "Focusing on property, auto, and medical protection.";
      return;
    }

    if (answers.cashValue === 'no') {
      sidebarProd.textContent = isTakaful ? "Family Takaful (Term)" : "Term Life Insurance";
      sidebarDetails.textContent = "Pure protection to cover liabilities and protect dependents at the lowest cost.";
      return;
    }

    // Cash Value
    if (isTakaful) {
      sidebarProd.textContent = "Investment-Linked Takaful";
      sidebarDetails.textContent = "Sharia-compliant permanent structure tracking Halal equity indices.";
      return;
    }

    if (answers.growthStyle === 'a') {
      sidebarProd.textContent = "Whole Life Insurance";
      sidebarDetails.textContent = "Guaranteed cash accumulation + potential dividends. Predictable and safe.";
    } else if (answers.growthStyle === 'b') {
      sidebarProd.textContent = "Universal Life";
      sidebarDetails.textContent = "Premium flexibility and adjustable death benefits tracking current yields.";
    } else if (answers.growthStyle === 'c') {
      sidebarProd.textContent = "Indexed Universal Life";
      sidebarDetails.textContent = "Growth linked to equity index (e.g., S&P 500) with a 0% floor protection.";
    } else if (answers.growthStyle === 'd') {
      sidebarProd.textContent = "Variable Universal Life";
      sidebarDetails.textContent = "Direct mutual funds exposure for high risk tolerances.";
    } else {
      sidebarProd.textContent = "Permanent Life";
      sidebarDetails.textContent = "Cash-accumulating plans tailored to your parameters.";
    }
  }

  function _generateAssessment() {
    const wizardCard = document.getElementById('ins-wizard-card');
    const sidebarCard = document.getElementById('ins-sidebar-card');
    const reportView = document.getElementById('ins-report-view');

    if (!wizardCard || !reportView) return;

    wizardCard.style.display = 'none';
    if (sidebarCard) sidebarCard.style.display = 'none';

    _updateRecommendation();
    const recommendedProduct = document.getElementById('sidebar-rec-product')?.textContent || 'Term Life';

    const answers = _data.answers;
    const baseCur = WPApp.state.profile?.currency || 'NGN';

    reportView.innerHTML = `
      <div class="card" style="padding: 2rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--clr-border); padding-bottom:1rem; margin-bottom:1.5rem">
          <div>
            <h2 style="color:#ffffff; margin:0">Needs Assessment & Analysis</h2>
            <p style="font-size:0.85rem; color:var(--clr-text-3); margin:0.25rem 0 0">Generated on ${new Date().toLocaleDateString()} for ${WPApp.state.profile?.full_name || 'User'}</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="ins-retake-btn">🔄 Retake Questionnaire</button>
        </div>

        <div class="grid-2" style="margin-bottom:2rem">
          <div>
            <h4 class="text-white" style="margin-bottom:0.75rem">Assessment Metrics</h4>
            <table class="table text-sm">
              <tr><td>Age / Marital Status</td><td><strong>${answers.age || '—'} / ${answers.marital.toUpperCase()}</strong></td></tr>
              <tr><td>Dependents</td><td><strong>${answers.dependents === 'yes' ? answers.dependentsDetails : 'None'}</strong></td></tr>
              <tr><td>Income Bracket</td><td><strong>${answers.income.replace('_', ' ').toUpperCase()}</strong></td></tr>
              <tr><td>Tobacco User</td><td><strong>${answers.tobacco.toUpperCase()}</strong></td></tr>
            </table>
          </div>
          <div>
            <h4 class="text-white" style="margin-bottom:0.75rem">Target Parameters</h4>
            <table class="table text-sm">
              <tr><td>Estimated Needs</td><td><strong>${answers.coverageNeeds || '—'}</strong></td></tr>
              <tr><td>Premium Budget</td><td><strong>${answers.premiumBudget || '—'}</strong></td></tr>
              <tr><td>Takaful Preference</td><td><strong>${_data.takaful === 'yes' ? '🕌 Active (Sharia-compliant)' : 'None (Conventional acceptable)'}</strong></td></tr>
              <tr><td>Life Insurance Type</td><td><strong>${answers.cashValue === 'yes' ? 'Permanent (Cash value)' : 'Term (Pure protection)'}</strong></td></tr>
            </table>
          </div>
        </div>

        <div style="background:rgba(0, 200, 150, 0.05); border:1px solid var(--clr-accent); border-radius:10px; padding:1.5rem; margin-bottom:2rem">
          <h3 style="color:#ffffff; margin:0 0 0.5rem; display:flex; align-items:center; gap:0.5rem">🎯 Recommended Solution: ${recommendedProduct}</h3>
          <p style="margin:0; font-size:0.9rem; line-height:1.6; color:var(--clr-text-2)">
            Based on your responses, we recommend a <strong>${recommendedProduct}</strong> policy. 
            ${_data.takaful === 'yes' 
              ? "This solution utilizes a Sharia-compliant cooperative fund structure, avoiding riba (interest) or gharar (uncertainty) while fulfilling your protective requirements." 
              : "This aligns with your preferences for risk tolerance, accumulation objectives, and liability coverage requirements."}
          </p>
        </div>

        ${answers.otherInterests.length ? `
          <div style="margin-top:1.5rem">
            <h4 class="text-white" style="margin-bottom:0.5rem">Additional Interest Flags</h4>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap">
              ${answers.otherInterests.map(oi => `<span class="badge badge-neutral">${oi.toUpperCase()}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    reportView.style.display = 'block';
    document.getElementById('ins-retake-btn').addEventListener('click', () => {
      reportView.style.display = 'none';
      wizardCard.style.display = 'block';
      if (sidebarCard) sidebarCard.style.display = 'block';
      _step = 1;
      _renderStep();
    });
  }

  function _renderPoliciesView() {
    const container = document.getElementById('page-container');
    if (!container) return;

    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const list = _data.policies || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Insurance Policies & Takaful</h1>
          <p class="page-subtitle">Add and manage your active policies</p>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-secondary" id="ins-back-assess-btn">📋 Needs Assessment</button>
          <button class="btn btn-primary" id="ins-add-btn">➕ Add Policy</button>
        </div>
      </div>
      <div class="page-body animate-in">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>

        <div class="grid-3">
          <div class="card" style="grid-column: span 2; padding: 1.5rem;">
            <div class="section-header" style="margin-bottom:1.25rem">
              <span class="section-title">Active Insurance Policies</span>
              <span class="badge badge-neutral" id="ins-policy-count">${list.length} Policy${list.length === 1 ? '' : 'ies'}</span>
            </div>
            
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Policy Name</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th class="text-right">Sum Assured</th>
                    <th class="text-right">Annual Premium</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="ins-policies-list">
                  ${list.length ? list.map((p, idx) => `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td><span class="badge badge-neutral">${p.type.toUpperCase()}</span></td>
                      <td>${p.provider}</td>
                      <td class="td-mono text-right">${WPUtils.fmt(p.sumAssured * 100, { currency: baseCur })}</td>
                      <td class="td-mono text-right">${WPUtils.fmt(p.premium * 100, { currency: baseCur })}</td>
                      <td>
                        <div style="display:flex; gap:0.5rem">
                          <button class="btn btn-ghost btn-sm" onclick="WPInsurance._edit(${idx})">Edit</button>
                          <button class="btn btn-ghost btn-sm text-danger" onclick="WPInsurance._delete(${idx})">Delete</button>
                        </div>
                      </td>
                    </tr>
                  `).join('') : `<tr><td colspan="6" class="text-muted text-center" style="padding:2rem">No insurance policies added yet. Click "Add Policy" to begin.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card" style="padding: 1.5rem; display:flex; flex-direction:column; gap:1.25rem">
            <div class="section-title" style="margin:0">Coverage Analysis</div>
            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:8px; border:1px solid var(--clr-border)">
              <div class="text-xs text-muted" style="text-transform:uppercase; font-weight:600; letter-spacing:0.05em">Total Coverage</div>
              <div class="card-value text-accent" id="ins-total-coverage" style="font-size:1.8rem; font-weight:800; margin:0.25rem 0">—</div>
              <div class="text-xs text-muted" id="ins-total-premiums">Total Annual Premiums: —</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add / Edit Modal -->
      <div class="modal-overlay" id="ins-modal" style="display:none">
        <div class="modal" style="max-width: 500px">
          <div class="modal-header">
            <h3 class="modal-title" id="ins-modal-title">Add Insurance Policy</h3>
            <button class="modal-close" id="ins-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="ins-form">
              <input type="hidden" id="ins-idx">
              <div class="form-group">
                <label for="ins-name">Policy Name / Description</label>
                <input class="input" type="text" id="ins-name" placeholder="e.g. Leadway Term Life Protection" required>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="ins-type">Policy Type</label>
                  <select class="select" id="ins-type" required>
                    <option value="life">Life Insurance</option>
                    <option value="health">Health Insurance</option>
                    <option value="motor">Motor Insurance</option>
                    <option value="property">Property / Home</option>
                    <option value="takaful">Takaful (Islamic)</option>
                    <option value="other">Other / Custom</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="ins-provider">Insurance Provider</label>
                  <input class="input" type="text" id="ins-provider" placeholder="e.g. AIICO Insurance" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="ins-sum-value">Sum Assured</label>
                  <input class="input" type="text" id="ins-sum-value" placeholder="10,000,000" required>
                </div>
                <div class="form-group">
                  <label for="ins-premium">Annual Premium</label>
                  <input class="input" type="text" id="ins-premium" placeholder="120,000" required>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem">
                <button class="btn btn-secondary" type="button" id="ins-modal-cancel">Cancel</button>
                <button class="btn btn-primary" type="submit">Save Policy</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ins-back-assess-btn').addEventListener('click', () => {
      _renderLayout(container);
    });

    document.getElementById('ins-add-btn').addEventListener('click', () => {
      document.getElementById('ins-form').reset();
      document.getElementById('ins-idx').value = '';
      document.getElementById('ins-modal-title').textContent = 'Add Insurance Policy';
      const m = document.getElementById('ins-modal');
      m.style.display = 'flex';
      setTimeout(() => m.classList.add('open'), 10);
    });

    document.getElementById('ins-modal-close').addEventListener('click', () => {
      const m = document.getElementById('ins-modal');
      m.classList.remove('open');
      setTimeout(() => m.style.display = 'none', 250);
    });
    document.getElementById('ins-modal-cancel').addEventListener('click', () => {
      const m = document.getElementById('ins-modal');
      m.classList.remove('open');
      setTimeout(() => m.style.display = 'none', 250);
    });

    document.getElementById('ins-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const uid = WPApp.state.user.id;
      const idx = document.getElementById('ins-idx').value;
      const policy = {
        name: document.getElementById('ins-name').value.trim(),
        type: document.getElementById('ins-type').value,
        provider: document.getElementById('ins-provider').value.trim(),
        sumAssured: WPUtils.cleanNum(document.getElementById('ins-sum-value').value),
        premium: WPUtils.cleanNum(document.getElementById('ins-premium').value)
      };

      if (idx === '') {
        _data.policies.push(policy);
      } else {
        _data.policies[parseInt(idx)] = policy;
      }

      localStorage.setItem('wp_insurance_data_' + uid, JSON.stringify(_data));
      const m = document.getElementById('ins-modal');
      m.classList.remove('open');
      setTimeout(() => m.style.display = 'none', 250);
      WPToast.success('Policy successfully saved!');
      _renderPoliciesView();
    });

    WPUtils.maskNumberInput(document.getElementById('ins-sum-value'));
    WPUtils.maskNumberInput(document.getElementById('ins-premium'));

    window.WPInsurance = {
      _edit: (idx) => {
        const p = _data.policies[idx];
        document.getElementById('ins-idx').value = idx;
        document.getElementById('ins-name').value = p.name;
        document.getElementById('ins-type').value = p.type;
        document.getElementById('ins-provider').value = p.provider;
        document.getElementById('ins-sum-value').value = p.sumAssured.toLocaleString();
        document.getElementById('ins-premium').value = p.premium.toLocaleString();
        document.getElementById('ins-modal-title').textContent = 'Edit Insurance Policy';
        const m = document.getElementById('ins-modal');
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('open'), 10);
      },
      _delete: (idx) => {
        if (confirm('Are you sure you want to delete this policy?')) {
          _data.policies.splice(idx, 1);
          localStorage.setItem('wp_insurance_data_' + WPApp.state.user.id, JSON.stringify(_data));
          WPToast.success('Policy deleted.');
          _renderPoliciesView();
        }
      }
    };

    let totalSum = 0;
    let totalPrem = 0;
    list.forEach(p => {
      totalSum += p.sumAssured;
      totalPrem += p.premium;
    });

    document.getElementById('ins-total-coverage').textContent = WPUtils.fmt(totalSum * 100, { currency: baseCur });
    document.getElementById('ins-total-premiums').textContent = 'Total Annual Premiums: ' + WPUtils.fmt(totalPrem * 100, { currency: baseCur });
  }

  function destroy() {
    delete window.WPInsurance;
  }

  return { init, destroy };
})();
