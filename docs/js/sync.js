// sync.js — Cloud Sync with Supabase Auth + Postgres
// Phase 8: Cloud Sync & Real-Time Collaboration

import { saveProject } from './storage.js';
import { showToast } from './ui.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_STORAGE_KEY = 'zeropro_supabase_config';
const SYNC_DEBOUNCE_MS     = 3000;
const SYNC_STATUS_TIMEOUT  = 5000;

/** Sync states shown in the toolbar indicator */
export const SYNC_STATES = {
  IDLE:         'idle',
  SYNCING:      'syncing',
  SYNCED:       'synced',
  OFFLINE:      'offline',
  ERROR:        'error',
  DISCONNECTED: 'disconnected',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _supabase      = null;
let _user          = null;
let _getProject    = null;
let _onProjectSync = null;
let _syncTimer     = null;
let _syncState     = SYNC_STATES.DISCONNECTED;
let _stateListeners = [];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the sync module. Call once at app boot.
 * @param {{ getProject: Function, onProjectSync: Function }} opts
 */
export function initSync({ getProject, onProjectSync }) {
  _getProject    = getProject;
  _onProjectSync = onProjectSync;

  // Listen for online/offline events
  window.addEventListener('online',  _handleOnline);
  window.addEventListener('offline', _handleOffline);

  // Set initial state based on navigator.onLine
  if (!navigator.onLine) {
    _setSyncState(SYNC_STATES.OFFLINE);
  }

  // Try to restore Supabase connection from saved config
  const config = _loadConfig();
  if (config?.url && config?.anonKey) {
    _initSupabaseClient(config.url, config.anonKey);
  }
}

/**
 * Configure the Supabase connection. Called from settings.
 * @param {string} url - Supabase project URL
 * @param {string} anonKey - Supabase anon/public key
 */
export async function configureSupabase(url, anonKey) {
  if (!url || !anonKey) return false;

  _saveConfig({ url, anonKey });
  const ok = await _initSupabaseClient(url, anonKey);
  return ok;
}

/**
 * Sign in with email (magic link).
 * @param {string} email
 * @returns {{ success: boolean, message: string }}
 */
export async function signInWithEmail(email) {
  if (!_supabase) return { success: false, message: 'Supabase not configured' };

  try {
    const { error } = await _supabase.auth.signInWithOtp({ email });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Check your email for the magic link!' };
  } catch (err) {
    return { success: false, message: err.message || 'Network error' };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!_supabase) return;
  try {
    await _supabase.auth.signOut();
  } catch { /* ignore */ }
  _user = null;
  _setSyncState(SYNC_STATES.DISCONNECTED);
  showToast('Signed out');
}

/** Get the current authenticated user (or null). */
export function getUser() {
  return _user;
}

/** Get the current sync state. */
export function getSyncState() {
  return _syncState;
}

/** Subscribe to sync state changes. Returns an unsubscribe function. */
export function onSyncStateChange(listener) {
  _stateListeners.push(listener);
  return () => {
    _stateListeners = _stateListeners.filter(l => l !== listener);
  };
}

/**
 * Push the current project to the cloud. Debounced.
 */
export function syncProjectDebounced() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(_pushProject, SYNC_DEBOUNCE_MS);
}

/**
 * Force an immediate push/pull sync.
 */
export async function syncNow() {
  await _pushProject();
}

/**
 * Pull the latest project from the cloud.
 * Returns the cloud project or null.
 */
export async function pullProject() {
  if (!_supabase || !_user) return null;

  try {
    const project = _getProject();
    const { data, error } = await _supabase
      .from('projects')
      .select('*')
      .eq('id', project.id)
      .eq('user_id', _user.id)
      .single();

    if (error || !data) return null;
    return data.data; // the project JSON is stored in a 'data' column
  } catch {
    return null;
  }
}

/**
 * List all projects stored in the cloud for the current user.
 */
