// ============================================================
// OlaFinancial — Service Worker (Offline Cache)
// ============================================================

const CACHE_NAME   = 'olafinancial-v11';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/supabase-client.js',
  '/js/auth.js',
  '/js/router.js',
  '/js/charts.js',
  '/js/app.js',
  '/js/pages/onboarding.js',
  '/js/pages/dashboard.js',
  '/js/pages/income.js',
  '/js/pages/expenses.js',
  '/js/pages/balance-sheet.js',
  '/js/pages/debt.js',
  '/js/pages/cashflow.js',
  '/js/pages/emergency-fund.js',
  '/js/pages/goals.js',
  '/js/pages/retirement.js',
  '/js/pages/reports.js',
  '/js/lib/supabase.min.js',
  '/js/lib/chart.umd.min.js',
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Don't cache Supabase or external CDN requests — always go to network
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
