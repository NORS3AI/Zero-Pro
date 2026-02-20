// ambient.js — Ambient sound player using Web Audio API
// Uses AudioBufferSourceNode (looped pre-generated noise) for all sounds.
// All sounds are synthesized procedurally — no external files required.

// ─── Sound Definitions ────────────────────────────────────────────────────────

const SOUNDS = [
  { id: 'rain',       label: 'Rain',        icon: '🌧' },
  { id: 'fireplace',  label: 'Fireplace',   icon: '🔥' },
  { id: 'cafe',       label: 'Café',        icon: '☕' },
  { id: 'wind',       label: 'Wind',        icon: '🌬' },
  { id: 'whitenoise', label: 'White Noise', icon: '📻' },
  { id: 'ocean',      label: 'Ocean',       icon: '🌊' },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _audioCtx   = null;
let _gainNode   = null;
let _active     = null;   // { id, stop() }
let _panel      = null;
let _volume     = 0.3;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Initialise the ambient module (no-op until user opens it) */
export function initAmbient() {}

/** Open or toggle the ambient sound panel */
export function openAmbientPanel() {
  if (!_panel) {
    _panel = _buildPanel();
    document.body.appendChild(_panel);
  }
  _panel.classList.toggle('hidden');
}

/** Play a sound by ID, or stop if it's already active */
export function playAmbientSound(id) {
  if (_active?.id === id) { _stop(); } else { _play(id); }
  if (_panel) _updateButtons(_panel);
}

/** Stop all ambient sound */
export function stopAmbientSound() {
  _stop();
  if (_panel) _updateButtons(_panel);
}

/** Return the currently playing sound ID, or null */
export function getActiveSound() { return _active?.id ?? null; }

/** Return current volume (0–1) */
export function getSoundVolume() { return _volume; }

/** Set volume (0–1) */
export function setSoundVolume(v) {
  _volume = Math.max(0, Math.min(1, v));
  if (_gainNode) _gainNode.gain.value = _volume;
}

/** Return the SOUNDS array for rendering UI */
export function getSoundList() { return SOUNDS; }

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

  panel.querySelectorAll('.ambient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sound;
      if (_active?.id === id) { _stop(); } else { _play(id); }
      _updateButtons(panel);
    });
  });

  panel.querySelector('#ambient-volume')?.addEventListener('input', e => {
    _volume = parseInt(e.target.value, 10) / 100;
    if (_gainNode) _gainNode.gain.value = _volume;
  });

  return panel;
}

function _updateButtons(panel) {
  panel.querySelectorAll('.ambient-btn').forEach(btn => {
    const active = btn.dataset.sound === (_active?.id ?? null);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────

function _ensureCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _gainNode = _audioCtx.createGain();
    _gainNode.gain.value = _volume;
    _gainNode.connect(_audioCtx.destination);
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
}

function _stop() {
  _active?.stop();
  _active = null;
}

function _play(id) {
  _stop();
  _ensureCtx();
  let handle;
  switch (id) {
    case 'rain':       handle = _createRain();       break;
    case 'fireplace':  handle = _createFireplace();  break;
    case 'cafe':       handle = _createCafe();       break;
    case 'wind':       handle = _createWind();       break;
    case 'whitenoise': handle = _createWhiteNoise(); break;
    case 'ocean':      handle = _createOcean();      break;
    default: return;
  }
  _active = { id, stop: handle.stop };
}

// ─── Noise Buffer Factory ─────────────────────────────────────────────────────

/**
 * Create a looping AudioBufferSourceNode filled with noise.
 * @param {'white'|'pink'|'brown'} type
 * @param {number} [secs=3] buffer duration
 */
function _noiseSource(type = 'white', secs = 3) {
  const sr     = _audioCtx.sampleRate;
  const len    = sr * secs;
  const buf    = _audioCtx.createBuffer(1, len, sr);
  const data   = buf.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }

  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }

  const src = _audioCtx.createBufferSource();
  src.buffer = buf;
  src.loop   = true;
  return src;
}

/** Convenience: create and start an LFO oscillator */
function _lfo(freq, gainVal) {
  const osc = _audioCtx.createOscillator();
  const g   = _audioCtx.createGain();
  osc.frequency.value = freq;
  g.gain.value        = gainVal;
  osc.connect(g);
  osc.start();
  return { osc, gain: g };
}

