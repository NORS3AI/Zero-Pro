// app.js — Application entry point and orchestration
// Phase 8: Cloud Sync & Real-Time Collaboration

import { loadProject, createProject, saveProject, getDocument, createDocument } from './storage.js';
import { applyTheme, toggleTheme, showToast, showPrompt } from './ui.js';
import { initBinder, renderBinder } from './binder.js';
import { initEditor, loadDocument, saveCurrentContent, toggleFocusMode, insertImageInEditor, copyFormat, applyFormat } from './editor.js';
import { exportAsTxt, exportAsMd, exportAsDocx, exportAsDoc, exportProjectJson } from './export.js';
import { importTxt, importMd, importProjectJson, initImport } from './import.js';
import { initCorkboard, renderCorkboard, toggleSplitCorkboard } from './corkboard.js';
import { initOutline, renderOutline } from './outline.js';
import { initInspector, updateInspector } from './inspector.js';
import { initAI, toggleAIPanel } from './ai.js';
import { initFindReplace, openFindReplace, openProjectSearch } from './find-replace.js';
import { initCommandPalette } from './command-palette.js';
import { initSettings, openSettings, applyEditorSettings, applyAccentHue } from './settings.js';
import {
  initPublish, exportAsEpub,
  openKdpWizard, openIngramWizard, openSubmissionFormatter,
  openSelfPublishChecklist, openGenreGuides, openFrontMatterTemplates,
} from './publish.js';
import { initMedia } from './media.js';
import { initSnapshots, openSnapshots, takeSnapshot } from './snapshots.js';
import { initAmbient, openAmbientPanel } from './ambient.js';
import { initStreak, openStreakCalendar, trackWordsWritten, resetWordBaseline } from './streak.js';
// Phase 8
import { initSync, syncProjectDebounced, syncNow, getUser, getSyncState, onSyncStateChange } from './sync.js';
import { initCollab, createRoom, leaveRoom, getRoomId, getCollaborators, copyShareUrl, onCollabChange, setTypingStatus } from './collab.js';
import { initOfflineQueue, enqueue, isOnline, onStatusChange } from './offline-queue.js';
import { initTouch } from './touch.js';

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  project:              null,
  currentDocId:         null,
  currentView:          'editor', // 'editor' | 'corkboard' | 'outline'
  triggerDocImport:     null,
  triggerProjectImport: null,
  _typingTimer:         null,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  state.project = loadProject();
  if (!state.project) {
    state.project = createProject('My Novel');
    saveProject(state.project);
  }

  applyTheme(state.project.settings.theme);
  applyEditorSettings(state.project.settings);
  if (state.project.settings.accentHue != null) applyAccentHue(state.project.settings.accentHue);

  // Init all modules
  initBinder({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
    onInsertImageInEditor: (src, alt) => insertImageInEditor(src, alt),
  });

  initEditor({
    onDocChange: handleDocChange,
  });

  initCorkboard({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initOutline({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initInspector({
    onDocChange:     handleDocChange,
    onProjectChange: handleProjectChange,
  });

  initAI({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
  });

  const { triggerDocImport, triggerProjectImport } = initImport({
    onImportDocs:       _handleImportDocs,
    onRestoreProject:   _handleRestoreProject,
  });
  state.triggerDocImport     = triggerDocImport;
  state.triggerProjectImport = triggerProjectImport;

  initFindReplace({
    getEditor:   () => document.getElementById('editor'),
    getProject:  () => state.project,
    onSelectDoc: handleSelectDocument,
  });

  initCommandPalette({
    getProject:  () => state.project,
    onSelectDoc: handleSelectDocument,
    getActions:  () => [
      { icon: '📄', label: 'New Document',       hint: '',          run: () => document.querySelector('[data-action="add-doc"]')?.click() },
      { icon: '📁', label: 'New Folder',          hint: '',          run: () => document.querySelector('[data-action="add-folder"]')?.click() },
      { icon: '🔍', label: 'Find & Replace',      hint: 'Ctrl+F',   run: () => openFindReplace(false) },
      { icon: '✏️', label: 'Find & Replace',      hint: 'Ctrl+H',   run: () => openFindReplace(true) },
      { icon: '🎯', label: 'Toggle Focus Mode',   hint: 'Ctrl+F2',  run: () => document.getElementById('btn-focus')?.click() },
      { icon: '☀️', label: 'Toggle Theme',        hint: '',          run: () => document.getElementById('btn-theme')?.click() },
      { icon: '📊', label: 'Corkboard View',      hint: '',          run: () => switchView('corkboard') },
      { icon: '📋', label: 'Outline View',        hint: '',          run: () => switchView('outline') },
      { icon: '📝', label: 'Editor View',         hint: '',          run: () => switchView('editor') },
      { icon: '💾', label: 'Export as TXT',       hint: '',          run: () => document.getElementById('btn-export-txt')?.click() },
      { icon: '💾', label: 'Export as Markdown',  hint: '',          run: () => document.getElementById('btn-export-md')?.click() },
      { icon: '💾', label: 'Backup Project',      hint: '.json',     run: () => document.getElementById('btn-export-json')?.click() },
      { icon: '⚙️', label: 'Settings',            hint: 'Ctrl+,',   run: () => openSettings() },
      { icon: '📚', label: 'Export as EPUB',      hint: '',          run: async () => { await exportAsEpub(state.project); showToast('EPUB exported'); } },
      { icon: '📖', label: 'KDP Wizard',          hint: '',          run: () => openKdpWizard(state.project) },
      { icon: '🖨️', label: 'IngramSpark Wizard',  hint: '',          run: () => openIngramWizard(state.project) },
      { icon: '✉️', label: 'Agent Submission',    hint: '',          run: () => openSubmissionFormatter(state.project) },
      { icon: '✅', label: 'Self-Pub Checklist',  hint: '',          run: () => openSelfPublishChecklist() },
      { icon: '📕', label: 'Genre Style Guides',  hint: '',          run: () => openGenreGuides() },
      { icon: '📄', label: 'Front/Back Matter',   hint: '',          run: () => openFrontMatterTemplates(state.project) },
      { icon: '🔎', label: 'Project Search',      hint: 'Ctrl+Shift+F', run: () => openProjectSearch() },
      { icon: '📸', label: 'Take Snapshot',        hint: '',          run: () => takeSnapshot() },
      { icon: '📜', label: 'Revision History',     hint: '',          run: () => openSnapshots() },
      { icon: '🎨', label: 'Format Paint',         hint: '',          run: () => copyFormat() },
      { icon: '🔊', label: 'Ambient Sounds',       hint: '',          run: () => openAmbientPanel() },
      { icon: '🔥', label: 'Writing Streak',       hint: '',          run: () => openStreakCalendar() },
      // Phase 8
      { icon: '☁', label: 'Cloud Sync Settings',  hint: '',          run: () => openSettings('cloud') },
      { icon: '🔄', label: 'Sync Now',             hint: '',          run: () => { syncNow(); showToast('Syncing\u2026'); } },
      { icon: '👥', label: 'Collaborate',           hint: '',          run: () => _openCollabPanel() },
    ],
  });

  initSettings({
    getProject:       () => state.project,
    onSettingsChange: project => {
      state.project = project;
    },
  });

  initMedia({
    getProject:      () => state.project,
    onProjectChange: handleProjectChange,
    renderBinder:    (project, id) => renderBinder(project, id ?? state.currentDocId),
  });

  initSnapshots({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
    onDocRestore:  (docId) => {
      const doc = getDocument(state.project, docId);
      if (doc) loadDocument(state.project, doc);
    },
  });

  initAmbient();

  initStreak({
    getProject: () => state.project,
  });

  initPublish({
    getProject: () => state.project,
    onAddDoc: (title, content) => {
      const doc = createDocument(state.project, { type: 'doc', parentId: null, title });
      doc.content = content;
      saveProject(state.project);
      renderBinder(state.project, state.currentDocId);
      showToast(`"${title}" added to binder`);
    },
  });

  // ── Phase 8: Cloud Sync, Collaboration, Offline, Touch ─────────────────

  initSync({
    getProject:    () => state.project,
    onProjectSync: (project) => {
      state.project = project;
      saveProject(project);
      renderBinder(project, state.currentDocId);
      updateProjectTitle();
      showToast('Project synced from cloud');
    },
  });

  initCollab({
    getProject:     () => state.project,
    getCurrentDoc:  () => currentDoc(),
    onRemoteChange: () => {
      // Reload the current document when a remote collaborator changes it
      const doc = currentDoc();
      if (doc) loadDocument(state.project, doc);
    },
  });

  initOfflineQueue({
    onFlush: async (entries) => {
      // When we come back online, push queued writes to the cloud
      for (const entry of entries) {
        if (entry.type === 'sync_push') {
          await syncNow();
        }
      }
    },
  });

  initTouch({
    onSwipeRight: () => {
      // Swipe right from left edge → open binder
      if (_isCompact()) {
        workspace().classList.add('binder-open');
        workspace().classList.remove('inspector-open');
      }
    },
    onSwipeLeft: () => {
      // Swipe left from right edge → open inspector
      if (_isCompact()) {
        workspace().classList.add('inspector-open');
        workspace().classList.remove('binder-open');
      }
    },
  });

  // Update collab avatars in toolbar when collaborators change
  onCollabChange(({ collaborators }) => {
    _renderCollabAvatars(collaborators);
  });

  // Listen for service worker sync-flush events
  window.addEventListener('sw-sync-flush', () => {
    syncNow();
  });

  // Render binder and open first document
  renderBinder(state.project, null);
  const firstDoc = state.project.documents.find(d => !d.inTrash && d.type === 'doc');
  if (firstDoc) handleSelectDocument(firstDoc.id);

  bindToolbar();
  updateProjectTitle();
}

// ─── View Switching ───────────────────────────────────────────────────────────

function switchView(view) {
  state.currentView = view;

  // Update toolbar button states
  ['editor', 'corkboard', 'outline'].forEach(v => {
    const b = document.getElementById(`btn-view-${v}`);
    if (b) {
      b.classList.toggle('active', v === view);
      b.setAttribute('aria-pressed', v === view ? 'true' : 'false');
    }
  });

  // Show / hide view panes
  document.querySelectorAll('.view-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${view}-pane`);
  });

  // Render the newly-visible view
  const doc = state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
  _renderView(view, doc);
}

function _renderView(view, doc) {
  if (view === 'editor') {
    loadDocument(state.project, doc);
    _syncStatusBar(doc);
  } else if (view === 'corkboard') {
    const parentId = _corkboardParentId(doc);
    renderCorkboard(state.project, parentId);
  } else if (view === 'outline') {
    renderOutline(state.project);
  }
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
}

/** Determine the parent folder to show in corkboard for the current selection */
function _corkboardParentId(doc) {
  if (!doc) return null;
  return doc.type === 'folder' ? doc.id : (doc.parentId ?? null);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function handleSelectDocument(docId) {
  // Close the binder drawer on compact screens after a selection
  if (_isCompact()) workspace().classList.remove('binder-open');
  saveCurrentContent();
  state.currentDocId = docId;
  const doc = docId ? getDocument(state.project, docId) : null;
  resetWordBaseline(doc?.wordCount || 0);

  // Clicking a scene card in corkboard or an outline row → switch to editor
  if (doc?.type === 'doc' && state.currentView !== 'editor') {
    switchView('editor');
    return; // switchView → _renderView handles the rest
  }

  _renderView(state.currentView, doc);
  _syncStatusBar(doc);
}

function handleProjectChange(project) {
  state.project = project;
  updateProjectTitle();
  renderBinder(state.project, state.currentDocId);

  // Refresh whichever view is active (except editor — it autosaves itself)
  const doc = state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
  if (state.currentView === 'corkboard') {
    renderCorkboard(state.project, _corkboardParentId(doc));
  } else if (state.currentView === 'outline') {
    renderOutline(state.project);
  }
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);

  // Phase 8: Trigger cloud sync on project changes
  syncProjectDebounced();
}

function handleDocChange(project, doc) {
  state.project = project;
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
  // Track words for writing streak
  if (doc?.wordCount) trackWordsWritten(doc.wordCount);
  // Phase 8: Trigger cloud sync + typing presence
  syncProjectDebounced();
  setTypingStatus(true);
  clearTimeout(state._typingTimer);
  state._typingTimer = setTimeout(() => setTypingStatus(false), 3000);
}

// ─── Toolbar Wiring ───────────────────────────────────────────────────────────

function bindToolbar() {
  // Panel toggles — compact (tablet/mobile) uses overlay drawers; desktop uses grid collapse
  btn('btn-toggle-binder', () => {
    if (_isCompact()) {
      const opening = workspace().classList.toggle('binder-open');
      if (opening) workspace().classList.remove('inspector-open');
    } else {
      workspace().classList.toggle('binder-hidden');
    }
  });

  btn('btn-toggle-inspector', () => {
    if (_isCompact()) {
      const opening = workspace().classList.toggle('inspector-open');
      if (opening) workspace().classList.remove('binder-open');
    } else {
      workspace().classList.toggle('inspector-hidden');
    }
  });

  // View switcher
  btn('btn-view-editor',    () => switchView('editor'));
  btn('btn-view-corkboard', () => switchView('corkboard'));
  btn('btn-view-outline',   () => switchView('outline'));

  // AI panel — on compact screens close other drawers first
  btn('btn-ai', () => {
    if (_isCompact()) workspace().classList.remove('binder-open', 'inspector-open');
    toggleAIPanel();
  });

  // Mobile backdrop tap — close all drawers
  document.getElementById('mobile-backdrop')?.addEventListener('click', _closeAllDrawers);

  // Theme
  btn('btn-theme', () => {
    const theme = toggleTheme(state.project);
    saveProject(state.project);
    const b = document.getElementById('btn-theme');
    if (b) b.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
  });

  // Settings
  btn('btn-settings', () => openSettings());

  // Focus mode (editor only)
  btn('btn-focus', () => {
    const on = toggleFocusMode();
    document.getElementById('btn-focus')?.classList.toggle('active', on);
    document.getElementById('btn-focus')?.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // Export dropdown toggle
  btn('btn-export', () => {
    document.getElementById('export-dropdown')?.classList.toggle('open');
  });

  // Close export dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#export-menu')) {
      document.getElementById('export-dropdown')?.classList.remove('open');
    }
  });

  // Export formats
  btn('btn-export-txt', () => {
    const doc = currentDoc();
    if (doc) { exportAsTxt(doc); showToast('Exported as .txt'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-md', () => {
    const doc = currentDoc();
    if (doc) { exportAsMd(doc); showToast('Exported as .md'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-docx', () => {
    const doc = currentDoc();
    if (doc) { exportAsDocx(doc); showToast('Exported as .docx'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-doc', () => {
    const doc = currentDoc();
    if (doc) { exportAsDoc(doc); showToast('Exported as .doc'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-json', () => {
    exportProjectJson(state.project);
    showToast('Project backup saved');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-import-docs', () => {
    state.triggerDocImport?.();
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-import-json', () => {
    state.triggerProjectImport?.();
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  // ── Publish (Phase 5) ──────────────────────────────────────────────────────
  const _closeExport = () => document.getElementById('export-dropdown')?.classList.remove('open');

  btn('btn-export-epub', async () => {
    _closeExport();
    await exportAsEpub(state.project);
    showToast('EPUB exported');
  });

  btn('btn-pub-kdp', () => {
    _closeExport();
    openKdpWizard(state.project);
  });

  btn('btn-pub-ingram', () => {
    _closeExport();
    openIngramWizard(state.project);
  });

  btn('btn-pub-submission', () => {
    _closeExport();
    openSubmissionFormatter(state.project);
  });

  btn('btn-pub-checklist', () => {
    _closeExport();
    openSelfPublishChecklist();
  });

  btn('btn-pub-genres', () => {
    _closeExport();
    openGenreGuides();
  });

  btn('btn-pub-frontmatter', () => {
    _closeExport();
    openFrontMatterTemplates(state.project);
  });

  // ── Phase 7 ─────────────────────────────────────────────────────────────────

  // Format paint (click once to copy, click again to apply)
  btn('btn-format-paint', () => {
    const fpBtn = document.getElementById('btn-format-paint');
    if (fpBtn?.classList.contains('active')) {
      applyFormat();
    } else {
      copyFormat();
    }
  });

  // Take snapshot
  btn('btn-snapshot', () => takeSnapshot());

  // Split corkboard
  btn('btn-cork-split', () => toggleSplitCorkboard());

  // Double-click project title to rename
  document.getElementById('project-title')?.addEventListener('dblclick', () => {
    showPrompt('Rename Project', 'Project title', state.project.title, newTitle => {
      state.project.title = newTitle;
      saveProject(state.project);
      updateProjectTitle();
      renderBinder(state.project, state.currentDocId);
    });
  });

  // Ctrl/Cmd+S — force-save + cloud sync
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentContent();
      saveProject(state.project);
      syncProjectDebounced();
      showToast('Saved');
    }
  });

  // ── Phase 8: Collaboration button ──────────────────────────────────────────
  btn('btn-collab', () => _openCollabPanel());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function btn(id, handler) {
  document.getElementById(id)?.addEventListener('click', handler);
}

function workspace() {
  return document.getElementById('workspace');
}

/** True when in tablet or mobile layout (panels are overlay drawers). */
function _isCompact() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

/** Close every open drawer and hide the backdrop. */
function _closeAllDrawers() {
  workspace().classList.remove('binder-open', 'inspector-open');
  // Also close AI panel if open
  const aiPanel = document.getElementById('ai-panel');
  if (workspace().classList.contains('ai-open')) {
    workspace().classList.remove('ai-open');
    aiPanel?.setAttribute('aria-hidden', 'true');
    document.getElementById('btn-ai')?.classList.remove('active');
    document.getElementById('btn-ai')?.setAttribute('aria-pressed', 'false');
  }
}

// Restore clean state when resizing between compact and desktop
window.matchMedia('(max-width: 1023px)').addEventListener('change', e => {
  if (e.matches) {
    // Entering compact: remove desktop-only hidden classes
    workspace().classList.remove('binder-hidden', 'inspector-hidden');
  } else {
    // Entering desktop: remove compact drawer-open classes
    workspace().classList.remove('binder-open', 'inspector-open');
  }
});

function currentDoc() {
  return state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
}

function updateProjectTitle() {
  const el = document.getElementById('project-title');
  if (el) el.textContent = state.project.title;
}

function _syncStatusBar(doc) {
  const titleEl = document.getElementById('current-doc-title');
  if (titleEl) titleEl.textContent = doc?.title ?? '';
}

// ─── Phase 8: Collaboration Panel ────────────────────────────────────────────

function _openCollabPanel() {
  const roomId = getRoomId();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  if (roomId) {
    // Already in a room — show share panel
    const collabs = getCollaborators();
    backdrop.innerHTML = `
      <div class="collab-panel" role="dialog" aria-modal="true">
        <h3>Collaboration Room</h3>
        <div class="collab-share-url">
          <input type="text" value="${_getCollabUrl()}" readonly id="collab-url-input">
          <button id="collab-copy-url">Copy</button>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
          ${collabs.length} collaborator${collabs.length !== 1 ? 's' : ''} connected
        </div>
        ${collabs.length > 0 ? `<ul class="collab-member-list">
          ${collabs.map(c => `
            <li class="collab-member">
              <div class="collab-member-avatar" style="background:${c.color}">${(c.name || '?')[0].toUpperCase()}</div>
              <div class="collab-member-info">
                <div class="collab-member-name">${c.name}</div>
                <div class="collab-member-role">${c.typing ? 'Writing\u2026' : 'Connected'}</div>
              </div>
            </li>
          `).join('')}
        </ul>` : ''}
        <div class="modal-actions">
          <button class="btn-danger" id="collab-leave">Leave Room</button>
          <button class="btn-secondary" id="collab-close">Close</button>
        </div>
      </div>
    `;
  } else {
    // Not in a room — offer to create or join
    backdrop.innerHTML = `
      <div class="collab-panel" role="dialog" aria-modal="true">
        <h3>Start Collaborating</h3>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Create a room to invite collaborators, or join an existing room.
        </p>
        <div class="modal-actions" style="flex-direction:column;gap:10px">
          <button class="btn-primary" id="collab-create" style="width:100%">Create Room</button>
          <div style="display:flex;gap:8px;width:100%">
            <input type="text" id="collab-join-id" class="modal-input" style="margin:0;flex:1"
                   placeholder="Paste room URL or ID…">
            <button class="btn-secondary" id="collab-join">Join</button>
          </div>
          <button class="btn-secondary" id="collab-cancel" style="width:100%">Cancel</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(backdrop);

  // Event handlers
  backdrop.querySelector('#collab-copy-url')?.addEventListener('click', () => {
    copyShareUrl();
  });

  backdrop.querySelector('#collab-leave')?.addEventListener('click', () => {
    leaveRoom();
    document.body.removeChild(backdrop);
  });

  backdrop.querySelector('#collab-close')?.addEventListener('click', () => {
    document.body.removeChild(backdrop);
  });

  backdrop.querySelector('#collab-create')?.addEventListener('click', async () => {
    const url = await createRoom();
    document.body.removeChild(backdrop);
    if (url) _openCollabPanel(); // re-open to show the share URL
  });

  backdrop.querySelector('#collab-join')?.addEventListener('click', async () => {
    const input = backdrop.querySelector('#collab-join-id')?.value?.trim();
    if (!input) return;
    // Extract room ID from URL or use raw ID
    let roomId = input;
    try {
      const url = new URL(input);
      roomId = url.searchParams.get('room') || input;
    } catch { /* not a URL, use as-is */ }
    const { joinRoom } = await import('./collab.js');
    joinRoom(roomId);
    document.body.removeChild(backdrop);
  });

  backdrop.querySelector('#collab-cancel')?.addEventListener('click', () => {
    document.body.removeChild(backdrop);
  });

  // Click backdrop → close
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) document.body.removeChild(backdrop);
  });
}

function _getCollabUrl() {
  const roomId = getRoomId();
  if (!roomId) return '';
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  return url.toString();
}

function _renderCollabAvatars(collaborators) {
  const container = document.getElementById('collab-avatars');
  if (!container) return;

  container.innerHTML = '';
  if (!collaborators || collaborators.length === 0) return;

  // Show up to 4 avatars
  const shown = collaborators.slice(0, 4);
  shown.forEach(c => {
    const avatar = document.createElement('span');
    avatar.className = 'collab-avatar';
    avatar.style.backgroundColor = c.color;
    avatar.title = c.name;
    avatar.textContent = (c.name || '?')[0].toUpperCase();
    container.appendChild(avatar);
  });

  if (collaborators.length > 4) {
    const more = document.createElement('span');
    more.className = 'collab-avatar';
    more.style.backgroundColor = 'var(--text-muted)';
    more.textContent = `+${collaborators.length - 4}`;
    container.appendChild(more);
  }
}

// ─── Import Handlers ──────────────────────────────────────────────────────────

async function _handleImportDocs(files) {
  let added = 0;
  for (const file of files) {
    try {
      if (/\.(md|markdown)$/i.test(file.name)) {
        await importMd(file, state.project, null);
      } else {
        await importTxt(file, state.project, null);
      }
      added++;
    } catch {
      showToast(`Could not import "${file.name}"`);
    }
  }
  if (added > 0) {
    saveProject(state.project);
    renderBinder(state.project, state.currentDocId);
    showToast(`Imported ${added} document${added > 1 ? 's' : ''}`);
  }
}

async function _handleRestoreProject(file) {
  const { showConfirm } = await import('./ui.js');
  const project = await importProjectJson(file);
  if (!project) { showToast('Invalid backup file'); return; }
  showConfirm(
    `Replace "${state.project.title}" with "${project.title}"? This cannot be undone.`,
    () => {
      state.project    = project;
      state.currentDocId = null;
      saveProject(state.project);
      applyTheme(project.settings?.theme);
      renderBinder(state.project, null);
      loadDocument(state.project, null);
      updateProjectTitle();
      showToast('Project restored');
    }
  );
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
