/**
 * ClearNumber import polish: confirmation copy, expired/used errors,
 * batched writes, and FI calculator local storage.
 * Loads the browser scripts in a sandbox, same as clearnumber-map.test.js.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');

function memoryStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); },
    key(index) { return Array.from(data.keys())[index] || null; },
    get length() { return data.size; },
  };
}

function loadImport(extras) {
  const source = fs.readFileSync(path.join(root, 'js/pages/import.js'), 'utf8');
  const sandbox = Object.assign({
    console,
    window: { location: { hash: '' } },
    history: { replaceState() {} },
    document: { getElementById() { return null; } },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    WPDb: {},
    WPApp: { state: { profile: null, user: null } },
    WPRouter: { navigate() {}, hasRoute() { return false; } },
    WPToast: { success() {} },
    WPUtils: { currentPeriod() { return '2026-11-01'; } },
    WPClearNumberMap: { mapPayload() { return { error: null, inserts: {} }; } },
  }, extras || {});
  vm.createContext(sandbox);
  // Top-level const is a lexical global, not a property of the sandbox.
  vm.runInContext(source + '\nthis.WPImport = WPImport;', sandbox);
  sandbox.source = source;
  return sandbox;
}

function loadMap() {
  const source = fs.readFileSync(path.join(root, 'js/clearnumber-map.js'), 'utf8');
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.WPClearNumberMap;
}

function row(label, extra) {
  return Object.assign({
    label,
    skip: false,
    row: { asset_name: label },
  }, extra || {});
}

describe('import errors', () => {
  const { WPImport } = loadImport();

  test('explains a used code', () => {
    const explained = WPImport.explainRpc({ message: 'code_used', code: 'P0001' });
    expect(explained.terminal).toBe(true);
    expect(explained.title).toMatch(/already used/i);
    expect(explained.message).toMatch(/Continue in Pul Planning/i);
    expect(explained.message).not.toMatch(/code_used/);
  });

  test('explains an expired code even when the database wraps the text', () => {
    const explained = WPImport.explainRpc({
      message: 'ERROR: P0001: code_expired',
      details: null,
      code: 'P0001',
    });
    expect(explained.terminal).toBe(true);
    expect(explained.title).toMatch(/expired/i);
    expect(explained.message).toMatch(/24 hours/i);
    expect(explained.message).toMatch(/Continue in Pul Planning/i);
  });

  test('explains a missing code and a missing handoff function', () => {
    expect(WPImport.explainRpc({ message: 'code_not_found', code: 'P0002' }).title).toMatch(/not valid/i);
    const missing = WPImport.explainRpc({
      code: 'PGRST202',
      message: 'Could not find the function public.preview_clearnumber_handoff in the schema cache',
    });
    expect(missing.title).toMatch(/not switched on/i);
    expect(missing.terminal).toBe(true);
  });

  test('keeps a retryable failure on the confirm button', () => {
    const explained = WPImport.explainRpc(new Error('Failed to fetch'));
    expect(explained.terminal).toBe(false);
    expect(explained.message).toMatch(/could not load/i);
  });
});

describe('success message', () => {
  const { WPImport } = loadImport();

  test('counts only rows that will be written', () => {
    const message = WPImport.successMessage({
      inserts: {
        assets: [row('Savings'), row('Cash', { skip: true, reason: 'Already in your plan' })],
        liabilities: [row('Personal Loan')],
        goals: [row('Emergency Fund'), row('Retirement Savings')],
        income: [],
        expenses: [row('Housing')],
      },
      emergencyFund: { action: 'insert', skip: false, row: { current_balance: 1 } },
      fiLocal: { write: true, payload: { expenses: 1 } },
    });
    expect(message).toBe(
      'Your ClearNumber numbers are in: 1 asset, 1 debt, 2 goals, 1 expense, emergency fund added. FI Calculator updated.'
    );
  });

  test('example workbook names assets, debts, and goals', () => {
    const map = loadMap();
    const example = JSON.parse(fs.readFileSync(path.join(root, 'docs/clearnumber-payload.example.json'), 'utf8'));
    const plan = map.mapPayload(example, { today: '2026-11-14', period: '2026-11-01', existing: {} });
    const message = WPImport.successMessage(plan);
    expect(message).toContain('Your ClearNumber numbers are in: 4 assets, 1 debt, 2 goals');
    expect(message).toContain('added.');
    expect(message).toContain('FI Calculator updated.');
  });

  test('says so when every row was already in the plan and the calculator is unchanged', () => {
    const message = WPImport.successMessage({
      inserts: { assets: [row('Savings', { skip: true })] },
      fiLocal: { write: false, payload: { expenses: 1 } },
    });
    expect(message).toMatch(/Nothing new was added/i);
  });
});

describe('batched write', () => {
  test('starts every table before the first request finishes', async () => {
    const calls = [];
    let live = 0;
    let maxLive = 0;
    const gates = [];
    function track(table, rows) {
      live += 1;
      maxLive = Math.max(maxLive, live);
      calls.push({ table, rows });
      let release;
      const promise = new Promise(resolve => {
        release = () => {
          live -= 1;
          resolve(rows);
        };
      });
      gates.push(release);
      return promise;
    }

    const sandbox = loadImport({
      WPDb: {
        updateProfile: (userId, patch) => track('profile', {
          user_id: userId,
          currency: patch.currency,
          onboarding_done: patch.onboarding_done,
        }),
        insertMany: (table, rows) => track(table, rows),
        insert() { throw new Error('per-row insert should not be used'); },
        update: (table, id, changes) => track(table + ':update:' + id, [changes]),
      },
      WPApp: { state: { profile: null } },
    });

    const pending = sandbox.WPImport.writePlan({
      profilePatch: { currency: 'NGN', onboarding_done: true },
      inserts: {
        income: [row('Salary', { row: { source_name: 'Salary' } })],
        expenses: [
          row('Housing', { row: { category: 'Housing' } }),
          row('Food', { row: { category: 'Food' } }),
          row('Rent', { skip: true, row: { category: 'Housing' } }),
        ],
        assets: [
          row('Savings', { row: { asset_name: 'Savings' } }),
          row('Equities', { row: { asset_name: 'Equities' } }),
        ],
        liabilities: [row('Loan', { row: { liability_name: 'Loan' } })],
        goals: [row('Emergency Fund', { row: { goal_name: 'Emergency Fund' } })],
      },
      emergencyFund: { action: 'insert', skip: false, row: { current_balance: 120 } },
      fiLocal: { write: true, payload: { expenses: 315000, portfolio: 50000000, monthlySavings: 100000, returnRate: 9 } },
    }, 'user-1');

    await Promise.resolve();
    expect(maxLive).toBeGreaterThan(1);
    expect(calls.map(call => call.table).sort()).toEqual([
      'assets',
      'emergency_fund',
      'expense_entries',
      'goals',
      'income_entries',
      'liabilities',
      'profile',
    ]);
    const expenses = calls.find(call => call.table === 'expense_entries');
    expect(expenses.rows).toHaveLength(2);
    expect(expenses.rows.every(item => item.user_id === 'user-1')).toBe(true);
    expect(expenses.rows.map(item => item.category)).toEqual(['Housing', 'Food']);

    sandbox.localStorage.setItem('wp_estate_planning_user-1', 'keep');
    gates.forEach(release => release());
    await pending;
    expect(sandbox.WPApp.state.profile).toEqual({
      user_id: 'user-1',
      currency: 'NGN',
      onboarding_done: true,
    });
    expect(sandbox.localStorage.getItem('wp_page_currency_dashboard')).toBe('NGN');
    expect(sandbox.localStorage.getItem('wp_estate_planning_user-1')).toBe('keep');
  });

  test('does not wait row by row when insertMany is unavailable', async () => {
    const sandbox = loadImport({
      WPDb: {
        insert(table, row) {
          sandbox.calls.push({ table, row });
          return Promise.resolve(row);
        },
      },
      calls: [],
    });
    // loadImport copies extras before the script runs, so the calls array
    // on the sandbox is the one the stub closes over only if we share it.
    sandbox.calls = [];
    sandbox.WPDb.insert = (table, row) => {
      sandbox.calls.push(table);
      return new Promise(resolve => sandbox.releases.push(() => resolve(row)));
    };
    sandbox.releases = [];

    const pending = sandbox.WPImport.writePlan({
      inserts: {
        assets: [
          row('Savings', { row: { asset_name: 'Savings' } }),
          row('Equities', { row: { asset_name: 'Equities' } }),
          row('Cash', { row: { asset_name: 'Cash' } }),
        ],
      },
    }, 'user-1');

    await Promise.resolve();
    expect(sandbox.calls).toEqual(['assets', 'assets', 'assets']);
    sandbox.releases.forEach(release => release());
    await pending;
  });

  test('the confirm path no longer rebuilds the app or inserts one row at a time', () => {
    const source = fs.readFileSync(path.join(root, 'js/pages/import.js'), 'utf8');
    expect(source).not.toContain('await WPApp.boot()');
    expect(source).not.toMatch(/for \(const item of items[\s\S]{0,180}await WPDb\.insert/);
    const sql = fs.readFileSync(path.join(root, 'supabase/migrations/007_clearnumber_handoff.sql'), 'utf8');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.redeem_clearnumber_handoff(text) TO authenticated');
  });
});

describe('FI calculator storage', () => {
  test('replaces calculator inputs and leaves unrelated device data alone', async () => {
    const sandbox = loadImport({
      localStorage: memoryStorage({
        'wp_fi_calc_user-1': JSON.stringify({
          expenses: 450000,
          passive: 180000,
          dividends: 65000,
          portfolio: 18500000,
          returnRate: 12,
          monthlySavings: 250000,
          customNote: 'keep me',
        }),
        wp_estate_planning_user_1: '{"will":"yes"}',
        wp_insurance_data_user_1: '{"policies":[1]}',
      }),
      WPDb: {
        insertMany: () => Promise.resolve([]),
      },
    });

    await sandbox.WPImport.writePlan({
      inserts: { assets: [row('Savings', { row: { asset_name: 'Savings' } })] },
      fiLocal: {
        write: true,
        payload: {
          expenses: 315000,
          passive: 0,
          dividends: 0,
          rentals: 0,
          pensions: 0,
          otherPassive: 0,
          portfolio: 50000000,
          returnRate: 9,
          monthlySavings: 100000,
          unexpected: 'ignore',
        },
      },
    }, 'user-1');

    const saved = JSON.parse(sandbox.localStorage.getItem('wp_fi_calc_user-1'));
    expect(saved).toMatchObject({
      expenses: 315000,
      passive: 0,
      dividends: 0,
      portfolio: 50000000,
      returnRate: 9,
      monthlySavings: 100000,
      customNote: 'keep me',
    });
    expect(saved.unexpected).toBeUndefined();
    expect(sandbox.localStorage.getItem('wp_estate_planning_user_1')).toBe('{"will":"yes"}');
    expect(sandbox.localStorage.getItem('wp_insurance_data_user_1')).toBe('{"policies":[1]}');
  });

  test('does not touch the calculator when the database write fails', async () => {
    const sandbox = loadImport({
      localStorage: memoryStorage({
        'wp_fi_calc_user-1': JSON.stringify({ expenses: 450000, customNote: 'keep me' }),
      }),
      WPDb: {
        insertMany: () => Promise.reject(new Error('check constraint')),
      },
    });

    await expect(sandbox.WPImport.writePlan({
      inserts: { assets: [row('Savings', { row: { asset_name: 'Savings' } })] },
      fiLocal: { write: true, payload: { expenses: 315000 } },
    }, 'user-1')).rejects.toThrow(/check constraint/);

    expect(JSON.parse(sandbox.localStorage.getItem('wp_fi_calc_user-1'))).toEqual({
      expenses: 450000,
      customNote: 'keep me',
    });
  });
});

describe('landing after import', () => {
  test('stores the message, opens the dashboard, and shows a toast', () => {
    const sandbox = loadImport();
    const navigated = [];
    const toasts = [];
    sandbox.WPRouter.navigate = (path, replace) => navigated.push({ path, replace });
    sandbox.WPRouter.hasRoute = (path) => path === '/dashboard';
    sandbox.WPToast.success = (message, duration) => toasts.push({ message, duration });
    sandbox.WPApp.clearClearNumberPending = () => { sandbox.cleared = true; };

    const result = sandbox.WPImport.landAfterImport(
      'Your ClearNumber numbers are in: 4 assets, 1 debt, 2 goals added.',
      { fi: true }
    );

    expect(result.landed).toBe(true);
    expect(sandbox.cleared).toBe(true);
    expect(navigated).toEqual([{ path: '/dashboard', replace: true }]);
    expect(toasts[0].duration).toBe(8000);
    expect(toasts[0].message).toContain('4 assets, 1 debt, 2 goals');
    const stored = JSON.parse(sandbox.sessionStorage.getItem(sandbox.WPImport.RESULT_KEY));
    expect(stored.fi).toBe(true);
    expect(stored.message).toContain('4 assets');
  });

  test('dashboard banner shows the message and dismisses it', () => {
    const elements = [];
    function makeEl() {
      const el = {
        className: '',
        style: {},
        attrs: {},
        textContent: '',
        type: '',
        children: [],
        listeners: {},
        setAttribute(name, value) { this.attrs[name] = value; },
        appendChild(child) { this.children.push(child); return child; },
        addEventListener(type, fn) { this.listeners[type] = fn; },
      };
      elements.push(el);
      return el;
    }
    const host = makeEl();
    Object.defineProperty(host, 'innerHTML', {
      configurable: true,
      set(value) { if (value === '') host.children = []; },
      get() { return ''; },
    });

    const sandbox = loadImport({
      document: { createElement: () => makeEl() },
    });
    sandbox.sessionStorage.setItem(sandbox.WPImport.RESULT_KEY, JSON.stringify({
      message: 'Your ClearNumber numbers are in: 4 assets, 1 debt, 2 goals added.',
      fi: true,
    }));
    const opened = [];
    sandbox.WPRouter.navigate = (path) => opened.push(path);

    expect(sandbox.WPImport.mountSuccessBanner(host)).toBe(true);
    const texts = [];
    (function walk(el) {
      if (el.textContent) texts.push(el.textContent);
      (el.children || []).forEach(walk);
    })(host);
    expect(texts.join(' ')).toContain('4 assets, 1 debt, 2 goals');
    expect(texts.join(' ')).toMatch(/left alone/i);

    const fiButton = elements.find(el => el.textContent === 'Open FI Calculator');
    fiButton.listeners.click();
    expect(opened).toEqual(['/fi']);

    const ok = elements.find(el => el.textContent === 'OK');
    ok.listeners.click();
    expect(sandbox.sessionStorage.getItem(sandbox.WPImport.RESULT_KEY)).toBeNull();
    expect(host.children).toEqual([]);
  });
});

describe('Client / Student ID pull', () => {
  const { WPImport } = loadImport();

  test('explains a number that is taken, missing, or not an id', () => {
    expect(WPImport.explainRpc({ message: 'invalid_client_number' }).message).toMatch(/CN-K7M2P4QX/);
    expect(WPImport.explainRpc({ message: 'client_number_taken' }).title).toMatch(/already linked/i);
    expect(WPImport.explainRpc({ message: 'client_number_not_found', code: 'P0002' }).message).toMatch(/not in Pul yet/i);
    expect(WPImport.explainRpc({ message: 'client_number_retired' }).title).toMatch(/no longer active/i);
  });

  test('a missing id function is not reported as a missing handoff', () => {
    const missing = WPImport.explainRpc({
      code: 'PGRST202',
      message: 'Could not find the function public.link_clearnumber_client in the schema cache',
    });
    expect(missing.title).toMatch(/numbers are not switched on/i);
    expect(missing.message).not.toMatch(/handoff/i);
  });

  test('pulling by id does not redeem a one-time handoff code', async () => {
    const calls = [];
    const sandbox = loadImport({
      WPDb: {
        redeemClearNumber(code) {
          calls.push(code);
          return Promise.resolve({ payload: { schema_version: 1, from: 'code' } });
        },
      },
    });
    const pulled = await sandbox.WPImport.claimPayload('client', 'CN-K7M2P4QX', { schema_version: 1, from: 'id' });
    expect(calls).toEqual([]);
    expect(pulled.from).toBe('id');

    const redeemed = await sandbox.WPImport.claimPayload('code', 'AB12CD34EF56', null);
    expect(calls).toEqual(['AB12CD34EF56']);
    expect(redeemed.from).toBe('code');
  });

  test('the profile panel shows the id, a copy button, the shared-number note, and the entry button', async () => {
    const elements = [];
    function makeEl(tag) {
      const el = {
        tag,
        className: '',
        style: {},
        attrs: {},
        textContent: '',
        type: '',
        value: '',
        disabled: false,
        children: [],
        listeners: {},
        setAttribute(name, value) { this.attrs[name] = value; },
        appendChild(child) { this.children.push(child); return child; },
        addEventListener(type, fn) { this.listeners[type] = fn; },
        querySelector(sel) {
          const want = sel.replace('[', '').replace(']', '').split('=')[0];
          const found = [];
          (function walk(node) {
            if (node.attrs && node.attrs[want] != null) found.push(node);
            (node.children || []).forEach(walk);
          })(el);
          return found[0] || null;
        },
        focus() {},
      };
      elements.push(el);
      return el;
    }
    const host = makeEl('div');
    Object.defineProperty(host, 'innerHTML', {
      configurable: true,
      set(value) { if (value === '') host.children = []; },
      get() { return ''; },
    });
    const sandbox = loadImport({
      document: {
        createElement: (tag) => makeEl(tag),
        getElementById() { return null; },
        body: { appendChild() {}, removeChild() {} },
        execCommand() { return true; },
      },
      WPApp: { state: { profile: { client_number: 'cn-k7m2-p4qx' }, user: { id: 'user-1' } } },
      WPClearNumberMap: {
        normalizeClientNumber(value) {
          const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!/^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(compact)) return null;
          return 'CN-' + compact.slice(2);
        },
        mapPayload() { return { error: null, inserts: {} }; },
      },
      WPDb: {
        linkClearNumberClient(number) {
          return Promise.resolve({ client_number: number, recognized: true, linked: true, payload: null });
        },
      },
    });

    sandbox.WPImport.mountClearNumberEntry(host);
    const texts = [];
    (function walk(el) {
      if (el.textContent) texts.push(el.textContent);
      (el.children || []).forEach(walk);
    })(host);
    const joined = texts.join(' ');
    expect(joined).toContain('CN-K7M2P4QX');
    expect(joined).toContain('Copy');
    expect(joined).toContain('This same number works on both Pul Planning and ClearNumber.');
    expect(joined).toContain('Input your ClearNumber # here');

    const open = elements.find(el => el.textContent === 'Input your ClearNumber # here');
    open.listeners.click();
    const form = elements.find(el => el.attrs['data-clearnumber-form'] != null);
    expect(form.style.display).toBe('block');

    const input = elements.find(el => el.attrs['aria-label'] === 'ClearNumber number');
    const submit = elements.find(el => el.textContent === 'Pull into Pul Planning');
    input.value = 'not-an-id';
    await form.listeners.submit({ preventDefault() {} });
    const err = elements.find(el => el.style && el.style.display === 'block' && /CN-K7M2P4QX/.test(el.textContent));
    expect(err).toBeTruthy();

    input.value = 'CN-AAAAAAA2';
    await form.listeners.submit({ preventDefault() {} });
    const shown = host.querySelector('[data-client-number-value]');
    expect(shown.textContent).toBe('CN-AAAAAAA2');
    expect(sandbox.WPApp.state.profile.client_number).toBe('CN-AAAAAAA2');
    expect(submit.disabled).toBe(false);
  });

  test('settings and onboarding both mount that panel', () => {
    const settings = fs.readFileSync(path.join(root, 'js/pages/settings.js'), 'utf8');
    const onboarding = fs.readFileSync(path.join(root, 'js/pages/onboarding.js'), 'utf8');
    expect(settings).toContain('id="settings-client-number"');
    expect(settings).toContain('WPImport.mountClearNumberEntry');
    expect(onboarding).toContain('id="ob-client-number"');
    expect(onboarding).toContain('WPImport.mountClearNumberEntry');
  });

  test('the signed-out import page offers Input your ClearNumber # here', async () => {
    const container = { innerHTML: '' };
    const sandbox = loadImport({
      document: { getElementById() { return null; } },
      WPApp: { state: { user: null, profile: null }, captureClearNumberCode() {} },
    });
    await sandbox.WPImport.init(container);
    expect(container.innerHTML).toContain('Input your ClearNumber # here');
    expect(container.innerHTML).toContain('Import link missing');
  });
});
