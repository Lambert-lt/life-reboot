// 重启系统 - App v2.0 Phase 3+4
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

const TEMPLATES = {
  health: [
    "午休运动5天\n每天喝水2000ml\n11点前睡觉",
    "午休运动升级(HIIT)\n每天步行8000步\n体重记录",
  ],
  mind: [
    "每小时起身活动\n睡前肩颈拉伸\n冥想10分钟",
    "写情绪日记\n深呼吸练习\n感恩日记",
  ],
  living: [
    "午餐7分饱\n晚餐轻食\n少油少盐",
    "自己做3次饭\n戒掉零食\n每天吃水果",
  ],
  learn: [
    "阅读30分钟\n学一项新技能\n写学习笔记",
    "听播客通勤时间\n看纪录片\n练习英语",
  ],
  finance: [
    "记录每笔支出\n预算控制\n取消无用订阅",
    "学习理财知识\n存下收入的20%\n整理账单",
  ],
  social: [
    "主动联系一个朋友\n认真倾听\n表达感谢",
    "减少无效社交\n陪伴家人\n写一封感谢信",
  ],
  career: [
    "完成本周核心任务\n学习一个工具\n整理工作笔记",
    "优化一个流程\n主动汇报进度\n规划下周工作",
  ],
  hobby: [
    "弹吉他30分钟\n画一幅画\n学一首新歌",
    "跑步5公里\n拍照练习\n尝试新食谱",
  ],
};

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
  const planRaw = JSON.parse(localStorage.getItem('lr_plan_' + info.cycle) || '{}');
  const theme = planRaw.theme || '';
  document.getElementById('cycle-info').textContent = `${today()} · ${info.cycle} · 第${info.cycleDay}天` + (theme ? ` · ${theme}` : '');

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

  // planRaw already loaded above for theme
  // New format: { focusDims, goals, theme }; old format: { health: '...', ... }
  const isOldPlan = planRaw && !Array.isArray(planRaw.focusDims);
  const hasPlan = Object.keys(planRaw).length > 0;
  const focusDims = isOldPlan ? DIMS.map(d => d.key) : (planRaw.focusDims || []);
  const planGoals = isOldPlan ? planRaw : (planRaw.goals || {});

  // Determine visible dims
  let visibleDims;
  if (!hasPlan) {
    // No plan at all: show all 8 dims (backward compat)
    visibleDims = DIMS;
  } else if (isOldPlan) {
    visibleDims = DIMS;
  } else if (focusDims.length === 0) {
    // Has plan but no focus selected: show prompt
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text2)"><div style="font-size:32px;margin-bottom:12px">🎯</div><div>请先在「我的 → 周期规划」中选择重点维度</div></div>';
    updateCompletionBar();
    return;
  } else {
    visibleDims = DIMS.filter(d => focusDims.includes(d.key));
  }

  // For historical data (backfill): merge dims from existing data
  const existingDimKeys = Object.keys(existing.dimensions || {});
  const allVisibleKeys = new Set(visibleDims.map(d => d.key));
  existingDimKeys.forEach(k => { if (!allVisibleKeys.has(k)) allVisibleKeys.add(k); });
  const mergedDims = DIMS.filter(d => allVisibleKeys.has(d.key));

  // Body data section
  const bodyData = existing.bodyData || {};
  const bodySection = document.createElement('div');
  bodySection.className = 'skeleton-card body-data-card';
  bodySection.style.textAlign = 'left';
  bodySection.innerHTML = `
    <div class="body-data-toggle" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:14px">
      <span>📏</span><span>身体数据</span><span style="color:var(--text2);font-size:12px;margin-left:auto">${bodyData.weight || bodyData.waist ? '已记录' : '展开记录'}</span><span class="body-data-arrow" style="transition:transform .2s;font-size:12px;color:var(--text2)">▼</span>
    </div>
    <div class="body-data-fields" style="display:none;margin-top:12px">
      <div style="display:flex;gap:10px">
        <div style="flex:1"><label style="font-size:12px;color:var(--text2)">体重(kg)</label><input type="number" step="0.1" class="note-input" id="body-weight" value="${bodyData.weight || ''}" style="margin-top:4px" placeholder="如 75.5"></div>
        <div style="flex:1"><label style="font-size:12px;color:var(--text2)">腰围(cm)</label><input type="number" step="0.1" class="note-input" id="body-waist" value="${bodyData.waist || ''}" style="margin-top:4px" placeholder="如 85"></div>
      </div>
    </div>
  `;
  bodySection.querySelector('.body-data-toggle').addEventListener('click', () => {
    const fields = bodySection.querySelector('.body-data-fields');
    const arrow = bodySection.querySelector('.body-data-arrow');
    const visible = fields.style.display !== 'none';
    fields.style.display = visible ? 'none' : 'block';
    arrow.style.transform = visible ? '' : 'rotate(180deg)';
  });
  container.appendChild(bodySection);

  mergedDims.forEach(dim => {
    const card = document.createElement('div');
    card.className = 'dim-card';
    const dimData = existing.dimensions?.[dim.key] || {};
    const curStatus = dimData.status || '';
    const planText = (isOldPlan ? planRaw[dim.key] : (focusDims.includes(dim.key) ? planGoals[dim.key] : '')) || '';

    card.innerHTML = `
      <div class="dim-header"><span class="dim-emoji">${dim.emoji}</span>${dim.name}</div>
      ${planText ? `<div class="dim-plan">🎯 ${planText.split('\n').filter(l=>l.trim()).map((l,i)=>(i+1)+'. '+l.trim()).join('<br>')}</div>` : ''}
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
      updateCompletionBar(mergedDims);
    });
  });

  updateCompletionBar(mergedDims);
  renderInsight();

  document.getElementById('submit-btn').onclick = () => {
    const dims = {};
    mergedDims.forEach(dim => {
      const noteEl = container.querySelector(`.note-input[data-dim="${dim.key}"]`);
      const selBtn = container.querySelector(`.status-btn.sel-good[data-dim="${dim.key}"], .status-btn.sel-done[data-dim="${dim.key}"], .status-btn.sel-partial[data-dim="${dim.key}"], .status-btn.sel-none[data-dim="${dim.key}"]`);
      dims[dim.key] = { status: selBtn?.dataset.status || 'none', note: noteEl?.value || '' };
    });
    const rate = mergedDims.reduce((s, d) => s + STATUS_SCORE[dims[d.key].status], 0) / mergedDims.length;
    const w = parseFloat(document.getElementById('body-weight')?.value) || 0;
    const wa = parseFloat(document.getElementById('body-waist')?.value) || 0;
    const bodyData = {};
    if (w > 0) bodyData.weight = w;
    if (wa > 0) bodyData.waist = wa;
    const dayData = { date: t, cycle: info.cycle, cycle_day: info.cycleDay, dimensions: dims, completion_rate: Math.round(rate * 100) / 100 };
    if (Object.keys(bodyData).length) dayData.bodyData = bodyData;
    saveDay(t, dayData);
    FBSync.uploadSingle(dayData).catch(e => console.error('Auto sync failed:', e));
    showToast(t === today() ? '打卡成功 ✅' : '补卡成功 ✅');
  };
}

function updateCompletionBar(dims) {
  const container = document.getElementById('dim-cards');
  if (!container.children.length) return;
  const dimList = dims || DIMS;
  let total = 0;
  dimList.forEach(dim => {
    const sel = container.querySelector(`.status-btn.sel-good[data-dim="${dim.key}"], .status-btn.sel-done[data-dim="${dim.key}"], .status-btn.sel-partial[data-dim="${dim.key}"], .status-btn.sel-none[data-dim="${dim.key}"]`);
    total += STATUS_SCORE[sel?.dataset.status || 'none'];
  });
  const pct = Math.round((total / dimList.length) * 100);
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
  let weightSection = '';

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
    ${weightSection}
    <div style="font-weight:600;margin:12px 0 8px">每日趋势</div>
    <div class="trend-chart">${dailyRates.map(d => `<div class="trend-col"><div class="trend-bar" style="height:${Math.max(d.rate, 4)}%"></div><div class="trend-label">${d.label}</div></div>`).join('')}</div>
  </div>`;

  // Weight change this week
  const weekBodyData = validDays.filter(d => d.bodyData?.weight).map(d => ({ date: d.date, weight: d.bodyData.weight }));
  if (weekBodyData.length >= 2) {
    const first = weekBodyData[0], last = weekBodyData[weekBodyData.length - 1];
    const diff = (last.weight - first.weight).toFixed(1);
    const diffStr = diff > 0 ? `+${diff}kg` : `${diff}kg`;
    const diffColor = diff <= 0 ? 'var(--good)' : 'var(--none)';
    weightSection = `<div style="margin:12px 0;padding:10px;background:var(--bg);border-radius:10px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px">📏 本周体重变化</span><span style="font-weight:700;color:${diffColor}">${diffStr}</span></div>`;
  } else if (weekBodyData.length === 1) {
    weightSection = `<div style="margin:12px 0;padding:10px;background:var(--bg);border-radius:10px;font-size:13px">📏 本周体重：${weekBodyData[0].weight}kg</div>`;
  }

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
    FBSync.uploadSingle(loadDay(today())).catch(e => console.error('Auto sync failed:', e));
    showToast('复盘已保存 ✅');
  };
  const saveCycleBtn = document.getElementById('save-cycle-review');
  if (saveCycleBtn) saveCycleBtn.onclick = () => {
    localStorage.setItem('lr_review_cycle_' + cycleInfo.cycle, JSON.stringify({
      summary: document.getElementById('rv-cycle')?.value || '',
    }));
    FBSync.uploadSingle(loadDay(today())).catch(e => console.error('Auto sync failed:', e));
    showToast('周期复盘已保存 ✅');
  };
}

