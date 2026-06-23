// ============================================================
// WealthPath — Supabase Edge Function: /api/snapshot
// Deploy: supabase functions deploy snapshot
// ============================================================

import { withSupabase } from "jsr:@supabase/server"

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 })
    }

    let body
    try { body = await req.json() }
    catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }) }

    const required = ["period_month", "net_worth", "total_assets", "total_liabilities", "total_income", "total_expenses", "net_cash_flow"]
    for (const f of required) {
      if (body[f] === undefined) return Response.json({ error: `Missing: ${f}` }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}$/.test(body.period_month)) {
      return Response.json({ error: "period_month must be YYYY-MM" }, { status: 400 })
    }

    const { data, error } = await ctx.supabase
      .from("monthly_snapshots")
      .upsert({
        user_id:            ctx.user.id,
        period_month:       body.period_month,
        net_worth:          body.net_worth,
        total_assets:       body.total_assets,
        total_liabilities:  body.total_liabilities,
        total_income:       body.total_income,
        total_expenses:     body.total_expenses,
        net_cash_flow:      body.net_cash_flow,
        passive_income_amt: body.passive_income_amt ?? 0,
        passive_income_pct: body.passive_income_pct ?? 0,
        emergency_fund_bal: body.emergency_fund_bal ?? 0,
      }, { onConflict: "user_id,period_month" })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ snapshot: data }, { status: 201 })
  })
)
