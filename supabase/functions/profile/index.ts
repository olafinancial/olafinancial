// ============================================================
// WealthPath — Supabase Edge Function: /api/profile
// Deploy: supabase functions deploy profile
//
// On Supabase Edge Functions, SUPABASE_URL, SUPABASE_ANON_KEY,
// and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// @supabase/server reads them via its standard env var names.
// ============================================================

import { withSupabase } from "jsr:@supabase/server"

Deno.serve(
  withSupabase({ auth: "user" }, async (_req, ctx) => {
    const { data: profile, error } = await ctx.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", ctx.user.id)
      .maybeSingle()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!profile) return Response.json({ error: "Not found" }, { status: 404 })

    return Response.json({ profile })
  })
)
