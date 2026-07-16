// ============================================================
// OlaFinancial — App Bootstrap & State Management
// ============================================================

const WPApp = (() => {

  // Global state
  const state = {
    user:    null,
    profile: null,
    data: {
      income:      [],
      expenses:    [],
      assets:      [],
      liabilities: [],
      goals:       [],
      emergencyFund: null,
      snapshots:   [],
    },
    loading: false,
  };

  // Current active page module
  let _activePage = null;
  let _pageLoadGen = 0; // cancel stale async page loads

  // ── BOOT ──────────────────────────────────────────────────
  async function boot() {
    try {
      WPDb.init();
      const session = await WPDb.getSession();

      if (!session) {
        _showAuth();
        return;
      }

      state.user = session.user;
      state.profile = await WPDb.getProfile(session.user.id);
      WPAuth.startIdleWatcher();

      // Always initialize the app shell structure and routes first
      _showApp();

      // Route guard: onboarding incomplete (only if logged in)
      if (state.user && (!state.profile || !state.profile.onboarding_done)) {
        WPRouter.navigate('/onboarding', true);
        return;
      }

      // Ensure router listeners exist, then land on a real app route
      WPRouter.start();
      const currentPath = window.location.hash.replace('#', '') || '/dashboard';
      const authPaths = ['/login', '/signup', '/logged-out', 'login', 'signup', 'logged-out'];
      if (authPaths.includes(currentPath) || currentPath === '/' || currentPath === '') {
        WPRouter.navigate('/dashboard', true);
      }
      // else start() already dispatched the current app path (e.g. #/income)
    } catch (err) {
      console.error("[Boot Error]", err);
      const splash = document.getElementById('app-splash');
      if (splash) {
        splash.style.background = '#0A1628';
        splash.innerHTML = `
          <div style="text-align:center; padding: 2.5rem; max-width: 440px; background: rgba(255, 75, 75, 0.08); border-radius: 16px; border: 1px solid #FF4B4B; box-shadow: 0 8px 32px rgba(0,0,0,0.4)">
            <div style="font-size: 2.5rem; margin-bottom: 1rem">⚠️</div>
            <h3 style="color: #ffffff; margin-bottom: 0.75rem; font-weight: 700">Initialization Failed</h3>
            <p style="color: #A0AEC0; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.75rem">
              ${err.message || err || 'An unexpected error occurred while loading the app.'}
            </p>
            <button class="btn btn-primary" onclick="window.location.reload()" style="padding: 0.6rem 1.5rem">Try Again</button>
          </div>
        `;
      }
    }
  }

  // ── AUTH SHELL (no sidebar) ───────────────────────────────
  function _showAuth() {
    _activePage = null;
    // Ensure no leftover logged-in state drives login→dashboard bounce
    state.user = null;
    state.profile = null;
    document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
    _registerAuthRoutes();
    WPRouter.start();
  }

  /**
   * Tear down the logged-in shell and show auth UI.
   * Used by WPAuth.signOut so /logged-out is always registered.
   */
  function enterAuthShell(path = '/logged-out') {
    _activePage = null;
    state.user = null;
    state.profile = null;
    document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
    _registerAuthRoutes();
    const target = path.startsWith('/') ? path : `/${path}`;
    history.replaceState(null, '', '#' + target);
    WPRouter.start();
  }

  function _ensureAuthRoot() {
    let container = document.getElementById('auth-root');
    if (!container) {
      document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
      container = document.getElementById('auth-root');
    }
    return container;
  }

  function _registerAuthRoutes() {
    // Drop app routes so missing dashboard cannot fight with /login
    if (typeof WPRouter.clearRoutes === 'function') WPRouter.clearRoutes();

    WPRouter.register('/login',  () => {
      // If we still have a session user, rebuild the app shell instead of looping
      if (state.user) {
        if (document.getElementById('page-container') && WPRouter.hasRoute('/dashboard')) {
          WPRouter.navigate('/dashboard', true);
        } else {
          // Stale user flag without app shell — clear and show login
          state.user = null;
          state.profile = null;
          const container = _ensureAuthRoot();
          if (container) WPAuth.renderLogin(container);
        }
        return;
      }
      const container = _ensureAuthRoot();
      if (container) WPAuth.renderLogin(container);
    });
    WPRouter.register('/signup', () => {
      if (state.user) {
        if (document.getElementById('page-container') && WPRouter.hasRoute('/dashboard')) {
          WPRouter.navigate('/dashboard', true);
        } else {
          state.user = null;
          state.profile = null;
          const container = _ensureAuthRoot();
          if (container) WPAuth.renderSignup(container);
        }
        return;
      }
      const container = _ensureAuthRoot();
      if (container) WPAuth.renderSignup(container);
    });
    WPRouter.register('/logged-out', () => {
      const container = _ensureAuthRoot();
      if (container) {
        const social = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandSocialHTML)
          ? APP_CONFIG.brandSocialHTML()
          : '';
        container.innerHTML = `
          <div class="auth-shell">
            <div class="auth-card" style="text-align: center; padding: 3rem 2rem;">
              <div style="font-size: 3.5rem; margin-bottom: 1.25rem;">👋</div>
              <h2 style="color: #ffffff; margin-bottom: 0.5rem; font-weight: 700;">You've been signed out</h2>
              <p style="color: var(--clr-text-3); font-size: 0.9rem; margin-bottom: 1.25rem; line-height: 1.5;">Thank you for using Pul Planning. Your session has been safely closed.</p>
              <div style="display:flex;justify-content:center;margin-bottom:1.5rem">${social}</div>
              <button class="btn btn-primary" style="width: 100%;" onclick="WPRouter.navigate('/login')">Sign In Again</button>
            </div>
          </div>
        `;
      }
    });
  }

  // ── APP SHELL (sidebar + content) ────────────────────────
  function _showApp() {
    document.getElementById('root').innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="52" height="44" />
            <div>
              <div class="sidebar-logo-text">Pul Planning</div>
            </div>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav"></nav>
          <div class="sidebar-footer">
            ${typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandSocialHTML ? APP_CONFIG.brandSocialHTML('compact') : ''}
            <div class="sidebar-user" id="sidebar-user">
              <div class="sidebar-avatar" id="sidebar-avatar">?</div>
              <div class="sidebar-user-info">
                <div class="sidebar-user-name" id="sidebar-user-name">Loading…</div>
                <div class="sidebar-user-email" id="sidebar-user-email"></div>
              </div>
            </div>
          </div>
        </aside>
        <main class="main-content" id="main-content">
          <div id="page-container"></div>
        </main>
        <!-- Mobile bottom nav -->
        <nav class="bottom-nav" id="bottom-nav"></nav>
      </div>
      <div id="toast-container"></div>`;

    _renderNav();
    _updateUserInfo();
    _registerAppRoutes();
    // Do not start() here — boot() decides initial route after onboarding checks.
    // (Calling start() immediately re-dispatches #/login and can loop with auth handlers.)

    // Mobile sidebar toggle (once)
    if (!window.__wpSidebarClickBound) {
      window.__wpSidebarClickBound = true;
      document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  // ── NAV ITEMS ─────────────────────────────────────────────
  const NAV_ITEMS = [
    { path: '/dashboard',      icon: '&#x2302;',  label: 'Dashboard',      section: 'Overview' },
    { path: '/income',         icon: '&#x2B06;',  label: 'Income',         section: 'Income Statement' },
    { path: '/expenses',       icon: '&#x2B07;',  label: 'Expenses',       section: 'Income Statement' },
    { path: '/budget',         icon: '&#x1F4CA;', label: 'Budget Planner', section: 'Income Statement' },
    { path: '/balance-sheet',  icon: '&#x2696;',  label: 'Overview',       section: 'Balance Sheet' },
    { path: '/assets',         icon: '&#x1F4C8;', label: 'Assets',         section: 'Balance Sheet' },
    { path: '/liabilities',    icon: '&#x1F4C9;', label: 'Liabilities',    section: 'Balance Sheet' },
    { path: '/cashflow',       icon: '&#x21C4;',  label: 'Cash Flow',      section: 'Balance Sheet' },
    { path: '/goals',          icon: '&#x1F3AF;', label: 'Goals',          section: 'Tools' },
    { path: '/debt',           icon: '&#x1F4B3;', label: 'Debt Planner',   section: 'Tools' },
    { path: '/emergency-fund', icon: '&#x1F6E1;', label: 'Emergency Fund', section: 'Tools' },
    { path: '/retirement',     icon: '&#x1F334;', label: 'Retirement',     section: 'Tools' },
    { path: '/estate-planner', icon: '&#x1F4DC;', label: 'Estate Planner', section: 'Tools' },
    { path: '/insurance',      icon: '&#x1F6E1;', label: 'Insurance',      section: 'Tools' },
    { path: '/invest',         icon: '&#x1F4C8;', label: 'Invest Profile', section: 'Tools' },
    { path: '/calculators',    icon: '&#x1F5A5;', label: 'Calculators',    section: 'Tools' },
    { path: '/reports',        icon: '&#x1F4CA;', label: 'Reports',        section: 'Reports' },
    { path: '/settings',       icon: '&#x2699;',  label: 'Settings',       section: 'Account' },
  ];

  // Mobile bottom nav: 5 key tabs
  const MOBILE_TABS = ['/dashboard', '/income', '/expenses', '/goals', '/reports'];

  function _renderNav() {
    const nav = document.getElementById('sidebar-nav');
    const bottomNav = document.getElementById('bottom-nav');
    if (!nav) return;

    let lastSection = '';
    let html = '';
    for (const item of NAV_ITEMS) {
      if (item.section !== lastSection) {
        html += `<div class="nav-section-label">${item.section}</div>`;
        lastSection = item.section;
      }
      html += `<div class="nav-item" data-path="${item.path}" id="nav-${item.path.replace('/','').replace('-','_')}">
        <span style="font-size:1.1rem">${item.icon}</span>
        <span>${item.label}</span>
      </div>`;
    }
    // Logout
    html += `
      <div class="nav-item" id="nav-logout">
        <span>&#x2B9E;</span><span>Sign Out</span>
      </div>`;
    nav.innerHTML = html;

    // Mobile nav
    if (bottomNav) {
      bottomNav.innerHTML = MOBILE_TABS.map(p => {
        const item = NAV_ITEMS.find(n => n.path === p);
        if (!item) return '';
        return `<div class="bottom-nav-item" data-path="${p}">
          <span style="font-size:1.3rem">${item.icon}</span>
          <span>${item.label}</span>
        </div>`;
      }).join('');
      bottomNav.addEventListener('click', e => {
        const item = e.target.closest('[data-path]');
        if (item) WPRouter.navigate(item.dataset.path);
      });
    }

    nav.addEventListener('click', e => {
      const item = e.target.closest('[data-path]');
      if (item) { WPRouter.navigate(item.dataset.path); _closeMobileSidebar(); }
    });
    
    document.getElementById('nav-logout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.currentTarget;
      if (btn) {
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
      }
      try {
        await WPAuth.signOut();
      } catch (err) {
        console.error('Sign out failed', err);
        // Force auth shell even if something threw
        if (typeof WPApp.enterAuthShell === 'function') WPApp.enterAuthShell('/login');
      }
    });
  }

  function _closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
  }

  function _updateUserInfo() {
    const name  = state.profile?.full_name || state.user?.email?.split('@')[0] || 'User';
    const email = state.user?.email || '';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const el = document.getElementById('sidebar-user-name');
    const em = document.getElementById('sidebar-user-email');
    const av = document.getElementById('sidebar-avatar');
    if (el) el.textContent = name;
    if (em) em.textContent = email;
    if (av) av.textContent = initials;

  }

  function _setActiveNav(path) {
    document.querySelectorAll('.nav-item[data-path]').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
    document.querySelectorAll('.bottom-nav-item[data-path]').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  // ── ROUTE → PAGE MAPPING ──────────────────────────────────
  function _registerAppRoutes() {
    // Drop auth-only routes so #/login cannot fight app navigation after sign-in
    if (typeof WPRouter.clearRoutes === 'function') WPRouter.clearRoutes();

    const pages = {
      '/onboarding':    WPOnboarding,
      '/dashboard':     WPDashboard,
      '/income':        WPIncome,
      '/expenses':      WPExpenses,
      '/budget':        WPBudget,
      '/balance-sheet': WPBalanceSheet,
      '/assets':        WPAssets,
      '/liabilities':   WPLiabilities,
      '/cashflow':      WPCashflow,
      '/debt':          WPDebt,
      '/emergency-fund':WPEmergencyFund,
      '/goals':         WPGoals,
      '/retirement':    WPRetirement,
      '/estate-planner':WPEstatePlanner,
      '/insurance':     WPInsurance,
      '/invest':        WPInvestmentQuiz,
      // Legacy: salary calculator lives under Calculators → Salary / PAYE
      '/salary-calc':   {
        async init(container) {
          try { sessionStorage.setItem('wp_calc_tab', 'salary'); } catch { /* ignore */ }
          // Delegate fully to Calculators hub (avoids hash race / stuck skeleton)
          if (typeof WPCalculators !== 'undefined') {
            await WPCalculators.init(container);
          } else {
            container.innerHTML = '<div class="page-body" style="padding:2rem">Calculators module failed to load. Hard-refresh the page.</div>';
          }
        },
        destroy() {
          if (typeof WPCalculators !== 'undefined') {
            try { WPCalculators.destroy(); } catch { /* ignore */ }
          }
        },
      },
      '/calculators':    WPCalculators,
      '/reports':       WPReports,
      '/settings':      WPSettings,
    };

    for (const [path, page] of Object.entries(pages)) {
      WPRouter.register(path, async (params) => {
        _setActiveNav(path);
        await _loadPage(page, params);
      });
    }
  }

  async function _loadPage(page, params = {}) {
    const gen = ++_pageLoadGen;

    try {
      if (_activePage && typeof _activePage.destroy === 'function') {
        try { _activePage.destroy(); } catch (e) { console.warn('[page destroy]', e); }
      }
    } catch (e) { console.warn('[page destroy outer]', e); }

    // Route guard: if onboarding is not done, only allow onboarding page (only for logged in users)
    if (state.user && page !== WPOnboarding && (!state.profile || !state.profile.onboarding_done)) {
      WPRouter.navigate('/onboarding', true);
      return;
    }

    // Toggle sidebar visibility based on active page
    const shell = document.querySelector('.app-shell');
    if (shell) {
      if (page === WPOnboarding) {
        shell.classList.add('no-sidebar');
      } else {
        shell.classList.remove('no-sidebar');
      }
    }

    const container = document.getElementById('page-container');
    if (!container) return;
    container.innerHTML = `<div class="page-body" style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;color:var(--clr-text-2)">
        <div class="skeleton skeleton-card" style="width:120px;height:120px;margin:0 auto 1rem"></div>
        <div class="skeleton skeleton-text" style="width:160px;margin:0 auto"></div>
      </div>
    </div>`;
    _activePage = page;

    if (!page || typeof page.init !== 'function') {
      container.innerHTML = `<div class="page-body" style="padding:2rem"><div class="card" style="padding:1.5rem">
        <h3 style="margin:0 0 0.5rem;color:#fff">Page failed to load</h3>
        <p class="text-muted text-sm">Module is missing. Hard-refresh (Ctrl+Shift+R) or clear site data.</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">Reload</button>
      </div></div>`;
      return;
    }

    try {
      await page.init(container, params);
      if (gen !== _pageLoadGen) return; // superseded by a newer navigation
      container.classList.add('page-enter');
    } catch (err) {
      if (gen !== _pageLoadGen) return;
      console.error('[page init]', err);
      container.innerHTML = `<div class="page-body" style="padding:2rem"><div class="card" style="padding:1.5rem;border:1px solid var(--clr-danger)">
        <h3 style="margin:0 0 0.5rem;color:#fff">Could not open this page</h3>
        <p class="text-muted text-sm" style="margin:0 0 1rem">${(err && err.message) ? String(err.message) : 'Unexpected error'}</p>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="location.reload()">Hard reload</button>
          <button class="btn btn-secondary btn-sm" onclick="WPRouter.navigate('/dashboard')">Dashboard</button>
        </div>
      </div></div>`;
    }
  }

  // ── DATA LOADING ──────────────────────────────────────────
  async function loadCurrentMonthData() {
    if (!state.user) return;
    const uid    = state.user.id;
    const period = WPUtils.currentPeriod();

    const [income, expenses, assets, liabilities, goals, ef, snapshots] = await Promise.all([
      WPDb.getIncomeByPeriod(uid, period),
      WPDb.getExpensesByDateRange(uid,
        period,
        new Date(new Date(period).getFullYear(), new Date(period).getMonth() + 1, 0).toISOString().slice(0,10)
      ),
      WPDb.getAssetsByPeriod(uid, period),
      WPDb.getLiabilitiesByPeriod(uid, period),
      WPDb.fetchAll('financial_goals', { user_id: uid }),
      WPDb.fetchAll('emergency_fund',  { user_id: uid }),
      WPDb.getMonthlySnapshots(uid, 12),
    ]);

    state.data.income      = income;
    state.data.expenses    = expenses;
    state.data.assets      = assets;
    state.data.liabilities = liabilities;
    state.data.goals       = goals;
    state.data.emergencyFund = ef[0] || null;
    state.data.snapshots   = snapshots;
  }

  // ── COMPUTED SUMMARY ──────────────────────────────────────
  function computeSummary() {
    const { income, expenses, assets, liabilities, emergencyFund } = state.data;
    const cf = WPUtils.calcCashFlow(income, expenses);

    const totalAssets      = assets.reduce((s, a) => s + (a.close_balance || a.open_balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.close_balance || l.open_balance || 0), 0);
    const netWorth         = WPUtils.calcNetWorth(totalAssets, totalLiabilities);
    const passiveKPIs      = WPUtils.passiveIncomeKPI(income, cf.totalExpenses);
    const debtToAsset      = WPUtils.debtToAssetRatio(totalLiabilities, totalAssets);

    const efTarget  = WPUtils.emergencyFundTarget(cf.nonDiscretionary);
    const efBalance = emergencyFund?.current_balance || 0;
    const efStatus  = WPUtils.emergencyFundStatus(efBalance, efTarget);

    return { cf, totalAssets, totalLiabilities, netWorth, passiveKPIs, debtToAsset, efTarget, efBalance, efStatus };
  }

  return { state, boot, loadCurrentMonthData, computeSummary, NAV_ITEMS, enterAuthShell };
})();

// ── TOAST SYSTEM ──────────────────────────────────────────
const WPToast = (() => {
  function show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '&#x2713;', error: '&#x2715;', warning: '&#x26A0;', info: '&#x2139;' };
    el.innerHTML = `<span style="font-size:1.1rem">${icons[type]||'&#x2139;'}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, duration);
  }
  return {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error', 5000),
    warning: (msg) => show(msg, 'warning'),
    info:    (msg) => show(msg, 'info'),
  };
})();

// ── MODAL HELPER ──────────────────────────────────────────
const WPModal = (() => {
  function open(title, bodyHTML, { onConfirm, confirmLabel = 'Confirm', confirmClass = 'btn-primary', showCancel = true } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="btn btn-icon modal-close" id="modal-close">&#x2715;</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-footer">
          ${showCancel ? '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>' : ''}
          ${onConfirm ? `<button class="btn ${confirmClass}" id="modal-confirm">${confirmLabel}</button>` : ''}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); };
    overlay.querySelector('#modal-close').addEventListener('click', close);
    overlay.querySelector('#modal-cancel')?.addEventListener('click', close);
    overlay.querySelector('#modal-confirm')?.addEventListener('click', async () => {
      if (onConfirm) {
        try {
          const result = await onConfirm(overlay);
          if (result === false) return; // Keep modal open if confirm handler explicitly signals false/error
        } catch (err) {
          return; // Keep modal open on exceptions
        }
      }
      close();
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return { close, overlay };
  }

  function confirm(title, message, onConfirm) {
    return open(title, `<p style="color:var(--clr-text-2)">${message}</p>`, { onConfirm, confirmLabel: 'Confirm', confirmClass: 'btn-danger' });
  }

  return { open, confirm };
})();
