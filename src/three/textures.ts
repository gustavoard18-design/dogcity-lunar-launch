import * as THREE from 'three';
import type { PlanetKind } from '../types';

/**
 * Texturas procedurais (ruído fBm periódico em X para a costura da esfera
 * fechar sem emenda). Geradas uma vez e reaproveitadas.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const SIZE = 256;
  const table = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < table.length; i++) table[i] = rand();
  const smooth = (t: number) => t * t * (3 - 2 * t);
  // Valor em lattice com período `px` em X.
  const lattice = (x: number, y: number, px: number) =>
    table[(((y % SIZE) + SIZE) % SIZE) * SIZE + ((((x % px) + px) % px) % SIZE)];
  const value = (x: number, y: number, px: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = lattice(xi, yi, px);
    const b = lattice(xi + 1, yi, px);
    const c = lattice(xi, yi + 1, px);
    const d = lattice(xi + 1, yi + 1, px);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (u: number, v: number, freq: number, octaves: number) => {
    let sum = 0;
    let amp = 0.5;
    let f = freq;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += value(u * f, v * f * 0.5, Math.round(f)) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const sstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function paint(w: number, h: number, fn: (u: number, v: number) => RGB | [number, number, number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x / w, y / h);
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = c.length === 4 ? c[3] : 255;
    }
  }
  g.putImageData(img, 0, 0);
  return { canvas, g };
}

function craters(g: CanvasRenderingContext2D, w: number, h: number, count: number, seed: number, strength = 0.35) {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = h * (0.1 + rand() * 0.8);
    const r = Math.pow(rand(), 3) * w * 0.045 + 2;
    for (const dx of [0, -w, w]) {
      const grad = g.createRadialGradient(x + dx, y, r * 0.2, x + dx, y, r);
      grad.addColorStop(0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(0.75, `rgba(0,0,0,${strength * 0.6})`);
      grad.addColorStop(0.9, `rgba(255,255,255,${strength * 0.5})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x + dx, y, r, r * 0.9, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}

const W = 2048;
const H = 1024;

const painters: Record<PlanetKind | 'clouds' | 'rock', () => HTMLCanvasElement> = {
  earth: () => {
    const n = makeNoise(11);
    const deep = hex('#0a2a66');
    const shallow = hex('#1e6fb8');
    const sand = hex('#c9b27a');
    const grass = hex('#3f7a34');
    const forest = hex('#1f4d25');
    const desert = hex('#b88a4a');
    const snow = hex('#f2f6ff');
    return paint(W, H, (u, v) => {
      const e = n(u, v, 4, 6);
      const lat = Math.abs(v - 0.5) * 2;
      const polar = sstep(0.78, 0.88, lat + (n(u, v, 16, 2) - 0.5) * 0.15);
      let c: RGB;
      if (e < 0.5) c = mix(deep, shallow, sstep(0.3, 0.5, e));
      else if (e < 0.52) c = sand;
      else {
        const dry = n(u + 0.3, v, 3, 3);
        c = mix(mix(grass, forest, sstep(0.55, 0.7, e)), desert, sstep(0.55, 0.7, dry) * (1 - lat));
      }
      return mix(c, snow, polar);
    }).canvas;
  },
  clouds: () => {
    const n = makeNoise(29);
    return paint(W, H, (u, v) => {
      const c = n(u, v, 5, 6);
      const a = sstep(0.5, 0.72, c) * 255;
      return [255, 255, 255, a];
    }).canvas;
  },
  moon: () => {
    const n = makeNoise(5);
    const { canvas, g } = paint(W, H, (u, v) => {
      const e = n(u, v, 3, 6);
      const mare = sstep(0.45, 0.6, n(u + 0.5, v, 2, 3));
      const base = 95 + e * 110 - mare * 45;
      return [base, base, base * 1.02];
    });
    craters(g, W, H, 700, 51);
    return canvas;
  },
  ceres: () => {
    const n = makeNoise(17);
    const { canvas, g } = paint(W, H, (u, v) => {
      const e = n(u, v, 4, 6);
      const b = 70 + e * 90;
      return [b * 1.02, b * 0.97, b * 0.9];
    });
    craters(g, W, H, 480, 77, 0.45);
    return canvas;
  },
  mars: () => {
    const n = makeNoise(3);
    const dark = hex('#5a2012');
    const rust = hex('#b5482a');
    const dust = hex('#e0875a');
    const ice = hex('#fff4ec');
    const { canvas, g } = paint(W, H, (u, v) => {
      const e = n(u, v, 4, 6);
      const lat = Math.abs(v - 0.5) * 2;
      let c = mix(dark, rust, sstep(0.3, 0.55, e));
      c = mix(c, dust, sstep(0.55, 0.75, e));
      return mix(c, ice, sstep(0.88, 0.93, lat + (e - 0.5) * 0.1));
    });
    craters(g, W, H, 120, 99, 0.25);
    return canvas;
  },
  gas: () => {
    const n = makeNoise(41);
    const bands = [hex('#e8d2b0'), hex('#c98b58'), hex('#f3e6cf'), hex('#a3643a'), hex('#e0b98a')];
    return paint(W, H, (u, v) => {
      const warp = (n(u, v, 6, 4) - 0.5) * 0.08;
      const t = (v + warp) * 14;
      const i = Math.floor(t);
      const c = mix(bands[((i % 5) + 5) % 5], bands[(((i + 1) % 5) + 5) % 5], sstep(0.3, 0.7, t - i));
      const storm = sstep(0.035, 0.0, Math.hypot((u - 0.3) * 2, (v - 0.62) * 3)) * 0.6;
      return mix(c, hex('#b8472c'), storm);
    }).canvas;
  },
  rock: () => {
    const n = makeNoise(61);
    const { canvas, g } = paint(256, 128, (u, v) => {
      const e = n(u, v, 6, 5);
      const b = 55 + e * 100;
      return [b, b * 0.93, b * 0.85];
    });
    craters(g, 256, 128, 50, 13, 0.4);
    return canvas;
  },
};

const cache = new Map<string, THREE.CanvasTexture>();

export function getTexture(kind: keyof typeof painters): THREE.CanvasTexture {
  let tex = cache.get(kind);
  if (!tex) {
    tex = new THREE.CanvasTexture(painters[kind]());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    cache.set(kind, tex);
  }
  return tex;
}

function canvasTexture(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  let tex = cache.get(key);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    cache.set(key, tex);
  }
  return tex;
}

/** Adesivo de foguete vermelho do casco. */
export function getRocketDecalTexture(): THREE.CanvasTexture {
  return canvasTexture('decal', 256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#e0312b';
    g.beginPath();
    g.ellipse(0, -s * 0.05, s * 0.12, s * 0.3, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.12, s * 0.1);
    g.lineTo(-s * 0.24, s * 0.3);
    g.lineTo(-s * 0.08, s * 0.22);
    g.moveTo(s * 0.12, s * 0.1);
    g.lineTo(s * 0.24, s * 0.3);
    g.lineTo(s * 0.08, s * 0.22);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.06, s * 0.26);
    g.lineTo(0, s * 0.44);
    g.lineTo(s * 0.06, s * 0.26);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(0, -s * 0.08, s * 0.05, 0, Math.PI * 2);
    g.fill();
  });
}

