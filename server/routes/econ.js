// ============================================================
// OlaFinancial — Econ Data Route: GET /api/econ
// Serves manually-maintained Nigeria macroeconomic indicators.
// Update server/data/econ-ng.json when NBS/CBN release new data.
// ============================================================

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function handleEcon(_req) {
  try {
    const dataPath = join(__dirname, '..', 'data', 'econ-ng.json')
    const raw = readFileSync(dataPath, 'utf8')
    const data = JSON.parse(raw)

    // Fetch live FX rates from ExchangeRate-API
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      if (res.ok) {
        const fxData = await res.json()
        if (fxData && fxData.rates && fxData.rates.NGN) {
          const usdToNgn = Math.round(fxData.rates.NGN)
          const usdToGbp = fxData.rates.GBP || 0.78
          const usdToEur = fxData.rates.EUR || 0.92

          // Compute cross-rates for GBP and EUR
          const gbpToNgn = Math.round(usdToNgn / usdToGbp)
          const eurToNgn = Math.round(usdToNgn / usdToEur)

          data.fx = {
            usd: usdToNgn,
            gbp: gbpToNgn,
            eur: eurToNgn,
            period: "Live Feed",
            source: "ExchangeRate-API",
            sourceUrl: "https://www.exchangerate-api.com/",
            description: "Exchange rates: NGN per 1 unit of foreign currency"
          }
          
          // Label the source update date dynamically
          const now = new Date()
          data.updatedAt = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        }
      }
    } catch (fxErr) {
      console.warn("Failed to fetch live FX rates, using cached data:", fxErr.message)
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Econ data unavailable', detail: err.message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
