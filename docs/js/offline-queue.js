// offline-queue.js — IndexedDB offline write queue
// Phase 8: Offline-First Architecture

import { showToast } from './ui.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME    = 'zeropro_offline';
const DB_VERSION = 1;
const STORE_NAME = 'write_queue';
const FLUSH_BATCH_SIZE = 20;

// ─── State ────────────────────────────────────────────────────────────────────

let _db              = null;
let _isOnline        = navigator.onLine;
let _flushInProgress = false;
let _onFlush         = null;
let _statusListeners = [];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the offline queue. Opens the IndexedDB database.
 * @param {{ onFlush: (entries: Object[]) => Promise<void> }} opts
 */
export async function initOfflineQueue({ onFlush } = {}) {
  _onFlush = onFlush;

  try {
    _db = await _openDB();
  } catch (err) {
    console.warn('IndexedDB not available, offline queue disabled:', err);
  }

  // Listen for online/offline transitions
  window.addEventListener('online',  _handleOnline);
  window.addEventListener('offline', _handleOffline);

  _isOnline = navigator.onLine;
  _notifyStatus();

  // If we're online, flush any queued writes from a previous session
  if (_isOnline && _db) {
    _flushQueue();
  }
}

/**
 * Get the current online/offline status.
 * @returns {boolean}
 */
export function isOnline() {
  return _isOnline;
}

/**
 * Subscribe to online/offline status changes.
 * @param {Function} listener - Called with { online: boolean, queueSize: number }
 * @returns {Function} Unsubscribe function
 */
export function onStatusChange(listener) {
  _statusListeners.push(listener);
  return () => {
    _statusListeners = _statusListeners.filter(l => l !== listener);
  };
}

/**
 * Queue a write operation. If online, it will be processed immediately.
 * If offline, it will be stored in IndexedDB and flushed on reconnect.
 * @param {Object} entry - The write payload
 * @param {string} entry.type - Write type ('project_save' | 'doc_update' | 'sync_push')
 * @param {Object} entry.data - The data to write
 */
export async function enqueue(entry) {
  if (!_db) return;

  const record = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type: entry.type,
    data: entry.data,
    createdAt: Date.now(),
    retries: 0,
  };

  try {
    const tx = _db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(record);
    await _txComplete(tx);
  } catch (err) {
    console.warn('Failed to enqueue write:', err);
  }

  // If online, try to flush immediately
  if (_isOnline) {
    _flushQueue();
  }
}

/**
 * Get the number of pending writes in the queue.
 * @returns {Promise<number>}
 */
export async function getQueueSize() {
  if (!_db) return 0;

  try {
    const tx = _db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const count = store.count();
    return new Promise((resolve) => {
      count.onsuccess = () => resolve(count.result);
      count.onerror   = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Clear all queued writes.
 */
export async function clearQueue() {
  if (!_db) return;

  try {
    const tx = _db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await _txComplete(tx);
  } catch (err) {
    console.warn('Failed to clear queue:', err);
  }
}

/**
 * Force a flush of the queue (even if online).
 */
export async function forceFlush() {
  await _flushQueue();
}

// ─── IndexedDB Setup ─────────────────────────────────────────────────────────

function _openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror   = (event) => reject(event.target.error);
  });
}

// ─── Queue Flushing ──────────────────────────────────────────────────────────

async function _flushQueue() {
  if (_flushInProgress || !_db || !_isOnline) return;
  _flushInProgress = true;

  try {
    const entries = await _getAllEntries();
    if (entries.length === 0) {
      _flushInProgress = false;
      return;
    }

    // Process in batches
    for (let i = 0; i < entries.length; i += FLUSH_BATCH_SIZE) {
      const batch = entries.slice(i, i + FLUSH_BATCH_SIZE);

      if (_onFlush) {
        try {
          await _onFlush(batch);
          // Remove successfully flushed entries
          await _removeEntries(batch.map(e => e.id));
        } catch (err) {
          console.warn('Flush batch failed:', err);
          // Increment retry count
          for (const entry of batch) {
            entry.retries++;
            if (entry.retries >= 5) {
              // Drop entries that have failed too many times
              await _removeEntries([entry.id]);
            }
          }
          break; // Stop flushing on error
        }
      } else {
        // No flush handler — just clear the queue
        await _removeEntries(batch.map(e => e.id));
      }
    }

    const remaining = await getQueueSize();
    if (remaining > 0) {
      showToast(`${remaining} pending writes queued`);
    }
  } finally {
    _flushInProgress = false;
    _notifyStatus();
  }
}

async function _getAllEntries() {
  if (!_db) return [];

  return new Promise((resolve) => {
    try {
      const tx = _db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function _removeEntries(ids) {
  if (!_db || ids.length === 0) return;

  try {
    const tx = _db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    await _txComplete(tx);
  } catch (err) {
    console.warn('Failed to remove queue entries:', err);
  }
}

function _txComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

// ─── Online/Offline Handlers ─────────────────────────────────────────────────

function _handleOnline() {
  _isOnline = true;
  _notifyStatus();
  showToast('Back online');

  // Flush queued writes
  _flushQueue();
}

function _handleOffline() {
  _isOnline = false;
  _notifyStatus();
  showToast('Working offline \u2014 changes will sync when reconnected');
}

async function _notifyStatus() {
  const queueSize = await getQueueSize();
  _statusListeners.forEach(l => l({
    online: _isOnline,
    queueSize,
  }));

  // Update the offline indicator in the UI
  _updateOfflineIndicator();
}

function _updateOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  if (!indicator) return;

  if (_isOnline) {
    indicator.classList.add('hidden');
  } else {
    indicator.classList.remove('hidden');
  }
}