/** Create a BiquadFilter shorthand */
function _filter(type, freq, Q = 1) {
  const f = _audioCtx.createBiquadFilter();
  f.type            = type;
  f.frequency.value = freq;
  f.Q.value         = Q;
  return f;
}

/** Create a GainNode shorthand */
function _gain(val) {
  const g = _audioCtx.createGain();
  g.gain.value = val;
  return g;
}

// ─── Sound Generators ─────────────────────────────────────────────────────────

/** Rain — heavy drops + fine spray + distant rumble */
function _createRain() {
  // Layer 1: main rain body — bandpass filtered white noise
  const src1  = _noiseSource('white');
  const bp1   = _filter('bandpass', 400, 0.6);
  const gDrop = _gain(0.65);

  // Slowly vary rain intensity
  const lfo1 = _lfo(0.07, 0.15);
  lfo1.gain.connect(gDrop.gain);

  src1.connect(bp1); bp1.connect(gDrop); gDrop.connect(_gainNode);

  // Layer 2: fine spray — highpass hiss
  const src2   = _noiseSource('white');
  const hp     = _filter('highpass', 3500, 0.5);
  const gSpray = _gain(0.3);
  src2.connect(hp); hp.connect(gSpray); gSpray.connect(_gainNode);

  // Layer 3: low-frequency impact rumble — brown noise
  const src3   = _noiseSource('brown');
  const lp     = _filter('lowpass', 120);
  const gRumble = _gain(0.25);
  src3.connect(lp); lp.connect(gRumble); gRumble.connect(_gainNode);

  src1.start(); src2.start(); src3.start();

  return {
    stop() {
      [src1, src2, src3].forEach(s => { try { s.stop(); } catch {} });
      lfo1.osc.stop();
    },
  };
}

/** Fireplace — crackling fire with rumble base */
function _createFireplace() {
  // Layer 1: low rumble / ember glow
  const src1  = _noiseSource('brown');
  const lp1   = _filter('lowpass', 250);
  const gBase = _gain(0.55);
  src1.connect(lp1); lp1.connect(gBase); gBase.connect(_gainNode);

  // Layer 2: mid crackle body
  const src2    = _noiseSource('brown');
  const bp2     = _filter('bandpass', 900, 1.5);
  const gCrackle = _gain(0.35);
  // Irregular fast LFO for crackle bursts
  const lfo2 = _lfo(3.7, 0.3);
  lfo2.gain.connect(gCrackle.gain);
  src2.connect(bp2); bp2.connect(gCrackle); gCrackle.connect(_gainNode);

  // Layer 3: high frequency snaps / sparks
  const src3   = _noiseSource('white');
  const bp3    = _filter('bandpass', 3200, 3);
  const gSnap  = _gain(0.18);
  // Faster, irregular LFO for spark bursts
  const lfo3 = _lfo(5.3, 0.15);
  lfo3.gain.connect(gSnap.gain);
  src3.connect(bp3); bp3.connect(gSnap); gSnap.connect(_gainNode);

  src1.start(); src2.start(); src3.start();

  return {
    stop() {
      [src1, src2, src3].forEach(s => { try { s.stop(); } catch {} });
      lfo2.osc.stop(); lfo3.osc.stop();
    },
  };
}

/** Café — layered chatter, clinking, and espresso machine hiss */
function _createCafe() {
  // Layer 1: low-frequency chatter murmur
  const src1    = _noiseSource('brown');
  const bp1     = _filter('bandpass', 280, 1);
  const gMurmur = _gain(0.45);
  const lfo1    = _lfo(0.11, 0.18);
  lfo1.gain.connect(gMurmur.gain);
  src1.connect(bp1); bp1.connect(gMurmur); gMurmur.connect(_gainNode);

  // Layer 2: mid-frequency chatter
  const src2   = _noiseSource('pink');
  const bp2    = _filter('bandpass', 900, 0.8);
  const gChat  = _gain(0.28);
  const lfo2   = _lfo(0.19, 0.12);
  lfo2.gain.connect(gChat.gain);
  src2.connect(bp2); bp2.connect(gChat); gChat.connect(_gainNode);

  // Layer 3: distant room tone / espresso machine hiss
  const src3  = _noiseSource('white');
  const hp3   = _filter('highpass', 4500, 0.5);
  const gHiss = _gain(0.14);
  src3.connect(hp3); hp3.connect(gHiss); gHiss.connect(_gainNode);

  // Layer 4: occasional clink (very low level mid notch)
  const src4    = _noiseSource('white');
  const bp4     = _filter('bandpass', 2000, 6);
  const gClink  = _gain(0.1);
  const lfo4    = _lfo(0.33, 0.08);
  lfo4.gain.connect(gClink.gain);
  src4.connect(bp4); bp4.connect(gClink); gClink.connect(_gainNode);

  src1.start(); src2.start(); src3.start(); src4.start();

  return {
    stop() {
      [src1, src2, src3, src4].forEach(s => { try { s.stop(); } catch {} });
      lfo1.osc.stop(); lfo2.osc.stop(); lfo4.osc.stop();
    },
  };
}

