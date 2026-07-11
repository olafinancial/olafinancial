// ============================================================
// OlaFinancial — Econ Data Route: GET /api/econ
// Serves manually-maintained Nigeria macroeconomic indicators.
// Update server/data/econ-ng.json when NBS/CBN release new data.
// ============================================================

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function handleEcon(_req) {
  try {
    const dataPath = join(__dirname, '..', 'data', 'econ-ng.json')
    const raw = readFileSync(dataPath, 'utf8')
    const data = JSON.parse(raw)
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Econ data unavailable', detail: err.message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
