/**
 * Mapping tests for the ClearNumber → Pul handoff.
 * Loads js/clearnumber-map.js in a sandbox so the browser script
 * is what gets tested.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../../js/clearnumber-map.js'), 'utf8');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const map = sandbox.WPClearNumberMap;

const example = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../docs/clearnumber-payload.example.json'), 'utf8')
);

const TODAY = '2026-11-14';
const PERIOD = '2026-11-01';

function added(list) {
  return (list || []).filter(item => !item.skip);
}

function plan(payload, existing) {
  return map.mapPayload(payload, { today: TODAY, period: PERIOD, existing: existing || {} });
}

describe('handoff contract', () => {
  test('ClearNumber snippet and the migration share one create endpoint and a code-only redirect', () => {
    const root = path.join(__dirname, '../..');
    const sql = fs.readFileSync(path.join(root, 'supabase/migrations/007_clearnumber_handoff.sql'), 'utf8');
    const snippet = fs.readFileSync(path.join(root, 'docs/clearnumber-continue.js'), 'utf8');
    expect(snippet).toContain('/rest/v1/rpc/create_clearnumber_handoff');
    expect(sql).toContain('FUNCTION public.create_clearnumber_handoff');
    expect(sql).toContain("'redirect_url', 'https://pul.llc/#/import?code=' || code");
    expect(snippet).not.toContain('gross_monthly');
    expect(sql).toContain('https://clearnumber.kaluaja.org');
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.preview_clearnumber_handoff(text) TO authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.create_clearnumber_handoff(jsonb) TO anon");
  });
});

describe('ClearNumber import URL', () => {
  test('carries only the code', () => {
    const url = map.importUrl('AB12CD34EF56');
    expect(url).toBe('https://pul.llc/#/import?code=AB12CD34EF56');
    expect(url).not.toMatch(/500000|1200000|40000|80000000/);
  });
});

describe('example workbook', () => {
  const result = plan(example);

  test('fills an empty profile and marks setup complete', () => {
    expect(result.error).toBeNull();
    expect(result.profilePatch).toEqual({
      full_name: 'Ada Okonkwo',
      age: 34,
      state: 'Lagos',
      currency: 'NGN',
      employment_type: 'salaried',
      risk_tolerance: 'moderate',
      retirement_age: 60,
      onboarding_done: true,
    });
  });

  test('writes one monthly salary with tax derived from net pay', () => {
    const rows = added(result.inserts.income);
    expect(rows).toHaveLength(1);
    expect(rows[0].row).toMatchObject({
      source_name: 'Salary',
      income_type: 'active',
      frequency: 'monthly',
      gross_amount: 50_000_000,
      pension_contrib: 4_000_000,
      paye_tax: 4_000_000,
      nhf_contrib: 0,
      other_deductions: 0,
      period_month: PERIOD,
      is_active: true,
      notes: '[NGN]',
    });
  });

  test('maps expense categories and marks wants', () => {
    const rows = added(result.inserts.expenses);
    expect(rows.map(item => item.row.category)).toEqual([
      'Housing', 'Food', 'Transportation', 'Utilities-Power Generation', 'Dining Out',
    ]);
    expect(rows[0].row.amount).toBe(15_000_000);
    expect(rows[0].row.is_discretionary).toBe(false);
    expect(rows[0].row.is_recurring).toBe(true);
    expect(rows[0].row.recurrence_freq).toBe('monthly');
    expect(rows[0].row.description).toBe('[freq:monthly] Housing [NGN]');
    expect(rows[4].row.is_discretionary).toBe(true);
  });

  test('maps savings, fixed deposit, equities, and the RSA', () => {
    const rows = added(result.inserts.assets);
    expect(rows.map(item => item.label)).toEqual([
      'Savings Account',
      'Fixed Deposit / T-Bill',
      'Equities / ETFs',
      'RSA (Stanbic IBTC)',
    ]);
    expect(rows[0].row).toMatchObject({
      asset_type: 'savings',
      institution_type: 'dmb',
      is_income_generating: false,
      open_balance: 120_000_000,
      close_balance: 120_000_000,
    });
    expect(rows[0].row.notes).toContain('[Emergency Fund]');
    expect(rows[1].row.interest_rate).toBe(12.5);
    expect(rows[1].row.asset_type).toBe('fixed_deposit');
    expect(rows[2].row).toMatchObject({
      asset_type: 'equity',
      institution_type: 'investment',
      is_income_generating: true,
    });
    expect(rows[3].row).toMatchObject({
      asset_type: 'retirement_contribution',
      pfa_name: 'Stanbic IBTC',
      open_balance: 250_000_000,
      is_income_generating: false,
    });
    expect(rows[3].row.notes).toContain('[sub:rsa]');
    expect(rows[3].row.notes).toContain('[rsa_contrib_monthly:9000000]');
  });

  test('maps the debt onto a liability the Debt Planner can read', () => {
    const rows = added(result.inserts.liabilities);
    expect(rows).toHaveLength(1);
    expect(rows[0].row).toMatchObject({
      liability_name: 'Personal Loan',
      liability_type: 'personal_loan',
      lender_name: 'GTBank',
      open_balance: 40_000_000,
      close_balance: 40_000_000,
      apr: 18.5,
      monthly_payment: 2_500_000,
      is_interest_bearing: true,
    });
  });

  test('creates emergency and retirement goals plus the emergency fund balance', () => {
    const goals = added(result.inserts.goals);
    expect(goals.map(item => item.row.goal_name)).toEqual(['Emergency Fund', 'Retirement Savings']);
    expect(goals[0].row).toMatchObject({
      goal_type: 'emergency',
      target_amount: 105_000_000,
      current_savings: 120_000_000,
      target_date: '2027-11-14',
    });
    expect(goals[1].row).toMatchObject({
      goal_type: 'retirement',
      target_amount: 8_000_000_000,
      current_savings: 250_000_000,
      monthly_contribution: 10_000_000,
      target_date: '2052-11-14',
      expected_return_rate: 0.09,
    });
    expect(result.emergencyFund.action).toBe('insert');
    expect(result.emergencyFund.row.current_balance).toBe(120_000_000);
  });

  test('prepares FI Calculator numbers in major units', () => {
    expect(result.fiLocal.write).toBe(true);
    expect(result.fiLocal.payload).toMatchObject({
      expenses: 315000,
      portfolio: 50000000,
      monthlySavings: 100000,
      returnRate: 9,
    });
  });

  test('every written value is one the live checks allow', () => {
    const c = map.CONSTRAINTS;
    added(result.inserts.income).forEach(item => {
      expect(c.income_type).toContain(item.row.income_type);
      expect(c.frequency).toContain(item.row.frequency);
      expect(item.row.gross_amount).toBeGreaterThan(0);
      expect(item.row.frequency).not.toBe('bi-weekly');
      expect(item.row.frequency).not.toBe('mmo');
    });
    added(result.inserts.expenses).forEach(item => {
      expect(c.expense_category).toContain(item.row.category);
      expect(c.recurrence_freq).toContain(item.row.recurrence_freq);
      expect(item.row.amount).toBeGreaterThan(0);
    });
    added(result.inserts.assets).forEach(item => {
      expect(c.asset_type).toContain(item.row.asset_type);
      if (item.row.institution_type != null) {
        expect(c.institution_type).toContain(item.row.institution_type);
      }
      expect(item.row.institution_type).not.toBe('mmo');
    });
    added(result.inserts.liabilities).forEach(item => {
      expect(c.liability_type).toContain(item.row.liability_type);
    });
    added(result.inserts.goals).forEach(item => {
      expect(c.goal_type).toContain(item.row.goal_type);
    });
    expect(c.employment_type).toContain(result.profilePatch.employment_type);
    expect(c.risk_tolerance).toContain(result.profilePatch.risk_tolerance);
  });
});

describe('does not duplicate existing names', () => {
  test('skips salary, housing, and emergency fund goal that are already there', () => {
    const result = plan(example, {
      profile: {
        full_name: 'Kalu Aja',
        age: 45,
        state: 'Abia',
        currency: 'NGN',
        employment_type: 'self_employed',
        risk_tolerance: 'aggressive',
        retirement_age: 55,
        onboarding_done: true,
      },
      incomeNames: ['salary'],
      expenses: [{ category: 'Housing', description: 'Rent' }],
      assetNames: ['Savings Account'],
      goalNames: ['Emergency Fund'],
      emergencyFund: { id: 'ef-1', current_balance: 50_000 },
      fiSaved: true,
    });

    expect(result.profilePatch).toEqual({});
    expect(result.profileLines.find(line => line.label === 'Full name').skip).toBe(true);
    expect(result.profileLines.find(line => line.label === 'Full name').detail).toContain('Kalu Aja');

    expect(result.inserts.income[0].skip).toBe(true);
    expect(result.inserts.income[0].reason).toBe('Already in your plan');
    expect(result.inserts.expenses.find(item => item.label === 'Housing').skip).toBe(true);
    expect(result.inserts.assets.find(item => item.label === 'Savings Account').skip).toBe(true);
    expect(result.inserts.goals.find(item => item.label === 'Emergency Fund').skip).toBe(true);
    expect(added(result.inserts.goals).map(item => item.label)).toEqual(['Retirement Savings']);
    expect(result.emergencyFund.action).toBe('skip');
    expect(result.fiLocal.write).toBe(false);
    expect(result.fiLocal.reason).toBe('Already saved on this device');
  });

  test('a second copy of the same name inside one workbook is not added twice', () => {
    const result = plan({
      schema_version: 1,
      assets: [
        { name: 'Savings Account', asset_type: 'savings', balance: 10 },
        { name: 'savings account', asset_type: 'savings', balance: 20 },
      ],
    });
    expect(added(result.inserts.assets)).toHaveLength(1);
    expect(result.inserts.assets[1].skip).toBe(true);
    expect(result.inserts.assets[1].reason).toBe('Repeated in this workbook');
  });
});

describe('constraint-safe normalisation', () => {
  test('mmo is stored as psb and a blank institution is omitted', () => {
    expect(map.normalizeInstitution('mmo')).toBe('psb');
    expect(map.normalizeInstitution('mobile money')).toBe('psb');
    expect(map.normalizeInstitution('')).toBeNull();
    expect(map.normalizeInstitution('mmо')).toBeNull();

    const result = plan({
      schema_version: 1,
      assets: [
        { name: 'Wallet', asset_type: 'savings', balance: 1000, institution_type: 'mmo' },
        { name: 'Cash', asset_type: 'savings', balance: 500, institution_type: '  ' },
      ],
    });
    expect(result.inserts.assets[0].row.institution_type).toBe('psb');
    expect(result.inserts.assets[1].row.institution_type).toBeUndefined();
  });

  test('goal, debt, and category aliases stay inside the live checks', () => {
    expect(map.normalizeGoalType('Pay Down Debt')).toBe('debt');
    expect(map.normalizeGoalType('vacation')).toBe('custom');
    expect(map.normalizeLiabilityType('car loan')).toBe('auto_loan');
    expect(map.normalizeCategory('housing')).toBe('Housing');
    expect(map.normalizeCategory('Spotify')).toBeNull();

    const result = plan({
      schema_version: 1,
      expenses: [
        { category: 'Housing', amount_monthly: 100000 },
        { category: 'housing', amount_monthly: 50000 },
        { category: 'Spotify', amount_monthly: 3000 },
        { category: 'Dining Out', amount_monthly: 0 },
        { category: 'Food', amount_monthly: -5 },
      ],
      debts: [
        { name: 'Family', liability_type: 'qard hasan', balance: 20000, apr: 0 },
        { name: 'Card', liability_type: 'credit card', balance: 10000, apr: 0.185 },
      ],
      goals: [
        { goal_name: 'Clear the card', goal_type: 'debt', target_amount: 10000, target_date: '2027-01-01' },
      ],
    });

    expect(added(result.inserts.expenses)).toHaveLength(2);
    expect(result.inserts.expenses[0].row.amount).toBe(15_000_000);
    expect(result.inserts.expenses[1].row.category).toBe('Other');
    expect(result.inserts.expenses[1].row.sub_category).toBe('Spotify');
    expect(result.inserts.liabilities[0].row).toMatchObject({
      liability_type: 'qard_hasan',
      is_interest_bearing: false,
      apr: 0,
    });
    expect(result.inserts.liabilities[1].row.apr).toBe(18.5);
    expect(result.inserts.goals[0].row.goal_type).toBe('debt');
    expect(map.CONSTRAINTS.goal_type).toContain('debt');
  });

  test('rejects a future schema version instead of guessing', () => {
    const result = plan({ schema_version: 2, income: { gross_monthly: 1 } });
    expect(result.error).toBeTruthy();
    expect(added(result.inserts.income)).toHaveLength(0);
  });

  test('uses pension gross when income gross is omitted', () => {
    const result = plan({
      schema_version: 1,
      pension: { monthly_gross: 200000, rsa_balance: 0, rsa_contribution_monthly: 36000 },
    });
    expect(added(result.inserts.income)[0].row.gross_amount).toBe(20_000_000);
    expect(added(result.inserts.assets)[0].row.notes).toContain('[rsa_contrib_monthly:3600000]');
  });

  test('caps pension at gross and leaves tax at zero when net is too high', () => {
    const result = plan({
      schema_version: 1,
      income: { gross_monthly: 100, pension_monthly: 250, net_monthly: 90 },
    });
    expect(result.inserts.income[0].row.pension_contrib).toBe(10_000);
    expect(result.inserts.income[0].row.paye_tax).toBe(0);
    expect(result.warnings.some(w => /capped/i.test(w))).toBe(true);
    expect(result.warnings.some(w => /tax was left at zero/i.test(w))).toBe(true);
  });
});