/** Wind — gusting multi-layer wind */
function _createWind() {
  // Layer 1: main gust — lowpass filtered pink noise with sweeping cutoff
  const src1  = _noiseSource('pink');
  const lp1   = _filter('lowpass', 700, 1.2);
  const gMain = _gain(0.55);

  // LFO modulates filter cutoff for gusting effect
  const lfo1 = _lfo(0.12, 450);
  lfo1.gain.connect(lp1.frequency);

  // LFO also modulates amplitude gently
  const lfo1b = _lfo(0.08, 0.18);
  lfo1b.gain.connect(gMain.gain);

  src1.connect(lp1); lp1.connect(gMain); gMain.connect(_gainNode);

  // Layer 2: high-pitched whistle through narrow bandpass
  const src2     = _noiseSource('pink');
  const bp2      = _filter('bandpass', 2800, 8);
  const gWhistle = _gain(0.18);
  const lfo2     = _lfo(0.06, 0.16);
  lfo2.gain.connect(gWhistle.gain);
  src2.connect(bp2); bp2.connect(gWhistle); gWhistle.connect(_gainNode);

  // Layer 3: deep low-frequency pressure
  const src3    = _noiseSource('brown');
  const lp3     = _filter('lowpass', 60);
  const gDeep   = _gain(0.3);
  const lfo3    = _lfo(0.05, 0.2);
  lfo3.gain.connect(gDeep.gain);
  src3.connect(lp3); lp3.connect(gDeep); gDeep.connect(_gainNode);

  src1.start(); src2.start(); src3.start();

  return {
    stop() {
      [src1, src2, src3].forEach(s => { try { s.stop(); } catch {} });
      lfo1.osc.stop(); lfo1b.osc.stop(); lfo2.osc.stop(); lfo3.osc.stop();
    },
  };
}

/** White Noise — clean broadband noise, slightly warmed */
function _createWhiteNoise() {
  const src   = _noiseSource('white');
  const shelf = _filter('highshelf', 6000);
  shelf.gain.value = -6; // slightly roll off highs for a softer feel
  const g = _gain(0.7);
  src.connect(shelf); shelf.connect(g); g.connect(_gainNode);
  src.start();
  return { stop() { try { src.stop(); } catch {} } };
}

/** Ocean — rolling waves with surf and deep swell */
function _createOcean() {
  // Layer 1: mid-frequency surf / wave crash
  const src1   = _noiseSource('pink');
  const bp1    = _filter('bandpass', 500, 0.7);
  const gSurf  = _gain(0.5);
  // Slow swell LFO — wave period ~6-8 seconds
  const lfo1   = _lfo(0.14, 0.35);
  lfo1.gain.connect(gSurf.gain);
  src1.connect(bp1); bp1.connect(gSurf); gSurf.connect(_gainNode);

  // Layer 2: high-frequency foam / spray
  const src2   = _noiseSource('white');
  const hp2    = _filter('highpass', 2500, 0.6);
  const gFoam  = _gain(0.22);
  const lfo2   = _lfo(0.17, 0.18);
  lfo2.gain.connect(gFoam.gain);
  src2.connect(hp2); hp2.connect(gFoam); gFoam.connect(_gainNode);

  // Layer 3: deep ocean rumble
  const src3    = _noiseSource('brown');
  const lp3     = _filter('lowpass', 80);
  const gRumble = _gain(0.35);
  const lfo3    = _lfo(0.09, 0.2);
  lfo3.gain.connect(gRumble.gain);
  src3.connect(lp3); lp3.connect(gRumble); gRumble.connect(_gainNode);

  src1.start(); src2.start(); src3.start();

  return {
    stop() {
      [src1, src2, src3].forEach(s => { try { s.stop(); } catch {} });
      lfo1.osc.stop(); lfo2.osc.stop(); lfo3.osc.stop();
    },
  };
}
