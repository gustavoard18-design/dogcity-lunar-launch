import { Suspense, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing';
import Rocket from '../../src/three/Rocket';
import { StudioEnvironment } from '../../src/three/SpaceBits';
import type { DogStats } from '../../src/lib/stats';

/**
 * Artes 2D do foguete a partir do foguete 3D do jogo (ver rocket-art.mjs).
 * ?mode=tier&tier=1..5  retrato da fase da Oficina (vitrine), com cenário
 * ?mode=cutout          foguete sem chama, fundo transparente
 * ?mode=icon            idem, enquadrado como ícone
 */

interface TierLook {
  upgrades: DogStats;
  flame: string;
  thrust: number;
  /** Cores do cenário: céu (topo, base) e brilho atrás do foguete. */
  sky: [string, string];
  glow: string;
  rings?: string;
}

// Níveis da Oficina representativos de cada fase (soma = mínimo da fase).
const TIERS: Record<number, TierLook> = {
  1: { upgrades: { power: 1, accuracy: 1, luck: 1, speed: 1 }, flame: '#ff7a1a', thrust: 0.45, sky: ['#040716', '#0b1636'], glow: 'rgba(90,140,255,0.28)' },
  2: { upgrades: { power: 3, accuracy: 3, luck: 1, speed: 3 }, flame: '#3cb8ff', thrust: 0.6, sky: ['#040818', '#0b1c46'], glow: 'rgba(60,184,255,0.4)' },
  3: { upgrades: { power: 5, accuracy: 4, luck: 3, speed: 5 }, flame: '#3cb8ff', thrust: 0.7, sky: ['#050718', '#161a4a'], glow: 'rgba(140,120,255,0.42)' },
  4: { upgrades: { power: 7, accuracy: 6, luck: 6, speed: 6 }, flame: '#3cb8ff', thrust: 0.8, sky: ['#070714', '#2a1a2e'], glow: 'rgba(255,184,60,0.45)' },
  5: { upgrades: { power: 9, accuracy: 8, luck: 8, speed: 8 }, flame: '#b46bff', thrust: 0.9, sky: ['#0a0520', '#2c0f55'], glow: 'rgba(190,110,255,0.6)', rings: 'rgba(180,120,255,0.55)' },
};

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'tier';
const tier = TIERS[Number(params.get('tier') ?? 1)] ?? TIERS[1];
// A chama é aditiva e fica turva sobre fundo transparente: os recortes saem sem ela.
const look: TierLook = mode === 'tier' ? tier : { ...TIERS[1], thrust: 0 };

/** Números pseudoaleatórios fixos: a mesma arte a cada render. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** Céu, estrelas, brilho e solo lunar desenhados em 2D e usados como fundo da cena. */
function backdrop(w: number, h: number, t: TierLook): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, t.sky[0]);
  sky.addColorStop(1, t.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const rnd = seeded(7);
  for (let i = 0; i < 140; i++) {
    const r = rnd() < 0.9 ? 0.6 + rnd() * 0.8 : 1.6 + rnd();
    g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(rnd() * w, rnd() * h * 0.8, r * (w / 440), 0, Math.PI * 2);
    g.fill();
  }

  const glow = g.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, w * 0.62);
  glow.addColorStop(0, t.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  if (t.rings) {
    g.save();
    g.translate(w / 2, h * 0.48);
    g.strokeStyle = t.rings;
    g.shadowColor = t.rings;
    g.shadowBlur = 14;
    for (const [rx, ry, rot, lw] of [[0.46, 0.13, -0.35, 3], [0.4, 0.1, 0.3, 2]]) {
      g.save();
      g.rotate(rot);
      g.lineWidth = lw * (w / 440);
      g.beginPath();
      g.ellipse(0, 0, w * rx, w * ry, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
    g.restore();
  }

  // Solo lunar com a borda iluminada pela cor da fase
  const groundY = h * 0.86;
  g.fillStyle = '#07081a';
  g.beginPath();
  g.moveTo(0, groundY + h * 0.02);
  g.quadraticCurveTo(w / 2, groundY - h * 0.025, w, groundY + h * 0.02);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  const rim = g.createRadialGradient(w / 2, groundY, 0, w / 2, groundY, w * 0.5);
  rim.addColorStop(0, t.glow.replace(/[\d.]+\)$/, '0.55)'));
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rim;
  g.fillRect(0, groundY - h * 0.06, w, h * 0.2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Backdrop() {
  const { scene, size, gl } = useThree();
  const tex = useMemo(() => backdrop(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio(), tier), [size, gl]);
  useEffect(() => {
    scene.background = tex;
    return () => {
      scene.background = null;
    };
  }, [scene, tex]);
  return null;
}

/** Avisa o script de captura depois que o modelo carregou e a cena assentou. */
function Ready() {
  useGLTF(`${import.meta.env.BASE_URL}models/rocket.glb`);
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 45) window.setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 800);
  });
  return null;
}

function Scene() {
  const withScenery = mode === 'tier';
  return (
    <>
      {withScenery && <Backdrop />}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#b9ccff', '#2a1a3a', 0.6]} />
      <directionalLight position={[-6, 6, 10]} intensity={2.4} color="#ffe6c8" />
      <directionalLight position={[8, 3, -4]} intensity={1.4} color="#7aa2ff" />
      <StudioEnvironment />
      <Suspense fallback={null}>
        <group position={[0, mode === 'icon' ? -0.18 : 0.25, 0]} rotation={[0, -0.12, 0]}>
          <Rocket skinColor="#d9924f" helmet="default" trailColor={look.flame} thrust={look.thrust} upgrades={look.upgrades} />
        </group>
        <Ready />
      </Suspense>
      {withScenery && (
        <EffectComposer multisampling={0}>
          <SMAA />
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.7} luminanceSmoothing={0.2} radius={0.6} />
        </EffectComposer>
      )}
    </>
  );
}

// Retrato: câmera de frente, um pouco abaixo do nariz. Recortes: enquadramento justo.
const camera = mode === 'tier' ? { fov: 34, position: [0, 0.35, 9.2] as const } : { fov: 30, position: [0, 0.1, 9.4] as const };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Canvas
    dpr={1}
    gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
    camera={{ fov: camera.fov, position: [...camera.position] }}
    onCreated={({ gl, camera: cam }) => {
      cam.lookAt(0, mode === 'tier' ? -0.1 : 0, 0);
      (window as unknown as { __gl: THREE.WebGLRenderer }).__gl = gl;
    }}
  >
    <Scene />
  </Canvas>
);
