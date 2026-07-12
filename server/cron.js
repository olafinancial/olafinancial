// ============================================================
// OlaFinancial — Daily Cron Runner
// Runs once on server startup, checks every hour at :00 for
// digest jobs that need to fire (weekly Sunday / daily / monthly)
// ============================================================

import { runDigestJob } from './routes/digest.js'

let _timer = null

function shouldRunNow() {
  const now = new Date()
  const h   = now.getUTCHours()
  // Run digest checks at 07:00 UTC (8am WAT / Lagos time)
  return h === 7
}

export function startCron() {
  if (_timer) return          // already running
  if (!process.env.RESEND_API_KEY) {
    console.log('[cron] RESEND_API_KEY not set — email digest cron disabled')
    return
  }

  console.log('[cron] Email digest scheduler started (checks hourly at :00)')

  // Run immediately on startup only if it's the right hour
  if (shouldRunNow()) _runDigests()

  // Then check every hour
  _timer = setInterval(() => {
    if (shouldRunNow()) _runDigests()
  }, 60 * 60 * 1000)          // every 60 minutes

  // Allow clean shutdown
  process.once('SIGTERM', stopCron)
  process.once('SIGINT',  stopCron)
}

export function stopCron() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
    console.log('[cron] Email digest scheduler stopped')
  }
}

async function _runDigests() {
  const start = Date.now()
  console.log(`[cron] Running email digest job at ${new Date().toISOString()}`)
  try {
    const results = await runDigestJob()
    console.log(`[cron] Digest job complete in ${Date.now() - start}ms — sent:${results.sent} skipped:${results.skipped} errors:${results.errors.length}`)
    if (results.errors.length) {
      results.errors.forEach(e => console.error(`[cron]   ✗ ${e.user_id}: ${e.error}`))
    }
  } catch (err) {
    console.error('[cron] Digest job failed:', err.message)
  }
}
