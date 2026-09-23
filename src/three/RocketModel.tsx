import { MutableRefObject, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Casco do foguete em 3D, gerado no 3D AI Studio (TRELLIS.2) a partir da
 * folha de referência do foguete Bitcoin (o disco de base que o gerador cria
 * foi removido do GLB). Encaixado nas medidas do foguete antigo: base em
 * y = -1.55, nariz em y = 1.9, escotilha virada para +Z.
 *
 * A escotilha e o ₿ são pintados na textura do casco; o rosto do DOG e o
 * símbolo são malhas que acompanham a curva do casco (projetadas por raio).
 */

const MODEL_URL = `${import.meta.env.BASE_URL || './'}models/rocket.glb`;
const FACE_URL = `${import.meta.env.BASE_URL || './'}dog-face.png`;
export const ROCKET_NOZZLE_Y = -1.55;
export const ROCKET_TOP_Y = 1.9;

/** Centro e raio da escotilha e do ₿ no espaço do foguete (medidos no modelo). */
const PORTHOLE = { x: 0, y: 0.67, r: 0.56 };
const BTC = { x: 0, y: -0.32, r: 0.29 };
const DEFAULT_FUR = '#d9924f';
const LEAN_FIX = 0.17;

/**
 * Malha em grade que cobre um círculo na frente do casco, com cada vértice
 * encostado na superfície (raio de +Z para -Z) e UV plano.
 */
function conformPatch(target: THREE.Object3D, cx: number, cy: number, r: number, lift = 0.012, n = 20) {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 0, -1);
  const pos: number[] = [];
  const uv: number[] = [];
  let fallback = 0;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const v = j / n;
      const x = cx + (u - 0.5) * 2 * r;
      const y = cy + (v - 0.5) * 2 * r;
      ray.set(new THREE.Vector3(x, y, 10), dir);
      const hit = ray.intersectObject(target, true)[0];
      const z = hit ? hit.point.z : fallback;
      if (hit) fallback = z;
      pos.push(x, y, z + lift);
      uv.push(u, v);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Rosto oficial recortado em círculo, com borda escura e reflexo de vidro. */
function useFaceTexture() {
  const img = useTexture(FACE_URL);
  return useMemo(() => {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#05070f';
    g.fillRect(0, 0, S, S);
    // Aproxima no rosto (a arte tem o capacete inteiro).
    const src = img.image as HTMLImageElement;
    const crop = src.width * 0.8;
    g.drawImage(src, src.width * 0.12, src.height * 0.08, crop, crop, 0, 0, S, S);
    // Borda do vidro escurecida
    const edge = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,6,20,0.85)');
    g.fillStyle = edge;
    g.fillRect(0, 0, S, S);
    // Reflexo
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.beginPath();
    g.ellipse(S * 0.32, S * 0.26, S * 0.16, S * 0.06, -0.6, 0, Math.PI * 2);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [img]);
}

/** Símbolo ₿ branco para o círculo laranja do casco. */
function useBtcTexture() {
  return useMemo(() => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f7931a';
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `bold ${S * 0.7}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(S / 2, S / 2 + S * 0.03);
    g.rotate(0.24);
    g.fillText('₿', 0, 0);
    g.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

export default function RocketModel({ skinColor, pilotRef }: { skinColor: string; pilotRef?: MutableRefObject<THREE.Group | null> }) {
  const { scene } = useGLTF(MODEL_URL);
  const face = useFaceTexture();
  const btc = useBtcTexture();

  const { model, window, badge } = useMemo(() => {
    const root = scene.clone(true);
    // Escotilha para +Z; o gerador deixou o nariz ~10° inclinado para trás (vista 3/4 de cima).
    root.rotation.set(LEAN_FIX, Math.PI, 0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const k = (ROCKET_TOP_Y - ROCKET_NOZZLE_Y) / (box.max.y - box.min.y);
    const c = box.getCenter(new THREE.Vector3());
    root.scale.setScalar(k);
    root.position.set(-c.x * k, ROCKET_NOZZLE_Y - box.min.y * k, -c.z * k);
    root.updateMatrixWorld(true);
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.envMapIntensity = 1.1;
      m.material = mat;
    });
    return {
      model: root,
      window: conformPatch(root, PORTHOLE.x, PORTHOLE.y, PORTHOLE.r),
      badge: conformPatch(root, BTC.x, BTC.y, BTC.r, 0.01, 12),
    };
  }, [scene]);

  const custom = skinColor.toLowerCase() !== DEFAULT_FUR;
  const tint = useMemo(() => new THREE.Color('#ffffff').lerp(new THREE.Color(skinColor), custom ? 0.45 : 0), [skinColor, custom]);
  const glow = skinColor.toLowerCase() === '#3ff0ff';

  return (
    <group>
      <primitive object={model} />
      {/* Vidro escuro da escotilha (sempre) e o DOG por trás dele (só depois do embarque) */}
      <group ref={pilotRef}>
        <mesh geometry={window} renderOrder={1}>
          <meshStandardMaterial
            map={face}
            color={tint}
            emissiveMap={face}
            emissive={glow ? '#3ff0ff' : '#ffffff'}
            emissiveIntensity={glow ? 0.7 : 0.35}
            roughness={0.25}
            metalness={0.1}
            alphaTest={0.5}
            transparent
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      </group>
      <mesh geometry={badge}>
        <meshStandardMaterial map={btc} roughness={0.4} alphaTest={0.5} transparent polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
