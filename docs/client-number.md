# Shared Client / Student ID

Pul Planning and ClearNumber (`https://clearnumber.kaluaja.org`) share one Client / Student ID. Pul shows it on Settings. ClearNumber looks up the same value. A person can type that number into **Input your ClearNumber # here** and Pul links it, then previews the workbook with the same mapping as a one-time import link.

One-time handoff codes are unchanged. They are still 12 characters, expire after 24 hours, and work once. A Client / Student ID is not a handoff code.

Nothing in this change has been applied to the live Supabase project. Apply `supabase/migrations/008_client_number.sql` in the Ola Financial project (`kwymfdbvfzexhckuaorh`) before relying on the new RPCs. Apply `007_clearnumber_handoff.sql` first if it is not already there. There is no Edge Function.

## Format

Canonical value, stored and compared:

```text
CN-K7M2PQ
```

| Rule | Value |
|---|---|
| Prefix | `CN-` |
| Body | 6 characters |
| Alphabet | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| Excluded | `0` `O` `1` `I` (easy to misread) |
| Pattern | `^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$` |

`CN-K7M2PQ` is a valid example. `K`, `7`, `M`, `2`, `P`, and `Q` are all in the alphabet.

### Normalization (both apps)

1. Uppercase.
2. Delete every character that is not `A`–`Z` or `0`–`9`.
3. Accept only when the result matches `^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`.
4. Store and compare `CN-` plus those 6 characters.

The same steps are `private.client_number_canonical(text)` and `WPClearNumberId.canonical`. Hyphens, spaces, and letter case do not matter. These all canonicalize to `CN-K7M2PQ`:

- `CN-K7M2PQ`
- `cn-k7m2pq`
- `CNK7M2PQ`
- `cn k7m2pq`

A one-time import code such as `AB12CD34EF56` does not canonicalize. A body that uses `0`, `O`, `1`, or `I` does not canonicalize. Compare the canonical string, not a second encoding.

Pul generates missing IDs with that alphabet (`extensions.gen_random_bytes`, same shape of generator as handoff codes). ClearNumber should not invent a second alphabet. Prefer an ID Pul already issued. To reserve an ID before the person has a Pul profile, call `register_clearnumber_record`. Pul will not generate that value for someone else.

## Database

`user_profiles.client_number` — canonical ID, `NOT NULL`, unique index `user_profiles_client_number_uidx`.

`user_profiles.client_number_source` — `generated` (Pul assigned it) or `claimed` (the person linked a ClearNumber workbook ID).

Direct updates cannot change either column. The profile screen can edit name, age, and currency as before. Only `pull_clearnumber_number` and a redeemed handoff that carries a valid ID can claim a number. A `generated` ID can be replaced once, when the person enters a ClearNumber # that already has a stored workbook. A `claimed` ID stays put.

`clearnumber_records` — latest workbook for an ID. No API role can read the table. RLS is on and denies direct access. The payload uses the same object as a handoff (`schema_version` 1, amounts in major units).

Existing rows are backfilled. New rows get an ID from a `BEFORE INSERT` trigger.

## API

Base URL: `https://kwymfdbvfzexhckuaorh.supabase.co/rest/v1/rpc/`

Headers for every call:

- `Content-Type: application/json`
- `apikey: <Pul publishable key>`
- `Authorization: Bearer <Pul publishable key>` for ClearNumber, or the signed-in user's access token for Pul

The publishable key is `SUPABASE_ANON` in `js/config.js`. It is not the service role key.

Errors are Postgres exceptions. PostgREST puts the token in `message` (`invalid_number`, `number_not_found`, `number_in_use`, `number_already_set`, `origin_not_allowed`, `invalid_payload`, `rate_limited`, `not_authenticated`).

### `lookup_client_number` — ClearNumber, anonymous

Origin must be `https://clearnumber.kaluaja.org` (or `http://localhost` / `http://127.0.0.1` while building). Same rule as `create_clearnumber_handoff`.

```json
{ "p_number": "cn k7m2pq" }
```

```json
{
  "client_number": "CN-K7M2PQ",
  "exists": true,
  "has_workbook": true,
  "linked": false
}
```

| Field | Meaning |
|---|---|
| `client_number` | Canonical ID. Always returned when the input is valid. |
| `exists` | A Pul profile or a stored workbook has this ID. |
| `has_workbook` | `clearnumber_records` has a payload for it. |
| `linked` | A Pul profile has it, or a workbook is already tied to a Pul user. |

