// ============================================================
// OlaFinancial — Hash Router
// ============================================================

const WPRouter = (() => {
  const _routes = {};
  let _current = null;

  function register(path, handler) {
    _routes[path] = handler;
  }

  function navigate(path, replace = false) {
    const hash = '#' + path;
    if (replace) {
      history.replaceState(null, '', hash);
    } else {
      history.pushState(null, '', hash);
    }
    _dispatch(path);
  }

  function _dispatch(path) {
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
      navigate('/dashboard', true);
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
    const initial = window.location.hash.replace('#', '') || '/login';
    _dispatch(initial);
  }

  function current() { return _current; }

  return { register, navigate, start, current };
})();
