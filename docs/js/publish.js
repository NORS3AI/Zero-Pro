// publish.js — Phase 5: Kindle & Publishing Support
// EPUB 3 export, Kindle guide, KDP/IngramSpark wizards, submission formatter,
// self-publishing checklist, genre style guides, front/back matter templates.

// ─── Module State ─────────────────────────────────────────────────────────────

let _getProject = null;
let _onAddDoc   = null;

// ─── Small Helpers ────────────────────────────────────────────────────────────

function _esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _safeFilename(title) {
  return (title || 'document').replace(/[^a-z0-9\-_ ]/gi, '_').trim();
}

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** All non-trash doc-type documents sorted by their order field */
function _getCompiledDocs(project) {
  return project.documents
    .filter(d => !d.inTrash && d.type === 'doc')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Mirrors ui.js showToast without a circular import */
function _showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Modal Factory ────────────────────────────────────────────────────────────

/**
 * Create and attach a publish modal.
 * Returns { backdrop, close } so callers can wire their own buttons.
 */
function _createModal(title, bodyHtml, footerHtml) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal publish-modal" role="dialog" aria-modal="true" aria-labelledby="pub-modal-title">
      <div class="pub-modal-header">
        <h3 id="pub-modal-title">${title}</h3>
        <button class="pub-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="pub-modal-body">${bodyHtml}</div>
      <div class="pub-modal-footer">${footerHtml}</div>
    </div>`;
  document.body.appendChild(backdrop);

  // Focus the close button so keyboard users can immediately dismiss
  backdrop.querySelector('.pub-modal-close')?.focus();

  const close = () => {
    if (document.body.contains(backdrop)) document.body.removeChild(backdrop);
  };

  backdrop.querySelector('.pub-modal-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

  const escHandler = e => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  return { backdrop, close };
}

// ─── EPUB 3 Export ────────────────────────────────────────────────────────────

/**
 * Build and download a valid EPUB 3 file for the full project.
 * Requires JSZip to be loaded on the page (CDN script tag).
 */
export async function exportAsEpub(project) {
  if (typeof JSZip === 'undefined') {
    alert('EPUB export requires the JSZip library. Please check your connection and reload the page.');
    return;
  }

  const zip    = new JSZip();
  const docs   = _getCompiledDocs(project);
  const title  = project.title || 'My Novel';
  const author = project.settings?.author || 'Unknown Author';
  const uid    = _uuid();
  const now    = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // ── mimetype (must be first entry, uncompressed) ───────────────────────────
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // ── META-INF/container.xml ─────────────────────────────────────────────────
  zip.file('META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
    `<rootfiles><rootfile full-path="OEBPS/content.opf"` +
    ` media-type="application/oebps-package+xml"/></rootfiles></container>`);

  // ── Reader stylesheet ──────────────────────────────────────────────────────
  zip.file('OEBPS/style.css', [
    'body{font-family:Georgia,serif;font-size:1em;line-height:1.8;margin:0;padding:1em 2em}',
    'h1{font-size:1.8em;margin:2em 0 .5em;page-break-before:always}',
    'h2{font-size:1.4em;margin:1.5em 0 .5em}',
    'h3{font-size:1.2em;margin:1.2em 0 .4em}',
    'p{margin:0 0 .8em;text-indent:1.5em}',
    'p:first-of-type,h1+p,h2+p,h3+p{text-indent:0}',
    'strong,b{font-weight:bold}em,i{font-style:italic}',
    'u{text-decoration:underline}s,strike,del{text-decoration:line-through}',
  ].join(''));

  // ── Per-chapter XHTML files ────────────────────────────────────────────────
  const manifestItems = [];
  const spineItems    = [];
  const navEntries    = [];
  const ncxPoints     = [];

  docs.forEach((doc, i) => {
    const id   = `ch${String(i + 1).padStart(3, '0')}`;
    const href = `${id}.xhtml`;

    const xhtml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<!DOCTYPE html>` +
      `<html xmlns="http://www.w3.org/1999/xhtml"` +
      ` xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">` +
      `<head><meta charset="UTF-8"/>` +
      `<title>${_esc(doc.title)}</title>` +
      `<link rel="stylesheet" type="text/css" href="style.css"/></head>` +
      `<body><h1>${_esc(doc.title)}</h1>${doc.content || '<p></p>'}</body></html>`;

    zip.file(`OEBPS/${href}`, xhtml);

    manifestItems.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
    navEntries.push(`<li><a href="${href}">${_esc(doc.title)}</a></li>`);
    ncxPoints.push(
      `<navPoint id="${id}" playOrder="${i + 1}">` +
      `<navLabel><text>${_esc(doc.title)}</text></navLabel>` +
      `<content src="${href}"/></navPoint>`);
  });

  // ── nav.xhtml (EPUB 3 navigation document) ────────────────────────────────
  zip.file('OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html>` +
    `<html xmlns="http://www.w3.org/1999/xhtml"` +
    ` xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">` +
    `<head><meta charset="UTF-8"/><title>Table of Contents</title></head>` +
    `<body><nav epub:type="toc" id="toc">` +
    `<h1>Table of Contents</h1><ol>${navEntries.join('')}</ol></nav></body></html>`);

  // ── toc.ncx (EPUB 2 / Kindle compat) ─────────────────────────────────────
  zip.file('OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">` +
    `<head>` +
    `<meta name="dtb:uid" content="urn:uuid:${uid}"/>` +
    `<meta name="dtb:depth" content="1"/>` +
    `<meta name="dtb:totalPageCount" content="0"/>` +
    `<meta name="dtb:maxPageNumber" content="0"/>` +
    `</head>` +
    `<docTitle><text>${_esc(title)}</text></docTitle>` +
    `<navMap>${ncxPoints.join('')}</navMap></ncx>`);

  // ── content.opf (OPF package document) ───────────────────────────────────
  zip.file('OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0"` +
    ` unique-identifier="book-id" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<metadata>` +
    `<dc:identifier id="book-id">urn:uuid:${uid}</dc:identifier>` +
    `<dc:title>${_esc(title)}</dc:title>` +
    `<dc:creator>${_esc(author)}</dc:creator>` +
    `<dc:language>en</dc:language>` +
    `<dc:date>${now.slice(0, 10)}</dc:date>` +
    `<meta property="dcterms:modified">${now}</meta>` +
    `</metadata>` +
    `<manifest>` +
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>` +
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>` +
    `<item id="style" href="style.css" media-type="text/css"/>` +
    manifestItems.join('') +
    `</manifest>` +
    `<spine toc="ncx">${spineItems.join('')}</spine>` +
    `</package>`);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  _download(blob, `${_safeFilename(title)}.epub`);
}

