// collab.js — Real-Time Collaboration with Yjs CRDT
// Phase 8: Cloud Sync & Real-Time Collaboration

import { showToast } from './ui.js';
import { generateId } from './storage.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_PREFIX  = 'zeropro-';
const PRESENCE_COLORS = [
  '#e06c75', '#61afef', '#98c379', '#e5c07b',
  '#c678dd', '#56b6c2', '#be5046', '#d19a66',
];

/** Collaborator permission levels */
export const PERMISSIONS = {
  OWNER:     'owner',
  EDITOR:    'editor',
  COMMENTER: 'commenter',
  VIEWER:    'viewer',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _ydoc            = null;
let _provider        = null;
let _awareness       = null;
let _ytext           = null;
let _getProject      = null;
let _getCurrentDoc   = null;
let _onRemoteChange  = null;
let _roomId          = null;
let _userName        = 'Anonymous';
let _userColor       = PRESENCE_COLORS[0];
let _permission      = PERMISSIONS.OWNER;
let _collaborators   = [];
let _comments        = [];
let _collabListeners = [];
let _yjsLoaded       = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the collaboration module. Call once at app boot.
 * @param {{ getProject: Function, getCurrentDoc: Function, onRemoteChange: Function }} opts
 */
export function initCollab({ getProject, getCurrentDoc, onRemoteChange }) {
  _getProject     = getProject;
  _getCurrentDoc  = getCurrentDoc;
  _onRemoteChange = onRemoteChange;

  // Check URL for room token
  const params = new URLSearchParams(window.location.search);
  const roomToken = params.get('room');
  if (roomToken) {
    joinRoom(roomToken);
  }
}

/**
 * Create a new collaboration room for the current project.
 * @returns {string} The room URL to share
 */
export async function createRoom() {
  const project = _getProject();
  if (!project) return null;

  const roomId = ROOM_PREFIX + generateId();
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);

  _roomId = roomId;
  await _setupYjs(roomId);

  showToast('Collaboration room created');
  return url.toString();
}

/**
 * Join an existing collaboration room.
 * @param {string} roomId
 */
export async function joinRoom(roomId) {
  if (!roomId) return;

  _roomId = roomId;
  await _setupYjs(roomId);
  showToast('Joined collaboration room');
}

/**
 * Leave the current collaboration room.
 */
export function leaveRoom() {
  _cleanup();
  _roomId = null;
  _collaborators = [];
  _notifyListeners();

  // Remove room param from URL
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState({}, '', url.toString());

  showToast('Left collaboration room');
}

/**
 * Get the current room ID (null if not in a room).
 */
export function getRoomId() {
  return _roomId;
}

/**
 * Get the list of current collaborators.
 * @returns {{ clientId: number, name: string, color: string, cursor: Object }[]}
 */
export function getCollaborators() {
  return _collaborators;
}

/**
 * Set the current user's display name.
 * @param {string} name
 */
export function setUserName(name) {
  _userName = name || 'Anonymous';
  if (_awareness) {
    _awareness.setLocalStateField('user', {
      name: _userName,
      color: _userColor,
    });
  }
}

/**
 * Update the local user's cursor position.
 * Called by the editor on selection change.
 * @param {{ anchor: number, head: number }} range
 */
export function updateCursorPosition(range) {
  if (!_awareness) return;
  _awareness.setLocalStateField('cursor', range);
}

/**
 * Set the local user's typing status.
 * @param {boolean} isTyping
 */
export function setTypingStatus(isTyping) {
  if (!_awareness) return;
  _awareness.setLocalStateField('typing', isTyping);
}

/**
 * Get users who are currently typing.
 * @returns {{ name: string, color: string }[]}
 */
export function getTypingUsers() {
  if (!_awareness) return [];
  const states = _awareness.getStates();
  const typing = [];

  states.forEach((state, clientId) => {
    if (clientId === _awareness.clientID) return;
    if (state.typing) {
      typing.push({
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#999',
      });
    }
  });

  return typing;
}

/**
 * Subscribe to collaborator changes. Returns an unsubscribe function.
 * @param {Function} listener
 */
export function onCollabChange(listener) {
  _collabListeners.push(listener);
  return () => {
    _collabListeners = _collabListeners.filter(l => l !== listener);
  };
}

// ─── Comments System ─────────────────────────────────────────────────────────

/**
 * Add a comment tied to a text range.
 * @param {{ start: number, end: number, text: string, author: string }} comment
 */
export function addComment({ start, end, text, author }) {
  const comment = {
    id: generateId(),
    start,
    end,
    text,
    author: author || _userName,
    createdAt: Date.now(),
    resolved: false,
    replies: [],
  };

  _comments.push(comment);

  // Sync via Yjs if available
  if (_ydoc) {
    const ycomments = _ydoc.getArray('comments');
    ycomments.push([comment]);
  }

  _notifyListeners();
  return comment;
}

/**
 * Reply to an existing comment.
 * @param {string} commentId
 * @param {{ text: string, author: string }} reply
 */
export function replyToComment(commentId, { text, author }) {
  const comment = _comments.find(c => c.id === commentId);
  if (!comment) return;

  const reply = {
    id: generateId(),
    text,
    author: author || _userName,
    createdAt: Date.now(),
  };

  comment.replies.push(reply);
  _notifyListeners();
  return reply;
}

/**
 * Resolve (or unresolve) a comment.
 * @param {string} commentId
 * @param {boolean} resolved
 */
export function resolveComment(commentId, resolved = true) {
  const comment = _comments.find(c => c.id === commentId);
  if (comment) {
    comment.resolved = resolved;
    _notifyListeners();
  }
}

/**
 * Delete a comment.
 * @param {string} commentId
 */
