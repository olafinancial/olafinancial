// ============================================================
// WealthPath — Node.js HTTP Server
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
}

// ── REQUEST HANDLER ───────────────────────────────────────────
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
      const response = await API_ROUTES[key](req, url)
      const body = await response.text()
      res.writeHead(response.status, {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        ...Object.fromEntries(response.headers),
      })
      res.end(body)
    } catch (err) {
      console.error("[API error]", key, err.message)
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Internal server error" }))
    }
    return
  }

  // Static file server (serves the SPA)
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname
  filePath = join(PROJECT_ROOT, filePath)

  try {
    const data = readFileSync(filePath)
    const ext  = extname(filePath)
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" })
    res.end(data)
  } catch {
    // SPA fallback — serve index.html for all non-file paths
    try {
      const html = readFileSync(join(PROJECT_ROOT, "index.html"))
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      res.end(html)
    } catch {
      res.writeHead(404); res.end("Not found")
    }
  }
})

server.listen(PORT, () => {
  console.log(`\n⚡ WealthPath server running`)
  console.log(`   http://localhost:${PORT}`)
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ?? "(not set)"}`)
  console.log(`   ENV: ${process.env.NODE_ENV ?? "development"}\n`)
})
