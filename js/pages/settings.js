// ============================================================
// OlaFinancial — Settings Page
// ============================================================

const WPSettings = (() => {

  async function init(container) {
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const profile = WPApp.state.profile || {};

    const currencies = [
      { code: 'NGN', label: 'NGN (₦) — Nigerian Naira' },
      { code: 'USD', label: 'USD ($) — US Dollar' },
      { code: 'EUR', label: 'EUR (€) — Euro' },
      { code: 'GBP', label: 'GBP (£) — British Pound' },
      { code: 'AED', label: 'AED (د.إ) — UAE Dirham' },
      { code: 'CNY', label: 'CNY (¥) — Chinese Yuan' },
      { code: 'XOF', label: 'XOF (CFA) — West African CFA Franc' },
      { code: 'XAF', label: 'XAF (FCFA) — Central African CFA Franc' },
      { code: 'KES', label: 'KES (KSh) — Kenyan Shilling' },
      { code: 'GHS', label: 'GHS (GH₵) — Ghanaian Cedi' },
      { code: 'CAD', label: 'CAD (CA$) — Canadian Dollar' },
      { code: 'ZAR', label: 'ZAR (R) — South African Rand' },
      { code: 'SAR', label: 'SAR (ر.س) — Saudi Riyal' },
      { code: 'AUD', label: 'AUD (A$) — Australian Dollar' },
      { code: 'NONE', label: 'No Currency Symbol (Plain numbers)' }
    ];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure your base currency, user preferences, and profile defaults</p>
        </div>
      </div>
      <div class="page-body animate-in">
        <div class="card" style="max-width: 600px; padding: 2rem;">
          <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Profile & Preferences</h3>
          
          <div class="form-group">
            <label for="set-name">Full Name</label>
            <input class="input" type="text" id="set-name" value="${profile.full_name || ''}" placeholder="Full Name">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="set-age">Age</label>
              <input class="input" type="number" id="set-age" value="${profile.age || ''}" placeholder="Age">
            </div>
            <div class="form-group">
              <label for="set-retirement">Retirement Target Age</label>
              <input class="input" type="number" id="set-retirement" value="${profile.retirement_age || 60}" placeholder="60">
            </div>
          </div>

          <div class="form-group">
            <label for="set-currency">Global Base Currency Override</label>
            <select class="select" id="set-currency">
              ${currencies.map(c => `<option value="${c.code}" ${baseCur === c.code ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
            <div class="input-hint">Changing this updates the default symbol across your calculations, sheets, and reports. Select 'No Currency Symbol' to view pure amounts.</div>
          </div>

          <div class="form-group">
            <label for="set-takaful">Insurance Preference</label>
            <select class="select" id="set-takaful">
              <option value="no" ${localStorage.getItem('wp_takaful_preference_' + WPApp.state.user.id) !== 'yes' ? 'selected' : ''}>Standard policies (standard yields)</option>
              <option value="yes" ${localStorage.getItem('wp_takaful_preference_' + WPApp.state.user.id) === 'yes' ? 'selected' : ''}>Sharia-compliant (Takaful) preference</option>
            </select>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="save-settings-btn">Save Changes</button>
        </div>
      </div>
    `;

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
      const btn = document.getElementById('save-settings-btn');
      btn.textContent = 'Saving…';
      btn.disabled = true;
      try {
        const uid = WPApp.state.user.id;
        const newCurrency = document.getElementById('set-currency').value;
        const name = document.getElementById('set-name').value.trim();
        const age = parseInt(document.getElementById('set-age').value) || null;
        const retAge = parseInt(document.getElementById('set-retirement').value) || 60;
        const takaful = document.getElementById('set-takaful').value;

        // Update database
        WPApp.state.profile = await WPDb.upsert('user_profiles', {
          user_id: uid,
          full_name: name,
          age: age,
          retirement_age: retAge,
          currency: newCurrency,
        }, ['user_id']);

        // Update local preferences
        localStorage.setItem('wp_takaful_preference_' + uid, takaful);
        
        // Also update local currency caches across views to align with new global override
        const views = ['balance_sheet', 'dashboard', 'income', 'expenses', 'cashflow', 'debt', 'emergency', 'goals', 'reports'];
        views.forEach(v => {
          localStorage.setItem(`wp_page_currency_${v}`, newCurrency);
        });

        WPToast.success('Settings and global base currency saved successfully.');
        
        // Reload app data and view
        await WPApp.boot();
      } catch (err) {
        WPToast.error('Could not save settings: ' + err.message);
      } finally {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
      }
    });
  }

  function destroy() {}
  return { init, destroy };
})();