// --- Planning (Phase 3.2) ---
function renderPlanning(cycleOverride, viewMode) {
  const container = document.getElementById('planning-content');
  const t = today();
  const info = getCycleInfo(t);
  const currentCycle = info.cycle;
  const activeCycle = cycleOverride || currentCycle;

  if (viewMode === 'list') {
    return renderCycleList(container, currentCycle);
  }

  const saved = JSON.parse(localStorage.getItem('lr_plan_' + activeCycle) || 'null');
  const isOld = saved && !Array.isArray(saved.focusDims);
  let focusDims = isOld ? DIMS.map(d => d.key) : (saved?.focusDims || []);
  const goals = saved?.goals || (isOld ? (() => { const g = {}; DIMS.forEach(d => { if (saved?.[d.key]) g[d.key] = saved[d.key]; }); return g; })() : {});
  const theme = saved?.theme || '';
  const isCurrent = activeCycle === currentCycle;
  const backBtn = cycleOverride ? `<button id="plan-back-list" style="background:none;border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;margin-bottom:12px">← 返回列表</button>` : '';

  container.innerHTML = `<div class="skeleton-card" style="text-align:left">
    ${backBtn}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <div style="font-weight:700;font-size:16px">🎯 周期规划 · ${activeCycle}${isCurrent ? ' <span style="font-size:11px;background:var(--accent);color:#000;padding:2px 8px;border-radius:10px">当前</span>' : ''}</div>
      <button id="plan-show-list" style="background:none;border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer">📋 查看所有周期</button>
    </div>
    ${isCurrent ? `<div style="font-size:13px;color:var(--text2);margin-bottom:4px">第${info.cycleDay}/10天</div>` : ''}
    <div style="font-size:13px;color:var(--accent);margin-bottom:12px">选择最多3个重点维度，为每个维度设定目标</div>
    <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">🏷️ 周期主题</label><input class="note-input" id="plan-theme" value="${theme}" placeholder="给这个周期起个名字，如「习惯建立期」" style="margin-top:0"></div>
    ${DIMS.map(d => {
      const checked = focusDims.includes(d.key);
      const dimTemplates = TEMPLATES[d.key] || [];
      const tplBtns = checked ? `<div class="template-btns">${dimTemplates.map((tpl, i) => {
        const label = tpl.split('\n')[0].trim();
        const shortLabel = label.length > 15 ? label.slice(0, 15) + '...' : label;
        return `<button class="template-btn" data-dim="${d.key}" data-tpl-idx="${i}" title="${label}">${shortLabel}</button>`;
      }).join('')}</div>` : '';
      return `<div class="plan-dim-row" data-dim="${d.key}" style="margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;background:var(--card-bg);border-radius:10px;border:2px solid ${checked ? 'var(--accent)' : 'var(--border)'};transition:border-color .2s">
          <input type="checkbox" class="plan-cb" data-dim="${d.key}" ${checked ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)">
          <span style="font-size:18px">${d.emoji}</span>
          <span style="font-size:14px;font-weight:600">${d.name}</span>
        </label>
        ${checked ? tplBtns + `<textarea class="note-input plan-goal" data-dim="${d.key}" rows="2" placeholder="最多3个目标，每行一个..." style="margin-top:6px">${goals[d.key] || ''}</textarea>` : ''}
      </div>`;
    }).join('')}
    <button class="submit-btn" id="save-plan" style="font-size:14px;padding:12px">保存规划</button>
  </div>`;

  const showListBtn = document.getElementById('plan-show-list');
  if (showListBtn) showListBtn.onclick = () => renderPlanning(null, 'list');
  const backBtn2 = document.getElementById('plan-back-list');
  if (backBtn2) backBtn2.onclick = () => renderPlanning(null, 'list');

  // Template buttons
  container.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dim = btn.dataset.dim;
      const idx = parseInt(btn.dataset.tplIdx);
      const ta = container.querySelector(`.plan-goal[data-dim="${dim}"]`);
      if (ta) {
        const tpl = TEMPLATES[dim][idx];
        ta.value = ta.value ? ta.value + '\n' + tpl : tpl;
      }
    });
  });

  // Checkbox toggle
  container.querySelectorAll('.plan-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedDims = [...container.querySelectorAll('.plan-cb:checked')].map(c => c.dataset.dim);
      if (checkedDims.length > 3) {
        cb.checked = false;
        showToast('最多选择3个维度');
        return;
      }
      const row = cb.closest('.plan-dim-row');
      const dim = cb.dataset.dim;
      if (cb.checked) {
        row.querySelector('label').style.borderColor = 'var(--accent)';
        const dimTemplates = TEMPLATES[dim] || [];
        const tplDiv = document.createElement('div');
        tplDiv.className = 'template-btns';
        dimTemplates.forEach((tpl, i) => {
          const label = tpl.split('\n')[0].trim();
          const shortLabel = label.length > 15 ? label.slice(0, 15) + '...' : label;
          const btn = document.createElement('button');
          btn.className = 'template-btn';
          btn.dataset.dim = dim;
          btn.dataset.tplIdx = i;
          btn.title = label;
          btn.textContent = shortLabel;
          btn.addEventListener('click', () => {
            const ta = row.querySelector('.plan-goal');
            if (ta) ta.value = ta.value ? ta.value + '\n' + TEMPLATES[dim][i] : TEMPLATES[dim][i];
          });
          tplDiv.appendChild(btn);
        });
        row.appendChild(tplDiv);
        const ta = document.createElement('textarea');
        ta.className = 'note-input plan-goal';
        ta.dataset.dim = dim;
        ta.rows = 2;
        ta.placeholder = '最多3个目标，每行一个...';
        ta.style.marginTop = '6px';
        row.appendChild(ta);
      } else {
        row.querySelector('label').style.borderColor = 'var(--border)';
        const ta = row.querySelector('.plan-goal');
        if (ta) ta.remove();
      }
    });
  });

  document.getElementById('save-plan').onclick = () => {
    const checkedDims = [...container.querySelectorAll('.plan-cb:checked')].map(c => c.dataset.dim);
    const goals = {};
    let truncated = false;
    container.querySelectorAll('.plan-goal').forEach(el => {
      const lines = el.value.split('\n').filter(l => l.trim());
      if (lines.length > 3) { truncated = true; }
      goals[el.dataset.dim] = lines.slice(0, 3).join('\n');
    });
    const theme = document.getElementById('plan-theme')?.value.trim() || '';
    const plan = { focusDims: checkedDims, goals, theme };
    localStorage.setItem('lr_plan_' + activeCycle, JSON.stringify(plan));
    showToast(truncated ? '已截取前3个目标 ✅' : '规划已保存 ✅');
    FBSync.updateSyncStatus();
  };
}

