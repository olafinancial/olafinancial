# ClearNumber → Pul Planning handoff

A person finishes the workbook on ClearNumber (`https://clearnumber.kaluaja.org`), clicks **Continue in Pul Planning**, signs up or logs in on Pul, and confirms a preview. Pul then writes goals, income, expenses, assets, and debts. The link contains a one-time code only. Money figures stay on the server.

Nothing in this change has been applied to the live Supabase project. Apply the migration below before merging the pull request. There is no Edge Function to deploy.

Migration `align_check_constraints_006` is already applied on project **Ola Financial** (`kwymfdbvfzexhckuaorh`). This handoff only writes values that check allows (including `psb` instead of `mmo`, `monthly` / `biweekly` frequencies, and the widened goal types).

## Endpoint ClearNumber calls

```
POST https://kwymfdbvfzexhckuaorh.supabase.co/rest/v1/rpc/create_clearnumber_handoff
```

Headers:

- `Content-Type: application/json`
- `apikey: <Pul publishable key>`
- `Authorization: Bearer <Pul publishable key>`

The publishable key is the public value in `js/config.js` (`SUPABASE_ANON`). It is not the service role key.

Body:

```json
{ "p_payload": { "schema_version": 1 } }
```

The browser must send this from `https://clearnumber.kaluaja.org` (or from `http://localhost` / `http://127.0.0.1` while building the workbook). Other origins are rejected with `origin_not_allowed`.

Success:

```json
{
  "code": "AB12CD34EF56",
  "expires_at": "2026-11-15T06:00:00.000Z",
  "redirect_url": "https://pul.llc/#/import?code=AB12CD34EF56"
}
```

Send the person to `redirect_url`. The code expires in 24 hours, works once, and is stored only as a hash. A signed-in Pul user previews with `preview_clearnumber_handoff` and, after they confirm, Pul calls `redeem_clearnumber_handoff`. Those two are not for ClearNumber.

Snippet: [`clearnumber-continue.js`](clearnumber-continue.js).

Example payload: [`clearnumber-payload.example.json`](clearnumber-payload.example.json).

JSON Schema: [`clearnumber-payload.schema.json`](clearnumber-payload.schema.json).

## Payload

`schema_version` must be `1`. Amounts are major units (500000 means ₦500,000), not kobo. Pul multiplies by 100 when it writes rows.

| Workbook | Pul |
|---|---|
| `profile` name, age, state, currency, employment, retirement age, risk | `user_profiles`. Filled only when that field is still empty. An existing name is kept. |
| `income` gross, pension, net | One active `income_entries` row, frequency `monthly`. Tax is gross − pension − net, and never negative. |
| `expenses[]` by category | `expense_entries`, recurring monthly. Same category names as the Expenses screen. Unknown names are saved as Other. |
| `assets[]` savings, fixed deposit, equities | `assets`. `is_emergency_fund: true` tags the row `[Emergency Fund]` and fills `emergency_fund` when that balance is still empty. |
| `debts[]` balance, APR, payment | `liabilities` (the Debt Planner reads this table). APR is a percent (`18.5`). |
| `pension` RSA balance, contribution, PFA, retirement age | Retirement asset `retirement_contribution` with `[sub:rsa]`. The Retirement screen reads the balance and the monthly contribution. Gross salary comes from income. |
| `targets` emergency fund, retirement, FI portfolio, monthly savings, monthly expenses | Goals named **Emergency Fund** and **Retirement Savings**, plus the FI Calculator saved on this device (`wp_fi_calc_<user>`). |

Rows whose name already exists for this month (or, for goals, at all) are skipped. Pul does not rename them to avoid a collision. The preview lists what will be added and what will be left unchanged. Nothing is written until the person clicks **Add to my plan**.

Expense categories Pul accepts: Communication, Dining Out, Education, Entertainment, Family Support, Food, Gifts & Charity, Health, Housing, Insurance, Interest & Debt, Investment, Land Use Act/Tenement Rate, Security, Shopping, Taxes, Transportation, Utilities-Power Generation, Utilities-Refuse, Utilities-Water, Other.

Institution type, when sent, must be `dmb`, `mfb`, `psb`, `investment`, or `other`. `mmo` is stored as `psb`.

Goal type, when sent, must be one of `retirement`, `mortgage`, `college`, `emergency`, `custom`, `debt`, `investment`, `travel`, `business`, `spend`.

## Apply on Supabase (before merge)

Do this in the **Ola Financial** project only. Do not run it against another project, and do not push this branch to `main` until it has succeeded.

1. Open the SQL editor: <https://supabase.com/dashboard/project/kwymfdbvfzexhckuaorh/sql/new>
2. Open `supabase/migrations/007_clearnumber_handoff.sql` from this pull request and copy the whole file.
3. Paste it into the editor and click **Run**.
4. Wait until the result says success. If a statement errors, stop and do not merge.
5. Run this check in a new query. You should see `relrowsecurity` = true, and both the public RPCs and the private helpers:

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'clearnumber_handoffs';

SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%clearnumber%'
ORDER BY 1, 2;
```

6. In **Project Settings → API → Exposed schemas**, leave the list as it is. Do not add `private`.
7. The migration ends with `NOTIFY pgrst, 'reload schema'`. If a call still says the function is missing, use **Settings → API → Reload schema**, then try again.

There is no Edge Function. Do not deploy one.

After this SQL is applied, merge the pull request so <https://pul.llc> serves the `#/import` page. Merging first is safe (the page explains that import is not switched on yet) but the workbook button will fail until the SQL has been run.

Optional smoke test, only after step 5, from a browser on `https://clearnumber.kaluaja.org` or localhost: call `continueInPulPlanning` with `{"schema_version":1}`. It should redirect to `https://pul.llc/#/import?code=...` with no amounts in the address bar. Signing in should show an empty preview, not an error.

The shared Client / Student ID (`CN-XXXXXX`) is a separate contract. A valid `client_number` or `student_id` on this payload is stored for a later pull and does not change the code, the redirect, or the expiry. See [client-number.md](client-number.md).
