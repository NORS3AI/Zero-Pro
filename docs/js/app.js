// app.js — Application entry point and orchestration
// Phase 3: AI Writing Assistant

import { loadProject, createProject, saveProject, getDocument } from './storage.js';
import { applyTheme, toggleTheme, showToast, showPrompt } from './ui.js';
import { initBinder, renderBinder } from './binder.js';
import { initEditor, loadDocument, saveCurrentContent, toggleFocusMode } from './editor.js';
import { exportAsTxt, exportAsMd, exportAsDocx, exportAsDoc, exportProjectJson } from './export.js';
import { importTxt, importMd, importProjectJson, initImport } from './import.js';
import { initCorkboard, renderCorkboard } from './corkboard.js';
import { initOutline, renderOutline } from './outline.js';
import { initInspector, updateInspector } from './inspector.js';
import { initAI, toggleAIPanel } from './ai.js';
import { initFindReplace, openFindReplace } from './find-replace.js';
import { initCommandPalette } from './command-palette.js';
import { initSettings, openSettings, applyEditorSettings } from './settings.js';

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  project:              null,
  currentDocId:         null,
  currentView:          'editor', // 'editor' | 'corkboard' | 'outline'
  triggerDocImport:     null,
  triggerProjectImport: null,
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

  // Init all modules
  initBinder({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
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
    getEditor: () => document.getElementById('editor'),
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
    ],
  });

  initSettings({
    getProject:       () => state.project,
    onSettingsChange: project => {
      state.project = project;
    },
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
}

function handleDocChange(project, doc) {
  state.project = project;
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
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

  // Double-click project title to rename
  document.getElementById('project-title')?.addEventListener('dblclick', () => {
    showPrompt('Rename Project', 'Project title', state.project.title, newTitle => {
      state.project.title = newTitle;
      saveProject(state.project);
      updateProjectTitle();
      renderBinder(state.project, state.currentDocId);
    });
  });

  // Ctrl/Cmd+S — force-save
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentContent();
      saveProject(state.project);
      showToast('Saved');
    }
  });
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
