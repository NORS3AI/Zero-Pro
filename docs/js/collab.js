// collab.js — Real-time collaboration module (Phase 8)
// Provides room-token sharing, presence indicators, and collab UI.
// Designed to connect to a Yjs WebSocket provider (y-websocket) when a
// backend is available. Falls back gracefully with no errors.

import { showToast } from './ui.js';
import { getCurrentUserId, getCurrentUserEmail } from './sync.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _roomToken   = localStorage.getItem('zp_collab_room') || '';
let _collaborators = [];     // [{ id, name, color, lastSeen }]
let _wsProvider  = null;     // WebSocket provider (Yjs / plain WS)
let _onPresenceChange = null;
let _typingTimer = null;
let _isTyping    = false;

const COLORS = [
  '#e06c75', '#e5c07b', '#98c379', '#56b6c2',
  '#61afef', '#c678dd', '#d19a66', '#abb2bf',
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the collaboration module.
 * @param {{ onPresenceChange: (collaborators: Array) => void }} opts
 */
export function initCollab({ onPresenceChange } = {}) {
  _onPresenceChange = onPresenceChange;

  // Auto-join if a room token is in the URL hash
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('room=')) {
    const token = hash.slice(5);
    if (token) _joinRoom(token);
  }

  // Relay service worker messages
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'COLLAB_PRESENCE') {
      _handlePresenceUpdate(e.data.payload);
    }
  });
}

/** Open the share / collaboration panel. */
export function openCollabPanel() {
  _renderCollabModal();
}

/** Notify collaborators that the local user is typing. */
export function notifyTyping() {
  if (!_wsProvider || !_roomToken) return;
  if (!_isTyping) {
    _isTyping = true;
    _broadcast({ type: 'typing', userId: _myId(), email: _myEmail() });
  }
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(() => {
    _isTyping = false;
    _broadcast({ type: 'idle', userId: _myId() });
  }, 2000);
}

/** Return current collaborator list. */
export function getCollaborators() { return [..._collaborators]; }

/** True when currently in a collab room (token exists, even without live WS). */
export function isInRoom() { return Boolean(_roomToken); }

// ─── Room management ─────────────────────────────────────────────────────────

function _generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => chars[b % chars.length]).join('');
}

function _joinRoom(token) {
  _roomToken = token;
  localStorage.setItem('zp_collab_room', token);
  _connectWS(token);
}

function _leaveRoom() {
  _wsProvider?.close?.();
  _wsProvider = null;
  _roomToken  = '';
  _collaborators = [];
  localStorage.removeItem('zp_collab_room');
  _onPresenceChange?.([]);
  _updateCollabAvatars([]);
}

function _connectWS(token) {
  // Determine WebSocket endpoint.
  // In production: set zp_ws_url in localStorage, e.g. "wss://myapp.fly.dev"
  const wsBase = localStorage.getItem('zp_ws_url') || '';
  if (!wsBase) {
    // No backend configured — show presence UI with just the local user.
    _collaborators = [{
      id:       _myId(),
      name:     _myEmail() || 'You',
      color:    COLORS[0],
      lastSeen: Date.now(),
      isLocal:  true,
    }];
    _onPresenceChange?.(_collaborators);
    _updateCollabAvatars(_collaborators);
    return;
  }

  try {
    const ws = new WebSocket(`${wsBase}/collab/${token}`);
    _wsProvider = ws;

    ws.onopen = () => {
      _broadcast({ type: 'join', userId: _myId(), email: _myEmail() });
      showToast('Joined collab room');
    };

    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        _handlePresenceUpdate(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onerror = () => {
      showToast('Collab connection failed — working locally');
      _wsProvider = null;
    };

    ws.onclose = () => {
      if (_roomToken) showToast('Collab disconnected');
    };
  } catch {
    _wsProvider = null;
  }
}

function _broadcast(msg) {
  if (_wsProvider?.readyState === WebSocket.OPEN) {
    _wsProvider.send(JSON.stringify(msg));
  }
}

function _handlePresenceUpdate(msg) {
  if (!msg?.userId) return;
  if (msg.type === 'join') {
    if (!_collaborators.find(c => c.id === msg.userId)) {
      _collaborators.push({
        id:       msg.userId,
        name:     msg.email || msg.userId.slice(0, 6),
        color:    COLORS[_collaborators.length % COLORS.length],
        lastSeen: Date.now(),
      });
    }
  } else if (msg.type === 'leave') {
    _collaborators = _collaborators.filter(c => c.id !== msg.userId);
  } else if (msg.type === 'typing') {
    const c = _collaborators.find(c => c.id === msg.userId);
    if (c) {
      c.isTyping = true;
      _updateTypingIndicator();
      setTimeout(() => { c.isTyping = false; _updateTypingIndicator(); }, 3000);
    }
  }
  _onPresenceChange?.(_collaborators);
  _updateCollabAvatars(_collaborators);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function _updateTypingIndicator() {
  const el = document.getElementById('collab-typing');
  if (!el) return;
  const typers = _collaborators
    .filter(c => c.isTyping && !c.isLocal)
    .map(c => c.name);
  if (typers.length === 0) { el.textContent = ''; return; }
  const names = typers.length === 1
    ? typers[0]
    : typers.slice(0, -1).join(', ') + ' & ' + typers.at(-1);
  el.textContent = `${names} ${typers.length === 1 ? 'is' : 'are'} writing…`;
}

function _updateCollabAvatars(collabs) {
  const bar = document.getElementById('collab-avatars');
  if (!bar) return;
  if (!collabs.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = collabs
    .slice(0, 5)
    .map(c => `<div class="collab-avatar" style="background:${c.color}"
                    title="${c.name}" aria-label="${c.name}">
                 ${(c.name[0] || '?').toUpperCase()}
               </div>`)
    .join('');
}

// ─── Collab modal ─────────────────────────────────────────────────────────────

function _renderCollabModal() {
  const existing = document.getElementById('collab-modal-backdrop');
  if (existing) {
    existing.classList.remove('hidden');
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id        = 'collab-modal-backdrop';
  backdrop.className = 'modal-backdrop phase8-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-label', 'Share & Collaborate');

  backdrop.innerHTML = `
    <div class="modal phase8-modal" role="document">
      <div class="phase8-modal-header">
        <h2>👥 Share & Collaborate</h2>
        <button class="btn btn-icon" id="btn-collab-modal-close" aria-label="Close">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
        </button>
      </div>
      <div class="phase8-modal-body">
        ${_collabBodyHtml()}
      </div>
    </div>`;

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) _closeCollabModal();
  });
  document.body.appendChild(backdrop);

  document.getElementById('btn-collab-modal-close')
    ?.addEventListener('click', _closeCollabModal);

  if (isInRoom()) {
    document.getElementById('btn-collab-leave')
      ?.addEventListener('click', () => { _leaveRoom(); _closeCollabModal(); showToast('Left room'); });
    document.getElementById('btn-collab-copy-link')
      ?.addEventListener('click', _copyRoomLink);
  } else {
    document.getElementById('btn-collab-create')
      ?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = '⏳ Creating room…';
        await new Promise(r => setTimeout(r, 600));

        const token = _generateToken();
        _joinRoom(token);

        const body = document.querySelector('#collab-modal-backdrop .phase8-modal-body');
        if (body) {
          body.innerHTML = _collabBodyHtml();
          _rewireCollabButtons();
          setTimeout(() => {
            const input = document.getElementById('collab-link-display');
            if (input) { input.focus(); input.select(); }
          }, 80);
        }
        showToast('🎉 Room created — share the link to invite collaborators!');
      });

    document.getElementById('collab-join-form')
      ?.addEventListener('submit', e => {
        e.preventDefault();
        const raw   = document.getElementById('collab-join-input')?.value.trim() || '';
        const token = raw.includes('room=') ? raw.split('room=')[1] : raw;
        if (token) {
          _joinRoom(token);
          _closeCollabModal();
          showToast('✅ Joined collab room');
        } else {
          showToast('⚠️ Please paste a room link or token');
        }
      });
  }

  document.addEventListener('keydown', _collabEscape);
}

