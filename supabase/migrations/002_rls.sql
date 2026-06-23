-- ============================================================
-- WealthPath — Row Level Security Policies
-- Migration 002
-- Ensures users can ONLY access their own data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_fund     ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_snapshots  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INCOME ENTRIES
-- ============================================================
CREATE POLICY "income_select" ON income_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "income_insert" ON income_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_update" ON income_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_delete" ON income_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- EXPENSE ENTRIES
-- ============================================================
CREATE POLICY "expense_select" ON expense_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expense_insert" ON expense_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_update" ON expense_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expense_delete" ON expense_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE POLICY "assets_select" ON assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assets_insert" ON assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assets_update" ON assets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assets_delete" ON assets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- LIABILITIES
-- ============================================================
CREATE POLICY "liabilities_select" ON liabilities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "liabilities_insert" ON liabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "liabilities_update" ON liabilities
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "liabilities_delete" ON liabilities
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FINANCIAL GOALS
-- ============================================================
CREATE POLICY "goals_select" ON financial_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert" ON financial_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update" ON financial_goals
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete" ON financial_goals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INSURANCE POLICIES
-- ============================================================
CREATE POLICY "insurance_select" ON insurance_policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insurance_insert" ON insurance_policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insurance_update" ON insurance_policies
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insurance_delete" ON insurance_policies
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- EMERGENCY FUND
-- ============================================================
CREATE POLICY "emergency_fund_select" ON emergency_fund
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "emergency_fund_insert" ON emergency_fund
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emergency_fund_update" ON emergency_fund
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emergency_fund_delete" ON emergency_fund
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- MONTHLY SNAPSHOTS
-- ============================================================
CREATE POLICY "snapshots_select" ON monthly_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "snapshots_insert" ON monthly_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "snapshots_update" ON monthly_snapshots
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "snapshots_delete" ON monthly_snapshots
  FOR DELETE USING (auth.uid() = user_id);
