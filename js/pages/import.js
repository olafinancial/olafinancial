// ============================================================
// Pul Planning — ClearNumber import
// #/import?code=…  (the code is not a money figure)
// Signed-out visitors keep the code through sign-up / sign-in.
// Signed-in visitors preview the workbook, then confirm before
// any row is written. Confirm redeems the code once.
// ============================================================

const WPImport = (() => {
  const CODE_KEY = 'wp_clearnumber_code';
  const PENDING_KEY = 'wp_clearnumber_pending';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readCode() {
    try {
      const hash = window.location.hash || '';
      const q = hash.indexOf('?');
      if (q !== -1) {
        const fromHash = new URLSearchParams(hash.slice(q + 1)).get('code');
        if (fromHash && fromHash.trim()) return fromHash.trim();
      }
      return sessionStorage.getItem(CODE_KEY) || '';
    } catch {
      return '';
    }
  }

  function explainRpc(error) {
    const msg = String((error && (error.message || error.details || error)) || '');
    const code = error && error.code;
    if (msg.includes('code_used')) return 'This import link was already used. In ClearNumber, choose Continue in Pul Planning again.';
    if (msg.includes('code_expired')) return 'This import link has expired. In ClearNumber, choose Continue in Pul Planning again.';
    if (msg.includes('code_not_found')) return 'This import link is not valid.';
    if (msg.includes('not_authenticated')) return 'Sign in to preview your workbook.';
    if (code === 'PGRST202' || /schema cache|could not find the function|does not exist|404/i.test(msg)) {
      return 'Import is not switched on yet. The ClearNumber handoff still needs to be applied in Supabase.';
    }
    return 'Could not load the workbook.';
  }

  function hasWork(plan) {
    if (!plan) return false;
    if (plan.profilePatch && Object.keys(plan.profilePatch).length) return true;
    const groups = plan.inserts || {};
    const lists = [groups.income, groups.expenses, groups.assets, groups.liabilities, groups.goals];
    if (lists.some(list => (list || []).some(item => item && !item.skip))) return true;
    if (plan.emergencyFund && !plan.emergencyFund.skip && plan.emergencyFund.action !== 'skip') return true;
    if (plan.fiLocal && plan.fiLocal.write) return true;
    return false;
  }

  function sameMonth(value, period) {
    return String(value || '').slice(0, 7) === String(period || '').slice(0, 7);
  }

  async function loadExisting(userId) {
    const period = WPUtils.currentPeriod();
    const [income, expenses, assets, liabilities, goals, emergency] = await Promise.all([
      WPDb.fetchAll('income_entries', { user_id: userId }),
      WPDb.fetchAll('expense_entries', { user_id: userId }),
      WPDb.fetchAll('assets', { user_id: userId }),
      WPDb.fetchAll('liabilities', { user_id: userId }),
      WPDb.fetchAll('financial_goals', { user_id: userId }),
      WPDb.fetchAll('emergency_fund', { user_id: userId }),
    ]);
    let fiSaved = false;
    try { fiSaved = !!localStorage.getItem('wp_fi_calc_' + userId); } catch { /* ignore */ }
    const ef = emergency && emergency[0] ? emergency[0] : null;
    return {
      period,
      existing: {
        profile: WPApp.state.profile || null,
        incomeNames: (income || []).filter(row => sameMonth(row.period_month, period)).map(row => row.source_name),
        expenses: (expenses || []).filter(row => sameMonth(row.expense_date, period)).map(row => ({
          category: row.category,
          description: row.description,
        })),
        assetNames: (assets || []).filter(row => sameMonth(row.period_month, period)).map(row => row.asset_name),
        liabilityNames: (liabilities || []).filter(row => sameMonth(row.period_month, period)).map(row => row.liability_name),
        goalNames: (goals || []).map(row => row.goal_name),
        emergencyFund: ef ? { id: ef.id, current_balance: ef.current_balance } : null,
        fiSaved,
      },
    };
  }

  async function writePlan(plan, userId) {
    if (plan.profilePatch && Object.keys(plan.profilePatch).length) {
      WPApp.state.profile = await WPDb.updateProfile(userId, plan.profilePatch);
      if (plan.profilePatch.currency) {
        const views = ['balance_sheet', 'dashboard', 'income', 'expenses', 'cashflow', 'debt', 'emergency', 'goals', 'reports'];
        views.forEach(view => {
          try { localStorage.setItem('wp_page_currency_' + view, plan.profilePatch.currency); } catch { /* ignore */ }
        });
      }
    }

    const groups = [
      ['income_entries', plan.inserts.income],
      ['expense_entries', plan.inserts.expenses],
      ['assets', plan.inserts.assets],
      ['liabilities', plan.inserts.liabilities],
      ['goals', plan.inserts.goals],
    ];
    for (const [table, items] of groups) {
      for (const item of items || []) {
        if (!item || item.skip || !item.row) continue;
        await WPDb.insert(table, Object.assign({ user_id: userId }, item.row));
      }
    }

    if (plan.emergencyFund && !plan.emergencyFund.skip && plan.emergencyFund.row) {
      if (plan.emergencyFund.action === 'insert') {
        await WPDb.insert('emergency_fund', Object.assign({ user_id: userId }, plan.emergencyFund.row));
      } else if (plan.emergencyFund.action === 'update' && plan.emergencyFund.id) {
        await WPDb.update('emergency_fund', plan.emergencyFund.id, plan.emergencyFund.row);
      }
    }

    if (plan.fiLocal && plan.fiLocal.write && plan.fiLocal.payload) {
      try {
        localStorage.setItem('wp_fi_calc_' + userId, JSON.stringify(plan.fiLocal.payload));
      } catch { /* ignore */ }
    }
  }

  function renderItems(title, items) {
    if (!items || !items.length) return '';
    return `<div class="card" style="margin-bottom:1rem;padding:1.1rem 1.25rem">
      <div class="section-title" style="margin-bottom:0.75rem">${esc(title)}</div>
      <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.75rem">
        ${items.map(item => `
          <li>
            <div class="fw-600">${esc(item.label)}</div>
            <div class="text-sm text-muted">${esc(item.detail)}</div>
            <div class="text-xs" style="margin-top:0.15rem;color:${item.skip ? 'var(--clr-gold, #E8B931)' : 'var(--clr-accent)'}">${item.skip ? esc(item.reason || 'Left unchanged') : 'Will add'}</div>
          </li>`).join('')}
      </ul>
    </div>`;
  }

  function renderGate(container) {
    const social = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandSocialHTML)
      ? APP_CONFIG.brandSocialHTML()
      : '';
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-brand">
          <div class="sidebar-logo">
            <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="64" height="56" />
            <div><div class="sidebar-logo-text">Pul Planning</div></div>
          </div>
          <div class="auth-brand-tagline">Your workbook is <span>ready</span></div>
          <p class="auth-brand-sub">Sign up or log in. Pul shows the ClearNumber numbers before anything is added. The link has no figures, and it works once.</p>
          ${social}
        </div>
        <div class="auth-form-pane">
          <div class="auth-form-inner">
            <h1 class="auth-form-title">Continue in Pul Planning</h1>
            <p class="auth-form-sub">Create an account or sign in. You will confirm the rows before they are saved.</p>
            <div class="flex gap-2" style="flex-wrap:wrap">
              <button type="button" class="btn btn-primary" id="import-signup">Create an account</button>
              <button type="button" class="btn btn-secondary" id="import-login">I already have an account</button>
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById('import-signup')?.addEventListener('click', () => WPRouter.navigate('/signup'));
    document.getElementById('import-login')?.addEventListener('click', () => WPRouter.navigate('/login'));
  }

  function renderMessage(container, title, message, actions) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">${esc(title)}</h1></div></div>
      <div class="page-body">
        <div class="card" style="padding:1.25rem;max-width:36rem">
          <p class="text-sm" style="margin:0 0 1rem">${esc(message)}</p>
          <div class="flex gap-2" style="flex-wrap:wrap">${actions || ''}</div>
        </div>
      </div>`;
  }

  function leaveWithoutImport() {
    if (typeof WPApp.clearClearNumberPending === 'function') WPApp.clearClearNumberPending();
    const done = !!(WPApp.state.profile && WPApp.state.profile.onboarding_done);
    WPRouter.navigate(done ? '/dashboard' : '/onboarding');
  }

  async function init(container) {
    if (typeof WPApp.captureClearNumberCode === 'function') WPApp.captureClearNumberCode();
    const code = readCode();
    const user = WPApp.state.user;

    if (!user) {
      if (!code) {
        container.innerHTML = `
          <div class="auth-shell">
            <div class="auth-form-pane" style="grid-column:1 / -1">
              <div class="auth-form-inner">
                <h1 class="auth-form-title">Import link missing</h1>
                <p class="auth-form-sub">Open Pul from ClearNumber with Continue in Pul Planning.</p>
                <button type="button" class="btn btn-primary" id="import-back-login">Sign in</button>
              </div>
            </div>
          </div>`;
        document.getElementById('import-back-login')?.addEventListener('click', () => WPRouter.navigate('/login'));
        return;
      }
      renderGate(container);
      return;
    }

    if (!code) {
      renderMessage(container, 'Import link missing', 'Open Pul from ClearNumber with Continue in Pul Planning.', `<button type="button" class="btn btn-primary" id="import-home">Go to dashboard</button>`);
      document.getElementById('import-home')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Add your ClearNumber workbook</h1>
        <p class="page-subtitle">Loading the preview…</p></div></div>
      <div class="page-body"><div class="card" style="padding:1.25rem"><div class="skeleton skeleton-text" style="width:240px"></div></div></div>`;

    let preview;
    try {
      preview = await WPDb.previewClearNumber(code);
    } catch (error) {
      renderMessage(container, 'Could not open this workbook', explainRpc(error), `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    const payload = preview && preview.payload ? preview.payload : null;
    if (!payload || typeof payload !== 'object') {
      renderMessage(container, 'Could not open this workbook', 'The workbook was empty.', `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    let context;
    try {
      context = await loadExisting(user.id);
    } catch (error) {
      renderMessage(container, 'Could not open this workbook', 'Your current plan could not be loaded.', `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      console.warn('[import] load existing', error);
      return;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const mapped = WPClearNumberMap.mapPayload(payload, {
      existing: context.existing,
      period: context.period,
      today,
    });

    if (mapped.error) {
      renderMessage(container, 'Could not open this workbook', mapped.error, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    const work = hasWork(mapped);
    const efLine = mapped.emergencyFund ? [mapped.emergencyFund] : [];
    const fiLine = mapped.fiLocal ? [mapped.fiLocal] : [];
    const warningBlock = mapped.warnings && mapped.warnings.length
      ? `<div class="card" style="margin-bottom:1rem;padding:1rem 1.25rem"><div class="section-title" style="margin-bottom:0.5rem">Notes</div><ul style="margin:0;padding-left:1.1rem">${mapped.warnings.map(w => `<li class="text-sm text-muted">${esc(w)}</li>`).join('')}</ul></div>`
      : '';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">We found your ClearNumber workbook</h1>
          <p class="page-subtitle">Add it to your plan? Nothing is written until you confirm. Names you already have are left unchanged.</p>
        </div>
      </div>
      <div class="page-body" style="max-width:40rem">
        ${renderItems('Profile', mapped.profileLines)}
        ${renderItems('Income', mapped.inserts.income)}
        ${renderItems('Expenses', mapped.inserts.expenses)}
        ${renderItems('Assets', mapped.inserts.assets)}
        ${renderItems('Debts', mapped.inserts.liabilities)}
        ${renderItems('Goals', mapped.inserts.goals)}
        ${renderItems('Emergency fund', efLine)}
        ${renderItems('FI Calculator', fiLine)}
        ${warningBlock}
        <div id="import-error" class="text-sm" style="display:none;color:var(--clr-danger);margin-bottom:0.75rem"></div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${work
            ? '<button type="button" class="btn btn-primary" id="import-confirm">Add to my plan</button>'
            : '<button type="button" class="btn btn-primary" id="import-done">Go to dashboard</button>'}
          <button type="button" class="btn btn-secondary" id="import-cancel">Not now</button>
        </div>
      </div>`;

    document.getElementById('import-cancel')?.addEventListener('click', leaveWithoutImport);
    document.getElementById('import-done')?.addEventListener('click', leaveWithoutImport);

    let claimed = null;
    document.getElementById('import-confirm')?.addEventListener('click', async () => {
      const btn = document.getElementById('import-confirm');
      const errEl = document.getElementById('import-error');
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      if (errEl) errEl.style.display = 'none';
      try {
        if (!claimed) {
          const redeemed = await WPDb.redeemClearNumber(code);
          claimed = redeemed && redeemed.payload ? redeemed.payload : null;
          if (!claimed) throw new Error('Could not load the workbook.');
        }
        const fresh = await loadExisting(user.id);
        const nowClick = new Date();
        const todayClick = `${nowClick.getFullYear()}-${String(nowClick.getMonth() + 1).padStart(2, '0')}-${String(nowClick.getDate()).padStart(2, '0')}`;
        const next = WPClearNumberMap.mapPayload(claimed, {
          existing: fresh.existing,
          period: fresh.period,
          today: todayClick,
        });
        if (next.error) throw new Error(next.error);
        await writePlan(next, user.id);
        if (typeof WPApp.clearClearNumberPending === 'function') WPApp.clearClearNumberPending();
        WPToast.success('ClearNumber workbook added to your plan.');
        history.replaceState(null, '', '#/dashboard');
        await WPApp.boot();
      } catch (error) {
        console.warn('[import] confirm', error);
        if (errEl) {
          errEl.textContent = claimed
            ? 'Some rows could not be saved. Retry to add the ones still missing. The link itself is already used.'
            : explainRpc(error);
          errEl.style.display = 'block';
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = claimed ? 'Retry adding to my plan' : 'Add to my plan';
        }
      }
    });

  }

  function destroy() {}

  return { init, destroy };
})();
