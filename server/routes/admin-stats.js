// ============================================================
// Pul Planning — Admin Stats & Daily Owner Email Report
// GET /api/stats            (One-click secret endpoint — Method 2)
// GET /api/stats/email      (Manual trigger for daily owner email)
// ============================================================

import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY  = process.env.RESEND_API_KEY
const RESEND_FROM     = process.env.RESEND_FROM || 'Pul Planning <digest@pul.llc>'
const ADMIN_SECRET    = process.env.ADMIN_SECRET || 'pul_admin_secret'
const OWNER_EMAILS    = ['sabrinahill@gmail.com', 'kaluaja@gmail.com']

function getCleanSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL || ''
  try {
    if (rawUrl && rawUrl.includes('supabase.co')) {
      return new URL(rawUrl).origin
    }
  } catch (e) {}
  return 'https://kwymfdbvfzexhckuaorh.supabase.co'
}

function adminClient() {
  const supabaseUrl = getCleanSupabaseUrl()
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || ''

  return createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  })
}

/**
 * Fetches user statistics from Supabase Auth (auth.users).
 * Requires SUPABASE_SECRET_KEY (service_role key) on server.
 */
export async function fetchUserStats() {
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY
  if (!supabaseSecret) {
    return {
      total_users: 0,
      new_today: 0,
      active_24h: 0,
      confirmed_users: 0,
      recent_users: [],
      error_notice: 'SUPABASE_SECRET_KEY is missing on Render. Please set SUPABASE_SECRET_KEY in Render Dashboard → pul-planning-backend → Environment Variables.',
      timestamp: new Date().toISOString(),
    }
  }

  const supabase = adminClient()

  // Query Supabase Auth admin API to list all registered accounts
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) {
    return {
      total_users: 0,
      new_today: 0,
      active_24h: 0,
      confirmed_users: 0,
      recent_users: [],
      error_notice: `Supabase Error: ${error.message}. Ensure SUPABASE_SECRET_KEY in Render is the secret/service_role key from Supabase Settings → API.`,
      timestamp: new Date().toISOString(),
    }
  }

  const users = data?.users || []
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const totalUsers = users.length
  const newToday = users.filter(u => new Date(u.created_at) >= oneDayAgo).length
  const activeToday = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= oneDayAgo).length
  const confirmedUsers = users.filter(u => u.email_confirmed_at).length

  // Fetch optional profile metadata (names, states) from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, state, employment_type, created_at')

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map(u => {
      const p = profileMap.get(u.id) || {}
      return {
        id: u.id,
        email: u.email || '—',
        name: p.full_name || '—',
        state: p.state || '—',
        employment: p.employment_type || '—',
        created_at: u.created_at,
        confirmed: !!u.email_confirmed_at,
      }
    })

  return {
    total_users: totalUsers,
    new_today: newToday,
    active_24h: activeToday,
    confirmed_users: confirmedUsers,
    recent_users: recentUsers,
    timestamp: now.toISOString(),
  }
}

/**
 * Method 2: GET /api/stats?secret=ADMIN_SECRET
 * Secret one-click endpoint for mobile & browser bookmarks.
 */
