import type { PlanetKind } from '../types';
import { audioOutput } from './audio';

/**
 * Trilha sonora gerada em tempo real com WebAudio (sem arquivos de áudio).
 * Três climas: `hangar` (ambiente calmo), `pad` (tensão na base de lançamento)
 * e `flight` (ritmo de voo: tom conforme o planeta, andamento conforme a
 * dificuldade). Um agendador olha 0,25 s à frente e marca as notas em
 * semicolcheias; trocar de clima faz um crossfade.
 */

export type Mood = 'hangar' | 'pad' | 'flight';

interface Style {
  bpm: number;
  /** Nota MIDI da tônica. */
  root: number;
  scale: number[];
  /** Graus da escala (0 = tônica), um acorde a cada 2 compassos. */
  progression: number[];
  pad: number;
  arp: number;
  /** Arpejo a cada N semicolcheias (0 = sem arpejo). */
  arpEvery: number;
  bass: boolean;
  drums: boolean;
  /** Batida de coração lenta (base de lançamento). */
  heartbeat: boolean;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const FLIGHT_ROOT: Record<PlanetKind, number> = { earth: 50, moon: 45, ceres: 52, mars: 48, gas: 53 };

function styleFor(mood: Mood, kind: PlanetKind, difficulty: number): Style {
  switch (mood) {
    case 'hangar':
      return { bpm: 72, root: 53, scale: MAJOR, progression: [0, 5, 3, 4], pad: 0.045, arp: 0.035, arpEvery: 4, bass: false, drums: false, heartbeat: false };
    case 'pad':
      return { bpm: 84, root: 50, scale: MINOR, progression: [0, 0, 5, 6], pad: 0.05, arp: 0.025, arpEvery: 8, bass: false, drums: false, heartbeat: true };
    case 'flight':
      return {
        bpm: 104 + difficulty * 8,
        root: FLIGHT_ROOT[kind],
        scale: MINOR,
        progression: [0, 5, 2, 6],
        pad: 0.035,
        arp: 0.04,
        arpEvery: 2,
        bass: true,
        drums: true,
        heartbeat: false,
      };
  }
}

const MUSIC_KEY = 'dogcity_music';
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let enabled = readEnabled();
let gestured = false;
let wanted: { mood: Mood; kind: PlanetKind; difficulty: number } | null = null;
let current: { key: string; bus: GainNode; timer: number; stop(): void } | null = null;
let noiseBuf: AudioBuffer | null = null;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== '0';
  } catch {
    return true;
  }
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Nota da escala no grau `deg` (pode passar de 7: sobe oitavas). */
function degree(style: Style, deg: number, octave = 0): number {
  const n = style.scale.length;
  const o = Math.floor(deg / n);
  return style.root + style.scale[((deg % n) + n) % n] + 12 * (o + octave);
}

function start(mood: Mood, kind: PlanetKind, difficulty: number) {
  const a = audioOutput();
  if (!a) return;
  const { ctx } = a;
  const style = styleFor(mood, kind, difficulty);
  const step = 60 / style.bpm / 4; // semicolcheia

  // Barramento da música: volume próprio + eco discreto.
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(mood === 'flight' ? 0.55 : 0.75, ctx.currentTime + 2);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = step * 3;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(bus);
  bus.connect(a.out);

  const voice = (t: number, freq: number, dur: number, type: OscillatorType, gain: number, cutoff: number, attack: number, send = false, detune = 0) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + attack);
    osc.connect(f).connect(g).connect(bus);
    if (send) g.connect(delay);
    osc.start(t);
    osc.stop(t + dur + attack + 0.05);
  };

  const kick = (t: number, gain: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  const hat = (t: number, gain: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.06);
  };

  const CHORD_STEPS = 32; // 2 compassos
  const ARP = [0, 2, 4, 7, 4, 2];
  let n = 0;
  let next = ctx.currentTime + 0.1;

  const tick = () => {
    while (next < ctx.currentTime + 0.25) {
      const deg = style.progression[Math.floor(n / CHORD_STEPS) % style.progression.length];
      const inChord = n % CHORD_STEPS;
      if (inChord === 0) {
        // Pad: tríade + sétima, duas vozes levemente desafinadas.
        const len = CHORD_STEPS * step;
        for (const d of [0, 2, 4, 6]) {
          const f = midi(degree(style, deg + d));
          voice(next, f, len, 'sawtooth', style.pad, 900, 1.2, false, -7);
          voice(next, f, len, 'sawtooth', style.pad, 900, 1.2, false, 7);
        }
        voice(next, midi(degree(style, deg, -1)), len, 'sine', style.pad * 1.6, 400, 1.5);
      }
      if (style.arpEvery && n % style.arpEvery === 0) {
        const k = Math.floor(n / style.arpEvery);
        // Hangar: arpejo rarefeito (pula notas); voo: contínuo.
        if (style.drums || k % 3 !== 2) {
          voice(next, midi(degree(style, deg + ARP[k % ARP.length], 1)), step * style.arpEvery * 0.9, 'triangle', style.arp, 3200, 0.01, true);
        }
      }
      if (style.bass && n % 2 === 0) {
        const up = n % 8 === 6 ? 12 : 0;
        voice(next, midi(degree(style, deg, -1) + up), step * 1.6, 'sawtooth', 0.07, 520, 0.01);
      }
      if (style.drums) {
        if (n % 4 === 0) kick(next, n % 16 === 0 ? 0.42 : 0.3);
        if (n % 4 === 2) hat(next, 0.05);
        if (n % 2 === 1) hat(next, 0.018);
      }
      if (style.heartbeat && (n % 16 === 0 || n % 16 === 3)) kick(next, n % 16 === 0 ? 0.22 : 0.14);
      n += 1;
      next += step;
    }
  };
  tick();
  const timer = window.setInterval(tick, 60);

  current = {
    key: `${mood}|${kind}|${difficulty}`,
    bus,
    timer,
    stop() {
      window.clearInterval(timer);
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      window.setTimeout(() => bus.disconnect(), 1600);
    },
  };
}

function apply() {
  if (!enabled || !gestured || !wanted) {
    current?.stop();
    current = null;
    return;
  }
  const key = `${wanted.mood}|${wanted.kind}|${wanted.difficulty}`;
  if (current?.key === key) return;
  current?.stop();
  current = null;
  start(wanted.mood, wanted.kind, wanted.difficulty);
}

if (typeof window !== 'undefined') {
  // O navegador só libera áudio depois de um toque ou tecla.
  const onGesture = () => {
    gestured = true;
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    apply();
  };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  // Aba escondida: silencia (e economiza bateria); ao voltar, retoma.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      current?.stop();
      current = null;
    } else apply();
  });
}

export const music = {
  /** Define o clima desejado; começa a tocar assim que houver um gesto do jogador. */
  play(mood: Mood, kind: PlanetKind = 'earth', difficulty = 1) {
    wanted = { mood, kind, difficulty };
    apply();
  },
  stop() {
    wanted = null;
    apply();
  },
};

export function isMusicEnabled(): boolean {
  return enabled;
}

export function setMusicEnabled(value: boolean): void {
  enabled = value;
  try {
    localStorage.setItem(MUSIC_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
  apply();
}
