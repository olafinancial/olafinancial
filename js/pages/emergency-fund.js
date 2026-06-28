// ============================================================
// OlaFinancial — Emergency Fund Page
// ============================================================

const WPEmergencyFund = (() => {

  let _efAssets = [];
  let _currentBalance = 0;
  let _monthlyExpenses = 0;

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Emergency Fund</h1>
          <p class="page-subtitle">3 months of essential expenses — your financial safety net</p>
        </div>
      </div>
      <div class="page-body">
        <div id="ef-main"></div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    await _load();
  }

  async function _load() {
    try {
      const uid = WPApp.state.user.id;
      const PERIOD = WPUtils.currentPeriod();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      const end   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

      const [assets, expenses] = await Promise.all([
        WPDb.getAssetsByPeriod(uid, PERIOD),
        WPDb.getExpensesByDateRange(uid, start, end),
      ]);

      _efAssets = assets.filter(a => a.notes && a.notes.includes('[Emergency Fund]'));
      _currentBalance = _efAssets.reduce((s, a) => s + (a.close_balance || a.open_balance || 0), 0);

      const nonDisc = expenses.filter(e => !e.is_discretionary).reduce((s,e) => s+(e.amount||0), 0);
      _monthlyExpenses = nonDisc;
      _render();
    } catch (err) { WPToast.error('Failed to load emergency fund data.'); }
  }

  function _render() {
    const target  = WPUtils.emergencyFundTarget(_monthlyExpenses);
    const current = _currentBalance;
    const status  = WPUtils.emergencyFundStatus(current, target);
    const gap     = Math.max(0, target - current);
    const months  = _monthlyExpenses > 0 ? (current / _monthlyExpenses).toFixed(1) : '—';
    const pct     = Math.min(100, status.pct);

    const statusColors = { on_track:'accent', building:'gold', warning:'gold', critical:'danger', no_target:'text-muted' };
    const color = statusColors[status.status] || 'accent';

    let html = `
      <!-- Big status card -->
      <div class="card" style="text-align:center;padding:3rem;margin-bottom:1.5rem;background:linear-gradient(135deg,var(--clr-surface-3),var(--clr-surface-2))">
        <div class="card-title">Emergency Fund Balance</div>
        <div class="card-value ${color}" style="font-size:3.5rem;margin:0.5rem 0">${WPUtils.fmt(current)}</div>
        <div class="card-meta" style="font-size:1rem">
          ${status.label || 'Set up your emergency fund'} &bull; ${months} months of expenses covered
        </div>
        <div style="max-width:400px;margin:2rem auto 0">
          <div class="progress-labels">
            <span>Progress to 3-Month Target</span>
            <span class="text-${color} fw-700">${pct.toFixed(0)}%</span>
          </div>
          <div class="progress-bar" style="height:16px;border-radius:10px;margin-top:0.5rem">
            <div class="progress-fill ${color==='gold'?'gold':color==='danger'?'danger':''}"
              style="width:${pct}%;transition:width 1s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--clr-text-3);margin-top:0.5rem">
            <span>${WPUtils.fmt(current)}</span>
            <span>Target: ${WPUtils.fmt(target)}</span>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="margin-bottom:1.5rem">
        <div class="card">
          <div class="card-title">3-Month Target</div>
          <div class="card-value">${WPUtils.fmt(target)}</div>
          <div class="card-meta">3× monthly essential expenses</div>
        </div>
        <div class="card">
          <div class="card-title">Gap to Target</div>
          <div class="card-value ${gap>0?'danger':'accent'}">${gap > 0 ? WPUtils.fmt(gap) : 'Funded!'}</div>
          <div class="card-meta">${gap > 0 ? 'Still needed' : '&#x1F389; Target reached'}</div>
        </div>
        <div class="card">
          <div class="card-title">Monthly Essential Expenses</div>
          <div class="card-value">${WPUtils.fmt(_monthlyExpenses)}</div>
          <div class="card-meta">Non-discretionary spending this month</div>
        </div>
        <div class="card">
          <div class="card-title">Fund Sources</div>
          <div class="card-value">${_efAssets.length}</div>
          <div class="card-meta">Assets marked as safety net</div>
        </div>
      </div>

      <!-- Status guidance -->
      ${_renderGuidance(status, gap, current, target)}

      <!-- Sources Table -->
      <div class="card" style="margin-top:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4D6; Linked Emergency Fund Sources</div>
        ${_efAssets.length ? `
          <div class="table-wrap"><table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Institution</th>
                <th>Asset Type</th>
                <th style="text-align:right">Current Balance</th>
              </tr>
            </thead>
            <tbody>
              ${_efAssets.map(a => `
                <tr>
                  <td><strong>${a.asset_name}</strong></td>
                  <td>${a.institution_name || '—'}</td>
                  <td style="text-transform:capitalize">${a.asset_type.replace('_',' ')}</td>
                  <td class="td-mono fw-700" style="text-align:right">${WPUtils.fmt(a.close_balance || a.open_balance || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        ` : `
          <div style="text-align:center;padding:3rem 2rem;color:var(--clr-text-3)">
            <div style="font-size:3rem;margin-bottom:1rem">&#x1F6E1;&#xFE0F;</div>
            <div style="font-weight:600;font-size:1.1rem;margin-bottom:0.5rem">No Emergency Fund Sources Linked</div>
            <p style="margin-bottom:1rem">Link your existing savings or fixed deposits here by editing them on the balance sheet.</p>
            <a class="btn btn-primary" href="#/balance-sheet" style="display:inline-block">Go to Balance Sheet</a>
          </div>
        `}
      </div>

      <!-- How to build it -->
      <div class="card" style="margin-top:1.5rem">
        <div class="section-title" style="margin-bottom:1rem">&#x1F4A1; How to Build Your Emergency Fund</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.9rem">
          <div class="flex gap-4">
            <span style="width:24px;height:24px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
            <span>Open a <strong>high-yield savings account</strong> — look for accounts paying high interest in your base currency.</span>
          </div>
          <div class="flex gap-4">
            <span style="width:24px;height:24px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
            <span>Keep it <strong>separate</strong> from your daily spending account to avoid dipping into it.</span>
          </div>
          <div class="flex gap-4">
            <span style="width:24px;height:24px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
            <span>Check deposit insurance limits in your region (e.g. NDIC in Nigeria covers up to ₦5,000,000 for DMBs).</span>
          </div>
          <div class="flex gap-4">
            <span style="width:24px;height:24px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">4</span>
            <span>Automate monthly transfers to this account — treat it like a bill.</span>
          </div>
        </div>
      </div>`;

    document.getElementById('ef-main').innerHTML = html;
  }

  function _renderGuidance(status, gap, current, target) {
    const guides = {
      critical:   { type:'danger',  msg:`Your fund is critically low. Focus all available surplus on building this before other investments. Set up a standing order to save at least ${WPUtils.fmt(Math.round(gap/6))} per month.` },
      warning:    { type:'warning', msg:`You have 1–2 months covered. Keep going — aim to add ${WPUtils.fmt(Math.round(gap/3))} per month for the next 3 months to reach the 3-month target.` },
      building:   { type:'info',    msg:`Good progress! You have 2–3 months covered. A small monthly top-up of ${WPUtils.fmt(Math.round(gap/3))} will get you to full funding.` },
      on_track:   { type:'success', msg:`Excellent! Your emergency fund is fully funded. Consider topping up to 6 months if your employment is variable or if you have dependents.` },
      no_target:  { type:'info',    msg:'Log your monthly expenses in the Expenses tab to calculate your target automatically.' },
    };
    const g = guides[status.status];
    if (!g) return '';
    return `<div class="alert alert-${g.type}">
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <span>${g.msg}</span>
    </div>`;
  }

  function destroy() {}
  return { init, destroy };
})();
