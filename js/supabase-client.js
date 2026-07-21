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

  function fromTable(table) {
    const mapped = table === 'goals' ? 'financial_goals' : table;
    return client().from(mapped);
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
      options: { redirectTo: 'https://pul.llc/index.html' }
    });
  }

  async function resetPassword(email) {
    return client().auth.resetPasswordForEmail(email, {
      redirectTo: 'https://pul.llc/index.html#/reset-password'
    });
  }

  // ── GENERIC CRUD ─────────────────────────────────────────
  async function fetchAll(table, filters = {}) {
    let q = fromTable(table).select('*');
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const sortCol = table === 'emergency_fund' ? 'updated_at' : 'created_at';
    q = q.order(sortCol, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function fetchOne(table, id) {
    const { data, error } = await fromTable(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function insert(table, row) {
    const { data, error } = await fromTable(table).insert(row).select().single();
    if (error) throw error;
    return data;
  }

  async function upsert(table, row, conflictCols = ['id']) {
    const { data, error } = await fromTable(table).upsert(row, { onConflict: conflictCols.join(',') }).select().single();
    if (error) throw error;
    return data;
  }

  async function update(table, id, changes) {
    const { data, error } = await fromTable(table).update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function remove(table, id) {
    const { error } = await fromTable(table).delete().eq('id', id);
    if (error) throw error;
  }

  // ── DOMAIN-SPECIFIC QUERIES ───────────────────────────────
  async function getProfile(userId) {
    const { data } = await fromTable('user_profiles').select('*').eq('user_id', userId).maybeSingle();
    return data;
  }

  /**
   * Update user_profiles by user_id. Maps quiz "balanced" → schema "moderate".
   * Upserts if no profile row exists yet.
   */
  async function updateProfile(userId, changes = {}) {
    if (!userId) throw new Error('No user id');
    const patch = { ...changes };
    if (patch.risk_tolerance === 'balanced') patch.risk_tolerance = 'moderate';
    const { data, error } = await fromTable('user_profiles')
      .update(patch)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    return upsert('user_profiles', { user_id: userId, ...patch }, ['user_id']);
  }

  async function getIncomeByPeriod(userId, period) {
    const { data, error } = await fromTable('income_entries').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getExpensesByDateRange(userId, startDate, endDate) {
    const { data, error } = await fromTable('expense_entries').select('*')
      .eq('user_id', userId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getAssetsByPeriod(userId, period) {
    const { data, error } = await fromTable('assets').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getLiabilitiesByPeriod(userId, period) {
    const { data, error } = await fromTable('liabilities').select('*')
      .eq('user_id', userId).eq('period_month', period);
    if (error) throw error;
    return data || [];
  }

  async function getMonthlySnapshots(userId, months = 12) {
    const { data, error } = await fromTable('monthly_snapshots').select('*')
      .eq('user_id', userId).order('period_month', { ascending: true }).limit(months);
    if (error) throw error;
    return data || [];
  }

  async function getRefData(table) {
    const { data } = await fromTable(table).select('*').order('name');
    return data || [];
  }

  async function saveSnapshot(userId, period, snapshot) {
    return upsert('monthly_snapshots', { user_id: userId, period_month: period, ...snapshot }, ['user_id','period_month']);
  }

  /** User-owned tables wiped by “Reset my data” (auth account kept). */
  const USER_DATA_TABLES = [
    'income_entries',
    'expense_entries',
    'assets',
    'liabilities',
    'financial_goals',
    'insurance_policies',
    'emergency_fund',
    'monthly_snapshots',
  ];

  /**
   * Delete all financial rows for the current user (RLS-scoped).
   * Does not delete auth.users — same email/password still works.
   */
  async function resetUserData(userId) {
    if (!userId) throw new Error('No user id');
    const errors = [];
    for (const table of USER_DATA_TABLES) {
      try {
        const { error } = await fromTable(table).delete().eq('user_id', userId);
        if (error) errors.push(`${table}: ${error.message}`);
      } catch (e) {
        errors.push(`${table}: ${e.message || e}`);
      }
    }
    // Soft-reset profile (keep row so app still boots)
    try {
      await fromTable('user_profiles').update({
        full_name: null,
        age: null,
        retirement_age: 60,
        digest_enabled: false,
        digest_email: null,
      }).eq('user_id', userId);
    } catch (e) {
      errors.push('user_profiles: ' + (e.message || e));
    }
    if (errors.length) {
      console.warn('resetUserData partial errors', errors);
    }
    return { ok: errors.length === 0, errors };
  }

  /** Clear localStorage / session keys that store per-user app state. */
  function clearUserLocalState(userId) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        (userId && k.includes(userId)) ||
        k.startsWith('wp_budget_') ||
        k.startsWith('wp_page_currency_') ||
        k.startsWith('wp_ret_stocks_') ||
        k.startsWith('wp_takaful_') ||
        k.startsWith('wp_insurance_data_') ||
        k.startsWith('wp_estate_planning_') ||
        k.startsWith('wp_invest_quiz_') ||
        k.startsWith('wp_report_frequency_') ||
        k.startsWith('wp_show_getting_started_') ||
        k.startsWith('wp_onboarding_')
      ) {
        keys.push(k);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
    try { sessionStorage.removeItem('wp_calc_tab'); } catch { /* ignore */ }
    return keys.length;
  }

  /**
   * Insert a small demo dataset for the current period so testers can click around.
   * Call after reset (or on empty account).
   */
  async function seedDemoData(userId) {
    if (!userId) throw new Error('No user id');
    const PERIOD = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();
    const today = new Date().toISOString().slice(0, 10);
    const naira = (n) => Math.round(n * 100); // kobo

    await upsert('user_profiles', {
      user_id: userId,
      full_name: 'Demo User',
      age: 34,
      retirement_age: 60,
      currency: 'NGN',
    }, ['user_id']);

    await fromTable('income_entries').insert([
      {
        user_id: userId,
        period_month: PERIOD,
        income_type: 'active',
        source_name: 'Demo Salary',
        gross_amount: naira(1_500_000),
        frequency: 'monthly',
        paye_tax: naira(120_000),
        pension_contrib: naira(120_000),
        nhf_contrib: naira(25_000),
        other_deductions: 0,
        notes: '[NGN] Demo seed',
      },
      {
        user_id: userId,
        period_month: PERIOD,
        income_type: 'passive',
        source_name: 'Demo Dividends',
        gross_amount: naira(85_000),
        frequency: 'monthly',
        paye_tax: 0,
        pension_contrib: 0,
        nhf_contrib: 0,
        other_deductions: 0,
        notes: '[NGN] Demo seed',
      },
    ]);

    await fromTable('expense_entries').insert([
      {
        user_id: userId,
        expense_date: today,
        amount: naira(450_000),
        category: 'Housing',
        description: 'Demo rent [NGN]',
        is_discretionary: false,
        is_recurring: true,
      },
      {
        user_id: userId,
        expense_date: today,
        amount: naira(95_000),
        category: 'Food',
        description: 'Demo groceries [NGN]',
        is_discretionary: false,
        is_recurring: true,
      },
      {
        user_id: userId,
        expense_date: today,
        amount: naira(40_000),
        category: 'Dining Out',
        description: 'Demo restaurants [NGN]',
        is_discretionary: true,
        is_recurring: false,
      },
      {
        user_id: userId,
        expense_date: today,
        amount: naira(100_000),
        category: 'Investment',
        description: 'Demo monthly invest [NGN]',
        is_discretionary: false,
        is_recurring: true,
      },
      {
        user_id: userId,
        expense_date: today,
        amount: naira(75_000),
        category: 'Interest & Debt',
        description: 'Demo loan payment [NGN]',
        is_discretionary: false,
        is_recurring: true,
      },
    ]);

    await fromTable('assets').insert([
      {
        user_id: userId,
        period_month: PERIOD,
        asset_name: 'Demo Savings',
        asset_type: 'savings',
        institution_type: 'dmb',
        institution_name: 'Demo Bank',
        open_balance: naira(2_000_000),
        close_balance: naira(2_200_000),
        interest_rate: 8,
        is_income_generating: true,
        notes: '[NGN] [Emergency Fund] Demo seed',
      },
      {
        user_id: userId,
        period_month: PERIOD,
        asset_name: 'Demo Equity',
        asset_type: 'equity',
        institution_type: 'investment',
        institution_name: 'Demo Broker',
        open_balance: naira(500_000),
        close_balance: naira(520_000),
        interest_rate: 0,
        is_income_generating: true,
        notes: '[NGN] [ticker:DEMO] [qty:100] [unit_cost:500000] Demo seed',
      },
    ]);

    await fromTable('liabilities').insert([
      {
        user_id: userId,
        period_month: PERIOD,
        liability_name: 'Demo Personal Loan',
        liability_type: 'personal_loan',
        lender_name: 'Demo Lender',
        open_balance: naira(800_000),
        close_balance: naira(800_000),
        apr: 22,
        monthly_payment: naira(75_000),
        is_interest_bearing: true,
        notes: '[NGN] Demo seed',
      },
      {
        user_id: userId,
        period_month: PERIOD,
        liability_name: 'Demo Qard Hasan',
        liability_type: 'qard_hasan',
        lender_name: 'Family',
        open_balance: naira(200_000),
        close_balance: naira(200_000),
        apr: 0,
        monthly_payment: naira(20_000),
        is_interest_bearing: false,
        notes: '[NGN] Demo seed',
      },
    ]);

    try {
      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 2);
      await fromTable('financial_goals').insert({
        user_id: userId,
        goal_name: 'Demo Emergency Fund',
        goal_type: 'emergency',
        target_amount: naira(3_000_000),
        target_date: targetDate.toISOString().slice(0, 10),
        current_savings: naira(2_200_000),
        expected_return_rate: 0.08,
        monthly_contribution: naira(50_000),
        notes: 'Demo seed',
      });
    } catch { /* optional */ }

    return { period: PERIOD };
  }

  return {
    init, client,
    getSession, getUser, signOut, signUp, signIn, signInWithGoogle, resetPassword,
    fetchAll, fetchOne, insert, upsert, update, remove,
    getProfile, updateProfile, getIncomeByPeriod, getExpensesByDateRange,
    getAssetsByPeriod, getLiabilitiesByPeriod, getMonthlySnapshots,
    getRefData, saveSnapshot,
    resetUserData, clearUserLocalState, seedDemoData, USER_DATA_TABLES,
  };
})();
