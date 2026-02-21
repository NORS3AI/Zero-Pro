// project-templates.js — New project from template wizard (Phase 12)
// Provides ready-made project structures: Novel, Short Story, Non-Fiction,
// Personal Journal, and Screenplay. Replaces the current project (with confirmation).

import { createProject, createDocument, saveProject, generateId } from './storage.js';
import { showToast, showConfirm } from './ui.js';

// ─── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id:   'novel',
    name: 'Novel',
    icon: '📚',
    desc: 'Three-act structure with front matter, three acts, and back matter.',
    tree: [
      { type: 'folder', title: 'Front Matter', children: [
        { type: 'doc', title: 'Title Page', synopsis: 'Title, author, contact details.' },
        { type: 'doc', title: 'Dedication' },
      ]},
      { type: 'folder', title: 'Act 1 — Setup', children: [
        { type: 'doc', title: 'Chapter 1', synopsis: 'Introduce protagonist and ordinary world.' },
        { type: 'doc', title: 'Chapter 2', synopsis: 'Inciting incident.' },
        { type: 'doc', title: 'Chapter 3', synopsis: 'Protagonist commits to the adventure.' },
      ]},
      { type: 'folder', title: 'Act 2 — Confrontation', children: [
        { type: 'doc', title: 'Chapter 4', synopsis: 'New world; tests and allies.' },
        { type: 'doc', title: 'Chapter 5', synopsis: 'Rising stakes.' },
        { type: 'doc', title: 'Chapter 6', synopsis: 'Midpoint — false peak or valley.' },
        { type: 'doc', title: 'Chapter 7', synopsis: 'All is lost.' },
      ]},
      { type: 'folder', title: 'Act 3 — Resolution', children: [
        { type: 'doc', title: 'Chapter 8', synopsis: 'Break into three — solution found.' },
        { type: 'doc', title: 'Chapter 9', synopsis: 'Climax.' },
        { type: 'doc', title: 'Chapter 10', synopsis: 'Dénouement.' },
      ]},
      { type: 'folder', title: 'Back Matter', children: [
        { type: 'doc', title: 'Acknowledgements' },
        { type: 'doc', title: 'Author Note' },
      ]},
      { type: 'folder', title: 'Research & Notes', children: [
        { type: 'doc', title: 'World Building', synopsis: 'Setting, rules, and lore.' },
        { type: 'doc', title: 'Character Notes', synopsis: 'Character profiles and arcs.' },
        { type: 'doc', title: 'Research Links', synopsis: 'Reference materials.' },
      ]},
    ],
  },
  {
    id:   'short-story',
    name: 'Short Story',
    icon: '📄',
    desc: 'Lean structure for stories under 10,000 words.',
    tree: [
      { type: 'doc', title: 'Opening Scene', synopsis: 'Hook the reader immediately.' },
      { type: 'doc', title: 'Rising Action', synopsis: 'Conflict and complications develop.' },
      { type: 'doc', title: 'Climax',        synopsis: 'The decisive moment.' },
      { type: 'doc', title: 'Resolution',    synopsis: 'Outcome and emotional landing.' },
      { type: 'folder', title: 'Notes', children: [
        { type: 'doc', title: 'Draft Notes', synopsis: 'Ideas and scratchpad.' },
      ]},
    ],
  },
  {
    id:   'nonfiction',
    name: 'Non-Fiction',
    icon: '🔬',
    desc: 'Book structure with introduction, chapters, and conclusion.',
    tree: [
      { type: 'folder', title: 'Front Matter', children: [
        { type: 'doc', title: 'Introduction', synopsis: 'Why this book? What will readers gain?' },
        { type: 'doc', title: 'Preface / Foreword' },
      ]},
      { type: 'folder', title: 'Part 1', children: [
        { type: 'doc', title: 'Chapter 1', synopsis: '' },
        { type: 'doc', title: 'Chapter 2', synopsis: '' },
        { type: 'doc', title: 'Chapter 3', synopsis: '' },
      ]},
      { type: 'folder', title: 'Part 2', children: [
        { type: 'doc', title: 'Chapter 4', synopsis: '' },
        { type: 'doc', title: 'Chapter 5', synopsis: '' },
        { type: 'doc', title: 'Chapter 6', synopsis: '' },
      ]},
      { type: 'folder', title: 'Part 3', children: [
        { type: 'doc', title: 'Chapter 7', synopsis: '' },
        { type: 'doc', title: 'Chapter 8', synopsis: '' },
      ]},
      { type: 'folder', title: 'Back Matter', children: [
        { type: 'doc', title: 'Conclusion', synopsis: 'What the reader should take away.' },
        { type: 'doc', title: 'Bibliography' },
        { type: 'doc', title: 'Index Notes' },
        { type: 'doc', title: 'Acknowledgements' },
      ]},
      { type: 'folder', title: 'Research', children: [
        { type: 'doc', title: 'Source Notes', synopsis: 'Raw research and citations.' },
        { type: 'doc', title: 'Interview Notes' },
      ]},
    ],
  },
  {
    id:   'journal',
    name: 'Personal Journal',
    icon: '📔',
    desc: 'Daily entries organised by month, with a reflection section.',
    tree: [
      { type: 'folder', title: 'February 2026', children: [
        { type: 'doc', title: 'Feb 21', synopsis: '' },
        { type: 'doc', title: 'Feb 22', synopsis: '' },
        { type: 'doc', title: 'Feb 23', synopsis: '' },
      ]},
      { type: 'folder', title: 'Reflections', children: [
        { type: 'doc', title: 'Weekly Reflection', synopsis: 'What went well? What to improve?' },
        { type: 'doc', title: 'Goals & Intentions',  synopsis: '' },
      ]},
      { type: 'folder', title: 'Templates', children: [
        { type: 'doc', title: 'Daily Template', synopsis: 'Gratitude / Wins / Challenges / Tomorrow', content: '<p><strong>Gratitude:</strong></p><p><strong>Wins today:</strong></p><p><strong>Challenges:</strong></p><p><strong>Tomorrow:</strong></p>' },
      ]},
    ],
  },
  {
    id:   'screenplay',
    name: 'Screenplay',
    icon: '🎬',
    desc: 'Feature-length screenplay structure with three acts.',
    tree: [
      { type: 'doc', title: 'Title Page', synopsis: 'Title, writer, registration number.' },
      { type: 'folder', title: 'Act One', children: [
        { type: 'doc', title: 'Opening Scene', synopsis: 'Cold open — grab attention.' },
        { type: 'doc', title: 'Setup',          synopsis: 'Introduce world and protagonist.' },
        { type: 'doc', title: 'Inciting Incident', synopsis: 'The event that sets the story in motion.' },
        { type: 'doc', title: 'End of Act One',    synopsis: 'Protagonist commits (pp. 25–30).' },
      ]},
      { type: 'folder', title: 'Act Two', children: [
        { type: 'doc', title: 'Fun and Games',    synopsis: 'The premise explored (pp. 30–55).' },
        { type: 'doc', title: 'Midpoint',         synopsis: 'False peak or valley (pp. 55–60).' },
        { type: 'doc', title: 'Bad Guys Close In', synopsis: 'Antagonist pressure mounts.' },
        { type: 'doc', title: 'All Is Lost',       synopsis: 'Darkest moment (pp. 75–80).' },
        { type: 'doc', title: 'Dark Night of Soul', synopsis: '' },
      ]},
      { type: 'folder', title: 'Act Three', children: [
        { type: 'doc', title: 'Break into Three', synopsis: 'Hero finds the solution.' },
        { type: 'doc', title: 'Finale',           synopsis: 'Storm the castle (pp. 85–105).' },
        { type: 'doc', title: 'Final Image',      synopsis: 'Mirrors the opening — shows transformation.' },
      ]},
      { type: 'folder', title: 'Development', children: [
        { type: 'doc', title: 'Logline',      synopsis: 'One sentence pitch.' },
        { type: 'doc', title: 'Treatment',    synopsis: 'Scene-by-scene breakdown.' },
        { type: 'doc', title: 'Character Bios' },
      ]},
    ],
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _onApply    = null;   // (project) => void
let _modal      = null;
let _selectedId = 'novel';
let _titleInput = '';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open the new-project template picker.
 * @param {{ onApply: Function }} opts  onApply(newProject) called when user confirms
 */
export function openProjectTemplates({ onApply }) {
  _onApply    = onApply;
  _selectedId = 'novel';
  _titleInput = '';

  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _renderTemplates();
  _renderPreview();
  _modal.querySelector('#tmpl-title-input').value = '';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'tmpl-overlay';
  overlay.className = 'p12-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'New Project from Template');

  overlay.innerHTML = `
    <div class="tmpl-modal">
      <div class="tmpl-header">
        <h3>New Project from Template</h3>
        <button class="tmpl-close" aria-label="Close">&times;</button>
      </div>
      <div class="tmpl-body">
        <div class="tmpl-grid" id="tmpl-grid"></div>

        <div class="tmpl-config">
          <div class="tmpl-config-label">Project Title</div>
          <input type="text" id="tmpl-title-input" class="tmpl-config-input"
                 placeholder="My Novel…" aria-label="Project title">
        </div>

        <div class="tmpl-preview" id="tmpl-preview"></div>
      </div>
      <div class="tmpl-footer">
        <button class="btn btn-ghost" id="tmpl-cancel">Cancel</button>
        <button class="btn" id="tmpl-apply">Create Project</button>
      </div>
    </div>`;

  overlay.querySelector('.tmpl-close').addEventListener('click', _close);
  overlay.querySelector('#tmpl-cancel').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#tmpl-title-input').addEventListener('input', e => {
    _titleInput = e.target.value;
  });

  overlay.querySelector('#tmpl-apply').addEventListener('click', () => {
    showConfirm('Replace the current project with the new template? All unsaved changes will be lost.', () => {
      _applyTemplate();
    });
  });

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _renderTemplates() {
  const grid = document.getElementById('tmpl-grid');
  if (!grid) return;
  grid.innerHTML = TEMPLATES.map(t => `
    <div class="tmpl-card${t.id === _selectedId ? ' selected' : ''}" data-id="${t.id}">
      <div class="tmpl-card-icon">${t.icon}</div>
      <div class="tmpl-card-name">${_esc(t.name)}</div>
      <div class="tmpl-card-desc">${_esc(t.desc)}</div>
    </div>`).join('');

  grid.querySelectorAll('.tmpl-card').forEach(card => {
    card.addEventListener('click', () => {
      _selectedId = card.dataset.id;
      grid.querySelectorAll('.tmpl-card').forEach(c => c.classList.toggle('selected', c.dataset.id === _selectedId));
      _renderPreview();
    });
  });
}

