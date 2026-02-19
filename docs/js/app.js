// app.js — Application entry point and orchestration
// Phase 1: Writing Foundation

import { loadProject, createProject, saveProject, getDocument } from './storage.js';
import { applyTheme, toggleTheme, showToast, showPrompt } from './ui.js';
import { initBinder, renderBinder } from './binder.js';
import { initEditor, loadDocument, saveCurrentContent, toggleFocusMode } from './editor.js';
import { exportAsTxt, exportAsMd, exportAsDocx, exportAsDoc } from './export.js';

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  project: null,
  currentDocId: null,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  // Load existing project or create a fresh one
  state.project = loadProject();
  if (!state.project) {
    state.project = createProject('My Novel');
    saveProject(state.project);
  }

  applyTheme(state.project.settings.theme);

  // Init modules
  initBinder({
    onSelectDoc: handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initEditor({
    onDocChange: handleDocChange,
  });

  // Render binder and open the first available document
  renderBinder(state.project, null);
  const firstDoc = state.project.documents.find(d => !d.inTrash && d.type === 'doc');
  if (firstDoc) handleSelectDocument(firstDoc.id);

  bindToolbar();
  updateProjectTitle();
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function handleSelectDocument(docId) {
  // Save current content before switching
  saveCurrentContent();

  state.currentDocId = docId;
  const doc = docId ? getDocument(state.project, docId) : null;
  loadDocument(state.project, doc);

  const titleEl = document.getElementById('current-doc-title');
  if (titleEl) titleEl.textContent = doc?.title ?? '';
}

function handleProjectChange(project) {
  state.project = project;
  updateProjectTitle();
}

function handleDocChange(project) {
  state.project = project;
}

// ─── Toolbar Wiring ───────────────────────────────────────────────────────────

function bindToolbar() {
  // Panel toggles
  btn('btn-toggle-binder', () => workspace().classList.toggle('binder-hidden'));
  btn('btn-toggle-inspector', () => workspace().classList.toggle('inspector-hidden'));

  // Theme
  btn('btn-theme', () => {
    const theme = toggleTheme(state.project);
    saveProject(state.project);
    const b = document.getElementById('btn-theme');
    if (b) b.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
  });

  // Focus mode
  btn('btn-focus', () => {
    const on = toggleFocusMode();
    document.getElementById('btn-focus')?.classList.toggle('active', on);
    document.getElementById('btn-focus')?.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // Export — toggle dropdown
  btn('btn-export', () => {
    document.getElementById('export-dropdown')?.classList.toggle('open');
  });

  // Close dropdown when clicking outside
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

  // Keyboard: Ctrl/Cmd+S — force-save
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

// ─── Start ────────────────────────────────────────────────────────────────────

init();
