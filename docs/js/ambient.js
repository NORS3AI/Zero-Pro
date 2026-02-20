// ambient.js — Ambient sound player using Web Audio API
// Phase 7: Nice-to-Haves & UI Polish

// ─── Sound Definitions ────────────────────────────────────────────────────────
// Each sound is generated procedurally via Web Audio API — no external files.

const SOUNDS = [
  { id: 'rain',      label: 'Rain',      icon: '🌧' },
  { id: 'cafe',      label: 'Café',      icon: '☕' },
  { id: 'whitenoise', label: 'White Noise', icon: '📻' },
  { id: 'fireplace', label: 'Fireplace', icon: '🔥' },
  { id: 'wind',      label: 'Wind',      icon: '🌬' },
];

// ─── State ─────────────────────────────────────────────────────────────────────

let _audioCtx   = null;
let _gainNode   = null;
let _activeId   = null;
let _sourceNode = null;
let _panel      = null;
let _volume     = 0.3;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Initialise the ambient module (no-op until user opens it) */
export function initAmbient() {
  // Nothing to wire at boot — panel is built lazily
}

/** Open or toggle the ambient sound panel */
export function openAmbientPanel() {
  if (!_panel) {
    _panel = _buildPanel();
    document.body.appendChild(_panel);
  }
  _panel.classList.toggle('hidden');
}

// ─── Panel Construction ───────────────────────────────────────────────────────

function _buildPanel() {
  const panel = document.createElement('div');
  panel.id        = 'ambient-panel';
  panel.className = 'ambient-panel hidden';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Ambient Sounds');

  let html = '<div class="ambient-header">Ambient Sounds</div>';
  html += '<div class="ambient-sounds">';
  SOUNDS.forEach(s => {
    html += `
      <button class="ambient-btn" data-sound="${s.id}" title="${s.label}" aria-pressed="false">
        <span class="ambient-icon">${s.icon}</span>
        <span class="ambient-label">${s.label}</span>
      </button>`;
  });
  html += '</div>';
  html += `
    <div class="ambient-volume-wrap">
      <label for="ambient-volume" class="ambient-vol-label">Volume</label>
      <input type="range" id="ambient-volume" class="ambient-volume" min="0" max="100" value="30">
    </div>`;

  panel.innerHTML = html;

  // Sound buttons
  panel.querySelectorAll('.ambient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sound;
      if (_activeId === id) {
        _stop();
      } else {
        _play(id);
      }
      _updateButtons(panel);
    });
  });

  // Volume slider
  panel.querySelector('#ambient-volume')?.addEventListener('input', e => {
    _volume = parseInt(e.target.value, 10) / 100;
    if (_gainNode) _gainNode.gain.value = _volume;
  });

  return panel;
}

function _updateButtons(panel) {
  panel.querySelectorAll('.ambient-btn').forEach(btn => {
    const active = btn.dataset.sound === _activeId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

// ─── Audio Engine ──────────────────────────────────────────────────────────────

function _ensureAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _gainNode = _audioCtx.createGain();
    _gainNode.gain.value = _volume;
    _gainNode.connect(_audioCtx.destination);
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
}

function _stop() {
  if (_sourceNode) {
    try { _sourceNode.stop(); } catch { /* ignore */ }
    try { _sourceNode.disconnect(); } catch { /* ignore */ }
  }
  _sourceNode = null;
  _activeId   = null;
}

function _play(id) {
  _stop();
  _ensureAudioContext();

  switch (id) {
    case 'rain':       _sourceNode = _createNoise('pink', 0.6); break;
    case 'cafe':       _sourceNode = _createCafeBuzz(); break;
    case 'whitenoise': _sourceNode = _createNoise('white', 0.5); break;
    case 'fireplace':  _sourceNode = _createNoise('brown', 0.7); break;
    case 'wind':       _sourceNode = _createWind(); break;
    default: return;
  }

  _activeId = id;
}

/** Create white/pink/brown noise via a ScriptProcessor (buffer-based) */
function _createNoise(type, amp) {
  const bufferSize = 4096;
  const node = _audioCtx.createScriptProcessor(bufferSize, 1, 1);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11 * amp;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        output[i] = ((b0 + (0.02 * white)) / 1.02) * amp;
        b0 = output[i] * 1.02;
      } else {
        output[i] = white * 0.4 * amp;
      }
    }
  };

  node.connect(_gainNode);
  return node;
}

/** Café buzz: filtered brown noise + occasional tonal blips */
function _createCafeBuzz() {
  const noise = _createNoise('brown', 0.3);

  // Add a bandpass filter for a muffled room tone
  const filter = _audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  noise.disconnect();
  noise.connect(filter);
  filter.connect(_gainNode);

  return noise;
}

/** Wind: modulated filtered noise */
function _createWind() {
  const noise = _createNoise('pink', 0.4);

  const filter = _audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 1;

  // Slowly oscillate the cutoff for a "gusting" effect
  const lfo = _audioCtx.createOscillator();
  const lfoGain = _audioCtx.createGain();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  noise.disconnect();
  noise.connect(filter);
  filter.connect(_gainNode);

  return noise;
}
