-- ============================================================
-- Pul Planning — Migration 008
-- Shared Client / Student ID (Pul Planning and ClearNumber)
--
-- NOT applied by this commit. Run it in the Supabase SQL editor
-- for project Ola Financial (kwymfdbvfzexhckuaorh) before merging.
-- Contract and click-by-click steps: docs/client-number.md
--
-- Requires 007_clearnumber_handoff.sql (private helpers, handoff
-- table, origin check). One-time codes are unchanged: this file
-- replaces create/redeem only to store an optional ID beside the
-- code. Return JSON of those two RPCs is the same.
--
-- Canonical ID: CN- plus 6 characters from
-- ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0, O, 1, I).
-- The same rule is WPClearNumberId.canonical in js/clearnumber-id.js.
--
-- Idempotent. Safe to run twice.
-- Do not add schema "private" to the API exposed schemas.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname = 'clearnumber_payload_error'
  ) THEN
    RAISE EXCEPTION 'Apply 007_clearnumber_handoff.sql before 008_client_number.sql';
  END IF;
END $$;

-- ------------------------------------------------------------
-- Profile columns. Nullable until backfill, then NOT NULL.
-- ------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS client_number text,
  ADD COLUMN IF NOT EXISTS client_number_source text;

ALTER TABLE public.user_profiles
  ALTER COLUMN client_number_source SET DEFAULT 'generated';

COMMENT ON COLUMN public.user_profiles.client_number IS
  'Shared Client / Student ID. Canonical CN-XXXXXX. Same value on ClearNumber. See docs/client-number.md.';

COMMENT ON COLUMN public.user_profiles.client_number_source IS
  'generated: Pul assigned it. claimed: linked from a ClearNumber workbook ID.';