function renderCycleList(container, currentCycle) {
  const cycles = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const m = key.match(/^lr_plan_(P\d+)$/);
    if (m) {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      cycles.push({ cycle: m[1], theme: data.theme || '', focusDims: data.focusDims || [] });
    }
  }
  cycles.sort((a, b) => {
    const na = parseInt(a.cycle.slice(1)), nb = parseInt(b.cycle.slice(1));
    return na - nb;
  });

  container.innerHTML = `<div class="skeleton-card" style="text-align:left">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-weight:700;font-size:16px">📋 所有周期规划</div>
    </div>
    ${cycles.length === 0 ? '<div style="font-size:13px;color:var(--text2);text-align:center;padding:20px">暂无周期规划</div>' :
    cycles.map(c => {
      const isCurrent = c.cycle === currentCycle;
      const dimEmojis = c.focusDims.map(k => DIMS.find(d => d.key === k)?.emoji || '').join(' ');
      return `<div class="cycle-list-card" data-cycle="${c.cycle}" style="padding:12px;background:var(--card-bg);border-radius:12px;border:2px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'};cursor:pointer;margin-bottom:8px;transition:border-color .2s">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:15px">${c.cycle}</span>
          ${isCurrent ? '<span style="font-size:11px;background:var(--accent);color:#000;padding:2px 8px;border-radius:10px">当前</span>' : ''}
        </div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">${c.theme || '未设置主题'}</div>
        <div style="font-size:13px;margin-top:4px">${dimEmojis || '<span style="color:var(--text2)">未选择维度</span>'} <span style="color:var(--text2);font-size:11px">(${c.focusDims.length}个维度)</span></div>
      </div>`;
    }).join('')}
  </div>`;

  container.querySelectorAll('.cycle-list-card').forEach(card => {
    card.addEventListener('click', () => {
      renderPlanning(card.dataset.cycle, 'detail');
    });
  });
}

