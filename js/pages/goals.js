// ============================================================
// OlaFinancial — Goals Page
// ============================================================

const WPGoals = (() => {

  let _goals = [];

  async function init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Goals</h1>
          <p class="page-subtitle">Track progress toward your most important financial milestones</p>
        </div>
        <button class="btn btn-primary" id="add-goal-btn">&#x2795; Add Goal</button>
      </div>
      <div class="page-body">
        <div id="goals-list"></div>
      </div>`;

    document.getElementById('add-goal-btn').addEventListener('click', () => _openForm());
    await _load();
  }

  async function _load() {
    try {
      _goals = await WPDb.fetchAll('goals', { user_id: WPApp.state.user.id });
      _goals.sort((a,b) => new Date(a.target_date||'9999') - new Date(b.target_date||'9999'));
      _render();
    } catch (err) { WPToast.error('Failed to load goals.'); }
  }

  function _render() {
    const el = document.getElementById('goals-list');
    if (!_goals.length) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:4rem;color:var(--clr-text-2)">
        <div style="font-size:3rem;margin-bottom:1rem">&#x1F3AF;</div>
        <div style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem">No goals yet</div>
        <p>Set your first financial goal to stay motivated and on track.</p>
        <button class="btn btn-primary" onclick="document.getElementById('add-goal-btn').click()" style="margin-top:1rem">Add Your First Goal</button>
      </div>`;
      return;
    }

    const completed = _goals.filter(g => g.current_savings >= g.target_amount);
    const active    = _goals.filter(g => g.current_savings <  g.target_amount);

    let html = '';
    if (active.length) {
      html += `<div class="goals-header">Active Goals (${active.length})</div>`;
      html += `<div class="goals-grid">${active.map(_goalCard).join('')}</div>`;
    }
    if (completed.length) {
      html += `<div class="goals-header" style="margin-top:2rem;color:var(--clr-accent)">&#x2714; Completed (${completed.length})</div>`;
      html += `<div class="goals-grid">${completed.map(g => _goalCard(g, true)).join('')}</div>`;
    }
    el.innerHTML = html;
  }

  function _goalCard(g, done = false) {
    const pct      = Math.min(100, ((g.current_savings||0) / Math.max(1, g.target_amount)) * 100);
    const gap      = Math.max(0, g.target_amount - (g.current_savings||0));
    const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - new Date()) / 86400000) : null;
    const color    = done ? 'accent' : pct > 75 ? 'accent' : pct > 40 ? 'gold' : 'danger';
    const icons = {
      emergency:   '🛡️',
      retirement:  '🌴',
      college:     '🎓',
      mortgage:    '🏠',
      debt:        '✂️',
      investment:  '📈',
      travel:      '✈️',
      business:    '💼',
      spend:       '🎉',
      custom:      '🎯',
    };
    const cur      = WPUtils.getEntryCurrency(g.notes);
    const cleanNotes = (g.notes || '').replace(/\[(USD|NGN|EUR|GBP)\]/g, '').trim();

    return `<div class="card goal-card ${done?'goal-done':''}">
      <div class="goal-icon">${icons[g.goal_type]||'&#x1F3AF;'}</div>
      <div class="goal-name">${g.goal_name}</div>
      ${cleanNotes?`<div class="goal-notes text-xs text-muted">${cleanNotes}</div>`:''}
      <div style="margin:1.25rem 0">
        <div class="progress-labels">
          <span class="text-muted text-sm">Progress</span>
          <span class="fw-700 text-${color}">${pct.toFixed(1)}%</span>
        </div>
        <div class="progress-bar" style="height:10px;border-radius:6px;margin-top:0.5rem">
          <div class="progress-fill ${color==='gold'?'gold':color==='danger'?'danger':''}" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="goal-amounts">
        <div><div class="text-muted text-xs">Saved</div><div class="fw-700 text-accent">${WPUtils.fmt(g.current_savings||0, {compact:true, currency: cur})}</div></div>
        <div style="text-align:center"><div class="text-muted text-xs">Gap</div><div class="fw-600">${WPUtils.fmt(gap, {compact:true, currency: cur})}</div></div>
        <div style="text-align:right"><div class="text-muted text-xs">Target</div><div class="fw-700">${WPUtils.fmt(g.target_amount, {compact:true, currency: cur})}</div></div>
      </div>
      ${daysLeft !== null ? `<div class="text-xs text-muted" style="margin-top:0.75rem">
        ${done ? '&#x1F389; Completed!' : daysLeft > 0 ? `${daysLeft} days remaining` : `<span class="text-danger">&#x26A0;&#xFE0F; ${Math.abs(daysLeft)} days overdue</span>`}
      </div>` : ''}
      <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="WPGoals._update('${g.id}')">&#x2B06; Update</button>
        <button class="btn btn-ghost btn-sm" onclick="WPGoals._edit('${g.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="WPGoals._delete('${g.id}')">Delete</button>
      </div>
    </div>`;
  }

  function _openForm(existing = null) {
    const e = existing || {};
    const currencyCode = WPUtils.getEntryCurrency(e.notes);
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="goal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="gf-currency">Currency</label>
            <select class="select" id="gf-currency">
              <option value="NGN" ${currencyCode==='NGN'?'selected':''}>NGN (₦)</option>
              <option value="USD" ${currencyCode==='USD'?'selected':''}>USD ($)</option>
              <option value="EUR" ${currencyCode==='EUR'?'selected':''}>EUR (€)</option>
              <option value="GBP" ${currencyCode==='GBP'?'selected':''}>GBP (£)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="gf-name">Goal Name</label>
            <input class="input" id="gf-name" value="${e.goal_name||''}" placeholder="e.g. Buy a house in Lekki" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="gf-type">Goal Type</label>
            <select class="select" id="gf-type">
              <option value="emergency"  ${e.goal_type==='emergency'  ?'selected':''}>🛡️ Emergency Fund</option>
              <option value="retirement" ${e.goal_type==='retirement' ?'selected':''}>🌴 Retirement Savings</option>
              <option value="college"    ${e.goal_type==='college'    ?'selected':''}>🎓 College / Education Fund</option>
              <option value="mortgage"   ${e.goal_type==='mortgage'   ?'selected':''}>🏠 Mortgage / Home Purchase</option>
              <option value="debt"       ${e.goal_type==='debt'       ?'selected':''}>✂️ Pay Down Debt</option>
              <option value="investment" ${e.goal_type==='investment' ?'selected':''}>📈 Investment</option>
              <option value="travel"     ${e.goal_type==='travel'     ?'selected':''}>✈️ Travel</option>
              <option value="business"   ${e.goal_type==='business'   ?'selected':''}>💼 Business / Side Hustle</option>
              <option value="spend"      ${e.goal_type==='spend'      ?'selected':''}>🎉 Spend at Will</option>
              <option value="custom"     ${e.goal_type==='custom'     ?'selected':''}>🎯 Custom / Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="gf-date">Target Date</label>
            <input class="input" type="date" id="gf-date" value="${e.target_date||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="gf-target">Target Amount (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="gf-target"
                value="${e.target_amount?WPUtils.koboToNaira(e.target_amount):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="gf-current">Amount Saved So Far (${symbol})</label>
            <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
              <input class="input" type="text" inputmode="decimal" id="gf-current"
                value="${e.current_savings?WPUtils.koboToNaira(e.current_savings):''}" placeholder="0">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="gf-notes">Notes (optional)</label>
          <textarea class="textarea" id="gf-notes" placeholder="e.g. 3-bedroom apartment in Lekki Phase 1">${e.notes?e.notes.replace(/\[(USD|NGN|EUR|GBP)\]/g, '').trim():''}</textarea>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Goal' : 'Add Financial Goal', body, {
      confirmLabel: existing ? 'Update' : 'Add Goal',
      onConfirm: async () => { await _save(e.id); },
    });
    const targetInput = document.getElementById('gf-target');
    const currentInput = document.getElementById('gf-current');
    const currencySelect = document.getElementById('gf-currency');

    WPUtils.maskNumberInput(targetInput);
    WPUtils.maskNumberInput(currentInput);

    currencySelect.addEventListener('change', (ev) => {
      const newCur = ev.target.value;
      const newSym = symbols[newCur] || '₦';
      document.querySelectorAll('#goal-form .input-prefix').forEach(span => span.textContent = newSym);
      document.querySelector('label[for="gf-target"]').textContent = `Target Amount (${newSym})`;
      document.querySelector('label[for="gf-current"]').textContent = `Amount Saved So Far (${newSym})`;
    });
  }

  async function _save(existingId) {
    const currency = document.getElementById('gf-currency').value;
    const notesVal = document.getElementById('gf-notes').value.trim();
    const finalNotes = WPUtils.setEntryCurrency(notesVal, currency);

    const row = {
      user_id:        WPApp.state.user.id,
      goal_name:      document.getElementById('gf-name').value.trim(),
      goal_type:      document.getElementById('gf-type').value,
      target_date:    document.getElementById('gf-date').value || null,
      target_amount:  WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('gf-target').value)),
      current_savings: WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('gf-current').value)),
      notes:          finalNotes,
    };
    if (!row.goal_name || !row.target_amount) { WPToast.warning('Name and target amount are required.'); return; }
    try {
      if (existingId) await WPDb.update('goals', existingId, row);
      else            await WPDb.insert('goals', row);
      WPToast.success(existingId ? 'Goal updated.' : 'Goal added.');
      await _load();
    } catch (err) { WPToast.error('Could not save: ' + err.message); }
  }

  function _update(id) {
    const g = _goals.find(x => x.id === id);
    if (!g) return;
    const currencyCode = WPApp.state.profile?.currency || APP_CONFIG.currency || 'NGN';
    const symbols = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$' };
    const symbol = symbols[currencyCode] || '₦';

    const body = `
      <form id="goal-update-form">
        <div class="form-group">
          <label>Goal: <strong>${g.goal_name}</strong></label>
          <label for="gu-amount">New Saved Amount (${symbol})</label>
          <div class="input-prefix-group"><span class="input-prefix">${symbol}</span>
            <input class="input" type="text" inputmode="decimal" id="gu-amount"
              value="${WPUtils.koboToNaira(g.current_savings||0)}" required>
          </div>
          <div class="input-hint">Current: ${WPUtils.fmt(g.current_savings||0)} / Target: ${WPUtils.fmt(g.target_amount)}</div>
        </div>
      </form>`;
    WPModal.open('Update Goal Progress', body, {
      confirmLabel: 'Update',
      onConfirm: async () => {
        const newAmt = WPUtils.nairaToKobo(WPUtils.cleanNum(document.getElementById('gu-amount').value));
        try {
          await WPDb.update('goals', id, { current_savings: newAmt });
          if (newAmt >= g.target_amount) WPToast.success('&#x1F389; Goal completed! Congratulations!');
          else WPToast.success('Progress updated.');
          await _load();
        } catch (e) { WPToast.error('Could not update.'); }
      },
    });
    WPUtils.maskNumberInput(document.getElementById('gu-amount'));
  }

  async function _edit(id) { const g = _goals.find(x => x.id===id); if (g) _openForm(g); }
  async function _delete(id) {
    WPModal.confirm('Delete Goal', 'Delete this goal? Cannot be undone.', async () => {
      try { await WPDb.remove('goals', id); WPToast.success('Goal deleted.'); await _load(); }
      catch (e) { WPToast.error('Could not delete.'); }
    });
  }

  function destroy() {}
  return { init, destroy, _edit, _delete, _update };
})();
