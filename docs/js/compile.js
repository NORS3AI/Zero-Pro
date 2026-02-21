// compile.js — One-click Compile Wizard with WYSIWYG preview (Phase 9)

// ─── Preset Definitions ───────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'kdp',
    name: 'KDP Novel',
    icon: '📚',
    desc: 'Amazon Kindle Direct Publishing format',
    css: `
      body{font-family:Georgia,serif;font-size:12pt;line-height:1.6;margin:1in;color:#111}
      h1{font-size:20pt;text-align:center;margin:2em 0 1em;page-break-before:always}
      h1:first-of-type{page-break-before:avoid}
      h2{font-size:14pt;margin:1.5em 0 0.5em}
      p{text-indent:.5in;margin:0}p:first-of-type,h1+p,h2+p{text-indent:0}
      .chapter-sep{text-align:center;margin:2em 0;letter-spacing:.3em}
    `,
  },
  {
    id: 'pod',
    name: 'Print on Demand',
    icon: '🖨️',
    desc: 'IngramSpark / print-ready interior format',
    css: `
      body{font-family:Georgia,serif;font-size:11pt;line-height:1.5;margin:.85in;color:#111}
      h1{font-size:16pt;text-align:center;margin:1.5em 0 .8em;page-break-before:always}
      h1:first-of-type{page-break-before:avoid}
      h2{font-size:12pt;margin:1.2em 0 .4em}
      p{text-indent:.35in;margin:0}p:first-of-type,h1+p,h2+p{text-indent:0}
      .chapter-sep{text-align:center;margin:1.5em 0}
    `,
  },
  {
    id: 'submission',
    name: 'Agent Submission',
    icon: '📨',
    desc: '12pt Times, double-spaced, 1" margins',
    css: `
      body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:2;margin:1in;color:#111}
      h1{font-size:12pt;text-transform:uppercase;text-align:center;margin:0 0 2em;font-weight:normal;page-break-before:always}
      h1:first-of-type{page-break-before:avoid}
      h2{font-size:12pt;text-align:center;margin:2em 0;font-weight:normal}
      p{text-indent:.5in;margin:0}p:first-of-type,h1+p,h2+p{text-indent:0}
      .chapter-sep{text-align:center;margin:1em 0}
    `,
  },
  {
    id: 'web',
    name: 'Web Article',
    icon: '🌐',
    desc: 'Clean HTML for blogs and web publishing',
    css: `
      body{font-family:-apple-system,system-ui,sans-serif;font-size:17px;line-height:1.7;
           max-width:680px;margin:40px auto;padding:0 20px;color:#1a1a1a;background:#fff}
      h1{font-size:2em;line-height:1.2;margin:0 0 .5em}
      h2{font-size:1.4em;margin:1.5em 0 .5em}
      p{margin:0 0 1em}
      hr{border:none;border-top:1px solid #ddd;margin:2em 0}
      .chapter-sep{text-align:center;color:#999;margin:2em 0}
    `,
  },
];

// ─── Module State ─────────────────────────────────────────────────────────────

let _project  = null;
let _step     = 1;
let _preset   = null;
let _included = new Set();
let _modal    = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Open the compile wizard for the given project. */
export function openCompileWizard(project) {
  _project = project;
  _step    = 1;
  _preset  = null;
  _included = new Set(
    (project.documents || [])
      .filter(d => d.type !== 'folder' && !d.inTrash)
      .map(d => d.id)
  );
  _buildModal();
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function _buildModal() {
  document.getElementById('compile-modal-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'compile-modal-backdrop';
  backdrop.className = 'compile-backdrop';
  backdrop.innerHTML = `
    <div class="compile-modal" role="dialog" aria-modal="true" aria-label="Compile Wizard">
      <div class="compile-header">
        <div class="compile-header-left">
          <span class="compile-title">Compile</span>
          <div class="compile-steps" aria-label="Wizard progress">
            <span class="compile-step" data-step="1">1 Preset</span>
            <span class="compile-step-sep" aria-hidden="true">›</span>
            <span class="compile-step" data-step="2">2 Configure</span>
            <span class="compile-step-sep" aria-hidden="true">›</span>
            <span class="compile-step" data-step="3">3 Preview</span>
          </div>
        </div>
        <button class="compile-close" id="compile-close-btn" aria-label="Close compile wizard">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
          </svg>
        </button>
      </div>
      <div class="compile-body" id="compile-body"></div>
      <div class="compile-footer" id="compile-footer"></div>
    </div>
  `;

  document.body.appendChild(backdrop);
  _modal = backdrop;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) _close(); });
  backdrop.querySelector('#compile-close-btn').addEventListener('click', _close);
  document.addEventListener('keydown', _onKey);

  _render();
}

