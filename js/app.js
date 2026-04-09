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

// --- P1-4: Insight Templates ---
const INSIGHT_TEMPLATES = {
  allGood: ['🔥 昨日满分，继续保持！', '💯 全维度完成，你太强了！', '✨ 昨天完美收官，今天继续冲！'],
  newDay: ['💡 新的一天，从最简单的维度开始！', '🌅 新起点，选择一个维度先完成它'],
  notCheckedIn: ['⏰ 今天还没打卡哦，现在完成也不晚！', '📅 今日打卡待完成，动起来吧！'],
};
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

// --- Insight Card (Phase 4.1 + P1-4 Enhancement) ---
function renderInsight() {
  const el = document.getElementById('insight-card');
  const t = today();
  const yesterday = daysAgo(1);
  const yd = loadDay(yesterday);
  const td = loadDay(t);
  if (!yd && !td) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const msgs = [];
  const hasYesterday = !!yd;
  const allGood = hasYesterday && DIMS.every(d => (yd.dimensions?.[d.key]?.status || 'none') !== 'none');

  if (allGood) msgs.push(pickRandom(INSIGHT_TEMPLATES.allGood));
  if (hasYesterday) {
    const fails = DIMS.filter(d => (yd.dimensions?.[d.key]?.status || 'none') === 'none');
    if (fails.length > 0) msgs.push('⚠️ 昨日 ' + fails.map(d => d.emoji + d.name).join('、') + ' 未完成，今天记得补上！');
  }
  DIMS.forEach(dim => {
    let streak = 0;
    for (let i = 1; i <= 3; i++) {
      const dd = loadDay(daysAgo(i));
      if (dd && (dd.dimensions?.[dim.key]?.status || 'none') === 'none') streak++;
      else break;
    }
    if (streak >= 3) msgs.push('📉 ' + dim.emoji + dim.name + ' 已连续' + streak + '天未完成，是否需要调整目标？');
  });
  // P1-4: 7-day decline trend
  DIMS.forEach(dim => {
    const scores = [];
    for (let i = 1; i <= 7; i++) {
      const dd = loadDay(daysAgo(i));
      if (dd) scores.push(STATUS_SCORE[dd.dimensions?.[dim.key]?.status || 'none']);
    }
    if (scores.length >= 3) {
      const last3 = scores.slice(-3);
      if (last3[2] < last3[1] && last3[1] < last3[0]) msgs.push('📉 ' + dim.emoji + dim.name + ' 近3天评分持续下降，注意调整');
    }
  });
  // P1-4: Not checked in & past 20:00
  if (!td && new Date().getHours() >= 20) msgs.push(pickRandom(INSIGHT_TEMPLATES.notCheckedIn));
  // P1-4: Focus dimension priority
  const info = getCycleInfo(t);
  const planRaw = JSON.parse(localStorage.getItem('lr_plan_' + info.cycle) || '{}');
  if (planRaw.focusDims && planRaw.focusDims.length > 0) {
    const focusDim = DIMS.find(d => d.key === planRaw.focusDims[0]);
    if (focusDim && (!td || (td.dimensions?.[focusDim.key]?.status || 'none') === 'none'))
      msgs.push('🎯 本周期重点：' + focusDim.emoji + focusDim.name + '，优先完成它！');
  }
  // Today progress
  if (td) {
    const done = DIMS.filter(d => (td.dimensions?.[d.key]?.status || 'none') !== 'none').length;
    if (done === 0) msgs.push(pickRandom(INSIGHT_TEMPLATES.newDay));
    else if (done < 4) msgs.push('💪 已完成' + done + '个维度，加油！');
    else if (done < 8) msgs.push('🚀 冲刺中！还剩' + (8 - done) + '个维度！');
  }
  el.innerHTML = [...new Set(msgs)].join('<br>') || '';
}

