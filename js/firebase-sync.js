// Firebase Firestore Sync Module for 重启系统 v2
// Features: auto-sync, real-time listener (onSnapshot), Last Write Wins, network recovery
const FBSync = (() => {
  let db = null;
  let initialized = false;
  let snapshotUnsub = null; // onSnapshot unsubscribe
  let isSyncing = false;
  let lastSyncTime = null;
  let retryTimer = null;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  function getConfig() {
    const saved = JSON.parse(localStorage.getItem('firebase_config') || '{}');
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

  const OLD_HARDCODED_ID = 'u_1775548112859_cxd269';
  const STORAGE_KEY = 'lr_user_id';

  function generateUserId() {
    const ts = Date.now();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return 'u_' + ts + '_' + rand;
  }

  function getUserId() {
    let uid = localStorage.getItem(STORAGE_KEY);
    if (!uid) {
      uid = localStorage.getItem('fb_user_id') || generateUserId();
      localStorage.setItem(STORAGE_KEY, uid);
    }
    return uid;
  }

  function getOldUserId() {
    return localStorage.getItem('fb_user_id') || OLD_HARDCODED_ID;
  }

  function setUserId(uid) {
    if (uid && uid.trim()) {
      localStorage.setItem(STORAGE_KEY, uid.trim());
      // Restart listener with new user ID
      stopListener();
      startListener();
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
      // Enable offline persistence
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); // Silently ignore persistence errors on mobile
      initialized = true;
      return true;
    } catch (e) {
      console.error('Firebase init failed:', e);
      return false;
    }
  }

  // --- Status UI ---
  function updateStatusUI(icon, text) {
    const el = document.getElementById('sync-status');
    if (el) { el.textContent = icon; el.title = text; }
  }

  function updateSyncPageStatus(icon, text) {
    const el = document.getElementById('sync-connection-status');
    if (!el) return;
    el.style.display = 'block';
    if (icon === '✅' || icon === '☁️') {
      el.style.background = 'rgba(100,200,100,0.1)';
      el.style.color = 'var(--done)';
    } else if (icon === '❌') {
      el.style.background = 'rgba(255,100,100,0.1)';
      el.style.color = 'var(--none)';
    } else {
      el.style.background = 'rgba(255,200,100,0.1)';
      el.style.color = 'var(--warn)';
    }
    const timeStr = lastSyncTime ? ' · 最后同步: ' + new Date(lastSyncTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = icon + ' ' + text + timeStr;
  }

  function updateSyncStatus() {
    const cfg = getConfig();
    if (!cfg.apiKey || !cfg.projectId) {
      updateStatusUI('❌', '未配置云同步');
      updateSyncPageStatus('❌', '未配置');
      return;
    }
    if (!initialized && !initFB()) {
      updateStatusUI('⚠️', '同步异常');
      updateSyncPageStatus('⚠️', '初始化失败');
      return;
    }
    updateStatusUI('☁️', '已配置');
    updateSyncPageStatus('✅', '已连接');
  }

  // --- Collect all local data ---
  function collectAllLocalData() {
    const uid = getUserId();
    const now = Date.now();
    const result = {};

    // Snapshot all keys first to avoid mutation during iteration
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }

    // Day data (lr_20*)
    for (const k of allKeys) {
      if (!k.startsWith('lr_20')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        const date = k.slice(3);
        result['day_' + date] = { type: 'day', key: k, date, data, updatedAt: data._syncTs || now };
      } catch {}
    }

    // Plan data (lr_plan_P*)
    for (const k of allKeys) {
      const m = k.match(/^lr_plan_(P\d+)$/);
      if (!m) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        result['plan_' + m[1]] = { type: 'plan', key: k, cycle: m[1], data, updatedAt: data._syncTs || now };
      } catch {}
    }

    // Weekly review (lr_review_W*)
    for (const k of allKeys) {
      const m = k.match(/^lr_review_(W\d+-\d+)$/);
      if (!m) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        result['review_' + m[1]] = { type: 'review', key: k, week: m[1], data, updatedAt: data._syncTs || now };
      } catch {}
    }

    // Cycle review (lr_review_cycle_P*)
    for (const k of allKeys) {
      const m = k.match(/^lr_review_cycle_(P\d+)$/);
      if (!m) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        result['cycle_review_' + m[1]] = { type: 'cycle_review', key: k, cycle: m[1], data, updatedAt: data._syncTs || now };
      } catch {}
    }

    // activeCycle
    const ac = localStorage.getItem('lr_active_cycle');
    if (ac) {
      result['active_cycle'] = { type: 'active_cycle', key: 'lr_active_cycle', data: ac, updatedAt: parseInt(localStorage.getItem('lr_active_cycle_ts') || String(now)) };
    }

    return result;
  }

  function stampLocal(key, ts) {
    // Add _syncTs to local data for LWW
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const obj = JSON.parse(raw);
      obj._syncTs = ts;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {}
  }

  // --- Upload all data ---
  async function uploadAll(silent) {
    if (!initFB()) return false;
    if (isSyncing) return true;
    isSyncing = true;

    if (!silent) { updateStatusUI('⏳', '同步中...'); updateSyncPageStatus('⏳', '同步中...'); }

    try {
      const uid = getUserId();
      const localData = collectAllLocalData();
      const batch = db.batch();

      // Get current cloud doc
      const docRef = db.collection('lifeReboot').doc(uid + '_sync');
      const docSnap = await docRef.get();
      const cloudData = docSnap.exists ? (docSnap.data().items || {}) : {};

      let changed = false;
      const now = Date.now();

      // Upload local items that are newer or missing in cloud
      Object.entries(localData).forEach(([id, item]) => {
        const cloudItem = cloudData[id];
        const localTs = item.updatedAt;
        const cloudTs = cloudItem?.updatedAt?.toMillis ? cloudItem.updatedAt.toMillis() : (cloudItem?.updatedAt || 0);

        if (localTs > cloudTs) {
          batch.set(docRef, { items: { [id]: { ...item, updatedAt: firebase.firestore.FieldValue.serverTimestamp() } } }, { merge: true });
          changed = true;
        }
      });

      // Pull cloud items that are newer or missing locally
      if (docSnap.exists) {
        Object.entries(cloudData).forEach(([id, cloudItem]) => {
          const localItem = localData[id];
          const cloudTs = cloudItem.updatedAt?.toMillis ? cloudItem.updatedAt.toMillis() : (cloudItem.updatedAt || 0);
          const localTs = localItem?.updatedAt || 0;

          if (cloudTs > localTs) {
            applyCloudItem(id, cloudItem);
            changed = true;
          }
        });
      }

      if (changed) await batch.commit();

      lastSyncTime = Date.now();
      if (!silent) {
        updateStatusUI('☁️', '已同步');
        updateSyncPageStatus('✅', '已同步');
      }
      return true;
    } catch (e) {
      const msg = (e.message || '').toLowerCase();
      const isOfflineErr = msg.includes('offline') || msg.includes('network');
      if (isOfflineErr) {
        // Don't scare user - retry silently after 10s
        updateStatusUI('📴', '等待网络');
        updateSyncPageStatus('📴', '网络不稳定，将自动重试');
        setTimeout(() => uploadAll(silent), 10000);
      } else if (!silent) {
        console.error('uploadAll error:', e);
        updateStatusUI('⚠️', '同步失败');
        updateSyncPageStatus('⚠️', '同步失败: ' + (e.message || ''));
      }
      return false;
    } finally {
      isSyncing = false;
    }
  }

  function applyCloudItem(id, cloudItem) {
    const ts = cloudItem.updatedAt?.toMillis ? cloudItem.updatedAt.toMillis() : (cloudItem.updatedAt || Date.now());
    const data = cloudItem.data;
    const type = cloudItem.type;

    if (type === 'day') {
      saveDay(cloudItem.date, { ...data, _syncTs: ts });
    } else if (type === 'plan') {
      const obj = { ...data, _syncTs: ts };
      localStorage.setItem(cloudItem.key, JSON.stringify(obj));
    } else if (type === 'review' || type === 'cycle_review') {
      const obj = { ...data, _syncTs: ts };
      localStorage.setItem(cloudItem.key, JSON.stringify(obj));
    } else if (type === 'active_cycle') {
      localStorage.setItem(cloudItem.key, data);
      localStorage.setItem('lr_active_cycle_ts', String(ts));
    }
  }

  // Re-export saveDay/getAllDays for module use
  function saveDay(d, data) { localStorage.setItem('lr_' + d, JSON.stringify(data)); }
  function getAllDays() {
    const days = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('lr_20')) { try { days.push(JSON.parse(localStorage.getItem(k))); } catch {} }
    }
    return days.sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- Auto sync trigger (called after any local data change) ---
  async function autoSync() {
    if (!initFB()) return;
    await uploadAll(true);
  }

  // Force pull all data from cloud (overwrite local)
  async function forcePullFromCloud() {
    if (!initFB()) throw new Error('Firebase not initialized');
    const uid = getUserId();
    const docRef = db.collection('lifeReboot').doc(uid + '_sync');
    // Use {source: 'server'} to bypass cache
    const docSnap = await docRef.get({ source: 'server' });
    if (!docSnap.exists) throw new Error('No cloud data found');
    const cloudItems = docSnap.data().items || {};
    let count = 0;
    Object.entries(cloudItems).forEach(([id, item]) => {
      applyCloudItem(id, item);
      count++;
    });
    lastSyncTime = Date.now();
    updateStatusUI('✅', '已同步');
    updateSyncPageStatus('✅', '已从云端拉取 ' + count + ' 条');
    return count;
  }

  // Convenience: sync a single item quickly
  async function syncItem(storageKey) {
    if (!initFB()) return;
    const now = Date.now();
    stampLocal(storageKey, now);
    try {
      await uploadAll(true);
    } catch (e) {
      console.error('syncItem error:', e);
    }
  }

  // --- Real-time listener (onSnapshot) ---
  let _listening = false;

  function startListener() {
    if (!initFB()) return;
    if (_listening) return;
    stopListener(); // clean up existing

    const uid = getUserId();
    const docRef = db.collection('lifeReboot').doc(uid + '_sync');

    _listening = true;
    snapshotUnsub = docRef.onSnapshot(
      (doc) => {
        if (!doc.exists) return;
        const cloudItems = doc.data().items || {};
        const localData = collectAllLocalData();
        let changed = false;

        Object.entries(cloudItems).forEach(([id, cloudItem]) => {
          const localItem = localData[id];
          const cloudTs = cloudItem.updatedAt?.toMillis ? cloudItem.updatedAt.toMillis() : (cloudItem.updatedAt || 0);
          const localTs = localItem?.updatedAt || 0;

          if (cloudTs > localTs + 1000) { // 1s tolerance to avoid self-trigger
            applyCloudItem(id, cloudItem);
            changed = true;
          }
        });

        if (changed) {
          lastSyncTime = Date.now();
          console.log('[FBSync] Remote update received, page refreshed');
          // Re-render current page
          if (typeof renderCheckin === 'function' && currentPage === 'checkin') renderCheckin();
          if (typeof renderReview === 'function' && currentPage === 'review') renderReview();
          if (typeof renderPlanning === 'function' && currentPage === 'planning') renderPlanning();
          updateStatusUI('☁️', '已同步');
          updateSyncPageStatus('✅', '已同步');
        }
      },
      (error) => {
        console.warn('[FBSync] Snapshot listener error:', error);
      }
    );
  }

  function stopListener() {
    if (snapshotUnsub) {
      snapshotUnsub();
      snapshotUnsub = null;
    }
    _listening = false;
  }

  // --- Network recovery ---
  function setupNetworkListener() {
    window.addEventListener('online', () => {
      console.log('[FBSync] Network online, triggering sync');
      updateStatusUI('⏳', '网络恢复，同步中...');
      autoSync();
    });
    window.addEventListener('offline', () => {
      updateStatusUI('📴', '离线');
      updateSyncPageStatus('❌', '离线');
    });
  }

  // --- Test connection ---
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

  // --- Legacy full sync (manual button) ---
  async function syncAll(progressCb) {
    updateStatusUI('⏳', '同步中...');
    updateSyncPageStatus('⏳', '同步中...');
    progressCb('🔄 开始同步...');

    const ok = await uploadAll(false);

    if (ok) {
      progressCb('✅ 同步完成！');
      if (typeof renderCheckin === 'function') renderCheckin();
    } else {
      progressCb('❌ 同步失败，请检查网络或配置');
    }
  }

  // --- Init (call on DOMContentLoaded) ---
  function init() {
    if (!initFB()) { updateSyncStatus(); return; }
    updateSyncStatus();
    setupNetworkListener();
    // Initial sync then start listener
    autoSync().then(() => {
      startListener();
    });
  }

  return {
    getConfig, saveConfig, initFB, updateSyncStatus, testConnection,
    syncAll, uploadSingle: () => autoSync(), // backward compat
    getUserId, setUserId, autoSync, syncItem, forcePullFromCloud, startListener, stopListener, init,
  };
})();
