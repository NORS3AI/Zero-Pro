// pdf-viewer.js — PDF viewer with colour-coded highlights and margin notes (Phase 10)
// Uses PDF.js (loaded via CDN script tag on index.html).
// PDF binary is cached in sessionStorage; doc.annotations stored in project JSON.

import { saveProject } from './storage.js';
import { showToast } from './ui.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', css: 'rgba(255,230,0,0.45)' },
  { id: 'green',  label: 'Green',  css: 'rgba(80,200,120,0.45)' },
  { id: 'blue',   label: 'Blue',   css: 'rgba(100,180,255,0.45)' },
  { id: 'pink',   label: 'Pink',   css: 'rgba(255,120,150,0.45)' },
];

const SESSION_KEY_PREFIX = 'zp_pdf_';

// ─── State ────────────────────────────────────────────────────────────────────

let _doc             = null;    // current binder doc (type='pdf')
let _project         = null;
let _onAnnotationChange = null;
let _pdfInstance     = null;    // PDF.js document
let _currentPage     = 1;
let _totalPages      = 0;
let _scale           = 1.5;
let _highlightMode   = false;
let _activeColor     = 'yellow';
let _dragStart       = null;    // {x, y, pageNum}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise module. Call once at app boot.
 * @param {{ getProject: () => Object, onAnnotationChange: (project: Object) => void }} opts
 */
export function initPdfViewer({ getProject, onAnnotationChange }) {
  _onAnnotationChange = onAnnotationChange;

  // Configure PDF.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
}

/**
 * Load and display a PDF binder document.
 * @param {Object} doc    — binder document with type='pdf'
 * @param {Object} project
 */
export async function loadPdfDoc(doc, project) {
  _doc     = doc;
  _project = project;
  _currentPage = 1;

  const container = document.getElementById('pdf-viewer-pane');
  if (!container) return;

  // Ensure annotations array exists
  if (!_doc.annotations) _doc.annotations = [];

  const cached = sessionStorage.getItem(SESSION_KEY_PREFIX + doc.id);

  if (cached) {
    await _renderPdf(cached);
  } else {
    _showImportPrompt(container);
  }
}

/** Re-render when switching back to a PDF doc. */
export function refreshPdfView(doc, project) {
  if (!doc || doc.type !== 'pdf') return;
  loadPdfDoc(doc, project);
}

// ─── Import prompt ────────────────────────────────────────────────────────────

function _showImportPrompt(container) {
  const scroll = document.getElementById('pdf-scroll');
  if (!scroll) return;
  scroll.innerHTML = `
    <div class="pdf-import-prompt">
      <span class="pdf-import-prompt-icon">📄</span>
      <p>PDF is not cached for this session.<br>Re-open the PDF file to view and annotate it.</p>
      <label class="btn btn-primary" style="cursor:pointer">
        Open PDF file
        <input type="file" id="pdf-reopen-input" accept=".pdf" style="display:none">
      </label>
    </div>`;

  document.getElementById('pdf-reopen-input')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      sessionStorage.setItem(SESSION_KEY_PREFIX + _doc.id, dataUrl);
      // Update doc title from filename if not set
      if (!_doc.pdfTitle) {
        _doc.pdfTitle = file.name;
      }
      await _renderPdf(dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

// ─── PDF Rendering ────────────────────────────────────────────────────────────

async function _renderPdf(dataUrl) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF.js not loaded — check your internet connection');
    return;
  }

  try {
    _pdfInstance = await pdfjsLib.getDocument(dataUrl).promise;
    _totalPages  = _pdfInstance.numPages;
    _updatePageCounter();
    await _renderAllPages();
  } catch (err) {
    showToast('Could not read PDF file');
    console.error('PDF render error:', err);
  }
}

async function _renderAllPages() {
  const scroll = document.getElementById('pdf-scroll');
  if (!scroll) return;
  scroll.innerHTML = '';

  for (let p = 1; p <= _totalPages; p++) {
    const page = await _pdfInstance.getPage(p);
    const wrap = await _renderPage(page, p);
    scroll.appendChild(wrap);
  }

  _drawAllAnnotations();
  _attachAnnotationEvents();
}