// --- Checkin Page (Phase 4.3: date picker) ---
function renderCheckin() {
  const t = checkinDate || today();
  const info = getCycleInfo(t);
  const planRaw = JSON.parse(localStorage.getItem('lr_plan_' + info.cycle) || '{}');
  const theme = planRaw.theme || '';
  // P0-4: Checkin status indicator
  const todayData = loadDay(today());
  const checkinStatusEl = document.getElementById('checkin-status');
  if (checkinStatusEl) {
    if (todayData) {
      checkinStatusEl.textContent = '✅ 今日已打卡';
      checkinStatusEl.style.color = 'var(--good)';
      if (todayData.checkinTime) checkinStatusEl.textContent += ' · ' + todayData.checkinTime;
    } else {
      checkinStatusEl.textContent = '⏳ 待打卡';
      checkinStatusEl.style.color = 'var(--partial)';
    }
  }

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

  // P0-2: Day review init
  const existingReview = existing.dayReview || {};
  const dayReviewSection = document.getElementById('day-review-section');
  if (dayReviewSection) {
    dayReviewSection.style.display = 'none';
    document.getElementById('dr-satisfied').value = existingReview.satisfied || '';
    document.getElementById('dr-improve').value = existingReview.improve || '';
    document.getElementById('dr-important').value = existingReview.important || '';
    // If already filled, show it
    if (existingReview.satisfied || existingReview.improve || existingReview.important) {
      dayReviewSection.style.display = 'block';
    }
  }
  // P0-2: Preserve dayReview when saving checkin
  const oldDayData = loadDay(t);
  // (handled inline in submit handler via existing.dayReview)

  // P0-2: Save day review button
  const saveDRBtn = document.getElementById('save-day-review');
  if (saveDRBtn) {
    saveDRBtn.onclick = () => {
      const day = loadDay(t) || { date: t };
      day.dayReview = {
        satisfied: document.getElementById('dr-satisfied').value,
        improve: document.getElementById('dr-improve').value,
        important: document.getElementById('dr-important').value,
      };
      saveDay(t, day);
      FBSync.syncItem('lr_' + t);
      showToast('日复盘已保存 ✅');
    };
  }

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
    // Preserve existing day review
    const oldDay = loadDay(t);
    if (oldDay?.dayReview) dayData.dayReview = oldDay.dayReview;
    dayData.checkinTime = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
    saveDay(t, dayData);
    FBSync.syncItem('lr_' + t);
    showToast(t === today() ? '打卡成功 ✅' : '补卡成功 ✅');
    // Update checkin status
    const csi = document.getElementById('checkin-status');
    if (csi && t === today()) {
      csi.textContent = '✅ 今日已打卡 · ' + dayData.checkinTime;
      csi.style.color = 'var(--good)';
    }
    // P0-2: Show day review after checkin
    const drs = document.getElementById('day-review-section');
    if (drs) drs.style.display = 'block';
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

  // P1-1: Calendar heatmap
  const t = today();
  const info = getCycleInfo(t);
  const cycleNum = parseInt(info.cycle.slice(1));
  const yearStart = new Date(new Date(t + 'T00:00:00+08:00').getFullYear(), 0, 1);
  const cycleStartDate = new Date(yearStart.getTime() + ((cycleNum - 1) * 10) * 86400000 + 86400000);
  const cycleDates = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(cycleStartDate.getTime() + i * 86400000);
    cycleDates.push(d.toISOString().slice(0, 10));
  }
  function hColor(rate) {
    if (rate <= 0) return 'var(--heatmap-0)';
    if (rate <= 0.3) return 'var(--heatmap-1)';
    if (rate <= 0.6) return 'var(--heatmap-2)';
    if (rate <= 0.8) return 'var(--heatmap-3)';
    return 'var(--heatmap-4)';
  }
  container.insertAdjacentHTML('beforeend', `<div class="skeleton-card" style="text-align:left">
    <div style="font-weight:700;font-size:16px;margin-bottom:12px">📅 ${info.cycle} 日历热力图</div>
    <div class="heatmap-grid">${cycleDates.map(ds => {
      const dd = loadDay(ds);
      const rate = dd ? dd.completion_rate : -1;
      const color = rate < 0 ? 'var(--heatmap-empty)' : hColor(rate);
      const pct = rate >= 0 ? Math.round(rate * 100) + '%' : '';
      return `<div class="heatmap-cell ${ds === t ? 'heatmap-today' : ''}" data-date="${ds}" title="${ds} ${pct}"><div class="heatmap-block" style="background:${color}"></div><div class="heatmap-label">${ds.slice(8)}</div></div>`;
    }).join('')}</div>
    <div class="heatmap-legend"><span>少</span><div class="heatmap-block" style="background:var(--heatmap-0)"></div><div class="heatmap-block" style="background:var(--heatmap-1)"></div><div class="heatmap-block" style="background:var(--heatmap-2)"></div><div class="heatmap-block" style="background:var(--heatmap-3)"></div><div class="heatmap-block" style="background:var(--heatmap-4)"></div><span>多</span></div>
  </div>`);
  container.querySelectorAll('.heatmap-cell').forEach(cell => {
    cell.style.cursor = 'pointer';
    cell.addEventListener('click', () => { checkinDate = cell.dataset.date; switchPage('checkin'); });
  });
}