// ─── KDP Wizard ───────────────────────────────────────────────────────────────

export function openKdpWizard(project) {
  const body = `
    <div class="pub-wizard">
      <div class="pub-wizard-info">
        <p>The <strong>KDP (Kindle Direct Publishing) Wizard</strong> compiles your manuscript
           to Amazon's formatting guidelines and exports it ready to upload.</p>
        <ul>
          <li>Georgia 12 pt, double-spaced, 1" margins</li>
          <li>0.5" first-line paragraph indent</li>
          <li>Chapter headings start on new pages</li>
          <li>Auto-generated title page &amp; copyright page</li>
        </ul>
      </div>
      <div class="pub-wizard-fields">
        <label>Book Title
          <input class="modal-input" id="kdp-title" value="${_esc(project?.title || '')}" placeholder="Book Title"/>
        </label>
        <label>Author Name
          <input class="modal-input" id="kdp-author" value="${_esc(project?.settings?.author || '')}" placeholder="Your Name"/>
        </label>
        <label>Copyright Year
          <input class="modal-input" id="kdp-year" value="${new Date().getFullYear()}" placeholder="2025"/>
        </label>
        <label>Export Format
          <select class="modal-input" id="kdp-format">
            <option value="epub">EPUB (recommended — upload directly to KDP)</option>
            <option value="docx">Word .docx (for KDP print / manual review)</option>
          </select>
        </label>
      </div>
      <div class="pub-wizard-checklist">
        <h4>KDP upload checklist</h4>
        <label><input type="checkbox"> Front cover image (min 2,560 × 1,600 px, JPG/TIFF)</label>
        <label><input type="checkbox"> Book description written (up to 4,000 characters)</label>
        <label><input type="checkbox"> ISBN obtained (optional for e-books)</label>
        <label><input type="checkbox"> Browse categories and keywords selected</label>
        <label><input type="checkbox"> Pricing set for each territory</label>
        <label><input type="checkbox"> Proof copy ordered before going live (for print)</label>
      </div>
    </div>`;

  const { backdrop, close } = _createModal(
    'KDP Wizard — Amazon Kindle Direct Publishing', body,
    `<button class="btn-secondary" id="pub-cancel">Cancel</button>
     <button class="btn-primary"   id="pub-export-kdp">Export for KDP</button>`);

  backdrop.querySelector('#pub-cancel').addEventListener('click', close);
  backdrop.querySelector('#pub-export-kdp').addEventListener('click', async () => {
    const fmt    = backdrop.querySelector('#kdp-format').value;
    const proj   = _getProject?.() || project;
    const author = backdrop.querySelector('#kdp-author').value.trim();
    const year   = backdrop.querySelector('#kdp-year').value.trim();
    if (proj.settings) proj.settings.author = author;
    close();
    if (fmt === 'epub') {
      await exportAsEpub(proj);
      _showToast('EPUB exported — upload to KDP Bookshelf');
    } else {
      _exportKdpDocx(proj, author, year);
      _showToast('.docx exported — upload to KDP or review in Word');
    }
  });
}

