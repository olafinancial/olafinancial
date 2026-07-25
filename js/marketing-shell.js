// ============================================================
// Pul Planning — shared header/footer for public marketing pages
// ============================================================
const MarketingShell = (() => {
  const PAGES = [
    { id: 'how', href: 'how-it-works.html', label: 'How it works' },
    { id: 'about', href: 'about.html', label: 'About' },
    { id: 'blog', href: 'blog.html', label: 'Blog' },
    { id: 'privacy', href: 'privacy.html', label: 'Privacy' },
    { id: 'terms', href: 'terms.html', label: 'Terms' },
  ];

  function mount(opts = {}) {
    const active = opts.active || '';
    const rootPrefix = opts.rootPrefix || ''; // e.g. '../' if ever nested

    const header = document.getElementById('mkt-header');
    if (header) {
      header.className = 'mkt-header';
      header.innerHTML = `
        <div class="mkt-header-inner">
          <a class="mkt-brand" href="${rootPrefix}index.html">
            <img src="${rootPrefix}pul_logo.jpeg" alt="Pul" width="36" height="32" />
            <span>Pul Planning</span>
          </a>
          <nav class="mkt-nav" aria-label="Marketing">
            ${PAGES.map(p => `
              <a href="${rootPrefix}${p.href}" class="${active === p.id ? 'is-active' : ''}">${p.label}</a>
            `).join('')}
            <a class="mkt-cta" href="${rootPrefix}index.html#/signup">Get started free</a>
            <a href="${rootPrefix}index.html#/login">Sign in</a>
          </nav>
        </div>`;
    }

    const footer = document.getElementById('mkt-footer');
    if (footer) {
      footer.className = 'mkt-footer';
      footer.innerHTML = `
        <div>© ${new Date().getFullYear()} Pul Planning · Educational tools, not personalised financial advice</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem 1rem">
          <a href="${rootPrefix}how-it-works.html">How it works</a>
          <a href="${rootPrefix}about.html">About</a>
          <a href="${rootPrefix}blog.html">Blog</a>
          <a href="${rootPrefix}privacy.html">Privacy</a>
          <a href="${rootPrefix}terms.html">Terms</a>
          <a href="mailto:hello@pul.llc">hello@pul.llc</a>
        </div>`;
    }
  }

  return { mount };
})();
