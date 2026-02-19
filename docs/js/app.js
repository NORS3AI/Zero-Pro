// app.js — Application entry point and orchestration
// Phase 2: Corkboard, Outline, Inspector

import { loadProject, createProject, saveProject, getDocument } from './storage.js';
import { applyTheme, toggleTheme, showToast, showPrompt } from './ui.js';
import { initBinder, renderBinder } from './binder.js';
import { initEditor, loadDocument, saveCurrentContent, toggleFocusMode } from './editor.js';
import { exportAsTxt, exportAsMd, exportAsDocx, exportAsDoc } from './export.js';
import { initCorkboard, renderCorkboard } from './corkboard.js';
import { initOutline, renderOutline } from './outline.js';
import { initInspector, updateInspector } from './inspector.js';

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  project:     null,
  currentDocId: null,
  currentView: 'editor', // 'editor' | 'corkboard' | 'outline'
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  state.project = loadProject();
  if (!state.project) {
    state.project = createProject('My Novel');
    saveProject(state.project);
  }

  applyTheme(state.project.settings.theme);

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
  // Panel toggles
  btn('btn-toggle-binder',   () => workspace().classList.toggle('binder-hidden'));
  btn('btn-toggle-inspector', () => workspace().classList.toggle('inspector-hidden'));

  // View switcher
  btn('btn-view-editor',    () => switchView('editor'));
  btn('btn-view-corkboard', () => switchView('corkboard'));
  btn('btn-view-outline',   () => switchView('outline'));

  // Theme
  btn('btn-theme', () => {
    const theme = toggleTheme(state.project);
    saveProject(state.project);
    const b = document.getElementById('btn-theme');
    if (b) b.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
  });

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

// ─── Start ────────────────────────────────────────────────────────────────────

init();
