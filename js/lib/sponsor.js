// ============================================================
// OlaFinancial — WPSponsor: Sponsor Banner System
// Renders vetted sponsor offers when a user lacks a product.
// Only companies that sponsor the app are ever featured.
// ============================================================

const WPSponsor = (() => {

  // Sponsors config — update this when new sponsors are confirmed
  // Each key matches a product the user might be missing.
  const SPONSORS = {
    insurance: {
      name: 'Coming Soon',
      tagline: 'Protect what matters most — get a free insurance quote.',
      cta: 'Get a Free Quote',
      url: '#',
      logo: null,
      available: false,
    },
    investment: {
      name: 'Coming Soon',
      tagline: 'Start growing your wealth with trusted investment products.',
      cta: 'Start Investing',
      url: '#',
      logo: null,
      available: false,
    },
    emergency_fund: {
      name: 'Coming Soon',
      tagline: 'Open a high-yield savings account for your emergency fund.',
      cta: 'Open Savings Account',
      url: '#',
      logo: null,
      available: false,
    },
    debt_refinance: {
      name: 'Coming Soon',
      tagline: 'Refinance high-interest debts at better rates.',
      cta: 'Explore Refinancing',
      url: '#',
      logo: null,
      available: false,
    },
    pension: {
      name: 'Coming Soon',
      tagline: 'Maximise your pension contributions with expert guidance.',
      cta: 'Learn More',
      url: '#',
      logo: null,
      available: false,
    },
  };

  /**
   * Render a sponsor banner into a container if user lacks the product.
   * @param {string} productKey - key from SPONSORS map
   * @param {HTMLElement} container - element to render into
   * @param {boolean} userHasProduct - true = user already has this product, don't show sponsor
   */
  function render(productKey, container, userHasProduct = false) {
    if (!container) return;
    const sponsor = SPONSORS[productKey];
    if (!sponsor || userHasProduct) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    container.innerHTML = `
      <div class="sponsor-banner" data-product="${productKey}">
        <div class="sponsor-badge">Sponsored</div>
        <div class="sponsor-content">
          ${sponsor.logo
            ? `<img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-logo">`
            : `<div class="sponsor-logo-placeholder">🤝</div>`}
          <div class="sponsor-text">
            <div class="sponsor-name">${sponsor.name}</div>
            <div class="sponsor-tagline">${sponsor.tagline}</div>
          </div>
          <a
            href="${sponsor.url}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary btn-sm sponsor-cta"
            ${!sponsor.available ? 'style="opacity:0.5;pointer-events:none" title="Coming soon"' : ''}
          >${sponsor.cta}</a>
        </div>
        <button class="sponsor-dismiss" onclick="this.closest('.sponsor-banner').remove()" aria-label="Dismiss sponsor">✕</button>
      </div>`;
  }

  /**
   * Update sponsor data (call when confirmed sponsors provide their details).
   * @param {string} productKey
   * @param {object} sponsorData - { name, tagline, cta, url, logo, available }
   */
  function setSponsor(productKey, sponsorData) {
    SPONSORS[productKey] = { ...SPONSORS[productKey], ...sponsorData };
  }

  return { render, setSponsor, SPONSORS };

})();
