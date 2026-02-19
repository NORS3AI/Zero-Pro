// storage.js — Data model and localStorage persistence

const STORAGE_KEY = 'zeropro_project';

/** Generate a short unique ID */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Count words in a plain-text string */
export function countWords(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Create a brand-new project with one starter document */
export function createProject(title = 'My Novel') {
  const firstDocId = generateId();
  return {
    id: generateId(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      font: 'georgia',
      fontSize: 18,
      lineHeight: 1.8,
    },
    documents: [
      {
        id: firstDocId,
        parentId: null,
        type: 'doc',
        title: 'Chapter One',
        synopsis: '',
        content: '<p></p>',
        wordCount: 0,
        label: null,
        status: 'draft',
        target: 0,
        pov: '',
        order: 0,
        collapsed: false,
        inTrash: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  };
}

/** Load the project from localStorage; returns null if none saved */
export function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save the project to localStorage immediately */
export function saveProject(project) {
  project.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('Save failed — localStorage may be full:', e);
  }
}

/** Debounced autosave (1.5 s after last call) */
let _saveTimer = null;
export function saveProjectDebounced(project) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => saveProject(project), 1500);
}

/** Find a document by ID */
export function getDocument(project, id) {
  return project.documents.find(d => d.id === id) ?? null;
}

/** Return direct children of parentId, sorted by order. Excludes trash by default. */
export function getChildren(project, parentId, includeTrash = false) {
  return project.documents
    .filter(d => d.parentId === parentId && (includeTrash || !d.inTrash))
    .sort((a, b) => a.order - b.order);
}

/** Return all documents in Trash */
export function getTrash(project) {
  return project.documents.filter(d => d.inTrash);
}

/** Add a new document to the project and return it */
export function createDocument(project, { type = 'doc', parentId = null, title } = {}) {
  const siblings = getChildren(project, parentId);
  const maxOrder = siblings.length ? Math.max(...siblings.map(d => d.order)) : -1;
  const defaultTitle = type === 'folder' ? 'New Folder' : type === 'image' ? 'New Image' : 'Untitled';
  const doc = {
    id: generateId(),
    parentId,
    type,
    title: title || defaultTitle,
    synopsis: '',
    content: (type === 'folder' || type === 'image') ? '' : '<p></p>',
    wordCount: 0,
    label: null,
    status: 'draft',
    target: 0,
    pov: '',
    order: maxOrder + 1,
    collapsed: false,
    inTrash: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  project.documents.push(doc);
  return doc;
}

/** Merge changes into a document and return it */
export function updateDocument(project, id, changes) {
  const doc = getDocument(project, id);
  if (!doc) return null;
  Object.assign(doc, changes, { updatedAt: Date.now() });
  return doc;
}

/** Soft-delete: move a document (and all descendants) to Trash */
export function trashDocument(project, id) {
  const markTrash = (docId) => {
    const doc = getDocument(project, docId);
    if (!doc) return;
    doc.inTrash = true;
    doc.updatedAt = Date.now();
    project.documents
      .filter(d => d.parentId === docId)
      .forEach(child => markTrash(child.id));
  };
  markTrash(id);
}

/** Hard-delete: permanently remove a document and all descendants */
export function purgeDocument(project, id) {
  const collectIds = (docId) => {
    const ids = [docId];
    project.documents
      .filter(d => d.parentId === docId)
      .forEach(child => ids.push(...collectIds(child.id)));
    return ids;
  };
  const toRemove = new Set(collectIds(id));
  project.documents = project.documents.filter(d => !toRemove.has(d.id));
}

/** Restore a document from Trash (does not restore descendants automatically) */
export function restoreDocument(project, id) {
  const doc = getDocument(project, id);
  if (doc) { doc.inTrash = false; doc.updatedAt = Date.now(); }
}

/** Update the order of documents within a parent after a drag-and-drop */
export function reorderDocuments(project, parentId, orderedIds) {
  orderedIds.forEach((id, index) => {
    const doc = getDocument(project, id);
    if (doc) { doc.order = index; doc.parentId = parentId; }
  });
}

/** Sum word counts of all non-trash doc-type documents */
export function getProjectWordCount(project) {
  return project.documents
    .filter(d => !d.inTrash && d.type === 'doc')
    .reduce((sum, d) => sum + (d.wordCount || 0), 0);
}
