// plot-templates.js — Plot structure templates (Phase 12)
// Provides Three-Act Structure, Hero's Journey, Save the Cat, and Freytag's Pyramid.
// Applying a template creates a folder/document structure in the binder.

import { createDocument, saveProject } from './storage.js';
import { showToast } from './ui.js';

// ─── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id:   'three-act',
    name: 'Three-Act Structure',
    icon: '🎭',
    desc: 'The classic Hollywood structure: Setup → Confrontation → Resolution.',
    stages: [
      { name: 'Act 1 — Setup',        desc: 'Introduce protagonist, world, and inciting incident.' },
      { name: 'Act 2A — Rising Action',desc: 'Protagonist pursues goal; obstacles mount.' },
      { name: 'Act 2B — Dark Night',  desc: 'Midpoint reversal; all seems lost.' },
      { name: 'Act 3 — Resolution',   desc: 'Climax, confrontation, and denouement.' },
    ],
  },
  {
    id:   'heros-journey',
    name: "Hero's Journey",
    icon: '⚔️',
    desc: "Campbell's monomyth: 12 stages from Ordinary World to Return with Elixir.",
    stages: [
      { name: '1. Ordinary World',     desc: 'The hero's normal life before the adventure.' },
      { name: '2. Call to Adventure',  desc: 'A problem or challenge presents itself.' },
      { name: '3. Refusal of Call',    desc: 'The hero hesitates or refuses.' },
      { name: '4. Meeting the Mentor', desc: 'A wise figure offers guidance.' },
      { name: '5. Crossing Threshold', desc: 'The hero commits to the journey.' },
      { name: '6. Tests & Allies',     desc: 'Challenges, enemies, and new friends.' },
      { name: '7. Approach the Cave',  desc: 'Preparing for the major ordeal.' },
      { name: '8. The Ordeal',         desc: 'The central crisis — hero faces death/fear.' },
      { name: '9. Reward',             desc: 'The hero seizes the prize.' },
      { name: '10. The Road Back',     desc: 'Returning home with consequences.' },
      { name: '11. Resurrection',      desc: 'Final test — hero is transformed.' },
      { name: '12. Return with Elixir',desc: 'Hero returns changed, with something of value.' },
    ],
  },
  {
    id:   'save-the-cat',
    name: 'Save the Cat',
    icon: '🐱',
    desc: "Blake Snyder's 15-beat industry standard for commercial storytelling.",
    stages: [
      { name: '1. Opening Image',      desc: 'A visual that sets the tone and theme.' },
      { name: '2. Theme Stated',       desc: 'Someone states what the story is about.' },
      { name: '3. Set-Up',             desc: 'Introduce hero's world, flaws, and needs.' },
      { name: '4. Catalyst',           desc: 'The inciting incident (pp. 12).' },
      { name: '5. Debate',             desc: 'Should the hero take the leap?' },
      { name: '6. Break into Two',     desc: 'Hero chooses to enter a new world (pp. 25).' },
      { name: '7. B Story',            desc: 'A secondary story (often a love story) begins.' },
      { name: '8. Fun and Games',      desc: 'The premise is explored (pp. 25–55).' },
      { name: '9. Midpoint',           desc: 'False peak or false valley (pp. 55).' },
      { name: '10. Bad Guys Close In', desc: 'Pressure mounts; team falls apart.' },
      { name: '11. All Is Lost',       desc: 'Whiff of death — opposite of opening.' },
      { name: '12. Dark Night of Soul',desc: 'Hero at lowest ebb; finds new resolve.' },
      { name: '13. Break into Three',  desc: 'Solution found; hero acts (pp. 75).' },
      { name: '14. Finale',            desc: 'Storm the castle; old world overthrown.' },
      { name: '15. Final Image',       desc: 'Mirrors opening — shows transformation.' },
    ],
  },
  {
    id:   'freytag',
    name: "Freytag's Pyramid",
    icon: '🔺',
    desc: 'Classical dramatic structure: Exposition → Rising Action → Climax → Falling Action → Dénouement.',
    stages: [
      { name: 'Exposition',      desc: 'Background information; world and characters introduced.' },
      { name: 'Rising Action',   desc: 'Complications arise; conflict builds.' },
      { name: 'Climax',          desc: 'The turning point of maximum tension.' },
      { name: 'Falling Action',  desc: 'Events unwind after the climax.' },
      { name: 'Dénouement',      desc: 'Resolution; loose ends tied up.' },
    ],
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject      = null;
let _onProjectChange = null;
let _modal           = null;
let _selectedId      = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export function initPlotTemplates({ getProject, onProjectChange }) {
  _getProject      = getProject;
  _onProjectChange = onProjectChange;
}

export function openPlotTemplates() {
  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }
  _selectedId = TEMPLATES[0].id;
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _renderTemplates();
  _renderStages(_selectedId);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'pt-overlay';
  overlay.className = 'p12-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Plot Structure Templates');

  overlay.innerHTML = `
    <div class="pt-modal">
      <div class="pt-header">
        <h3>Plot Structure Templates</h3>
        <button class="pt-close" aria-label="Close">&times;</button>
      </div>
      <div class="pt-body">
        <div class="pt-grid" id="pt-grid"></div>
        <div class="pt-stages" id="pt-stages"></div>
      </div>
      <div class="pt-footer">
        <button class="btn btn-ghost" id="pt-cancel">Cancel</button>
        <button class="btn" id="pt-apply">Apply to Binder</button>
      </div>
    </div>`;

  overlay.querySelector('.pt-close').addEventListener('click', _close);
  overlay.querySelector('#pt-cancel').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#pt-apply').addEventListener('click', _applyTemplate);

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _renderTemplates() {
  const grid = document.getElementById('pt-grid');
  if (!grid) return;
  grid.innerHTML = TEMPLATES.map(t => `
    <div class="pt-card${t.id === _selectedId ? ' selected' : ''}" data-id="${t.id}">
      <div class="pt-card-icon">${t.icon}</div>
      <div class="pt-card-name">${_esc(t.name)}</div>
      <div class="pt-card-desc">${_esc(t.desc)}</div>
    </div>`).join('');

  grid.querySelectorAll('.pt-card').forEach(card => {
    card.addEventListener('click', () => {
      _selectedId = card.dataset.id;
      grid.querySelectorAll('.pt-card').forEach(c => c.classList.toggle('selected', c.dataset.id === _selectedId));
      _renderStages(_selectedId);
    });
  });
}

function _renderStages(templateId) {
  const stagesEl = document.getElementById('pt-stages');
  if (!stagesEl) return;

  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;

  stagesEl.innerHTML = tmpl.stages.map((s, i) => `
    <div class="pt-stage">
      <span class="pt-stage-num">${i + 1}</span>
      <div>
        <div class="pt-stage-name">${_esc(s.name)}</div>
        <div class="pt-stage-desc">${_esc(s.desc)}</div>
      </div>
    </div>`).join('');
}

// ─── Apply Template ───────────────────────────────────────────────────────────

function _applyTemplate() {
  const project  = _getProject?.();
  const tmpl     = TEMPLATES.find(t => t.id === _selectedId);
  if (!project || !tmpl) return;

  // Create a top-level folder named after the template
  const folder = createDocument(project, {
    type: 'folder',
    parentId: null,
    title: tmpl.name,
  });

  // Create a scene doc for each stage
  tmpl.stages.forEach((stage, i) => {
    const doc = createDocument(project, {
      type:     'doc',
      parentId: folder.id,
      title:    stage.name,
    });
    doc.synopsis = stage.desc;
    doc.order    = i;
  });

  saveProject(project);
  _onProjectChange?.(project);
  showToast(`"${tmpl.name}" structure added to binder`);
  _close();
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
