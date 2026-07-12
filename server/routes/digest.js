// ============================================================
// OlaFinancial — Email Digest Route
// POST /api/digest/send  (internal — called by cron or admin)
// GET  /api/digest/run   (trigger manually in dev)
// ============================================================

import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY  = process.env.RESEND_API_KEY
const RESEND_FROM     = process.env.RESEND_FROM || 'digest@pul.llc'
const SUPABASE_URL    = process.env.SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const APP_URL         = process.env.APP_URL || 'https://olafinancial.org'

// Admin Supabase client — bypasses RLS to read all user data
function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false },
  })
}

// ── Determine if a user is due for a digest ─────────────────
function isDue(profile) {
  if (!profile.digest_enabled) return false
  const last = profile.digest_last_sent ? new Date(profile.digest_last_sent) : null
  const now  = new Date()

  if (profile.digest_frequency === 'daily') {
    return !last || (now - last) >= 23 * 60 * 60 * 1000
  }
  if (profile.digest_frequency === 'weekly') {
    // Send on Sunday (day 0) or if 7+ days since last
    const isSunday = now.getDay() === 0
    const overdue  = !last || (now - last) >= 7 * 24 * 60 * 60 * 1000
    return isSunday || overdue
  }
  if (profile.digest_frequency === 'monthly') {
    return !last || (now - last) >= 28 * 24 * 60 * 60 * 1000
  }
  return false
}

// ── Build KPI summary for a user ────────────────────────────
async function buildSummary(supabase, userId) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: income },
    { data: expenses },
    { data: assets },
    { data: liabs },
    { data: snapshots },
  ] = await Promise.all([
    supabase.from('income_entries').select('gross_amount,paye_tax,pension_contrib,nhf_contrib,other_deductions').eq('user_id', userId).eq('period_month', period),
    supabase.from('expense_entries').select('amount,is_discretionary').eq('user_id', userId).gte('expense_date', start).lte('expense_date', end),
    supabase.from('assets').select('open_balance,close_balance').eq('user_id', userId).eq('period_month', period),
    supabase.from('liabilities').select('open_balance,close_balance').eq('user_id', userId).eq('period_month', period),
    supabase.from('monthly_snapshots').select('net_worth,net_cash_flow,total_income,total_expenses').eq('user_id', userId).order('period_month', { ascending: false }).limit(2),
  ])

  // Kobo → readable (divide by 100 for NGN style, format as millions/thousands)
  const fmt = (n) => {
    if (!n) return '₦0'
    const v = Math.abs(n / 100)
    if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000)     return `₦${(v / 1_000).toFixed(1)}K`
    return `₦${v.toFixed(0)}`
  }

  const totalIncome   = (income   || []).reduce((s, r) => s + (r.gross_amount || 0) - (r.paye_tax || 0) - (r.pension_contrib || 0) - (r.nhf_contrib || 0) - (r.other_deductions || 0), 0)
  const totalExpenses = (expenses || []).reduce((s, r) => s + (r.amount || 0), 0)
  const netCashFlow   = totalIncome - totalExpenses
  const totalAssets   = (assets || []).reduce((s, r) => s + (r.close_balance || r.open_balance || 0), 0)
  const totalLiabs    = (liabs   || []).reduce((s, r) => s + (r.close_balance || r.open_balance || 0), 0)
  const netWorth      = totalAssets - totalLiabs
  const savingsRate   = totalIncome > 0 ? ((netCashFlow / totalIncome) * 100).toFixed(1) : 0

  // Net worth change vs prior month
  const nwChange = snapshots?.length >= 2
    ? snapshots[0].net_worth - snapshots[1].net_worth
    : null

  return {
    netWorth:      fmt(netWorth),
    netWorthRaw:   netWorth,
    nwChange:      nwChange !== null ? fmt(nwChange) : null,
    nwChangeRaw:   nwChange,
    totalIncome:   fmt(totalIncome),
    totalExpenses: fmt(totalExpenses),
    netCashFlow:   fmt(netCashFlow),
    netCashFlowRaw: netCashFlow,
    savingsRate,
  }
}

