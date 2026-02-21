// smart-type.js — Smart typography for the contenteditable editor (Phase 13)
// Replaces straight quotes with curly quotes, double-hyphens with em-dashes,
// and triple dots with ellipses. Controlled per-setting; shows a brief toast.

// ─── State ────────────────────────────────────────────────────────────────────

let _editor   = null;
let _settings = { smartQuotes: true, smartDashes: true };
let _indicator = null;
let _hideTimer = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise smart typography.
 * @param {HTMLElement} editorEl  The contenteditable editor element.
 * @param {{ smartQuotes?: boolean, smartDashes?: boolean }} settings
 */
export function initSmartType(editorEl, settings = {}) {
  _editor   = editorEl;
  _settings = { smartQuotes: true, smartDashes: true, ...settings };
  _indicator = _buildIndicator();
  document.body.appendChild(_indicator);

  editorEl.addEventListener('keydown', _onKeyDown);
}

/**
 * Update settings without re-attaching the listener.
 * @param {{ smartQuotes?: boolean, smartDashes?: boolean }} settings
 */
export function updateSmartTypeSettings(settings) {
  _settings = { ..._settings, ...settings };
}

// ─── Key Handler ──────────────────────────────────────────────────────────────

function _onKeyDown(e) {
  const { key } = e;

  // Smart quotes
  if (_settings.smartQuotes) {
    if (key === '"') {
      e.preventDefault();
      _insertReplacement(_isOpeningContext() ? '\u201C' : '\u201D', '"');
      return;
    }
    if (key === "'") {
      e.preventDefault();
      _insertReplacement(_isOpeningContext() ? '\u2018' : '\u2019', "'");
      return;
    }
  }

  // Smart dashes and ellipsis — handled after the character lands via input
  // We watch for the hyphen key and check what precedes the cursor on each press.
  if (_settings.smartDashes && key === '-') {
    // We need to check if the character immediately before cursor is already '-'
    const before = _textBefore();
    if (before.endsWith('-')) {
      // Replace the existing '-' + this new '-' with an em-dash
      e.preventDefault();
      _deleteChars(1);
      _insertReplacement('\u2014', '--');
      return;
    }
  }

  // Ellipsis: on '.' when the two chars before are '..'
  if (_settings.smartDashes && key === '.') {
    const before = _textBefore();
    if (before.endsWith('..')) {
      e.preventDefault();
      _deleteChars(2);
      _insertReplacement('\u2026', '...');
      return;
    }
  }
}

// ─── Context Detection ────────────────────────────────────────────────────────

/**
 * True when a quote should be an opening quote.
 * A quote is "opening" when the character before the cursor is whitespace,
 * a bracket, the start of the node, or another opening punctuation.
 */
function _isOpeningContext() {
  const before = _textBefore();
  if (!before) return true;
  const last = before[before.length - 1];
  return /[\s(\[{'"–—]/.test(last);
}

/** Return the text in the current text node up to the caret. */
function _textBefore() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return '';
  const range = sel.getRangeAt(0);
  const node  = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return '';
  return node.textContent.slice(0, range.startOffset);
}

// ─── Insertion Helpers ────────────────────────────────────────────────────────

/**
 * Delete `n` characters immediately before the caret in the current text node.
 */
function _deleteChars(n) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0).cloneRange();
  range.setStart(range.startContainer, Math.max(0, range.startOffset - n));
  range.deleteContents();
}

/**
 * Insert `char` at the caret using execCommand for undo-stack compatibility,
 * falling back to a direct Range insert. Then show the indicator.
 */
function _insertReplacement(char, original) {
  // execCommand is deprecated but still widely supported in contenteditable;
  // it integrates with the browser's native undo stack.
  const inserted = document.execCommand('insertText', false, char);
  if (!inserted) {
    // Fallback: manual range insert
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(char));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Dispatch input so autosave fires
  _editor?.dispatchEvent(new Event('input', { bubbles: true }));

  _showIndicator(original, char);
}

// ─── Indicator ────────────────────────────────────────────────────────────────

function _buildIndicator() {
  const el = document.createElement('div');
  el.className = 'smart-type-indicator';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function _showIndicator(from, to) {
  if (!_indicator) return;
  _indicator.textContent = `${from} → ${to}`;
  _indicator.classList.add('visible');
  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(() => _indicator.classList.remove('visible'), 1200);
}