function _exportKdpDocx(project, author, year) {
  if (typeof htmlDocx === 'undefined') {
    alert('The .docx library is still loading — please try again in a moment.');
    return;
  }
  const docs  = _getCompiledDocs(project);
  const title = project.title || 'Untitled';

  const chapters = docs.map(d =>
    `<div style="page-break-before:always">` +
    `<h1 style="font-size:18pt;text-align:center;margin-top:2in;margin-bottom:1in">${_esc(d.title)}</h1>` +
    d.content +
    `</div>`).join('');

  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
    `body{font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:2;margin:1in}` +
    `h1{font-size:18pt}p{margin:0;text-indent:.5in}p:first-of-type{text-indent:0}` +
    `</style></head><body>` +
    `<div style="text-align:center;margin-top:3in">` +
    `<h1 style="font-size:24pt;text-align:center;margin-top:0">${_esc(title)}</h1>` +
    `<p style="font-size:14pt;text-indent:0;margin-top:1in">${_esc(author)}</p>` +
    `</div>` +
    `<div style="page-break-before:always;margin-top:3in;font-size:10pt;line-height:1.5">` +
    `<p style="text-indent:0">Copyright &copy; ${_esc(year)} ${_esc(author)}</p>` +
    `<p style="text-indent:0">All rights reserved. No part of this publication may be reproduced without prior written permission.</p>` +
    `<p style="text-indent:0">This is a work of fiction. Names, characters, and incidents are products of the author's imagination.</p>` +
    `</div>` +
    chapters +
    `</body></html>`;

  const blob = htmlDocx.asBlob(html);
  _download(blob, `${_safeFilename(title)}-KDP.docx`);
}

// ─── IngramSpark Wizard ───────────────────────────────────────────────────────

