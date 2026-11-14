-- ============================================================
-- Pul Planning — Migration 007
-- ClearNumber → Pul one-time handoff
--
-- NOT applied by this commit. Run it in the Supabase SQL editor
-- for project Ola Financial (kwymfdbvfzexhckuaorh) before merging.
-- Click-by-click steps: docs/clearnumber-handoff.md
--
-- Anonymous callers (the ClearNumber origin only) create a code.
-- Signed-in Pul users preview the payload, then redeem it once.
-- The code is stored as a hash. Money never goes in the URL.
-- Codes expire after 24 hours.
--
-- Requires pgcrypto (already installed on Supabase, schema
-- "extensions") and migration align_check_constraints_006, which
-- is already applied on the live project. This file does not
-- change those checks.
--
-- Do not add schema "private" to the API exposed schemas.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, anon, authenticated;

-- ------------------------------------------------------------
-- Storage. No policies grant access. anon/authenticated are
-- revoked as well. The SECURITY DEFINER functions below are
-- the only read/write path.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clearnumber_handoffs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash    text NOT NULL UNIQUE,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  redeemed_at  timestamptz,
  redeemed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT clearnumber_handoffs_payload_object
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT clearnumber_handoffs_expiry
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_clearnumber_handoffs_created
  ON public.clearnumber_handoffs (created_at);

COMMENT ON TABLE public.clearnumber_handoffs IS
  'One-time ClearNumber workbook payloads. code_hash is sha256 of the code; the plaintext code is not stored.';

ALTER TABLE public.clearnumber_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clearnumber_handoffs_no_select ON public.clearnumber_handoffs;
DROP POLICY IF EXISTS clearnumber_handoffs_no_insert ON public.clearnumber_handoffs;
DROP POLICY IF EXISTS clearnumber_handoffs_no_update ON public.clearnumber_handoffs;
DROP POLICY IF EXISTS clearnumber_handoffs_no_delete ON public.clearnumber_handoffs;

CREATE POLICY clearnumber_handoffs_no_select
  ON public.clearnumber_handoffs
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY clearnumber_handoffs_no_insert
  ON public.clearnumber_handoffs
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY clearnumber_handoffs_no_update
  ON public.clearnumber_handoffs
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY clearnumber_handoffs_no_delete
  ON public.clearnumber_handoffs
  FOR DELETE TO anon, authenticated
  USING (false);

REVOKE ALL ON TABLE public.clearnumber_handoffs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.clearnumber_handoffs TO postgres, service_role;

-- ------------------------------------------------------------
-- Helpers (not granted to API roles)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.clearnumber_origin_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  headers json;
  origin text;
  referer text;
BEGIN
  BEGIN
    headers := nullif(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  IF headers IS NULL THEN
    RETURN false;
  END IF;

  origin := lower(btrim(coalesce(headers->>'origin', '')));
  referer := lower(btrim(coalesce(headers->>'referer', '')));

  -- A non-empty Origin wins. Do not let a forged Referer override it.
  IF origin <> '' THEN
    RETURN origin = 'https://clearnumber.kaluaja.org'
      OR origin ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$';
  END IF;

  RETURN referer ~ '^https://clearnumber\.kaluaja\.org([:/]|$)'
    OR referer ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?([:/]|$)';
END;
$$;

CREATE OR REPLACE FUNCTION private.clearnumber_code_hash(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(
    extensions.digest(
      upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION private.clearnumber_random_code()
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
  bytes := extensions.gen_random_bytes(12);
  FOR i IN 0..11 LOOP
    out := out || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION private.clearnumber_payload_error(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  ver int;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RETURN 'payload must be a JSON object';
  END IF;
  IF octet_length(p_payload::text) > 48000 THEN
    RETURN 'payload is too large';
  END IF;
  BEGIN
    ver := (p_payload->>'schema_version')::int;
  EXCEPTION WHEN others THEN
    RETURN 'schema_version must be 1';
  END;
  IF ver IS DISTINCT FROM 1 THEN
    RETURN 'schema_version must be 1';
  END IF;

  IF p_payload ? 'expenses' AND jsonb_typeof(p_payload->'expenses') IS DISTINCT FROM 'array' THEN
    RETURN 'expenses must be an array';
  END IF;
  IF p_payload ? 'assets' AND jsonb_typeof(p_payload->'assets') IS DISTINCT FROM 'array' THEN
    RETURN 'assets must be an array';
  END IF;
  IF p_payload ? 'debts' AND jsonb_typeof(p_payload->'debts') IS DISTINCT FROM 'array' THEN
    RETURN 'debts must be an array';
  END IF;
  IF p_payload ? 'goals' AND jsonb_typeof(p_payload->'goals') IS DISTINCT FROM 'array' THEN
    RETURN 'goals must be an array';
  END IF;
  IF jsonb_typeof(p_payload->'expenses') = 'array' AND jsonb_array_length(p_payload->'expenses') > 40 THEN
    RETURN 'too many expenses';
  END IF;
  IF jsonb_typeof(p_payload->'assets') = 'array' AND jsonb_array_length(p_payload->'assets') > 40 THEN
    RETURN 'too many assets';
  END IF;
  IF jsonb_typeof(p_payload->'debts') = 'array' AND jsonb_array_length(p_payload->'debts') > 40 THEN
    RETURN 'too many debts';
  END IF;
  IF jsonb_typeof(p_payload->'goals') = 'array' AND jsonb_array_length(p_payload->'goals') > 20 THEN
    RETURN 'too many goals';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.clearnumber_normalize_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- ------------------------------------------------------------
-- Create (anonymous, ClearNumber origin only)
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
-- Preview (signed in, does not consume the code)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.preview_clearnumber_handoff(p_code text)
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
  IF rec.expires_at <= now() THEN
    RAISE EXCEPTION 'code_expired'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'payload', rec.payload,
    'expires_at', rec.expires_at
  );
END;
$$;

-- ------------------------------------------------------------
-- Redeem (signed in, single use)
-- ------------------------------------------------------------

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
-- Public wrappers. SECURITY INVOKER so they are not definer
-- functions in the exposed schema. They only forward.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_clearnumber_handoff(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.create_clearnumber_handoff(p_payload);
$$;

CREATE OR REPLACE FUNCTION public.preview_clearnumber_handoff(p_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.preview_clearnumber_handoff(p_code);
$$;

CREATE OR REPLACE FUNCTION public.redeem_clearnumber_handoff(p_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.redeem_clearnumber_handoff(p_code);
$$;

-- Supabase grants new public functions to anon and authenticated by
-- default. Revoke those, then grant only the role that should call.
REVOKE ALL ON FUNCTION private.clearnumber_origin_allowed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.clearnumber_code_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.clearnumber_random_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.clearnumber_payload_error(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.clearnumber_normalize_code(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.create_clearnumber_handoff(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.preview_clearnumber_handoff(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.redeem_clearnumber_handoff(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_clearnumber_handoff(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION private.preview_clearnumber_handoff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.redeem_clearnumber_handoff(text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_clearnumber_handoff(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_clearnumber_handoff(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_clearnumber_handoff(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_clearnumber_handoff(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.preview_clearnumber_handoff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_clearnumber_handoff(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
