// sync.js — Cloud sync module (Phase 8)
// Provides sync status UI and Supabase integration hooks.
// Without a Supabase URL/key the module operates in "local-only" mode —
// all writes go to localStorage and the indicator shows "Local".

import { showToast } from './ui.js';

// ─── Config ───────────────────────────────────────────────────────────────────

// Filled by the user in Settings → Sync once a Supabase project is set up.
let _supabaseUrl  = localStorage.getItem('zp_supabase_url')  || '';
let _supabaseKey  = localStorage.getItem('zp_supabase_key')  || '';
let _userId       = localStorage.getItem('zp_user_id')       || '';
let _userEmail    = localStorage.getItem('zp_user_email')    || '';

// ─── State ────────────────────────────────────────────────────────────────────

// 'local' | 'synced' | 'syncing' | 'offline' | 'error'
let _status       = navigator.onLine ? 'local' : 'offline';
let _onStatusChange = null;
let _saveProject  = null;   // injected getter → current project JSON string

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the sync module.
 * @param {{ getProjectJson: () => string, onStatusChange: (status: string) => void }} opts
 */
export function initSync({ getProjectJson, onStatusChange }) {
  _saveProject    = getProjectJson;
  _onStatusChange = onStatusChange;

  // Respond to connectivity changes
  window.addEventListener('online',  _handleOnline);
  window.addEventListener('offline', _handleOffline);

  // Listen for FLUSH_QUEUE messages from the service worker
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'FLUSH_QUEUE') _flushQueue();
  });

  _setStatus(_status);
}

/** True when the user has configured a Supabase backend. */
export function isSyncEnabled() {
  return Boolean(_supabaseUrl && _supabaseKey && _userId);
}

/** Current user email, or empty string if not signed in. */
export function getCurrentUserEmail() { return _userEmail; }
export function getCurrentUserId()    { return _userId; }

/**
 * Push the current project to Supabase (no-op in local-only mode).
 * Queues the write if offline.
 */
export async function pushProject(projectJson) {
  if (!isSyncEnabled()) return;
  if (!navigator.onLine) {
    await _enqueue(projectJson);
    return;
  }
  await _doSync(projectJson);
}

/**
 * Open the Sync settings panel (sign-in / sign-out / status).
 */
export function openSyncPanel() {
  _renderSyncModal();
}

// ─── Sign-in / Sign-out ───────────────────────────────────────────────────────

/**
 * Simulate magic-link sign-in.
 * In production: POST to Supabase auth/v1/magiclink endpoint.
 */