// --- Weight Chart Helper ---
function renderWeightChart(days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = loadDay(daysAgo(i));
    if (d?.bodyData?.weight) data.push({ label: daysAgo(i).slice(5), weight: d.bodyData.weight });
  }
  if (data.length < 2) return '<div style="font-size:13px;color:var(--text2);text-align:center;padding:12px">记录体重后自动显示趋势（至少2天）</div>';
  const min = Math.min(...data.map(d => d.weight)) - 1;
  const max = Math.max(...data.map(d => d.weight)) + 1;
  const range = max - min || 1;
  const w = Math.max(data.length * 40, 280);
  const h = 140;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - 40) + 20;
    const y = h - 20 - ((d.weight - min) / range) * (h - 40);
    return { x, y, ...d };
  });
  const polyStr = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaStr = `${pts[0].x},${h - 20} ${polyStr} ${pts[pts.length - 1].x},${h - 20}`;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-height:160px" preserveAspectRatio="xMidYMid meet">
    <polygon points="${areaStr}" fill="rgba(92,224,160,.1)"/>
    <polyline points="${polyStr}" fill="none" stroke="var(--good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--good)"/><text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="var(--text2)" font-size="9">${p.weight}</text><text x="${p.x}" y="${h - 4}" text-anchor="middle" fill="var(--text2)" font-size="8">${p.label}</text>`).join('')}
  </svg>`;
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
      <div style="font-weight:700;margin-bottom:10px">📏 体重趋势</div>
      ${renderWeightChart(30)}
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

  // Clear data
  document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.onclick = () => {
      const days = btn.dataset.days;
      const msg = days === 'all' ? '确定清除所有历史数据？此操作不可恢复！' : `确定清除最近 ${days} 天的数据？`;
      if (!confirm(msg)) return;
      const now = new Date();
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith('lr_20')) continue;
        if (days === 'all') { localStorage.removeItem(k); count++; i--; }
        else {
          const d = new Date(k.slice(3) + 'T00:00:00+08:00');
          const diff = (now - d) / 86400000;
          if (diff < parseInt(days)) { localStorage.removeItem(k); count++; i--; }
        }
      }
      showToast(`已清除 ${count} 条数据`);
      renderCheckin();
    };
  });

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

  // Firebase sync settings
  const fbCfg = FBSync.getConfig();
  document.getElementById('fb-api-key').value = fbCfg.apiKey || '';
  document.getElementById('fb-project-id').value = fbCfg.projectId || '';
  document.getElementById('fb-app-id').value = fbCfg.appId || '';
  document.getElementById('fb-auth-domain').value = fbCfg.authDomain || '';
  document.getElementById('fb-storage-bucket').value = fbCfg.storageBucket || '';
  document.getElementById('fb-sender-id').value = fbCfg.messagingSenderId || '';
  document.getElementById('fb-user-id').value = FBSync.getUserId();
  document.getElementById('fb-copy-uid').onclick = () => {
    navigator.clipboard.writeText(FBSync.getUserId()).then(() => showToast('已复制 ✅'));
  };
  document.getElementById('fb-set-uid').onclick = () => {
    const newUid = document.getElementById('fb-user-id-edit').value.trim();
    if (!newUid) { showToast('请输入用户 ID'); return; }
    FBSync.setUserId(newUid);
    document.getElementById('fb-user-id').value = newUid;
    document.getElementById('fb-user-id-edit').value = '';
    showToast('用户 ID 已切换 ✅');
    document.getElementById('about-user-id') && (document.getElementById('about-user-id').textContent = newUid);
  };
  // About page user ID
  document.getElementById('about-user-id').textContent = FBSync.getUserId();
  document.getElementById('about-copy-uid').onclick = () => {
    navigator.clipboard.writeText(FBSync.getUserId()).then(() => showToast('已复制 ✅'));
  };
  // Sync page connection status
  function updateSyncPageStatus() {
    const el = document.getElementById('sync-connection-status');
    if (!el) return;
    const cfg = FBSync.getConfig();
    if (!cfg.apiKey || !cfg.projectId) {
      el.style.display = 'block';
      el.style.background = 'rgba(255,100,100,0.1)';
      el.style.color = 'var(--none)';
      el.innerHTML = '❌ 未连接';
      return;
    }
    if (FBSync.initFB()) {
      el.style.display = 'block';
      el.style.background = 'rgba(100,200,100,0.1)';
      el.style.color = 'var(--done)';
      el.innerHTML = '✅ 已连接';
    } else {
      el.style.display = 'block';
      el.style.background = 'rgba(255,200,100,0.1)';
      el.style.color = 'var(--warn)';
      el.innerHTML = '⚠️ 连接异常';
    }
  }
  updateSyncPageStatus();

  document.getElementById('fb-save').onclick = () => {
    FBSync.saveConfig({
      apiKey: document.getElementById('fb-api-key').value.trim(),
      projectId: document.getElementById('fb-project-id').value.trim(),
      appId: document.getElementById('fb-app-id').value.trim(),
      authDomain: document.getElementById('fb-auth-domain').value.trim(),
      storageBucket: document.getElementById('fb-storage-bucket').value.trim(),
      messagingSenderId: document.getElementById('fb-sender-id').value.trim(),
    });
    showToast('配置已保存 ✅');
    FBSync.updateSyncStatus();
  };
  document.getElementById('fb-test').onclick = async () => {
    const statusEl = document.getElementById('fb-status');
    statusEl.textContent = '测试中...';
    const r = await FBSync.testConnection();
    statusEl.textContent = r.msg;
    FBSync.updateSyncStatus();
  };
  document.getElementById('fb-sync-btn').onclick = async () => {
    const prog = document.getElementById('fb-sync-progress');
    prog.style.display = 'block';
    document.getElementById('fb-sync-btn').disabled = true;
    await FBSync.syncAll(msg => prog.textContent = msg);
    document.getElementById('fb-sync-btn').disabled = false;
    renderCheckin();
  };
  document.getElementById('fab-sync')?.addEventListener('click', async () => {
    const cfg = FBSync.getConfig();
    if (!cfg.apiKey || !cfg.projectId) { showToast('请先配置云同步'); return; }
    showToast('同步中...');
    await FBSync.syncAll(msg => {});
    showToast('同步完成 ✅');
    renderCheckin();
  });

  FBSync.updateSyncStatus();
  document.getElementById('checkin-date').addEventListener('change', (e) => {
    checkinDate = e.target.value || null;
    renderCheckin();
  });
});

