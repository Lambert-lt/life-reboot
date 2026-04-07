// 人生重启系统 - App
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
  { key: 'good',    label: '很好 ✅✅', cls: 'sel-good' },
  { key: 'done',    label: '完成 ✅',   cls: 'sel-done' },
  { key: 'partial', label: '部分 ⚠️',  cls: 'sel-partial' },
  { key: 'none',    label: '未开始 ❌', cls: 'sel-none' },
];
const STATUS_SCORE = { good: 1, done: 0.75, partial: 0.3, none: 0 };

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

// --- Render ---
function renderCheckin() {
  const t = today();
  const info = getCycleInfo(t);
  document.getElementById('cycle-info').textContent = `${t} · ${info.cycle} · 第${info.cycleDay}天`;

  const container = document.getElementById('dim-cards');
  container.innerHTML = '';
  const existing = loadDay(t) || {};

  DIMS.forEach(dim => {
    const card = document.createElement('div');
    card.className = 'dim-card';
    const dimData = existing.dimensions?.[dim.key] || {};
    const curStatus = dimData.status || '';

    card.innerHTML = `
      <div class="dim-header"><span class="dim-emoji">${dim.emoji}</span>${dim.name}</div>
      <div class="status-row">
        ${STATUS.map(s => `<button class="status-btn ${curStatus === s.key ? s.cls : ''}" data-dim="${dim.key}" data-status="${s.key}">${s.label}</button>`).join('')}
      </div>
      <textarea class="note-input" data-dim="${dim.key}" placeholder="备注（可选）" rows="1">${dimData.note || ''}</textarea>
    `;
    container.appendChild(card);
  });

  // Status button click
  container.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.parentElement;
      row.querySelectorAll('.status-btn').forEach(b => b.className = 'status-btn');
      btn.classList.add(STATUS.find(s => s.key === btn.dataset.status).cls);
      updateCompletionBar();
    });
  });

  updateCompletionBar();

  // Submit
  document.getElementById('submit-btn').onclick = () => {
    const dims = {};
    DIMS.forEach(dim => {
      const noteEl = container.querySelector(`.note-input[data-dim="${dim.key}"]`);
      const selBtn = container.querySelector(`.status-btn.sel-good[data-dim="${dim.key}"], .status-btn.sel-done[data-dim="${dim.key}"], .status-btn.sel-partial[data-dim="${dim.key}"], .status-btn.sel-none[data-dim="${dim.key}"]`);
      dims[dim.key] = { status: selBtn?.dataset.status || 'none', note: noteEl?.value || '' };
    });
    const rate = DIMS.reduce((s, d) => s + STATUS_SCORE[dims[d.key].status], 0) / DIMS.length;
    saveDay(t, { date: t, cycle: info.cycle, cycle_day: info.cycleDay, dimensions: dims, completion_rate: Math.round(rate * 100) / 100 });
    showToast('打卡成功 ✅');
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

function renderBoard() {
  const days = getAllDays();
  const container = document.getElementById('board-content');
  if (!days.length) { container.innerHTML = '<div class="skeleton-card">暂无打卡数据</div>'; return; }

  container.innerHTML = '';
  // Group by cycle
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

function renderStats() {
  const days = getAllDays();
  const container = document.getElementById('stats-content');
  if (!days.length) { container.innerHTML = '<div class="skeleton-card">暂无数据</div>'; return; }

  const totalDays = days.length;
  const avgRate = Math.round(days.reduce((s, d) => s + d.completion_rate, 0) / totalDays * 100);
  const dimRates = {};
  DIMS.forEach(d => dimRates[d.key] = []);
  days.forEach(day => {
    DIMS.forEach(d => {
      dimRates[d.key].push(STATUS_SCORE[day.dimensions?.[d.key]?.status || 'none']);
    });
  });

  container.innerHTML = `
    <div class="stat-grid">
      <div class="skeleton-card"><div class="stat-num">${totalDays}</div>打卡天数</div>
      <div class="skeleton-card"><div class="stat-num">${avgRate}%</div>平均完成率</div>
    </div>
    <div class="skeleton-card" style="text-align:left">
      <div style="font-weight:700;margin-bottom:10px">各维度平均完成率</div>
      ${DIMS.map(d => {
        const avg = Math.round(dimRates[d.key].reduce((a,b)=>a+b,0) / dimRates[d.key].length * 100);
        return `<div style="margin-bottom:8px"><span>${d.emoji} ${d.name}</span><span style="float:right">${avg}%</span><div class="completion-bar"><div class="completion-fill" style="width:${avg}%"></div></div></div>`;
      }).join('')}
    </div>
  `;
}

// --- Export ---
function exportJSON() {
  const data = getAllDays();
  downloadFile('life-reboot.json', JSON.stringify(data, null, 2), 'application/json');
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
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'board') renderBoard();
  if (name === 'stats') renderStats();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  renderCheckin();
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchPage(b.dataset.page)));
  document.getElementById('export-json').onclick = exportJSON;
  document.getElementById('export-csv').onclick = exportCSV;
});