export function openIngramWizard(project) {
  const body = `
    <div class="pub-wizard">
      <div class="pub-wizard-info">
        <p><strong>IngramSpark</strong> is the leading print-on-demand distributor, reaching
           40,000+ retailers and libraries. This wizard formats your manuscript for their
           interior file requirements.</p>
      </div>
      <div class="pub-wizard-fields">
        <label>Trim Size
          <select class="modal-input" id="ingram-trim">
            <option value="5x8">5&quot; × 8&quot;</option>
            <option value="5.5x8.5" selected>5.5&quot; × 8.5&quot; (most common)</option>
            <option value="6x9">6&quot; × 9&quot;</option>
            <option value="8.5x11">8.5&quot; × 11&quot; (non-fiction)</option>
          </select>
        </label>
        <label>Interior Font
          <select class="modal-input" id="ingram-font">
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Garamond">Garamond</option>
          </select>
        </label>
        <label>Author Name
          <input class="modal-input" id="ingram-author" value="${_esc(project?.settings?.author || '')}" placeholder="Your Name"/>
        </label>
        <label>ISBN (optional)
          <input class="modal-input" id="ingram-isbn" placeholder="000-0-000000-00-0"/>
        </label>
      </div>
      <div class="pub-wizard-checklist">
        <h4>IngramSpark requirements</h4>
        <label><input type="checkbox"> Cover: PDF, 300 DPI, includes 0.125&quot; bleed on all sides</label>
        <label><input type="checkbox"> Interior: exported as PDF/X-1a or PDF/X-3</label>
        <label><input type="checkbox"> ISBN registered and assigned to this specific edition/format</label>
        <label><input type="checkbox"> BISAC category selected</label>
        <label><input type="checkbox"> Wholesale discount set (40–55% recommended for broad distribution)</label>
        <label><input type="checkbox"> Return policy decided (returnable increases bookshop orders)</label>
      </div>
    </div>`;

  const { backdrop, close } = _createModal(
    'IngramSpark Wizard — Print-on-Demand', body,
    `<button class="btn-secondary" id="pub-cancel">Cancel</button>
     <button class="btn-primary"   id="pub-export-ingram">Export Interior (.docx)</button>`);

  backdrop.querySelector('#pub-cancel').addEventListener('click', close);
  backdrop.querySelector('#pub-export-ingram').addEventListener('click', () => {
    if (typeof htmlDocx === 'undefined') {
      alert('The .docx library is still loading — please try again.');
      return;
    }
    const font   = backdrop.querySelector('#ingram-font').value;
    const author = backdrop.querySelector('#ingram-author').value.trim();
    const isbn   = backdrop.querySelector('#ingram-isbn').value.trim();
    const proj   = _getProject?.() || project;
    if (proj.settings) proj.settings.author = author;
    close();
    _exportIngramDocx(proj, font, isbn, author);
    _showToast('Interior .docx exported — open in Word and save as PDF/X for IngramSpark');
  });
}

function _exportIngramDocx(project, font, isbn, author) {
  const docs  = _getCompiledDocs(project);
  const title = project.title || 'Untitled';
  const year  = new Date().getFullYear();
  const isbnRow = isbn ? `<p style="text-indent:0">ISBN: ${_esc(isbn)}</p>` : '';

  const chapters = docs.map(d =>
    `<div style="page-break-before:always">` +
    `<h1 style="text-align:center;font-size:16pt;margin-top:1.5in;margin-bottom:1in">${_esc(d.title)}</h1>` +
    d.content +
    `</div>`).join('');

  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
    `body{font-family:'${_esc(font)}',serif;font-size:11pt;line-height:1.7;` +
    `margin:.875in .875in .875in 1in}` +
    `h1{font-size:16pt;text-align:center}` +
    `p{margin:0;text-indent:1.5em;orphans:2;widows:2}` +
    `p:first-of-type,h1+p{text-indent:0}` +
    `</style></head><body>` +
    `<div style="text-align:center;margin-top:2.5in;page-break-after:always">` +
    `<p style="font-size:22pt;font-weight:bold;text-indent:0">${_esc(title)}</p>` +
    `<p style="font-size:13pt;text-indent:0;margin-top:.5in">${_esc(author)}</p>` +
    `</div>` +
    `<div style="page-break-after:always;font-size:9pt;margin-top:3in">` +
    `<p style="text-indent:0">Copyright &copy; ${year} ${_esc(author)}</p>` +
    `<p style="text-indent:0">All rights reserved.</p>` +
    isbnRow +
    `<p style="text-indent:0">Printed by IngramSpark</p>` +
    `</div>` +
    chapters +
    `</body></html>`;

  const blob = htmlDocx.asBlob(html);
  _download(blob, `${_safeFilename(title)}-IngramSpark.docx`);
}

// ─── Agent Submission Formatter ───────────────────────────────────────────────

