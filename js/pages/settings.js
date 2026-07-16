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

    const digestEnabled   = profile.digest_enabled   ?? false;
    const digestFrequency = profile.digest_frequency  || 'weekly';
    const digestEmail     = profile.digest_email      || '';
    const lastSent        = profile.digest_last_sent
      ? new Date(profile.digest_last_sent).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
      : 'Never';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure your base currency, user preferences, and profile defaults</p>
        </div>
      </div>
      <div class="page-body animate-in">

        <!-- Profile & Preferences -->
        <div class="card" style="max-width:600px;padding:2rem;margin-bottom:1.5rem;">
          <h3 style="margin-bottom:1.5rem;font-weight:700;color:#ffffff">Profile &amp; Preferences</h3>
          
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

          <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" id="save-settings-btn">Save Changes</button>
        </div>

        <!-- Sharia / Takaful preference (not app-wide filter) -->
        <div class="card" style="max-width:600px;padding:2rem;margin-bottom:1.5rem;">
          <h3 style="margin-bottom:0.5rem;font-weight:700;color:#ffffff">🕌 Sharia &amp; Takaful preference</h3>
          <p style="color:var(--clr-text-2);font-size:0.85rem;margin:0 0 1.25rem;line-height:1.55">
            Guides <strong>Insurance (Takaful)</strong> wording, highlights Zakat / interest-free debt tools,
            and Halal investing tips. This does <em>not</em> hide conventional features app-wide.
          </p>
          <div class="form-group">
            <label for="set-takaful">Do you prefer Sharia-compliant products where available?</label>
            <select class="select" id="set-takaful">
              <option value="yes" ${APP_CONFIG.getTakafulPreference(WPApp.state.user?.id) === 'yes' ? 'selected' : ''}>Yes — prefer Takaful / Sharia-conscious options</option>
              <option value="both" ${APP_CONFIG.getTakafulPreference(WPApp.state.user?.id) === 'both' ? 'selected' : ''}>Open to both / Not sure</option>
              <option value="no_preference" ${APP_CONFIG.getTakafulPreference(WPApp.state.user?.id) === 'no_preference' ? 'selected' : ''}>No preference — conventional is fine</option>
            </select>
          </div>
          <div class="flex gap-2" style="flex-wrap:wrap;margin-top:0.75rem">
            <a href="#/insurance" class="btn btn-secondary btn-sm">Insurance / Takaful</a>
            <a href="#/calculators" class="btn btn-secondary btn-sm" id="set-zakat-link">Zakat calculator</a>
            <a href="#/debt" class="btn btn-ghost btn-sm">Debt (interest-free notes)</a>
            <a href="#/invest" class="btn btn-ghost btn-sm">Invest profile</a>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:1.25rem" id="save-takaful-btn">Save preference</button>
        </div>

        <!-- Getting started / onboarding replay -->
        <div class="card" style="max-width:600px;padding:2rem;margin-bottom:1.5rem;">
          <h3 style="margin-bottom:0.5rem;font-weight:700;color:#ffffff">🗺️ Getting started</h3>
          <p style="color:var(--clr-text-2);font-size:0.85rem;margin:0 0 1.25rem;line-height:1.55">
            New to Pul Planning? Use the same step-by-step path shown after signup:
            <strong>Goals → Income → Expenses → Balance Sheet → Dashboard</strong>.
            You can re-run the full setup wizard anytime to refresh your profile.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <button type="button" class="btn btn-secondary" id="set-show-guide-btn" style="width:100%">Show path on Dashboard</button>
            <button type="button" class="btn btn-primary" id="set-replay-onboarding-btn" style="width:100%">Replay setup wizard</button>
          </div>
          <div class="input-hint" style="margin-top:0.75rem">Replay opens the onboarding steps again (pre-filled). Exit anytime without saving if you only wanted a tour.</div>
        </div>

        <!-- Email Digest Settings -->
        <div class="card" style="max-width:600px;padding:2rem;">
          <h3 style="margin-bottom:0.5rem;font-weight:700;color:#ffffff">📬 Email Digest</h3>
          <p style="color:var(--clr-text-2);font-size:0.85rem;margin:0 0 1.5rem">Receive a branded financial summary email with your key metrics — net worth, cash flow, savings rate — delivered on your schedule.</p>

          <!-- Toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
            <div>
              <div style="font-weight:600;color:var(--clr-text-1);">Enable Email Digest</div>
              <div style="font-size:0.8rem;color:var(--clr-text-3);margin-top:2px;">Last sent: ${lastSent}</div>
            </div>
            <label style="position:relative;display:inline-block;width:48px;height:26px;cursor:pointer;">
              <input type="checkbox" id="set-digest-enabled" ${digestEnabled ? 'checked' : ''} style="opacity:0;width:0;height:0;position:absolute;">
              <span id="digest-toggle-track" style="
                position:absolute;top:0;left:0;right:0;bottom:0;
                background:${digestEnabled ? 'var(--clr-accent)' : 'var(--clr-surface-3)'};
                border-radius:26px;transition:background 0.25s;
              "></span>
              <span id="digest-toggle-thumb" style="
                position:absolute;top:3px;left:${digestEnabled ? '25px' : '3px'};
                width:20px;height:20px;background:#fff;border-radius:50%;
                transition:left 0.25s;
              "></span>
            </label>
          </div>

          <!-- Frequency -->
          <div class="form-group" id="digest-options" style="display:${digestEnabled ? 'block' : 'none'}">
            <label for="set-digest-freq">Delivery Frequency</label>
            <select class="select" id="set-digest-freq">
              <option value="daily"   ${digestFrequency==='daily'   ? 'selected':''}>Daily</option>
              <option value="weekly"  ${digestFrequency==='weekly'  ? 'selected':''}>Weekly (Sundays)</option>
              <option value="monthly" ${digestFrequency==='monthly' ? 'selected':''}>Monthly</option>
            </select>
          </div>

          <!-- Optional email override -->
          <div class="form-group" id="digest-email-group" style="display:${digestEnabled ? 'block' : 'none'}">
            <label for="set-digest-email">Digest Email Address <span style="color:var(--clr-text-3);font-weight:400">(optional — uses your login email if blank)</span></label>
            <input class="input" type="email" id="set-digest-email" value="${digestEmail}" placeholder="e.g. personal@example.com">
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:1rem" id="save-digest-btn">Save Digest Preferences</button>
        </div>

      </div>
    `;

    // ── Getting started / replay onboarding ──────────────────
    document.getElementById('set-show-guide-btn')?.addEventListener('click', () => {
      const uid = WPApp.state.user?.id;
      if (!uid) return;
      try {
        localStorage.setItem('wp_show_getting_started_' + uid, '1');
        localStorage.removeItem('wp_hide_getting_started_' + uid);
      } catch (_) {}
      WPToast.success('Getting-started path will show on your Dashboard.');
      WPRouter.navigate('/dashboard');
    });
    document.getElementById('set-replay-onboarding-btn')?.addEventListener('click', () => {
      WPToast.info('Opening setup wizard — you can exit without saving.');
      WPRouter.navigate('/onboarding');
    });

    document.getElementById('save-takaful-btn')?.addEventListener('click', () => {
      const uid = WPApp.state.user?.id;
      const v = document.getElementById('set-takaful')?.value || 'no_preference';
      APP_CONFIG.setTakafulPreference(uid, v);
      // Keep insurance payload in sync if present
      try {
        const key = 'wp_insurance_data_' + uid;
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          data.takaful = v;
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch { /* ignore */ }
      WPToast.success(v === 'yes'
        ? 'Takaful preference saved — Insurance and Sharia tools will emphasise compliance.'
        : 'Preference saved.');
    });

    document.getElementById('set-zakat-link')?.addEventListener('click', (e) => {
      // Open calculators with hash hint for zakat tab
      sessionStorage.setItem('wp_calc_tab', 'zakat');
    });

    // ── Profile save ─────────────────────────────────────────
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

        WPApp.state.profile = await WPDb.upsert('user_profiles', {
          user_id: uid,
          full_name: name,
          age: age,
          retirement_age: retAge,
          currency: newCurrency,
        }, ['user_id']);
        
        const views = ['balance_sheet', 'dashboard', 'income', 'expenses', 'cashflow', 'debt', 'emergency', 'goals', 'reports'];
        views.forEach(v => {
          localStorage.setItem(`wp_page_currency_${v}`, newCurrency);
        });

        WPToast.success('Settings and global base currency saved successfully.');
        await WPApp.boot();
      } catch (err) {
        WPToast.error('Could not save settings: ' + err.message);
      } finally {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
      }
    });

    // ── Digest toggle animation ──────────────────────────────
    const toggleCheckbox = document.getElementById('set-digest-enabled');
    const toggleTrack    = document.getElementById('digest-toggle-track');
    const toggleThumb    = document.getElementById('digest-toggle-thumb');
    const digestOptions  = document.getElementById('digest-options');
    const digestEmailGrp = document.getElementById('digest-email-group');

    toggleCheckbox.addEventListener('change', () => {
      const on = toggleCheckbox.checked;
      toggleTrack.style.background = on ? 'var(--clr-accent)' : 'var(--clr-surface-3)';
      toggleThumb.style.left       = on ? '25px' : '3px';
      digestOptions.style.display  = on ? 'block' : 'none';
      digestEmailGrp.style.display = on ? 'block' : 'none';
    });

    // ── Digest prefs save ────────────────────────────────────
    document.getElementById('save-digest-btn').addEventListener('click', async () => {
      const btn = document.getElementById('save-digest-btn');
      btn.textContent = 'Saving…';
      btn.disabled = true;
      try {
        const uid     = WPApp.state.user.id;
        const enabled = document.getElementById('set-digest-enabled').checked;
        const freq    = document.getElementById('set-digest-freq').value;
        const email   = document.getElementById('set-digest-email').value.trim() || null;

        WPApp.state.profile = await WPDb.upsert('user_profiles', {
          user_id:          uid,
          digest_enabled:   enabled,
          digest_frequency: freq,
          digest_email:     email,
        }, ['user_id']);

        WPToast.success(enabled
          ? `Email digest enabled — ${freq} delivery confirmed.`
          : 'Email digest disabled.'
        );
      } catch (err) {
        WPToast.error('Could not save digest preferences: ' + err.message);
      } finally {
        btn.textContent = 'Save Digest Preferences';
        btn.disabled = false;
      }
    });
  }

  function destroy() {}
  return { init, destroy };
})();


