// ============================================================
// WealthPath — GET /api/health
// Auth: "publishable" — no JWT required, just a valid anon key
// ============================================================

import { withSupabase } from "@supabase/server"

/**
 * Public health-check endpoint.
 * Verifies the server + Supabase connection are alive.
 */
export const handleHealth = withSupabase(
  { auth: "publishable" },
  async (_req, ctx) => {
    // Light DB ping — count rows in a public ref table
    const { count, error } = await ctx.supabase
      .from("ref_nigerian_banks")
      .select("*", { count: "exact", head: true })

    if (error) {
      return Response.json(
        { status: "degraded", error: error.message },
        { status: 503 }
      )
    }

    return Response.json({
      status: "ok",
      supabase: "connected",
      ref_banks_count: count,
      ts: new Date().toISOString(),
    })
  }
)
