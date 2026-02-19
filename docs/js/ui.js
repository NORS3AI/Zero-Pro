// ui.js — Theme toggle, modals, and toast notifications

/** Apply a theme to the document root */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
}

/** Toggle dark/light theme; updates project settings and returns new theme */
export function toggleTheme(project) {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  if (project) project.settings.theme = next;
  return next;
}

/** Show a confirmation dialog with a destructive confirm button */
export function showConfirm(message, onConfirm, onCancel) {
  const backdrop = _createBackdrop();
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
      <h3 id="modal-heading">Confirm</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-danger" id="modal-confirm">Delete</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#modal-cancel').focus();

  const close = () => document.body.removeChild(backdrop);
  backdrop.querySelector('#modal-cancel').addEventListener('click', () => { close(); onCancel?.(); });
  backdrop.querySelector('#modal-confirm').addEventListener('click', () => { close(); onConfirm(); });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) { close(); onCancel?.(); } });
  _trapEscapeKey(backdrop, () => { close(); onCancel?.(); });
}

/** Show a text-input prompt dialog */
export function showPrompt(title, placeholder, defaultValue, onConfirm, onCancel) {
  const backdrop = _createBackdrop();
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
      <h3 id="modal-heading">${title}</h3>
      <input class="modal-input" type="text" placeholder="${placeholder}" value="${_esc(defaultValue || '')}">
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">OK</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  const input = backdrop.querySelector('.modal-input');
  input.focus();
  input.select();

  const close = () => document.body.removeChild(backdrop);
  const confirm = () => {
    const value = input.value.trim();
    if (value) { close(); onConfirm(value); }
  };
  backdrop.querySelector('#modal-cancel').addEventListener('click', () => { close(); onCancel?.(); });
  backdrop.querySelector('#modal-confirm').addEventListener('click', confirm);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { close(); onCancel?.(); }
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) { close(); onCancel?.(); } });
}

/** Show a brief toast notification at the bottom of the screen */
export function showToast(message, duration = 2500) {
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
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// --- Helpers ---

function _createBackdrop() {
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  return el;
}

function _trapEscapeKey(el, handler) {
  const fn = e => { if (e.key === 'Escape') { handler(); document.removeEventListener('keydown', fn); } };
  document.addEventListener('keydown', fn);
}

function _esc(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
