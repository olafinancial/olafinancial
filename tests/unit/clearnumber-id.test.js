/**
 * Shared Client / Student ID: canonical form, pull entry, and the
 * SQL contract ClearNumber mirrors.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

function makeEl(tag) {
  const el = {
    tag,
    children: [],
    attrs: {},
    style: {},
    listeners: {},
    textContent: '',
    value: '',
    disabled: false,
    className: '',
    id: '',
    type: '',
    placeholder: '',
    autocomplete: '',
    spellcheck: false,
    setAttribute(name, value) { this.attrs[name] = value; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    remove() { this.removed = true; },
    select() { this.selected = true; },
    focus() { this.focused = true; },
  };
  return el;
}

function loadId(extras) {
  const source = fs.readFileSync(path.join(root, 'js/clearnumber-id.js'), 'utf8');
  const body = makeEl('body');
  const sandbox = Object.assign({
    console,
    URLSearchParams,
    window: { location: { hash: '' } },
    sessionStorage: memoryStorage(),
    navigator: {},
    document: {
      createElement: (tag) => makeEl(tag),
      body,
      execCommand() { return true; },
    },
    WPApp: { state: { user: null, profile: null } },
    WPRouter: { navigate() {} },
    WPToast: { success() {} },
    WPDb: {},
    WPImport: null,
  }, extras || {});
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox;
}

describe('canonical Client / Student ID', () => {
  const { WPClearNumberId: id } = loadId();

  test('accepts the display form and the same number without a hyphen', () => {
    expect(id.canonical('CN-K7M2PQ')).toBe('CN-K7M2PQ');
    expect(id.canonical('cn-k7m2pq')).toBe('CN-K7M2PQ');
    expect(id.canonical('CNK7M2PQ')).toBe('CN-K7M2PQ');
    expect(id.canonical('cn k7m2pq')).toBe('CN-K7M2PQ');
    expect(id.lookupKey('cn-k7m2pq')).toBe('CNK7M2PQ');
    expect(id.CANONICAL.test('CN-K7M2PQ')).toBe(true);
  });

  test('rejects handoff codes and ambiguous characters', () => {
    expect(id.canonical('AB12CD34EF56')).toBeNull();
    expect(id.canonical('CN-O0I1LL')).toBeNull();
    expect(id.canonical('CN-K7M2P')).toBeNull();
    expect(id.canonical('CN-K7M2PQX')).toBeNull();
    expect(id.canonical('')).toBeNull();
    expect(id.canonical(null)).toBeNull();
    expect(id.lookupKey('AB12CD34EF56')).toBeNull();
  });

  test('uses the alphabet published in the migration', () => {
    expect(id.ALPHABET).toBe(ALPHABET);
    expect(id.ALPHABET).toHaveLength(32);
    expect(id.BODY).toBe(6);
    expect(id.PULL_BUTTON_LABEL).toBe('Input your ClearNumber # here');
    expect(id.SHARED_NOTE).toBe('This same number works on Pul Planning and ClearNumber.');
  });
});

describe('stored number', () => {
  test('keeps a hash number through sign-in and clears it', () => {
    const sandbox = loadId({ window: { location: { hash: '#/import?number=cn-k7m2pq' } } });
    const id = sandbox.WPClearNumberId;
    expect(id.captureFromHash()).toBe('CN-K7M2PQ');
    expect(id.numberPending()).toBe(true);
    expect(id.readStoredNumber()).toBe('CN-K7M2PQ');
    id.clearPending();
    expect(id.numberPending()).toBe(false);
    expect(id.readStoredNumber()).toBe('CN-K7M2PQ');
    sandbox.window.location.hash = '#/dashboard';
    id.clearStoredNumber();
    expect(id.readStoredNumber()).toBeNull();
    expect(id.numberPending()).toBe(false);
  });

  test('reads cn= as well as number=', () => {
    const sandbox = loadId({ window: { location: { hash: '#/import?cn=CNK7M2PQ' } } });
    expect(sandbox.WPClearNumberId.captureFromHash()).toBe('CN-K7M2PQ');
  });

  test('ignores a one-time code in the hash', () => {
    const sandbox = loadId({ window: { location: { hash: '#/import?code=AB12CD34EF56' } } });
    expect(sandbox.WPClearNumberId.captureFromHash()).toBeNull();
    expect(sandbox.WPClearNumberId.numberPending()).toBe(false);
  });
});

describe('pull result', () => {
  test('recognises an ID that is already on the profile', () => {
    const sandbox = loadId();
    const message = sandbox.WPClearNumberId.recognitionMessage({
      client_number: 'cn-k7m2pq',
      status: 'already_linked',
      has_workbook: false,
    });
    expect(message).toContain('CN-K7M2PQ is already your Client / Student ID');
    expect(message).toContain('This same number works on Pul Planning and ClearNumber.');
    expect(message).toMatch(/No ClearNumber workbook is stored/i);
    expect(sandbox.WPClearNumberId.adoptProfile({
      client_number: 'CN-K7M2PQ',
      source: 'claimed',
    })).toBe('CN-K7M2PQ');
    expect(sandbox.WPApp.state.profile.client_number).toBe('CN-K7M2PQ');
    expect(sandbox.WPApp.state.profile.client_number_source).toBe('claimed');
  });

  test('opens import when a workbook is stored', () => {
    const sandbox = loadId();
    const navigated = [];
    sandbox.WPRouter.navigate = (path, replace) => navigated.push({ path, replace });
    const result = sandbox.WPClearNumberId.finishPull({
      client_number: 'CN-K7M2PQ',
      status: 'linked',
      source: 'claimed',
      has_workbook: true,
      payload: { schema_version: 1 },
    });
    expect(result.opened).toBe(true);
    expect(navigated).toEqual([{ path: '/import', replace: true }]);
    expect(sandbox.WPClearNumberId.numberPending()).toBe(true);
  });

  test('stays on the page when the ID has no workbook', () => {
    const sandbox = loadId();
    const toasts = [];
    sandbox.WPToast.success = (message) => toasts.push(message);
    const result = sandbox.WPClearNumberId.finishPull({
      client_number: 'CN-K7M2PQ',
      status: 'already_linked',
      source: 'generated',
      has_workbook: false,
    });
    expect(result.opened).toBe(false);
    expect(toasts[0]).toContain('already your Client / Student ID');
    expect(sandbox.WPClearNumberId.numberPending()).toBe(false);
  });
});

describe('pull form', () => {
  function form(sandbox, options) {
    const host = makeEl('div');
    Object.defineProperty(host, 'innerHTML', {
      configurable: true,
      set(value) { if (value === '') host.children = []; },
      get() { return ''; },
    });
    const mounted = sandbox.WPClearNumberId.mountPullForm(host, options);
    return { host, mounted };
  }

  test('shows the ClearNumber button and rejects a handoff code', async () => {
    const sandbox = loadId();
    const { mounted } = form(sandbox);
    expect(mounted.button.textContent).toBe('Input your ClearNumber # here');
    expect(mounted.button.listeners.click).toEqual(expect.any(Function));
    mounted.input.value = 'AB12CD34EF56';
    await mounted.submit();
    expect(mounted.error.style.display).toBe('block');
    expect(mounted.error.textContent).toMatch(/CN-K7M2PQ/);
    expect(mounted.error.textContent).not.toMatch(/invalid_number/);
    expect(mounted.input.focused).toBe(true);
  });

  test('sends a signed-out visitor to sign in with the number held', async () => {
    const sandbox = loadId();
    const navigated = [];
    sandbox.WPRouter.navigate = (path) => navigated.push(path);
    const { mounted } = form(sandbox);
    mounted.input.value = 'cn k7m2pq';
    await mounted.submit();
    expect(sandbox.sessionStorage.getItem('wp_clearnumber_number')).toBe('CN-K7M2PQ');
    expect(sandbox.WPClearNumberId.numberPending()).toBe(true);
    expect(navigated).toEqual(['/login']);
  });

  test('pulls a workbook for a signed-in profile', async () => {
    const sandbox = loadId();
    sandbox.WPApp.state.user = { id: 'user-1' };
    sandbox.WPApp.state.profile = { client_number: 'CN-AAAAAA', client_number_source: 'generated' };
    const seen = [];
    sandbox.WPDb.pullClearNumber = (number) => {
      seen.push(number);
      return Promise.resolve({
        client_number: 'CN-K7M2PQ',
        status: 'linked',
        source: 'claimed',
        has_workbook: true,
        payload: { schema_version: 1 },
      });
    };
    const navigated = [];
    sandbox.WPRouter.navigate = (path) => navigated.push(path);
    const { mounted } = form(sandbox);
    mounted.input.value = 'CN-K7M2PQ';
    await mounted.submit();
    expect(seen).toEqual(['CN-K7M2PQ']);
    expect(sandbox.WPApp.state.profile.client_number).toBe('CN-K7M2PQ');
    expect(navigated).toEqual(['/import']);
    expect(mounted.button.textContent).toBe('Input your ClearNumber # here');
    expect(mounted.button.disabled).toBe(false);
  });

  test('explains a number that belongs to someone else', async () => {
    const sandbox = loadId();
    sandbox.WPApp.state.user = { id: 'user-1' };
    sandbox.WPImport = {
      explainRpc(error) {
        return { message: 'That ClearNumber # is already linked to another Pul Planning profile.' };
      },
    };
    sandbox.WPDb.pullClearNumber = () => Promise.reject({ message: 'number_in_use' });
    const { mounted } = form(sandbox);
    mounted.input.value = 'CN-K7M2PQ';
    await mounted.submit();
    expect(mounted.error.textContent).toMatch(/another Pul Planning profile/);
    expect(mounted.error.textContent).not.toMatch(/number_in_use/);
  });

  test('copies the canonical ID', async () => {
    const sandbox = loadId();
    const copied = [];
    sandbox.navigator.clipboard = {
      writeText(value) { copied.push(value); return Promise.resolve(); },
    };
    await expect(sandbox.WPClearNumberId.copyText('cn-k7m2pq')).resolves.toBe(true);
    expect(copied).toEqual(['CN-K7M2PQ']);
    await expect(sandbox.WPClearNumberId.copyText('not-an-id')).resolves.toBe(false);
  });

  test('falls back when the clipboard rejects', async () => {
    const sandbox = loadId();
    sandbox.navigator.clipboard = { writeText() { return Promise.reject(new Error('denied')); } };
    await expect(sandbox.WPClearNumberId.copyText('CN-K7M2PQ')).resolves.toBe(true);
  });
});

describe('SQL and screen contract', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/008_client_number.sql'), 'utf8');
  const idSource = fs.readFileSync(path.join(root, 'js/clearnumber-id.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/pages/settings.js'), 'utf8');
  const onboarding = fs.readFileSync(path.join(root, 'js/pages/onboarding.js'), 'utf8');
  const importer = fs.readFileSync(path.join(root, 'js/pages/import.js'), 'utf8');
  const handoff = fs.readFileSync(path.join(root, 'supabase/migrations/007_clearnumber_handoff.sql'), 'utf8');

  test('the migration and the browser use one alphabet and one canonical pattern', () => {
    expect(idSource).toContain(ALPHABET);
    expect(sql).toContain(ALPHABET);
    expect(sql).toContain("raw !~ '^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'");
    expect(sql).toContain("RETURN 'CN-' || substr(raw, 3, 6)");
    expect(sql).toContain('user_profiles_client_number_uidx');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS client_number');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_client_number_uidx');
  });

  test('pull is signed-in, register and lookup stay on the ClearNumber origin', () => {
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.pull_clearnumber_number(text) TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.ensure_my_client_number() TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.register_clearnumber_record(text, jsonb) TO anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.lookup_client_number(text) TO anon');
    expect(sql).toContain('IF NOT private.clearnumber_origin_allowed()');
    expect(sql).not.toContain('GRANT EXECUTE ON FUNCTION public.pull_clearnumber_number(text) TO anon');
  });

  test('one-time handoff codes still return a code-only redirect', () => {
    expect(sql).toContain("'redirect_url', 'https://pul.llc/#/import?code=' || code");
    expect(sql).toContain("'payload', rec.payload");
    expect(sql).toContain("'expires_at', rec.expires_at");
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain('DROP FUNCTION public.create_clearnumber_handoff');
    expect(handoff).toContain('FUNCTION public.create_clearnumber_handoff');
    expect(handoff).toContain("GRANT EXECUTE ON FUNCTION public.redeem_clearnumber_handoff(text) TO authenticated");
  });

  test('profile, import, and onboarding offer the same entry', () => {
    expect(settings).toContain('This same number works on Pul Planning and ClearNumber.');
    expect(settings).toContain('copy-client-number');
    expect(settings).toContain('mountPullForm');
    expect(onboarding).toContain('mountPullForm');
    expect(importer).toContain('mountPullForm');
    expect(importer).toContain('pullClearNumber');
    expect(idSource).toContain('Input your ClearNumber # here');
  });
});
