// ============================================================
// OlaFinancial — Standalone Insurance & Takaful Tracker Page
// ============================================================

const WPInsurance = (() => {
  let _data = {};

  async function init(container) {
    const uid = WPApp.state.user.id;
    const local = localStorage.getItem('wp_insurance_data_' + uid);
    _data = local ? JSON.parse(local) : {
      takaful: localStorage.getItem('wp_takaful_preference_' + uid) || 'no',
      policies: []
    };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Insurance Policies & Takaful</h1>
          <p class="page-subtitle">Track coverage limits, analyze policy types, and manage Sharia-compliant Takaful options</p>
        </div>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-primary" id="ins-add-btn">➕ Add Policy</button>
        </div>
      </div>
      <div class="page-body">
        <div class="disclaimer mb-6">${APP_CONFIG.disclaimer}</div>

        <!-- Takaful preference card -->
        <div class="card" style="margin-bottom:1.5rem; padding: 1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 1rem;">
            <div>
              <div class="section-title" style="margin:0;font-size:1.1rem">🕌 Sharia-Compliant Takaful Preferences</div>
              <p style="font-size:0.85rem;color:var(--clr-text-2);margin:0.25rem 0 0">
                Takaful is a co-operative system where members contribute money into a pooling system to guarantee each other.
              </p>
            </div>
            <div>
              <select class="select select-sm" id="ins-takaful-pref" style="width:260px; background:var(--clr-bg); border-color:var(--clr-border);">
                <option value="no" ${_data.takaful !== 'yes' ? 'selected' : ''}>Standard policies (standard yields)</option>
                <option value="yes" ${_data.takaful === 'yes' ? 'selected' : ''}>Sharia-compliant (Takaful) preference</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid-3">
          <!-- Policies List -->
          <div class="card" style="grid-column: span 2; padding: 1.5rem;">
            <div class="section-header" style="margin-bottom:1.25rem">
              <span class="section-title">Active Insurance Policies</span>
              <span class="badge badge-neutral" id="ins-policy-count">0 Policies</span>
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
                  <tr>
                    <td colspan="6" class="text-muted text-center" style="padding:2rem">No insurance policies added yet. Click "Add Policy" to begin.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Diagnostic / Coverage Gaps Sidebar -->
          <div class="card" style="padding: 1.5rem; display:flex; flex-direction:column; gap:1.25rem">
            <div class="section-title" style="margin:0">Coverage Analysis</div>
            
            <div style="background:rgba(255,255,255,0.02); padding:1rem; border-radius:8px; border:1px solid var(--clr-border)">
              <div class="text-xs text-muted" style="text-transform:uppercase; font-weight:600; letter-spacing:0.05em">Total Coverage</div>
              <div class="card-value text-accent" id="ins-total-coverage" style="font-size:1.8rem; font-weight:800; margin:0.25rem 0">—</div>
              <div class="text-xs text-muted" id="ins-total-premiums">Total Annual Premiums: —</div>
            </div>

            <div style="font-size:0.85rem; line-height:1.6; color:var(--clr-text-2)">
              <strong class="text-white">💡 Coverage Recommendation:</strong>
              <ul style="margin:0.5rem 0; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.4rem">
                <li><strong>Life Insurance</strong>: 10-12x your annual income.</li>
                <li><strong>Health Insurance</strong>: Coverage for major local medical events.</li>
                <li><strong>Takaful Alignment</strong>: ${_data.takaful === 'yes' ? '<span class="text-accent">Active. Prioritizing Sharia-compliant plans.</span>' : 'Standard structures applied.'}</li>
              </ul>
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

    // Listeners
    document.getElementById('ins-takaful-pref').addEventListener('change', (e) => {
      _data.takaful = e.target.value;
      localStorage.setItem('wp_takaful_preference_' + uid, _data.takaful);
      localStorage.setItem('wp_insurance_data_' + uid, JSON.stringify(_data));
      WPToast.success('Insurance preferences saved!');
      _render();
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
      _render();
    });

    WPUtils.maskNumberInput(document.getElementById('ins-sum-value'));
    WPUtils.maskNumberInput(document.getElementById('ins-premium'));

    // Expose edit/delete callbacks globally
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
          localStorage.setItem('wp_insurance_data_' + uid, JSON.stringify(_data));
          WPToast.success('Policy deleted.');
          _render();
        }
      }
    };

    _render();
  }

  function _render() {
    const list = _data.policies || [];
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    document.getElementById('ins-policy-count').textContent = `${list.length} Policy${list.length === 1 ? '' : 'ies'}`;

    const listEl = document.getElementById('ins-policies-list');
    if (!list.length) {
      listEl.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="padding:2rem">No insurance policies added yet. Click "Add Policy" to begin.</td></tr>`;
      document.getElementById('ins-total-coverage').textContent = WPUtils.fmt(0, { currency: baseCur });
      document.getElementById('ins-total-premiums').textContent = 'Total Annual Premiums: ' + WPUtils.fmt(0, { currency: baseCur });
      return;
    }

    let totalSum = 0;
    let totalPrem = 0;

    listEl.innerHTML = list.map((p, idx) => {
      totalSum += p.sumAssured;
      totalPrem += p.premium;
      return `
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
      `;
    }).join('');

    document.getElementById('ins-total-coverage').textContent = WPUtils.fmt(totalSum * 100, { currency: baseCur });
    document.getElementById('ins-total-premiums').textContent = 'Total Annual Premiums: ' + WPUtils.fmt(totalPrem * 100, { currency: baseCur });
  }

  function destroy() {
    delete window.WPInsurance;
  }

  return { init, destroy };
})();