async function _renderPage(pdfPage, pageNum) {
  const viewport = pdfPage.getViewport({ scale: _scale });

  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-canvas';
  canvas.width     = viewport.width;
  canvas.height    = viewport.height;

  const ctx = canvas.getContext('2d');
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;

  const annLayer = document.createElement('div');
  annLayer.className = 'pdf-annotation-layer';
  annLayer.dataset.page = pageNum;

  const wrap = document.createElement('div');
  wrap.className = 'pdf-page-wrap';
  wrap.dataset.page = pageNum;
  wrap.style.width  = `${viewport.width}px`;
  wrap.style.height = `${viewport.height}px`;
  wrap.appendChild(canvas);
  wrap.appendChild(annLayer);

  return wrap;
}

// ─── Annotation Rendering ─────────────────────────────────────────────────────

function _drawAllAnnotations() {
  if (!_doc?.annotations) return;
  _doc.annotations.forEach(ann => _drawAnnotation(ann));
}

function _drawAnnotation(ann) {
  const layer = document.querySelector(`.pdf-annotation-layer[data-page="${ann.page}"]`);
  if (!layer) return;

  // Remove existing element with same id
  layer.querySelector(`[data-ann-id="${ann.id}"]`)?.remove();

  const wrap = document.querySelector(`.pdf-page-wrap[data-page="${ann.page}"]`);
  const pageW = wrap ? parseFloat(wrap.style.width)  || 600 : 600;
  const pageH = wrap ? parseFloat(wrap.style.height) || 800 : 800;

  const colorDef = HIGHLIGHT_COLORS.find(c => c.id === ann.color) ?? HIGHLIGHT_COLORS[0];
  const el = document.createElement('div');
  el.className = 'pdf-highlight';
  el.dataset.annId = ann.id;
  el.style.left    = `${ann.x * pageW}px`;
  el.style.top     = `${ann.y * pageH}px`;
  el.style.width   = `${ann.w * pageW}px`;
  el.style.height  = `${ann.h * pageH}px`;
  el.style.background = colorDef.css;
  el.title = ann.note || 'Click to add note';

  el.addEventListener('click', e => {
    e.stopPropagation();
    _openNoteTooltip(ann, el);
  });

  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    _deleteAnnotation(ann.id);
  });

  layer.appendChild(el);
}

// ─── Annotation Events ────────────────────────────────────────────────────────

function _attachAnnotationEvents() {
  document.querySelectorAll('.pdf-annotation-layer').forEach(layer => {
    const pageNum = parseInt(layer.dataset.page, 10);
    const wrap    = layer.closest('.pdf-page-wrap');

    layer.addEventListener('mousedown', e => {
      if (!_highlightMode) return;
      const rect = wrap.getBoundingClientRect();
      _dragStart = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
        page: pageNum,
      };
    });

    layer.addEventListener('mouseup', e => {
      if (!_highlightMode || !_dragStart || _dragStart.page !== pageNum) return;
      const rect = wrap.getBoundingClientRect();
      const ex   = (e.clientX - rect.left) / rect.width;
      const ey   = (e.clientY - rect.top)  / rect.height;

      const x = Math.min(_dragStart.x, ex);
      const y = Math.min(_dragStart.y, ey);
      const w = Math.abs(ex - _dragStart.x);
      const h = Math.abs(ey - _dragStart.y);

      if (w > 0.01 && h > 0.005) {
        _addAnnotation({ page: pageNum, x, y, w, h });
      }
      _dragStart = null;
    });
  });
}

function _addAnnotation(props) {
  if (!_doc) return;
  const ann = {
    id:    Math.random().toString(36).slice(2),
    page:  props.page,
    x:     props.x,
    y:     props.y,
    w:     props.w,
    h:     props.h,
    color: _activeColor,
    note:  '',
  };
  _doc.annotations = [...(_doc.annotations || []), ann];
  _drawAnnotation(ann);
  _saveAnnotations();
}

function _deleteAnnotation(annId) {
  if (!_doc) return;
  _doc.annotations = (_doc.annotations || []).filter(a => a.id !== annId);
  document.querySelector(`[data-ann-id="${annId}"]`)?.remove();
  _saveAnnotations();
  showToast('Annotation removed');
}

