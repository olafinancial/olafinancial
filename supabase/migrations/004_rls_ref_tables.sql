-- ============================================================
-- OlaFinancial — Migration 004
-- Fix: Enable RLS on public reference tables
--
-- These tables are read-only lookup data (Nigerian states, banks,
-- PFAs, expense categories). They contain no user PII.
-- Policy: any authenticated user may SELECT; no client writes allowed.
-- ============================================================

-- ── ref_pfas (Pension Fund Administrators list) ─────────────
ALTER TABLE public.ref_pfas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_pfas_public_read"
  ON public.ref_pfas
  FOR SELECT
  TO authenticated
  USING (true);

-- ── ref_nigerian_states ──────────────────────────────────────
ALTER TABLE public.ref_nigerian_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_nigerian_states_public_read"
  ON public.ref_nigerian_states
  FOR SELECT
  TO authenticated
  USING (true);

-- ── ref_expense_categories ───────────────────────────────────
ALTER TABLE public.ref_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_expense_categories_public_read"
  ON public.ref_expense_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ── ref_banks ────────────────────────────────────────────────
ALTER TABLE public.ref_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_banks_public_read"
  ON public.ref_banks
  FOR SELECT
  TO authenticated
  USING (true);

-- ── Verification query (run after applying to confirm) ───────
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('ref_pfas','ref_nigerian_states','ref_expense_categories','ref_banks');
-- Expected: rowsecurity = true for all 4 rows.