export async function requestMagicLink(email) {
  if (!_supabaseUrl || !_supabaseKey) {
    showToast('Configure Supabase URL and key first');
    return false;
  }

  _setStatus('syncing');

  try {
    const res = await fetch(`${_supabaseUrl}/auth/v1/magiclink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _supabaseKey,
      },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      showToast(`Magic link sent to ${email} — check your inbox`);
      _setStatus('local');
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    // In demo / local mode: simulate success so the UI works
    if (!_supabaseUrl.startsWith('https://')) {
      showToast(`[Demo] Magic link sent to ${email}`);
      _userEmail = email;
      _userId    = `demo-${email}`;
      localStorage.setItem('zp_user_email', email);
      localStorage.setItem('zp_user_id',    _userId);
      _setStatus('synced');
      return true;
    }
    showToast(`Could not send magic link: ${err.message}`);
    _setStatus('error');
    return false;
  }
}

/** Sign out — clears credentials from localStorage. */
export function signOut() {
  _userEmail = '';
  _userId    = '';
  localStorage.removeItem('zp_user_email');
  localStorage.removeItem('zp_user_id');
  _setStatus('local');
  showToast('Signed out');
  _closeSyncModal();
}

/** Save Supabase connection details. */
export function saveSupabaseConfig(url, key) {
  _supabaseUrl = url.trim();
  _supabaseKey = key.trim();
  localStorage.setItem('zp_supabase_url', _supabaseUrl);
  localStorage.setItem('zp_supabase_key', _supabaseKey);
  showToast('Supabase config saved');
}

// ─── Internal sync ────────────────────────────────────────────────────────────

async function _doSync(projectJson) {
  if (!isSyncEnabled()) return;
  _setStatus('syncing');
  try {
    const res = await fetch(
      `${_supabaseUrl}/rest/v1/projects?user_id=eq.${_userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        _supabaseKey,
          'Authorization': `Bearer ${_supabaseKey}`,
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: _userId,
          data:    projectJson,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (res.ok) {
      _setStatus('synced');
      localStorage.setItem('zp_last_sync', new Date().toISOString());
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    // Demo / local fallback
    if (!_supabaseUrl.startsWith('https://')) {
      _setStatus('synced');
      localStorage.setItem('zp_last_sync', new Date().toISOString());
      return;
    }
    console.warn('Sync failed:', err);
    _setStatus('error');
    await _enqueue(projectJson);
  }
}

// ─── Offline queue ────────────────────────────────────────────────────────────

async function _enqueue(projectJson) {
  try {
    const { enqueueWrite } = await import('./offline-queue.js');
    await enqueueWrite({ type: 'project', data: projectJson, ts: Date.now() });
    _setStatus('offline');
    // Register background sync if supported
    const reg = await navigator.serviceWorker?.ready;
    reg?.sync?.register('zeropro-sync').catch(() => {});
  } catch {
    // offline-queue not available
  }
}

async function _flushQueue() {
  try {
    const { flushQueue } = await import('./offline-queue.js');
    const items = await flushQueue();
    for (const item of items) {
      if (item.type === 'project') {
        await _doSync(item.data);
      }
    }
  } catch {
    // Queue empty or unavailable
  }
}

// ─── Connectivity handlers ────────────────────────────────────────────────────

function _handleOnline() {
  _setStatus(isSyncEnabled() ? 'synced' : 'local');
  _flushQueue();
  showToast('Back online');
}

function _handleOffline() {
  _setStatus('offline');
}

function _setStatus(s) {
  _status = s;
  _onStatusChange?.(s);
  _updateStatusPill(s);
}

// ─── Sync status pill ─────────────────────────────────────────────────────────

function _updateStatusPill(status) {
  const pill = document.getElementById('sync-status-pill');
  if (!pill) return;

  const labels = {
    local:   'Local',
    synced:  'Synced',
    syncing: 'Syncing…',
    offline: 'Offline',
    error:   'Sync Error',
  };
  const icons = {
    local:   '💾',
    synced:  '☁️',
    syncing: '↻',
    offline: '⚡',
    error:   '⚠',
  };

  pill.textContent = `${icons[status] ?? ''} ${labels[status] ?? status}`;
  pill.dataset.status = status;
}

// ─── Sync settings modal ──────────────────────────────────────────────────────

function _renderSyncModal() {
  const existing = document.getElementById('sync-modal-backdrop');
  if (existing) {
    existing.classList.remove('hidden');
    return;
  }

  const isSignedIn  = Boolean(_userId);
  const lastSync    = localStorage.getItem('zp_last_sync');
  const lastSyncStr = lastSync
    ? new Date(lastSync).toLocaleString()
    : 'Never';

  const backdrop = document.createElement('div');
  backdrop.id        = 'sync-modal-backdrop';
  backdrop.className = 'modal-backdrop phase8-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-label', 'Sync Settings');

  backdrop.innerHTML = `
    <div class="modal phase8-modal" role="document">
      <div class="phase8-modal-header">
        <h2>☁️ Cloud Sync</h2>
        <button class="btn btn-icon" id="btn-sync-modal-close" aria-label="Close">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
        </button>
      </div>
      <div class="phase8-modal-body">
        ${isSignedIn ? _syncSignedInHtml(lastSyncStr) : _syncSignedOutHtml()}
      </div>
    </div>`;

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) _closeSyncModal();
  });

  document.body.appendChild(backdrop);
  document.getElementById('btn-sync-modal-close')?.addEventListener('click', _closeSyncModal);

  if (isSignedIn) {
    document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
      if (_saveProject) {
        await pushProject(_saveProject());
        showToast('Project synced');
      }
    });
    document.getElementById('btn-sync-signout')?.addEventListener('click', signOut);
  } else {
    document.getElementById('sync-magic-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('sync-email-input')?.value.trim();
      if (email) await requestMagicLink(email);
    });

    document.getElementById('btn-save-supabase')?.addEventListener('click', () => {
      const url = document.getElementById('supabase-url-input')?.value.trim();
      const key = document.getElementById('supabase-key-input')?.value.trim();
      if (url && key) saveSupabaseConfig(url, key);
    });
  }

  document.addEventListener('keydown', _syncEscape);
}

function _syncSignedInHtml(lastSyncStr) {
  return `
    <div class="sync-signed-in">
      <div class="sync-account-row">
        <div class="sync-avatar">${_userEmail[0]?.toUpperCase() ?? '?'}</div>
        <div>
          <div class="sync-email">${_userEmail}</div>
          <div class="sync-last-sync">Last synced: ${lastSyncStr}</div>
        </div>
      </div>
      <div class="sync-status-row" data-status="${_status}">
        Status: <strong>${_status}</strong>
      </div>
      <div class="phase8-modal-actions">
        <button class="btn btn-primary" id="btn-sync-now">Sync Now</button>
        <button class="btn" id="btn-sync-signout">Sign Out</button>
      </div>
    </div>`;
}

function _syncSignedOutHtml() {
  return `
    <p class="sync-intro">Sign in to sync your projects across devices. We'll send a magic link — no password needed.</p>

    <form class="sync-magic-form" id="sync-magic-form">
      <label class="phase8-label" for="sync-email-input">Email address</label>
      <input class="phase8-input" id="sync-email-input" type="email"
             placeholder="you@example.com" autocomplete="email" required>
      <button class="btn btn-primary" type="submit">Send Magic Link</button>
    </form>

    <details class="sync-advanced">
      <summary>Advanced — Supabase configuration</summary>
      <label class="phase8-label" for="supabase-url-input">Project URL</label>
      <input class="phase8-input" id="supabase-url-input" type="url"
             placeholder="https://xxxx.supabase.co"
             value="${_supabaseUrl}">
      <label class="phase8-label" for="supabase-key-input">Anon / public key</label>
      <input class="phase8-input" id="supabase-key-input" type="text"
             placeholder="eyJ..." value="${_supabaseKey}">
      <button class="btn" id="btn-save-supabase">Save Config</button>
    </details>`;
}

function _closeSyncModal() {
  document.getElementById('sync-modal-backdrop')?.classList.add('hidden');
  document.removeEventListener('keydown', _syncEscape);
}

function _syncEscape(e) {
  if (e.key === 'Escape') _closeSyncModal();
}
