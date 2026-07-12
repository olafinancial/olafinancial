// ============================================================
// OlaFinancial — Charts Module (Chart.js wrappers)
// ============================================================

const WPCharts = (() => {

  const COLORS = {
    accent:  '#00C896',
    gold:    '#F59E0B',
    danger:  '#F43F5E',
    info:    '#38BDF8',
    purple:  '#A78BFA',
    orange:  '#FB923C',
    pink:    '#F472B6',
    teal:    '#2DD4BF',
  };

  const PALETTE = [COLORS.accent, COLORS.gold, COLORS.info, COLORS.purple, COLORS.orange, COLORS.pink, COLORS.teal, COLORS.danger];

  const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { family: "'Inter',sans-serif", size: 12 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#162240',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#E8EDF5',
        bodyColor:  '#94A3B8',
        padding: 12,
        callbacks: {},
      },
    },
    scales: {},
  };

  function _axisDefaults(label = '') {
    return {
      ticks:  { color: '#64748B', font: { family: "'Inter',sans-serif", size: 11 } },
      grid:   { color: 'rgba(255,255,255,0.05)' },
      border: { color: 'rgba(255,255,255,0.08)' },
      title:  label ? { display: true, text: label, color: '#64748B', font: { size: 11 } } : { display: false },
    };
  }

  // Destroy existing chart to avoid canvas reuse error
  function _destroy(canvasId) {
    const existing = Chart.getChart(canvasId);
    if (existing) existing.destroy();
  }

  // ── NET WORTH AREA CHART ────────────────────────────────
  function netWorthTrend(canvasId, snapshots) {
    _destroy(canvasId);
    const labels = snapshots.map(s => WPUtils.periodLabel(s.period_month));
    const netData = snapshots.map(s => WPUtils.koboToNaira(s.net_worth || 0));
    const assetData = snapshots.map(s => WPUtils.koboToNaira(s.total_assets || 0));
    const liabData  = snapshots.map(s => WPUtils.koboToNaira(s.total_liabilities || 0));

    return new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Worth',
            data: netData,
            borderColor: COLORS.accent,
            backgroundColor: 'rgba(0,200,150,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: COLORS.accent,
          },
          {
            label: 'Total Assets',
            data: assetData,
            borderColor: COLORS.info,
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 2,
            borderDash: [4, 4],
          },
          {
            label: 'Total Liabilities',
            data: liabData,
            borderColor: COLORS.danger,
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 2,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        ...BASE_OPTS,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: {
            ...BASE_OPTS.plugins.tooltip,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), { compact: true })}`,
            },
          },
        },
        scales: {
          x: _axisDefaults(),
          y: { ..._axisDefaults(), ticks: { ..._axisDefaults().ticks, callback: v => WPUtils.fmt(WPUtils.nairaToKobo(v), { compact: true }) } },
        },
      },
    });
  }

  // ── INCOME VS EXPENSES BAR CHART ────────────────────────
  function incomeVsExpenses(canvasId, snapshots) {
    _destroy(canvasId);
    const labels = snapshots.map(s => WPUtils.periodLabel(s.period_month));
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Net Income',    data: snapshots.map(s => WPUtils.koboToNaira(s.total_income    || 0)), backgroundColor: 'rgba(0,200,150,0.75)', borderRadius: 4 },
          { label: 'Total Expenses',data: snapshots.map(s => WPUtils.koboToNaira(s.total_expenses  || 0)), backgroundColor: 'rgba(244,63,94,0.75)',  borderRadius: 4 },
          { label: 'Net Cash Flow', data: snapshots.map(s => WPUtils.koboToNaira(s.net_cash_flow   || 0)), backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 4, type: 'line', tension: 0.4, fill: false, borderColor: COLORS.gold, pointRadius: 3 },
        ],
      },
      options: {
        ...BASE_OPTS,
        interaction: { mode: 'index', intersect: false },
        plugins: { ...BASE_OPTS.plugins, tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})}` } } },
        scales: { x: _axisDefaults(), y: { ..._axisDefaults(), ticks: { ..._axisDefaults().ticks, callback: v => WPUtils.fmt(WPUtils.nairaToKobo(v), {compact:true}) } } },
      },
    });
  }

  // ── EXPENSE CATEGORY DONUT ───────────────────────────────
  function expenseDonut(canvasId, expenses) {
    _destroy(canvasId);
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    });
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return new Chart(document.getElementById(canvasId), {
      type: 'doughnut',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{ data: sorted.map(([,v]) => WPUtils.koboToNaira(v)), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        ...BASE_OPTS,
        cutout: '68%',
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => `${ctx.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})} (${((ctx.raw / ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } },
        },
      },
    });
  }

  // ── INCOME BREAKDOWN HORIZONTAL BAR ─────────────────────
  function incomeBreakdown(canvasId, income) {
    _destroy(canvasId);
    const data = income.map(e => ({
      name: e.source_name,
      gross: WPUtils.koboToNaira(e.gross_amount || 0),
      net:   WPUtils.koboToNaira((e.gross_amount || 0) - (e.paye_tax||0) - (e.pension_contrib||0) - (e.nhf_contrib||0) - (e.other_deductions||0)),
    }));
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [
          { label: 'Gross', data: data.map(d => d.gross), backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 4 },
          { label: 'Net',   data: data.map(d => d.net),   backgroundColor: 'rgba(0,200,150,0.8)',  borderRadius: 4 },
        ],
      },
      options: {
        ...BASE_OPTS,
        indexAxis: 'y',
        plugins: { ...BASE_OPTS.plugins, tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})}` } } },
        scales: { x: { ..._axisDefaults(), ticks: { ..._axisDefaults().ticks, callback: v => WPUtils.fmt(WPUtils.nairaToKobo(v), {compact:true}) } }, y: _axisDefaults() },
      },
    });
  }

  // ── DEBT PAYOFF TIMELINE ─────────────────────────────────
  function debtTimeline(canvasId, debtResults) {
    _destroy(canvasId);
    const months = Array.from({ length: 60 }, (_, i) => `M${i+1}`);
    return new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels: months,
        datasets: debtResults.map((d, i) => ({
          label: d.name,
          data: (() => {
            const r = d.apr / 100 / 12;
            let bal = WPUtils.koboToNaira(d.balanceKobo || 0);
            return months.map(() => { const interest = bal * r; const pmt = Math.min(bal + interest, WPUtils.koboToNaira(d.monthlyPaymentKobo||0)); bal = Math.max(0, bal + interest - pmt); return +bal.toFixed(0); });
          })(),
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 0,
        })),
      },
      options: {
        ...BASE_OPTS,
        interaction: { mode: 'index', intersect: false },
        plugins: { ...BASE_OPTS.plugins, tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})}` } } },
        scales: { x: _axisDefaults('Month'), y: { ..._axisDefaults('Balance (₦)'), ticks: { ..._axisDefaults().ticks, callback: v => WPUtils.fmt(WPUtils.nairaToKobo(v), {compact:true}) } } },
      },
    });
  }

  // ── GOAL PROGRESS RADAR ──────────────────────────────────
  function goalRadar(canvasId, goals) {
    _destroy(canvasId);
    return new Chart(document.getElementById(canvasId), {
      type: 'radar',
      data: {
        labels: goals.map(g => g.goal_name),
        datasets: [{
          label: 'Progress %',
          data: goals.map(g => WPUtils.goalProgress(g).progressPct),
          backgroundColor: 'rgba(0,200,150,0.15)',
          borderColor: COLORS.accent,
          pointBackgroundColor: COLORS.accent,
          pointRadius: 4,
        }],
      },
      options: {
        ...BASE_OPTS,
        scales: {
          r: {
            min: 0, max: 100,
            ticks:       { color: '#64748B', stepSize: 25, backdropColor: 'transparent' },
            grid:        { color: 'rgba(255,255,255,0.07)' },
            angleLines:  { color: 'rgba(255,255,255,0.05)' },
            pointLabels: { color: '#94A3B8', font: { size: 11 } },
          },
        },
      },
    });
  }

  // ── RETIREMENT PROJECTION AREA ───────────────────────────
  function retirementProjection(canvasId, { currentAge, retirementAge, startBalance, monthlyContrib, rate }) {
    _destroy(canvasId);
    const years = retirementAge - currentAge;
    const labels = Array.from({ length: years + 1 }, (_, i) => `Age ${currentAge + i}`);
    const projectedData = labels.map((_, i) => WPUtils.koboToNaira(WPUtils.calcFV(rate, i, monthlyContrib, startBalance)));
    const noContribData = labels.map((_, i) => WPUtils.koboToNaira(WPUtils.calcFV(rate, i, 0, startBalance)));

    return new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'With Contributions', data: projectedData, borderColor: COLORS.accent, backgroundColor: 'rgba(0,200,150,0.1)', fill: true, tension: 0.4, pointRadius: 0 },
          { label: 'Growth Only',        data: noContribData, borderColor: COLORS.info,   backgroundColor: 'transparent',         tension: 0.4, pointRadius: 0, borderDash: [4,4] },
        ],
      },
      options: {
        ...BASE_OPTS,
        interaction: { mode: 'index', intersect: false },
        plugins: { ...BASE_OPTS.plugins, tooltip: { ...BASE_OPTS.plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})}` } } },
        scales: { x: _axisDefaults('Age'), y: { ..._axisDefaults('Portfolio Value'), ticks: { ..._axisDefaults().ticks, callback: v => WPUtils.fmt(WPUtils.nairaToKobo(v), {compact:true}) } } },
      },
    });
  }

  // ── HEALTH SCORE GAUGE ───────────────────────────────────
  function drawHealthGauge(canvasId, score) {
    _destroy(canvasId);
    const pct = score / 100;
    const color = score >= 70 ? COLORS.accent : score >= 40 ? COLORS.gold : COLORS.danger;
    return new Chart(document.getElementById(canvasId), {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: [color, 'rgba(255,255,255,0.05)'],
          borderWidth: 0,
          circumference: 270,
          rotation: 225,
        }],
      },
      options: {
        ...BASE_OPTS,
        cutout: '78%',
        plugins: { ...BASE_OPTS.plugins, legend: { display: false }, tooltip: { enabled: false } },
      },
    });
  }

  // ── GENERIC ALLOCATION DOUGHNUT ──────────────────────────
  function allocationDoughnut(canvasId, categories, dataKobo) {
    _destroy(canvasId);
    const dataNaira = dataKobo.map(v => WPUtils.koboToNaira(v));
    return new Chart(document.getElementById(canvasId), {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: dataNaira,
          backgroundColor: PALETTE,
          borderWidth: 1,
          borderColor: '#161B22',
        }],
      },
      options: {
        ...BASE_OPTS,
        cutout: '60%',
        plugins: {
          ...BASE_OPTS.plugins,
          legend: {
            display: true,
            position: 'right',
            labels: {
              ...BASE_OPTS.plugins.legend.labels,
              boxWidth: 12,
            }
          },
          tooltip: {
            ...BASE_OPTS.plugins.tooltip,
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const percent = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${percent}% (${WPUtils.fmt(WPUtils.nairaToKobo(ctx.raw), {compact:true})})`;
              }
            }
          }
        }
      }
    });
  }

  return { netWorthTrend, incomeVsExpenses, expenseDonut, incomeBreakdown, debtTimeline, goalRadar, retirementProjection, drawHealthGauge, allocationDoughnut, COLORS, PALETTE };
})();