// --- Weight Loss Plan Import ---
(function initWeightLossPlan() {
  const plans = [
    {cycle:'P11',theme:'启动期：微习惯+16:8断食',focusDims:['health','living','mind'],goals:{health:'每天1个俯卧撑（微习惯启动）\n每天八段锦1个动作\n早上8:00前喝第一杯水',living:'开始16:8断食（12:00-20:00进食）\n午餐7分饱，主食减半\n晚餐轻食，19:00前结束',mind:'每坐1小时站起来1次\n睡前做1个深呼吸'}},
    {cycle:'P12',theme:'加速期：运动升级+饮食收紧',focusDims:['health','living','mind'],goals:{health:'午休八段锦3天+俯卧撑深蹲2天\n每天喝水2000ml\n体重记录（每天早起空腹）',living:'继续16:8断食\n午餐少油少盐，自己做2次饭\n晚餐无主食（蔬菜+蛋白质）\n戒掉零食和含糖饮料',mind:'睡前肩颈拉伸10分钟\n保证7小时睡眠'}},
    {cycle:'P13',theme:'攻坚期：HIIT+严格饮食',focusDims:['health','living'],goals:{health:'午休八段锦2天+HIIT燃脂2天+力量1天\n体重+腰围记录\n每天8000步',living:'继续16:8断食\n午餐主食减到1/3\n晚餐仅蔬菜+蛋白质\n自己做3次饭\n每天吃1份水果'}},
    {cycle:'P14',theme:'突破期：加量+断食强化',focusDims:['health','living','mind'],goals:{health:'午休HIIT 3天+八段锦1天+力量1天\n体重+腰围记录\n每天10000步\n周末散步或额外运动30分钟',living:'继续16:8断食\n午餐控量\n晚餐蔬菜为主\n自己做3次饭\n不碰油炸和勾芡',mind:'冥想5分钟\n写情绪日记\n精力管理'}},
    {cycle:'P15',theme:'冲刺期：极限减脂',focusDims:['health','living'],goals:{health:'午休HIIT 3天+力量2天\n体重+腰围记录\n每天12000步\n周末额外运动30分钟',living:'继续16:8断食\n午餐正常吃但7分饱\n晚餐蔬菜+蛋白质（无主食）\n自己做4次饭\n零零食零饮料'}},
    {cycle:'P16',theme:'收官期：巩固+复盘',focusDims:['health','living','mind'],goals:{health:'午休运动4天（保持节奏）\n体重+腰围记录\n每天10000步',living:'保持健康饮食习惯\n恢复正常午餐量\n晚餐可少量主食',mind:'复盘8周减肥历程\n总结适合自己的饮食和运动节奏\n设定下一个目标'}}
  ];
  // Clear old P17-P20 if exist
  ['P17','P18','P19','P20'].forEach(p => localStorage.removeItem('lr_plan_' + p));
  let count = 0;
  plans.forEach(p => {
    const key = 'lr_plan_' + p.cycle;
    // Always update to latest version
    localStorage.setItem(key, JSON.stringify(p));
    count++;
  });
  if (count > 0) console.log('Imported ' + count + ' cycle plans (8-week version)');
})();
