import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Rochas procedurais: esfera subdividida deformada por ruído 3D em camadas,
 * com crateras rasas e achatamento. Cada semente gera um formato diferente.
 */

function hash3(x: number, y: number, z: number, seed: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return h - Math.floor(h);
}

function noise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const xf = s(x - xi);
  const yf = s(y - yi);
  const zf = s(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf
  );
}

function fbm(v: THREE.Vector3, seed: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1.6;
  for (let o = 0; o < octaves; o++) {
    sum += (noise3(v.x * f, v.y * f, v.z * f, seed + o) - 0.5) * amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum;
}

export interface RockOptions {
  seed: number;
  /** Subdivisões do icosaedro (2 = leve, 4 = detalhado). */
  detail?: number;
  /** Intensidade das saliências. */
  rough?: number;
  /** Achatamento vertical (1 = redonda). */
  squash?: number;
  craters?: number;
}

export function makeRockGeometry({ seed, detail = 3, rough = 0.55, squash = 0.8, craters = 5 }: RockOptions) {
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  // Vértices compartilhados: normais suaves e sem rachaduras entre faces.
  const g = mergeVertices(ico);
  ico.dispose();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const rnd = (i: number) => hash3(i, seed, 7, seed);
  const pits = Array.from({ length: craters }, (_, i) => ({
    dir: new THREE.Vector3(rnd(i) - 0.5, rnd(i + 50) - 0.5, rnd(i + 99) - 0.5).normalize(),
    size: 0.25 + rnd(i + 150) * 0.35,
    depth: 0.06 + rnd(i + 200) * 0.1,
  }));
  const stretch = new THREE.Vector3(1 + (rnd(300) - 0.5) * 0.5, squash, 1 + (rnd(301) - 0.5) * 0.4);
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    // Tom da pedra: manchas claras/escuras e fundo das crateras mais escuro.
    let shade = 0.78 + fbm(v.clone().multiplyScalar(2.3), seed + 23, 3) * 0.9;
    let r = 1 + fbm(v, seed) * rough * 2;
    // Facetas: ruído "dobrado" dá quinas de pedra lascada.
    r -= Math.abs(fbm(v.clone().multiplyScalar(1.7), seed + 11, 2)) * rough * 0.6;
    for (const p of pits) {
      const d = v.distanceTo(p.dir);
      if (d < p.size) {
        const k = d / p.size;
        shade -= 0.22 * (1 - k);
        r -= p.depth * (1 - k * k) - (k > 0.75 ? p.depth * 0.5 * Math.sin((k - 0.75) * 4 * Math.PI) : 0);
      }
    }
    shade = Math.max(0.35, Math.min(1.1, shade));
    col.set([shade, shade * 0.97, shade * 0.93], i * 3);
    v.multiplyScalar(r).multiply(stretch);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
