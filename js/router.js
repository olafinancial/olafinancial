// ============================================================
// Pul Planning — Hash Router (simple + reliable)
// ============================================================

const WPRouter = (() => {
  let _routes = {};
  let _current = null;
  let _started = false;
  let _navToken = 0; // increments each navigation; async handlers check this

  function register(path, handler) {
    _routes[_normalize(path)] = handler;
  }

  function clearRoutes() {
    _routes = {};
  }

  function _normalize(path) {
    if (path == null || path === '' || path === '/') return '/login';
    path = String(path).trim();
    // From location.hash: "#/income" or "#income"
    if (path.startsWith('#')) path = path.slice(1);
    path = path.split('?')[0];
    if (!path.startsWith('/')) path = '/' + path;
    // Collapse accidental //
    path = path.replace(/\/{2,}/g, '/');
    return path || '/login';
  }

  function _pathFromLocation() {
    return _normalize(window.location.hash || '#/login');
  }

  /**
   * Navigate to a hash route. Always dispatches the handler.
   */
  function navigate(path, replace = false) {
    path = _normalize(path);
    const hash = '#' + path;

    if (replace) {
      history.replaceState(null, '', hash);
    } else if (window.location.hash !== hash) {
      // pushState so we control dispatch (avoid double hashchange+dispatch races)
      history.pushState(null, '', hash);
    }

    _dispatch(path);
  }

  function _dispatch(path) {
    path = _normalize(path);
    const token = ++_navToken;

    let handler = _routes[path];
    let params = {};

    if (!handler) {
      for (const [pattern, fn] of Object.entries(_routes)) {
        if (!pattern.includes(':')) continue;
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
      console.warn('[Router] No route for', path, 'known:', Object.keys(_routes));
      // Only fall back once — never bounce login↔dashboard
      if (path !== '/login' && _routes['/login']) {
        history.replaceState(null, '', '#/login');
        _current = '/login';
        try { _routes['/login']({}); } catch (e) { console.error(e); }
      } else if (path !== '/dashboard' && _routes['/dashboard']) {
        history.replaceState(null, '', '#/dashboard');
        _current = '/dashboard';
        try { _routes['/dashboard']({}); } catch (e) { console.error(e); }
      }
      return;
    }

    _current = path;

    // Support async handlers without blocking the router
    Promise.resolve()
      .then(() => handler(params, token))
      .catch(err => console.error('[Router] handler failed for', path, err));
  }

  function start() {
    if (!_started) {
      _started = true;
      window.addEventListener('popstate', () => {
        const path = _pathFromLocation();
        if (path === _current) return;
        _dispatch(path);
      });
      // Backup for anything that sets location.hash directly
      window.addEventListener('hashchange', () => {
        const path = _pathFromLocation();
        if (path === _current) return;
        _dispatch(path);
      });
    }
    _dispatch(_pathFromLocation());
  }

  function current() {
    return _current;
  }

  function hasRoute(path) {
    return !!_routes[_normalize(path)];
  }

  /** True if this navigation was superseded by a newer one. */
  function isStale(token) {
    return token != null && token !== _navToken;
  }

  function navToken() {
    return _navToken;
  }

  return {
    register,
    clearRoutes,
    navigate,
    start,
    current,
    hasRoute,
    isStale,
    navToken,
  };
})();