export function openSubmissionFormatter(project) {
  const body = `
    <div class="pub-wizard">
      <div class="pub-wizard-info">
        <p>The <strong>Agent Submission Formatter</strong> exports your manuscript to
           industry-standard literary agent format:</p>
        <ul>
          <li>Times New Roman 12 pt, double-spaced</li>
          <li>1&quot; margins on all sides</li>
          <li>Running header: SURNAME / TITLE / page number</li>
          <li>0.5&quot; first-line paragraph indent</li>
          <li>Title page with word count and contact info</li>
        </ul>
      </div>
      <div class="pub-wizard-fields">
        <label>Author Full Name
          <input class="modal-input" id="sub-author" value="${_esc(project?.settings?.author || '')}" placeholder="Jane Smith"/>
        </label>
        <label>Surname (for running header)
          <input class="modal-input" id="sub-surname" placeholder="SMITH"/>
        </label>
        <label>Email
          <input class="modal-input" id="sub-email" placeholder="author@email.com"/>
        </label>
        <label>Phone
          <input class="modal-input" id="sub-phone" placeholder="+1 555 000 0000"/>
        </label>
      </div>
    </div>`;

  const { backdrop, close } = _createModal(
    'Agent Submission Formatter', body,
    `<button class="btn-secondary" id="pub-cancel">Cancel</button>
     <button class="btn-primary"   id="pub-export-sub">Export Submission (.docx)</button>`);

  backdrop.querySelector('#pub-cancel').addEventListener('click', close);
  backdrop.querySelector('#pub-export-sub').addEventListener('click', () => {
    if (typeof htmlDocx === 'undefined') {
      alert('The .docx library is still loading — please try again.');
      return;
    }
    const author  = backdrop.querySelector('#sub-author').value.trim();
    const surname = (backdrop.querySelector('#sub-surname').value.trim() || 'SURNAME').toUpperCase();
    const email   = backdrop.querySelector('#sub-email').value.trim();
    const phone   = backdrop.querySelector('#sub-phone').value.trim();
    const proj    = _getProject?.() || project;
    if (proj.settings) proj.settings.author = author;
    close();
    _exportSubmission(proj, author, surname, email, phone);
    _showToast('Submission manuscript exported');
  });
}

function _exportSubmission(project, author, surname, email, phone) {
  const docs        = _getCompiledDocs(project);
  const title       = project.title || 'Untitled';
  const totalWords  = docs.reduce((sum, d) => sum + (d.wordCount || 0), 0);
  const approxWords = Math.round(totalWords / 1000) * 1000;
  const contact     = [author, email, phone].filter(Boolean).join(' | ');
  const headerText  = `${surname} / ${title.toUpperCase()}`;

  const chapters = docs.map(d =>
    `<div style="page-break-before:always">` +
    `<p style="text-align:right;font-size:10pt;text-indent:0;margin-bottom:1in">${_esc(headerText)}</p>` +
    `<h1 style="text-align:center;font-size:12pt;font-weight:bold;text-transform:uppercase;margin:0 0 .5in">${_esc(d.title)}</h1>` +
    d.content +
    `</div>`).join('');

  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
    `body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:2;margin:1in}` +
    `h1{font-size:12pt;font-weight:bold;text-align:center;text-transform:uppercase}` +
    `p{margin:0;text-indent:.5in}` +
    `p:first-of-type,h1+p{text-indent:0}` +
    `</style></head><body>` +
    `<div style="min-height:6in">` +
    `<p style="text-indent:0;text-align:right;font-size:10pt;line-height:1.5">${_esc(contact)}</p>` +
    `<div style="text-align:center;margin-top:2.5in">` +
    `<p style="text-indent:0;font-size:14pt;font-weight:bold">${_esc(title)}</p>` +
    `<p style="text-indent:0">by</p>` +
    `<p style="text-indent:0">${_esc(author)}</p>` +
    `<p style="text-indent:0;margin-top:.5in;font-size:10pt">Approx. ${approxWords.toLocaleString()} words</p>` +
    `</div></div>` +
    chapters +
    `</body></html>`;

  const blob = htmlDocx.asBlob(html);
  _download(blob, `${_safeFilename(title)}-Submission.docx`);
}

// ─── Self-Publishing Checklist ─────────────────────────────────────────────────

