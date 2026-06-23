// ============================================================
// OlaFinancial — GET /api/admin/users
// Auth: "secret" — requires SUPABASE_SECRET_KEY (service role)
//
// Returns a list of all registered users for admin dashboards.
// ctx.supabaseAdmin bypasses RLS — only call from trusted server
// code, never expose this endpoint publicly without additional
// access control (e.g. check ctx.user is in an admin role).
//
// Because auth: "secret" uses the service role key, this handler
// should have verify_jwt = false in supabase/config.toml if
// deployed as an Edge Function.
// ============================================================

import { withSupabase } from "@supabase/server"

/**
 * Admin-only: list all users.
 * Protected by SUPABASE_SECRET_KEY — only callable from the server.
 *
 * In production add an IP allowlist or an admin JWT check here.
 */
export const handleAdminUsers = withSupabase(
  { auth: "secret" },
  async (_req, ctx) => {
    // ctx.supabaseAdmin bypasses RLS — full access to auth.users
    const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Strip sensitive fields before returning
    const users = data.users.map(u => ({
      id:           u.id,
      email:        u.email,
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at,
      confirmed:    !!u.email_confirmed_at,
    }))

    return Response.json({ users, total: users.length })
  }
)
