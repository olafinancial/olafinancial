-- ============================================================
-- OlaFinancial — Migration 005
-- Email Digest preferences on user_profiles
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS digest_enabled   BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS digest_frequency TEXT      DEFAULT 'weekly'
    CHECK (digest_frequency IN ('daily','weekly','monthly')),
  ADD COLUMN IF NOT EXISTS digest_email     TEXT,           -- defaults to auth email if NULL
  ADD COLUMN IF NOT EXISTS digest_last_sent TIMESTAMPTZ;   -- tracks when last digest was sent
