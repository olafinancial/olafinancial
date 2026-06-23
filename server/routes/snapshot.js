// ============================================================
// OlaFinancial — POST /api/snapshot
// Auth: "user" — requires a valid Supabase JWT
//
// Saves a monthly financial snapshot server-side.
// Doing this server-side lets us:
//   1. Validate and sanitize all monetary values (kobo integers)
//   2. Cross-check period_month matches the current month
//   3. Upsert atomically without exposing the service key to the browser
// ============================================================

import { withSupabase } from "@supabase/server"

/**
 * POST /api/snapshot
 * Body (JSON):
 *   {
 *     period_month:       "2025-06",        // YYYY-MM
 *     net_worth:          125_000_000,      // kobo
 *     total_assets:       200_000_000,      // kobo
 *     total_liabilities:  75_000_000,       // kobo
 *     total_income:       45_000_000,       // kobo (net of tax)
 *     total_expenses:     30_000_000,       // kobo
 *     net_cash_flow:      15_000_000,       // kobo
 *     passive_income_amt: 5_000_000,        // kobo
 *     passive_income_pct: 11.1,             // float
 *     emergency_fund_bal: 90_000_000,       // kobo
 *   }
 */
export const handleSnapshot = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    let body
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    // ── VALIDATION ─────────────────────────────────────────
    const required = [
      "period_month", "net_worth", "total_assets", "total_liabilities",
      "total_income", "total_expenses", "net_cash_flow",
    ]
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate period_month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(body.period_month)) {
      return Response.json({ error: "period_month must be YYYY-MM" }, { status: 400 })
    }

    // All monetary values must be safe integers (kobo)
    const moneyFields = [
      "net_worth", "total_assets", "total_liabilities",
      "total_income", "total_expenses", "net_cash_flow",
      "passive_income_amt", "emergency_fund_bal",
    ]
    for (const f of moneyFields) {
      if (body[f] !== undefined && !Number.isSafeInteger(body[f])) {
        return Response.json(
          { error: `${f} must be a safe integer (kobo value)` },
          { status: 400 }
        )
      }
    }

    // ── UPSERT ─────────────────────────────────────────────
    // RLS-scoped client — user_id is set by the authenticated user;
    // the RLS policy enforces ownership so one user can't overwrite another's snapshot.
    const snapshot = {
      user_id:           ctx.user.id,
      period_month:      body.period_month,
      net_worth:         body.net_worth,
      total_assets:      body.total_assets,
      total_liabilities: body.total_liabilities,
      total_income:      body.total_income,
      total_expenses:    body.total_expenses,
      net_cash_flow:     body.net_cash_flow,
      passive_income_amt: body.passive_income_amt ?? 0,
      passive_income_pct: body.passive_income_pct ?? 0,
      emergency_fund_bal: body.emergency_fund_bal ?? 0,
    }

    const { data, error } = await ctx.supabase
      .from("monthly_snapshots")
      .upsert(snapshot, { onConflict: "user_id,period_month" })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ snapshot: data }, { status: 201 })
  }
)
