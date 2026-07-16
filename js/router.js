// ============================================================
// Pul Planning — Hash Router
// ============================================================

const WPRouter = (() => {
  let _routes = {};
  let _current = null;
  let _dispatching = false;
  let _started = false;
  let _queue = null; // path pending while dispatching

  function register(path, handler) {
    _routes[path] = handler;
  }

  /** Wipe all routes (switch between auth shell and app shell). */
  function clearRoutes() {
    _routes = {};
  }

  /** Normalize hash path so "#dashboard" and "#/dashboard" both resolve. */
  function _normalize(path) {
    if (!path || path === '/') return '/login';
    // Strip query/hash fragments accidentally included
    path = String(path).split('?')[0].split('#')[0];
    return path.startsWith('/') ? path : `/${path}`;
  }

  function navigate(path, replace = false) {
    path = _normalize(path);

    // No-op if already on this path (stops login↔dashboard thrash)
    if (path === _current && window.location.hash === '#' + path) {
      return;
    }

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

    // Re-entrancy: if a handler navigates, finish current then run latest path once
    if (_dispatching) {
      _queue = path;
      return;
    }
    _dispatching = true;

    try {
      let guard = 0;
      let next = path;
      while (next && guard++ < 8) {
        _queue = null;
        const resolved = _runHandler(next);
        // Handler may have queued a new path via navigate()
        next = _queue;
        if (!next || next === resolved) break;
      }
      if (guard >= 8) {
        console.error('[Router] Navigation loop detected; stopping at', _current);
      }
    } finally {
      _dispatching = false;
      _queue = null;
    }
  }

  function _runHandler(path) {
    let handler = _routes[path];
    let params  = {};

    if (!handler) {
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
      // Prefer staying put / login over bouncing between missing routes
      const fallback = _routes['/login']
        ? '/login'
        : (_routes['/dashboard'] ? '/dashboard' : null);
      if (fallback && fallback !== path) {
        console.warn(`[Router] No handler for ${path}; falling back to ${fallback}`);
        const hash = '#' + fallback;
        history.replaceState(null, '', hash);
        path = fallback;
        handler = _routes[path];
      } else {
        console.warn(`[Router] Route not found: ${path}`);
        return path;
      }
    }

    if (!handler) return path;

    _current = path;
    try {
      handler(params);
    } catch (err) {
      console.error(`[Router] Handler error for ${path}`, err);
    }
    return path;
  }

  function start() {
    if (!_started) {
      _started = true;
      window.addEventListener('popstate', () => {
        const path = window.location.hash.replace('#', '') || '/login';
        _dispatch(path);
      });
      window.addEventListener('hashchange', () => {
        const path = window.location.hash.replace('#', '') || '/login';
        // Ignore if we already handled this path via navigate()
        if (_normalize(path) === _current && !_dispatching) return;
        _dispatch(path);
      });
    }
    const initial = window.location.hash.replace('#', '') || '/login';
    _dispatch(initial);
  }

  function current() { return _current; }

  function hasRoute(path) {
    return !!_routes[_normalize(path)];
  }

  return { register, clearRoutes, navigate, start, current, hasRoute };
})();