export function openSelfPublishChecklist() {
  const sections = [
    {
      title: 'Editing & Content',
      items: [
        'Manuscript is complete and in final draft',
        'Developmental edit done (structure, plot, pacing)',
        'Line edit done (prose quality, clarity, voice)',
        'Copy edit done (grammar, spelling, consistency)',
        'Proofreading done — ideally on typeset pages',
        'Author has read the final version aloud from start to finish',
      ],
    },
    {
      title: 'Cover Design',
      items: [
        'Professional cover designed (or high-quality DIY)',
        'Cover fits genre conventions and attracts target readers',
        'Cover artwork licensed for commercial use',
        'Spine and back cover designed for print edition',
        'Cover files at 300 DPI in all required formats',
      ],
    },
    {
      title: 'ISBNs & Legal',
      items: [
        'ISBN purchased for each format (print and ebook need separate ISBNs)',
        'Copyright page completed (©, year, author name, edition)',
        'Disclaimer added where necessary (fiction disclaimer or source notes)',
        'Permissions obtained for any quoted or reprinted material',
      ],
    },
    {
      title: 'Metadata & Marketing',
      items: [
        'Title and subtitle finalised',
        'Author name / pen name decided',
        'Book description (blurb) written — 150–250 words',
        'BISAC categories selected (primary and secondary)',
        'Keywords researched and entered (up to 7 on most platforms)',
        'Author bio written (50–100 words)',
        'Author website and social links set up',
        'Launch date planned with enough lead time for marketing',
      ],
    },
    {
      title: 'Distribution & Pricing',
      items: [
        'Ebook uploaded to KDP (Amazon)',
        'Wide vs KDP Select decision made (exclusivity trade-offs considered)',
        'Print edition uploaded to KDP Print and / or IngramSpark',
        'Pricing set for each format and territory',
        'Pre-order set up if launching wide',
        'ARC (Advance Review Copy) readers recruited and copies sent',
      ],
    },
    {
      title: 'Launch',
      items: [
        'Launch team assembled and briefed',
        'Launch week promotions and giveaways planned',
        'Newsletter announcement drafted and scheduled',
        'Social media posts written and scheduled',
        'BookBub / paid advertising planned (if budget allows)',
        'Goodreads author page claimed and book added',
      ],
    },
  ];

  const sectionsHtml = sections.map(s => `
    <div class="checklist-section">
      <h4>${s.title}</h4>
      ${s.items.map(item => `<label class="checklist-item"><input type="checkbox"> ${item}</label>`).join('')}
    </div>`).join('');

  const { close } = _createModal(
    'Self-Publishing Checklist',
    `<div class="pub-checklist">${sectionsHtml}</div>`,
    `<button class="btn-primary" id="pub-close">Close</button>`);

  document.getElementById('pub-close')?.addEventListener('click', close);
}

// ─── Genre Style Guides ────────────────────────────────────────────────────────