function _close() {
  _modal?.remove();
  _modal = null;
  document.removeEventListener('keydown', _onKey);
}

function _onKey(e) {
  if (e.key === 'Escape') _close();
}

// ─── Step Rendering ───────────────────────────────────────────────────────────

function _render() {
  // Update step indicators
  document.querySelectorAll('.compile-step').forEach(el => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', n === _step);
    el.classList.toggle('done', n < _step);
  });

  if (_step === 1) _renderStep1();
  else if (_step === 2) _renderStep2();
  else _renderStep3();
}

// Step 1 — choose preset ──────────────────────────────────────────────────────

function _renderStep1() {
  const body   = document.getElementById('compile-body');
  const footer = document.getElementById('compile-footer');

  let customs = [];
  try { customs = JSON.parse(localStorage.getItem('zp_custom_presets') || '[]'); } catch { /**/ }

  const allPresets = [
    ...PRESETS,
    ...customs.map((p, i) => ({ ...p, id: `custom_${i}`, icon: '⭐', desc: 'Custom preset' })),
  ];

  body.innerHTML = `
    <div class="compile-step-content">
      <h3 class="compile-step-heading">Choose a preset</h3>
      <div class="compile-preset-grid">
        ${allPresets.map(p => `
          <button class="compile-preset-card${_preset?.id === p.id ? ' selected' : ''}"
                  data-preset-id="${_esc(p.id)}">
            <span class="compile-preset-icon">${p.icon}</span>
            <span class="compile-preset-name">${_esc(p.name)}</span>
            <span class="compile-preset-desc">${_esc(p.desc)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  footer.innerHTML = `
    <span></span>
    <button class="btn btn-primary" id="compile-next-1"${_preset ? '' : ' disabled'}>
      Next: Configure →
    </button>
  `;

  body.querySelectorAll('.compile-preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.presetId;
      _preset  = allPresets.find(p => p.id === id) ?? null;
      body.querySelectorAll('.compile-preset-card').forEach(c =>
        c.classList.toggle('selected', c.dataset.presetId === id));
      const nextBtn = document.getElementById('compile-next-1');
      if (nextBtn) nextBtn.disabled = !_preset;
    });
  });

  document.getElementById('compile-next-1')?.addEventListener('click', () => {
    _step = 2;
    _render();
  });
}

// Step 2 — configure ──────────────────────────────────────────────────────────