// --- Review Page (Phase 3.1) ---
function renderReview(reviewTab) {
  const container = document.getElementById('review-content');
  if (reviewTab === 'quarter') return renderQuarterReview(container);

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

  // P0-2: Weekly day review summary
  const weekReviews = weekDays.filter(d => d?.dayReview && (d.dayReview.satisfied || d.dayReview.improve || d.dayReview.important));
  if (weekReviews.length > 0) {
    html += '<div class="skeleton-card" style="text-align:left"><div style="font-weight:700;font-size:16px;margin-bottom:12px">📖 本周日复盘汇总</div>';
    weekReviews.forEach(d => {
      const dr = d.dayReview;
      html += `<div style="margin-bottom:10px;padding:10px;background:var(--bg);border-radius:10px"><div style="font-size:12px;color:var(--text2);margin-bottom:4px">${d.date}</div>`;
      if (dr.satisfied) html += `<div style="font-size:13px;margin-bottom:2px">😊 ${dr.satisfied}</div>`;
      if (dr.improve) html += `<div style="font-size:13px;margin-bottom:2px">🔄 ${dr.improve}</div>`;
      if (dr.important) html += `<div style="font-size:13px">🎯 ${dr.important}</div>`;
      html += '</div>';
    });
    html += '</div>';
  }

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

  // Add review tabs at top
  const tabHtml = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="review-tab" data-tab="week" style="flex:1;padding:10px;border-radius:10px;border:2px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-size:14px">📅 周复盘</button>
    <button class="review-tab" data-tab="quarter" style="flex:1;padding:10px;border-radius:10px;border:2px solid var(--border);background:none;color:var(--text2);font-weight:600;cursor:pointer;font-size:14px">📆 季度复盘</button>
  </div>`;

  container.innerHTML = tabHtml + html;

  // Tab click handlers
  container.querySelectorAll('.review-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.review-tab').forEach(b => { b.style.borderColor = 'var(--border)'; b.style.background = 'none'; b.style.color = 'var(--text2)'; b.style.fontWeight = '600'; });
      btn.style.borderColor = 'var(--accent)'; btn.style.background = 'var(--accent)'; btn.style.color = '#000'; btn.style.fontWeight = '700';
      if (btn.dataset.tab === 'quarter') renderReview('quarter');
    });
  });

  // Bind save buttons
  const saveBtn = document.getElementById('save-review');
  if (saveBtn) saveBtn.onclick = () => {
    localStorage.setItem('lr_review_' + weekKey, JSON.stringify({
      highlights: document.getElementById('rv-highlights')?.value || '',
      painpoints: document.getElementById('rv-painpoints')?.value || '',
      improvements: document.getElementById('rv-improvements')?.value || '',
    }));
    FBSync.syncItem('lr_review_' + weekKey);
    showToast('复盘已保存 ✅');
  };
  const saveCycleBtn = document.getElementById('save-cycle-review');
  if (saveCycleBtn) saveCycleBtn.onclick = () => {
    localStorage.setItem('lr_review_cycle_' + cycleInfo.cycle, JSON.stringify({
      summary: document.getElementById('rv-cycle')?.value || '',
    }));
    FBSync.syncItem('lr_review_cycle_' + cycleInfo.cycle);
    showToast('周期复盘已保存 ✅');
  };
}

// --- Quarter Review (P1-2) ---
function renderQuarterReview(container) {
  const t = today();
  const info = getCycleInfo(t);
  const cycleNum = parseInt(info.cycle.slice(1));
  const currentQ = Math.ceil(cycleNum / 3);

  function getQuarterCycles(q) {
    const start = (q - 1) * 3 + 1;
    const cycles = [];
    for (let i = 0; i < 3; i++) {
      cycles.push('P' + String(start + i).padStart(2, '0'));
    }
    return cycles;
  }

  function getCycleRate(cycle) {
    const days = getAllDays().filter(d => d.cycle === cycle);
    return days.length ? Math.round(days.reduce((s, d) => s + d.completion_rate, 0) / days.length * 100) : 0;
  }

  function getCycleDays(cycle) {
    return getAllDays().filter(d => d.cycle === cycle).length;
  }

  let html = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="review-tab" data-tab="week" style="flex:1;padding:10px;border-radius:10px;border:2px solid var(--border);background:none;color:var(--text2);font-weight:600;cursor:pointer;font-size:14px">📅 周复盘</button>
    <button class="review-tab" data-tab="quarter" style="flex:1;padding:10px;border-radius:10px;border:2px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-size:14px">📆 季度复盘</button>
  </div>`;

  // Quarter selector
  const maxQ = Math.max(currentQ, 1);
  html += `<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">`;
  for (let q = 1; q <= maxQ; q++) {
    const isActive = q === currentQ;
    html += `<button class="q-tab" data-q="${q}" style="padding:6px 14px;border-radius:8px;border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};background:${isActive ? 'var(--accent)' : 'none'};color:${isActive ? '#000' : 'var(--text2)'};font-weight:${isActive ? '700' : '500'};cursor:pointer;font-size:13px">${q === currentQ ? 'Q' + q + ' 🔥' : 'Q' + q}</button>`;
  }
  html += `</div><div id="quarter-detail"></div>`;
  container.innerHTML = html;

  // Tab handlers
  container.querySelectorAll('.review-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'week') renderReview('week');
    });
  });

  // Quarter tab click
  container.querySelectorAll('.q-tab').forEach(btn => {
    btn.addEventListener('click', () => renderQuarterDetail(parseInt(btn.dataset.q)));
  });

  renderQuarterDetail(currentQ);

  function renderQuarterDetail(q) {
    const cycles = getQuarterCycles(q);
    const rates = cycles.map(c => ({ cycle: c, rate: getCycleRate(c), days: getCycleDays(c) }));
    const totalDays = rates.reduce((s, r) => s + r.days, 0);
    const avgRate = totalDays > 0 ? Math.round(rates.reduce((s, r) => s + r.rate * r.days, 0) / totalDays) : 0;
    const saved = JSON.parse(localStorage.getItem('lr_review_quarter_Q' + q) || 'null');

    // Highlight active q-tab
    container.querySelectorAll('.q-tab').forEach(b => {
      const isActive = parseInt(b.dataset.q) === q;
      b.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)';
      b.style.background = isActive ? 'var(--accent)' : 'none';
      b.style.color = isActive ? '#000' : 'var(--text2)';
      b.style.fontWeight = isActive ? '700' : '500';
    });

    const maxRate = Math.max(...rates.map(r => r.rate), 1);
    let detailHtml = `<div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;font-size:16px;margin-bottom:12px">📊 Q${q} 季度概览</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">包含周期：${cycles.join(' / ')} · ${totalDays}天打卡 · 平均完成率 ${avgRate}%</div>
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:20px;height:120px;margin:16px 0">${rates.map(r => {
        const h = Math.max(r.rate / maxRate * 100, 4);
        const color = r.rate >= 70 ? 'var(--good)' : r.rate >= 40 ? 'var(--partial)' : 'var(--none)';
        return `<div style="text-align:center"><div style="width:40px;height:${h}%;background:${color};border-radius:6px 6px 0 0;transition:height .3s"></div><div style="font-size:11px;color:var(--text2);margin-top:4px">${r.cycle}</div><div style="font-size:13px;font-weight:700">${r.rate}%</div></div>`;
      }).join('')}</div>
    </div>`;

    detailHtml += `<div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;font-size:16px;margin-bottom:12px">✍️ Q${q} 季度复盘</div>
      <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">这个季度最大的收获是什么？</label><textarea class="note-input" id="rv-q-gain" rows="3" placeholder="回顾这个季度...">${saved?.review?.gain || ''}</textarea></div>
      <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">哪个维度需要加强？</label><textarea class="note-input" id="rv-q-improve" rows="3" placeholder="最需要提升的维度...">${saved?.review?.improve || ''}</textarea></div>
      <div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2);display:block;margin-bottom:4px">下个季度的重点方向？</label><textarea class="note-input" id="rv-q-next" rows="3" placeholder="下个季度的目标...">${saved?.review?.nextFocus || ''}</textarea></div>
      ${saved?.updatedAt ? `<div style="font-size:11px;color:var(--text2);margin-bottom:8px">上次保存：${new Date(saved.updatedAt).toLocaleString('zh-CN')}</div>` : ''}
      <button class="submit-btn" id="save-q-review" style="font-size:14px;padding:12px">保存季度复盘</button>
    </div>`;

    document.getElementById('quarter-detail').innerHTML = detailHtml;
    document.getElementById('save-q-review').onclick = () => {
      const data = {
        quarter: 'Q' + q,
        cycles: cycles,
        review: {
          gain: document.getElementById('rv-q-gain')?.value || '',
          improve: document.getElementById('rv-q-improve')?.value || '',
          nextFocus: document.getElementById('rv-q-next')?.value || '',
        },
        updatedAt: Date.now()
      };
      localStorage.setItem('lr_review_quarter_Q' + q, JSON.stringify(data));
      FBSync.syncItem('lr_review_quarter_Q' + q);
      showToast('季度复盘已保存 ✅');
    };
  }
}

