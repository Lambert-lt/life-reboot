// LeanCloud Sync Module for 人生重启系统
const LCSync = (() => {
  let initialized = false;

  function getConfig() {
    return {
      appId: localStorage.getItem('lc_app_id') || '',
      appKey: localStorage.getItem('lc_app_key') || '',
      serverURL: localStorage.getItem('lc_server_url') || 'https://us-api.leancloud.cn',
    };
  }

  function getUserId() {
    let uid = localStorage.getItem('lc_user_id');
    if (!uid) { uid = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); localStorage.setItem('lc_user_id', uid); }
    return uid;
  }

  function initLC() {
    const cfg = getConfig();
    if (!cfg.appId || !cfg.appKey) return false;
    try {
      AV.init({ appId: cfg.appId, appKey: cfg.appKey, serverURL: cfg.serverURL });
      initialized = true;
      return true;
    } catch (e) { console.error('LC init failed:', e); return false; }
  }

  function updateStatusUI(icon, text) {
    const el = document.getElementById('sync-status');
    if (el) { el.textContent = icon; el.title = text; }
  }

  function updateSyncStatus() {
    const cfg = getConfig();
    if (!cfg.appId || !cfg.appKey) { updateStatusUI('❌', '未配置云同步'); return; }
    if (!initialized && !initLC()) { updateStatusUI('⚠️', '同步异常'); return; }
    updateStatusUI('☁️', '已配置');
  }

  async function testConnection() {
    const cfg = getConfig();
    if (!cfg.appId || !cfg.appKey) return { ok: false, msg: '请先填写 App ID 和 App Key' };
    if (!initLC()) return { ok: false, msg: '初始化失败' };
    try {
      const TestObject = AV.Object.extend('LifeReboot');
      const obj = new TestObject();
      obj.set('date', '_test');
      obj.set('userId', getUserId());
      const saved = await obj.save();
      await saved.destroy();
      return { ok: true, msg: '连接成功 ✅' };
    } catch (e) {
      return { ok: false, msg: '连接失败: ' + (e.message || e) };
    }
  }

  function dayToLC(day) {
    const obj = new AV.Object('LifeReboot');
    obj.set('date', day.date);
    obj.set('cycle', day.cycle);
    obj.set('cycle_day', day.cycle_day);
    obj.set('dimensions', day.dimensions);
    obj.set('completion_rate', day.completion_rate);
    obj.set('userId', getUserId());
    return obj;
  }

  function lcToDay(obj) {
    return {
      date: obj.get('date'),
      cycle: obj.get('cycle'),
      cycle_day: obj.get('cycle_day'),
      dimensions: obj.get('dimensions'),
      completion_rate: obj.get('completion_rate'),
    };
  }

  async function uploadDay(day) {
    if (!initialized && !initLC()) return;
    const userId = getUserId();
    try {
      const q = new AV.Query('LifeReboot');
      q.equalTo('date', day.date);
      q.equalTo('userId', userId);
      const existing = await q.first();
      if (existing) {
        existing.set('dimensions', day.dimensions);
        existing.set('completion_rate', day.completion_rate);
        existing.set('cycle', day.cycle);
        existing.set('cycle_day', day.cycle_day);
        await existing.save();
      } else {
        await dayToLC(day).save();
      }
    } catch (e) { console.error('uploadDay error:', e); }
  }

  async function syncAll(progressCb) {
    if (!initLC()) { progressCb('❌ 未配置'); return; }
    updateStatusUI('⏳', '同步中...');
    progressCb('🔄 拉取云端数据...');

    const userId = getUserId();
    const q = new AV.Query('LifeReboot');
    q.equalTo('userId', userId);
    q.limit(1000);
    let cloudDays = [];
    try {
      let results = await q.find();
      cloudDays = results.map(lcToDay);
    } catch (e) { progressCb('❌ 拉取失败: ' + e.message); updateStatusUI('⚠️', '同步失败'); return; }

    progressCb(`🔄 云端 ${cloudDays.length} 条，开始合并...`);
    const localDays = getAllDays();
    const localMap = {};
    localDays.forEach(d => localMap[d.date] = d);

    let uploadCount = 0;
    // Merge: cloud wins if higher completion_rate, otherwise local wins
    const merged = {};
    cloudDays.forEach(cd => {
      merged[cd.date] = cd;
      const ld = localMap[cd.date];
      if (!ld || (ld.completion_rate !== undefined && ld.completion_rate > cd.completion_rate)) {
        merged[cd.date] = ld;
      }
    });
    localDays.forEach(ld => {
      if (!merged[ld.date]) merged[ld.date] = ld;
    });

    // Save merged to local
    Object.values(merged).forEach(d => saveDay(d.date, d));

    // Upload local-only days
    const cloudDates = new Set(cloudDays.map(d => d.date));
    const toUpload = localDays.filter(d => !cloudDates.has(d.date));
    if (toUpload.length) {
      progressCb(`🔄 上传 ${toUpload.length} 条新数据...`);
      for (const d of toUpload) {
        await uploadDay(d);
        uploadCount++;
      }
    }

    updateStatusUI('☁️', '已同步');
    progressCb(`✅ 同步完成！云端 ${cloudDays.length} 条，上传 ${uploadCount} 条`);
  }

  async function uploadSingle(day) {
    if (!initialized && !initLC()) return;
    updateStatusUI('⏳', '同步中...');
    await uploadDay(day);
    updateStatusUI('☁️', '已同步');
  }

  return { getConfig, initLC, updateSyncStatus, testConnection, syncAll, uploadSingle, getUserId };
})();