function _renderStep2() {
  const body   = document.getElementById('compile-body');
  const footer = document.getElementById('compile-footer');

  const docs    = (_project.documents || []).filter(d => !d.inTrash && d.type !== 'folder');
  const folders = (_project.documents || []).filter(d => !d.inTrash && d.type === 'folder');

  const rows = docs.map(d => {
    const folder = folders.find(f => f.id === d.parentId);
    return `
      <label class="compile-doc-row">
        <input type="checkbox" class="compile-doc-check" data-id="${_esc(d.id)}"
               ${_included.has(d.id) ? 'checked' : ''}>
        <span class="compile-doc-label">
          ${folder ? `<span class="compile-doc-folder">${_esc(folder.title)}&thinsp;/&thinsp;</span>` : ''}${_esc(d.title || 'Untitled')}
        </span>
        <span class="compile-doc-wc">${_wcStr(d)}</span>
      </label>
    `;
  }).join('');

  const title  = _project.title || '';
  const author = _project.settings?.author || '';

  body.innerHTML = `
    <div class="compile-step-content compile-step-2">
      <div class="compile-col">
        <h3 class="compile-step-heading">Select documents</h3>
        <div class="compile-doc-list">
          <label class="compile-doc-row compile-doc-all">
            <input type="checkbox" id="compile-check-all" ${_included.size === docs.length ? 'checked' : ''}>
            <span class="compile-doc-label"><strong>Select all</strong></span>
          </label>
          ${rows}
        </div>
      </div>
      <div class="compile-col">
        <h3 class="compile-step-heading">Options — ${_esc(_preset?.name ?? '')}</h3>
        <div class="compile-options">
          <div class="compile-option-row">
            <span>Project title</span>
            <input type="text" id="compile-title" class="settings-input"
                   value="${_esc(title)}" placeholder="Title">
          </div>
          <div class="compile-option-row">
            <span>Author</span>
            <input type="text" id="compile-author" class="settings-input"
                   value="${_esc(author)}" placeholder="Author name">
          </div>
          <div class="compile-option-row">
            <span>Chapter separator</span>
            <select id="compile-sep-style" class="settings-select" style="max-width:160px">
              <option value="none">None</option>
              <option value="asterisks" selected>* * *</option>
              <option value="diamond">◆</option>
              <option value="rule">Horizontal rule</option>
            </select>
          </div>
        </div>
        <div class="compile-save-preset">
          <input type="text" id="compile-save-name" class="settings-input"
                 placeholder="Save as custom preset…">
          <button class="btn" id="compile-save-preset-btn">Save</button>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn" id="compile-back-2">← Back</button>
    <button class="btn btn-primary" id="compile-next-2">Preview →</button>
  `;

  // Select all toggle
  document.getElementById('compile-check-all')?.addEventListener('change', e => {
    const on = e.target.checked;
    body.querySelectorAll('.compile-doc-check').forEach(cb => {
      cb.checked = on;
      if (on) _included.add(cb.dataset.id);
      else    _included.delete(cb.dataset.id);
    });
  });

  // Individual doc checks
  body.querySelectorAll('.compile-doc-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) _included.add(cb.dataset.id);
      else            _included.delete(cb.dataset.id);
    });
  });

  // Save custom preset
  document.getElementById('compile-save-preset-btn')?.addEventListener('click', () => {
    const name = document.getElementById('compile-save-name')?.value.trim();
    if (!name || !_preset) return;
    let customs = [];
    try { customs = JSON.parse(localStorage.getItem('zp_custom_presets') || '[]'); } catch { /**/ }
    customs.push({ ...JSON.parse(JSON.stringify(_preset)), name });
    localStorage.setItem('zp_custom_presets', JSON.stringify(customs));
    const inp = document.getElementById('compile-save-name');
    if (inp) inp.value = '';
  });

  document.getElementById('compile-back-2')?.addEventListener('click', () => { _step = 1; _render(); });
  document.getElementById('compile-next-2')?.addEventListener('click', () => { _step = 3; _render(); });
}

// Step 3 — preview + download ─────────────────────────────────────────────────

