// ambient.js — Ambient sound player (stub)
// Sound files will be linked here in a future update.
// All public API methods are preserved so the rest of the app compiles fine.

import { showToast } from './ui.js';

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

let _volume = 0.3;

// ─── Public API ───────────────────────────────────────────────────────────────

export function initAmbient() {}

export function openAmbientPanel() {
  // Panel is now inside Settings > Ambience — nothing to do here.
}

export function playAmbientSound(_id) {
  showToast('Ambient sounds coming soon — audio files loading later');
}

export function stopAmbientSound() {}

export function getActiveSound() { return null; }

export function getSoundVolume() { return _volume; }

export function setSoundVolume(v) {
  _volume = Math.max(0, Math.min(1, v));
}

export function getSoundList() { return SOUNDS; }
