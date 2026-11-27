# Shared Client / Student ID

Pul Planning and ClearNumber share one id. It is not the one-time handoff code from [clearnumber-handoff.md](clearnumber-handoff.md). Handoff codes stay 12 characters, hashed, single use, and 24 hours. This id stays on the profile.

Nothing in this change is applied to the live database by the pull request. Run `supabase/migrations/008_client_number.sql` in the Ola Financial project (`kwymfdbvfzexhckuaorh`) after migration 007, then reload the API schema if a call still says the function is missing.

## Format

Canonical form:

```text
CN-K7M2P4QX
```

`CN-` plus 8 characters from:

```text
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

`0`, `O`, `1`, and `I` are excluded. The generator uses that alphabet. `32^8` is about one trillion values. A byte modulo 32 is unbiased because 256 divides evenly by 32.

Lookup ignores spaces, underscores, and extra hyphens, then uppercases. These all resolve to `CN-K7M2P4QX`:

```text
CN-K7M2P4QX
cn k7m2 p4qx
CNK7M2P4QX
CN-K7M2-P4QX
```

Anything else, including a 12-character handoff code, is `invalid_client_number`. A handoff code is not a Client / Student ID.

Pul stores the canonical form on `user_profiles.client_number`. That column is the person's current id. Older ids stay in `client_identities` with `superseded_at` set, and lookup returns `canonical_client_number` for them.

## Schema

```text
user_profiles.client_number  text  NOT NULL  UNIQUE
  CHECK (client_number ~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')
  REFERENCES client_identities(client_number)

client_identities (
  client_number  text PRIMARY KEY,          -- canonical CN-XXXXXXXX
  user_id        uuid NULL,                 -- set when a Pul account claims it
  source         text NOT NULL,             -- 'pul' | 'clearnumber'
  created_at     timestamptz NOT NULL,
  claimed_at     timestamptz NULL,
  superseded_at  timestamptz NULL,          -- a newer id replaced this one
  retired_at     timestamptz NULL           -- the Pul account was deleted
)

clearnumber_workbooks (
  client_number  text PRIMARY KEY REFERENCES client_identities(client_number),
  payload        jsonb NOT NULL,            -- same object as a handoff payload, schema_version 1
  updated_at     timestamptz NOT NULL
)
```

New Pul profiles get a number from a `BEFORE INSERT` trigger. The trigger retries on collision. A signed-in user cannot change the column with a normal profile update. `link_clearnumber_client` is the only write path after creation.

Direct table access for `anon` and `authenticated` is revoked. Both tables have row level security with no-access policies. Do not add schema `private` to Exposed schemas.

Deleting a Pul account retires every number that account held and deletes the stored workbook. The number is not issued again.

## API

Base URL:

```text
https://kwymfdbvfzexhckuaorh.supabase.co/rest/v1/rpc/
```

Headers on every call:

```text
Content-Type: application/json
apikey: <Pul publishable key>
Authorization: Bearer <Pul publishable key>
```

The publishable key is `SUPABASE_ANON` in `js/config.js`. It is not the service role key.

Calls that create or publish (`register_clearnumber_client`, `publish_clearnumber_workbook`, and the existing `create_clearnumber_handoff`) must come from `https://clearnumber.kaluaja.org`, or from `http://localhost` / `http://127.0.0.1` while building. Any other origin returns `origin_not_allowed`. `lookup_client_number` allows that same origin, and also allows a signed-in Pul user.

### `lookup_client_number`

```json
{ "p_client_number": "CN-K7M2P4QX" }
```

```json
{
  "client_number": "CN-K7M2P4QX",
  "canonical_client_number": "CN-K7M2P4QX",
  "exists": true,
  "linked": false,
  "available": true,
  "retired": false,
  "owned_by_me": false,
  "has_workbook": true
}
```

`exists: false` is a normal response for a well-formed number that was never issued. `invalid_client_number` means the text is not this format. `linked` means a Pul account holds it (including a superseded number whose account still has a newer id). `canonical_client_number` is the id on that account now. The response has no user id and no workbook body.

### `register_clearnumber_client`

Mint a number, or re-read one ClearNumber already knows.

```json
{ "p_client_number": null }
```

or

```json
{ "p_client_number": "CN-K7M2P4QX" }
```

```json
{
  "client_number": "CN-K7M2P4QX",
  "canonical_client_number": "CN-K7M2P4QX",
  "exists": true,
  "created": true,
  "linked": false,
  "available": true,
  "retired": false
}
```

Sending a number that already exists returns `created: false` and does not change who holds it. An empty string mints a new number. More than 500 new ClearNumber ids in 10 minutes returns `rate_limited`.

ClearNumber should mint here, not locally, so Pul and ClearNumber cannot issue the same string.

### `publish_clearnumber_workbook`

Store the latest workbook for a number. This does not create a one-time code and does not change the handoff redirect.

```json
{
  "p_client_number": "CN-K7M2P4QX",
  "p_payload": { "schema_version": 1 }
}
```

The payload is the same object as [clearnumber-payload.schema.json](clearnumber-payload.schema.json). Amounts stay in major units. `schema_version` must be `1`. A bad payload returns `invalid_payload` with the same detail strings as the handoff. A retired number returns `client_number_retired`.

The response is the register object plus `workbook_updated_at`. Publishing again replaces the stored workbook.

`client_number` inside the payload is optional. On a one-time handoff, if `client_number` or `profile.client_number` is a valid id, Pul also stores that workbook under the id. The handoff response is still only `code`, `expires_at`, and `redirect_url`.

### `link_clearnumber_client`

Signed-in Pul users only. ClearNumber does not call this.

```json
{ "p_client_number": "CN-K7M2P4QX" }
```

```json
{
  "client_number": "CN-K7M2P4QX",
  "canonical_client_number": "CN-K7M2P4QX",
  "recognized": false,
  "linked": true,
  "has_workbook": true,
  "payload": { "schema_version": 1 },
  "workbook_updated_at": "2026-11-27T00:00:00.000Z"
}
```

`recognized` is true when that Pul profile already had this id. `payload` is present only after the id is on this profile. A number held by someone else returns `client_number_taken` and does not move. An unknown number returns `client_number_not_found`. Pul does not write income, expenses, assets, debts, or goals inside this call. The import screen shows the workbook and writes rows only after the person confirms, using the same mapping as a handoff code. Confirming an id pull does not redeem a handoff code.

## Errors

| message | meaning |
|---|---|
| `invalid_client_number` | Not `CN-` plus 8 alphabet characters |
| `client_number_not_found` | Valid shape, never issued |
| `client_number_taken` | Already on a different Pul account |
| `client_number_retired` | The account that held it was deleted |
| `origin_not_allowed` | Caller is not ClearNumber (or localhost) |
| `rate_limited` | Too many new ClearNumber ids in 10 minutes |
| `invalid_payload` | Workbook failed the handoff checks. See `detail` |
| `not_authenticated` | `link_clearnumber_client` without a Pul session |

## What Pul shows

Settings, the first onboarding step, and `#/import` show the id with a Copy button and the note “This same number works on both Pul Planning and ClearNumber.” The button label is **Input your ClearNumber # here**. Entering an id that ClearNumber has published opens the same preview as a handoff code. Entering the id already on the profile leaves it in place.

## Apply on Supabase (before merge)

Do this in the **Ola Financial** project only, after 007 has succeeded.

1. Open <https://supabase.com/dashboard/project/kwymfdbvfzexhckuaorh/sql/new>
2. Paste all of `supabase/migrations/008_client_number.sql` and run it.
3. Run the check below. `client_number` should be `NO`, and both public functions should be listed.

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'client_number';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_user_profiles_client_number';

SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'lookup_client_number',
  'register_clearnumber_client',
  'publish_clearnumber_workbook',
  'link_clearnumber_client',
  'create_clearnumber_handoff'
)
ORDER BY 1, 2;
```

4. Leave **Exposed schemas** unchanged. Do not add `private`.
5. There is no Edge Function to deploy.
