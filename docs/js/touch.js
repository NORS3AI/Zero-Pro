// touch.js — Touch gesture navigation (Phase 8)
// Swipe left/right on the centre pane to cycle through views.
// Swipe right from the left edge to open the binder on mobile.
// Swipe left from the right edge to open the inspector on mobile.

// ─── Config ───────────────────────────────────────────────────────────────────

const MIN_SWIPE_DISTANCE = 60;   // px
const MAX_SWIPE_DURATION = 400;  // ms
const EDGE_ZONE          = 30;   // px from screen edge for drawer swipes

// ─── State ────────────────────────────────────────────────────────────────────

let _onSwitchView  = null;  // (view: string) => void
let _getViews      = null;  // () => string[]  — ordered list of view ids
let _getCurrentView = null; // () => string

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attach touch gesture listeners to the app.
 * @param {{
 *   onSwitchView: (view: string) => void,
 *   getViews:     () => string[],
 *   getCurrentView: () => string,
 * }} opts
 */
export function initTouch({ onSwitchView, getViews, getCurrentView }) {
  _onSwitchView   = onSwitchView;
  _getViews       = getViews;
  _getCurrentView = getCurrentView;

  const centerPane = document.getElementById('center-pane');
  if (!centerPane) return;

  centerPane.addEventListener('touchstart', _onTouchStart, { passive: true });
  centerPane.addEventListener('touchend',   _onTouchEnd,   { passive: true });

  // Drawer edge swipes — listen on the workspace
  const workspace = document.getElementById('workspace');
  if (workspace) {
    workspace.addEventListener('touchstart', _onEdgeTouchStart, { passive: true });
    workspace.addEventListener('touchend',   _onEdgeTouchEnd,   { passive: true });
  }
}

// ─── View swipe ───────────────────────────────────────────────────────────────

let _viewStartX = 0;
let _viewStartY = 0;
let _viewStartT = 0;
let _inSwipeZone = false;  // only allow view-switch from the bottom 35% of the pane

const SWIPE_ZONE_FRACTION = 0.65; // touch must start below this fraction of pane height

function _onTouchStart(e) {
  const t = e.changedTouches[0];
  _viewStartX = t.clientX;
  _viewStartY = t.clientY;
  _viewStartT = Date.now();

  // Determine if the touch started in the bottom swipe zone
  const pane = e.currentTarget;
  const rect = pane.getBoundingClientRect();
  const relY = (t.clientY - rect.top) / rect.height;
  _inSwipeZone = relY >= SWIPE_ZONE_FRACTION;
}

function _onTouchEnd(e) {
  // Only handle swipes that began in the bottom zone — prevents conflicts with
  // the formatting toolbar (Bold/Italic etc.) in the editor pane
  if (!_inSwipeZone) return;

  const t  = e.changedTouches[0];
  const dx = t.clientX - _viewStartX;
  const dy = t.clientY - _viewStartY;
  const dt = Date.now() - _viewStartT;

  // Must be fast enough, horizontal enough, and long enough
  if (dt > MAX_SWIPE_DURATION)           return;
  if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;
  if (Math.abs(dy) > Math.abs(dx) * 0.8) return;  // too vertical

  const views = _getViews?.() ?? ['corkboard', 'editor', 'outline'];
  const cur   = _getCurrentView?.() ?? 'corkboard';
  const idx   = views.indexOf(cur);
  if (idx === -1) return;

  if (dx < 0) {
    // Swipe left → next view
    const next = views[(idx + 1) % views.length];
    _onSwitchView?.(next);
    _showViewSwipeHint(next, 'left');
  } else {
    // Swipe right → previous view
    const prev = views[(idx - 1 + views.length) % views.length];
    _onSwitchView?.(prev);
    _showViewSwipeHint(prev, 'right');
  }
}

// ─── Drawer edge swipes ───────────────────────────────────────────────────────

let _edgeStartX = 0;
let _edgeStartY = 0;
let _edgeStartT = 0;
let _edgeFromLeft  = false;
let _edgeFromRight = false;

function _onEdgeTouchStart(e) {
  const t = e.changedTouches[0];
  _edgeStartX    = t.clientX;
  _edgeStartY    = t.clientY;
  _edgeStartT    = Date.now();
  _edgeFromLeft  = t.clientX < EDGE_ZONE;
  _edgeFromRight = t.clientX > window.innerWidth - EDGE_ZONE;
}

function _onEdgeTouchEnd(e) {
  if (!_edgeFromLeft && !_edgeFromRight) return;

  const t  = e.changedTouches[0];
  const dx = t.clientX - _edgeStartX;
  const dy = t.clientY - _edgeStartY;
  const dt = Date.now() - _edgeStartT;

  if (dt > MAX_SWIPE_DURATION)           return;
  if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return;
  if (Math.abs(dy) > Math.abs(dx))       return;

  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const isCompact = window.matchMedia('(max-width: 1023px)').matches;
  if (!isCompact) return;

  if (_edgeFromLeft && dx > 0) {
    // Edge swipe right → open binder
    const opening = workspace.classList.toggle('binder-open');
    if (opening) workspace.classList.remove('inspector-open');
  } else if (_edgeFromRight && dx < 0) {
    // Edge swipe left → open inspector
    const opening = workspace.classList.toggle('inspector-open');
    if (opening) workspace.classList.remove('binder-open');
  }
}

// ─── View hint overlay ────────────────────────────────────────────────────────

let _hintTimer = null;

function _showViewSwipeHint(view, direction) {
  let el = document.getElementById('swipe-hint');
  if (!el) {
    el = document.createElement('div');
    el.id          = 'swipe-hint';
    el.className   = 'swipe-hint';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }

  const labels = { editor: 'Editor', corkboard: 'Corkboard', outline: 'Outline' };
  const arrow  = direction === 'left' ? '→' : '←';
  el.textContent = `${arrow} ${labels[view] ?? view}`;
  el.classList.add('swipe-hint--visible');

  clearTimeout(_hintTimer);
  _hintTimer = setTimeout(() => el.classList.remove('swipe-hint--visible'), 1200);
}
