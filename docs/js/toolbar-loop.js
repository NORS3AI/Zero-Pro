// toolbar-loop.js — Smooth infinite horizontal scroll loop for the toolbar
// Strategy: three groups (before-clone, original, after-clone).
// When the user scrolls into a clone, instantly teleport to the equivalent
// position in the original — invisible to the eye, no jank.

export function initToolbarLoop() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  let _built = false;

  const _tryInit = () => {
    if (_built) return;
    // Give layout time to paint
    requestAnimationFrame(() => {
      if (toolbar.scrollWidth > toolbar.clientWidth + 8) {
        _buildLoop(toolbar);
        _built = true;
        window.removeEventListener('resize', _tryInit);
      }
    });
  };

  setTimeout(_tryInit, 250);
  window.addEventListener('resize', _tryInit, { passive: true });
}

// ─── Build ────────────────────────────────────────────────────────────────────

function _buildLoop(toolbar) {
  if (document.getElementById('toolbar-scroll-track')) return;

  // Gather all current toolbar children
  const children = Array.from(toolbar.childNodes);

  // Original group — keeps all IDs and live event listeners untouched
  const orig = document.createElement('div');
  orig.className = 'toolbar-loop-group toolbar-loop-orig';
  children.forEach(n => orig.appendChild(n));

  // Scroll track wraps the three groups
  const track = document.createElement('div');
  track.id        = 'toolbar-scroll-track';
  track.className = 'toolbar-scroll-track';
  toolbar.appendChild(track);

  const before = _buildClone(orig, 'before');
  const after  = _buildClone(orig, 'after');

  track.appendChild(before);
  track.appendChild(orig);
  track.appendChild(after);

  // Scroll to the original (center group) without animation
  const _jumpToOrig = () => {
    const w = orig.offsetWidth;
    if (!w) { requestAnimationFrame(_jumpToOrig); return; }
    _setScrollInstant(track, w);
    _attachScrollLoop(track, orig);
  };
  requestAnimationFrame(() => requestAnimationFrame(_jumpToOrig));
}

// ─── Infinite-loop scroll handler ─────────────────────────────────────────────

function _attachScrollLoop(track, orig) {
  let _busy = false;  // guard: skip events fired by our own teleport

  track.addEventListener('scroll', () => {
    if (_busy) return;

    requestAnimationFrame(() => {
      if (_busy) return;
      const w  = orig.offsetWidth;
      if (!w) return;
      const sl = track.scrollLeft;

      // Entered before-clone territory (scrolled left past 30% of its width)
      if (sl < w * 0.3) {
        _busy = true;
        _setScrollInstant(track, sl + w);
        requestAnimationFrame(() => { _busy = false; });
        return;
      }

      // Entered after-clone territory (scrolled right past 70% of orig + clone-before)
      if (sl > w * 1.7) {
        _busy = true;
        _setScrollInstant(track, sl - w);
        requestAnimationFrame(() => { _busy = false; });
      }
    });
  }, { passive: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Set scrollLeft without triggering smooth-scroll animation */
function _setScrollInstant(el, value) {
  // Temporarily override any smooth behaviour
  const prev = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';
  el.scrollLeft = value;
  // Restore after browser has applied the new scrollLeft
  requestAnimationFrame(() => { el.style.scrollBehavior = prev; });
}

/** Deep-clone source, strip IDs (store as data-forward-id), forward clicks */
function _buildClone(source, side) {
  const clone = source.cloneNode(true);
  clone.className = `toolbar-loop-group toolbar-loop-clone toolbar-loop-clone--${side}`;
  clone.setAttribute('aria-hidden', 'true');

  // Strip IDs to avoid duplicates; remember originals for click forwarding
  clone.querySelectorAll('[id]').forEach(el => {
    el.dataset.forwardId = el.id;
    el.removeAttribute('id');
  });

  clone.addEventListener('click', e => {
    e.stopPropagation();
    // Try data-forward-id first
    const fromAttr = e.target.closest('[data-forward-id]');
    if (fromAttr?.dataset.forwardId) {
      document.getElementById(fromAttr.dataset.forwardId)?.click();
      return;
    }
    // Fallback: match by button text content
    const btn = e.target.closest('button');
    if (btn) {
      const text = btn.textContent?.trim();
      if (text) {
        const match = Array.from(document.querySelectorAll('#toolbar button'))
          .find(b => b.textContent?.trim() === text);
        match?.click();
      }
    }
  });

  return clone;
}
