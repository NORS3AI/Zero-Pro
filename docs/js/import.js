// import.js — Import .txt and .md files as documents; restore project from JSON backup

import { createDocument } from './storage.js';

// ─── File Reader ──────────────────────────────────────────────────────────────

/** Wrap FileReader in a Promise */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.readAsText(file, 'UTF-8');
  });
}

// ─── Conversion Helpers ───────────────────────────────────────────────────────

/** Plain text → paragraph HTML, preserving double-line-break as paragraph breaks */
function txtToHtml(text) {
  return text
    .split(/\r?\n\r?\n+/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => `<p>${para.replace(/\r?\n/g, '<br>')}</p>`)
    .join('') || '<p></p>';
}

/** Minimal Markdown → HTML (headings, bold, italic, lists, blockquotes, hr, paragraphs) */
function mdToHtml(md) {
  const blocks = md.replace(/\r\n/g, '\n').split(/\n\n+/);

  return blocks.map(block => {
    const b = block.trim();
    if (!b) return '';

    if (b.startsWith('### ')) return `<h3>${_inline(b.slice(4))}</h3>`;
    if (b.startsWith('## '))  return `<h2>${_inline(b.slice(3))}</h2>`;
    if (b.startsWith('# '))   return `<h1>${_inline(b.slice(2))}</h1>`;

    if (b.startsWith('> '))
      return `<blockquote>${_inline(b.replace(/^> ?/gm, '').trim())}</blockquote>`;

    if (/^[-*]{3,}$/.test(b) || /^_{3,}$/.test(b)) return '<hr>';

    // Unordered list
    if (/^[-*+] /m.test(b)) {
      const items = b.split('\n')
        .filter(l => l.trim())
        .map(l => `<li>${_inline(l.replace(/^[-*+] /, ''))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    // Ordered list
    if (/^\d+\. /m.test(b)) {
      const items = b.split('\n')
        .filter(l => l.trim())
        .map(l => `<li>${_inline(l.replace(/^\d+\. /, ''))}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    return `<p>${_inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('') || '<p></p>';
}

/** Process inline markdown: bold, italic, strikethrough */
function _inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/_(.+?)_/g,       '<em>$1</em>')
    .replace(/~~(.+?)~~/g,     '<s>$1</s>');
}

/** Count words in a plain-text string */
function _wordCount(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.innerText.match(/\S+/g) || []).length;
}

// ─── Public Import Functions ──────────────────────────────────────────────────

/**
 * Import a .txt file as a new document.
 * @param {File} file
 * @param {Object} project
 * @param {string|null} parentId  — folder to place the new doc in
 * @returns {Promise<Object>} the created document
 */
export async function importTxt(file, project, parentId = null) {
  const text    = await readFile(file);
  const title   = file.name.replace(/\.txt$/i, '');
  const content = txtToHtml(text);
  const doc     = createDocument(project, { type: 'doc', parentId, title });
  doc.content   = content;
  doc.wordCount = _wordCount(content);
  return doc;
}

/**
 * Import a .md file as a new document.
 * @param {File} file
 * @param {Object} project
 * @param {string|null} parentId
 * @returns {Promise<Object>} the created document
 */
export async function importMd(file, project, parentId = null) {
  const text  = await readFile(file);
  // Use first H1 as the title if present
  const h1    = text.match(/^#\s+(.+)/m);
  const title = h1 ? h1[1].trim() : file.name.replace(/\.(md|markdown)$/i, '');
  const content = mdToHtml(text);
  const doc   = createDocument(project, { type: 'doc', parentId, title });
  doc.content   = content;
  doc.wordCount = _wordCount(content);
  return doc;
}

/**
 * Parse and validate a .zeropro.json backup file.
 * @param {File} file
 * @returns {Promise<Object|null>} the project or null if invalid
 */
export async function importProjectJson(file) {
  try {
    const text    = await readFile(file);
    const project = JSON.parse(text);
    if (!project.id || !project.title || !Array.isArray(project.documents)) {
      return null;
    }
    return project;
  } catch {
    return null;
  }
}

// ─── File Input Wiring ────────────────────────────────────────────────────────

/**
 * Create hidden file inputs and return trigger functions.
 * @param {{ onImportDocs: (files: File[]) => void, onRestoreProject: (file: File) => void }} opts
 * @returns {{ triggerDocImport: () => void, triggerProjectImport: () => void }}
 */
export function initImport({ onImportDocs, onRestoreProject }) {
  const docInput = _fileInput('.txt,.md,.markdown,text/plain', true);
  docInput.addEventListener('change', () => {
    const files = Array.from(docInput.files);
    if (files.length) onImportDocs(files);
    docInput.value = '';
  });

  const jsonInput = _fileInput('.json,application/json', false);
  jsonInput.addEventListener('change', () => {
    const file = jsonInput.files[0];
    if (file) onRestoreProject(file);
    jsonInput.value = '';
  });

  // Drag-and-drop .txt/.md onto the centre pane
  const dropZone = document.getElementById('center-pane');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => {
      const hasDocs = Array.from(e.dataTransfer.items).some(i =>
        i.kind === 'file' && (i.type === 'text/plain' || i.type === 'text/markdown' ||
        i.type === '' /* .md has no MIME in some browsers */)
      );
      if (hasDocs) { e.preventDefault(); dropZone.classList.add('drag-over'); }
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f =>
        /\.(txt|md|markdown)$/i.test(f.name)
      );
      if (files.length) onImportDocs(files);
    });
  }

  return {
    triggerDocImport:     () => docInput.click(),
    triggerProjectImport: () => jsonInput.click(),
  };
}

function _fileInput(accept, multiple) {
  const el = document.createElement('input');
  el.type     = 'file';
  el.accept   = accept;
  el.multiple = multiple;
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
}
