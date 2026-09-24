import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetKind } from '../types';
import Planet from '../three/Planet';
import { getRegolithTexture } from '../three/textures';
import { makeRockGeometry } from '../three/rocks';

/**
 * Base de lançamento no solo: terreno rochoso com relevo, colinas no horizonte
 * e construções no estilo das artes (branco, laranja e ciano).
 */

const WHITE = '#ebe8e3';
const ORANGE = '#ef7b22';
const STEEL = '#8e96a3';
const CYAN = '#38d8ff';

const Glow = ({ color = CYAN, intensity = 2.5 }: { color?: string; intensity?: number }) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
);

/** Crateras do solo (coordenadas do mundo): tigela rebaixada com borda elevada. */
const CRATERS: { x: number; z: number; r: number; d: number }[] = [
  { x: -20, z: -3, r: 5.5, d: 1.3 },
  { x: 19, z: 2, r: 4, d: 1 },
  { x: -4, z: -30, r: 7, d: 1.6 },
  { x: 24, z: -30, r: 9, d: 2 },
  { x: -30, z: -40, r: 8, d: 1.8 },
  { x: 7, z: -52, r: 11, d: 2.4 },
  { x: -48, z: -12, r: 10, d: 2.2 },
  { x: 44, z: -14, r: 7, d: 1.6 },
  { x: -14, z: -62, r: 6, d: 1.3 },
  { x: 36, z: -60, r: 13, d: 2.8 },
  { x: -60, z: -70, r: 14, d: 3 },
  { x: 12, z: 16, r: 3.5, d: 0.8 },
];

/** Construções e áreas que não podem receber pedras. */
const CLEAR: { x: number; z: number; r: number }[] = [
  { x: 0, z: 0, r: 7 },
  { x: -9.5, z: -12, r: 4.2 },
  { x: -15, z: -20, r: 3.2 },
  { x: -12.2, z: -16, r: 2.5 },
  { x: 13, z: -22, r: 2.2 },
  { x: -13, z: -9, r: 2.2 },
  { x: 7.5, z: -8, r: 3 },
  { x: 17, z: -13, r: 6.5 },
  { x: 4, z: -5.5, r: 2.4 },
  { x: 10.5, z: -3.5, r: 2 },
  { x: -3.4, z: -1.2, r: 2 },
  { x: -6.3, z: -6.5, r: 1.2 },
];

function craterDepth(x: number, z: number) {
  let h = 0;
  for (const c of CRATERS) {
    const k = Math.hypot(x - c.x, z - c.z) / c.r;
    if (k > 1.6) continue;
    // Tigela (k < 1) e borda que se ergue e some até k = 1.6.
    h += k < 1 ? -c.d * (1 - k * k) + c.d * 0.35 * k ** 6 : c.d * 0.35 * Math.max(0, 1 - (k - 1) / 0.6) ** 2;
  }
  return h;
}

/** Altura do terreno em coordenadas do mundo: plano na plataforma, dunas, crateras e colinas ao fundo. */
export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const flat = THREE.MathUtils.smoothstep(r, 6, 15);
  const dunes = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.6 + Math.sin(x * 0.07 + z * 0.11) * 1.1;
  const hills = THREE.MathUtils.smoothstep(-z, 90, 165) * (7 + Math.sin(x * 0.045) * 5 + Math.sin(x * 0.13 + 1.3) * 2.5);
  return flat * (dunes + craterDepth(x, z)) + hills;
}

const TERRAIN_Z = -60;