export async function listCloudProjects() {
  if (!_supabase || !_user) return [];

  try {
    const { data, error } = await _supabase
      .from('projects')
      .select('id, title, updated_at')
      .eq('user_id', _user.id)
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Delete a project from the cloud.
 */
export async function deleteCloudProject(projectId) {
  if (!_supabase || !_user) return false;

  try {
    const { error } = await _supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', _user.id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Resolve a merge conflict.
 * @param {'local'|'remote'} choice
 * @param {Object} localProject
 * @param {Object} remoteProject
 */
export function resolveConflict(choice, localProject, remoteProject) {
  if (choice === 'remote') {
    _onProjectSync?.(remoteProject);
    saveProject(remoteProject);
    showToast('Remote version restored');
  } else {
    // Keep local — force push
    _forcePushProject(localProject);
    showToast('Local version kept');
  }
}

// ─── iCloud / Google Drive via File System Access API ────────────────────────

/**
 * Open a file from the local filesystem using File System Access API.
 * Works with iCloud Drive, Google Drive, and any mounted cloud storage.
 */
export async function openFromFileSystem() {
  if (!('showOpenFilePicker' in window)) {
    showToast('File System Access API not supported in this browser');
    return null;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'Zero Pro Project',
        accept: { 'application/json': ['.json'] },
      }],
    });

    const file = await handle.getFile();
    const text = await file.text();
    const project = JSON.parse(text);
    return { project, handle };
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('Could not open file');
    }
    return null;
  }
}

/**
 * Save the current project to a file using File System Access API.
 * @param {FileSystemFileHandle} [handle] - Existing handle to overwrite
 */
export async function saveToFileSystem(project, handle) {
  if (!('showSaveFilePicker' in window)) {
    showToast('File System Access API not supported in this browser');
    return null;
  }

  try {
    if (!handle) {
      handle = await window.showSaveFilePicker({
        suggestedName: `${project.title || 'project'}.json`,
        types: [{
          description: 'Zero Pro Project',
          accept: { 'application/json': ['.json'] },
        }],
      });
    }

    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(project, null, 2));
    await writable.close();
    showToast('Saved to file system');
    return handle;
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('Could not save file');
    }
    return null;
  }
}

/**
 * Open from Google Drive using the Picker API.
 * Requires a Google API key and client ID configured in settings.
 */
export async function openFromGoogleDrive(apiKey, clientId) {
  if (!apiKey || !clientId) {
    showToast('Google Drive not configured — add API key in Settings');
    return null;
  }

  // Load the Google API script dynamically
  if (!window.gapi) {
    await _loadScript('https://apis.google.com/js/api.js');
  }
  if (!window.google?.picker) {
    await _loadScript('https://apis.google.com/js/picker.js');
  }

  return new Promise((resolve) => {
    window.gapi.load('auth2', async () => {
      try {
        const auth = await window.gapi.auth2.init({ client_id: clientId, scope: 'https://www.googleapis.com/auth/drive.file' });
        const user = auth.currentUser.get();
        const token = user.getAuthResponse().access_token;

        const picker = new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.DOCS)
          .setOAuthToken(token)
          .setDeveloperKey(apiKey)
          .setCallback(async (data) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const fileId = data.docs[0].id;
              const resp = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const project = await resp.json();
              resolve(project);
            } else {
              resolve(null);
            }
          })
          .build();

        picker.setVisible(true);
      } catch {
        showToast('Google Drive authentication failed');
        resolve(null);
      }
    });
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Initialise the Supabase client from URL + anon key.
 */
async function _initSupabaseClient(url, anonKey) {
  try {
    // Dynamic import of Supabase client from CDN
    if (!window.supabase?.createClient) {
      await _loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    }

    if (!window.supabase?.createClient) {
      console.warn('Supabase SDK not available');
      return false;
    }

    _supabase = window.supabase.createClient(url, anonKey);

    // Listen for auth state changes
    _supabase.auth.onAuthStateChange((event, session) => {
      _user = session?.user ?? null;
      if (_user) {
        _setSyncState(navigator.onLine ? SYNC_STATES.SYNCED : SYNC_STATES.OFFLINE);
      } else {
        _setSyncState(SYNC_STATES.DISCONNECTED);
      }
    });

    // Check existing session
    const { data: { session } } = await _supabase.auth.getSession();
    _user = session?.user ?? null;
    if (_user) {
      _setSyncState(navigator.onLine ? SYNC_STATES.SYNCED : SYNC_STATES.OFFLINE);
    }

    return true;
  } catch (err) {
    console.warn('Supabase init failed:', err);
    return false;
  }
}

/**
 * Push the current project to Supabase.
 */