export async function handleAdminStats(req) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') || req.headers.get('x-admin-secret')
  const expectedSecret = ADMIN_SECRET

  if (secret !== expectedSecret) {
    return Response.json(
      { error: 'Unauthorized — valid secret parameter required' },
      { status: 401 }
    )
  }

  try {
    const stats = await fetchUserStats()
    const format = url.searchParams.get('format')

    if (format === 'text') {
      let text = `📊 Pul Planning Daily User Stats (${new Date(stats.timestamp).toLocaleDateString()})
========================================
Total Registered Users: ${stats.total_users}
New Signups (24h):     +${stats.new_today}
Active Users (24h):    ${stats.active_24h}
Confirmed Emails:      ${stats.confirmed_users}
========================================
`
      if (stats.error_notice) {
        text += `\n⚠️ SETUP NOTICE:\n${stats.error_notice}\n`
      } else {
        text += `Recent Signups:\n${stats.recent_users.map(u => ` • ${u.name} (${u.email}) - ${u.state} [${new Date(u.created_at).toLocaleDateString()}]`).join('\n')}\n`
      }

      return new Response(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return Response.json(stats)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Method 1: Sends daily stats email report to owners (sabrinahill@gmail.com, kaluaja@gmail.com).
 */
export async function sendOwnerDailyStatsReport() {
  if (!RESEND_API_KEY) {
    console.log('[stats-cron] RESEND_API_KEY not configured — skipping owner daily stats report')
    return { skipped: true }
  }

  try {
    const stats = await fetchUserStats()
    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const recentRowsHTML = stats.recent_users.map(u => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1E293B;color:#FFFFFF;font-weight:600;">${u.name}<br><span style="color:#94A3B8;font-weight:normal;font-size:12px;">${u.email}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E293B;color:#CBD5E1;">${u.state}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E293B;color:#94A3B8;">${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('')

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0A1628;color:#E8EDF5;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background-color:#111C35;border-radius:12px;padding:28px;border:1px solid #1E293B;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <h2 style="margin:0 0 4px;color:#00C896;font-size:22px;font-weight:800;">Pul Planning — Daily User Report 📊</h2>
        <div style="color:#94A3B8;font-size:13px;margin-bottom:24px;">${todayStr}</div>
        
        <!-- KPI Cards -->
        <table style="width:100%;border-spacing:8px;margin-bottom:24px;">
          <tr>
            <td style="background:#162240;padding:16px;border-radius:8px;border:1px solid #23335A;width:50%;">
              <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Total Users</div>
              <div style="color:#FFFFFF;font-size:28px;font-weight:800;margin-top:4px;">${stats.total_users}</div>
            </td>
            <td style="background:#162240;padding:16px;border-radius:8px;border:1px solid #23335A;width:50%;">
              <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">New Signups (24h)</div>
              <div style="color:#00C896;font-size:28px;font-weight:800;margin-top:4px;">+${stats.new_today}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#162240;padding:16px;border-radius:8px;border:1px solid #23335A;width:50%;">
              <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Active Users (24h)</div>
              <div style="color:#38BDF8;font-size:28px;font-weight:800;margin-top:4px;">${stats.active_24h}</div>
            </td>
            <td style="background:#162240;padding:16px;border-radius:8px;border:1px solid #23335A;width:50%;">
              <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Confirmed Emails</div>
              <div style="color:#A7F3D0;font-size:28px;font-weight:800;margin-top:4px;">${stats.confirmed_users}</div>
            </td>
          </tr>
        </table>

        ${stats.error_notice ? `<div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#FCA5A5;padding:12px;border-radius:6px;font-size:13px;margin-bottom:20px;">⚠️ ${stats.error_notice}</div>` : ''}

        <h3 style="color:#FFFFFF;font-size:15px;margin-top:24px;margin-bottom:12px;font-weight:700;">Recent Signups</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#162240;text-align:left;color:#94A3B8;">
              <th style="padding:8px 12px;border-bottom:1px solid #23335A;">User</th>
              <th style="padding:8px 12px;border-bottom:1px solid #23335A;">State</th>
              <th style="padding:8px 12px;border-bottom:1px solid #23335A;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${recentRowsHTML || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#94A3B8;">No signups recorded</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1E293B;font-size:12px;color:#64748B;text-align:center;">
          Automated report sent to ${OWNER_EMAILS.join(', ')} · <a href="https://pul.llc" style="color:#00C896;text-decoration:none;">Pul Planning (pul.llc)</a>
        </div>
      </div>
    </body>
    </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: OWNER_EMAILS,
        subject: `📊 Pul Planning Daily User Report (${stats.total_users} Total Users)`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Resend API failed (${res.status}): ${errText}`)
    }

    console.log(`[stats-cron] Daily owner stats report sent to ${OWNER_EMAILS.join(', ')}`)
    return { sent: true, recipients: OWNER_EMAILS }
  } catch (err) {
    console.error('[stats-cron] Failed to send owner stats report:', err.message)
    throw err
  }
}

/**
 * GET /api/stats/email?secret=ADMIN_SECRET
 * Allows owners to trigger the daily stats email manually anytime.
 */
export async function handleTriggerStatsEmail(req) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') || req.headers.get('x-admin-secret')

  if (secret !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendOwnerDailyStatsReport()
    return Response.json({ success: true, result })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
