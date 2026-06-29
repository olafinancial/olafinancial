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

      // Route guard: onboarding incomplete
      if (!state.profile || !state.profile.onboarding_done) {
        WPRouter.navigate('/onboarding', true);
        return;
      }

      const currentPath = window.location.hash.replace('#', '') || '/dashboard';
      if (['/login', '/signup', '/onboarding'].includes(currentPath)) {
        WPRouter.navigate('/dashboard', true);
      } else {
        WPRouter.start();
      }
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
    document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
    _registerAuthRoutes();
    WPRouter.start();
  }

  function _registerAuthRoutes() {
    WPRouter.register('/login',  () => {
      if (state.user) {
        WPRouter.navigate('/dashboard', true);
        return;
      }
      let container = document.getElementById('auth-root');
      if (!container) {
        document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
        container = document.getElementById('auth-root');
      }
      if (container) WPAuth.renderLogin(container);
    });
    WPRouter.register('/signup', () => {
      if (state.user) {
        WPRouter.navigate('/dashboard', true);
        return;
      }
      let container = document.getElementById('auth-root');
      if (!container) {
        document.getElementById('root').innerHTML = '<div id="auth-root"></div>';
        container = document.getElementById('auth-root');
      }
      if (container) WPAuth.renderSignup(container);
    });
  }

  // ── APP SHELL (sidebar + content) ────────────────────────
  function _showApp() {
    document.getElementById('root').innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">&#x26A1;</div>
            <div>
              <div class="sidebar-logo-text">Ola Financial</div>
              <div class="sidebar-logo-sub">Financial Health</div>
            </div>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav"></nav>
          <div class="sidebar-footer">
            <div class="currency-selector-container" style="padding: 0 0 1rem 0; border-bottom: 1px solid var(--clr-border); margin-bottom: 1rem;">
              <label for="currency-switcher" style="font-size: 0.72rem; color: var(--clr-text-3); display: block; margin-bottom: 0.35rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Base Currency</label>
              <select id="currency-switcher" class="select select-sm" style="width: 100%; font-size: 0.8rem; height: 32px; padding: 4px 8px; background: var(--clr-bg); border-color: var(--clr-border); color: var(--clr-text-1);">
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
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
    WPRouter.start();

    // Mobile sidebar toggle
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── NAV ITEMS ─────────────────────────────────────────────
  const NAV_ITEMS = [
    { path: '/dashboard',      icon: '&#x2302;',  label: 'Dashboard',      section: 'Overview' },
    { path: '/income',         icon: '&#x2B06;',  label: 'Income',         section: 'Planning' },
    { path: '/expenses',       icon: '&#x2B07;',  label: 'Expenses',       section: 'Planning' },
    { path: '/balance-sheet',  icon: '&#x2696;',  label: 'Balance Sheet',  section: 'Planning' },
    { path: '/cashflow',       icon: '&#x21C4;',  label: 'Cash Flow',      section: 'Planning' },
    { path: '/debt',           icon: '&#x1F4B3;', label: 'Debt Planner',   section: 'Tools' },
    { path: '/emergency-fund', icon: '&#x1F6E1;', label: 'Emergency Fund', section: 'Tools' },
    { path: '/goals',          icon: '&#x1F3AF;', label: 'Goals',          section: 'Tools' },
    { path: '/retirement',     icon: '&#x1F334;', label: 'Retirement',     section: 'Tools' },
    { path: '/reports',        icon: '&#x1F4CA;', label: 'Reports',        section: 'Reports' },
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
    html += `<div class="nav-section-label">Account</div>
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
    document.getElementById('nav-logout')?.addEventListener('click', () => WPAuth.signOut());
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

    const switcher = document.getElementById('currency-switcher');
    if (switcher) {
      switcher.value = state.profile?.currency || 'NGN';
      switcher.addEventListener('change', async (e) => {
        const newCurrency = e.target.value;
        try {
          state.profile = await WPDb.upsert('user_profiles', {
            user_id: state.user.id,
            currency: newCurrency
          }, ['user_id']);
          WPToast.success(`Currency switched to ${newCurrency}`);
          WPRouter.navigate(WPRouter.current(), true);
        } catch (err) {
          WPToast.error('Could not save currency preference.');
        }
      });
    }
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
    const pages = {
      '/onboarding':    WPOnboarding,
      '/dashboard':     WPDashboard,
      '/income':        WPIncome,
      '/expenses':      WPExpenses,
      '/balance-sheet': WPBalanceSheet,
      '/cashflow':      WPCashflow,
      '/debt':          WPDebt,
      '/emergency-fund':WPEmergencyFund,
      '/goals':         WPGoals,
      '/retirement':    WPRetirement,
      '/reports':       WPReports,
    };

    for (const [path, page] of Object.entries(pages)) {
      WPRouter.register(path, async (params) => {
        _setActiveNav(path);
        await _loadPage(page, params);
      });
    }
  }

  async function _loadPage(page, params = {}) {
    if (_activePage && typeof _activePage.destroy === 'function') {
      _activePage.destroy();
    }

    // Route guard: if onboarding is not done, only allow onboarding page
    if (page !== WPOnboarding && (!state.profile || !state.profile.onboarding_done)) {
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
    await page.init(container, params);
    container.classList.add('page-enter');
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

  return { state, boot, loadCurrentMonthData, computeSummary, NAV_ITEMS };
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
    overlay.querySelector('#modal-confirm')?.addEventListener('click', () => { onConfirm && onConfirm(overlay); close(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return { close, overlay };
  }

  function confirm(title, message, onConfirm) {
    return open(title, `<p style="color:var(--clr-text-2)">${message}</p>`, { onConfirm, confirmLabel: 'Confirm', confirmClass: 'btn-danger' });
  }

  return { open, confirm };
})();