No name, email, or money is returned. `invalid_number` means the input is not this format. `exists: false` means the format is valid and unused.

### `register_clearnumber_record` — ClearNumber, anonymous

Same origin rule. Upserts the latest workbook for that ID. Does not change who it is linked to. Rate limit: 500 records touched in 10 minutes, separate from handoff codes.

```json
{
  "p_client_number": "CN-K7M2PQ",
  "p_payload": { "schema_version": 1 }
}
```

```json
{
  "client_number": "CN-K7M2PQ",
  "updated_at": "2026-11-27T19:00:00.000Z"
}
```

`p_payload` uses the handoff schema (`docs/clearnumber-payload.schema.json`). `invalid_payload` keeps the same detail string as `create_clearnumber_handoff`.

### `ensure_my_client_number` — signed-in Pul user

No arguments. Returns the caller's ID, creating a profile stub and generating an ID when needed. It does not rotate an ID that is already set.

Pul does not call this on page load. The profile query already returns `client_number` after this migration. Calling it before the function exists shows up as a WebKit page error.

```json
{ "client_number": "CN-K7M2PQ", "source": "generated" }
```

`source` is `generated` or `claimed`.

### `pull_clearnumber_number` — signed-in Pul user

```json
{ "p_number": "CN-K7M2PQ" }
```

Success:

```json
{
  "client_number": "CN-K7M2PQ",
  "status": "linked",
  "source": "claimed",
  "has_workbook": true,
  "payload": { "schema_version": 1 },
  "updated_at": "2026-11-27T19:00:00.000Z"
}
```

| `status` | Meaning |
|---|---|
| `linked` | This profile just adopted the ID. The previous generated ID is released. |
| `already_linked` | This profile already had this ID. |

`payload` is present only when a workbook is stored. Pul then runs `WPClearNumberMap.mapPayload` and waits for **Add to my plan**. Pulling does not consume a one-time code. Names already in the plan are skipped, same as a code import.

| Error | When |
|---|---|
| `invalid_number` | Not a canonical ID. |
| `number_not_found` | Valid ID, but no workbook is stored and it is not already this profile's ID. Pul does not reserve typed guesses. |
| `number_in_use` | Another Pul profile already has it. |
| `number_already_set` | This profile already claimed a different ID. `details` is that ID. |
| `not_authenticated` | No signed-in user. |

## Handoff codes

`create_clearnumber_handoff` still returns only `code`, `expires_at`, and `redirect_url`.

If the payload includes a valid ID, Pul also stores that workbook for a later pull. Invalid or missing IDs are ignored, so existing workbooks still create a code. Accepted locations, first match wins:

- `client_number`
- `student_id`
- `profile.client_number`
- `profile.student_id`

`student_id` is only that alias. The column and the lookup argument are `client_number`.

Redeeming a code still returns `payload` and `expires_at`. When the payload has a valid ID that nobody else holds, Pul also claims it onto the signed-in profile. A conflict does not fail the redeem.

## Apply on Supabase (before merge)

Do this in the **Ola Financial** project only.

1. Confirm `007_clearnumber_handoff.sql` has already been applied.
2. Open the SQL editor: <https://supabase.com/dashboard/project/kwymfdbvfzexhckuaorh/sql/new>
3. Paste `supabase/migrations/008_client_number.sql` and run it.
4. Run it again. The second run should succeed and change nothing (backfill fills zero rows).
5. Check:

```sql
SELECT client_number, client_number_source
FROM public.user_profiles
WHERE client_number IS NULL
   OR client_number !~ '^CN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$';

SELECT indexname
FROM pg_indexes
WHERE indexname = 'user_profiles_client_number_uidx';

SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'pull_clearnumber_number',
  'ensure_my_client_number',
  'register_clearnumber_record',
  'lookup_client_number',
  'create_clearnumber_handoff',
  'redeem_clearnumber_handoff'
)
ORDER BY 1, 2;
```

The first query returns no rows. The index query returns one row. The function query lists the private helpers and the public wrappers. `create_clearnumber_handoff` and `redeem_clearnumber_handoff` are still there.

6. Leave **Exposed schemas** unchanged. Do not add `private`.
7. The script ends with `NOTIFY pgrst, 'reload schema'`. If a call says the function is missing, reload the API schema and try again.

Snippet for ClearNumber: [`clearnumber-register.js`](clearnumber-register.js).
