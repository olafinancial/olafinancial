-- ============================================================
-- WealthPath Financial HealthCheck Platform
-- Database Schema — Migration 001
-- PostgreSQL / Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  age             INTEGER CHECK (age > 0 AND age < 120),
  state           TEXT,                      -- Nigerian state
  employment_type TEXT CHECK (employment_type IN ('salaried','self_employed','business_owner','retired','student','other')),
  dependents      INTEGER DEFAULT 0,
  risk_tolerance  TEXT CHECK (risk_tolerance IN ('conservative','moderate','aggressive')),
  retirement_age  INTEGER DEFAULT 60 CHECK (retirement_age >= 18 AND retirement_age <= 100),
  currency        TEXT DEFAULT 'NGN',
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- INCOME ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS income_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_type     TEXT NOT NULL CHECK (income_type IN ('active','passive','investment')),
  source_name     TEXT NOT NULL,
  gross_amount    BIGINT NOT NULL CHECK (gross_amount >= 0),  -- stored in kobo (₦ × 100)
  frequency       TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','annual','one_time')),
  -- Deductions (stored in kobo)
  paye_tax        BIGINT DEFAULT 0,
  pension_contrib BIGINT DEFAULT 0,          -- employee 8% of emoluments
  nhf_contrib     BIGINT DEFAULT 0,          -- 2.5% of basic salary
  other_deductions BIGINT DEFAULT 0,
  deduction_notes TEXT,
  -- Period
  period_month    DATE NOT NULL,             -- first day of the month this entry covers
  start_date      DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSE ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_date    DATE NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),  -- in kobo
  category        TEXT NOT NULL,
  sub_category    TEXT,
  is_discretionary BOOLEAN NOT NULL DEFAULT FALSE,
  description     TEXT,
  merchant        TEXT,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_freq TEXT CHECK (recurrence_freq IN ('daily','weekly','monthly','quarterly','annual')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_name          TEXT NOT NULL,
  asset_type          TEXT NOT NULL,         -- e.g. 'savings','fixed_deposit','equity','property','vehicle'
  is_income_generating BOOLEAN NOT NULL DEFAULT FALSE,
  institution_name    TEXT,                  -- bank / broker name
  institution_type    TEXT CHECK (institution_type IN ('dmb','mfb','mmо','investment','other')),
  open_balance        BIGINT DEFAULT 0,      -- in kobo
  interest_rate       NUMERIC(8,4) DEFAULT 0, -- annual % rate
  tenor_months        INTEGER,
  close_balance       BIGINT DEFAULT 0,      -- in kobo
  period_month        DATE NOT NULL,
  pfa_name            TEXT,                  -- for RSA/retirement accounts
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LIABILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS liabilities (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liability_name      TEXT NOT NULL,
  liability_type      TEXT NOT NULL,         -- 'mortgage','personal_loan','auto_loan','credit_card','student_loan','other'
  is_interest_bearing BOOLEAN NOT NULL DEFAULT TRUE,
  lender_name         TEXT,
  open_balance        BIGINT DEFAULT 0,      -- in kobo
  apr                 NUMERIC(8,4) DEFAULT 0, -- annual percentage rate
  monthly_payment     BIGINT DEFAULT 0,      -- in kobo
  close_balance       BIGINT DEFAULT 0,      -- in kobo
  period_month        DATE NOT NULL,
  original_amount     BIGINT DEFAULT 0,
  start_date          DATE,
  expected_end_date   DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name           TEXT NOT NULL,
  goal_type           TEXT CHECK (goal_type IN ('retirement','mortgage','college','emergency','custom')),
  target_amount       BIGINT NOT NULL,       -- in kobo
  target_date         DATE NOT NULL,
  current_savings     BIGINT DEFAULT 0,      -- in kobo (present value)
  expected_return_rate NUMERIC(6,4) DEFAULT 0.10, -- annual decimal rate
  monthly_contribution BIGINT DEFAULT 0,    -- current monthly contribution in kobo
  is_completed        BOOLEAN DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSURANCE POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type     TEXT NOT NULL CHECK (policy_type IN ('life','health','home','vehicle','other')),
  insurer_name    TEXT,
  policy_number   TEXT,
  sum_assured     BIGINT DEFAULT 0,          -- in kobo
  annual_premium  BIGINT DEFAULT 0,          -- in kobo
  coverage_start  DATE,
  coverage_end    DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMERGENCY FUND
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_fund (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance BIGINT DEFAULT 0,          -- in kobo
  account_name    TEXT,
  institution_name TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- MONTHLY SNAPSHOTS (trend data)
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month        DATE NOT NULL,          -- first day of month
  net_worth           BIGINT DEFAULT 0,       -- total assets - total liabilities (kobo)
  total_assets        BIGINT DEFAULT 0,
  total_liabilities   BIGINT DEFAULT 0,
  total_income        BIGINT DEFAULT 0,
  total_expenses      BIGINT DEFAULT 0,
  net_cash_flow       BIGINT DEFAULT 0,
  passive_income_amt  BIGINT DEFAULT 0,
  passive_income_pct  NUMERIC(6,2) DEFAULT 0, -- % of total income
  emergency_fund_bal  BIGINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_month)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_income_user_period    ON income_entries(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_expense_user_date     ON expense_entries(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_asset_user_period     ON assets(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_liability_user_period ON liabilities(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_snapshot_user_period  ON monthly_snapshots(user_id, period_month);

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_income_updated_at
  BEFORE UPDATE ON income_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expense_updated_at
  BEFORE UPDATE ON expense_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_asset_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_liability_updated_at
  BEFORE UPDATE ON liabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
