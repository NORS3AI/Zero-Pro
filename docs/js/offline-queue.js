// offline-queue.js — IndexedDB-backed write queue (Phase 8)
// Accumulates writes when the user is offline and flushes them on reconnect.

const DB_NAME    = 'zeropro-offline';
const STORE_NAME = 'write-queue';
const DB_VERSION = 1;

let _db = null;

// ─── DB Init ──────────────────────────────────────────────────────────────────

/** Open (or create) the IndexedDB database. */
async function _openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db    = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath:       'id',
          autoIncrement: true,
        });
      }
    };

    req.onsuccess = e => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a write operation to the queue.
 * @param {{ type: string, data: any, ts: number }} item
 */
export async function enqueueWrite(item) {
  try {
    const db    = await _openDB();
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback: store in sessionStorage if IndexedDB is unavailable
    try {
      const queue = JSON.parse(sessionStorage.getItem('zp_offline_queue') || '[]');
      queue.push(item);
      sessionStorage.setItem('zp_offline_queue', JSON.stringify(queue));
    } catch { /* ignore */ }
  }
}

/**
 * Read all queued items and remove them from the store.
 * @returns {Promise<Array>}
 */
export async function flushQueue() {
  try {
    const db    = await _openDB();
    const items = await _getAll(db);
    if (items.length > 0) await _clearAll(db);
    return items;
  } catch {
    // Fallback: drain sessionStorage
    try {
      const queue = JSON.parse(sessionStorage.getItem('zp_offline_queue') || '[]');
      sessionStorage.removeItem('zp_offline_queue');
      return queue;
    } catch {
      return [];
    }
  }
}

/** Return the number of queued items. */
export async function queueLength() {
  try {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    try {
      return JSON.parse(sessionStorage.getItem('zp_offline_queue') || '[]').length;
    } catch {
      return 0;
    }
  }
}

/** Wipe the queue without processing items (e.g. after a hard reset). */
export async function clearQueue() {
  try {
    const db = await _openDB();
    await _clearAll(db);
  } catch { /* ignore */ }
  sessionStorage.removeItem('zp_offline_queue');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _getAll(db) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function _clearAll(db) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.clear();
    req.onsuccess = resolve;
    req.onerror   = () => reject(req.error);
  });
}

// ─── Auto-flush on connectivity restored ──────────────────────────────────────

// The actual flush is triggered by sync.js — this module is pure storage.
// We expose a ready-check helper so sync.js can drain on startup.

/** True when navigator reports online and there are pending writes. */
export async function hasPendingWrites() {
  if (!navigator.onLine) return false;
  return (await queueLength()) > 0;
}
