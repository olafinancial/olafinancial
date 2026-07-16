// ============================================================
// Pul Planning — Client cache control
// Ensures users pick up new deploys without a hard refresh.
// Clears app caches on sign-out and when leaving the app.
// Does NOT wipe user data in localStorage (stocks, prefs).
// ============================================================

const WPCacheControl = (() => {
  // Bump when shipping cache-policy or SW behaviour changes
  const BUILD_ID = '20260716_nav2';
  const BUILD_KEY = 'wp_app_build_id';
  let _leaveHooked = false;
  let _reloading = false;

  /** Delete all Cache Storage entries for this origin. */
  async function clearCacheStorage() {
    if (!('caches' in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('[cache] Cleared Cache Storage:', keys.length, 'cache(s)');
    } catch (e) {
      console.warn('[cache] clearCacheStorage failed', e);
    }
  }

  /** Ask the active service worker to clear caches (works while SW still controls the page). */
  function postToSW(msg) {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
      }
    } catch (_) { /* ignore */ }
  }

  /**
   * Unregister every service worker for this origin so the next visit
   * installs a fresh SW and re-fetches assets from the network.
   */
  async function unregisterServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log('[cache] Unregistered service workers:', regs.length);
    } catch (e) {
      console.warn('[cache] unregister failed', e);
    }
  }

  /**
   * Full client-side purge of *app assets* (not Supabase session cookies —
   * those are cleared by WPDb.signOut). Call on sign-out and when leaving.
   */
  async function purgeAppCaches({ unregisterSW = true } = {}) {
    postToSW({ type: 'CLEAR_CACHES' });
    await clearCacheStorage();
    if (unregisterSW) await unregisterServiceWorkers();
    try {
      sessionStorage.removeItem(BUILD_KEY);
    } catch (_) { /* ignore */ }
  }

  /**
   * On leave (tab close): clear asset caches so the next open downloads
   * the latest build. Skipped under automation (Playwright sets webdriver)
   * because full navigations fire pagehide and would wipe the SW cache
   * mid-test / mid-session reload.
   */
  function setupLeaveHooks() {
    if (_leaveHooked) return;
    _leaveHooked = true;

    // Playwright / CI browsers
    if (navigator.webdriver) {
      console.log('[cache] Leave-hook purge disabled (automated browser)');
      return;
    }

    const onLeave = (event) => {
      // Only purge on real document unload, not bfcache freeze alone
      if (event && event.type === 'pagehide' && event.persisted) return;
      postToSW({ type: 'CLEAR_CACHES' });
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
      }
    };

    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
  }

  /**
   * Register SW with update checks. When a new SW activates, reload once
   * so customers get new HTML/JS without a hard refresh.
   */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Detect build change across deploys (query string on this script or meta)
    try {
      const prev = localStorage.getItem(BUILD_KEY);
      if (prev && prev !== BUILD_ID) {
        // New deploy detected — wipe stale caches before SW re-registers
        clearCacheStorage();
      }
      localStorage.setItem(BUILD_KEY, BUILD_ID);
    } catch (_) { /* ignore */ }

    const swUrl = `sw.js?v=${BUILD_ID}`;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloading) return;
      _reloading = true;
      console.log('[cache] New service worker took control — reloading for latest assets');
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('[cache] ServiceWorker registered', reg.scope);

        // Proactively check for updates on every load and when tab is focused
        const check = () => reg.update().catch(() => {});
        check();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        setInterval(check, 5 * 60 * 1000);

        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(err => {
        console.error('[cache] ServiceWorker registration failed', err);
      });
    });
  }

  function init() {
    setupLeaveHooks();
    registerServiceWorker();
  }

  return {
    BUILD_ID,
    clearCacheStorage,
    purgeAppCaches,
    unregisterServiceWorkers,
    init,
  };
})();
