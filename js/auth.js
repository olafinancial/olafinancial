// ============================================================
// OlaFinancial — Authentication Module
// ============================================================

const WPAuth = (() => {

  let _idleTimer = null;
  const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  let _countdownInterval = null;
  const COUNTDOWN_TIME = 30; // 30 seconds

  function showTimeoutWarning() {
    let modal = document.getElementById('session-timeout-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'session-timeout-modal';
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'display:flex;align-items:center;justify-content:center;z-index:9999;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6)';
    
    modal.innerHTML = `
      <div class="card card-modal animate-in" style="max-width:400px;text-align:center;padding:2rem;background:var(--clr-surface);border:1px solid var(--clr-border)">
        <div style="font-size:3rem;margin-bottom:1rem">⏳</div>
        <h3 style="margin-bottom:0.5rem;font-weight:700;color:var(--clr-text)">Are you still there?</h3>
        <p class="text-muted text-sm" style="margin-bottom:1.5rem">
          Your session is about to expire due to inactivity. You will be signed out in <strong id="session-countdown-num" style="color:var(--clr-danger);font-size:1.15rem">${COUNTDOWN_TIME}</strong> seconds.
        </p>
        <button class="btn btn-primary" style="width:100%" id="session-stay-btn">Stay Signed In</button>
      </div>
    `;

    document.body.appendChild(modal);

    let secsLeft = COUNTDOWN_TIME;
    
    // Temporarily pause resetting triggers
    ['click','keydown','mousemove','scroll','touchstart'].forEach(evt =>
      document.removeEventListener(evt, resetIdleTimer)
    );

    const countdownSpan = document.getElementById('session-countdown-num');
    
    clearInterval(_countdownInterval);
    _countdownInterval = setInterval(() => {
      secsLeft--;
      if (countdownSpan) {
        countdownSpan.textContent = secsLeft;
      }
      if (secsLeft <= 0) {
        clearInterval(_countdownInterval);
        modal.remove();
        WPToast.warning('Session expired. Please sign in again.');
        signOut();
      }
    }, 1000);

    document.getElementById('session-stay-btn')?.addEventListener('click', () => {
      clearInterval(_countdownInterval);
      modal.remove();
      startIdleWatcher();
      WPToast.success('Session extended.');
    });
  }

  function resetIdleTimer() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => {
      showTimeoutWarning();
    }, IDLE_TIMEOUT - (COUNTDOWN_TIME * 1000));
  }

  function startIdleWatcher() {
    ['click','keydown','mousemove','scroll','touchstart'].forEach(evt =>
      document.addEventListener(evt, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();
  }

  function stopIdleWatcher() {
    ['click','keydown','mousemove','scroll','touchstart'].forEach(evt =>
      document.removeEventListener(evt, resetIdleTimer)
    );
    clearTimeout(_idleTimer);
    clearInterval(_countdownInterval);
    document.getElementById('session-timeout-modal')?.remove();
  }

  // ── SIGN UP ───────────────────────────────────────────────
  async function signUp(email, password, name) {
    if (!validatePassword(password)) {
      return { error: { message: 'Password must be at least 12 characters with uppercase, number, and symbol.' } };
    }
    const result = await WPDb.signUp(email, password);
    if (!result.error && result.data.user) {
      // Create profile stub
      await WPDb.insert('user_profiles', {
        user_id: result.data.user.id,
        full_name: name,
        onboarding_done: false,
      }).catch(() => {});
    }
    return result;
  }

  // ── SIGN IN ───────────────────────────────────────────────
  async function signIn(email, password) {
    return WPDb.signIn(email, password);
  }

  // ── SIGN OUT ──────────────────────────────────────────────
  async function signOut() {
    stopIdleWatcher();
    // Clear local session first so UI never depends on a hanging network call
    WPApp.state.user    = null;
    WPApp.state.profile = null;
    try {
      if (WPApp.state.data) {
        WPApp.state.data = {
          income: [], expenses: [], assets: [], liabilities: [],
          goals: [], emergencyFund: null, snapshots: [],
        };
      }
    } catch (_) { /* ignore */ }

    try {
      await Promise.race([
        WPDb.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 4000)),
      ]);
    } catch (e) {
      console.warn('Supabase signOut error/timeout — continuing local logout:', e?.message || e);
    }

    // Drop asset caches + SW so the next visit loads the latest deploy
    // (no hard-refresh required). Keeps localStorage user prefs/stocks.
    try {
      if (typeof WPCacheControl !== 'undefined') {
        await WPCacheControl.purgeAppCaches({ unregisterSW: true });
      }
    } catch (e) {
      console.warn('Cache purge on sign-out failed', e);
    }

    // App shell only registers page routes; auth routes (incl. /logged-out) are
    // registered in _showAuth(). After a cold boot while logged-in, /logged-out
    // was never registered and the router fell back to /dashboard.
    if (typeof WPApp.enterAuthShell === 'function') {
      WPApp.enterAuthShell('/logged-out');
    } else {
      WPRouter.navigate('/logged-out', true);
    }
  }

  // ── PASSWORD VALIDATION ───────────────────────────────────
  function validatePassword(pw) {
    return pw.length >= 12 &&
           /[A-Z]/.test(pw) &&
           /[0-9]/.test(pw) &&
           /[^A-Za-z0-9]/.test(pw);
  }

  function passwordStrength(pw) {
    let score = 0;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', 'danger', 'gold', 'gold', 'accent', 'accent'];
    return { score, label: labels[score] || 'Weak', color: colors[score] || 'danger' };
  }

  // ── RENDER AUTH UI ────────────────────────────────────────
  function renderLogin(container) {
    container.innerHTML = `
    <div class="auth-shell">
      <div class="auth-brand">
        <div class="sidebar-logo">
          <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="64" height="56" />
          <div>
            <div class="sidebar-logo-text">Pul Planning</div>
          </div>
        </div>
        <div class="auth-brand-tagline">
          Your financial <span>freedom</span> journey starts here.
        </div>
        <p class="auth-brand-sub">Track your net worth, crush debt, plan for retirement — all built for Nigeria.</p>
        <div class="auth-features">
          <div class="auth-feature">
            <div class="auth-feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <span>Nigeria Tax Act 2025 compliant tax calculations</span>
          </div>
          <div class="auth-feature">
            <div class="auth-feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <span>PENCOM pension planning & RSA tracking</span>
          </div>
          <div class="auth-feature">
            <div class="auth-feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <span>Debt Avalanche strategy to eliminate debt fast</span>
          </div>
          <div class="auth-feature">
            <div class="auth-feature-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C896" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <span>100% private — your data stays yours</span>
          </div>
        </div>
        ${typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandSocialHTML ? APP_CONFIG.brandSocialHTML() : ''}
      </div>
      <div class="auth-form-pane">
        <div class="auth-form-inner">
          <h1 class="auth-form-title">Welcome back</h1>
          <p class="auth-form-sub">Sign in to your Pul Planning account</p>
          <div id="auth-error" class="alert alert-danger" style="display:none"></div>
          <form id="login-form">
            <div class="form-group">
              <label for="login-email">Email Address</label>
              <input class="input" type="email" id="login-email" placeholder="you@example.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <div class="input-suffix-group">
                <input class="input" type="password" id="login-password" placeholder="Your password" required autocomplete="current-password">
                <button type="button" class="input-suffix-btn" id="login-password-toggle" aria-label="Toggle Password Visibility">&#x1F441;</button>
              </div>
            </div>
            <div style="text-align:right;margin-bottom:1.5rem">
              <a id="forgot-link" style="font-size:0.82rem;color:var(--clr-accent);cursor:pointer">Forgot password?</a>
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit" id="login-btn">
              Sign In
            </button>
          </form>
          <div class="auth-switch">Don't have an account? <a id="goto-signup">Create one free</a></div>
        </div>
      </div>
    </div>`;

    const loginPwInput = document.getElementById('login-password');
    const loginPwToggle = document.getElementById('login-password-toggle');
    if (loginPwInput && loginPwToggle) {
      loginPwToggle.addEventListener('click', () => {
        const isPw = loginPwInput.type === 'password';
        loginPwInput.type = isPw ? 'text' : 'password';
        loginPwToggle.innerHTML = isPw ? '&#x1F443;' : '&#x1F441;'; // closed eye vs open eye
      });
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn   = document.getElementById('login-btn');
      const errEl = document.getElementById('auth-error');
      btn.textContent = 'Signing in…';
      btn.disabled = true;
      errEl.style.display = 'none';

      try {
        const { error } = await WPDb.signIn(
          document.getElementById('login-email').value.trim(),
          document.getElementById('login-password').value
        );

        if (error) {
          errEl.textContent = error.message || 'Invalid credentials';
          errEl.style.display = 'flex';
          btn.textContent = 'Sign In';
          btn.disabled = false;
        } else {
          await WPApp.boot();
        }
      } catch (err) {
        console.error(err);
        errEl.textContent = 'Connection or setup error: ' + (err.message || err);
        errEl.style.display = 'flex';
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    });

    document.getElementById('goto-signup').addEventListener('click', () => WPRouter.navigate('/signup'));
    document.getElementById('forgot-link').addEventListener('click', () => renderForgot(container));
  }

  function renderSignup(container) {
    container.innerHTML = `
    <div class="auth-shell">
      <div class="auth-brand">
        <div class="sidebar-logo">
          <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="64" height="56" />
          <div><div class="sidebar-logo-text">Pul Planning</div></div>
        </div>
        <div class="auth-brand-tagline">Build <span>wealth</span>. Plan your <span>future</span>.</div>
        <p class="auth-brand-sub">Nigeria's most comprehensive personal finance platform. Free forever.</p>
        ${typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandSocialHTML ? APP_CONFIG.brandSocialHTML() : ''}
      </div>
      <div class="auth-form-pane">
        <div class="auth-form-inner">
          <h1 class="auth-form-title">Create your account</h1>
          <p class="auth-form-sub">Free forever. No credit card needed.</p>
          <div id="auth-error" class="alert alert-danger" style="display:none"></div>
          <form id="signup-form">
            <div class="form-group">
              <label for="signup-name">Full Name</label>
              <input class="input" type="text" id="signup-name" placeholder="Your full name" required autocomplete="name">
            </div>
            <div class="form-group">
              <label for="signup-email">Email Address</label>
              <input class="input" type="email" id="signup-email" placeholder="you@example.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="signup-password">Password</label>
              <div class="input-suffix-group">
                <input class="input" type="password" id="signup-password" placeholder="Min 12 chars, uppercase, number, symbol" required autocomplete="new-password">
                <button type="button" class="input-suffix-btn" id="signup-password-toggle" aria-label="Toggle Password Visibility">&#x1F441;</button>
              </div>
              <div id="pw-strength" class="input-hint"></div>
            </div>
            <p style="font-size:0.72rem;color:var(--clr-text-3);margin-bottom:1.25rem">By signing up you agree to our Terms of Service and Privacy Policy. Your data is encrypted and never shared.</p>
            <button class="btn btn-primary" style="width:100%" type="submit" id="signup-btn">Create Account</button>
          </form>
          <div class="auth-switch">Already have an account? <a id="goto-login">Sign in</a></div>
        </div>
      </div>
    </div>`;

    const signupPwInput = document.getElementById('signup-password');
    const signupPwToggle = document.getElementById('signup-password-toggle');
    if (signupPwInput && signupPwToggle) {
      signupPwToggle.addEventListener('click', () => {
        const isPw = signupPwInput.type === 'password';
        signupPwInput.type = isPw ? 'text' : 'password';
        signupPwToggle.innerHTML = isPw ? '&#x1F443;' : '&#x1F441;';
      });
    }

    document.getElementById('signup-password').addEventListener('input', (e) => {
      const s = WPAuth.passwordStrength(e.target.value);
      document.getElementById('pw-strength').innerHTML = s.score > 0
        ? `<span class="text-${s.color}">${s.label}</span>` : '';
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('signup-btn');
      const errEl = document.getElementById('auth-error');
      btn.textContent = 'Creating account…'; btn.disabled = true;
      errEl.style.display = 'none';

      try {
        const { error } = await WPAuth.signUp(
          document.getElementById('signup-email').value.trim(),
          document.getElementById('signup-password').value,
          document.getElementById('signup-name').value.trim()
        );

        if (error) {
          errEl.textContent = error.message || 'Sign-up failed';
          errEl.style.display = 'flex';
          btn.textContent = 'Create Account'; btn.disabled = false;
        } else {
          WPToast.success('Account created! Redirecting to setup…');
          await WPApp.boot();
        }
      } catch (err) {
        console.error(err);
        errEl.textContent = 'Connection or setup error: ' + (err.message || err);
        errEl.style.display = 'flex';
        btn.textContent = 'Create Account'; btn.disabled = false;
      }
    });

    document.getElementById('goto-login').addEventListener('click', () => WPRouter.navigate('/login'));
  }

  function renderForgot(container) {
    container.innerHTML = `
    <div class="onboarding-shell">
      <div class="onboarding-card">
        <div class="onboarding-logo sidebar-logo" style="border:none;padding:0;margin-bottom:1rem">
          <img class="brand-logo" src="pul_logo.jpeg" alt="Pul" width="52" height="44" />
          <span class="sidebar-logo-text">Pul Planning</span>
        </div>
        <h2 class="onboarding-step-title">Reset Password</h2>
        <p class="onboarding-step-desc">Enter your email and we'll send a reset link.</p>
        <div id="auth-error" class="alert alert-danger" style="display:none"></div>
        <div id="auth-success" class="alert alert-success" style="display:none"></div>
        <form id="forgot-form">
          <div class="form-group">
            <label for="forgot-email">Email Address</label>
            <input class="input" type="email" id="forgot-email" placeholder="you@example.com" required>
          </div>
          <button class="btn btn-primary" style="width:100%" type="submit">Send Reset Link</button>
        </form>
        <div class="auth-switch" style="margin-top:1.5rem">
          <a id="back-login" style="color:var(--clr-accent);cursor:pointer">&larr; Back to Sign In</a>
        </div>
      </div>
    </div>`;

    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await WPDb.resetPassword(document.getElementById('forgot-email').value.trim());
      if (error) {
        document.getElementById('auth-error').textContent = error.message;
        document.getElementById('auth-error').style.display = 'flex';
      } else {
        document.getElementById('auth-success').textContent = 'Reset link sent! Check your inbox.';
        document.getElementById('auth-success').style.display = 'flex';
      }
    });
    document.getElementById('back-login').addEventListener('click', () => WPRouter.navigate('/login'));
  }

  return { signUp, signIn, signOut, validatePassword, passwordStrength, startIdleWatcher, stopIdleWatcher, renderLogin, renderSignup };
})();
