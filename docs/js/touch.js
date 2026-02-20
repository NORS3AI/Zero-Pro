// touch.js — Touch-optimised gestures for mobile PWA
// Phase 8: Android & Progressive Web App

// ─── Constants ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD    = 60;  // minimum px distance to trigger a swipe
const SWIPE_MAX_TIME     = 400; // maximum ms for a swipe gesture
const EDGE_ZONE          = 30;  // px from edge to start a swipe

// ─── State ────────────────────────────────────────────────────────────────────

let _touchStartX  = 0;
let _touchStartY  = 0;
let _touchStartT  = 0;
let _touchElement = null;
let _enabled      = false;

let _onSwipeLeft  = null;
let _onSwipeRight = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise touch gesture handling.
 * @param {{ onSwipeLeft: Function, onSwipeRight: Function }} opts
 */
export function initTouch({ onSwipeLeft, onSwipeRight }) {
  _onSwipeLeft  = onSwipeLeft;
  _onSwipeRight = onSwipeRight;

  // Only enable on touch devices or small screens
  if (!_isTouchDevice()) return;
  _enabled = true;

  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  workspace.addEventListener('touchstart',  _handleTouchStart, { passive: true });
  workspace.addEventListener('touchend',    _handleTouchEnd,   { passive: true });
  workspace.addEventListener('touchcancel', _handleTouchCancel, { passive: true });

  // Prevent pull-to-refresh in standalone PWA mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.style.overscrollBehavior = 'none';
  }
}

/**
 * Check if touch gestures are enabled.
 */
export function isTouchEnabled() {
  return _enabled;
}

// ─── Touch Handlers ──────────────────────────────────────────────────────────

function _handleTouchStart(e) {
  if (e.touches.length !== 1) return;

  const touch = e.touches[0];
  _touchStartX  = touch.clientX;
  _touchStartY  = touch.clientY;
  _touchStartT  = Date.now();
  _touchElement = e.target;
}

function _handleTouchEnd(e) {
  if (e.changedTouches.length !== 1) return;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - _touchStartX;
  const dy = touch.clientY - _touchStartY;
  const dt = Date.now() - _touchStartT;

  // Validate swipe
  if (dt > SWIPE_MAX_TIME) return;
  if (Math.abs(dy) > Math.abs(dx)) return; // vertical swipe, ignore
  if (Math.abs(dx) < SWIPE_THRESHOLD) return;

  // Don't intercept swipes inside the editor or other scrollable elements
  if (_isScrollableElement(_touchElement)) return;

  // Check edge zone — swipes must start from the edge of the screen
  const screenW = window.innerWidth;
  const startedFromLeftEdge  = _touchStartX < EDGE_ZONE;
  const startedFromRightEdge = _touchStartX > screenW - EDGE_ZONE;

  if (dx > 0 && startedFromLeftEdge) {
    // Swipe right from left edge → open binder
    _onSwipeRight?.();
  } else if (dx < 0 && startedFromRightEdge) {
    // Swipe left from right edge → open inspector
    _onSwipeLeft?.();
  }
}

function _handleTouchCancel() {
  _touchStartX = 0;
  _touchStartY = 0;
  _touchStartT = 0;
  _touchElement = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _isTouchDevice() {
  return 'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;
}

function _isScrollableElement(el) {
  if (!el) return false;
  // Walk up the DOM tree looking for scrollable containers
  let current = el;
  while (current && current !== document.body) {
    if (current.id === 'editor') return true;
    if (current.id === 'binder-tree') return true;
    if (current.id === 'inspector-content') return true;
    if (current.id === 'ai-panel') return true;
    current = current.parentElement;
  }
  return false;
}