function _renderStep3() {
  const body   = document.getElementById('compile-body');
  const footer = document.getElementById('compile-footer');

  body.innerHTML = `
    <div class="compile-step-content compile-step-3">
      <iframe id="compile-preview-frame" class="compile-preview-frame"
              sandbox="allow-same-origin"
              title="Compiled manuscript preview"></iframe>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn" id="compile-back-3">← Back</button>
    <div class="compile-download-group">
      <button class="btn btn-primary" id="compile-dl-html">Download HTML</button>
      <button class="btn" id="compile-dl-txt">Download .txt</button>
      <button class="btn" id="compile-dl-md">Download .md</button>
    </div>
  `;

  // Compile and inject into iframe
  const html = _buildHtml();
  const frame = document.getElementById('compile-preview-frame');
  if (frame) frame.srcdoc = html;

  document.getElementById('compile-back-3')?.addEventListener('click', () => { _step = 2; _render(); });

  document.getElementById('compile-dl-html')?.addEventListener('click', () => {
    _download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${_filename()}.html`);
  });

  document.getElementById('compile-dl-txt')?.addEventListener('click', () => {
    _download(new Blob([_buildPlainText()], { type: 'text/plain;charset=utf-8' }), `${_filename()}.txt`);
  });

  document.getElementById('compile-dl-md')?.addEventListener('click', () => {
    _download(new Blob([_buildMarkdown()], { type: 'text/markdown;charset=utf-8' }), `${_filename()}.md`);
  });
}

// ─── Compile Helpers ──────────────────────────────────────────────────────────

function _orderedDocs() {
  return (_project.documents || [])
    .filter(d => !d.inTrash && d.type !== 'folder' && _included.has(d.id));
}

function _sepHtml() {
  const style = document.getElementById('compile-sep-style')?.value ?? 'asterisks';
  if (style === 'none')      return '';
  if (style === 'diamond')   return '<p class="chapter-sep">◆</p>';
  if (style === 'rule')      return '<hr>';
  return '<p class="chapter-sep">* &nbsp; * &nbsp; *</p>';
}

function _buildHtml() {
  const docs   = _orderedDocs();
  const title  = document.getElementById('compile-title')?.value  || _project.title  || 'Untitled';
  const author = document.getElementById('compile-author')?.value || _project.settings?.author || '';
  const sep    = _sepHtml();
  const css    = _preset?.css ?? '';

  const body = docs.map((d, i) => {
    const ch = `<h1>${_esc(d.title || 'Untitled')}</h1>${d.content || ''}`;
    return i === 0 ? ch : `${sep}${ch}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${_esc(title)}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  <div style="text-align:center;padding:2em 0 3em">
    <h1 style="page-break-before:avoid">${_esc(title)}</h1>
    ${author ? `<p style="text-indent:0;margin-top:.5em;font-size:1.1em">${_esc(author)}</p>` : ''}
  </div>
  ${body}
</body>
</html>`;
}

function _buildPlainText() {
  const docs   = _orderedDocs();
  const title  = document.getElementById('compile-title')?.value  || _project.title  || 'Untitled';
  const author = document.getElementById('compile-author')?.value || '';
  const header = author ? `${title}\nby ${author}` : title;

  return header + '\n' + '='.repeat(header.length) + '\n\n' +
    docs.map(d => {
      const h = d.title || 'Untitled';
      return `${h}\n${'-'.repeat(h.length)}\n\n${_htmlToText(d.content || '')}`;
    }).join('\n\n* * *\n\n');
}

function _buildMarkdown() {
  const docs   = _orderedDocs();
  const title  = document.getElementById('compile-title')?.value  || _project.title  || 'Untitled';
  const author = document.getElementById('compile-author')?.value || '';

  const header = `# ${title}` + (author ? `\n\n*by ${author}*` : '');
  return header + '\n\n' +
    docs.map(d => `## ${d.title || 'Untitled'}\n\n${_htmlToText(d.content || '')}`).join('\n\n---\n\n');
}

function _htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

function _wcStr(doc) {
  const text  = _htmlToText(doc.content || '');
  const count = text.split(/\s+/).filter(Boolean).length;
  return count ? `${count.toLocaleString()} w` : '';
}

function _filename() {
  const title = document.getElementById('compile-title')?.value || _project.title || 'manuscript';
  return title.replace(/[^a-z0-9\-_ ]/gi, '_');
}

function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
