// ============================================================
// OlaFinancial — Emergency Fund Page
// ============================================================

const WPEmergencyFund = (() => {

  let _efAssets = [];
  let _currentBalance = 0;
  let _monthlyExpenses = 0;

  async function init(container) {
    const baseCur = WPApp.state.profile?.currency || 'NGN';
    const pageCurrency = localStorage.getItem('wp_page_currency_emergency') || baseCur;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Emergency Fund</h1>
          <p class="page-subtitle">3 months of essential expenses — your financial safety net</p>
        </div>
        <select id="ef-page-currency" class="select select-sm" style="width:110px;background:var(--clr-bg);border-color:var(--clr-border);color:var(--clr-text-1)">
          <option value="NGN">NGN (₦)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="AED">AED (د.إ)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="XOF">XOF (CFA)</option>
          <option value="XAF">XAF (FCFA)</option>
          <option value="KES">KES (KSh)</option>
          <option value="GHS">GHS (GH₵)</option>
          <option value="CAD">CAD (CA$)</option>
          <option value="ZAR">ZAR (R)</option>
          <option value="SAR">SAR (ر.س)</option>
          <option value="AUD">AUD (A$)</option>
        </select>
      </div>
      <div class="page-body">
        <div id="ef-main"></div>
        <div class="disclaimer" style="margin-top:1.5rem">${APP_CONFIG.disclaimer}</div>
      </div>`;

    const curSelect = document.getElementById('ef-page-currency');
    if (curSelect) {
      curSelect.value = pageCurrency;
      curSelect.addEventListener('change', (e) => {
        localStorage.setItem('wp_page_currency_emergency', e.target.value);
        _load();
      });
    }

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

      const baseCur = WPApp.state.profile?.currency || 'NGN';
      const pageCurrency = localStorage.getItem('wp_page_currency_emergency') || baseCur;

      _efAssets = assets.filter(a => a.notes && a.notes.includes('[Emergency Fund]'));
      
      // Calculate current balance in baseCur
      _currentBalance = _efAssets.reduce((s, a) => {
        const cur = WPUtils.getEntryCurrency(a.notes);
        return s + WPUtils.convert(a.close_balance || a.open_balance || 0, cur, baseCur);
      }, 0);

      // Calculate monthly essential expenses in baseCur
      _monthlyExpenses = expenses.filter(e => !e.is_discretionary).reduce((s,e) => {
        const cur = WPUtils.getEntryCurrency(e.description);
        return s + WPUtils.convert(e.amount||0, cur, baseCur);
      }, 0);

      _render(baseCur, pageCurrency);
    } catch (err) { WPToast.error('Failed to load emergency fund data.'); }
  }

  function _render(baseCur, pageCurrency) {
    const target  = WPUtils.emergencyFundTarget(_monthlyExpenses);
    const current = _currentBalance;
    const status  = WPUtils.emergencyFundStatus(current, target);
    const gap     = Math.max(0, target - current);
    const months  = _monthlyExpenses > 0 ? (current / _monthlyExpenses).toFixed(1) : '—';
    const pct     = Math.min(100, status.pct);

    const targetPage = WPUtils.convert(target, baseCur, pageCurrency);
    const currentPage = WPUtils.convert(current, baseCur, pageCurrency);
    const gapPage = WPUtils.convert(gap, baseCur, pageCurrency);
    const expensesPage = WPUtils.convert(_monthlyExpenses, baseCur, pageCurrency);

    const statusColors = { on_track:'accent', building:'gold', warning:'gold', critical:'danger', no_target:'text-muted' };
    const color = statusColors[status.status] || 'accent';

    let html = `
      <!-- Big status card -->
      <div class="card" style="text-align:center;padding:3rem;margin-bottom:1.5rem;background:linear-gradient(135deg,var(--clr-surface-3),var(--clr-surface-2))">
        <div class="card-title">Emergency Fund Balance</div>
        <div class="card-value ${color}" style="font-size:3.5rem;margin:0.5rem 0">${WPUtils.fmt(currentPage, {currency: pageCurrency})}</div>
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
            <span>${WPUtils.fmt(currentPage, {currency: pageCurrency})}</span>
            <span>Target: ${WPUtils.fmt(targetPage, {currency: pageCurrency})}</span>
          </div>
        </div>
        <div style="margin-top:1.5rem">
          <button class="btn btn-ghost btn-sm" onclick="WPGoals._share('Emergency Fund Milestone', ${pct}, '${pageCurrency}', ${currentPage})">📢 Share Progress</button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid" style="margin-bottom:1.5rem">
        <div class="card">
          <div class="card-title">3-Month Target</div>
          <div class="card-value">${WPUtils.fmt(targetPage, {currency: pageCurrency})}</div>
          <div class="card-meta">3× monthly essential expenses</div>
        </div>
        <div class="card">
          <div class="card-title">Gap to Target</div>
          <div class="card-value ${gap>0?'danger':'accent'}">${gap > 0 ? WPUtils.fmt(gapPage, {currency: pageCurrency}) : 'Funded!'}</div>
          <div class="card-meta">${gap > 0 ? 'Still needed' : '&#x1F389; Target reached'}</div>
        </div>
        <div class="card">
          <div class="card-title">Monthly Essential Expenses</div>
          <div class="card-value">${WPUtils.fmt(expensesPage, {currency: pageCurrency})}</div>
          <div class="card-meta">Non-discretionary spending this month</div>
        </div>
        <div class="card">
          <div class="card-title">Fund Sources</div>
          <div class="card-value">${_efAssets.length}</div>
          <div class="card-meta">Assets marked as safety net</div>
        </div>
      </div>

      <!-- Status guidance -->
      ${_renderGuidance(status, gapPage, currentPage, targetPage, pageCurrency)}

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
              ${_efAssets.map(a => {
                const aCur = WPUtils.getEntryCurrency(a.notes);
                const aBalPage = WPUtils.convert(a.close_balance || a.open_balance || 0, aCur, pageCurrency);
                return `
                  <tr>
                    <td><strong>${a.asset_name}</strong></td>
                    <td>${a.institution_name || '—'}</td>
                    <td style="text-transform:capitalize">${a.asset_type.replace('_',' ')}</td>
                    <td class="td-mono fw-700" style="text-align:right">${WPUtils.fmt(aBalPage, {currency: pageCurrency})}</td>
                  </tr>
                `;
              }).join('')}
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
        <div class="section-title" style="margin-bottom:0.75rem">&#x1F4A1; How to Create an Emergency Fund</div>
        <p style="font-size:0.85rem;color:var(--clr-text-2);margin-bottom:1.25rem;line-height:1.6">
          Building an emergency fund isn't optional — it's your financial shield against life's unexpected punches
          (job loss, medical bills, car repairs). Here's the no-nonsense way to do it right:
        </p>
        <div style="display:flex;flex-direction:column;gap:1rem;font-size:0.9rem">
          <div class="flex gap-4">
            <span style="min-width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
            <div>
              <strong>List out ALL your expenses</strong><br>
              <span style="color:var(--clr-text-2)">Track every naira/dollar you spend for 1–2 months. Be brutally honest — rent, food, transport, subscriptions, everything.</span>
            </div>
          </div>
          <div class="flex gap-4">
            <span style="min-width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
            <div>
              <strong>Separate discretionary from essential expenses</strong><br>
              <span style="color:var(--clr-text-2)">
                <strong>Essentials:</strong> Rent, groceries, utilities, minimum debt payments, transportation.<br>
                <strong>Discretionary:</strong> Eating out, entertainment, shopping, luxuries. <em>Cut the fat here first.</em>
              </span>
            </div>
          </div>
          <div class="flex gap-4">
            <span style="min-width:28px;height:28px;background:var(--clr-accent-dim);color:var(--clr-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
            <div>
              <strong>Open a dedicated Savings or Money Market Fund</strong><br>
              <span style="color:var(--clr-text-2)">
                Park it somewhere liquid, safe, and separate from your daily spending account.<br>
                <strong>Target:</strong> Save <em>3–6 months</em> of your essential expenses as the minimum.<br>
                Aim higher (6–12 months) if you're self-employed or in a volatile industry.
              </span>
            </div>
          </div>
        </div>
        <div style="margin-top:1.25rem;padding:1rem;background:var(--clr-accent-dim);border-radius:8px;font-size:0.87rem;color:var(--clr-accent);line-height:1.6">
          💡 Start small if you must — even ₦10k/$50 weekly adds up. Automate the transfers so you don't "forget."<br>
          <strong>Your emergency fund = sleeping better at night.</strong> No more panic borrowing or selling assets at a loss.
        </div>
      </div>`;

    document.getElementById('ef-main').innerHTML = html;
  }

  function _renderGuidance(status, gapPage, currentPage, targetPage, pageCurrency) {
    const guides = {
      critical:   { type:'danger',  msg:`Your fund is critically low. Focus all available surplus on building this before other investments. Set up a standing order to save at least ${WPUtils.fmt(Math.round(gapPage/6), {currency: pageCurrency})} per month.` },
      warning:    { type:'warning', msg:`You have 1–2 months covered. Keep going — aim to add ${WPUtils.fmt(Math.round(gapPage/3), {currency: pageCurrency})} per month for the next 3 months to reach the 3-month target.` },
      building:   { type:'info',    msg:`Good progress! You have 2–3 months covered. A small monthly top-up of ${WPUtils.fmt(Math.round(gapPage/3), {currency: pageCurrency})} will get you to full funding.` },
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
