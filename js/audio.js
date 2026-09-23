// audio.js — Prozedural erzeugte Soundeffekte über die Web Audio API (keine externen
// Audio-Dateien nötig). Ein gemeinsamer AudioContext + Rausch-Buffer werden lazy angelegt.
let ctx = null;
let noiseBuffer = null;
let masterGain = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.55;
  masterGain.connect(ctx.destination);

  const len = ctx.sampleRate * 1;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Muss nach einer echten Nutzer-Geste (Klick) aufgerufen werden, sonst bleibt der Context stumm. */
export function resumeAudio() {
  const c = ensureContext();
  if (c && c.state === "suspended") c.resume();
}

export function setMasterVolume(v) {
  ensureContext();
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

function noiseSource(duration) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loopStart = Math.random() * 0.5;
  src.loop = true;
  return src;
}

function envGain(startVal, endVal, duration) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(startVal, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(endVal, 0.0001), ctx.currentTime + duration);
  return g;
}

/** Kurzer Schuss-Knall: gefilterter Noise-Burst + kurzer Pitch-Blip. Skaliert mit Waffengewicht. */
export function playShot(weight = 1) {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;

  const src = noiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2200 * weight;
  const g = envGain(0.5, 0.001, 0.09 + weight * 0.02);
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + 0.12);

  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(180 * weight, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
  const og = envGain(0.25, 0.001, 0.09);
  osc.connect(og);
  og.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playReload() {
  const c = ensureContext();
  if (!c) return;
  for (const delay of [0, 0.16]) {
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.value = 500;
    const g = envGain(0.18, 0.001, 0.05);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

export function playHitmarker() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1400, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.05);
  const g = envGain(0.3, 0.001, 0.06);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.07);
}

export function playHeadshot() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(2400, t + 0.05);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.11);
  const g = envGain(0.32, 0.001, 0.13);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.14);
}

export function playMelee() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const src = noiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, t);
  filter.frequency.exponentialRampToValueAtTime(400, t + 0.14);
  const g = envGain(0.35, 0.001, 0.15);
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + 0.16);
}

export function playExplosion() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const src = noiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + 0.5);
  const g = envGain(0.6, 0.001, 0.55);
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + 0.6);

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const og = envGain(0.4, 0.001, 0.45);
  osc.connect(og);
  og.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.45);
}

export function playDeath() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.5);
  const g = envGain(0.3, 0.001, 0.55);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.55);
}

export function playRespawn() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.25);
  const g = envGain(0.25, 0.001, 0.3);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Kurzer aufsteigender Whoosh für den Dash. */
export function playDash() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const src = noiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(2200, t + 0.14);
  const g = envGain(0.3, 0.001, 0.16);
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + 0.17);
}

export function playJump() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
  const g = envGain(0.15, 0.001, 0.1);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playLand() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const src = noiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const g = envGain(0.2, 0.001, 0.08);
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + 0.09);
}

export function playUiClick() {
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 700;
  const g = envGain(0.2, 0.001, 0.05);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** Kleiner aufsteigender Dreiklang für Level-Up/Unlock-Belohnungen. */
export function playReward() {
  const c = ensureContext();
  if (!c) return;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const t = c.currentTime + i * 0.09;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = envGain(0.22, 0.001, 0.22);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.24);
  });
}
