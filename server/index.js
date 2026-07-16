// ============================================================
// OlaFinancial — Node.js HTTP Server
// Uses @supabase/server withSupabase for auth-aware handlers
// Run: npm run dev   (reads .env automatically via --env-file)
// ============================================================

import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { join, extname } from "node:path"
import { fileURLToPath } from "node:url"

// Route handlers
import { handleProfile }       from "./routes/profile.js"
import { handleSnapshot }      from "./routes/snapshot.js"
import { handleAdminUsers }    from "./routes/admin-users.js"
import { handleHealth }        from "./routes/health.js"
import { handleEcon }          from "./routes/econ.js"
import { handleDigestRun }     from "./routes/digest.js"
import { handleAccountReset, handleAccountDelete } from "./routes/account.js"
import { startCron }           from "./cron.js"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")
const PORT = parseInt(process.env.PORT ?? "3000")

// ── MIME TYPES ────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css",
  ".js":   "text/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
}

// ── ROUTER ────────────────────────────────────────────────────
const API_ROUTES = {
  "GET  /api/health":          handleHealth,
  "GET  /api/profile":         handleProfile,
  "POST /api/snapshot":        handleSnapshot,
  "GET  /api/admin/users":     handleAdminUsers,
  "GET  /api/econ":            handleEcon,
  "GET  /api/digest/run":      handleDigestRun,   // admin trigger
  "POST /api/account/reset":   handleAccountReset,
  "POST /api/account/delete":  handleAccountDelete,
}

// ── REQUEST HANDLER ───────────────────────────────────────────
async function toWebRequest(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let body = undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    body = Buffer.concat(chunks)
  }

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v)
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    duplex: body && body.length > 0 ? "half" : undefined,
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const key = `${req.method}  ${url.pathname}`

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return }

  // API routes
  if (API_ROUTES[key]) {
    try {
      const webReq = await toWebRequest(req)
      const response = await API_ROUTES[key](webReq)
      const body = await response.text()
      res.writeHead(response.status, {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        ...Object.fromEntries(response.headers),
      })
      res.end(body)
    } catch (err) {
      console.error("[API error]", key, err.stack || err.message)
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Internal server error" }))
    }
    return
  }

  // Static file server (serves the SPA)
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname
  filePath = join(PROJECT_ROOT, filePath)

  /** Cache headers so browsers pick up deploys without a hard refresh. */
  function cacheHeaders(ext, pathname) {
    const type = MIME[ext] ?? "application/octet-stream"
    // HTML + service worker: always revalidate
    if (
      ext === ".html" ||
      pathname === "/" ||
      pathname.endsWith("/sw.js") ||
      pathname.endsWith("sw.js") ||
      pathname.endsWith("cache-control.js")
    ) {
      return {
        "Content-Type": type,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    }
    // Versioned JS/CSS (?v=) can be short-cached; still revalidate
    if (ext === ".js" || ext === ".css") {
      return {
        "Content-Type": type,
        "Cache-Control": "no-cache, must-revalidate",
      }
    }
    return {
      "Content-Type": type,
      "Cache-Control": "public, max-age=300, must-revalidate",
    }
  }

  try {
    const data = readFileSync(filePath)
    const ext  = extname(filePath)
    res.writeHead(200, cacheHeaders(ext, url.pathname))
    res.end(data)
  } catch {
    // SPA fallback — serve index.html for all non-file paths
    try {
      const html = readFileSync(join(PROJECT_ROOT, "index.html"))
      res.writeHead(200, cacheHeaders(".html", "/index.html"))
      res.end(html)
    } catch {
      res.writeHead(404); res.end("Not found")
    }
  }
})

server.listen(PORT, () => {
  console.log(`\n⚡ Pul Planning server running`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ?? "(not set)"}`)
  console.log(`   ENV: ${process.env.NODE_ENV ?? "development"}\n`)
  // Start email digest cron (no-ops if RESEND_API_KEY not set)
  startCron()
})
