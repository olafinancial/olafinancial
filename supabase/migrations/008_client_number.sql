-- ============================================================
-- Pul Planning — Migration 008
-- Shared Client / Student ID (ClearNumber #)
--
-- NOT applied by this commit. Run it in the Supabase SQL editor
-- for project Ola Financial (kwymfdbvfzexhckuaorh) AFTER migration
-- 007_clearnumber_handoff.sql, and before merging.
-- Contract and click-by-click steps: docs/client-number.md
--
-- Every user_profiles row gets one stable id:
--   CN- + 8 characters from ABCDEFGHJKLMNPQRSTUVWXYZ23456789
-- Example: CN-K7M2P4QX
-- The same string is the ClearNumber #. One-time handoff codes
-- are unchanged (still 12 characters, still hashed, still single use).
--
-- Do not add schema "private" to the API exposed schemas.
-- client_identities and clearnumber_workbooks are not Data API
-- tables. Signed-in Pul users and the ClearNumber origin talk to
-- them only through the functions at the bottom of this file.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, anon, authenticated;

-- ------------------------------------------------------------
-- Registry. One row per issued number. Pul and ClearNumber
-- both write here. The plaintext number is the shared id.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_identities (
  client_number  text PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source         text NOT NULL DEFAULT 'pul',
  created_at     timestamptz NOT NULL DEFAULT now(),
  claimed_at     timestamptz,
  superseded_at  timestamptz,
  retired_at     timestamptz,
  CONSTRAINT client_identities_source
    CHECK (source IN ('pul', 'clearnumber')),
  CONSTRAINT client_identities_format
    CHECK (client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS client_identities_one_active_user
  ON public.client_identities (user_id)
  WHERE user_id IS NOT NULL
    AND superseded_at IS NULL
    AND retired_at IS NULL;

CREATE INDEX IF NOT EXISTS client_identities_created
  ON public.client_identities (created_at);

COMMENT ON TABLE public.client_identities IS
  'Shared Client / Student IDs. Canonical form is CN- plus 8 unambiguous characters. ClearNumber looks up the same value.';

-- Latest workbook for a number. Separate from one-time handoff codes.
CREATE TABLE IF NOT EXISTS public.clearnumber_workbooks (
  client_number  text PRIMARY KEY REFERENCES public.client_identities (client_number) ON DELETE CASCADE,
  payload        jsonb NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clearnumber_workbooks_payload_object
    CHECK (jsonb_typeof(payload) = 'object')
);

COMMENT ON TABLE public.clearnumber_workbooks IS
  'Latest ClearNumber workbook for a Client / Student ID. Not a one-time code.';

ALTER TABLE public.client_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearnumber_workbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_identities_no_select ON public.client_identities;
DROP POLICY IF EXISTS client_identities_no_insert ON public.client_identities;
DROP POLICY IF EXISTS client_identities_no_update ON public.client_identities;
DROP POLICY IF EXISTS client_identities_no_delete ON public.client_identities;

CREATE POLICY client_identities_no_select
  ON public.client_identities FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY client_identities_no_insert
  ON public.client_identities FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY client_identities_no_update
  ON public.client_identities FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY client_identities_no_delete
  ON public.client_identities FOR DELETE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS clearnumber_workbooks_no_select ON public.clearnumber_workbooks;
DROP POLICY IF EXISTS clearnumber_workbooks_no_insert ON public.clearnumber_workbooks;
DROP POLICY IF EXISTS clearnumber_workbooks_no_update ON public.clearnumber_workbooks;
DROP POLICY IF EXISTS clearnumber_workbooks_no_delete ON public.clearnumber_workbooks;

CREATE POLICY clearnumber_workbooks_no_select
  ON public.clearnumber_workbooks FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY clearnumber_workbooks_no_insert
  ON public.clearnumber_workbooks FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY clearnumber_workbooks_no_update
  ON public.clearnumber_workbooks FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY clearnumber_workbooks_no_delete
  ON public.clearnumber_workbooks FOR DELETE TO anon, authenticated
  USING (false);

REVOKE ALL ON TABLE public.client_identities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.clearnumber_workbooks FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.client_identities TO postgres, service_role;
GRANT ALL ON TABLE public.clearnumber_workbooks TO postgres, service_role;

-- ------------------------------------------------------------
-- Profile column. Nullable until the backfill below finishes.
-- ------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS client_number text;

COMMENT ON COLUMN public.user_profiles.client_number IS
  'Shared Client / Student ID (CN-XXXXXXXX). Same value on Pul Planning and ClearNumber. Changed only by link_clearnumber_client.';

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.normalize_client_number(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  compact text;
BEGIN
  compact := upper(regexp_replace(coalesce(p_value, ''), '[^A-Za-z0-9]', '', 'g'));
  IF compact !~ '^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' THEN
    RETURN NULL;
  END IF;
  RETURN 'CN-' || substr(compact, 3);
END;
$$;

CREATE OR REPLACE FUNCTION private.generate_client_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  out text := '';
  i int;
BEGIN
  bytes := extensions.gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN 'CN-' || out;
END;
$$;

-- Inserts a fresh number. Retries on a number collision.
-- If this user already has an active number, returns that one.
CREATE OR REPLACE FUNCTION private.issue_client_number(p_user_id uuid, p_source text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  candidate text;
  existing text;
  i int;
BEGIN
  IF p_source IS DISTINCT FROM 'pul' AND p_source IS DISTINCT FROM 'clearnumber' THEN
    RAISE EXCEPTION 'invalid_client_source'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT client_number INTO existing
    FROM public.client_identities
    WHERE user_id = p_user_id
      AND superseded_at IS NULL
      AND retired_at IS NULL;
    IF existing IS NOT NULL THEN
      RETURN existing;
    END IF;
  END IF;

  FOR i IN 1..8 LOOP
    candidate := private.generate_client_number();
    BEGIN
      INSERT INTO public.client_identities (client_number, user_id, source, claimed_at)
      VALUES (
        candidate,
        p_user_id,
        p_source,
        CASE WHEN p_user_id IS NULL THEN NULL ELSE now() END
      );
      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      IF p_user_id IS NOT NULL THEN
        SELECT client_number INTO existing
        FROM public.client_identities
        WHERE user_id = p_user_id
          AND superseded_at IS NULL
          AND retired_at IS NULL;
        IF existing IS NOT NULL THEN
          RETURN existing;
        END IF;
      END IF;
    END;
  END LOOP;

  RAISE EXCEPTION 'client_number_generation_failed'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION private.clearnumber_new_id_rate_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) < 500
  FROM public.client_identities
  WHERE source = 'clearnumber'
    AND created_at > now() - interval '10 minutes';
$$;

-- Stores a workbook when the handoff payload names a client number.
-- No-op when the field is absent or not a valid id, so existing
-- one-time handoffs keep working.
CREATE OR REPLACE FUNCTION private.remember_clearnumber_workbook(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  ident public.client_identities%ROWTYPE;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RETURN;
  END IF;

  normalized := private.normalize_client_number(
    coalesce(p_payload->>'client_number', p_payload #>> '{profile,client_number}')
  );
  IF normalized IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.client_identities (client_number, source)
  VALUES (normalized, 'clearnumber')
  ON CONFLICT (client_number) DO NOTHING;

  SELECT * INTO ident
  FROM public.client_identities
  WHERE client_number = normalized;

  IF NOT FOUND OR ident.retired_at IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.clearnumber_workbooks (client_number, payload, updated_at)
  VALUES (normalized, p_payload, now())
  ON CONFLICT (client_number) DO UPDATE
  SET payload = EXCLUDED.payload,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION private.canonical_client_number(p_number text, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT up.client_number
      FROM public.user_profiles up
      WHERE up.user_id = p_user_id
        AND up.client_number IS NOT NULL
    ),
    p_number
  );
$$;

-- Blocks direct writes to user_profiles.client_number.
-- New rows get a generated id. link_clearnumber_client sets
-- pul.allow_client_number for its own update.
CREATE OR REPLACE FUNCTION private.assign_profile_client_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.client_number IS NOT DISTINCT FROM OLD.client_number THEN
      RETURN NEW;
    END IF;
    IF current_setting('pul.allow_client_number', true) = '1' THEN
      RETURN NEW;
    END IF;
    -- Migration backfill only: fill a missing id when there is no JWT.
    IF OLD.client_number IS NULL AND auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    NEW.client_number := OLD.client_number;
    RETURN NEW;
  END IF;

  IF current_setting('pul.allow_client_number', true) = '1'
     AND private.normalize_client_number(NEW.client_number) IS NOT NULL THEN
    NEW.client_number := private.normalize_client_number(NEW.client_number);
    RETURN NEW;
  END IF;

  NEW.client_number := private.issue_client_number(NEW.user_id, 'pul');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_client_number ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_client_number
  BEFORE INSERT OR UPDATE OF client_number ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.assign_profile_client_number();

-- Keep a deleted account's number from being issued again.
-- The workbook is removed with the account. The number stays reserved.
CREATE OR REPLACE FUNCTION private.retire_client_identities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.clearnumber_workbooks w
  USING public.client_identities i
  WHERE w.client_number = i.client_number
    AND i.user_id = OLD.id;

  UPDATE public.client_identities
  SET retired_at = coalesce(retired_at, now())
  WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_retire_client_identities ON auth.users;
CREATE TRIGGER trg_retire_client_identities
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.retire_client_identities();

-- ------------------------------------------------------------
-- Backfill profiles that do not have a number yet.
-- ------------------------------------------------------------

DO $$
DECLARE
  rec record;
  issued text;
BEGIN
  FOR rec IN
    SELECT user_id
    FROM public.user_profiles
    WHERE client_number IS NULL
    ORDER BY created_at NULLS LAST, user_id
  LOOP
    issued := private.issue_client_number(rec.user_id, 'pul');
    UPDATE public.user_profiles
    SET client_number = issued
    WHERE user_id = rec.user_id
      AND client_number IS NULL;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_client_number
  ON public.user_profiles (client_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_client_number_format'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_client_number_format
      CHECK (client_number IS NULL OR client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_client_number_fkey'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_client_number_fkey
      FOREIGN KEY (client_number)
      REFERENCES public.client_identities (client_number);
  END IF;
END $$;

ALTER TABLE public.user_profiles
  ALTER COLUMN client_number SET NOT NULL;

-- ------------------------------------------------------------
-- One-time handoff. Same arguments, same return shape.
-- When the payload includes a valid client_number, the workbook
-- is also stored for a later pull. Codes, hashes, and expiry
-- are untouched.
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

  PERFORM private.remember_clearnumber_workbook(p_payload);

  FOR i IN 1..5 LOOP
    code := private.clearnumber_random_code();
    hash := private.clearnumber_code_hash(code);
    expires_at := now() + interval '24 hours';
    BEGIN
      INSERT INTO public.clearnumber_handoffs (code_hash, payload, expires_at)
      VALUES (hash, p_payload, expires_at);
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

-- ------------------------------------------------------------
-- Lookup. ClearNumber (anon + its origin) and a signed-in Pul
-- user. No workbook body and no user id in the response.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.lookup_client_number(p_client_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  ident public.client_identities%ROWTYPE;
  canonical text;
  workbook boolean;
  show_workbook boolean;
BEGIN
  IF auth.uid() IS NULL AND NOT private.clearnumber_origin_allowed() THEN
    RAISE EXCEPTION 'origin_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  normalized := private.normalize_client_number(p_client_number);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'invalid_client_number'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO ident
  FROM public.client_identities
  WHERE client_number = normalized;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'client_number', normalized,
      'canonical_client_number', normalized,
      'exists', false,
      'linked', false,
      'available', false,
      'retired', false,
      'owned_by_me', false,
      'has_workbook', false
    );
  END IF;

  canonical := private.canonical_client_number(normalized, ident.user_id);
  SELECT EXISTS (
    SELECT 1 FROM public.clearnumber_workbooks w
    WHERE w.client_number = normalized
  ) INTO workbook;

  show_workbook := ident.user_id IS NULL
    OR ident.retired_at IS NOT NULL
    OR (auth.uid() IS NOT NULL AND ident.user_id = auth.uid())
    OR auth.uid() IS NULL;

  RETURN jsonb_build_object(
    'client_number', normalized,
    'canonical_client_number', canonical,
    'exists', true,
    'linked', ident.user_id IS NOT NULL AND ident.retired_at IS NULL,
    'available', ident.user_id IS NULL AND ident.retired_at IS NULL AND ident.superseded_at IS NULL,
    'retired', ident.retired_at IS NOT NULL,
    'owned_by_me', auth.uid() IS NOT NULL AND ident.user_id = auth.uid(),
    'has_workbook', CASE WHEN show_workbook THEN workbook ELSE NULL END
  );
END;
$$;

-- ------------------------------------------------------------
-- ClearNumber mints or re-reads an id. Idempotent.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.register_clearnumber_client(p_client_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  normalized text;
  created boolean := false;
  ident public.client_identities%ROWTYPE;
BEGIN
  IF NOT private.clearnumber_origin_allowed() THEN
    RAISE EXCEPTION 'origin_not_allowed'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_client_number IS NULL OR btrim(p_client_number) = '' THEN
    IF NOT private.clearnumber_new_id_rate_ok() THEN
      RAISE EXCEPTION 'rate_limited'
        USING ERRCODE = 'P0001';
    END IF;
    normalized := private.issue_client_number(NULL, 'clearnumber');
    created := true;
  ELSE
    normalized := private.normalize_client_number(p_client_number);
    IF normalized IS NULL THEN
      RAISE EXCEPTION 'invalid_client_number'
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.client_identities WHERE client_number = normalized
    ) THEN
      IF NOT private.clearnumber_new_id_rate_ok() THEN
        RAISE EXCEPTION 'rate_limited'
          USING ERRCODE = 'P0001';
      END IF;
      BEGIN
        INSERT INTO public.client_identities (client_number, source)
        VALUES (normalized, 'clearnumber');
        created := true;
      EXCEPTION WHEN unique_violation THEN
        created := false;
      END;
    END IF;
  END IF;

  SELECT * INTO ident
  FROM public.client_identities
  WHERE client_number = normalized;

  RETURN jsonb_build_object(
    'client_number', normalized,
    'canonical_client_number', private.canonical_client_number(normalized, ident.user_id),
    'exists', true,
    'created', created,
    'linked', ident.user_id IS NOT NULL AND ident.retired_at IS NULL,
    'available', ident.user_id IS NULL AND ident.retired_at IS NULL AND ident.superseded_at IS NULL,
    'retired', ident.retired_at IS NOT NULL
  );
END;
$$;

-- ------------------------------------------------------------
-- ClearNumber stores the latest workbook for an id.
-- Does not create a one-time handoff code.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.publish_clearnumber_workbook(p_client_number text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  problem text;
  normalized text;
  registered jsonb;
  updated_at timestamptz;
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

  normalized := private.normalize_client_number(p_client_number);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'invalid_client_number'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.client_identities
    WHERE client_number = normalized AND retired_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'client_number_retired'
      USING ERRCODE = 'P0001';
  END IF;

  registered := private.register_clearnumber_client(normalized);

  -- register no-ops the insert when the row exists. Force the payload's
  -- own client_number to the canonical id before storing, so a later
  -- pull reads the same number the caller sent.
  p_payload := jsonb_set(p_payload, '{client_number}', to_jsonb(normalized), true);
  PERFORM private.remember_clearnumber_workbook(p_payload);

  SELECT w.updated_at INTO updated_at
  FROM public.clearnumber_workbooks w
  WHERE w.client_number = normalized;

  RETURN registered || jsonb_build_object('workbook_updated_at', updated_at);
END;
$$;

-- ------------------------------------------------------------
-- Signed-in Pul user claims an existing ClearNumber # and,
-- when a workbook is stored, receives it. Does not redeem a
-- one-time handoff code. A number already on another account
-- is left there.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.link_clearnumber_client(p_client_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  ident public.client_identities%ROWTYPE;
  recognized boolean := false;
  current_number text;
  workbook public.clearnumber_workbooks%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '28000';
  END IF;

  normalized := private.normalize_client_number(p_client_number);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'invalid_client_number'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO ident
  FROM public.client_identities
  WHERE client_number = normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client_number_not_found'
      USING ERRCODE = 'P0002';
  END IF;
  IF ident.retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'client_number_retired'
      USING ERRCODE = 'P0001';
  END IF;
  IF ident.user_id IS NOT NULL AND ident.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'client_number_taken'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT client_number INTO current_number
  FROM public.user_profiles
  WHERE user_id = auth.uid();

  recognized := ident.user_id IS NOT DISTINCT FROM auth.uid()
    OR current_number IS NOT DISTINCT FROM normalized;

  -- Claim when this profile does not show the number yet, and also when
  -- the registry row was never attached to the account.
  IF ident.user_id IS NULL OR current_number IS DISTINCT FROM normalized THEN
    PERFORM 1
    FROM public.client_identities
    WHERE user_id = auth.uid()
      AND superseded_at IS NULL
      AND retired_at IS NULL
    FOR UPDATE;

    UPDATE public.client_identities
    SET superseded_at = now()
    WHERE user_id = auth.uid()
      AND superseded_at IS NULL
      AND retired_at IS NULL
      AND client_number IS DISTINCT FROM normalized;

    UPDATE public.client_identities
    SET user_id = auth.uid(),
        claimed_at = coalesce(claimed_at, now()),
        superseded_at = NULL
    WHERE client_number = normalized
      AND retired_at IS NULL
      AND (user_id IS NULL OR user_id = auth.uid());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'client_number_taken'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM set_config('pul.allow_client_number', '1', true);

    UPDATE public.user_profiles
    SET client_number = normalized
    WHERE user_id = auth.uid();

    IF NOT FOUND THEN
      INSERT INTO public.user_profiles (user_id, client_number, onboarding_done)
      VALUES (auth.uid(), normalized, false);
    END IF;
  END IF;

  SELECT * INTO workbook
  FROM public.clearnumber_workbooks
  WHERE client_number = normalized;

  RETURN jsonb_build_object(
    'client_number', normalized,
    'canonical_client_number', normalized,
    'recognized', recognized,
    'linked', true,
    'has_workbook', workbook.payload IS NOT NULL,
    'payload', workbook.payload,
    'workbook_updated_at', workbook.updated_at
  );
END;
$$;

-- ------------------------------------------------------------
-- Public wrappers. SECURITY INVOKER so the exposed schema has
-- no definer functions. They only forward.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lookup_client_number(p_client_number text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.lookup_client_number(p_client_number);
$$;

CREATE OR REPLACE FUNCTION public.register_clearnumber_client(p_client_number text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.register_clearnumber_client(p_client_number);
$$;

CREATE OR REPLACE FUNCTION public.publish_clearnumber_workbook(p_client_number text, p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.publish_clearnumber_workbook(p_client_number, p_payload);
$$;

CREATE OR REPLACE FUNCTION public.link_clearnumber_client(p_client_number text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.link_clearnumber_client(p_client_number);
$$;

REVOKE ALL ON FUNCTION private.normalize_client_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.generate_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.issue_client_number(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.clearnumber_new_id_rate_ok() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.remember_clearnumber_workbook(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.canonical_client_number(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.assign_profile_client_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.retire_client_identities() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.lookup_client_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.register_clearnumber_client(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.publish_clearnumber_workbook(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.link_clearnumber_client(text) FROM PUBLIC, anon, authenticated;

-- Table owners and the signed-in role must be able to fire the profile trigger.
GRANT EXECUTE ON FUNCTION private.assign_profile_client_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.retire_client_identities() TO postgres, service_role;

-- Account deletion runs as supabase_auth_admin. It must be allowed to
-- fire the retire trigger, or deleting a user fails.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION private.retire_client_identities() TO supabase_auth_admin;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION private.lookup_client_number(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.register_clearnumber_client(text) TO anon;
GRANT EXECUTE ON FUNCTION private.publish_clearnumber_workbook(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION private.link_clearnumber_client(text) TO authenticated;

REVOKE ALL ON FUNCTION public.lookup_client_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_clearnumber_client(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_clearnumber_workbook(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_clearnumber_client(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.lookup_client_number(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_clearnumber_client(text) TO anon;
GRANT EXECUTE ON FUNCTION public.publish_clearnumber_workbook(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.link_clearnumber_client(text) TO authenticated;

-- 007 already granted the handoff wrapper. Replacing the private body
-- keeps that grant. Say it again so a re-run stays explicit.
GRANT EXECUTE ON FUNCTION private.create_clearnumber_handoff(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_clearnumber_handoff(jsonb) TO anon;

NOTIFY pgrst, 'reload schema';
