// export.js — Export documents to .txt, .md, .docx, and .doc

// ─── HTML Conversion Helpers ──────────────────────────────────────────────────

/** Strip HTML and return plain text, preserving paragraph breaks */
export function htmlToPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  div.querySelectorAll('p, h1, h2, h3, h4, li, blockquote').forEach(el => {
    el.insertAdjacentText('afterend', '\n');
  });
  return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

/** Convert HTML to Markdown */
export function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    const tag = node.tagName?.toLowerCase();
    const inner = Array.from(node.childNodes).map(processNode).join('');
    switch (tag) {
      case 'h1': return `# ${inner.trim()}\n\n`;
      case 'h2': return `## ${inner.trim()}\n\n`;
      case 'h3': return `### ${inner.trim()}\n\n`;
      case 'p':  return `${inner.trim()}\n\n`;
      case 'strong': case 'b': return `**${inner}**`;
      case 'em':     case 'i': return `*${inner}*`;
      case 'u':  return `<u>${inner}</u>`;
      case 's':  case 'strike': case 'del': return `~~${inner}~~`;
      case 'br': return '\n';
      case 'hr': return '\n---\n\n';
      case 'blockquote': return `> ${inner.trim()}\n\n`;
      case 'ul': return Array.from(node.children).map(li => `- ${processNode(li).trim()}`).join('\n') + '\n\n';
      case 'ol': return Array.from(node.children).map((li, i) => `${i + 1}. ${processNode(li).trim()}`).join('\n') + '\n\n';
      case 'li': return inner;
      default:   return inner;
    }
  }

  return processNode(div).replace(/\n{3,}/g, '\n\n').trim();
}

/** Convert HTML to a basic RTF string (used for .doc export) */
function htmlToRtf(html, title) {
  const div = document.createElement('div');
  div.innerHTML = html;

  let rtf = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Escape RTF special chars
      return node.textContent
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
    }
    const tag = node.tagName?.toLowerCase();
    const inner = Array.from(node.childNodes).map(processNode).join('');
    switch (tag) {
      case 'h1': return `\\pard\\sb240\\sa120{\\b\\fs36 ${inner}}\\par\n`;
      case 'h2': return `\\pard\\sb200\\sa100{\\b\\fs28 ${inner}}\\par\n`;
      case 'h3': return `\\pard\\sb160\\sa80{\\b\\fs24 ${inner}}\\par\n`;
      case 'p':  return `\\pard\\sb0\\sa160\\fi0 ${inner}\\par\n`;
      case 'strong': case 'b': return `{\\b ${inner}}`;
      case 'em':     case 'i': return `{\\i ${inner}}`;
      case 'u':  return `{\\ul ${inner}}`;
      case 's':  case 'strike': case 'del': return `{\\strike ${inner}}`;
      case 'br': return '\\line\n';
      case 'hr': return '\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n';
      case 'li': return `\\pard\\fi-360\\li720 \\bullet  ${inner}\\par\n`;
      case 'ul': case 'ol': return inner;
      default:   return inner;
    }
  }

  rtf = Array.from(div.childNodes).map(processNode).join('');

  return `{\\rtf1\\ansi\\deff0` +
    `{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}}` +
    `{\\colortbl ;\\red0\\green0\\blue0;}` +
    `\\widowctrl\\hyphauto` +
    `\\pard\\sb240\\sa120{\\b\\fs40 ${_rtfEsc(title)}}\\par\n` +
    rtf +
    `}`;
}

function _rtfEsc(str) {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

// ─── Download Helper ──────────────────────────────────────────────────────────

function download(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(title) {
  return (title || 'document').replace(/[^a-z0-9\-_ ]/gi, '_').trim();
}

// ─── Export Functions ─────────────────────────────────────────────────────────

/** Export as plain text (.txt) */
export function exportAsTxt(doc) {
  const text = `${doc.title}\n${'='.repeat(doc.title.length)}\n\n${htmlToPlainText(doc.content)}`;
  download(text, `${safeFilename(doc.title)}.txt`, 'text/plain;charset=utf-8');
}

/** Export as Markdown (.md) */
export function exportAsMd(doc) {
  const md = `# ${doc.title}\n\n${htmlToMarkdown(doc.content)}`;
  download(md, `${safeFilename(doc.title)}.md`, 'text/markdown;charset=utf-8');
}

/** Export as Word document (.docx) using html-docx-js (loaded via CDN) */
export function exportAsDocx(doc) {
  if (typeof htmlDocx === 'undefined') {
    alert('The .docx export library is still loading. Please try again in a moment.');
    return;
  }
  // html-docx-js expects a full HTML document string
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 2; margin: 1in; }
      h1 { font-size: 18pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
      p { margin: 0 0 12pt; text-indent: 0.5in; } p:first-of-type { text-indent: 0; }
    </style>
    </head><body>
    <h1>${_esc(doc.title)}</h1>
    ${doc.content}
    </body></html>`;
  const blob = htmlDocx.asBlob(fullHtml);
  download(blob, `${safeFilename(doc.title)}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

/** Export as legacy Word document (.doc) via RTF — Word opens RTF files natively */
export function exportAsDoc(doc) {
  const rtf = htmlToRtf(doc.content, doc.title);
  download(rtf, `${safeFilename(doc.title)}.doc`, 'application/msword');
}

function _esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