-- ------------------------------------------------------------
-- Workbook stored under an ID, so Pul can pull it later.
-- Direct API access is revoked. Functions below are the path.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clearnumber_records (
  client_number   text PRIMARY KEY,
  payload         jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  linked_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at       timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clearnumber_records_client_number_format'
      AND conrelid = 'public.clearnumber_records'::regclass
  ) THEN
    ALTER TABLE public.clearnumber_records
      ADD CONSTRAINT clearnumber_records_client_number_format
      CHECK (client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clearnumber_records_payload_object'
      AND conrelid = 'public.clearnumber_records'::regclass
  ) THEN
    ALTER TABLE public.clearnumber_records
      ADD CONSTRAINT clearnumber_records_payload_object
      CHECK (jsonb_typeof(payload) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clearnumber_records_updated
  ON public.clearnumber_records (updated_at);

CREATE INDEX IF NOT EXISTS idx_clearnumber_records_linked_user
  ON public.clearnumber_records (linked_user_id)
  WHERE linked_user_id IS NOT NULL;

COMMENT ON TABLE public.clearnumber_records IS
  'Latest ClearNumber workbook for a Client / Student ID. Plaintext ID, payload stays server-side.';

ALTER TABLE public.clearnumber_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clearnumber_records_no_select ON public.clearnumber_records;
DROP POLICY IF EXISTS clearnumber_records_no_insert ON public.clearnumber_records;
DROP POLICY IF EXISTS clearnumber_records_no_update ON public.clearnumber_records;
DROP POLICY IF EXISTS clearnumber_records_no_delete ON public.clearnumber_records;

CREATE POLICY clearnumber_records_no_select
  ON public.clearnumber_records
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY clearnumber_records_no_insert
  ON public.clearnumber_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY clearnumber_records_no_update
  ON public.clearnumber_records
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY clearnumber_records_no_delete
  ON public.clearnumber_records
  FOR DELETE TO anon, authenticated
  USING (false);

REVOKE ALL ON TABLE public.clearnumber_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.clearnumber_records TO postgres, service_role;

-- ------------------------------------------------------------
-- Canonical form. Must match js/clearnumber-id.js canonical().
-- Uppercase, strip non-alphanumerics, require CN + 6 alphabet
-- characters, return CN-XXXXXX.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.client_number_canonical(p_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  raw text;
BEGIN
  raw := upper(regexp_replace(coalesce(p_number, ''), '[^A-Za-z0-9]', '', 'g'));
  IF raw !~ '^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' THEN
    RETURN NULL;
  END IF;
  RETURN 'CN-' || substr(raw, 3, 6);
END;
$$;

CREATE OR REPLACE FUNCTION private.client_number_generate()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  body text := '';
  i int;
BEGIN
  bytes := extensions.gen_random_bytes(6);
  FOR i IN 0..5 LOOP
    body := body || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN 'CN-' || body;
END;
$$;

-- First valid ID on a workbook payload. Invalid values are ignored
-- so an old handoff still creates a code.
CREATE OR REPLACE FUNCTION private.payload_client_number(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  canon text;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RETURN NULL;
  END IF;

  canon := private.client_number_canonical(p_payload->>'client_number');
  IF canon IS NOT NULL THEN RETURN canon; END IF;

  canon := private.client_number_canonical(p_payload->>'student_id');
  IF canon IS NOT NULL THEN RETURN canon; END IF;

  IF jsonb_typeof(p_payload->'profile') = 'object' THEN
    canon := private.client_number_canonical(p_payload->'profile'->>'client_number');
    IF canon IS NOT NULL THEN RETURN canon; END IF;
    canon := private.client_number_canonical(p_payload->'profile'->>'student_id');
    IF canon IS NOT NULL THEN RETURN canon; END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- App updates cannot change the ID. Claim paths set
-- pul.client_number_write = on for the current transaction.
CREATE OR REPLACE FUNCTION private.assign_client_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  n text;
  i int;
BEGIN
  IF current_setting('pul.client_number_write', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.client_number := OLD.client_number;
      NEW.client_number_source := OLD.client_number_source;
      RETURN NEW;
    END IF;
    NEW.client_number := NULL;
    NEW.client_number_source := 'generated';
  END IF;

  IF NEW.client_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR i IN 1..8 LOOP
    n := private.client_number_generate();
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE client_number = n)
       AND NOT EXISTS (SELECT 1 FROM public.clearnumber_records WHERE client_number = n)
    THEN
      NEW.client_number := n;
      IF NEW.client_number_source IS NULL THEN
        NEW.client_number_source := 'generated';
      END IF;
      RETURN NEW;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'client_number_generation_failed'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_client_number ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_client_number
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.assign_client_number();

CREATE OR REPLACE FUNCTION private.backfill_client_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  n text;
  tries int;
  filled int := 0;
BEGIN
  PERFORM set_config('pul.client_number_write', 'on', true);

  FOR r IN
    SELECT user_id
    FROM public.user_profiles
    WHERE client_number IS NULL
    ORDER BY created_at NULLS LAST, user_id
  LOOP
    tries := 0;
    LOOP
      tries := tries + 1;
      IF tries > 8 THEN
        RAISE EXCEPTION 'client_number_generation_failed'
          USING ERRCODE = 'P0001';
      END IF;
      n := private.client_number_generate();
      IF EXISTS (SELECT 1 FROM public.user_profiles WHERE client_number = n) THEN
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.clearnumber_records WHERE client_number = n) THEN
        CONTINUE;
      END IF;
      UPDATE public.user_profiles
      SET client_number = n,
          client_number_source = COALESCE(NULLIF(client_number_source, ''), 'generated')
      WHERE user_id = r.user_id
        AND client_number IS NULL;
      IF FOUND THEN
        filled := filled + 1;
      END IF;
      EXIT;
    END LOOP;
  END LOOP;

  UPDATE public.user_profiles
  SET client_number_source = 'generated'
  WHERE client_number_source IS NULL
     OR client_number_source NOT IN ('generated', 'claimed');

  RETURN filled;
END;
$$;

-- ADD COLUMN takes ACCESS EXCLUSIVE for the rest of a SQL-editor
-- transaction, so sign-ups wait until backfill and NOT NULL commit.
-- Do not LOCK here: Postgres rejects LOCK outside an explicit
-- transaction, and this file is also applied statement by statement.
SELECT private.backfill_client_numbers();

ALTER TABLE public.user_profiles
  ALTER COLUMN client_number SET NOT NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN client_number_source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_client_number_format'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_client_number_format
      CHECK (client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_client_number_source_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_client_number_source_check
      CHECK (client_number_source IN ('generated', 'claimed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_client_number_uidx
  ON public.user_profiles (client_number);

-- ------------------------------------------------------------
-- Workbook upsert and claim. Claim never steals another profile.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.save_clearnumber_workbook(p_canon text, p_payload jsonb)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stamp timestamptz;
BEGIN
  IF p_canon IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.clearnumber_records (client_number, payload)
  VALUES (p_canon, p_payload)
  ON CONFLICT (client_number) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = now()
  RETURNING updated_at INTO stamp;

  RETURN stamp;
END;
$$;

CREATE OR REPLACE FUNCTION private.ensure_profile_client_number()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  source text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_authenticated');
  END IF;

  INSERT INTO public.user_profiles (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT client_number, client_number_source
  INTO existing, source
  FROM public.user_profiles
  WHERE user_id = uid;

  IF existing IS NULL THEN
    PERFORM set_config('pul.client_number_write', 'on', true);
    UPDATE public.user_profiles
    SET client_number = NULL
    WHERE user_id = uid
      AND client_number IS NULL;
    SELECT client_number, client_number_source
    INTO existing, source
    FROM public.user_profiles
    WHERE user_id = uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', existing IS NOT NULL,
    'status', CASE WHEN existing IS NULL THEN 'client_number_generation_failed' ELSE 'ok' END,
    'client_number', existing,
    'source', source
  );
END;
$$;

-- p_require_record: pull refuses an ID nobody has stored.
-- Redeem passes false after it has saved the workbook.
CREATE OR REPLACE FUNCTION private.apply_client_number(p_canon text, p_require_record boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  me_number text;
  me_source text;
  other uuid;
  rec_owner uuid;
  has_rec boolean := false;
  status text;
  new_source text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_authenticated');
  END IF;
  IF p_canon IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_number');
  END IF;

  has_rec := EXISTS (
    SELECT 1 FROM public.clearnumber_records WHERE client_number = p_canon
  );

  SELECT linked_user_id INTO rec_owner
  FROM public.clearnumber_records
  WHERE client_number = p_canon;

  SELECT user_id INTO other
  FROM public.user_profiles
  WHERE client_number = p_canon
    AND user_id <> uid;

  IF other IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'number_in_use');
  END IF;
  IF rec_owner IS NOT NULL AND rec_owner <> uid THEN
    RETURN jsonb_build_object('ok', false, 'status', 'number_in_use');
  END IF;

  SELECT client_number, client_number_source
  INTO me_number, me_source
  FROM public.user_profiles
  WHERE user_id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'no_profile');
  END IF;

  IF me_number = p_canon THEN
    status := 'already_linked';
    new_source := COALESCE(me_source, 'generated');
    IF has_rec AND new_source IS DISTINCT FROM 'claimed' THEN
      new_source := 'claimed';
      PERFORM set_config('pul.client_number_write', 'on', true);
      UPDATE public.user_profiles
      SET client_number_source = 'claimed'
      WHERE user_id = uid;
    END IF;
  ELSIF COALESCE(me_source, 'generated') = 'claimed' AND me_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'number_already_set',
      'client_number', me_number
    );
  ELSIF p_require_record AND NOT has_rec THEN
    RETURN jsonb_build_object('ok', false, 'status', 'number_not_found');
  ELSE
    status := 'linked';
    new_source := 'claimed';
    PERFORM set_config('pul.client_number_write', 'on', true);
    UPDATE public.clearnumber_records
    SET linked_user_id = NULL,
        linked_at = NULL
    WHERE linked_user_id = uid
      AND client_number IS DISTINCT FROM p_canon;
    UPDATE public.user_profiles
    SET client_number = p_canon,
        client_number_source = 'claimed'
    WHERE user_id = uid;
  END IF;

  IF has_rec THEN
    UPDATE public.clearnumber_records
    SET linked_user_id = uid,
        linked_at = COALESCE(linked_at, now())
    WHERE client_number = p_canon
      AND (linked_user_id IS NULL OR linked_user_id = uid);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', status,
    'client_number', p_canon,
    'source', COALESCE(new_source, 'claimed')
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'status', 'number_in_use');
END;
$$;

-- Best-effort. Never raises, so a handoff code still succeeds.
CREATE OR REPLACE FUNCTION private.note_clearnumber_client_number(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon text;
BEGIN
  canon := private.payload_client_number(p_payload);
  IF canon IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE client_number = canon
        AND user_id <> auth.uid()
    ) THEN
      RETURN;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.clearnumber_records
      WHERE client_number = canon
        AND linked_user_id IS NOT NULL
        AND linked_user_id <> auth.uid()
    ) THEN
      RETURN;
    END IF;
  END IF;

  PERFORM private.save_clearnumber_workbook(canon, p_payload);

  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  PERFORM private.apply_client_number(canon, false);
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- ------------------------------------------------------------
-- ClearNumber origin: register and lookup. No profile data.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.register_clearnumber_record(p_client_number text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon text;
  problem text;
  recent int;
  stamp timestamptz;
BEGIN
  IF NOT private.clearnumber_origin_allowed() THEN
    RAISE EXCEPTION 'origin_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  canon := private.client_number_canonical(p_client_number);
  IF canon IS NULL THEN
    RAISE EXCEPTION 'invalid_number'
      USING ERRCODE = 'P0001';
  END IF;

  problem := private.clearnumber_payload_error(p_payload);
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_payload'
      USING ERRCODE = 'P0001', DETAIL = problem;
  END IF;

  SELECT count(*) INTO recent
  FROM public.clearnumber_records
  WHERE updated_at > now() - interval '10 minutes';

  IF recent >= 500 THEN
    RAISE EXCEPTION 'rate_limited'
      USING ERRCODE = 'P0001';
  END IF;

  stamp := private.save_clearnumber_workbook(canon, p_payload);
  RETURN jsonb_build_object(
    'client_number', canon,
    'updated_at', stamp
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.lookup_client_number(p_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon text;
  has_profile boolean;
  has_workbook boolean;
  linked boolean;
BEGIN
  IF NOT private.clearnumber_origin_allowed() THEN
    RAISE EXCEPTION 'origin_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  canon := private.client_number_canonical(p_number);
  IF canon IS NULL THEN
    RAISE EXCEPTION 'invalid_number'
      USING ERRCODE = 'P0001';
  END IF;

  has_profile := EXISTS (
    SELECT 1 FROM public.user_profiles WHERE client_number = canon
  );
  has_workbook := EXISTS (
    SELECT 1 FROM public.clearnumber_records WHERE client_number = canon
  );
  linked := has_profile OR EXISTS (
    SELECT 1 FROM public.clearnumber_records
    WHERE client_number = canon
      AND linked_user_id IS NOT NULL
  );

  RETURN jsonb_build_object(
    'client_number', canon,
    'exists', has_profile OR has_workbook,
    'has_workbook', has_workbook,
    'linked', linked
  );
END;
$$;

-- ------------------------------------------------------------
-- Signed-in Pul user: show my ID, or link one and return the
-- workbook for the existing import mapper.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.ensure_my_client_number()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ensured jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '28000';
  END IF;

  ensured := private.ensure_profile_client_number();
  IF COALESCE((ensured->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '%', COALESCE(ensured->>'status', 'client_number_generation_failed')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'client_number', ensured->>'client_number',
    'source', ensured->>'source'
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.pull_clearnumber_number(p_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon text;
  applied jsonb;
  rec public.clearnumber_records%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '28000';
  END IF;

  canon := private.client_number_canonical(p_number);
  IF canon IS NULL THEN
    RAISE EXCEPTION 'invalid_number'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM private.ensure_profile_client_number();
  applied := private.apply_client_number(canon, true);

  IF COALESCE((applied->>'ok')::boolean, false) IS NOT TRUE THEN
    IF applied->>'status' = 'not_authenticated' THEN
      RAISE EXCEPTION 'not_authenticated'
        USING ERRCODE = '28000';
    END IF;
    IF NULLIF(applied->>'client_number', '') IS NULL THEN
      RAISE EXCEPTION '%', applied->>'status'
        USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION '%', applied->>'status'
      USING ERRCODE = 'P0001',
            DETAIL = applied->>'client_number';
  END IF;

  SELECT * INTO rec
  FROM public.clearnumber_records
  WHERE client_number = canon;

  RETURN jsonb_build_object(
    'client_number', applied->>'client_number',
    'status', applied->>'status',
    'source', applied->>'source',
    'has_workbook', rec.client_number IS NOT NULL,
    'payload', CASE WHEN rec.client_number IS NOT NULL THEN rec.payload ELSE NULL END,
    'updated_at', rec.updated_at
  );
END;
$$;

-- ------------------------------------------------------------
-- Handoff create / redeem. Same arguments and success JSON as
-- 007. A valid ID on the payload is stored for a later pull.
-- A bad or missing ID does not fail the code.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.create_clearnumber_handoff(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  problem text;
  recent int;
  code text;
  hash text;
  expires_at timestamptz;
  i int;
BEGIN
  IF NOT private.clearnumber_origin_allowed() THEN
    RAISE EXCEPTION 'origin_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  problem := private.clearnumber_payload_error(p_payload);
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_payload'
      USING ERRCODE = 'P0001', DETAIL = problem;
  END IF;

  SELECT count(*) INTO recent
  FROM public.clearnumber_handoffs
  WHERE created_at > now() - interval '10 minutes';

  IF recent >= 500 THEN
    RAISE EXCEPTION 'rate_limited'
      USING ERRCODE = 'P0001';
  END IF;

  FOR i IN 1..5 LOOP
    code := private.clearnumber_random_code();
    hash := private.clearnumber_code_hash(code);
    expires_at := now() + interval '24 hours';
    BEGIN
      INSERT INTO public.clearnumber_handoffs (code_hash, payload, expires_at)
      VALUES (hash, p_payload, expires_at);
      PERFORM private.note_clearnumber_client_number(p_payload);
      RETURN jsonb_build_object(
        'code', code,
        'expires_at', expires_at,
        'redirect_url', 'https://pul.llc/#/import?code=' || code
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RAISE EXCEPTION 'code_generation_failed'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION private.redeem_clearnumber_handoff(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized text;
  rec public.clearnumber_handoffs%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '28000';
  END IF;

  normalized := private.clearnumber_normalize_code(p_code);
  IF length(normalized) < 8 OR length(normalized) > 64 THEN
    RAISE EXCEPTION 'code_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clearnumber_handoffs
  SET redeemed_at = now(),
      redeemed_by = auth.uid()
  WHERE code_hash = private.clearnumber_code_hash(normalized)
    AND redeemed_at IS NULL
    AND expires_at > now()
  RETURNING * INTO rec;

  IF FOUND THEN
    PERFORM private.note_clearnumber_client_number(rec.payload);
    RETURN jsonb_build_object(
      'payload', rec.payload,
      'expires_at', rec.expires_at
    );
  END IF;

  SELECT * INTO rec
  FROM public.clearnumber_handoffs
  WHERE code_hash = private.clearnumber_code_hash(normalized);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'code_not_found'
      USING ERRCODE = 'P0002';
  END IF;
  IF rec.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'code_used'
      USING ERRCODE = 'P0001';
  END IF;
  RAISE EXCEPTION 'code_expired'
    USING ERRCODE = 'P0001';
END;
$$;

-- ------------------------------------------------------------
-- Public wrappers. SECURITY INVOKER. They only forward.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_clearnumber_record(p_client_number text, p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.register_clearnumber_record(p_client_number, p_payload);
$$;

CREATE OR REPLACE FUNCTION public.lookup_client_number(p_number text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.lookup_client_number(p_number);
$$;

CREATE OR REPLACE FUNCTION public.ensure_my_client_number()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.ensure_my_client_number();
$$;

CREATE OR REPLACE FUNCTION public.pull_clearnumber_number(p_number text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.pull_clearnumber_number(p_number);
$$;

REVOKE ALL ON FUNCTION private.client_number_canonical(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.client_number_generate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.payload_client_number(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.assign_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.backfill_client_numbers() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.save_clearnumber_workbook(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ensure_profile_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.apply_client_number(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.note_clearnumber_client_number(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.register_clearnumber_record(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.lookup_client_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.ensure_my_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pull_clearnumber_number(text) FROM PUBLIC, anon, authenticated;

-- The profile trigger runs as the signed-in role, which needs EXECUTE.
GRANT EXECUTE ON FUNCTION private.assign_client_number() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.register_clearnumber_record(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION private.lookup_client_number(text) TO anon;
GRANT EXECUTE ON FUNCTION private.ensure_my_client_number() TO authenticated;
GRANT EXECUTE ON FUNCTION private.pull_clearnumber_number(text) TO authenticated;
-- note/save/apply run inside definer functions. Redeem and create are
-- already granted by 007. Re-assert those grants so a replace keeps them.
GRANT EXECUTE ON FUNCTION private.create_clearnumber_handoff(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION private.redeem_clearnumber_handoff(text) TO authenticated;

REVOKE ALL ON FUNCTION public.register_clearnumber_record(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lookup_client_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_my_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pull_clearnumber_number(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_clearnumber_record(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_client_number(text) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_client_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pull_clearnumber_number(text) TO authenticated;

COMMENT ON FUNCTION public.pull_clearnumber_number(text) IS
  'Link the signed-in profile to a ClearNumber # and return its workbook payload. See docs/client-number.md.';

COMMENT ON FUNCTION public.lookup_client_number(text) IS
  'ClearNumber origin only. Returns whether a canonical Client / Student ID exists. No profile fields.';

COMMENT ON FUNCTION public.register_clearnumber_record(text, jsonb) IS
  'ClearNumber origin only. Upsert the workbook stored for a Client / Student ID.';

COMMENT ON FUNCTION public.ensure_my_client_number() IS
  'Return the signed-in profile Client / Student ID, generating one when the row has none.';

NOTIFY pgrst, 'reload schema';
