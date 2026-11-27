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
  const RESULT_KEY = 'wp_clearnumber_result';
  const PULL_KEY = 'wp_clearnumber_pull';
  const FI_FIELDS = [
    'expenses', 'passive', 'dividends', 'rentals', 'pensions', 'otherPassive',
    'portfolio', 'returnRate', 'monthlySavings',
  ];

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
    const chunks = [];
    if (typeof error === 'string') chunks.push(error);
    else if (error && typeof error === 'object') {
      ['message', 'details', 'hint', 'code', 'error_description'].forEach(key => {
        if (error[key]) chunks.push(String(error[key]));
      });
    } else if (error != null) {
      chunks.push(String(error));
    }
    const msg = chunks.join(' ');
    const code = error && error.code;
    if (/code_used/i.test(msg)) {
      return {
        title: 'This link was already used',
        message: 'This import link was already used, so it cannot add the workbook again. In ClearNumber, choose Continue in Pul Planning to get a new link.',
        terminal: true,
      };
    }
    if (/code_expired/i.test(msg)) {
      return {
        title: 'This link has expired',
        message: 'This import link has expired. Links last 24 hours and work once. In ClearNumber, choose Continue in Pul Planning to get a new one.',
        terminal: true,
      };
    }
    if (/code_not_found/i.test(msg)) {
      return {
        title: 'This link is not valid',
        message: 'This import link is not valid. Open Pul from ClearNumber with Continue in Pul Planning.',
        terminal: true,
      };
    }
    if (/not_authenticated/i.test(msg)) {
      return {
        title: 'Sign in to continue',
        message: 'Sign in to preview your workbook.',
        terminal: true,
      };
    }
    if (/invalid_client_number/i.test(msg)) {
      return {
        title: 'Check the ClearNumber #',
        message: 'Enter a Client / Student ID like CN-K7M2P4QX. Spaces and extra hyphens are fine.',
        terminal: true,
      };
    }
    if (/client_number_taken/i.test(msg)) {
      return {
        title: 'This ClearNumber # is already linked',
        message: 'That ClearNumber # is already on another Pul account, so it stays with that account.',
        terminal: true,
      };
    }
    if (/client_number_not_found/i.test(msg)) {
      return {
        title: 'We do not have that ClearNumber # yet',
        message: 'That ClearNumber # is not in Pul yet. In ClearNumber, use the same Client / Student ID, then enter it here again.',
        terminal: true,
      };
    }
    if (/client_number_retired/i.test(msg)) {
      return {
        title: 'This ClearNumber # is no longer active',
        message: 'That ClearNumber # is no longer active. Use the Client / Student ID shown on your Pul profile.',
        terminal: true,
      };
    }
    if (code === 'PGRST202' || /schema cache|could not find the function|does not exist|404/i.test(msg)) {
      if (/link_clearnumber_client|lookup_client_number|client_number/i.test(msg)) {
        return {
          title: 'ClearNumber numbers are not switched on yet',
          message: 'Client / Student IDs are not switched on yet. The database update still needs to be applied in Supabase.',
          terminal: true,
        };
      }
      return {
        title: 'Import is not switched on yet',
        message: 'Import is not switched on yet. The ClearNumber handoff still needs to be applied in Supabase.',
        terminal: true,
      };
    }
    return {
      title: 'Could not open this workbook',
      message: 'Could not load the workbook. Please try the link again.',
      terminal: false,
    };
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

  function rowsToWrite(items, userId) {
    return (items || [])
      .filter(item => item && !item.skip && item.row)
      .map(item => Object.assign({ user_id: userId }, item.row));
  }

  function countAdded(list) {
    return rowsToWrite(list, '').length;
  }

  /**
   * Merge workbook FI inputs into the calculator key. Known inputs are
   * replaced. Any other property already stored on that key, and every
   * other localStorage key, is left alone.
   */
  function applyImportedFi(userId, payload) {
    if (!userId || !payload || typeof payload !== 'object') return null;
    const key = 'wp_fi_calc_' + userId;
    let prev = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) prev = parsed;
      }
    } catch { prev = {}; }
    const next = Object.assign({}, prev);
    FI_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) next[field] = payload[field];
    });
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch { return null; }
    return next;
  }

  /**
   * One request per table, all tables in flight together.
   * The old path awaited every row, so a full workbook (about 15 rows)
   * sat on "Adding…" for one network round trip per row.
   * RLS is unchanged: each request still uses the signed-in user's JWT.
   */
  async function writePlan(plan, userId) {
    const tasks = [];
    const inserts = (plan && plan.inserts) || {};

    if (plan.profilePatch && Object.keys(plan.profilePatch).length) {
      tasks.push((async () => {
        WPApp.state.profile = await WPDb.updateProfile(userId, plan.profilePatch);
        if (plan.profilePatch.currency) {
          const views = ['balance_sheet', 'dashboard', 'income', 'expenses', 'cashflow', 'debt', 'emergency', 'goals', 'reports'];
          views.forEach(view => {
            try { localStorage.setItem('wp_page_currency_' + view, plan.profilePatch.currency); } catch { /* ignore */ }
          });
        }
      })());
    }

    const writeRows = (table, rows) => {
      if (typeof WPDb.insertMany === 'function') return WPDb.insertMany(table, rows);
      return Promise.all(rows.map(row => WPDb.insert(table, row)));
    };

    const groups = [
      ['income_entries', inserts.income],
      ['expense_entries', inserts.expenses],
      ['assets', inserts.assets],
      ['liabilities', inserts.liabilities],
      ['goals', inserts.goals],
    ];
    for (const [table, items] of groups) {
      const rows = rowsToWrite(items, userId);
      if (rows.length) tasks.push(writeRows(table, rows));
    }

    const ef = plan.emergencyFund;
    if (ef && !ef.skip && ef.row) {
      if (ef.action === 'insert') {
        tasks.push(writeRows('emergency_fund', [Object.assign({ user_id: userId }, ef.row)]));
      } else if (ef.action === 'update' && ef.id) {
        tasks.push(WPDb.update('emergency_fund', ef.id, ef.row));
      }
    }

    await Promise.all(tasks);

    if (plan.fiLocal && plan.fiLocal.write && plan.fiLocal.payload) {
      applyImportedFi(userId, plan.fiLocal.payload);
    }
  }

  function successMessage(plan) {
    const inserts = (plan && plan.inserts) || {};
    const parts = [];
    const add = (n, singular, plural) => {
      if (!n) return;
      parts.push(n + ' ' + (n === 1 ? singular : plural));
    };
    add(countAdded(inserts.assets), 'asset', 'assets');
    add(countAdded(inserts.liabilities), 'debt', 'debts');
    add(countAdded(inserts.goals), 'goal', 'goals');
    add(countAdded(inserts.income), 'income entry', 'income entries');
    add(countAdded(inserts.expenses), 'expense', 'expenses');
    const ef = plan && plan.emergencyFund;
    if (ef && !ef.skip && ef.row && ef.action !== 'skip') parts.push('emergency fund');
    const fi = !!(plan && plan.fiLocal && plan.fiLocal.write && plan.fiLocal.payload);
    if (!parts.length && !fi) {
      return 'Your ClearNumber numbers are in. Nothing new was added, because those rows were already in your plan.';
    }
    if (!parts.length) return 'Your ClearNumber numbers are in: FI Calculator updated.';
    const base = 'Your ClearNumber numbers are in: ' + parts.join(', ') + ' added.';
    return fi ? base + ' FI Calculator updated.' : base;
  }

  function rememberSuccess(message, extra) {
    try {
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(Object.assign({
        message: String(message || ''),
      }, extra || {})));
    } catch { /* ignore */ }
  }

  function landAfterImport(message, options) {
    const fi = !!(options && options.fi);
    rememberSuccess(message, { fi });
    if (typeof WPApp !== 'undefined' && typeof WPApp.clearClearNumberPending === 'function') {
      WPApp.clearClearNumberPending();
    }
    const routerReady = typeof WPRouter !== 'undefined'
      && typeof WPRouter.navigate === 'function'
      && (typeof WPRouter.hasRoute !== 'function' || WPRouter.hasRoute('/dashboard'));
    if (routerReady) WPRouter.navigate('/dashboard', true);
    if (typeof WPToast !== 'undefined' && typeof WPToast.success === 'function') {
      WPToast.success(message, 8000);
    }
    return { message, landed: !!routerReady, fi };
  }

  function mountSuccessBanner(host) {
    if (!host || typeof document === 'undefined') return false;
    let raw = null;
    try { raw = sessionStorage.getItem(RESULT_KEY); } catch { return false; }
    if (!raw) return false;
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { return false; }
    const message = parsed && parsed.message ? String(parsed.message) : '';
    if (!message) return false;

    host.innerHTML = '';
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.setAttribute('data-import-success', '1');
    alert.style.alignItems = 'center';
    alert.style.justifyContent = 'space-between';
    alert.style.flexWrap = 'wrap';
    alert.style.gap = '0.75rem';

    const text = document.createElement('div');
    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.textContent = message;
    const sub = document.createElement('div');
    sub.className = 'text-xs';
    sub.style.marginTop = '0.25rem';
    sub.textContent = parsed.fi
      ? 'The FI Calculator now uses these numbers. Other saved items on this device were left alone.'
      : 'Other saved items on this device were left alone.';
    text.appendChild(title);
    text.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'flex gap-2';
    actions.style.flexWrap = 'wrap';

    if (parsed.fi) {
      const fiBtn = document.createElement('button');
      fiBtn.type = 'button';
      fiBtn.className = 'btn btn-secondary btn-sm';
      fiBtn.textContent = 'Open FI Calculator';
      fiBtn.addEventListener('click', () => {
        if (typeof WPRouter !== 'undefined' && WPRouter.navigate) WPRouter.navigate('/fi');
      });
      actions.appendChild(fiBtn);
    }

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-primary btn-sm';
    ok.textContent = 'OK';
    ok.addEventListener('click', () => {
      try { sessionStorage.removeItem(RESULT_KEY); } catch { /* ignore */ }
      host.innerHTML = '';
    });
    actions.appendChild(ok);
    alert.appendChild(text);
    alert.appendChild(actions);
    host.appendChild(alert);
    return true;
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
    clearPull();
    if (typeof WPApp.clearClearNumberPending === 'function') WPApp.clearClearNumberPending();
    const done = !!(WPApp.state.profile && WPApp.state.profile.onboarding_done);
    WPRouter.navigate(done ? '/dashboard' : '/onboarding');
  }

  function clearPull() {
    try { sessionStorage.removeItem(PULL_KEY); } catch { /* ignore */ }
  }

  function storePull(linked) {
    try {
      sessionStorage.setItem(PULL_KEY, JSON.stringify({
        client_number: linked && linked.client_number,
        payload: linked && linked.payload,
        recognized: !!(linked && linked.recognized),
      }));
    } catch { /* ignore */ }
  }

  function readStoredPull() {
    try {
      const raw = sessionStorage.getItem(PULL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.payload || typeof parsed.payload !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function normalizedClientNumber(value) {
    if (typeof WPClearNumberMap === 'undefined' || typeof WPClearNumberMap.normalizeClientNumber !== 'function') {
      return null;
    }
    return WPClearNumberMap.normalizeClientNumber(value);
  }

  function rememberProfileNumber(linked) {
    const number = linked && (linked.canonical_client_number || linked.client_number);
    if (!number || typeof WPApp === 'undefined' || !WPApp.state) return;
    if (!WPApp.state.profile) WPApp.state.profile = {};
    WPApp.state.profile.client_number = number;
  }

  /**
   * Code imports still redeem the one-time handoff. A Client / Student ID
   * pull already holds the workbook, so it must not consume a handoff code.
   */
  async function claimPayload(mode, code, fallbackPayload) {
    if (mode === 'client') return fallbackPayload || null;
    const redeemed = await WPDb.redeemClearNumber(code);
    return redeemed && redeemed.payload ? redeemed.payload : null;
  }

  async function associatePayloadClientNumber(payload) {
    if (typeof WPClearNumberMap === 'undefined' || typeof WPClearNumberMap.clientNumberFromPayload !== 'function') return null;
    if (typeof WPDb === 'undefined' || typeof WPDb.linkClearNumberClient !== 'function') return null;
    const number = WPClearNumberMap.clientNumberFromPayload(payload);
    if (!number) return null;
    const current = WPApp.state && WPApp.state.profile && WPApp.state.profile.client_number;
    if (normalizedClientNumber(current) === number) {
      return { client_number: number, recognized: true, linked: true };
    }
    try {
      const linked = await WPDb.linkClearNumberClient(number);
      rememberProfileNumber(linked);
      return linked;
    } catch (error) {
      const explained = explainRpc(error);
      if (/already linked/i.test(explained.title)) return { warning: explained.message };
      // Missing number or the id functions are not applied yet.
      // The one-time workbook import still proceeds.
      return null;
    }
  }

  function copyClientNumber(value, button) {
    const fallback = () => {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', 'readonly');
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      field.remove();
    };
    const write = () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(value).catch(() => { fallback(); });
      }
      fallback();
      return Promise.resolve();
    };
    write().then(() => {
      if (typeof WPToast !== 'undefined' && WPToast.success) WPToast.success('Client / Student ID copied.');
      if (!button) return;
      const previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = previous; }, 1500);
    }).catch(() => {
      if (typeof WPToast !== 'undefined' && WPToast.error) WPToast.error('Could not copy that number.');
    });
  }

  /**
   * Profile card, onboarding, and the import page share this block:
   * the stable id, a copy button, and "Input your ClearNumber # here".
   */
  function mountClearNumberEntry(host, options) {
    const opts = options || {};
    if (!host) return;
    const profile = (typeof WPApp !== 'undefined' && WPApp.state && WPApp.state.profile) || {};
    const current = normalizedClientNumber(profile.client_number) || '';

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.setAttribute('data-client-number-panel', '1');

    if (opts.showId !== false) {
      const label = document.createElement('div');
      label.className = 'text-sm';
      label.style.fontWeight = '700';
      label.style.marginBottom = '0.35rem';
      label.textContent = 'Client / Student ID';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '0.6rem';
      row.style.flexWrap = 'wrap';

      const value = document.createElement('code');
      value.setAttribute('data-client-number-value', '1');
      value.style.fontSize = '1.15rem';
      value.style.letterSpacing = '0.04em';
      value.style.fontWeight = '700';
      value.textContent = current || 'Not assigned yet';

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn btn-secondary btn-sm';
      copy.setAttribute('data-client-copy', '1');
      copy.textContent = 'Copy';
      copy.disabled = !current;
      copy.addEventListener('click', () => {
        const live = (wrap.querySelector('[data-client-number-value]') || {}).textContent || '';
        const normalized = normalizedClientNumber(live);
        if (normalized) copyClientNumber(normalized, copy);
      });

      row.appendChild(value);
      row.appendChild(copy);

      const note = document.createElement('p');
      note.className = 'input-hint';
      note.style.margin = '0.45rem 0 0.9rem';
      note.textContent = 'This same number works on both Pul Planning and ClearNumber.';

      wrap.appendChild(label);
      wrap.appendChild(row);
      wrap.appendChild(note);
    }

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn btn-secondary';
    open.textContent = 'Input your ClearNumber # here';
    open.setAttribute('data-clearnumber-entry', '1');

    const form = document.createElement('form');
    form.setAttribute('data-clearnumber-form', '1');
    form.style.display = 'none';
    form.style.marginTop = '0.75rem';

    const input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = 'CN-K7M2P4QX';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', 'ClearNumber number');
    input.style.marginBottom = '0.65rem';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    submit.textContent = 'Pull into Pul Planning';

    const err = document.createElement('div');
    err.className = 'text-sm';
    err.style.marginTop = '0.65rem';
    err.style.display = 'none';

    form.appendChild(input);
    form.appendChild(submit);
    form.appendChild(err);

    open.addEventListener('click', () => {
      form.style.display = 'block';
      open.style.display = 'none';
      try { input.focus(); } catch { /* ignore */ }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      err.style.display = 'none';
      const normalized = normalizedClientNumber(input.value);
      if (!normalized) {
        const explained = explainRpc({ message: 'invalid_client_number' });
        err.style.color = 'var(--clr-danger)';
        err.textContent = explained.message;
        err.style.display = 'block';
        return;
      }
      submit.disabled = true;
      const previous = submit.textContent;
      submit.textContent = 'Pulling…';
      try {
        const linked = await WPDb.linkClearNumberClient(normalized);
        rememberProfileNumber(linked);
        const shown = wrap.querySelector('[data-client-number-value]');
        if (shown) shown.textContent = (linked && linked.client_number) || normalized;
        const copyBtn = wrap.querySelector('[data-client-copy]');
        if (copyBtn) copyBtn.disabled = false;
        if (typeof opts.onLinked === 'function') opts.onLinked(linked);
        if (linked && linked.payload) {
          storePull(linked);
          if (opts.stay && typeof opts.onPayload === 'function') {
            opts.onPayload(linked);
            return;
          }
          if (typeof WPRouter !== 'undefined' && WPRouter.navigate) WPRouter.navigate('/import');
          return;
        }
        err.style.color = 'var(--clr-accent)';
        err.textContent = linked && linked.recognized
          ? 'This ClearNumber # is already on your Pul profile.'
          : 'This ClearNumber # is now on your Pul profile. No workbook is stored for it yet.';
        err.style.display = 'block';
      } catch (error) {
        const explained = explainRpc(error);
        err.style.color = 'var(--clr-danger)';
        err.textContent = explained.message;
        err.style.display = 'block';
      } finally {
        submit.disabled = false;
        submit.textContent = previous;
      }
    });

    wrap.appendChild(open);
    wrap.appendChild(form);
    host.appendChild(wrap);
  }

  function renderPullLanding(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Link ClearNumber</h1>
          <p class="page-subtitle">Enter the Client / Student ID from ClearNumber. Pul shows the workbook before anything is added.</p>
        </div>
      </div>
      <div class="page-body" style="max-width:40rem">
        <div class="card" style="padding:1.25rem" id="import-client-number"></div>
      </div>`;
    mountClearNumberEntry(document.getElementById('import-client-number'), {
      stay: true,
      onPayload(linked) {
        presentWorkbook(container, linked.payload, {
          mode: 'client',
          clientNumber: linked.client_number,
        });
      },
    });
  }

  function presentWorkbook(container, payload, options) {
    const opts = options || {};
    const mode = opts.mode === 'client' ? 'client' : 'code';
    const code = opts.code || '';
    const user = WPApp.state.user;

    const fail = (title, message) => {
      renderMessage(container, title, message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
    };

    return loadExisting(user.id).then((context) => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const mapped = WPClearNumberMap.mapPayload(payload, {
        existing: context.existing,
        period: context.period,
        today,
      });
      if (mapped.error) {
        fail('Could not open this workbook', mapped.error);
        return;
      }

      const work = hasWork(mapped);
      const efLine = mapped.emergencyFund ? [mapped.emergencyFund] : [];
      const fiLine = mapped.fiLocal ? [mapped.fiLocal] : [];
      const warningBlock = mapped.warnings && mapped.warnings.length
        ? `<div class="card" style="margin-bottom:1rem;padding:1rem 1.25rem"><div class="section-title" style="margin-bottom:0.5rem">Notes</div><ul style="margin:0;padding-left:1.1rem">${mapped.warnings.map(w => `<li class="text-sm text-muted">${esc(w)}</li>`).join('')}</ul></div>`
        : '';
      const subtitle = mode === 'client'
        ? 'This ClearNumber # is on your Pul profile. Add the workbook to your plan? Nothing else is written until you confirm.'
        : 'Add it to your plan? Nothing is written until you confirm. Names you already have are left unchanged.';

      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">We found your ClearNumber workbook</h1>
            <p class="page-subtitle">${esc(subtitle)}</p>
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
          <div class="card" style="padding:1.25rem;margin-top:1.5rem" id="import-client-number"></div>
        </div>`;

      mountClearNumberEntry(document.getElementById('import-client-number'), {
        stay: true,
        onPayload(linked) {
          presentWorkbook(container, linked.payload, {
            mode: 'client',
            clientNumber: linked.client_number,
          });
        },
      });

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
            claimed = await claimPayload(mode, code, payload);
            if (!claimed) throw new Error('Could not load the workbook.');
          }
          const linkedId = await associatePayloadClientNumber(claimed);
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
          clearPull();
          const message = successMessage(next) + (linkedId && linkedId.warning ? ' ' + linkedId.warning : '');
          const fi = !!(next.fiLocal && next.fiLocal.write && next.fiLocal.payload);
          const landed = landAfterImport(message, { fi });
          if (!landed.landed) {
            renderMessage(
              container,
              'Your ClearNumber numbers are in',
              message,
              `<button type="button" class="btn btn-primary" id="import-home">Go to dashboard</button>`
            );
            document.getElementById('import-home')?.addEventListener('click', leaveWithoutImport);
          }
        } catch (error) {
          console.warn('[import] confirm', error);
          const explained = explainRpc(error);
          if (!claimed && explained.terminal) {
            renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
            document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
            return;
          }
          if (errEl) {
            errEl.textContent = claimed
              ? (mode === 'client'
                ? 'Some rows could not be saved. Retry to add the ones still missing.'
                : 'Some rows could not be saved. Retry to add the ones still missing. The link itself is already used.')
              : explained.message;
            errEl.style.display = 'block';
          }
          if (btn) {
            btn.disabled = false;
            btn.textContent = claimed ? 'Retry adding to my plan' : 'Add to my plan';
          }
        }
      });
    }).catch((error) => {
      console.warn('[import] load existing', error);
      fail('Could not open this workbook', 'Your current plan could not be loaded.');
    });
  }

  async function pullByClientNumber(container, clientNumber) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Link ClearNumber</h1>
        <p class="page-subtitle">Looking up ${esc(clientNumber)}…</p></div></div>
      <div class="page-body"><div class="card" style="padding:1.25rem"><div class="skeleton skeleton-text" style="width:240px"></div></div></div>`;
    try {
      const linked = await WPDb.linkClearNumberClient(clientNumber);
      rememberProfileNumber(linked);
      if (linked && linked.payload) {
        storePull(linked);
        await presentWorkbook(container, linked.payload, {
          mode: 'client',
          clientNumber: linked.client_number || clientNumber,
        });
        return;
      }
      renderMessage(
        container,
        'ClearNumber # linked',
        linked && linked.recognized
          ? 'This ClearNumber # is already on your Pul profile. No workbook is stored for it yet.'
          : 'This ClearNumber # is now on your Pul profile. No workbook is stored for it yet.',
        `<button type="button" class="btn btn-primary" id="import-home">Go to dashboard</button>`
      );
      document.getElementById('import-home')?.addEventListener('click', leaveWithoutImport);
    } catch (error) {
      const explained = explainRpc(error);
      renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '1.25rem';
      card.style.marginTop = '1rem';
      card.style.maxWidth = '40rem';
      const body = container.querySelector('.page-body');
      if (body) {
        body.appendChild(card);
        mountClearNumberEntry(card, {
          showId: false,
          stay: true,
          onPayload(linked) {
            presentWorkbook(container, linked.payload, {
              mode: 'client',
              clientNumber: linked.client_number,
            });
          },
        });
      }
    }
  }

  async function init(container) {
    if (typeof WPApp.captureClearNumberCode === 'function') WPApp.captureClearNumberCode();
    const code = readCode();
    const user = WPApp.state.user;
    const clientNumber = normalizedClientNumber(code);

    if (!user) {
      if (!code) {
        container.innerHTML = `
          <div class="auth-shell">
            <div class="auth-form-pane" style="grid-column:1 / -1">
              <div class="auth-form-inner">
                <h1 class="auth-form-title">Import link missing</h1>
                <p class="auth-form-sub">Open Pul from ClearNumber with Continue in Pul Planning, or sign in and enter your ClearNumber #.</p>
                <div class="flex gap-2" style="flex-wrap:wrap">
                  <button type="button" class="btn btn-primary" id="import-back-login">Sign in</button>
                  <button type="button" class="btn btn-secondary" id="import-enter-client-number">Input your ClearNumber # here</button>
                </div>
              </div>
            </div>
          </div>`;
        const openEntry = () => {
          if (typeof WPApp.requestClearNumberEntry === 'function') WPApp.requestClearNumberEntry();
          WPRouter.navigate('/login');
        };
        document.getElementById('import-back-login')?.addEventListener('click', () => WPRouter.navigate('/login'));
        document.getElementById('import-enter-client-number')?.addEventListener('click', openEntry);
        return;
      }
      renderGate(container);
      return;
    }

    if (clientNumber) {
      await pullByClientNumber(container, clientNumber);
      return;
    }

    if (!code) {
      const stored = readStoredPull();
      if (stored && stored.payload) {
        await presentWorkbook(container, stored.payload, {
          mode: 'client',
          clientNumber: stored.client_number,
        });
        return;
      }
      renderPullLanding(container);
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
      const explained = explainRpc(error);
      renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    const payload = preview && preview.payload ? preview.payload : null;
    if (!payload || typeof payload !== 'object') {
      renderMessage(container, 'Could not open this workbook', 'The workbook was empty.', `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    await presentWorkbook(container, payload, { mode: 'code', code });
  }

  function destroy() {}

  return {
    init,
    destroy,
    explainRpc,
    successMessage,
    writePlan,
    applyImportedFi,
    landAfterImport,
    mountSuccessBanner,
    mountClearNumberEntry,
    claimPayload,
    RESULT_KEY,
    PULL_KEY,
  };
})();
