// All sound is synthesized with WebAudio: oscillators and filtered noise, no
// audio files, no network. Every call is guarded so a missing or blocked
// AudioContext can never break the game. The context starts on the first user
// gesture (browsers require one); sounds before that are silently skipped.

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = false;

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.16;
}

export function isMuted() {
  return muted;
}

// Call from a user gesture (click / key). Safe to call repeatedly.
export function ensureAudio() {
  if (ctx || typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.16;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 0.5;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch (err) {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo, delay) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (err) { /* sound is never load-bearing */ }
}

function noise(dur, vol, filterFreq, delay) {
  if (!ctx || muted || !noiseBuffer) return;
  try {
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch (err) { /* sound is never load-bearing */ }
}

export const sfx = {
  shoot(kind) {
    if (kind === 'ember') { tone(140, 0.12, 'triangle', 0.5, 60); noise(0.08, 0.25, 500); }
    else if (kind === 'frost') { tone(880, 0.09, 'sine', 0.3, 1400); }
    else if (kind === 'storm') { noise(0.07, 0.3, 4000); tone(1800, 0.06, 'sawtooth', 0.12, 300); }
    else { tone(720, 0.06, 'square', 0.16, 320); }
  },
  hit() { tone(220, 0.05, 'triangle', 0.25, 140); },
  explosion() { noise(0.3, 0.5, 350); tone(90, 0.25, 'sine', 0.6, 40); },
  enemyDown() { tone(520, 0.08, 'triangle', 0.3, 180); tone(780, 0.1, 'sine', 0.2, 240, 0.04); },
  coin() { tone(1320, 0.07, 'sine', 0.25); tone(1760, 0.1, 'sine', 0.22, null, 0.06); },
  place() { tone(340, 0.09, 'triangle', 0.4, 520); noise(0.06, 0.2, 900); },
  error() { tone(160, 0.14, 'sawtooth', 0.25, 110); },
  click() { tone(600, 0.04, 'sine', 0.2); },
  upgrade() { tone(520, 0.08, 'triangle', 0.3); tone(660, 0.08, 'triangle', 0.3, null, 0.07); tone(880, 0.12, 'triangle', 0.3, null, 0.14); },
  sell() { tone(880, 0.07, 'sine', 0.25, 660); tone(660, 0.09, 'sine', 0.22, 520, 0.06); },
  waveStart() { tone(220, 0.16, 'triangle', 0.4, 330); tone(330, 0.16, 'triangle', 0.35, 440, 0.12); },
  leak() { tone(196, 0.3, 'sawtooth', 0.4, 82); noise(0.2, 0.3, 300); },
  bossWarn() { tone(98, 0.4, 'sawtooth', 0.45, 65); tone(147, 0.4, 'sawtooth', 0.35, 98, 0.15); },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.35, null, i * 0.13));
    tone(1319, 0.4, 'sine', 0.3, null, 0.55);
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.35, null, i * 0.18));
  },
};
