// ============================================================
// Pul Planning — Service Worker
// Network-first so deploys are visible without hard refresh.
// Clears old caches on activate / CLEAR_CACHES message.
// ============================================================

// Bump this when shipping SW logic changes (pairs with js/cache-control.js BUILD_ID)
const CACHE_NAME = 'pul-planning-v20';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/pul_logo.jpeg',
  '/js/config.js',
  '/js/cache-control.js',
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
  '/js/pages/assets.js',
  '/js/pages/liabilities.js',
  '/js/pages/debt.js',
  '/js/pages/cashflow.js',
  '/js/pages/emergency-fund.js',
  '/js/pages/goals.js',
  '/js/pages/retirement.js',
  '/js/pages/estate-planner.js',
  '/js/pages/insurance.js',
  '/js/pages/reports.js',
  '/js/pages/settings.js',
  '/js/pages/calculators.js',
  '/js/lib/supabase.min.js',
  '/js/lib/chart.umd.min.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).catch(err => {
        console.warn('[sw] precache partial failure', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});

function isExternal(url) {
  return (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('yahoo.com') ||
    url.hostname.includes('finnhub.io') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('corsproxy.io')
  );
}

/** Network-first: try network, fall back to cache (offline). Update cache on success. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === 'GET') {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isExternal(url)) {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Never long-cache the service worker script itself via SW logic
  if (url.pathname.endsWith('/sw.js') || url.pathname.endsWith('sw.js')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Network-first for navigations + HTML so deploys apply immediately
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Network-first for app JS/CSS/JSON (version query strings still help)
  if (
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Other same-origin (images, etc.): network-first with cache fallback
  event.respondWith(networkFirst(req));
});