export function openGenreGuides() {
  const guides = [
    {
      key: 'romance',
      label: 'Romance',
      html: `<h4>Romance</h4>
        <p><strong>Core requirement:</strong> A central love story with an emotionally satisfying,
           optimistic ending (HEA — Happily Ever After, or HFN — Happy For Now).</p>
        <ul>
          <li><strong>Length:</strong> Category 50–75k words; Single-title 80–100k+</li>
          <li><strong>POV:</strong> Close third or first person; dual POV (both protagonists) is the current norm</li>
          <li><strong>Heat level:</strong> Sweet (no explicit content) → Steamy (explicit) — must match subgenre expectations</li>
          <li><strong>Tropes:</strong> Enemies to Lovers, Second Chance, Forced Proximity, Fake Dating, Sports Romance, Grumpy/Sunshine</li>
          <li><strong>Structure:</strong> Meet cute → growing attraction → obstacles → dark moment → declaration → HEA. The romance IS the main plot.</li>
          <li><strong>Subgenres:</strong> Contemporary, Historical, Paranormal, Romantic Suspense, Dark Romance, Fantasy Romance</li>
          <li><strong>Comps:</strong> Emily Henry, Talia Hibbert, Julia Quinn, Nora Roberts</li>
        </ul>`,
    },
    {
      key: 'thriller',
      label: 'Thriller',
      html: `<h4>Thriller / Suspense</h4>
        <p><strong>Core requirement:</strong> High stakes, relentless pace, and a protagonist who must
           stop something terrible from happening — to themselves or others.</p>
        <ul>
          <li><strong>Length:</strong> 80,000–100,000 words (psychological can skew shorter: 70–85k)</li>
          <li><strong>POV:</strong> Close third or first; limited — readers know only what the protagonist knows</li>
          <li><strong>Pacing:</strong> Short chapters, cliffhanger endings, constant escalation — never let the tension drop</li>
          <li><strong>Opening:</strong> In medias res or immediate threat — do not open with backstory or world-building</li>
          <li><strong>Subgenres:</strong> Legal, Medical, Political, Psychological, Tech, Domestic Suspense, Nordic Noir</li>
          <li><strong>Stakes:</strong> Must be life-or-death (literally or reputationally) with a ticking clock</li>
          <li><strong>Comps:</strong> Gillian Flynn, Harlan Coben, Lee Child, Tana French, Liane Moriarty</li>
        </ul>`,
    },
    {
      key: 'literary',
      label: 'Literary Fiction',
      html: `<h4>Literary Fiction</h4>
        <p><strong>Core requirement:</strong> Prioritises language, character interiority, and thematic
           depth over plot. Ambiguous or open endings are accepted — even expected.</p>
        <ul>
          <li><strong>Length:</strong> 75,000–110,000 words (debut: target under 100k)</li>
          <li><strong>Prose style:</strong> A distinctive, consistent voice is the most important selling point</li>
          <li><strong>POV:</strong> Any — but the reader must inhabit the character's consciousness intimately</li>
          <li><strong>Structure:</strong> Flexible — non-linear, fragmented, epistolary — if it serves the work</li>
          <li><strong>Theme:</strong> Must have something meaningful to say: race, grief, identity, family, memory, war, belonging</li>
          <li><strong>Agent queries:</strong> Focus on voice, stakes, and theme — plot summary matters less than in genre fiction</li>
          <li><strong>Comps:</strong> Kazuo Ishiguro, Colson Whitehead, Jesmyn Ward, Sally Rooney, Paul Auster</li>
        </ul>`,
    },
    {
      key: 'nonfiction',
      label: 'Non-Fiction',
      html: `<h4>Non-Fiction</h4>
        <p><strong>Core requirement:</strong> Credibility (platform or verifiable credentials), a clear
           argument or journey, and a well-defined target reader.</p>
        <ul>
          <li><strong>Length:</strong> 60,000–80,000 words; self-help can be shorter (40–60k)</li>
          <li><strong>Query approach:</strong> Non-fiction is sold on a book proposal + sample chapters, not a complete manuscript</li>
          <li><strong>Platform:</strong> Agents and publishers need evidence you can sell books — audience size, expertise, media</li>
          <li><strong>Structure:</strong> Intro → problem → solution/journey → conclusion; each chapter delivers a clear takeaway</li>
          <li><strong>Subgenres:</strong> Memoir, Self-Help, Business, History, True Crime, Popular Science, Essay Collections</li>
          <li><strong>Sources:</strong> Footnotes or endnotes required for prescriptive non-fiction; Chicago or APA style</li>
          <li><strong>Index:</strong> Expected by traditional publishers; optional for self-publishing</li>
        </ul>`,
    },
  ];

  const tabBar = guides.map(g =>
    `<button class="pub-tab-btn" data-tab="${g.key}">${g.label}</button>`).join('');

  const panels = guides.map(g =>
    `<div class="pub-tab-panel" id="tab-${g.key}">${g.html}</div>`).join('');

  const { backdrop, close } = _createModal(
    'Genre Style Guides',
    `<div class="pub-tabs"><div class="pub-tab-bar">${tabBar}</div>` +
    `<div class="pub-tab-content">${panels}</div></div>`,
    `<button class="btn-primary" id="pub-close">Close</button>`);

  // Activate first tab
  backdrop.querySelector('.pub-tab-btn')?.classList.add('active');
  backdrop.querySelector('.pub-tab-panel')?.classList.add('active');

  backdrop.querySelectorAll('.pub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      backdrop.querySelectorAll('.pub-tab-btn').forEach(b => b.classList.remove('active'));
      backdrop.querySelectorAll('.pub-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      backdrop.querySelector(`#tab-${btn.dataset.tab}`)?.classList.add('active');
    });
  });

  backdrop.querySelector('#pub-close')?.addEventListener('click', close);
}

