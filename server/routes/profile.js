// ============================================================
// OlaFinancial — GET /api/profile
// Auth: "user" — requires a valid Supabase JWT in Authorization header
// The RLS-scoped client (ctx.supabase) ensures users only see
// their own profile row, enforced at the database level.
// ============================================================

import { withSupabase } from "@supabase/server"

/**
 * Returns the authenticated user's profile.
 *
 * Client usage:
 *   const session = await supabase.auth.getSession()
 *   fetch("/api/profile", {
 *     headers: { Authorization: `Bearer ${session.data.session.access_token}` }
 *   })
 */
export const handleProfile = withSupabase(
  { auth: "user" },
  async (_req, ctx) => {
    // ctx.supabase is RLS-scoped to the authenticated user
    const { data: profile, error } = await ctx.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", ctx.user.id)
      .maybeSingle()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    return Response.json({ profile })
  }
)
