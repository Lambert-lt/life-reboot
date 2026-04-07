// Firebase Firestore Sync Module for 人生重启系统
const FBSync = (() => {
  let db = null;
  let initialized = false;

  function getConfig() {
    const saved = JSON.parse(localStorage.getItem('firebase_config') || '{}');
    // 默认配置（Lambert's Firebase）
    const defaults = {
      apiKey: 'AIzaSyAU3u8sV0F0ZBEGFesPzoG3QloWppPQSg4',
      authDomain: 'life-reboot-c1f5d.firebaseapp.com',
      projectId: 'life-reboot-c1f5d',
      storageBucket: 'life-reboot-c1f5d.firebasestorage.app',
      messagingSenderId: '1034839704184',
      appId: '1:1034839704184:web:3656a9818272fc0c74238d',
    };
    return saved.apiKey ? saved : defaults;
  }

  function saveConfig(cfg) {
    localStorage.setItem('firebase_config', JSON.stringify(cfg));
  }

  function getUserId() {
    return localStorage.getItem('fb_user_id') || 'u_1775548112859_cxd269';
  }

  function setUserId(uid) {
    if (uid && uid.trim()) {
      localStorage.setItem('fb_user_id', uid.trim());
    }
  }

  function initFB() {
    if (initialized && db) return true;
    const cfg = getConfig();
    if (!cfg.apiKey || !cfg.projectId) return false;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: cfg.apiKey,
          authDomain: cfg.authDomain || (cfg.projectId + '.firebaseapp.com'),
          projectId: cfg.projectId,
          storageBucket: cfg.storageBucket || (cfg.projectId + '.appspot.com'),
          messagingSenderId: cfg.messagingSenderId || '',
          appId: cfg.appId || '',
        });
      }
      db = firebase.firestore();
      initialized = true;
      return true;
    } catch (e) {
      console.error('Firebase init failed:', e);
      return false;
    }
  }

  function updateStatusUI(icon, text) {
    const el = document.getElementById('sync-status');
    if (el) { el.textContent = icon; el.title = text; }
  }

  function updateSyncStatus() {
    const cfg = getConfig();
    if (!cfg.apiKey || !cfg.projectId) { updateStatusUI('❌', '未配置云同步'); return; }
    if (!initialized && !initFB()) { updateStatusUI('⚠️', '同步异常'); return; }
    updateStatusUI('☁️', '已配置');
  }

  async function testConnection() {
    const cfg = getConfig();
    if (!cfg.apiKey || !cfg.projectId) return { ok: false, msg: '请先填写 API Key 和 Project ID' };
    if (!initFB()) return { ok: false, msg: '初始化失败' };
    try {
      const uid = getUserId();
      const testRef = db.collection('lifeReboot').doc(uid + '__test');
      await testRef.set({ userId: uid, _test: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await testRef.delete();
      return { ok: true, msg: '连接成功 ✅' };
    } catch (e) {
      return { ok: false, msg: '连接失败: ' + (e.message || e) };
    }
  }

  function dayToDoc(day) {
    return {
      userId: getUserId(),
      date: day.date,
      cycle: day.cycle,
      cycle_day: day.cycle_day,
      dimensions: day.dimensions,
      completion_rate: day.completion_rate,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
  }

  function docToDay(doc) {
    const d = doc.data();
    return {
      date: d.date,
      cycle: d.cycle,
      cycle_day: d.cycle_day,
      dimensions: d.dimensions,
      completion_rate: d.completion_rate,
      updatedAt: d.updatedAt,
    };
  }

  async function uploadDay(day) {
    if (!initialized && !initFB()) return;
    const uid = getUserId();
    try {
      const ref = db.collection('lifeReboot').doc(uid + '_' + day.date);
      const existing = await ref.get();
      if (existing.exists) {
        await ref.update({
          dimensions: day.dimensions,
          completion_rate: day.completion_rate,
          cycle: day.cycle,
          cycle_day: day.cycle_day,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await ref.set(dayToDoc(day));
      }
    } catch (e) { console.error('uploadDay error:', e); }
  }

  async function syncAll(progressCb) {
    if (!initFB()) { progressCb('❌ 未配置'); return; }
    updateStatusUI('⏳', '同步中...');
    progressCb('🔄 拉取云端数据...');

    const uid = getUserId();
    let cloudDays = [];
    try {
      const snap = await db.collection('lifeReboot').where('userId', '==', uid).limit(1000).get();
      snap.forEach(doc => cloudDays.push(docToDay(doc)));
    } catch (e) { progressCb('❌ 拉取失败: ' + e.message); updateStatusUI('⚠️', '同步失败'); return; }

    progressCb(`🔄 云端 ${cloudDays.length} 条，开始合并...`);
    const localDays = getAllDays();
    const localMap = {};
    localDays.forEach(d => localMap[d.date] = d);

    let uploadCount = 0;
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

    Object.values(merged).forEach(d => saveDay(d.date, d));

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
    if (!initialized && !initFB()) return;
    updateStatusUI('⏳', '同步中...');
    await uploadDay(day);
    updateStatusUI('☁️', '已同步');
  }

  return { getConfig, saveConfig, initFB, updateSyncStatus, testConnection, syncAll, uploadSingle, getUserId, setUserId };
})();