function Terrain({ groundY }: { groundY: number }) {
  const map = useMemo(() => {
    const t = getRegolithTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(26, 26);
    return t;
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(420, 420, 240, 240);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + TERRAIN_Z;
      pos.setY(i, terrainHeight(x, z));
      // Manchas grandes (planícies escuras x terras altas claras) quebram a repetição da textura;
      // o fundo das crateras escurece e a borda clareia.
      const macro = Math.sin(x * 0.031 + 1.7) * Math.cos(z * 0.027) * 0.5 + Math.sin(x * 0.011 - z * 0.017) * 0.5;
      const b = THREE.MathUtils.clamp(1 + macro * 0.16 + craterDepth(x, z) * 0.12, 0.62, 1.25);
      col.set([b, b * 0.985, b * 0.97], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, groundY, TERRAIN_Z]}>
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.35} roughness={0.95} metalness={0.05} color="#b9aea4" vertexColors />
    </mesh>
  );
}

/** Pedras espalhadas pelo solo (três formatos, instanciadas). */
function Boulders({ groundY }: { groundY: number }) {
  const shapes = useMemo(
    () => [
      makeRockGeometry({ seed: 3, detail: 3, rough: 0.7, squash: 0.6 }),
      makeRockGeometry({ seed: 8, detail: 3, rough: 0.8, squash: 0.75 }),
      makeRockGeometry({ seed: 21, detail: 3, rough: 0.65, squash: 0.5 }),
    ],
    []
  );
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lists = useMemo(() => {
    let a = 1234;
    const rand = () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
    const out: THREE.Matrix4[][] = [[], [], []];
    const o = new THREE.Object3D();
    let tries = 0;
    while (out[0].length + out[1].length + out[2].length < 210 && tries++ < 4000) {
      // Mais pedras perto da base, rareando com a distância.
      const r = 9 + Math.pow(rand(), 1.6) * 85;
      const ang = Math.PI * (0.15 + rand() * 1.7);
      const x = Math.cos(ang) * r * 1.3;
      const z = -Math.sin(ang) * r + 8;
      if (z > 6 || CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
      // Pedras grandes só ao longe, para não taparem a base.
      const big = r > 28 && Math.abs(x) > 14 && rand() < 0.14;
      const sc = big ? 1.4 + rand() * 2 : 0.12 + Math.pow(rand(), 2.4) * (z > -4 ? 0.35 : 0.7);
      o.position.set(x, groundY + terrainHeight(x, z) + sc * 0.15, z);
      o.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5);
      o.scale.set(sc * (0.8 + rand() * 0.5), sc, sc * (0.8 + rand() * 0.5));
      o.updateMatrix();
      out[Math.floor(rand() * 3)].push(o.matrix.clone());
    }
    return out;
  }, [groundY]);
  useEffect(() => {
    lists.forEach((l, i) => {
      const m = refs.current[i];
      if (!m) return;
      l.forEach((mat, j) => m.setMatrixAt(j, mat));
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    });
  }, [lists]);
  return (
    <>
      {shapes.map((g, i) => (
        <instancedMesh key={i} ref={el => (refs.current[i] = el)} args={[g, undefined, lists[i].length]}>
          <meshStandardMaterial color="#8a8078" roughness={0.95} metalness={0.02} vertexColors flatShading />
        </instancedMesh>
      ))}
    </>
  );
}