async function _pushProject() {
  if (!_supabase || !_user || !navigator.onLine) {
    if (!navigator.onLine) _setSyncState(SYNC_STATES.OFFLINE);
    return;
  }

  const project = _getProject();
  if (!project) return;

  _setSyncState(SYNC_STATES.SYNCING);

  try {
    // Check for conflicts — compare updatedAt timestamps
    const { data: existing } = await _supabase
      .from('projects')
      .select('updated_at, data')
      .eq('id', project.id)
      .eq('user_id', _user.id)
      .single();

    if (existing && existing.data?.updatedAt > project.updatedAt) {
      // Remote is newer — show conflict modal
      _showConflictModal(project, existing.data);
      _setSyncState(SYNC_STATES.ERROR);
      return;
    }

    // Upsert the project
    const { error } = await _supabase
      .from('projects')
      .upsert({
        id:         project.id,
        user_id:    _user.id,
        title:      project.title,
        data:       project,
        updated_at: new Date(project.updatedAt).toISOString(),
      }, { onConflict: 'id,user_id' });

    if (error) {
      console.error('Sync push error:', error);
      _setSyncState(SYNC_STATES.ERROR);
    } else {
      _setSyncState(SYNC_STATES.SYNCED);
    }
  } catch (err) {
    console.error('Sync push failed:', err);
    _setSyncState(SYNC_STATES.ERROR);
  }
}

/**
 * Force-push the local project (ignoring conflicts).
 */
async function _forcePushProject(project) {
  if (!_supabase || !_user) return;

  _setSyncState(SYNC_STATES.SYNCING);

  try {
    const { error } = await _supabase
      .from('projects')
      .upsert({
        id:         project.id,
        user_id:    _user.id,
        title:      project.title,
        data:       project,
        updated_at: new Date(project.updatedAt).toISOString(),
      }, { onConflict: 'id,user_id' });

    _setSyncState(error ? SYNC_STATES.ERROR : SYNC_STATES.SYNCED);
  } catch {
    _setSyncState(SYNC_STATES.ERROR);
  }
}

/**
 * Show a merge conflict resolution modal.
 */
function _showConflictModal(localProject, remoteProject) {
  const localDate  = new Date(localProject.updatedAt).toLocaleString();
  const remoteDate = new Date(remoteProject.updatedAt).toLocaleString();
  const localDocs  = localProject.documents?.filter(d => !d.inTrash).length || 0;
  const remoteDocs = remoteProject.documents?.filter(d => !d.inTrash).length || 0;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-heading">
      <h3 id="conflict-heading">Sync Conflict</h3>
      <p>The cloud version of this project is newer than your local copy. Which version would you like to keep?</p>
      <div class="conflict-options">
        <button class="conflict-option" id="conflict-keep-local">
          <strong>Keep Local</strong>
          <span class="conflict-meta">${localDocs} docs &middot; ${localDate}</span>
        </button>
        <button class="conflict-option" id="conflict-keep-remote">
          <strong>Keep Remote</strong>
          <span class="conflict-meta">${remoteDocs} docs &middot; ${remoteDate}</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector('#conflict-keep-local')?.addEventListener('click', () => {
    document.body.removeChild(backdrop);
    resolveConflict('local', localProject, remoteProject);
  });

  backdrop.querySelector('#conflict-keep-remote')?.addEventListener('click', () => {
    document.body.removeChild(backdrop);
    resolveConflict('remote', localProject, remoteProject);
  });
}

// ─── Sync State Management ──────────────────────────────────────────────────

function _setSyncState(state) {
  if (_syncState === state) return;
  _syncState = state;
  _stateListeners.forEach(l => l(state));
  _updateSyncIndicator(state);
}

function _updateSyncIndicator(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;

  const labels = {
    [SYNC_STATES.IDLE]:         'Idle',
    [SYNC_STATES.SYNCING]:      'Syncing\u2026',
    [SYNC_STATES.SYNCED]:       'Synced',
    [SYNC_STATES.OFFLINE]:      'Offline',
    [SYNC_STATES.ERROR]:        'Sync error',
    [SYNC_STATES.DISCONNECTED]: 'Not connected',
  };

  el.textContent = labels[state] || '';
  el.dataset.state = state;
  el.title = labels[state] || '';
}

// ─── Online/Offline Handlers ─────────────────────────────────────────────────

function _handleOnline() {
  if (_user) {
    _setSyncState(SYNC_STATES.SYNCED);
    // Flush any queued changes
    _pushProject();
  }
}

function _handleOffline() {
  _setSyncState(SYNC_STATES.OFFLINE);
}

// ─── Config Persistence ──────────────────────────────────────────────────────

function _loadConfig() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _saveConfig(config) {
  try {
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

export function clearConfig() {
  localStorage.removeItem(SUPABASE_STORAGE_KEY);
  _supabase = null;
  _user = null;
  _setSyncState(SYNC_STATES.DISCONNECTED);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }

    const script = document.createElement('script');
    script.src = src;
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