// --- Planning (Phase 3.2) ---

// Goal list helper: parse "text::status" format, backward compatible
function parseGoals(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split('\n').filter(l => l.trim()).map(line => {
      const idx = line.indexOf('::');
      if (idx > 0) {
        return { text: line.slice(0, idx), status: line.slice(idx + 2) || 'active' };
      }
      return { text: line, status: 'active' };
    });
  }
  return raw;
}

function goalsToString(goals) {
  return goals.map(g => g.text + '::' + g.status).join('\n');
}

function renderGoalList(dimKey, rawGoals) {
  const goals = parseGoals(rawGoals);
  const statusEmoji = { active: '🔵', done: '🟢', paused: '⚪' };
  const statusStyle = { active: '', done: 'text-decoration:line-through;color:var(--good)', paused: 'color:var(--text2)' };
  let html = `<div class="goal-list" data-dim="${dimKey}" style="margin-top:6px">`;
  goals.forEach((g, i) => {
    html += `<div class="goal-item" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg);border-radius:8px;margin-bottom:4px">
      <span class="goal-status" data-dim="${dimKey}" data-idx="${i}" style="cursor:pointer;font-size:14px" title="点击切换状态">${statusEmoji[g.status] || '🔵'}</span>
      <span class="goal-text" style="font-size:13px;flex:1;${statusStyle[g.status] || ''}">${g.text}</span>
      <span class="goal-del" data-dim="${dimKey}" data-idx="${i}" style="cursor:pointer;color:var(--text2);font-size:12px" title="删除">✕</span>
    </div>`;
  });
  if (goals.length < 3) {
    html += `<div style="display:flex;gap:6px;margin-top:4px"><input class="note-input goal-new-input" data-dim="${dimKey}" placeholder="添加新目标..." style="flex:1;margin:0;padding:6px 10px;font-size:13px"><button class="goal-add-btn" data-dim="${dimKey}" style="background:var(--accent);color:#000;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">+</button></div>`;
  }
  html += `</div>`;
  return html;
}

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
        ${checked ? tplBtns + renderGoalList(d.key, goals[d.key] || '') : ''}
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
      const list = container.querySelector(`.goal-list[data-dim="${dim}"]`);
      if (list) {
        const existingGoals = parseGoals(goalsToString([...list.querySelectorAll('.goal-item')].map(item => {
          const text = item.querySelector('.goal-text').textContent;
          const emoji = item.querySelector('.goal-status').textContent;
          const statusMap = {'🔵':'active','🟢':'done','⚪':'paused'};
          return { text, status: statusMap[emoji] || 'active' };
        })));
        if (existingGoals.length < 3) {
          existingGoals.push({ text: TEMPLATES[dim][parseInt(btn.dataset.tplIdx)].split('\n')[0].trim(), status: 'active' });
          list.outerHTML = renderGoalList(dim, goalsToString(existingGoals));
          bindGoalListEvents(container);
        }
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
            const list = row.querySelector('.goal-list');
            if (list) {
              const existingGoals = parseGoals(goalsToString([...list.querySelectorAll('.goal-item')].map(item => {
                const text = item.querySelector('.goal-text').textContent;
                const emoji = item.querySelector('.goal-status').textContent;
                const statusMap = {'🔵':'active','🟢':'done','⚪':'paused'};
                return { text, status: statusMap[emoji] || 'active' };
              })));
              if (existingGoals.length < 3) {
                existingGoals.push({ text: TEMPLATES[dim][i].split('\n')[0].trim(), status: 'active' });
                list.outerHTML = renderGoalList(dim, goalsToString(existingGoals));
                bindGoalListEvents(row);
              }
            }
          });
          tplDiv.appendChild(btn);
        });
        row.appendChild(tplDiv);
        const div = document.createElement('div');
        div.innerHTML = renderGoalList(dim, '');
        row.appendChild(div.firstElementChild);
        bindGoalListEvents(row);
      } else {
        row.querySelector('label').style.borderColor = 'var(--border)';
        const gl = row.querySelector('.goal-list');
        if (gl) gl.remove();
      }
    });
  });

  // Bind goal list events
  bindGoalListEvents(container);

  document.getElementById('save-plan').onclick = () => {
    const checkedDims = [...container.querySelectorAll('.plan-cb:checked')].map(c => c.dataset.dim);
    const goals = {};
    container.querySelectorAll('.goal-list').forEach(list => {
      const dim = list.dataset.dim;
      const items = [...list.querySelectorAll('.goal-item')].map(item => {
        const text = item.querySelector('.goal-text').textContent;
        const emoji = item.querySelector('.goal-status').textContent;
        const statusMap = {'🔵':'active','🟢':'done','⚪':'paused'};
        return { text, status: statusMap[emoji] || 'active' };
      });
      goals[dim] = goalsToString(items.slice(0, 3));
    });
    const theme = document.getElementById('plan-theme')?.value.trim() || '';
    const plan = { focusDims: checkedDims, goals, theme };
    localStorage.setItem('lr_plan_' + activeCycle, JSON.stringify(plan));
    FBSync.syncItem('lr_plan_' + activeCycle);
    showToast('规划已保存 ✅');
  };
}