/** Cordilheiras recortadas no horizonte, em camadas (a mais distante mais clara e azulada). */
function Ridges() {
  const layers = useMemo(() => {
    const make = (z: number, height: number, seed: number, base: string, body: string, top: string) => {
      const N = 180;
      const W = 900;
      const verts: number[] = [];
      const cols: number[] = [];
      const cB = new THREE.Color(base);
      const cN = new THREE.Color(body);
      const cT = new THREE.Color(top);
      const peak = (x: number) =>
        height *
        (0.55 +
          0.3 * Math.sin(x * 0.011 + seed) +
          0.2 * Math.sin(x * 0.037 + seed * 2.1) +
          0.12 * Math.abs(Math.sin(x * 0.09 + seed * 3.3)) +
          0.05 * Math.sin(x * 0.31 + seed));
      for (let i = 0; i <= N; i++) {
        const x = -W / 2 + (i / N) * W;
        const h = peak(x);
        verts.push(x, -20, z, x, h, z);
        // Cristas altas pegam a luz do sol.
        const c2 = cN.clone().lerp(cT, THREE.MathUtils.smoothstep(h / height, 0.7, 1.1));
        cols.push(cB.r, cB.g, cB.b, c2.r, c2.g, c2.b);
      }
      const idx: number[] = [];
      for (let i = 0; i < N; i++) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      g.setIndex(idx);
      return g;
    };
    return [
      make(-330, 34, 1.3, '#120e2c', '#262746', '#5f6590'),
      make(-250, 20, 4.1, '#0e0a24', '#1b1a33', '#44476b'),
    ];
  }, []);
  return (
    <group>
      {layers.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Dome({ position, radius = 2.4 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={WHITE} metalness={0.2} roughness={0.35} clearcoat={0.7} />
      </mesh>
      {/* Faixa de janelas iluminadas */}
      <mesh position={[0, radius * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.92, 0.09, 8, 64]} />
        <Glow intensity={1.8} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[radius + 0.08, radius + 0.15, 0.25, 48]} />
        <meshStandardMaterial color={ORANGE} roughness={0.45} />
      </mesh>
      {/* Porta */}
      <RoundedBox args={[0.9, 1.1, 0.6]} radius={0.12} position={[0, 0.55, radius - 0.1]}>
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.6, radius + 0.21]}>
        <planeGeometry args={[0.55, 0.75]} />
        <Glow color="#ffb23a" intensity={1.6} />
      </mesh>
    </group>
  );
}

function CommTower({ position }: { position: [number, number, number] }) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(clock.elapsedTime * 4) > 0 ? 4 : 0.2;
  });
  return (
    <group position={position}>
      <RoundedBox args={[1.1, 7, 1.1]} radius={0.12} position={[0, 3.5, 0]}>
        <meshStandardMaterial color={WHITE} metalness={0.25} roughness={0.45} />
      </RoundedBox>
      {[1.5, 3.2, 4.9, 6.6].map(y => (
        <group key={y}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.15, 0.18, 1.15]} />
            <meshStandardMaterial color={ORANGE} roughness={0.45} />
          </mesh>
          <mesh position={[0, y + 0.55, 0.56]}>
            <planeGeometry args={[0.6, 0.4]} />
            <Glow intensity={1.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 7.8, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 8.65, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial ref={beacon} color="#ff3d5a" emissive="#ff3d5a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RadarDish({ position }: { position: [number, number, number] }) {
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.9;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.18, 0.35, 1.8, 16]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
      </mesh>
      <group ref={head} position={[0, 1.9, 0]}>
        {/* Prato côncavo apontado para o céu, inclinado para a câmera */}
        <group rotation={[0.55, 0, 0]}>
          <mesh position={[0, 1.3, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[1.3, 40, 16, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
            <meshStandardMaterial color={WHITE} metalness={0.3} roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
            <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.37, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <Glow />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function FuelTanks({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-0.95, 0.95].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.6, 0]}>
            <capsuleGeometry args={[0.8, 1.6, 8, 32]} />
            <meshStandardMaterial color="#d9d6d0" metalness={0.2} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.82, 0.82, 0.3, 32, 1, true]} />
            <meshStandardMaterial color={ORANGE} roughness={0.45} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[3.6, 0.24, 1.8]} />
        <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Túnel pressurizado ligando duas cúpulas, com anéis de reforço. */
function Tunnel({ from, to, y = 0.75 }: { from: [number, number]; to: [number, number]; y?: number }) {
  const [x0, z0] = from;
  const [x1, z1] = to;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(x1 - x0, z1 - z0);
  const ribs = Math.max(2, Math.floor(len / 1.2));
  return (
    <group position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[0, ang, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, len, 24]} />
        <meshStandardMaterial color={WHITE} metalness={0.2} roughness={0.45} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} position={[0, 0, -len / 2 + ((i + 0.5) / ribs) * len]}>
          <torusGeometry args={[0.62, 0.06, 8, 24]} />
          <meshStandardMaterial color={i % 2 ? STEEL : ORANGE} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, len * 0.8, 6]} />
        <Glow intensity={1.4} />
      </mesh>
    </group>
  );
}

