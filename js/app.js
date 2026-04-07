// 人生重启系统 - App v2.0 Phase 3+4
const DIMS = [
  { key: 'health',  name: '身体健康', emoji: '🧬' },
  { key: 'learn',   name: '认知学习', emoji: '🧠' },
  { key: 'finance', name: '财务管理', emoji: '💰' },
  { key: 'social',  name: '人际关系', emoji: '❤️' },
  { key: 'mind',    name: '情绪心灵', emoji: '🧘' },
  { key: 'career',  name: '事业工作', emoji: '💼' },
  { key: 'living',  name: '生活环境', emoji: '🏠' },
  { key: 'hobby',   name: '兴趣体验', emoji: '🎨' },
];
const STATUS = [
  { key: 'good',    label: '😄 超棒', cls: 'sel-good' },
  { key: 'done',    label: '完成 ✅',   cls: 'sel-done' },
  { key: 'partial', label: '部分 ⚠️',  cls: 'sel-partial' },
  { key: 'none',    label: '未开始 ❌', cls: 'sel-none' },
];
const STATUS_SCORE = { good: 1, done: 0.75, partial: 0.3, none: 0 };

let currentPage = 'checkin';
let checkinDate = null; // null = today

function today() { return new Date().toISOString().slice(0, 10); }

function getCycleInfo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+08:00');
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - yearStart) / 86400000) + 1;
  const cycleNum = Math.min(36, Math.ceil(dayOfYear / 10));
  const cycleDay = ((dayOfYear - 1) % 10) + 1;
  return { cycle: 'P' + String(cycleNum).padStart(2, '0'), cycleDay };
}

function getStorageKey(d) { return 'lr_' + d; }

function loadDay(d) {
  try { return JSON.parse(localStorage.getItem(getStorageKey(d))); } catch { return null; }
}
function saveDay(d, data) { localStorage.setItem(getStorageKey(d), JSON.stringify(data)); }

