// Tiny WebAudio synth for retro sound effects (the art pack has no audio).
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

try { muted = localStorage.getItem('frostyspace.muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, vol = 0.2, delay = 0 }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.3, f0 = 2000, f1 = 200, delay = 0 }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(filt).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

export const Sfx = {
  unlock() { ac(); },
  get muted() { return muted; },
  toggleMute() {
    muted = !muted;
    try { localStorage.setItem('frostyspace.muted', muted ? '1' : '0'); } catch { /* ignore */ }
    return muted;
  },
  shoot() { tone({ type: 'square', f0: 1200, f1: 600, dur: 0.05, vol: 0.05 }); },
  plasma() { tone({ type: 'sawtooth', f0: 500, f1: 900, dur: 0.08, vol: 0.05 }); },
  hit() { tone({ type: 'square', f0: 300, f1: 120, dur: 0.04, vol: 0.06 }); },
  hurt() { tone({ type: 'square', f0: 220, f1: 90, dur: 0.18, vol: 0.12 }); noise({ dur: 0.15, vol: 0.15, f0: 1500, f1: 200 }); },
  tink() { tone({ type: 'triangle', f0: 1800, f1: 1500, dur: 0.04, vol: 0.06 }); },
  explode() { noise({ dur: 0.35, vol: 0.35, f0: 3000, f1: 100 }); },
  bigExplode() {
    noise({ dur: 0.9, vol: 0.5, f0: 1500, f1: 40 });
    tone({ type: 'sine', f0: 120, f1: 30, dur: 0.8, vol: 0.4 });
  },
  enemyShot() { tone({ type: 'triangle', f0: 700, f1: 300, dur: 0.08, vol: 0.05 }); },
  powerup() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.07, vol: 0.08, delay: i * 0.06 }));
  },
  life() {
    [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.08, vol: 0.08, delay: i * 0.07 }));
  },
  bomb() {
    tone({ type: 'sawtooth', f0: 80, f1: 1600, dur: 0.4, vol: 0.15 });
    noise({ dur: 1.2, vol: 0.5, f0: 4000, f1: 60, delay: 0.3 });
  },
  playerDie() {
    tone({ type: 'square', f0: 800, f1: 60, dur: 0.8, vol: 0.15 });
    noise({ dur: 0.8, vol: 0.4, f0: 2000, f1: 80 });
  },
  warning() {
    for (let i = 0; i < 3; i++) {
      tone({ type: 'square', f0: 440, f1: 660, dur: 0.35, vol: 0.1, delay: i * 0.7 });
      tone({ type: 'square', f0: 660, f1: 440, dur: 0.35, vol: 0.1, delay: i * 0.7 + 0.35 });
    }
  },
  charge() { tone({ type: 'sawtooth', f0: 100, f1: 900, dur: 0.7, vol: 0.08 }); },
  laser() { noise({ dur: 1.4, vol: 0.15, f0: 6000, f1: 3000 }); tone({ type: 'sawtooth', f0: 90, f1: 80, dur: 1.4, vol: 0.08 }); },
  select() { tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.07 }); },
  confirm() { tone({ type: 'square', f0: 660, dur: 0.06, vol: 0.08 }); tone({ type: 'square', f0: 990, dur: 0.1, vol: 0.08, delay: 0.06 }); },
  stageClear() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.09, delay: i * 0.13 }));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.12, delay: i * 0.28 }));
  },
};
