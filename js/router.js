// ============================================================
// OlaFinancial — Hash Router
// ============================================================

const WPRouter = (() => {
  const _routes = {};
  let _current = null;

  function register(path, handler) {
    console.log(`[Router] Registering route: ${path}`, !!handler);
    _routes[path] = handler;
  }

  /** Normalize hash path so "#dashboard" and "#/dashboard" both resolve. */
  function _normalize(path) {
    if (!path || path === '/') return '/login';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function navigate(path, replace = false) {
    path = _normalize(path);
    console.log(`[Router] Navigating to: ${path}`);
    const hash = '#' + path;
    if (replace) {
      history.replaceState(null, '', hash);
    } else {
      history.pushState(null, '', hash);
    }
    _dispatch(path);
  }

  function _dispatch(path) {
    path = _normalize(path);
    console.log(`[Router] Dispatching path: "${path}". Registered routes:`, Object.keys(_routes));
    // Match exact or with params
    let handler = _routes[path];
    let params  = {};

    if (!handler) {
      // Try parameterized routes
      for (const [pattern, fn] of Object.entries(_routes)) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
        const match = path.match(regex);
        if (match) {
          const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          keys.forEach((k, i) => { params[k] = match[i + 1]; });
          handler = fn;
          break;
        }
      }
    }

    if (!handler) {
      const fallback = _routes['/dashboard'] ? '/dashboard' : (_routes['/login'] ? '/login' : null);
      if (fallback && fallback !== path) {
        navigate(fallback, true);
      } else {
        console.warn(`Route not found: ${path} and no valid fallback registered.`);
      }
      return;
    }

    _current = path;
    handler(params);
  }

  function start() {
    window.addEventListener('popstate', () => {
      const path = window.location.hash.replace('#', '') || '/login';
      _dispatch(path);
    });
    // Also react to hash-only navigations (e.g. direct #/route links / tests)
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.replace('#', '') || '/login';
      _dispatch(path);
    });
    const initial = window.location.hash.replace('#', '') || '/login';
    _dispatch(initial);
  }

  function current() { return _current; }

  return { register, navigate, start, current };
})();