function getAllDays() {
  const days = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('lr_20')) {
      try { days.push(JSON.parse(localStorage.getItem(k))); } catch {}
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function getISOWeek(d) {
  const date = new Date(d + 'T00:00:00+08:00');
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return date.getFullYear() + '-W' + String(Math.ceil(((date - week1) / 86400000 + week1.getDay() + 1) / 7)).padStart(2, '0');
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function dateDiff(a, b) { return Math.abs(new Date(a) - new Date(b)) / 86400000; }

// --- Insight Card (Phase 4.1) ---
function renderInsight() {
  const el = document.getElementById('insight-card');
  const t = today();
  const yesterday = daysAgo(1);
  const yd = loadDay(yesterday);
  if (!yd) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const msgs = [];
  const fails = DIMS.filter(d => (yd.dimensions?.[d.key]?.status || 'none') === 'none');
  const allGood = DIMS.every(d => (yd.dimensions?.[d.key]?.status || 'none') !== 'none');

  if (allGood) {
    msgs.push('🔥 昨日满分，继续保持！');
  }
  if (fails.length > 0) {
    msgs.push('⚠️ 昨日 ' + fails.map(d => d.emoji + d.name).join('、') + ' 未完成，今天记得补上！');
  }
  // Check 3-day streak
  DIMS.forEach(dim => {
    let streak = 0;
    for (let i = 1; i <= 3; i++) {
      const dd = loadDay(daysAgo(i));
      if (dd && (dd.dimensions?.[dim.key]?.status || 'none') === 'none') streak++;
      else break;
    }
    if (streak >= 3) msgs.push('📉 ' + dim.emoji + dim.name + ' 已连续' + streak + '天未完成，是否需要调整目标？');
  });

  // Today's energy suggestion
  const td = loadDay(t);
  if (td) {
    const done = DIMS.filter(d => (td.dimensions?.[d.key]?.status || 'none') !== 'none').length;
    if (done === 0) msgs.push('💡 新的一天，从最简单的维度开始！');
    else if (done < 4) msgs.push('💪 已完成' + done + '个维度，加油！');
    else if (done < 8) msgs.push('🚀 冲刺中！还剩' + (8 - done) + '个维度！');
  }

  el.innerHTML = msgs.length ? msgs.join('<br>') : '';
}

// --- Checkin Page (Phase 4.3: date picker) ---
function renderCheckin() {
  const t = checkinDate || today();
  const info = getCycleInfo(t);
  document.getElementById('cycle-info').textContent = `${today()} · ${info.cycle} · 第${info.cycleDay}天`;

  const dateInput = document.getElementById('checkin-date');
  dateInput.value = t;
  const hint = document.getElementById('date-hint');
  if (t === today()) {
    hint.textContent = '';
    document.getElementById('submit-btn').textContent = '提交今日打卡';
  } else {
    hint.textContent = t < today() ? '补卡模式' : '未来日期';
    document.getElementById('submit-btn').textContent = '保存打卡';
  }

  const container = document.getElementById('dim-cards');
  container.innerHTML = '';
  const existing = loadDay(t) || {};

  const planData = JSON.parse(localStorage.getItem('lr_plan_' + info.cycle) || '{}');
  DIMS.forEach(dim => {
    const card = document.createElement('div');
    card.className = 'dim-card';
    const dimData = existing.dimensions?.[dim.key] || {};
    const curStatus = dimData.status || '';
    const planText = planData[dim.key] || '';

    card.innerHTML = `
      <div class="dim-header"><span class="dim-emoji">${dim.emoji}</span>${dim.name}</div>
      ${planText ? `<div class="dim-plan">🎯 ${planText}</div>` : ''}
      <div class="status-row">
        ${STATUS.map(s => `<button class="status-btn ${curStatus === s.key ? s.cls : ''}" data-dim="${dim.key}" data-status="${s.key}">${s.label}</button>`).join('')}
      </div>
      <textarea class="note-input" data-dim="${dim.key}" placeholder="备注（可选）" rows="1">${dimData.note || ''}</textarea>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.parentElement;
      row.querySelectorAll('.status-btn').forEach(b => b.className = 'status-btn');
      btn.classList.add(STATUS.find(s => s.key === btn.dataset.status).cls);
      updateCompletionBar();
    });
  });

  updateCompletionBar();
  renderInsight();

  document.getElementById('submit-btn').onclick = () => {
    const dims = {};
    DIMS.forEach(dim => {
      const noteEl = container.querySelector(`.note-input[data-dim="${dim.key}"]`);
      const selBtn = container.querySelector(`.status-btn.sel-good[data-dim="${dim.key}"], .status-btn.sel-done[data-dim="${dim.key}"], .status-btn.sel-partial[data-dim="${dim.key}"], .status-btn.sel-none[data-dim="${dim.key}"]`);
      dims[dim.key] = { status: selBtn?.dataset.status || 'none', note: noteEl?.value || '' };
    });
    const rate = DIMS.reduce((s, d) => s + STATUS_SCORE[dims[d.key].status], 0) / DIMS.length;
    const dayData = { date: t, cycle: info.cycle, cycle_day: info.cycleDay, dimensions: dims, completion_rate: Math.round(rate * 100) / 100 };
    saveDay(t, dayData);
    LCSync.uploadSingle(dayData);
    showToast(t === today() ? '打卡成功 ✅' : '补卡成功 ✅');
  };
}

function updateCompletionBar() {
  const container = document.getElementById('dim-cards');
  if (!container.children.length) return;
  let total = 0;
  DIMS.forEach(dim => {
    const sel = container.querySelector(`.status-btn.sel-good[data-dim="${dim.key}"], .status-btn.sel-done[data-dim="${dim.key}"], .status-btn.sel-partial[data-dim="${dim.key}"], .status-btn.sel-none[data-dim="${dim.key}"]`);
    total += STATUS_SCORE[sel?.dataset.status || 'none'];
  });
  const pct = Math.round((total / DIMS.length) * 100);
  document.getElementById('completion-fill').style.width = pct + '%';
  document.getElementById('completion-text').textContent = `完成率 ${pct}%`;
}

// --- Board ---
function renderBoard() {
  const days = getAllDays();
  const container = document.getElementById('board-content');
  if (!days.length) { container.innerHTML = '<div class="skeleton-card">暂无打卡数据</div>'; return; }

  container.innerHTML = '';
  const cycles = {};
  days.forEach(d => { (cycles[d.cycle] = cycles[d.cycle] || []).push(d); });
  Object.keys(cycles).sort().forEach(c => {
    const cd = cycles[c];
    const avg = Math.round(cd.reduce((s, d) => s + d.completion_rate, 0) / cd.length * 100);
    const div = document.createElement('div');
    div.className = 'skeleton-card';
    div.innerHTML = `<div style="font-weight:700;font-size:16px;margin-bottom:4px">${c}</div><div class="stat-num">${avg}%</div><div style="font-size:12px">平均完成率 · ${cd.length}天</div>`;
    container.appendChild(div);
  });
}

// --- Review Page (Phase 3.1) ---
function renderReview() {
  const container = document.getElementById('review-content');
  const t = today();
  const weekKey = getISOWeek(t);
  const cycleInfo = getCycleInfo(t);

  // Get last 7 days data
  const weekDays = [];
  for (let i = 0; i < 7; i++) weekDays.push(loadDay(daysAgo(i)));
  const validDays = weekDays.filter(Boolean);

  // Dim rates for the week
  const dimRates = {};
  DIMS.forEach(d => dimRates[d.key] = []);
  validDays.forEach(day => {
    DIMS.forEach(d => dimRates[d.key].push(STATUS_SCORE[day.dimensions?.[d.key]?.status || 'none']));
  });
  const dimAvgs = {};
  DIMS.forEach(d => {
    dimAvgs[d.key] = dimRates[d.key].length ? dimRates[d.key].reduce((a,b)=>a+b,0) / dimRates[d.key].length : 0;
  });

  // Find best/worst
  let bestDim = DIMS[0], worstDim = DIMS[0];
  DIMS.forEach(d => {
    if (dimAvgs[d.key] > dimAvgs[bestDim.key]) bestDim = d;
    if (dimAvgs[d.key] < dimAvgs[worstDim.key]) worstDim = d;
  });

  // Daily completion trend
  const dailyRates = [];
  for (let i = 6; i >= 0; i--) {
    const d = loadDay(daysAgo(i));
    dailyRates.push({ label: daysAgo(i).slice(5), rate: d ? Math.round(d.completion_rate * 100) : 0 });
  }

  // Load saved review
  const savedReview = JSON.parse(localStorage.getItem('lr_review_' + weekKey) || 'null');

  let html = `<div class="skeleton-card" style="text-align:left">
    <div style="font-weight:700;font-size:16px;margin-bottom:12px">📊 本周数据 · ${weekKey}</div>
    <div class="stat-grid" style="margin:0 0 12px">
      <div style="text-align:center"><div style="font-size:12px;color:var(--text2)">最强维度</div><div style="font-size:20px">${bestDim.emoji} ${Math.round(dimAvgs[bestDim.key]*100)}%</div></div>
      <div style="text-align:center"><div style="font-size:12px;color:var(--text2)">最弱维度</div><div style="font-size:20px">${worstDim.emoji} ${Math.round(dimAvgs[worstDim.key]*100)}%</div></div>
    </div>
    <div style="font-weight:600;margin-bottom:8px">维度完成率</div>
    ${DIMS.map(d => {
      const avg = Math.round(dimAvgs[d.key] * 100);
      return `<div style="margin-bottom:6px"><span style="font-size:13px">${d.emoji} ${d.name}</span><span style="float:right;font-size:13px">${avg}%</span><div class="completion-bar" style="height:8px"><div class="completion-fill" style="width:${avg}%"></div></div></div>`;
    }).join('')}
    <div style="font-weight:600;margin:12px 0 8px">每日趋势</div>
    <div class="trend-chart">${dailyRates.map(d => `<div class="trend-col"><div class="trend-bar" style="height:${Math.max(d.rate, 4)}%"></div><div class="trend-label">${d.label}</div></div>`).join('')}</div>
  </div>`;

  // Weekly review form
  html += `<div class="skeleton-card" style="text-align:left">
    <div style="font-weight:700;font-size:16px;margin-bottom:12px">✍️ 本周复盘</div>
    <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">本周亮点</label><textarea class="note-input" id="rv-highlights" rows="3" placeholder="本周做得好的地方...">${savedReview?.highlights || ''}</textarea></div>
    <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">本周痛点</label><textarea class="note-input" id="rv-painpoints" rows="3" placeholder="本周遇到的困难...">${savedReview?.painpoints || ''}</textarea></div>
    <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">下周最重要的3个改进</label><textarea class="note-input" id="rv-improvements" rows="3" placeholder="1. ...&#10;2. ...&#10;3. ...">${savedReview?.improvements || ''}</textarea></div>
    <button class="submit-btn" id="save-review" style="font-size:14px;padding:12px">保存复盘</button>
  </div>`;

  // Cycle review
  if (cycleInfo.cycleDay >= 8) {
    const cycleDays = getAllDays().filter(d => d.cycle === cycleInfo.cycle);
    const prevCycle = 'P' + String(parseInt(cycleInfo.cycle.slice(1)) - 1).padStart(2, '0');
    const prevDays = getAllDays().filter(d => d.cycle === prevCycle);
    const cycleAvg = cycleDays.length ? Math.round(cycleDays.reduce((s,d)=>s+d.completion_rate,0)/cycleDays.length*100) : 0;
    const prevAvg = prevDays.length ? Math.round(prevDays.reduce((s,d)=>s+d.completion_rate,0)/prevDays.length*100) : 0;
    const savedCycleReview = JSON.parse(localStorage.getItem('lr_review_cycle_' + cycleInfo.cycle) || 'null');
    const diff = cycleAvg - prevAvg;
    const diffStr = diff > 0 ? `+${diff}%` : `${diff}%`;
    const diffColor = diff >= 0 ? 'var(--good)' : 'var(--none)';

    html += `<div class="skeleton-card" style="text-align:left;border-color:var(--partial)">
      <div style="font-weight:700;font-size:16px;margin-bottom:8px">🔄 周期复盘 · ${cycleInfo.cycle}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">第${cycleInfo.cycleDay}/10天 · ${cycleDays.length}天打卡</div>
      <div class="stat-grid" style="margin:0 0 12px">
        <div style="text-align:center"><div style="font-size:12px;color:var(--text2)">本周期</div><div class="stat-num" style="font-size:28px">${cycleAvg}%</div></div>
        <div style="text-align:center"><div style="font-size:12px;color:var(--text2)">vs 上周期</div><div style="font-size:28px;font-weight:800;color:${diffColor}">${diffStr}</div></div>
      </div>
      <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">周期总结</label><textarea class="note-input" id="rv-cycle" rows="3" placeholder="本周期整体感受...">${savedCycleReview?.summary || ''}</textarea></div>
      <button class="submit-btn" id="save-cycle-review" style="font-size:14px;padding:12px">保存周期复盘</button>
    </div>`;
  }

  container.innerHTML = html;

  // Bind save buttons
  const saveBtn = document.getElementById('save-review');
  if (saveBtn) saveBtn.onclick = () => {
    localStorage.setItem('lr_review_' + weekKey, JSON.stringify({
      highlights: document.getElementById('rv-highlights')?.value || '',
      painpoints: document.getElementById('rv-painpoints')?.value || '',
      improvements: document.getElementById('rv-improvements')?.value || '',
    }));
    showToast('复盘已保存 ✅');
  };
  const saveCycleBtn = document.getElementById('save-cycle-review');
  if (saveCycleBtn) saveCycleBtn.onclick = () => {
    localStorage.setItem('lr_review_cycle_' + cycleInfo.cycle, JSON.stringify({
      summary: document.getElementById('rv-cycle')?.value || '',
    }));
    showToast('周期复盘已保存 ✅');
  };
}

// --- Planning (Phase 3.2) ---
function renderPlanning() {
  const container = document.getElementById('planning-content');
  const t = today();
  const info = getCycleInfo(t);
  const saved = JSON.parse(localStorage.getItem('lr_plan_' + info.cycle) || 'null');

  container.innerHTML = `<div class="skeleton-card" style="text-align:left">
    <div style="font-weight:700;font-size:16px;margin-bottom:4px">🎯 周期规划 · ${info.cycle}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">第${info.cycleDay}/10天</div>
    ${DIMS.map(d => `<div style="margin-bottom:12px"><label style="font-size:13px;display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:18px">${d.emoji}</span>${d.name}</label><textarea class="note-input plan-input" data-dim="${d.key}" rows="2" placeholder="本周期目标/任务...">${saved?.[d.key] || ''}</textarea></div>`).join('')}
    <button class="submit-btn" id="save-plan" style="font-size:14px;padding:12px">保存规划</button>
  </div>`;

  document.getElementById('save-plan').onclick = () => {
    const plan = {};
    document.querySelectorAll('.plan-input').forEach(el => plan[el.dataset.dim] = el.value);
    localStorage.setItem('lr_plan_' + info.cycle, JSON.stringify(plan));
    showToast('规划已保存 ✅');
  };
}

// --- Stats (Phase 4.2) ---
function renderStats() {
  const days = getAllDays();
  const container = document.getElementById('stats-content');
  if (!days.length) { container.innerHTML = '<div class="skeleton-card">暂无数据</div>'; return; }

  const totalDays = days.length;
  const avgRate = Math.round(days.reduce((s, d) => s + d.completion_rate, 0) / totalDays * 100);
  const dimRates = {};
  DIMS.forEach(d => dimRates[d.key] = []);
  days.forEach(day => {
    DIMS.forEach(d => dimRates[d.key].push(STATUS_SCORE[day.dimensions?.[d.key]?.status || 'none']));
  });

  // Longest streak
  const sortedDates = days.map(d => d.date).sort();
  let maxStreak = 0, curStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0 || dateDiff(sortedDates[i], sortedDates[i-1]) <= 1.01) { curStreak++; } else { curStreak = 1; }
    maxStreak = Math.max(maxStreak, curStreak);
  }

  // Radar chart (SVG)
  const dimAvgs = DIMS.map(d => dimRates[d.key].length ? Math.round(dimRates[d.key].reduce((a,b)=>a+b,0) / dimRates[d.key].length * 100) : 0);
  const radarPoints = dimAvgs.map((v, i) => {
    const angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
    const r = v / 100 * 80;
    return (120 + r * Math.cos(angle)).toFixed(1) + ',' + (120 + r * Math.sin(angle)).toFixed(1);
  });
  const radarBg = Array.from({length: 8}, (_, i) => {
    const angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
    return (120 + 80 * Math.cos(angle)).toFixed(1) + ',' + (120 + 80 * Math.sin(angle)).toFixed(1);
  });

  // Week trend (last 4 weeks)
  const weekTrend = [];
  for (let w = 3; w >= 0; w--) {
    let total = 0, count = 0;
    for (let d = w * 7; d < (w + 1) * 7; d++) {
      const dd = loadDay(daysAgo(d));
      if (dd) { total += dd.completion_rate; count++; }
    }
    const weekLabel = getISOWeek(daysAgo(w * 7 + 3));
    weekTrend.push({ label: weekLabel.slice(-2), rate: count ? Math.round(total / count * 100) : 0 });
  }

  // Dim ranking
  const dimRanking = DIMS.map(d => ({ ...d, avg: dimRates[d.key].length ? Math.round(dimRates[d.key].reduce((a,b)=>a+b,0) / dimRates[d.key].length * 100) : 0 })).sort((a,b) => b.avg - a.avg);

  container.innerHTML = `
    <div class="stat-grid">
      <div class="skeleton-card"><div class="stat-num">${totalDays}</div>打卡天数</div>
      <div class="skeleton-card"><div class="stat-num">${avgRate}%</div>平均完成率</div>
      <div class="skeleton-card"><div class="stat-num">${maxStreak}</div>最长连续天数</div>
    </div>
    <div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;margin-bottom:12px">🕸️ 维度雷达图</div>
      <div style="text-align:center">
        <svg viewBox="0 0 240 240" width="220" height="220" style="max-width:100%">
          <polygon points="${radarBg.join(' ')}" fill="none" stroke="var(--border)" stroke-width="1"/>
          <polygon points="${radarPoints.join(' ')}" fill="rgba(108,140,255,.15)" stroke="var(--accent)" stroke-width="2"/>
          ${DIMS.map((d, i) => {
            const angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
            const x = 120 + 95 * Math.cos(angle);
            const y = 120 + 95 * Math.sin(angle);
            return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="var(--text2)" font-size="10">${d.emoji}</text>`;
          }).join('')}
        </svg>
      </div>
    </div>
    <div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;margin-bottom:12px">📈 最近4周趋势</div>
      <div class="trend-chart">${weekTrend.map(w => `<div class="trend-col"><div class="trend-bar" style="height:${Math.max(w.rate, 4)}%"><span style="font-size:10px">${w.rate}%</span></div><div class="trend-label">${w.label}</div></div>`).join('')}</div>
    </div>
    <div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;margin-bottom:10px">🏆 维度排行</div>
      ${dimRanking.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:14px;color:var(--text2);width:20px">#${i+1}</span><span style="font-size:18px">${d.emoji}</span><span style="flex:1;font-size:14px">${d.name}</span><span style="font-weight:700;color:var(--accent)">${d.avg}%</span></div>`).join('')}
    </div>
  `;
}

// --- Export ---
function exportJSON() {
  downloadFile('life-reboot.json', JSON.stringify(getAllDays(), null, 2), 'application/json');
}
function exportCSV() {
  const days = getAllDays();
  if (!days.length) { showToast('暂无数据'); return; }
  let csv = '日期,周期,周期天数,' + DIMS.map(d => d.name + '状态').join(',') + ',' + DIMS.map(d => d.name + '备注').join(',') + ',完成率\n';
  days.forEach(d => {
    csv += `${d.date},${d.cycle},${d.cycle_day},`;
    csv += DIMS.map(dim => d.dimensions?.[dim.key]?.status || '').join(',');
    csv += ',';
    csv += DIMS.map(dim => '"' + (d.dimensions?.[dim.key]?.note || '').replace(/"/g, '""') + '"').join(',');
    csv += `,${d.completion_rate}\n`;
  });
  downloadFile('life-reboot.csv', '\uFEFF' + csv, 'text/csv');
}
function downloadFile(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  showToast('导出成功 📁');
}

// --- Toast ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// --- Nav ---
let currentSub = null;
function switchPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));

  // Reset sub page
  currentSub = null;
  document.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
  document.querySelector('.mine-menu')?.classList.remove('hidden');

  if (name === 'checkin') { checkinDate = null; renderCheckin(); }
  if (name === 'board') renderBoard();
  if (name === 'review') renderReview();
}

function switchSub(sub) {
  if (currentSub === sub) { currentSub = null; document.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active')); document.querySelector('.mine-menu').classList.remove('hidden'); return; }
  currentSub = sub;
  document.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
  document.getElementById('sub-' + sub)?.classList.add('active');
  document.querySelector('.mine-menu').classList.add('hidden');
  if (sub === 'stats') renderStats();
  if (sub === 'planning') renderPlanning();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) // disabled for cache fix
  renderCheckin();
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchPage(b.dataset.page)));
  document.querySelectorAll('.mine-btn').forEach(b => b.addEventListener('click', () => switchSub(b.dataset.sub)));
  document.getElementById('export-json').onclick = exportJSON;
  document.getElementById('export-csv').onclick = exportCSV;

  // Import
  document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
  document.getElementById('import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const arr = Array.isArray(data) ? data : [data];
        let count = 0;
        arr.forEach(item => {
          if (item.date) { saveDay(item.date, item); count++; }
        });
        const resultEl = document.getElementById('import-result');
        resultEl.style.display = 'block';
        resultEl.textContent = `✅ 导入了 ${count} 条记录`;
        showToast(`导入了 ${count} 条记录`);
      } catch (err) { showToast('导入失败：JSON 格式错误'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // LeanCloud sync settings
  const lcCfg = LCSync.getConfig();
 document.getElementById('lc-app-id').value = lcCfg.appId;
  document.getElementById('lc-app-key').value = lcCfg.appKey;
  document.getElementById('lc-server-url').value = lcCfg.serverURL;
  document.getElementById('lc-save').onclick = () => {
    localStorage.setItem('lc_app_id', document.getElementById('lc-app-id').value.trim());
    localStorage.setItem('lc_app_key', document.getElementById('lc-app-key').value.trim());
    localStorage.setItem('lc_server_url', document.getElementById('lc-server-url').value.trim());
    showToast('配置已保存 ✅');
    LCSync.updateSyncStatus();
  };
  document.getElementById('lc-test').onclick = async () => {
    const statusEl = document.getElementById('lc-status');
    statusEl.textContent = '测试中...';
    const r = await LCSync.testConnection();
    statusEl.textContent = r.msg;
    LCSync.updateSyncStatus();
  };
  document.getElementById('lc-sync-btn').onclick = async () => {
    const prog = document.getElementById('lc-sync-progress');
    prog.style.display = 'block';
    document.getElementById('lc-sync-btn').disabled = true;
    await LCSync.syncAll(msg => prog.textContent = msg);
    document.getElementById('lc-sync-btn').disabled = false;
    renderCheckin();
  };
  document.getElementById('fab-sync')?.addEventListener('click', async () => {
    const cfg = LCSync.getConfig();
    if (!cfg.appId || !cfg.appKey) { showToast('请先配置云同步'); return; }
    showToast('同步中...');
    await LCSync.syncAll(msg => {});
    showToast('同步完成 ✅');
    renderCheckin();
  });

  LCSync.updateSyncStatus();
  document.getElementById('checkin-date').addEventListener('change', (e) => {
    checkinDate = e.target.value || null;
    renderCheckin();
  });
});
