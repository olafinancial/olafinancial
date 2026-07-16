// ============================================================
// Pul Planning — Account management (authenticated user)
// POST /api/account/delete  — delete auth user + cascade data
// POST /api/account/reset   — wipe financial rows (keep login)
// ============================================================

import { withSupabase } from "@supabase/server"

const USER_TABLES = [
  "income_entries",
  "expense_entries",
  "assets",
  "liabilities",
  "financial_goals",
  "insurance_policies",
  "emergency_fund",
  "monthly_snapshots",
]

async function wipeUserRows(supabase, userId) {
  const errors = []
  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId)
    if (error) errors.push(`${table}: ${error.message}`)
  }
  return errors
}

/**
 * Reset financial data only — keeps auth.users and email/password.
 */
export const handleAccountReset = withSupabase(
  { auth: "user" },
  async (_req, ctx) => {
    const userId = ctx.user.id
    // Prefer RLS client (user can only wipe self)
    const errors = await wipeUserRows(ctx.supabase, userId)

    await ctx.supabase
      .from("user_profiles")
      .update({
        full_name: null,
        age: null,
        retirement_age: 60,
        digest_enabled: false,
        digest_email: null,
      })
      .eq("user_id", userId)

    return Response.json({
      ok: errors.length === 0,
      action: "reset",
      userId,
      errors,
      message: "Financial data cleared. Sign-in credentials unchanged.",
    })
  }
)

/**
 * Permanently delete the authenticated user from Auth.
 * Cascade removes profile + financial rows (ON DELETE CASCADE).
 * Requires service role (supabaseAdmin).
 */
export const handleAccountDelete = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    let confirm = ""
    try {
      const body = await req.json()
      confirm = String(body?.confirm || "").trim().toUpperCase()
    } catch {
      /* empty body */
    }
    if (confirm !== "DELETE") {
      return Response.json(
        { error: 'Send JSON { "confirm": "DELETE" } to permanently delete your account.' },
        { status: 400 }
      )
    }

    const userId = ctx.user.id

    // Best-effort wipe first (in case CASCADE is incomplete on some envs)
    await wipeUserRows(ctx.supabaseAdmin || ctx.supabase, userId)

    if (!ctx.supabaseAdmin?.auth?.admin) {
      return Response.json(
        {
          error:
            "Account delete requires server SUPABASE_SECRET_KEY (service role). Use Reset data instead, or set the secret key on the API host.",
        },
        { status: 503 }
      )
    }

    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      ok: true,
      action: "delete",
      message: "Account deleted. You can sign up again with the same email.",
    })
  }
)
