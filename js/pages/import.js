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
    if (/invalid_number/i.test(msg)) {
      return {
        title: 'Check the ClearNumber #',
        message: 'Enter a Client / Student ID like CN-K7M2PQ. This is the ClearNumber #, not the one-time import link.',
        terminal: true,
      };
    }
    if (/number_not_found/i.test(msg)) {
      return {
        title: 'No workbook for that number',
        message: 'No ClearNumber workbook is stored for that number yet. Check the ID, or save the workbook to this number in ClearNumber first.',
        terminal: true,
      };
    }
    if (/number_in_use/i.test(msg)) {
      return {
        title: 'That number is already linked',
        message: 'That ClearNumber # is already linked to another Pul Planning profile.',
        terminal: true,
      };
    }
    if (/number_already_set/i.test(msg)) {
      const already = (typeof WPClearNumberId !== 'undefined' && error && error.details)
        ? (WPClearNumberId.canonical(error.details) || '')
        : '';
      return {
        title: 'You already have a ClearNumber #',
        message: already
          ? 'Your Client / Student ID is already ' + already + '. This same number works on Pul Planning and ClearNumber.'
          : 'Your profile already has a ClearNumber #, so this one was not linked.',
        terminal: true,
      };
    }
    if (/pull_clearnumber_number|ensure_my_client_number|register_clearnumber_record|lookup_client_number/i.test(msg)
      && (code === 'PGRST202' || /schema cache|could not find the function|does not exist/i.test(msg))) {
      return {
        title: 'ClearNumber numbers are not switched on yet',
        message: 'Client / Student IDs are not switched on yet. The database update still needs to be applied in Supabase.',
        terminal: true,
      };
    }
    if (code === 'PGRST202' || /schema cache|could not find the function|does not exist|404/i.test(msg)) {
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
    if (options && options.clearNumber) {
      try {
        sessionStorage.removeItem('wp_clearnumber_number');
        sessionStorage.removeItem('wp_clearnumber_number_pending');
      } catch { /* ignore */ }
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

  function renderMessage(container, title, message, actions, withEntry) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">${esc(title)}</h1></div></div>
      <div class="page-body">
        <div class="card" style="padding:1.25rem;max-width:36rem">
          <p class="text-sm" style="margin:0 0 1rem">${esc(message)}</p>
          <div class="flex gap-2" style="flex-wrap:wrap">${actions || ''}</div>
          ${withEntry ? '<div id="import-cn-entry" style="margin-top:1.25rem"></div>' : ''}
        </div>
      </div>`;
    if (withEntry) mountNumberEntry(container, '');
  }

  function leaveWithoutImport(options) {
    if (typeof WPApp.clearClearNumberPending === 'function') WPApp.clearClearNumberPending();
    if (options && options.clearNumber) {
      try {
        sessionStorage.removeItem('wp_clearnumber_number');
        sessionStorage.removeItem('wp_clearnumber_number_pending');
      } catch { /* ignore */ }
    }
    const done = !!(WPApp.state.profile && WPApp.state.profile.onboarding_done);
    WPRouter.navigate(done ? '/dashboard' : '/onboarding');
  }

  function mountNumberEntry(container, value) {
    const host = container && container.querySelector ? container.querySelector('#import-cn-entry') : null;
    if (!host || typeof WPClearNumberId === 'undefined' || typeof WPClearNumberId.mountPullForm !== 'function') return;
    WPClearNumberId.mountPullForm(host, value ? { value: value } : undefined);
  }

  function renderNumberLanding(container, signedIn) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Link ClearNumber</h1>
          <p class="page-subtitle">Enter your ClearNumber #, or open Pul from ClearNumber with Continue in Pul Planning.</p>
        </div>
      </div>
      <div class="page-body" style="max-width:40rem">
        <div class="card" style="padding:1.25rem;margin-bottom:1rem">
          <div id="import-cn-entry"></div>
        </div>
        ${signedIn ? '' : `
          <div class="flex gap-2" style="flex-wrap:wrap">
            <button type="button" class="btn btn-secondary" id="import-signup">Create an account</button>
            <button type="button" class="btn btn-secondary" id="import-login">Sign in</button>
          </div>`}
      </div>`;
    document.getElementById('import-signup')?.addEventListener('click', () => WPRouter.navigate('/signup'));
    document.getElementById('import-login')?.addEventListener('click', () => WPRouter.navigate('/login'));
    mountNumberEntry(container, '');
  }

  function makeCodeAcquirer(code) {
    let claimed = null;
    return async function acquireCode() {
      if (claimed) return claimed;
      const redeemed = await WPDb.redeemClearNumber(code);
      claimed = redeemed && redeemed.payload ? redeemed.payload : null;
      if (!claimed) throw new Error('Could not load the workbook.');
      return claimed;
    };
  }

  function makeNumberAcquirer(number) {
    let claimed = null;
    return async function acquireNumber() {
      if (claimed) return claimed;
      const pulled = await WPDb.pullClearNumber(number);
      if (typeof WPClearNumberId !== 'undefined' && typeof WPClearNumberId.adoptProfile === 'function') {
        WPClearNumberId.adoptProfile(pulled);
      }
      claimed = pulled && pulled.payload ? pulled.payload : null;
      if (!claimed) throw new Error('Could not load the workbook.');
      return claimed;
    };
  }

  async function confirmMappedPlan(payload, userId) {
    const fresh = await loadExisting(userId);
    const nowClick = new Date();
    const todayClick = `${nowClick.getFullYear()}-${String(nowClick.getMonth() + 1).padStart(2, '0')}-${String(nowClick.getDate()).padStart(2, '0')}`;
    const next = WPClearNumberMap.mapPayload(payload, {
      existing: fresh.existing,
      period: fresh.period,
      today: todayClick,
    });
    if (next.error) throw new Error(next.error);
    await writePlan(next, userId);
    const message = successMessage(next);
    const fi = !!(next.fiLocal && next.fiLocal.write && next.fiLocal.payload);
    const landed = landAfterImport(message, { fi, clearNumber: true });
    return { next, message, fi, landed };
  }

  function renderWorkbook(container, mapped, options) {
    const opts = options || {};
    const work = hasWork(mapped);
    const efLine = mapped.emergencyFund ? [mapped.emergencyFund] : [];
    const fiLine = mapped.fiLocal ? [mapped.fiLocal] : [];
    const warningBlock = mapped.warnings && mapped.warnings.length
      ? `<div class="card" style="margin-bottom:1rem;padding:1rem 1.25rem"><div class="section-title" style="margin-bottom:0.5rem">Notes</div><ul style="margin:0;padding-left:1.1rem">${mapped.warnings.map(w => `<li class="text-sm text-muted">${esc(w)}</li>`).join('')}</ul></div>`
      : '';
    const onLeave = () => leaveWithoutImport(opts.clearNumberOnLeave ? { clearNumber: true } : undefined);

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

    document.getElementById('import-cancel')?.addEventListener('click', onLeave);
    document.getElementById('import-done')?.addEventListener('click', onLeave);

    let claimed = null;
    document.getElementById('import-confirm')?.addEventListener('click', async () => {
      const btn = document.getElementById('import-confirm');
      const errEl = document.getElementById('import-error');
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      if (errEl) errEl.style.display = 'none';
      try {
        if (!claimed) {
          claimed = await opts.acquire();
          if (!claimed) throw new Error('Could not load the workbook.');
        }
        const confirmed = await confirmMappedPlan(claimed, opts.userId);
        if (!confirmed.landed.landed) {
          renderMessage(
            container,
            'Your ClearNumber numbers are in',
            confirmed.message,
            `<button type="button" class="btn btn-primary" id="import-home">Go to dashboard</button>`
          );
          document.getElementById('import-home')?.addEventListener('click', onLeave);
        }
      } catch (error) {
        console.warn('[import] confirm', error);
        const explained = explainRpc(error);
        if (!claimed && explained.terminal) {
          renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
          document.getElementById('import-dismiss')?.addEventListener('click', onLeave);
          return;
        }
        if (errEl) {
          errEl.textContent = claimed
            ? (opts.consumed
              ? 'Some rows could not be saved. Retry to add the ones still missing. The link itself is already used.'
              : 'Some rows could not be saved. Retry to add the ones still missing.')
            : explained.message;
          errEl.style.display = 'block';
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = claimed ? 'Retry adding to my plan' : 'Add to my plan';
        }
      }
    });
  }

  async function mapAndShow(container, user, payload, workbookOptions) {
    let context;
    try {
      context = await loadExisting(user.id);
    } catch (error) {
      renderMessage(container, 'Could not open this workbook', 'Your current plan could not be loaded.', `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
      document.getElementById('import-dismiss')?.addEventListener('click', () => leaveWithoutImport(workbookOptions && workbookOptions.clearNumberOnLeave ? { clearNumber: true } : undefined));
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
      renderMessage(container, 'Could not open this workbook', mapped.error, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
      document.getElementById('import-dismiss')?.addEventListener('click', () => leaveWithoutImport(workbookOptions && workbookOptions.clearNumberOnLeave ? { clearNumber: true } : undefined));
      return;
    }

    renderWorkbook(container, mapped, Object.assign({ userId: user.id }, workbookOptions || {}));
  }

  function loadingWorkbook(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Add your ClearNumber workbook</h1>
        <p class="page-subtitle">Loading the preview…</p></div></div>
      <div class="page-body"><div class="card" style="padding:1.25rem"><div class="skeleton skeleton-text" style="width:240px"></div></div></div>`;
  }

  async function openStoredNumber(container, user, number) {
    loadingWorkbook(container);
    let pulled;
    try {
      pulled = await WPDb.pullClearNumber(number);
    } catch (error) {
      try {
        sessionStorage.removeItem('wp_clearnumber_number');
        sessionStorage.removeItem('wp_clearnumber_number_pending');
      } catch { /* ignore */ }
      const explained = explainRpc(error);
      renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
      document.getElementById('import-dismiss')?.addEventListener('click', () => leaveWithoutImport({ clearNumber: true }));
      const input = document.getElementById('cn-number-input');
      if (input) input.value = number;
      return;
    }

    if (typeof WPClearNumberId !== 'undefined' && typeof WPClearNumberId.adoptProfile === 'function') {
      WPClearNumberId.adoptProfile(pulled);
    }
    const payload = pulled && pulled.payload ? pulled.payload : null;
    if (!payload) {
      try {
        sessionStorage.removeItem('wp_clearnumber_number');
        sessionStorage.removeItem('wp_clearnumber_number_pending');
      } catch { /* ignore */ }
      const formatted = (pulled && pulled.client_number) || number;
      const message = (typeof WPClearNumberId !== 'undefined' && WPClearNumberId.recognitionMessage)
        ? WPClearNumberId.recognitionMessage(pulled || { client_number: formatted, status: 'already_linked', has_workbook: false })
        : formatted + ' is your Client / Student ID. This same number works on Pul Planning and ClearNumber.';
      renderMessage(container, 'ClearNumber # recognised', message, `<button type="button" class="btn btn-primary" id="import-home">Go to dashboard</button>`, true);
      document.getElementById('import-home')?.addEventListener('click', () => leaveWithoutImport({ clearNumber: true }));
      const input = document.getElementById('cn-number-input');
      if (input) input.value = formatted;
      return;
    }

    await mapAndShow(container, user, payload, {
      acquire: makeNumberAcquirer(number),
      consumed: false,
      clearNumberOnLeave: true,
    });
  }

  async function init(container) {
    if (typeof WPApp.captureClearNumberCode === 'function') WPApp.captureClearNumberCode();
    if (typeof WPClearNumberId !== 'undefined' && typeof WPClearNumberId.captureFromHash === 'function') {
      WPClearNumberId.captureFromHash();
    }
    const code = readCode();
    const user = WPApp.state.user;

    if (!user) {
      if (!code) {
        renderNumberLanding(container, false);
        return;
      }
      renderGate(container);
      return;
    }

    if (!code) {
      const number = (typeof WPClearNumberId !== 'undefined' && typeof WPClearNumberId.readStoredNumber === 'function')
        ? WPClearNumberId.readStoredNumber()
        : '';
      if (number) {
        if (typeof WPClearNumberId.clearPending === 'function') WPClearNumberId.clearPending();
        await openStoredNumber(container, user, number);
        return;
      }
      renderNumberLanding(container, true);
      return;
    }

    loadingWorkbook(container);

    let preview;
    try {
      preview = await WPDb.previewClearNumber(code);
    } catch (error) {
      const explained = explainRpc(error);
      renderMessage(container, explained.title, explained.message, `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    const payload = preview && preview.payload ? preview.payload : null;
    if (!payload || typeof payload !== 'object') {
      renderMessage(container, 'Could not open this workbook', 'The workbook was empty.', `<button type="button" class="btn btn-secondary" id="import-dismiss">Not now</button>`, true);
      document.getElementById('import-dismiss')?.addEventListener('click', leaveWithoutImport);
      return;
    }

    await mapAndShow(container, user, payload, {
      acquire: makeCodeAcquirer(code),
      consumed: true,
    });
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
    confirmMappedPlan,
    makeCodeAcquirer,
    makeNumberAcquirer,
    renderWorkbook,
    renderNumberLanding,
    mapAndShow,
    openStoredNumber,
    RESULT_KEY,
  };
})();