// ── Branded HTML email template ─────────────────────────────
function buildEmailHTML(name, summary, month, appUrl) {
  const nwColor   = summary.netWorthRaw   >= 0 ? '#00C896' : '#FF4D6D'
  const cfColor   = summary.netCashFlowRaw >= 0 ? '#00C896' : '#FF4D6D'
  const nwArrow   = summary.nwChangeRaw !== null ? (summary.nwChangeRaw >= 0 ? '▲' : '▼') : ''
  const nwChangeStr = summary.nwChange
    ? `${nwArrow} ${summary.nwChange} vs last month`
    : 'First month tracked'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${month} Financial Digest — pul.llc</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Inter,Helvetica,Arial,sans-serif;color:#E6EDF3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#161B22,#1C2331);border-radius:16px 16px 0 0;padding:32px 36px;border-bottom:1px solid #30363D;">
            <table width="100%"><tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:12px;">
                  <div style="width:44px;height:44px;background:#00C896;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:44px;text-align:center;">⚡</div>
                  <span style="font-size:1.5rem;font-weight:800;color:#ffffff;letter-spacing:-0.02em;margin-left:12px;">pul.llc</span>
                </div>
                <div style="color:#8B949E;font-size:0.8rem;margin-top:8px;letter-spacing:0.06em;text-transform:uppercase;">Financial Digest</div>
              </td>
              <td align="right" style="color:#8B949E;font-size:0.8rem;">${month}</td>
            </tr></table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="background:#161B22;padding:28px 36px 20px;">
            <p style="margin:0;font-size:1.1rem;color:#E6EDF3;">Hi <strong style="color:#ffffff;">${name || 'there'}</strong> 👋</p>
            <p style="margin:8px 0 0;color:#8B949E;font-size:0.9rem;line-height:1.6;">Here's your ${month} financial snapshot. Keep building that financial freedom.</p>
          </td>
        </tr>

        <!-- KPI Cards -->
        <tr>
          <td style="background:#161B22;padding:0 36px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Net Worth -->
                <td width="48%" style="background:#0D1117;border-radius:12px;padding:20px;border:1px solid #30363D;">
                  <div style="color:#8B949E;font-size:0.75rem;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">Net Worth</div>
                  <div style="font-size:1.6rem;font-weight:800;color:${nwColor};">${summary.netWorth}</div>
                  <div style="color:#8B949E;font-size:0.78rem;margin-top:6px;">${nwChangeStr}</div>
                </td>
                <td width="4%"></td>
                <!-- Cash Flow -->
                <td width="48%" style="background:#0D1117;border-radius:12px;padding:20px;border:1px solid #30363D;">
                  <div style="color:#8B949E;font-size:0.75rem;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">Net Cash Flow</div>
                  <div style="font-size:1.6rem;font-weight:800;color:${cfColor};">${summary.netCashFlow}</div>
                  <div style="color:#8B949E;font-size:0.78rem;margin-top:6px;">This month</div>
                </td>
              </tr>
              <tr><td colspan="3" height="12"></td></tr>
              <tr>
                <!-- Income -->
                <td width="48%" style="background:#0D1117;border-radius:12px;padding:20px;border:1px solid #30363D;">
                  <div style="color:#8B949E;font-size:0.75rem;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">Net Income</div>
                  <div style="font-size:1.4rem;font-weight:700;color:#E6EDF3;">${summary.totalIncome}</div>
                  <div style="color:#8B949E;font-size:0.78rem;margin-top:6px;">After tax & deductions</div>
                </td>
                <td width="4%"></td>
                <!-- Savings Rate -->
                <td width="48%" style="background:#0D1117;border-radius:12px;padding:20px;border:1px solid #30363D;">
                  <div style="color:#8B949E;font-size:0.75rem;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">Savings Rate</div>
                  <div style="font-size:1.4rem;font-weight:700;color:${summary.savingsRate >= 20 ? '#00C896' : summary.savingsRate >= 10 ? '#F0B429' : '#FF4D6D'};">${summary.savingsRate}%</div>
                  <div style="color:#8B949E;font-size:0.78rem;margin-top:6px;">Target: ≥ 20%</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#161B22;padding:0 36px 32px;text-align:center;">
            <a href="${appUrl}" style="display:inline-block;background:#00C896;color:#0D1117;font-weight:700;font-size:0.95rem;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">Open Dashboard →</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0D1117;border-radius:0 0 16px 16px;padding:24px 36px;border-top:1px solid #21262D;text-align:center;">
            <p style="margin:0;color:#484F58;font-size:0.78rem;line-height:1.6;">
              You're receiving this because you enabled Email Digests in your pul.llc settings.<br>
              <a href="${appUrl}/#/settings" style="color:#8B949E;text-decoration:underline;">Manage preferences</a> &nbsp;·&nbsp; 
              <a href="${appUrl}/#/settings" style="color:#8B949E;text-decoration:underline;">Unsubscribe</a>
            </p>
            <p style="margin:12px 0 0;color:#30363D;font-size:0.72rem;">pul.llc · olafinancial.org · Not financial advice.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Send one digest via Resend ───────────────────────────────
async function sendDigest(toEmail, name, summary, month) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

  const html = buildEmailHTML(name, summary, month, APP_URL)
  const subject = `${month} Financial Digest — pul.llc`

  const body = JSON.stringify({
    from:    RESEND_FROM,
    to:      [toEmail],
    subject,
    html,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend API error ${res.status}: ${err}`)
  }
  return await res.json()
}

// ── Main handler — runs the full digest job ──────────────────
export async function runDigestJob(options = {}) {
  const { dryRun = false, forceUserId = null } = options
  const supabase = adminClient()
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const results = { sent: 0, skipped: 0, errors: [] }

  // Fetch all users with digest enabled (or just the forced user)
  let query = supabase
    .from('user_profiles')
    .select('user_id,full_name,digest_enabled,digest_frequency,digest_email,digest_last_sent')
    .eq('digest_enabled', true)

  if (forceUserId) query = query.eq('user_id', forceUserId)

  const { data: profiles, error } = await query
  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`)

  for (const profile of (profiles || [])) {
    if (!forceUserId && !isDue(profile)) {
      results.skipped++
      continue
    }

    try {
      // Get the auth email from Supabase auth.users via admin API
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
      const toEmail = profile.digest_email || authUser?.user?.email
      if (!toEmail) { results.skipped++; continue }

      const summary = await buildSummary(supabase, profile.user_id)

      if (!dryRun) {
        await sendDigest(toEmail, profile.full_name, summary, month)

        // Update digest_last_sent
        await supabase
          .from('user_profiles')
          .update({ digest_last_sent: new Date().toISOString() })
          .eq('user_id', profile.user_id)
      }

      console.log(`[digest] Sent to ${toEmail} (${profile.full_name || profile.user_id})`)
      results.sent++
    } catch (err) {
      console.error(`[digest] Failed for ${profile.user_id}:`, err.message)
      results.errors.push({ user_id: profile.user_id, error: err.message })
    }
  }

  return results
}

// ── Route handler (GET /api/digest/run — dev/admin only) ─────
export async function handleDigestRun(req, res) {
  const url    = new URL(req.url, `http://localhost`)
  const dryRun = url.searchParams.get('dry') === '1'

  // Require secret header in production
  const secret = req.headers['x-admin-secret']
  if (process.env.NODE_ENV === 'production' && secret !== process.env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const results = await runDigestJob({ dryRun })
    return new Response(JSON.stringify({ ok: true, dryRun, ...results }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
