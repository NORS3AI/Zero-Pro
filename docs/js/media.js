// media.js — Phase 6: Web clipping support
// Allows users to save URLs as research binder items with a title and snippet.

import { createDocument, saveProject, getChildren } from './storage.js';
import { showToast } from './ui.js';

// ─── Module State ─────────────────────────────────────────────────────────────

let _getProject      = null;
let _onProjectChange = null;
let _renderBinder    = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wire up the media module.
 * @param {object} opts
 * @param {() => object}          opts.getProject      - returns current project
 * @param {(project) => void}     opts.onProjectChange - notify that project changed
 * @param {(project, id) => void} opts.renderBinder    - re-render binder tree
 */
export function initMedia({ getProject, onProjectChange, renderBinder }) {
  _getProject      = getProject;
  _onProjectChange = onProjectChange;
  _renderBinder    = renderBinder;

  // Wire "Add Clip" button in binder header
  document.querySelector('[data-action="add-clip"]')?.addEventListener('click', _promptWebClip);
}

// ─── Web Clipping ──────────────────────────────────────────────────────────────

async function _promptWebClip() {
  const url = prompt('Paste a URL to clip:');
  if (!url?.trim()) return;

  const project = _getProject?.();
  if (!project) return;

  const cleanUrl = url.trim();
  let title   = cleanUrl;
  let snippet = '';

  // Attempt to fetch the page for a title and snippet (will fail on CORS)
  try {
    const resp = await fetch(cleanUrl, { mode: 'cors', signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const html = await resp.text();
      const parser = new DOMParser();
      const doc    = parser.parseFromString(html, 'text/html');

      title = doc.querySelector('title')?.textContent?.trim() || title;

      // Grab first meaningful paragraph as a snippet
      const paras = doc.querySelectorAll('p');
      for (const p of paras) {
        const text = p.textContent?.trim();
        if (text && text.length > 30) {
          snippet = text.length > 300 ? text.slice(0, 300) + '…' : text;
          break;
        }
      }
    }
  } catch {
    // CORS or network error — keep the URL as the title
  }

  // Ensure Research folder exists
  const researchFolder = _ensureResearchFolder(project);

  // Create a clip document
  const clipDoc = createDocument(project, {
    type:     'clip',
    parentId: researchFolder.id,
    title,
  });
  clipDoc.url     = cleanUrl;
  clipDoc.snippet = snippet;
  clipDoc.compile = false; // clips are never compiled into the manuscript

  saveProject(project);
  _renderBinder?.(project, null);
  _onProjectChange?.(project);
  showToast(`Clipped: ${title.length > 40 ? title.slice(0, 40) + '…' : title}`);
}

/** Find or create the Research folder */
function _ensureResearchFolder(project) {
  let folder = project.documents.find(d => d.type === 'folder' && d.title === 'Research' && !d.inTrash);
  if (!folder) {
    folder = createDocument(project, { type: 'folder', parentId: null, title: 'Research' });
  }
  return folder;
}