export function deleteComment(commentId) {
  _comments = _comments.filter(c => c.id !== commentId);
  _notifyListeners();
}

/**
 * Get all comments (optionally filtered by resolved status).
 * @param {{ includeResolved?: boolean }} [opts]
 */
export function getComments({ includeResolved = true } = {}) {
  if (includeResolved) return [..._comments];
  return _comments.filter(c => !c.resolved);
}

// ─── Yjs Setup ───────────────────────────────────────────────────────────────

async function _setupYjs(roomId) {
  _cleanup();

  if (!_yjsLoaded) {
    await _loadYjsScripts();
    _yjsLoaded = true;
  }

  if (!window.Y) {
    console.warn('Yjs not available');
    return;
  }

  _ydoc = new window.Y.Doc();
  _ytext = _ydoc.getText('document');

  // Use WebRTC provider for peer-to-peer (no server needed)
  if (window.WebrtcProvider) {
    _provider = new window.WebrtcProvider(roomId, _ydoc, {
      signaling: ['wss://signaling.yjs.dev'],
    });
    _awareness = _provider.awareness;
  } else if (window.WebsocketProvider) {
    // Fallback to WebSocket provider
    _provider = new window.WebsocketProvider(
      'wss://demos.yjs.dev', roomId, _ydoc
    );
    _awareness = _provider.awareness;
  } else {
    console.warn('No Yjs provider available — collaboration limited');
    return;
  }

  // Set local user info
  _userColor = PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
  _awareness.setLocalStateField('user', {
    name: _userName,
    color: _userColor,
  });

  // Listen for awareness changes (collaborator presence)
  _awareness.on('change', _handleAwarenessChange);

  // Listen for remote text changes
  _ytext.observe(_handleRemoteTextChange);

  // Sync comments
  const ycomments = _ydoc.getArray('comments');
  ycomments.observe(() => {
    _comments = ycomments.toArray();
    _notifyListeners();
  });
}

function _cleanup() {
  if (_provider) {
    _provider.disconnect();
    _provider.destroy();
    _provider = null;
  }
  if (_ydoc) {
    _ydoc.destroy();
    _ydoc = null;
  }
  _awareness = null;
  _ytext = null;
}

async function _loadYjsScripts() {
  const scripts = [
    'https://cdn.jsdelivr.net/npm/yjs@13/dist/yjs.mjs',
  ];

  for (const src of scripts) {
    try {
      await _loadScript(src);
    } catch {
      // Try UMD version
      try {
        await _loadScript(src.replace('.mjs', '.js'));
      } catch {
        console.warn(`Could not load ${src}`);
      }
    }
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function _handleAwarenessChange() {
  if (!_awareness) return;

  const states = _awareness.getStates();
  _collaborators = [];

  states.forEach((state, clientId) => {
    if (clientId === _awareness.clientID) return;

    _collaborators.push({
      clientId,
      name:   state.user?.name  || 'Anonymous',
      color:  state.user?.color || '#999',
      cursor: state.cursor || null,
      typing: state.typing || false,
    });
  });

  _notifyListeners();
  _renderRemoteCursors();
  _updateTypingIndicator();
}

function _handleRemoteTextChange(event) {
  // Only handle remote changes (not local ones)
  if (event.transaction.local) return;
  _onRemoteChange?.();
}

// ─── Remote Cursor Rendering ─────────────────────────────────────────────────

function _renderRemoteCursors() {
  const editor = document.getElementById('editor');
  if (!editor) return;

  // Remove existing remote cursors
  editor.querySelectorAll('.remote-cursor').forEach(el => el.remove());
  editor.querySelectorAll('.remote-selection').forEach(el => el.remove());

  _collaborators.forEach(collab => {
    if (!collab.cursor) return;

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.className = 'remote-cursor';
    cursor.style.borderLeftColor = collab.color;
    cursor.dataset.clientId = collab.clientId;

    // Create name label
    const label = document.createElement('span');
    label.className = 'remote-cursor-label';
    label.style.backgroundColor = collab.color;
    label.textContent = collab.name;
    cursor.appendChild(label);

    // Position is approximate — in a full implementation this would
    // use Yjs relative positions mapped to DOM positions
    editor.appendChild(cursor);
  });
}

function _updateTypingIndicator() {
  const typingUsers = getTypingUsers();
  const el = document.getElementById('collab-typing');
  if (!el) return;

  if (typingUsers.length === 0) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }

  const names = typingUsers.map(u => u.name);
  let text;
  if (names.length === 1) {
    text = `${names[0]} is writing\u2026`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are writing\u2026`;
  } else {
    text = `${names.length} people are writing\u2026`;
  }

  el.textContent = text;
  el.classList.remove('hidden');
}

// ─── Share URL ───────────────────────────────────────────────────────────────

/**
 * Generate a share URL for the current room.
 * @param {'editor'|'commenter'|'viewer'} permission
 * @returns {string|null}
 */
export function getShareUrl(permission = 'editor') {
  if (!_roomId) return null;

  const url = new URL(window.location.href);
  url.searchParams.set('room', _roomId);
  if (permission !== 'editor') {
    url.searchParams.set('perm', permission);
  }
  return url.toString();
}

/**
 * Copy the share URL to clipboard.
 */
export async function copyShareUrl(permission = 'editor') {
  const url = getShareUrl(permission);
  if (!url) {
    showToast('No active collaboration room');
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast('Share link copied to clipboard');
  } catch {
    showToast('Could not copy to clipboard');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _notifyListeners() {
  _collabListeners.forEach(l => l({
    collaborators: _collaborators,
    comments: _comments,
    roomId: _roomId,
  }));
}

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