function bindGoalListEvents(parent) {
  const statusCycle = ['active', 'done', 'paused'];
  const statusEmoji = { active: '🔵', done: '🟢', paused: '⚪' };
  const statusStyle = { active: '', done: 'text-decoration:line-through;color:var(--good)', paused: 'color:var(--text2)' };

  parent.querySelectorAll('.goal-status').forEach(el => {
    el.addEventListener('click', () => {
      const item = el.closest('.goal-item');
      const textEl = item.querySelector('.goal-text');
      const currentEmoji = el.textContent;
      const currentStatus = Object.keys(statusEmoji).find(k => statusEmoji[k] === currentEmoji) || 'active';
      const nextIdx = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIdx];
      el.textContent = statusEmoji[nextStatus];
      textEl.style.cssText = 'font-size:13px;flex:1;' + (statusStyle[nextStatus] || '');
    });
  });

  parent.querySelectorAll('.goal-del').forEach(el => {
    el.addEventListener('click', () => {
      el.closest('.goal-item').remove();
      // Show add input if needed
      const list = el.closest('.goal-list');
      if (list && list.querySelectorAll('.goal-item').length < 3 && !list.querySelector('.goal-new-input')) {
        const dim = list.dataset.dim;
        const addDiv = document.createElement('div');
        addDiv.style.cssText = 'display:flex;gap:6px;margin-top:4px';
        addDiv.innerHTML = `<input class="note-input goal-new-input" data-dim="${dim}" placeholder="添加新目标..." style="flex:1;margin:0;padding:6px 10px;font-size:13px"><button class="goal-add-btn" data-dim="${dim}" style="background:var(--accent);color:#000;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">+</button>`;
        list.appendChild(addDiv);
        bindGoalListEvents(list);
      }
    });
  });

  parent.querySelectorAll('.goal-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const text = input.value.trim();
      if (!text) return;
      const list = btn.closest('.goal-list');
      const dim = list.dataset.dim;
      const existingGoals = parseGoals(goalsToString([...list.querySelectorAll('.goal-item')].map(item => {
        const t = item.querySelector('.goal-text').textContent;
        const e = item.querySelector('.goal-status').textContent;
        const sm = {'🔵':'active','🟢':'done','⚪':'paused'};
        return { text: t, status: sm[e] || 'active' };
      })));
      if (existingGoals.length >= 3) { showToast('最多3个目标'); return; }
      existingGoals.push({ text, status: 'active' });
      list.outerHTML = renderGoalList(dim, goalsToString(existingGoals));
      bindGoalListEvents(list.parentElement);
    });
  });

  // Enter key on input
  parent.querySelectorAll('.goal-new-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = input.nextElementSibling;
        if (btn) btn.click();
      }
    });
  });
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
  const subEl = document.getElementById('sub-' + sub);
  if (subEl) {
    // P0-3: Ensure back button exists
    if (!subEl.querySelector('.sub-back-btn')) {
      const backBtn = document.createElement('button');
      backBtn.className = 'sub-back-btn';
      backBtn.textContent = '← 返回';
      backBtn.style.cssText = 'background:none;border:1px solid var(--border);color:var(--accent);padding:8px 14px;border-radius:10px;font-size:13px;cursor:pointer;margin-bottom:12px;font-family:inherit';
      backBtn.onclick = () => switchSub(sub);
      subEl.insertBefore(backBtn, subEl.firstChild);
    }
    subEl.classList.add('active');
  }
  document.querySelector('.mine-menu').classList.add('hidden');
  if (sub === 'stats') renderStats();
  if (sub === 'planning') renderPlanning();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  // P0-5: Service Worker (Network First)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'activated' && navigator.serviceWorker.controller) {
            const t = document.createElement('div');
            t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:101;cursor:pointer;box-shadow:0 4px 16px rgba(108,140,255,.4)';
            t.textContent = '🔄 发现新版本，点击刷新';
            t.onclick = () => window.location.reload();
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 10000);
          }
        });
      });
    }).catch(() => {});
  }
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
      FBSync.autoSync();
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
        FBSync.autoSync();
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
  function copyUserId() {
    const uid = FBSync.getUserId();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(uid).then(() => showToast('已复制 ✅')).catch(() => fallbackCopy(uid));
    } else {
      fallbackCopy(uid);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    try { document.execCommand('copy'); showToast('已复制 ✅'); } catch(e) { showToast('复制失败，请手动复制: ' + text); }
    document.body.removeChild(ta);
  }
  document.getElementById('fb-copy-uid').onclick = copyUserId;
  document.getElementById('about-copy-uid').onclick = copyUserId;
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
  document.getElementById('fb-clear-cache').onclick = async () => {
    if (!confirm('清除同步缓存？\n\n这会清除 Firebase 离线缓存并强制从云端重新拉取数据，不会删除本地打卡记录。')) return;
    try {
      // Clear IndexedDB (Firestore persistence cache)
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name && dbInfo.name.includes('firestore')) {
          indexedDB.deleteDatabase(dbInfo.name);
        }
      }
      // Also clear localStorage sync timestamps
      document.querySelectorAll('[id$="_ts"]').forEach(el => {});
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.endsWith('_ts')) localStorage.removeItem(k);
      }
      showToast('缓存已清除，将重新拉取云端数据 🔄');
      // Re-init sync
      setTimeout(() => { location.reload(); }, 1000);
    } catch (e) {
      showToast('清除失败: ' + e.message);
    }
  };
  document.getElementById('fb-force-pull').onclick = async () => {
    if (!confirm('从云端拉取所有数据？\n\n云端数据将覆盖本地数据。')) return;
    try {
      const count = await FBSync.forcePullFromCloud();
      showToast('拉取成功，共 ' + count + ' 条数据 🔄');
      renderCheckin();
    } catch (e) {
      showToast('拉取失败: ' + (e.message || e));
    }
  };
  document.getElementById('fab-sync')?.addEventListener('click', async () => {
    const cfg = FBSync.getConfig();
    if (!cfg.apiKey || !cfg.projectId) { showToast('请先配置云同步'); return; }
    showToast('同步中...');
    await FBSync.syncAll(msg => {});
    showToast('同步完成 ✅');
    renderCheckin();
  });

  FBSync.init();
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