/**
 * Solo rochoso da base de lançamento, repetível nos dois eixos
 * (ruído de senos com fases aleatórias + crateras com costura).
 */
export function getRegolithTexture(): THREE.CanvasTexture {
  let tex = cache.get('regolith');
  if (!tex) {
    const S = 1024;
    const rand = mulberry32(808);
    const waves = Array.from({ length: 18 }, (_, i) => ({
      fx: 1 + Math.floor(rand() * (2 + i)),
      fy: 1 + Math.floor(rand() * (2 + i)),
      ph: rand() * Math.PI * 2,
      amp: 1 / (1 + i * 0.6),
    }));
    const norm = waves.reduce((a, w) => a + w.amp, 0);
    const { canvas, g } = paint(S, S, (u, v) => {
      let n = 0;
      for (const w of waves) n += Math.sin((u * w.fx + v * w.fy) * Math.PI * 2 + w.ph) * w.amp;
      n = n / norm; // -1..1
      const grain = (rand() - 0.5) * 18;
      const b = 92 + n * 34 + grain;
      return [b * 1.04, b * 0.96, b * 0.9];
    });
    // Crateras (desenhadas também do outro lado da borda para repetir sem emenda)
    for (let i = 0; i < 90; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = Math.pow(rand(), 2.5) * S * 0.08 + 6;
      for (const dx of [-S, 0, S])
        for (const dy of [-S, 0, S]) {
          const gr = g.createRadialGradient(x + dx - r * 0.2, y + dy - r * 0.2, r * 0.1, x + dx, y + dy, r);
          gr.addColorStop(0, 'rgba(0,0,0,0.32)');
          gr.addColorStop(0.7, 'rgba(0,0,0,0.18)');
          gr.addColorStop(0.88, 'rgba(255,240,225,0.22)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          g.fill();
        }
    }
    // Pedrinhas
    for (let i = 0; i < 900; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = rand() * 3 + 0.8;
      g.fillStyle = `rgba(${40 + rand() * 40},${36 + rand() * 30},${34 + rand() * 30},0.7)`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,245,230,0.25)';
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    cache.set('regolith', tex);
  }
  return tex;
}