function _collabBodyHtml() {
  if (isInRoom()) {
    const link = `${location.origin}${location.pathname}#room=${_roomToken}`;
    const collabList = _collaborators.length
      ? _collaborators.map(c =>
          `<div class="collab-member-row">
             <div class="collab-avatar" style="background:${c.color}">${c.name[0].toUpperCase()}</div>
             <span>${c.name}${c.isLocal ? ' (you)' : ''}</span>
           </div>`).join('')
      : '<p class="sync-intro">No other collaborators yet — share the link below.</p>';

    return `
      <p class="sync-intro">You're in a shared room. Anyone with the link can view and edit this project.</p>
      <div class="collab-members">${collabList}</div>
      <div class="collab-link-row">
        <input class="phase8-input" id="collab-link-display" type="text"
               value="${link}" readonly>
        <button class="btn btn-primary" id="btn-collab-copy-link">Copy Link</button>
      </div>
      <div class="phase8-modal-actions">
        <button class="btn" id="btn-collab-leave">Leave Room</button>
      </div>`;
  }

  return `
    <p class="sync-intro">Start a shared room to write together in real time. Share the link with co-authors or editors.</p>
    <div class="phase8-modal-actions">
      <button class="btn btn-primary" id="btn-collab-create">Create Shared Room</button>
    </div>
    <div class="collab-divider">or join an existing room</div>
    <form id="collab-join-form">
      <label class="phase8-label" for="collab-join-input">Room token</label>
      <div class="collab-join-row">
        <input class="phase8-input" id="collab-join-input" type="text"
               placeholder="Paste token or full link…">
        <button class="btn" type="submit">Join</button>
      </div>
    </form>`;
}

function _rewireCollabButtons() {
  document.getElementById('btn-collab-copy-link')
    ?.addEventListener('click', _copyRoomLink);
  document.getElementById('btn-collab-leave')
    ?.addEventListener('click', () => { _leaveRoom(); _closeCollabModal(); });
}

async function _copyRoomLink() {
  const link = `${location.origin}${location.pathname}#room=${_roomToken}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast('Room link copied to clipboard');
  } catch {
    prompt('Copy this link:', link);
  }
}

function _closeCollabModal() {
  document.getElementById('collab-modal-backdrop')?.classList.add('hidden');
  document.removeEventListener('keydown', _collabEscape);
}

function _collabEscape(e) {
  if (e.key === 'Escape') _closeCollabModal();
}

function _myId()    { return getCurrentUserId()    || `local-${_localId()}`; }
function _myEmail() { return getCurrentUserEmail() || ''; }

let _cachedLocalId = localStorage.getItem('zp_local_id');
function _localId() {
  if (!_cachedLocalId) {
    _cachedLocalId = Math.random().toString(36).slice(2);
    localStorage.setItem('zp_local_id', _cachedLocalId);
  }
  return _cachedLocalId;
}
