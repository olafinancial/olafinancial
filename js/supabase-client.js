// ============================================================
// OlaFinancial — Supabase Client
// ============================================================

const WPDb = (() => {
  let _client = null;

  function init() {
    if (_client) return _client;
    if (typeof supabase === 'undefined') {
      console.error('Supabase JS SDK not loaded');
      return null;
    }
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return _client;
  }

  function client() {
    if (!_client) init();
    return _client;
  }

  // ── AUTH HELPERS ─────────────────────────────────────────
  async function getSession()  { return (await client().auth.getSession()).data.session; }
  async function getUser()     { return (await client().auth.getUser()).data.user; }
  async function signOut()     { return client().auth.signOut(); }

  async function signUp(email, password) {
    return client().auth.signUp({ email, password });
  }

  async function signIn(email, password) {
    return client().auth.signInWithPassword({ email, password });
  }

  async function signInWithGoogle() {
    return client().auth.signInWithOAuth({ provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
  }

  async function resetPassword(email) {
    return client().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + '#/reset-password'
    });
  }

  // ── GENERIC CRUD ─────────────────────────────────────────
  async function fetchAll(table, filters = {}) {
    let q = client().from(table).select('*');
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function fetchOne(table, id) {
    const { data, error } = await client().from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function insert(table, row) {
    const { data, error } = await client().from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  }

  async function upsert(table, row, conflictCols = ['id']) {
    const { data, error } = await client().from(table).upsert(row, { onConflict: conflictCols.join(',') }).select().single();
    if (error) throw error;
    return data;
  }

  async function update(table, id, changes) {
    const { data, error } = await client().from(table).update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function remove(table, id) {
    const { error } = await client().from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // ── DOMAIN-SPECIFIC QUERIES ───────────────────────────────
  async function getProfile(userId) {
    const { data } = await client().from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
    return data;
  }

  async function getIncomeByPeriod(userId, period) {
    const { data, error } = await client().from('income_entries').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getExpensesByDateRange(userId, startDate, endDate) {
    const { data, error } = await client().from('expense_entries').select('*')
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getAssetsByPeriod(userId, period) {
    const { data, error } = await client().from('assets').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getLiabilitiesByPeriod(userId, period) {
    const { data, error } = await client().from('liabilities').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getMonthlySnapshots(userId, months = 12) {
    const { data, error } = await client().from('monthly_snapshots').select('*')
      .eq('user_id', userId).order('period_month', { ascending: true }).limit(months);
    if (error) throw error;
    return data || [];
  }

  async function getRefData(table) {
    const { data } = await client().from(table).select('*').order('name');
    return data || [];
  }

  async function saveSnapshot(userId, period, snapshot) {
    return upsert('monthly_snapshots', { user_id: userId, period_month: period, ...snapshot }, ['user_id','period_month']);
  }

  return {
    init, client,
    getSession, getUser, signOut, signUp, signIn, signInWithGoogle, resetPassword,
    fetchAll, fetchOne, insert, upsert, update, remove,
    getProfile, getIncomeByPeriod, getExpensesByDateRange,
    getAssetsByPeriod, getLiabilitiesByPeriod, getMonthlySnapshots,
    getRefData, saveSnapshot,
  };
})();