function _saveAnnotations() {
  if (!_project || !_doc) return;
  _onAnnotationChange?.(_project);
  saveProject(_project);
}

// ─── Note Tooltip ─────────────────────────────────────────────────────────────

function _openNoteTooltip(ann, highlightEl) {
  document.getElementById('pdf-note-tooltip')?.remove();

  const rect = highlightEl.getBoundingClientRect();
  const tip  = document.createElement('div');
  tip.id        = 'pdf-note-tooltip';
  tip.className = 'pdf-note-tooltip';

  tip.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--text)">Note</span>
      <button id="pdf-note-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:0">×</button>
    </div>
    <textarea id="pdf-note-text" placeholder="Add a note to this highlight…" rows="3">${_esc(ann.note)}</textarea>
    <div style="display:flex;justify-content:space-between;margin-top:8px">
      <button class="btn btn-danger btn-sm" id="pdf-note-delete">Delete highlight</button>
      <button class="btn btn-primary btn-sm" id="pdf-note-save">Save</button>
    </div>`;

  tip.style.top  = `${Math.min(rect.bottom + 8, window.innerHeight - 200)}px`;
  tip.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;

  document.body.appendChild(tip);

  const close = () => tip.remove();
  document.getElementById('pdf-note-close')?.addEventListener('click', close);
  document.getElementById('pdf-note-save')?.addEventListener('click', () => {
    ann.note = document.getElementById('pdf-note-text')?.value ?? '';
    highlightEl.title = ann.note || 'Click to add note';
    _saveAnnotations();
    close();
  });
  document.getElementById('pdf-note-delete')?.addEventListener('click', () => {
    _deleteAnnotation(ann.id);
    close();
  });

  // Close on outside click
  const onOut = e => {
    if (!tip.contains(e.target)) { close(); document.removeEventListener('mousedown', onOut); }
  };
  setTimeout(() => document.addEventListener('mousedown', onOut), 0);
}

// ─── Toolbar Controls (called from app.js after binding) ──────────────────────

/** Toggle highlight mode. */
export function togglePdfHighlightMode() {
  _highlightMode = !_highlightMode;
  document.querySelectorAll('.pdf-annotation-layer').forEach(l =>
    l.classList.toggle('highlight-mode', _highlightMode));
  const btn = document.getElementById('pdf-highlight-mode-btn');
  if (btn) {
    btn.classList.toggle('active', _highlightMode);
    btn.textContent = _highlightMode ? '✓ Highlight On' : '✏️ Highlight';
  }
}

/** Set active highlight colour. */
export function setPdfColor(colorId) {
  _activeColor = colorId;
  document.querySelectorAll('.pdf-color-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.color === colorId));
}

/** Navigate to a page number. */
export async function goPdfPage(pageNum) {
  if (!_pdfInstance) return;
  _currentPage = Math.max(1, Math.min(pageNum, _totalPages));
  _updatePageCounter();
  // Scroll to that page's wrap
  const wrap = document.querySelector(`.pdf-page-wrap[data-page="${_currentPage}"]`);
  wrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Change zoom scale and re-render. */
export async function setPdfScale(scale) {
  _scale = scale;
  if (_pdfInstance) await _renderAllPages();
}

/** Import a PDF file from an <input type=file> (called from toolbar button). */
export function triggerPdfImport(doc, project) {
  _doc     = doc;
  _project = project;
  const inp = document.createElement('input');
  inp.type   = 'file';
  inp.accept = '.pdf';
  inp.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast('Loading PDF…');
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      sessionStorage.setItem(SESSION_KEY_PREFIX + doc.id, dataUrl);
      _doc.pdfTitle = file.name;
      _doc.pdfPages = 0; // will be set after render
      saveProject(project);
      await _renderPdf(dataUrl);
      showToast(`PDF loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  });
  inp.click();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _updatePageCounter() {
  const inp = document.getElementById('pdf-page-input');
  const tot = document.getElementById('pdf-page-total');
  if (inp) inp.value = _currentPage;
  if (tot) tot.textContent = `/ ${_totalPages}`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