// ─── Front & Back Matter Templates ────────────────────────────────────────────

export function openFrontMatterTemplates(project) {
  const author = project?.settings?.author || 'Author Name';
  const year   = new Date().getFullYear();
  const title  = project?.title || 'Title';

  const templates = [
    {
      id: 'title-page',
      label: 'Title Page',
      content:
        `<div style="text-align:center;margin-top:3em">` +
        `<h1>${_esc(title)}</h1>` +
        `<p>by</p>` +
        `<p>${_esc(author)}</p>` +
        `</div>`,
    },
    {
      id: 'copyright',
      label: 'Copyright Page',
      content:
        `<p>Copyright &copy; ${year} ${_esc(author)}</p>` +
        `<p>All rights reserved. No part of this book may be reproduced, stored in a retrieval system, ` +
        `or transmitted in any form or by any means — electronic, mechanical, photocopy, recording, or otherwise — ` +
        `without the prior written permission of the publisher, except for brief quotations in reviews.</p>` +
        `<p>This is a work of fiction. Names, characters, places, and incidents either are the product ` +
        `of the author's imagination or are used fictitiously. Any resemblance to actual persons, ` +
        `living or dead, events, or locales is entirely coincidental.</p>` +
        `<p>Published by [Publisher Name]</p>` +
        `<p>ISBN: [ISBN]</p>`,
    },
    {
      id: 'dedication',
      label: 'Dedication',
      content: `<p style="text-align:center;margin-top:3em;font-style:italic">For [Name]</p>`,
    },
    {
      id: 'epigraph',
      label: 'Epigraph',
      content:
        `<blockquote style="margin:3em auto;max-width:20em">` +
        `<p>"[Quote here]"</p>` +
        `<footer>— [Author, <cite>Source</cite>]</footer>` +
        `</blockquote>`,
    },
    {
      id: 'acknowledgements',
      label: 'Acknowledgements',
      content:
        `<h2>Acknowledgements</h2>` +
        `<p>Writing this book would not have been possible without the support and encouragement of many people.</p>` +
        `<p>[Your acknowledgements here — editors, agents, beta readers, family, friends.]</p>`,
    },
    {
      id: 'also-by',
      label: '"Also By" Page',
      content:
        `<h2>Also by ${_esc(author)}</h2>` +
        `<p>[Previous Book Title]</p>` +
        `<p>[Another Book Title]</p>` +
        `<p><em>Add your backlist here.</em></p>`,
    },
    {
      id: 'author-bio',
      label: 'Author Bio',
      content:
        `<h2>About the Author</h2>` +
        `<p>${_esc(author)} is a [genre] author based in [location]. ` +
        `[Brief biography: background, inspiration, previous works.] ` +
        `Visit [website] or follow on social media at [handle].</p>`,
    },
  ];

  const buttons = templates.map(t =>
    `<button class="pub-template-btn" data-tpl="${t.id}">${t.label}</button>`).join('');

  const { backdrop, close } = _createModal(
    'Front &amp; Back Matter Templates',
    `<div class="pub-templates">
       <p>Select a template to insert as a new document at the top of your binder.
          You can edit it freely before compiling.</p>
       <div class="pub-template-grid">${buttons}</div>
     </div>`,
    `<button class="btn-secondary" id="pub-close">Done</button>`);

  backdrop.querySelectorAll('.pub-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmpl = templates.find(t => t.id === btn.dataset.tpl);
      if (tmpl) {
        _onAddDoc?.(tmpl.label, tmpl.content);
        btn.textContent = tmpl.label + ' \u2713';  // ✓
        btn.disabled = true;
      }
    });
  });

  backdrop.querySelector('#pub-close')?.addEventListener('click', close);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Wire up the publish module.
 * @param {object} opts
 * @param {() => object}   opts.getProject - returns current project
 * @param {(title, html) => void} opts.onAddDoc  - inserts a new doc in the binder
 */
export function initPublish({ getProject, onAddDoc }) {
  _getProject = getProject;
  _onAddDoc   = onAddDoc;
}
