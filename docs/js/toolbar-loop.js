// toolbar-loop.js — Infinite horizontal scroll loop for the toolbar (Phase 8)
// Wraps the toolbar in a scroll track with cloned copies on each side.
// When the user scrolls into a clone, the track teleports back to the original
// — creating a seamless infinite loop.
// Clone clicks are forwarded to the matching original button via data-forward-id.

export function initToolbarLoop() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  // Only activate when the toolbar actually overflows (mobile / compact screens)
  const _tryInit = () => {
    if (toolbar.scrollWidth <= toolbar.clientWidth + 4) return; // fits — no loop needed
    _buildLoop(toolbar);
    window.removeEventListener('resize', _tryInit);
  };

  // Delay slightly so layout has settled
  setTimeout(_tryInit, 200);
  window.addEventListener('resize', _tryInit, { passive: true });
}

function _buildLoop(toolbar) {
  // Already initialised?
  if (document.getElementById('toolbar-scroll-track')) return;

  // Collect all current toolbar children
  const children = Array.from(toolbar.childNodes);

  // Build the original group (keeps all IDs and live event listeners)
  const origGroup = document.createElement('div');
  origGroup.className = 'toolbar-loop-group toolbar-loop-orig';
  children.forEach(n => origGroup.appendChild(n));

  // Build clones — strip IDs, mark aria-hidden, forward clicks
  const cloneBefore = _buildClone(origGroup, 'before');
  const cloneAfter  = _buildClone(origGroup, 'after');

  // Scroll track — horizontally scrollable flex row
  const track = document.createElement('div');
  track.id        = 'toolbar-scroll-track';
  track.className = 'toolbar-scroll-track';

  track.appendChild(cloneBefore);
  track.appendChild(origGroup);
  track.appendChild(cloneAfter);
  toolbar.appendChild(track);

  // Scroll to show the original (middle) group
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.scrollLeft = cloneBefore.offsetWidth;
    });
  });

  // Infinite loop via teleport
  let _raf = null;
  track.addEventListener('scroll', () => {
    if (_raf) return;
    _raf = requestAnimationFrame(() => {
      _raf = null;
      const origW = origGroup.offsetWidth;
      const beforeW = cloneBefore.offsetWidth;

      // If we've scrolled into the before-clone territory → jump forward by origW
      if (track.scrollLeft < beforeW * 0.5) {
        track.scrollLeft += origW;
      }
      // If we've scrolled into the after-clone territory → jump back by origW
      else if (track.scrollLeft > beforeW + origW * 0.75) {
        track.scrollLeft -= origW;
      }
    });
  }, { passive: true });
}

function _buildClone(source, side) {
  const clone = source.cloneNode(true);
  clone.className = `toolbar-loop-group toolbar-loop-clone toolbar-loop-clone--${side}`;
  clone.setAttribute('aria-hidden', 'true');

  // Strip all IDs to avoid duplicates; store original ID in data-forward-id
  clone.querySelectorAll('[id]').forEach(el => {
    el.dataset.forwardId = el.id;
    el.removeAttribute('id');
  });

  // Forward clicks on clone buttons to their originals
  clone.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-forward-id]') || e.target.closest('button');
    const fwdId = btn?.dataset?.forwardId;
    if (fwdId) {
      const orig = document.getElementById(fwdId);
      if (orig) {
        orig.click();
        return;
      }
    }
    // Fallback: find by matching text content for buttons without an ID
    const clicked = e.target.closest('button');
    if (clicked && !clicked.dataset.forwardId) {
      const text = clicked.textContent?.trim();
      if (text) {
        const origBtns = document.querySelectorAll('#toolbar button');
        const match = Array.from(origBtns).find(b =>
          b.textContent?.trim() === text && b.id
        );
        match?.click();
      }
    }
  });

  return clone;
}
