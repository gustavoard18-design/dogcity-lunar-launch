/**
 * Efeitos sonoros sintetizados com WebAudio: nenhum asset para baixar.
 * O AudioContext só é criado após um gesto do usuário (política dos navegadores).
 */

const MUTE_KEY = 'dogcity_muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let engine: { src: AudioBufferSourceNode; osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // Ruído marrom: mais grave, soa como turbina.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return noiseBuffer;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + (opts.delay ?? 0);
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function burst(dur: number, opts: { gain?: number; freq?: number; q?: number; delay?: number; type?: BiquadFilterType } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + (opts.delay ?? 0);
  const src = a.ctx.createBufferSource();
  src.buffer = noise(a.ctx);
  const filter = a.ctx.createBiquadFilter();
  filter.type = opts.type ?? 'lowpass';
  filter.frequency.value = opts.freq ?? 1200;
  filter.Q.value = opts.q ?? 0.7;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(a.out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() {
    audio();
  },
  click() {
    tone(660, 0.06, { type: 'triangle', gain: 0.08 });
  },
  tick() {
    tone(1200, 0.03, { type: 'square', gain: 0.025 });
  },
  lock(quality: number) {
    if (quality >= 0.95) {
      tone(880, 0.12, { type: 'triangle', gain: 0.18 });
      tone(1320, 0.2, { type: 'triangle', gain: 0.16, delay: 0.07 });
    } else if (quality >= 0.6) {
      tone(700, 0.15, { type: 'triangle', gain: 0.16 });
    } else {
      tone(260, 0.25, { type: 'sawtooth', gain: 0.1, slideTo: 140 });
    }
  },
  perfect() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.14, delay: i * 0.06 }));
  },
  countdown(final = false) {
    tone(final ? 1046 : 523, final ? 0.5 : 0.18, { type: 'square', gain: 0.07 });
  },
  liftoff() {
    burst(2.8, { gain: 0.9, freq: 400 });
    burst(1.2, { gain: 0.4, freq: 2500, type: 'bandpass', q: 0.4 });
    tone(55, 2.5, { type: 'sawtooth', gain: 0.18, slideTo: 90 });
  },
  pickup(combo: number) {
    const f = 880 * Math.pow(2, Math.min(combo, 12) / 12);
    tone(f, 0.09, { type: 'sine', gain: 0.1 });
    tone(f * 1.5, 0.12, { type: 'sine', gain: 0.06, delay: 0.03 });
  },
  ring() {
    tone(300, 0.5, { type: 'sawtooth', gain: 0.06, slideTo: 1200 });
    burst(0.5, { gain: 0.25, freq: 3000, type: 'highpass' });
  },
  shield() {
    tone(440, 0.4, { type: 'sine', gain: 0.14, slideTo: 1760 });
  },
  shieldBreak() {
    tone(1500, 0.3, { type: 'square', gain: 0.07, slideTo: 200 });
    burst(0.3, { gain: 0.3, freq: 4000, type: 'highpass' });
  },
  hit() {
    burst(0.6, { gain: 0.9, freq: 700 });
    tone(90, 0.4, { type: 'square', gain: 0.18, slideTo: 40 });
  },
  explosion() {
    burst(2.2, { gain: 1, freq: 500 });
    tone(70, 1.5, { type: 'sawtooth', gain: 0.2, slideTo: 25 });
  },
  success() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.14, delay: i * 0.12 }));
    [1046, 1318, 1568].forEach(f => tone(f, 1.2, { type: 'sine', gain: 0.06, delay: 0.5 }));
  },
  fail() {
    [392, 330, 262].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.12, delay: i * 0.18 }));
  },
  levelUp() {
    [523, 784, 1046, 1568, 2093].forEach((f, i) => tone(f, 0.3, { type: 'square', gain: 0.05, delay: i * 0.08 }));
  },
  coin() {
    tone(988, 0.08, { type: 'square', gain: 0.06 });
    tone(1318, 0.25, { type: 'square', gain: 0.06, delay: 0.08 });
  },
};

/** Ronco contínuo do motor durante o voo. `level` em [0, 1+]. */
export const engineSound = {
  start() {
    const a = audio();
    if (!a || engine) return;
    const src = a.ctx.createBufferSource();
    src.buffer = noise(a.ctx);
    src.loop = true;
    const filter = a.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const osc = a.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 48;
    const oscGain = a.ctx.createGain();
    oscGain.gain.value = 0.05;
    const gain = a.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, a.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, a.ctx.currentTime + 0.5);
    src.connect(filter).connect(gain);
    osc.connect(oscGain).connect(gain);
    gain.connect(a.out);
    src.start();
    osc.start();
    engine = { src, osc, gain, filter };
  },
  set(level: number) {
    if (!engine || !ctx) return;
    const t = ctx.currentTime;
    engine.filter.frequency.setTargetAtTime(250 + level * 500, t, 0.1);
    engine.osc.frequency.setTargetAtTime(45 + level * 25, t, 0.1);
  },
  stop() {
    if (!engine || !ctx) return;
    const e = engine;
    engine = null;
    const t = ctx.currentTime;
    e.gain.gain.setTargetAtTime(0.0001, t, 0.2);
    e.src.stop(t + 1);
    e.osc.stop(t + 1);
  },
};

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.55, ctx.currentTime, 0.05);
}
