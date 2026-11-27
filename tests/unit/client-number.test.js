/**
 * Contract checks for the shared Client / Student ID migration.
 * The SQL is applied by hand in the Ola Financial project. These
 * tests lock the shape ClearNumber mirrors.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/008_client_number.sql'), 'utf8');
const handoff = fs.readFileSync(path.join(root, 'supabase/migrations/007_clearnumber_handoff.sql'), 'utf8');

describe('client number migration', () => {
  test('backfills missing profiles and keeps a unique index plus a generator', () => {
    expect(sql).toContain('WHERE client_number IS NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_client_number');
    expect(sql).toContain('private.issue_client_number');
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF client_number');
    expect(sql).toContain('ALTER COLUMN client_number SET NOT NULL');
    expect(sql).toContain("CHECK (client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS client_number');
  });

  test('does not drop handoff storage or change the code-only redirect', () => {
    expect(sql).not.toMatch(/DROP TABLE[^;]*clearnumber_handoffs/i);
    expect(sql).toContain("'redirect_url', 'https://pul.llc/#/import?code=' || code");
    expect(sql).toContain('private.clearnumber_code_hash');
    expect(sql).toContain('private.remember_clearnumber_workbook');
    expect(handoff).toContain('FUNCTION public.redeem_clearnumber_handoff');
  });

  test('exposes lookup, register, publish, and link with the same grants on a re-run', () => {
    expect(sql).toContain('FUNCTION public.lookup_client_number(p_client_number text)');
    expect(sql).toContain('FUNCTION public.register_clearnumber_client(p_client_number text)');
    expect(sql).toContain('FUNCTION public.publish_clearnumber_workbook(p_client_number text, p_payload jsonb)');
    expect(sql).toContain('FUNCTION public.link_clearnumber_client(p_client_number text)');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.link_clearnumber_client(text) TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.register_clearnumber_client(text) TO anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.publish_clearnumber_workbook(text, jsonb) TO anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.lookup_client_number(text) TO anon, authenticated');
    expect(sql).not.toContain('GRANT EXECUTE ON FUNCTION public.link_clearnumber_client(text) TO anon');
  });

  test('keeps the registry off the Data API and refuses another account\'s number', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON TABLE public.client_identities FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('REVOKE ALL ON TABLE public.clearnumber_workbooks FROM PUBLIC, anon, authenticated');
    expect(sql).toContain("RAISE EXCEPTION 'client_number_taken'");
    expect(sql).toContain("RAISE EXCEPTION 'client_number_not_found'");
    expect(sql).toContain('Do not add schema "private"');
  });

  test('is written so a second run does not fail on existing objects', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.client_identities');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.clearnumber_workbooks');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION private.normalize_client_number');
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_user_profiles_client_number');
    expect(sql).toContain('DROP POLICY IF EXISTS client_identities_no_select');
    expect(sql).toContain("conname = 'user_profiles_client_number_format'");
    expect(sql).toContain("conname = 'user_profiles_client_number_fkey'");
  });
});