function useSolarTexture() {
  return useMemo(() => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#1b3a8a');
    grad.addColorStop(1, '#0c1c4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(160,200,255,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      const p = (i / 8) * S;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, S);
      g.moveTo(0, p);
      g.lineTo(S, p);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

/** Campo de painéis solares inclinados para o sol. */
function SolarArray({ position }: { position: [number, number, number] }) {
  const tex = useSolarTexture();
  const rows = [-2.4, 0, 2.4];
  const cols = [-3.3, -1.1, 1.1, 3.3];
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      {rows.map(z =>
        cols.map(x => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.05, 0.07, 1, 8]} />
              <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
            </mesh>
            <group position={[0, 1.05, 0]} rotation={[-0.55, 0, 0]}>
              <mesh>
                <boxGeometry args={[2, 0.05, 1.5]} />
                <meshStandardMaterial color={WHITE} metalness={0.4} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.9, 1.4]} />
                <meshPhysicalMaterial map={tex} metalness={0.6} roughness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
              </mesh>
            </group>
          </group>
        ))
      )}
    </group>
  );
}

/** Torre de serviço treliçada ao lado da plataforma, com braço até o foguete. */
function Gantry({ position }: { position: [number, number, number] }) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(clock.elapsedTime * 3 + 1) > 0.2 ? 4 : 0.2;
  });
  const H = 7.2;
  const w = 0.55;
  const levels = [0.8, 2, 3.2, 4.4, 5.6, 6.8];
  return (
    <group position={position}>
      {/* Pilares */}
      {[
        [-w, -w],
        [w, -w],
        [-w, w],
        [w, w],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, H / 2, z]}>
          <boxGeometry args={[0.12, H, 0.12]} />
          <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.45} />
        </mesh>
      ))}
      {/* Travessas em X nas quatro faces */}
      {levels.slice(0, -1).map((y, i) =>
        [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(r => (
          <group key={`${i}${r}`} rotation={[0, r, 0]}>
            <mesh position={[0, y + 0.6, w]} rotation={[0, 0, Math.atan2(1.2, 2 * w)]}>
              <boxGeometry args={[Math.hypot(1.2, 2 * w), 0.05, 0.05]} />
              <meshStandardMaterial color={WHITE} metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, y + 0.6, w]} rotation={[0, 0, -Math.atan2(1.2, 2 * w)]}>
              <boxGeometry args={[Math.hypot(1.2, 2 * w), 0.05, 0.05]} />
              <meshStandardMaterial color={WHITE} metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        ))
      )}
      {levels.map(y => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2 * w + 0.15, 0.08, 2 * w + 0.15]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Braço de acesso com luz ciano na ponta */}
      <group position={[0, 4.4, 0]}>
        <mesh position={[1.25, 0, 0.3]}>
          <boxGeometry args={[1.9, 0.22, 0.5]} />
          <meshStandardMaterial color={WHITE} metalness={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[1.25, 0.14, 0.3]}>
          <boxGeometry args={[1.9, 0.04, 0.52]} />
          <meshStandardMaterial color={ORANGE} roughness={0.45} />
        </mesh>
        <mesh position={[2.22, 0, 0.3]}>
          <boxGeometry args={[0.06, 0.26, 0.4]} />
          <Glow intensity={2} />
        </mesh>
      </group>
      <mesh position={[0, H + 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 1.05, 0]}>
        <sphereGeometry args={[0.11, 14, 14]} />
        <meshStandardMaterial ref={beacon} color="#ff3d5a" emissive="#ff3d5a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Jipe lunar estacionado. */
