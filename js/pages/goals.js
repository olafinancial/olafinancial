// ============================================================
// WealthPath — Goals Page
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

    const completed = _goals.filter(g => g.current_amount >= g.target_amount);
    const active    = _goals.filter(g => g.current_amount <  g.target_amount);

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
    const pct      = Math.min(100, ((g.current_amount||0) / Math.max(1, g.target_amount)) * 100);
    const gap      = Math.max(0, g.target_amount - (g.current_amount||0));
    const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - new Date()) / 86400000) : null;
    const color    = done ? 'accent' : pct > 75 ? 'accent' : pct > 40 ? 'gold' : 'danger';
    const icons    = { retire:'&#x1F334;',debt_free:'&#x2702;&#xFE0F;',home:'&#x1F3E0;',emergency:'&#x1F6E1;&#xFE0F;',invest:'&#x1F4C8;',education:'&#x1F393;',business:'&#x1F4BC;',other:'&#x1F3AF;' };

    return `<div class="card goal-card ${done?'goal-done':''}">
      <div class="goal-icon">${icons[g.goal_type]||'&#x1F3AF;'}</div>
      <div class="goal-name">${g.name}</div>
      ${g.notes?`<div class="goal-notes text-xs text-muted">${g.notes}</div>`:''}
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
        <div><div class="text-muted text-xs">Saved</div><div class="fw-700 text-accent">${WPUtils.fmt(g.current_amount||0, {compact:true})}</div></div>
        <div style="text-align:center"><div class="text-muted text-xs">Gap</div><div class="fw-600">${WPUtils.fmt(gap, {compact:true})}</div></div>
        <div style="text-align:right"><div class="text-muted text-xs">Target</div><div class="fw-700">${WPUtils.fmt(g.target_amount, {compact:true})}</div></div>
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
    const body = `
      <form id="goal-form">
        <div class="form-group">
          <label for="gf-name">Goal Name</label>
          <input class="input" id="gf-name" value="${e.name||''}" placeholder="e.g. Buy a house in Lekki" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="gf-type">Goal Type</label>
            <select class="select" id="gf-type">
              <option value="home"      ${e.goal_type==='home'     ?'selected':''}>&#x1F3E0; Buy a Home</option>
              <option value="emergency" ${e.goal_type==='emergency'?'selected':''}>&#x1F6E1; Emergency Fund</option>
              <option value="retire"    ${e.goal_type==='retire'   ?'selected':''}>&#x1F334; Retirement</option>
              <option value="debt_free" ${e.goal_type==='debt_free'?'selected':''}>&#x2702; Become Debt-Free</option>
              <option value="invest"    ${e.goal_type==='invest'   ?'selected':''}>&#x1F4C8; Start Investing</option>
              <option value="education" ${e.goal_type==='education'?'selected':''}>&#x1F393; Education</option>
              <option value="business"  ${e.goal_type==='business' ?'selected':''}>&#x1F4BC; Business</option>
              <option value="other"     ${e.goal_type==='other'    ?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="gf-date">Target Date</label>
            <input class="input" type="date" id="gf-date" value="${e.target_date||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="gf-target">Target Amount (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="number" id="gf-target" min="0" step="10000"
                value="${e.target_amount?WPUtils.koboToNaira(e.target_amount):''}" placeholder="0" required>
            </div>
          </div>
          <div class="form-group">
            <label for="gf-current">Amount Saved So Far (&#x20A6;)</label>
            <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
              <input class="input" type="number" id="gf-current" min="0" step="1000"
                value="${e.current_amount?WPUtils.koboToNaira(e.current_amount):''}" placeholder="0">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="gf-notes">Notes (optional)</label>
          <textarea class="textarea" id="gf-notes" placeholder="e.g. 3-bedroom apartment in Lekki Phase 1">${e.notes||''}</textarea>
        </div>
      </form>`;

    WPModal.open(existing ? 'Edit Goal' : 'Add Financial Goal', body, {
      confirmLabel: existing ? 'Update' : 'Add Goal',
      onConfirm: async () => { await _save(e.id); },
    });
  }

  async function _save(existingId) {
    const row = {
      user_id:        WPApp.state.user.id,
      name:           document.getElementById('gf-name').value.trim(),
      goal_type:      document.getElementById('gf-type').value,
      target_date:    document.getElementById('gf-date').value || null,
      target_amount:  WPUtils.nairaToKobo(parseFloat(document.getElementById('gf-target').value)||0),
      current_amount: WPUtils.nairaToKobo(parseFloat(document.getElementById('gf-current').value)||0),
      notes:          document.getElementById('gf-notes').value.trim(),
    };
    if (!row.name || !row.target_amount) { WPToast.warning('Name and target amount are required.'); return; }
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
    const body = `
      <form id="goal-update-form">
        <div class="form-group">
          <label>Goal: <strong>${g.name}</strong></label>
          <label for="gu-amount">New Saved Amount (&#x20A6;)</label>
          <div class="input-prefix-group"><span class="input-prefix">&#x20A6;</span>
            <input class="input" type="number" id="gu-amount" min="0" step="1000"
              value="${WPUtils.koboToNaira(g.current_amount||0)}" required>
          </div>
          <div class="input-hint">Current: ${WPUtils.fmt(g.current_amount||0)} / Target: ${WPUtils.fmt(g.target_amount)}</div>
        </div>
      </form>`;
    WPModal.open('Update Goal Progress', body, {
      confirmLabel: 'Update',
      onConfirm: async () => {
        const newAmt = WPUtils.nairaToKobo(parseFloat(document.getElementById('gu-amount').value)||0);
        try {
          await WPDb.update('goals', id, { current_amount: newAmt });
          if (newAmt >= g.target_amount) WPToast.success('&#x1F389; Goal completed! Congratulations!');
          else WPToast.success('Progress updated.');
          await _load();
        } catch (e) { WPToast.error('Could not update.'); }
      },
    });
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
