-- ============================================================
-- Pul Planning — Migration 006
-- Align check constraints with the values the app UI sends.
--
-- DO NOT run this against production until you have reviewed it.
-- It does not delete financial rows. It only:
--   1. rewrites a few legacy institution / frequency / policy codes
--   2. replaces CHECK constraints so the new codes are allowed
--
-- How to apply in Supabase (project "Ola Financial"):
--   1. Open https://supabase.com/dashboard and select the project
--      (ref kwymfdbvfzexhckuaorh).
--   2. Left sidebar → SQL Editor → New query.
--   3. Paste this entire file and click Run.
--   4. Confirm "Success". If a constraint name differs, the
--      DROP CONSTRAINT IF EXISTS lines are safe to re-run.
--   5. Spot-check Table Editor:
--        financial_goals.goal_type accepts debt, investment,
--        travel, business, spend (plus the original five).
--        income_entries.frequency accepts biweekly, semiannual.
--        expense_entries.recurrence_freq accepts biweekly, custom.
--        assets.institution_type accepts psb (Mobile Money) and
--        no longer uses the Cyrillic "о" spelling of mmo.
--        insurance_policies.policy_type accepts takaful.
--   6. In the app, add a "Pay Down Debt" goal and a Mobile Money
--      asset. Both should save.
--
-- Safe to run more than once.
-- ============================================================

-- ── financial_goals.goal_type ───────────────────────────────
-- Was: retirement, mortgage, college, emergency, custom
-- UI also offers: debt, investment, travel, business, spend
ALTER TABLE public.financial_goals
  DROP CONSTRAINT IF EXISTS financial_goals_goal_type_check;

ALTER TABLE public.financial_goals
  ADD CONSTRAINT financial_goals_goal_type_check
  CHECK (goal_type IS NULL OR goal_type IN (
    'retirement',
    'mortgage',
    'college',
    'emergency',
    'custom',
    'debt',
    'investment',
    'travel',
    'business',
    'spend'
  ));

-- ── income_entries.frequency ────────────────────────────────
-- Was: monthly, quarterly, annual, one_time
-- UI also offers: biweekly, semiannual
UPDATE public.income_entries
SET frequency = 'biweekly'
WHERE frequency IN ('bi-weekly', 'bi_weekly');

UPDATE public.income_entries
SET frequency = 'semiannual'
WHERE frequency IN ('semi-annual', 'semi_annual', 'semiannually');

ALTER TABLE public.income_entries
  DROP CONSTRAINT IF EXISTS income_entries_frequency_check;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_frequency_check
  CHECK (frequency IN (
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'semiannual',
    'annual',
    'one_time'
  ));

-- ── expense_entries.recurrence_freq ─────────────────────────
-- Was: daily, weekly, monthly, quarterly, annual
-- UI also offers: Bi-weekly, Custom (and labels Annual as "annually")
UPDATE public.expense_entries
SET recurrence_freq = 'biweekly'
WHERE recurrence_freq IN ('bi-weekly', 'bi_weekly');

UPDATE public.expense_entries
SET recurrence_freq = 'annual'
WHERE recurrence_freq IN ('annually', 'yearly');

UPDATE public.expense_entries
SET recurrence_freq = 'custom'
WHERE recurrence_freq LIKE 'custom:%';

ALTER TABLE public.expense_entries
  DROP CONSTRAINT IF EXISTS expense_entries_recurrence_freq_check;

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_recurrence_freq_check
  CHECK (recurrence_freq IS NULL OR recurrence_freq IN (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'annual',
    'custom'
  ));

-- ── assets.institution_type ─────────────────────────────────
-- Was: dmb, mfb, investment, other, and 'mmо' with a Cyrillic о
--     (U+043E) instead of a Latin o. That value never matched the
--     UI's Latin 'mmo', so Mobile Money could not be saved.
-- UI "Not Applicable" is NULL. UI "Mobile Money (PSB)" is 'psb',
-- the same code ref_banks.type already uses.
UPDATE public.assets
SET institution_type = NULL
WHERE institution_type IS NOT NULL
  AND btrim(institution_type) = '';

UPDATE public.assets
SET institution_type = 'psb'
WHERE institution_type IS NOT NULL
  AND (
    lower(replace(replace(institution_type, chr(1086), 'o'), chr(1054), 'o')) IN ('mmo', 'psb')
  );

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_institution_type_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_institution_type_check
  CHECK (institution_type IS NULL OR institution_type IN (
    'dmb',
    'mfb',
    'psb',
    'investment',
    'other'
  ));

-- ── insurance_policies.policy_type ──────────────────────────
-- Was: life, health, home, vehicle, other
-- UI used to send motor, property, and takaful.
UPDATE public.insurance_policies
SET policy_type = 'vehicle'
WHERE policy_type IN ('motor', 'auto', 'car');

UPDATE public.insurance_policies
SET policy_type = 'home'
WHERE policy_type IN ('property', 'homeowners');

ALTER TABLE public.insurance_policies
  DROP CONSTRAINT IF EXISTS insurance_policies_policy_type_check;

ALTER TABLE public.insurance_policies
  ADD CONSTRAINT insurance_policies_policy_type_check
  CHECK (policy_type IN (
    'life',
    'health',
    'home',
    'vehicle',
    'takaful',
    'other'
  ));