function _renderPreview() {
  const previewEl = document.getElementById('tmpl-preview');
  if (!previewEl) return;
  const tmpl = TEMPLATES.find(t => t.id === _selectedId);
  if (!tmpl) return;

  const lines = _treeToLines(tmpl.tree, 0);
  previewEl.innerHTML = `
    <div class="tmpl-preview-title">Binder Structure</div>
    <div class="tmpl-tree">${lines.join('\n')}</div>`;
}

function _treeToLines(nodes, depth) {
  const lines = [];
  nodes.forEach(node => {
    const indent = '  '.repeat(depth);
    const icon   = node.type === 'folder' ? '📁 ' : '📄 ';
    const cls    = node.type === 'folder' ? 'folder' : '';
    lines.push(`${indent}<span class="${cls}">${icon}${_esc(node.title)}</span>`);
    if (node.children) lines.push(..._treeToLines(node.children, depth + 1));
  });
  return lines;
}

// ─── Apply ────────────────────────────────────────────────────────────────────

function _applyTemplate() {
  const tmpl    = TEMPLATES.find(t => t.id === _selectedId);
  if (!tmpl) return;

  const title   = _titleInput.trim() || tmpl.name;
  const project = createProject(title);
  // Remove the default starter document
  project.documents = [];

  _buildTree(project, tmpl.tree, null);

  saveProject(project);
  _onApply?.(project);
  showToast(`"${title}" created from ${tmpl.name} template`);
  _close();
}

function _buildTree(project, nodes, parentId) {
  nodes.forEach((node, i) => {
    const doc = createDocument(project, {
      type:     node.type,
      parentId,
      title:    node.title,
    });
    doc.synopsis = node.synopsis || '';
    doc.order    = i;
    if (node.content) doc.content = node.content;

    if (node.children) _buildTree(project, node.children, doc.id);
  });
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