function Rover({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const dish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (dish.current) dish.current.rotation.y = clock.elapsedTime * 0.6;
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[2.2, 0.45, 1.2]} radius={0.12} position={[0, 0.62, 0]}>
        <meshStandardMaterial color={WHITE} metalness={0.25} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.5, 1]} radius={0.15} position={[0.45, 1.05, 0]}>
        <meshPhysicalMaterial color="#1c3d7a" metalness={0.5} roughness={0.1} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0.61]}>
        <boxGeometry args={[2.1, 0.1, 0.02]} />
        <meshStandardMaterial color={ORANGE} roughness={0.45} />
      </mesh>
      {[-0.75, 0.75].map(x =>
        [-0.7, 0.7].map(z => (
          <mesh key={`${x}${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.28, 18]} />
            <meshStandardMaterial color="#2a2f38" roughness={0.8} />
          </mesh>
        ))
      )}
      {/* Faróis */}
      {[-0.35, 0.35].map(z => (
        <mesh key={z} position={[1.12, 0.66, z]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.09, 14]} />
          <Glow color="#fff1c2" intensity={2.5} />
        </mesh>
      ))}
      <group ref={dish} position={[-0.6, 0.9, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
          <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.65, 0]} rotation={[0.9, 0, 0]}>
          <sphereGeometry args={[0.3, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
          <meshStandardMaterial color={WHITE} metalness={0.3} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** Pilha de caixas de carga. */
function Crates({ position }: { position: [number, number, number] }) {
  const boxes: [number, number, number, number, string][] = [
    [0, 0.4, 0, 0.8, WHITE],
    [0.9, 0.35, 0.15, 0.7, ORANGE],
    [0.4, 1.12, 0.05, 0.64, WHITE],
    [-0.75, 0.3, 0.45, 0.6, STEEL],
  ];
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      {boxes.map(([x, y, z, s, c], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, i * 0.35, 0]}>
          <RoundedBox args={[s, s, s]} radius={0.06}>
            <meshStandardMaterial color={c} metalness={0.3} roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0, s / 2 + 0.005]}>
            <planeGeometry args={[s * 0.8, s * 0.14]} />
            <meshStandardMaterial color={c === ORANGE ? '#1f2329' : ORANGE} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Mastro de holofotes com cone de luz apontado para a plataforma. */
function useBeamFade() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const g = c.getContext('2d')!;
    // Topo da textura = ponta do cone (lâmpada): forte perto dela, some no chão.
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#555555');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

function Floodlight({ position }: { position: [number, number, number] }) {
  const beamFade = useBeamFade();
  const [x, , z] = position;
  const H = 5;
  // Direção até o topo da plataforma (origem do mundo).
  const aimY = Math.atan2(x, z);
  const dist = Math.hypot(x, z);
  const tilt = Math.atan2(dist, H - 0.8);
  const len = Math.hypot(dist, H);
  return (
    <group position={position}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.12, H, 10]} />
        <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
      </mesh>
      <group position={[0, H, 0]} rotation={[0, aimY, 0]}>
        <group rotation={[tilt, 0, 0]}>
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[0.9, 0.35, 0.3]} />
            <meshStandardMaterial color={WHITE} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.25]} />
            <Glow color="#fff4d6" intensity={3} />
          </mesh>
          {/* Feixe volumétrico falso */}
          <mesh position={[0, -len / 2, 0]}>
            <coneGeometry args={[1.8, len, 24, 1, true]} />
            <meshBasicMaterial color="#ffe9b8" alphaMap={beamFade} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function usePawFlagTexture() {
  return useMemo(() => {
    const W = 256;
    const H = 160;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0d1b44';
    g.fillRect(0, 0, W, H);
    g.fillStyle = ORANGE;
    g.fillRect(0, H - 18, W, 18);
    g.fillStyle = '#38d8ff';
    g.fillRect(0, 0, W, 8);
    // Pata
    g.fillStyle = ORANGE;
    g.beginPath();
    g.ellipse(W / 2, 88, 30, 25, 0, 0, Math.PI * 2);
    g.fill();
    for (const [dx, dy, r] of [
      [-38, 48, 12],
      [-14, 32, 13],
      [14, 32, 13],
      [38, 48, 12],
    ]) {
      g.beginPath();
      g.ellipse(W / 2 + dx, dy, r * 0.85, r, 0, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

/** Bandeira da DogCity com a pata, balançando devagar. */
function Flag({ position }: { position: [number, number, number] }) {
  const tex = usePawFlagTexture();
  const cloth = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(1.6, 1, 16, 4), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useFrame(({ clock }) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + 0.8;
      pos.setZ(i, Math.sin(x * 3 - clock.elapsedTime * 1.6) * 0.06 * x);
    }
    pos.needsUpdate = true;
  });
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.8, 8]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={cloth} geometry={geo} position={[0.82, 2.25, 0]}>
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Postes de luz ciano marcando o caminho até a plataforma. */
function PathLights({ groundY }: { groundY: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      const m = (c.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.8 + 2.4 * Math.max(0, Math.sin(clock.elapsedTime * 3 - i * 0.7));
    });
  });
  const posts: [number, number][] = [
    [-3.6, 2.4], [-5.2, 3.6], [-6.8, 4.8], [3.6, 2.4], [5.2, 3.6], [6.8, 4.8],
  ];
  return (
    <group ref={group}>
      {posts.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, groundY, z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.6, 12]} />
            <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <Glow />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function LaunchSite({ groundY }: { groundY: number }) {
  // Apoia cada construção na altura do terreno naquele ponto (levemente enterrada).
  const at = (x: number, z: number, sink = 0.1): [number, number, number] => [x, groundY + terrainHeight(x, z) - sink, z];
  return (
    <group>
      <Terrain groundY={groundY} />
      <Ridges />
      {/* A Terra nascendo atrás das montanhas */}
      <Planet kind="earth" radius={24} position={[-245, groundY + 36, -340]} spin={0.01} tilt={0.35} fog={false} />
      <Boulders groundY={groundY} />

      <Dome position={at(-9.5, -12, 0.3)} radius={2.8} />
      <Dome position={at(-15, -20, 0.3)} radius={1.8} />
      <group position={[0, groundY + terrainHeight(-12.2, -16) - 0.3, 0]}>
        <Tunnel from={[-10.8, -14.1]} to={[-13.9, -18.6]} y={0.7} />
      </group>
      <CommTower position={at(13, -22)} />
      <RadarDish position={at(-13, -9)} />
      <FuelTanks position={at(7.5, -8)} />
      <SolarArray position={at(17.5, -13, 0.2)} />
      <Gantry position={at(-3.4, -1.2, 0)} />
      <Rover position={at(4, -5.5, 0.05)} rotation={0.6} />
      <Crates position={at(10.5, -3.5, 0.05)} />
      <Floodlight position={at(-6.5, -4.5, 0)} />
      <Floodlight position={at(6.2, -2.2, 0)} />
      <Flag position={at(-6.3, -6.5, 0)} />
      <PathLights groundY={groundY} />
    </group>
  );
}

/** Alvo holográfico no fim da linha de mira: planeta de destino com anéis giratórios. */
export function HoloTarget({ kind, color }: { kind: PlanetKind; color: string }) {
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (!rings.current) return;
    rings.current.children[0].rotation.z += dt * 0.8;
    rings.current.children[1].rotation.z -= dt * 1.3;
    rings.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04);
  });
  return (
    <group>
      <Planet kind={kind} radius={0.85} spin={0.25} rings={kind === 'gas'} />
      <group ref={rings}>
        <mesh>
          <torusGeometry args={[1.35, 0.03, 8, 96, Math.PI * 1.6]} />
          <Glow color={CYAN} intensity={2.4} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.6, 0.025, 8, 96, Math.PI * 0.9]} />
          <Glow color={ORANGE} intensity={2.2} />
        </mesh>
      </group>
      <pointLight color={color} intensity={6} distance={6} />
    </group>
  );
}
