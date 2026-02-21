// markdown-mode.js — Native Markdown mode with live split-pane preview (Phase 9)
//
// When active, hides the contenteditable editor and renders a split pane:
//   left  — monospaced textarea for Markdown source
//   right — live rendered preview via Marked.js
//
// Documents in Markdown mode store content as plain Markdown text (not HTML).
// doc.mode === 'markdown' is the flag in the project JSON.

// ─── State ────────────────────────────────────────────────────────────────────

let _active    = false;
let _doc       = null;
let _onSave    = null;
let _saveTimer = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enable Markdown mode for the given document.
 * @param {Object} doc      — current document object
 * @param {Function} onSave — called with new markdown string on change (debounced)
 */
export function enableMarkdownMode(doc, onSave) {
  _doc    = doc;
  _onSave = onSave;
  _active = true;
  _hideRichEditor();
  _buildSplitPane();
}

/**
 * Disable Markdown mode and restore the rich-text editor.
 */
export function disableMarkdownMode() {
  _active = false;
  _clearTimer();
  _destroySplitPane();
  _showRichEditor();
  _doc    = null;
  _onSave = null;
}

/** Returns true if Markdown mode is currently active. */
export function isMarkdownMode() { return _active; }

/**
 * Get the current Markdown source text from the textarea.
 * Returns null if Markdown mode is not active.
 */
export function getMarkdownContent() {
  if (!_active) return null;
  return document.getElementById('md-source')?.value ?? '';
}

/**
 * Convert HTML to plain Markdown (best-effort, no dependencies).
 * Used when toggling an existing rich-text doc into Markdown mode.
 * @param {string} html
 * @returns {string}
 */
export function htmlToMarkdown(html) {
  if (!html) return '';
  // If Marked is available and DOMPurify, use a div for text extraction
  const div = document.createElement('div');
  div.innerHTML = html;
  return _nodeToMd(div).trim();
}

/**
 * Convert Markdown to HTML using Marked.js (must be loaded on page).
 * @param {string} md
 * @returns {string}
 */
export function markdownToHtml(md) {
  if (!md) return '';
  if (typeof marked !== 'undefined') {
    return marked.parse(md);
  }
  // Naive fallback
  return md.split('\n').map(line => `<p>${line}</p>`).join('');
}

// ─── Split-pane Construction ──────────────────────────────────────────────────

function _buildSplitPane() {
  const editorPanel = document.getElementById('editor-pane');
  if (!editorPanel) return;

  document.getElementById('md-split-pane')?.remove();

  const pane = document.createElement('div');
  pane.id        = 'md-split-pane';
  pane.className = 'md-split-pane';
  pane.setAttribute('aria-label', 'Markdown editor');

  const src = _doc?.content ?? '';

  pane.innerHTML = `
    <div class="md-source-col">
      <div class="md-col-label">Markdown Source</div>
      <textarea id="md-source"
                class="md-source-textarea"
                spellcheck="true"
                aria-label="Markdown source editor"
                aria-multiline="true">${_escAttr(src)}</textarea>
    </div>
    <div class="md-divider" role="separator" aria-hidden="true"></div>
    <div class="md-preview-col">
      <div class="md-col-label">Preview</div>
      <div id="md-preview" class="md-preview-pane" aria-label="Rendered preview" aria-live="polite"></div>
    </div>
  `;

  // Insert before status bar (end of editor-pane)
  editorPanel.appendChild(pane);

  _renderPreview();

  document.getElementById('md-source')?.addEventListener('input', () => {
    _renderPreview();
    _scheduleSave();
  });
}

function _renderPreview() {
  const src     = document.getElementById('md-source')?.value ?? '';
  const preview = document.getElementById('md-preview');
  if (!preview) return;

  if (typeof marked !== 'undefined') {
    try {
      preview.innerHTML = marked.parse(src);
    } catch {
      preview.textContent = src;
    }
  } else {
    // Minimal fallback: preserve line breaks
    preview.textContent = src;
  }
}

function _destroySplitPane() {
  document.getElementById('md-split-pane')?.remove();
}

// ─── Rich Editor Visibility ───────────────────────────────────────────────────

function _hideRichEditor() {
  const editorEl  = document.getElementById('editor');
  const fmtBar    = document.getElementById('editor-toolbar');
  const container = document.getElementById('editor-container');
  if (editorEl)  editorEl.style.display  = 'none';
  if (container) container.style.display = 'none';
  if (fmtBar)    fmtBar.style.display    = 'none';
}

function _showRichEditor() {
  const editorEl  = document.getElementById('editor');
  const fmtBar    = document.getElementById('editor-toolbar');
  const container = document.getElementById('editor-container');
  if (editorEl)  editorEl.style.display  = '';
  if (container) container.style.display = '';
  if (fmtBar)    fmtBar.style.display    = '';
}

// ─── Autosave ─────────────────────────────────────────────────────────────────

function _scheduleSave() {
  _clearTimer();
  _saveTimer = setTimeout(() => {
    _onSave?.(document.getElementById('md-source')?.value ?? '');
  }, 800);
}

function _clearTimer() {
  clearTimeout(_saveTimer);
  _saveTimer = null;
}

// ─── HTML → Markdown Conversion ───────────────────────────────────────────────

function _nodeToMd(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';

  const tag = node.nodeName.toLowerCase();
  const children = Array.from(node.childNodes).map(_nodeToMd).join('');

  switch (tag) {
    case 'h1': return `# ${children.trim()}\n\n`;
    case 'h2': return `## ${children.trim()}\n\n`;
    case 'h3': return `### ${children.trim()}\n\n`;
    case 'p':  return `${children.trim()}\n\n`;
    case 'br': return '\n';
    case 'strong': case 'b': return `**${children}**`;
    case 'em':     case 'i': return `*${children}*`;
    case 's': case 'del':    return `~~${children}~~`;
    case 'u': return children; // underline has no Markdown equivalent
    case 'code': return `\`${children}\``;
    case 'pre':  return `\`\`\`\n${children}\n\`\`\`\n\n`;
    case 'blockquote': return children.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
    case 'ul': return children + '\n';
    case 'ol': return children + '\n';
    case 'li': return `- ${children.trim()}\n`;
    case 'a': {
      const href = node.getAttribute('href') || '';
      return `[${children}](${href})`;
    }
    case 'img': {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }
    case 'hr': return '---\n\n';
    default:   return children;
  }
}

function _escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
