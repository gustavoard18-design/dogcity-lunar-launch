import { MutableRefObject, Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Route } from '../types';
import Rocket, { RocketLook, trailStartColor } from '../three/Rocket';
import LaunchSite, { HoloTarget } from './LaunchSite';
import Particles, { ParticleApi } from '../three/Particles';
import { SkyBackground, StudioEnvironment } from '../three/SpaceBits';
import DogModel from '../three/DogModel';

export type PadPhase = 'brief' | 'angle' | 'power' | 'countdown' | 'liftoff';

export interface AimState {
  angle: number;
  power: number;
  targetAngle: number;
  angleHalf: number;
}

interface PadSceneProps {
  route: Route;
  look: RocketLook;
  phaseRef: MutableRefObject<PadPhase>;
  aimRef: MutableRefObject<AimState>;
  onLiftoffDone(): void;
}

const DEG = Math.PI / 180;
const BASE_Y = -1.6;
/** Nível do solo (a base da plataforma encosta nele). */
const GROUND_Y = BASE_Y - 0.9;
const DOTS = 28;
/** Altura do nariz do foguete parado (origem da linha de mira). */
const NOSE_Y = BASE_Y + (1.55 + 1.9) * 1.05;
/** Distância do nariz ao planeta-alvo (a linha termina nele). */
const AIM_REACH = 5.6;

/** Tampo da plataforma: chapas metálicas, faixa de alerta e círculo de lançamento. */
function usePadTopTexture() {
  return useMemo(() => {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const m = S / 2;
    const base = g.createRadialGradient(m, m, S * 0.05, m, m, S * 0.5);
    base.addColorStop(0, '#d9dde3');
    base.addColorStop(1, '#9aa1ab');
    g.fillStyle = base;
    g.fillRect(0, 0, S, S);
    // Chapas em anéis com rebites
    g.strokeStyle = 'rgba(40,45,55,0.55)';
    g.lineWidth = 4;
    for (const r of [0.2, 0.3, 0.4]) {
      g.beginPath();
      g.arc(m, m, S * r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(m + Math.cos(a) * S * 0.2, m + Math.sin(a) * S * 0.2);
      g.lineTo(m + Math.cos(a) * S * 0.4, m + Math.sin(a) * S * 0.4);
      g.stroke();
      g.fillStyle = 'rgba(60,65,75,0.8)';
      for (const r of [0.24, 0.36]) {
        g.beginPath();
        g.arc(m + Math.cos(a + 0.1) * S * r, m + Math.sin(a + 0.1) * S * r, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Faixa de alerta amarela e preta na borda
    const r0 = S * 0.42;
    const r1 = S * 0.49;
    for (let i = 0; i < 64; i++) {
      const a0 = (i / 64) * Math.PI * 2;
      const a1 = ((i + 1) / 64) * Math.PI * 2;
      g.fillStyle = i % 2 ? '#1f2329' : '#f5b21b';
      g.beginPath();
      g.moveTo(m + Math.cos(a0) * r0, m + Math.sin(a0) * r0);
      g.lineTo(m + Math.cos(a0 + 0.06) * r1, m + Math.sin(a0 + 0.06) * r1);
      g.lineTo(m + Math.cos(a1 + 0.06) * r1, m + Math.sin(a1 + 0.06) * r1);
      g.lineTo(m + Math.cos(a1) * r0, m + Math.sin(a1) * r0);
      g.closePath();
      g.fill();
    }
    // Círculo de lançamento laranja
    g.fillStyle = '#3a3f48';
    g.beginPath();
    g.arc(m, m, S * 0.16, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ff8a1f';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(m, m, S * 0.15, 0, Math.PI * 2);
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

const ORANGE = '#ef7b22';
const CYAN = '#38d8ff';

const Glow = ({ color = CYAN, intensity = 2.5 }: { color?: string; intensity?: number }) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
);

const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 96);

function Platform() {
  const top = usePadTopTexture();
  const lights = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => ({
      // Corpo com bordas chanfradas (perfil girado), afinando para baixo.
      body: lathe([
        [0.0, -0.9],
        [1.9, -0.9],
        [2.35, -0.72],
        [2.55, -0.38],
        [2.62, -0.26],
        [2.62, -0.1],
        [2.56, -0.04],
        [0.0, -0.04],
      ]),
      band: lathe([
        [2.63, -0.3],
        [2.66, -0.26],
        [2.66, -0.12],
        [2.63, -0.08],
      ]),
    }),
    []
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.current?.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.8 + 2.2 * Math.max(0, Math.sin(t * 2.5 - i * 0.55));
    });
  });
  return (
    <group position={[0, BASE_Y, 0]}>
      <mesh geometry={geo.body}>
        <meshPhysicalMaterial color="#e9e7e3" metalness={0.35} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <mesh geometry={geo.band}>
        <meshPhysicalMaterial color={ORANGE} metalness={0.3} roughness={0.3} clearcoat={1} />
      </mesh>
      {/* Tampo com chapas, faixa de alerta e círculo de lançamento */}
      <mesh position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <circleGeometry args={[2.56, 96]} />
        <meshStandardMaterial map={top} metalness={0.45} roughness={0.4} />
      </mesh>
      {/* Anel luminoso do círculo de lançamento */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.8, 96]} />
        <meshStandardMaterial color="#ffb23a" emissive="#ff8a1f" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      {/* Luzes ciano ao redor da lateral */}
      <group ref={lights}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 2.45, -0.55, Math.sin(a) * 2.45]} rotation={[0, -a + Math.PI / 2, 0]}>
              <capsuleGeometry args={[0.035, 0.34, 6, 12]} />
              <Glow />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** Escala do foguete 3D na plataforma e altura do bocal em relação à origem do modelo. */
const ROCKET_SCALE = 1.05;
const ROCKET_BASE = 1.55;

/** O mesmo foguete 3D do voo, com cosméticos e peças da Oficina; a origem do grupo é a base. */
function PadRocket({
  look,
  thrustRef,
  nozzleRef,
  trailColorRef,
  pilotRef,
}: {
  look: RocketLook;
  pilotRef: MutableRefObject<THREE.Group | null>;
  thrustRef: MutableRefObject<number>;
  nozzleRef: MutableRefObject<THREE.Object3D | null>;
  trailColorRef: MutableRefObject<THREE.Color>;
}) {
  return (
    <group position={[0, ROCKET_BASE * ROCKET_SCALE, 0]} scale={ROCKET_SCALE}>
      {/* Três quartos: mostra a escotilha com o DOG e o adesivo lateral */}
      <group rotation={[0, -0.25, 0]}>
        <Rocket {...look} thrustRef={thrustRef} nozzleRef={nozzleRef} trailColorRef={trailColorRef} pilotRef={pilotRef} />
      </group>
    </group>
  );
}

/** Onde o DOG fica na plataforma antes de embarcar (ao lado do foguete, de frente para a câmera). */
const DOG_SPOT = new THREE.Vector3(1.6, BASE_Y - 0.04, 1.15);
/** Escotilha do foguete: destino do "pulo" de embarque. */
const HATCH = new THREE.Vector3(0.15, BASE_Y + 2.6, 0.6);

/** DOG astronauta 3D na plataforma: respira parado e embarca na contagem regressiva. */
function PadDog({ phaseRef, pilotRef }: { phaseRef: MutableRefObject<PadPhase>; pilotRef: MutableRefObject<THREE.Group | null> }) {
  const group = useRef<THREE.Group>(null);
  const board = useRef(0);
  useFrame(({ clock }, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const phase = phaseRef.current;
    const boarding = phase === 'countdown' || phase === 'liftoff';
    board.current = boarding ? Math.min(1, board.current + dt / 0.7) : 0;
    const b = board.current;
    // A escotilha fica vazia enquanto o DOG está do lado de fora.
    if (pilotRef.current) pilotRef.current.visible = b >= 0.9;
    if (b >= 1) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // Arco do pé da plataforma até a escotilha, encolhendo no final.
    const e = b * b * (3 - 2 * b);
    g.position.lerpVectors(DOG_SPOT, HATCH, e);
    g.position.y += Math.sin(e * Math.PI) * 1.2;
    // Parado: respiração e um leve balanço olhando para a câmera.
    g.scale.set(1, 1 + (b ? 0 : Math.sin(t * 2.2) * 0.012), 1).multiplyScalar(1 - e * 0.9);
    g.rotation.y = 0.05 + (b ? -e * 1.6 : Math.sin(t * 0.7) * 0.12);
  });
  return (
    <group ref={group} position={DOG_SPOT}>
      <Suspense fallback={null}>
        <DogModel height={1.6} />
      </Suspense>
    </group>
  );
}

export default function PadScene({ route, look, phaseRef, aimRef, onLiftoffDone }: PadSceneProps) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const size = useThree(s => s.size);
  const pivot = useRef<THREE.Group>(null);
  const nozzle = useRef<THREE.Object3D | null>(null);
  const pilot = useRef<THREE.Group | null>(null);
  const trailColor = useRef(new THREE.Color(trailStartColor(look.trailColor)));
  const thrust = useRef(0);
  const fire = useRef<ParticleApi>(null);
  const smoke = useRef<ParticleApi>(null);
  const dots = useRef<THREE.Points>(null);
  const target = useRef<THREE.Group>(null);
  const state = useRef({ liftT: 0, done: false, shake: 0, lastPhase: '' as PadPhase | '', pos: new THREE.Vector2() });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  const smokeColor = useMemo(() => new THREE.Color('#9aa3b5'), []);
  const hot = useMemo(() => new THREE.Color('#ffb45a'), []);

  const dotGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3).setUsage(THREE.DynamicDrawUsage));
    return g;
  }, []);

  useEffect(() => {
    camera.position.set(0.8, 2.6, 12.5);
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((clock, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.clock.elapsedTime;
    const phase = phaseRef.current;
    const aim = aimRef.current;
    const s = state.current;
    if (phase !== s.lastPhase) {
      s.lastPhase = phase;
      if (phase === 'liftoff') s.liftT = 0;
    }

    // O foguete fica de pé na plataforma; só a linha pontilhada mostra o ângulo.
    // Na decolagem ele sobe reto e depois curva para a direção da mira.
    const turn = phase === 'liftoff' ? THREE.MathUtils.smoothstep(s.liftT, 0.35, 1.3) : 0;
    const tilt = (90 - aim.angle) * DEG * turn;
    tmp.dir.set(Math.cos(aim.angle * DEG), Math.sin(aim.angle * DEG), 0);

    // Planeta-alvo no céu, na direção do ângulo ideal.
    if (target.current) {
      const ta = aim.targetAngle * DEG;
      target.current.position.set(Math.cos(ta) * AIM_REACH, NOSE_Y + Math.sin(ta) * AIM_REACH, 0);
    }

    if (pivot.current) {
      if (phase === 'liftoff') {
        s.liftT += dt;
        // Integra a velocidade ao longo da direção atual do foguete (sobe reto e curva).
        const speed = 9 * s.liftT + 0.5;
        const heading = Math.PI / 2 - tilt;
        s.pos.x += Math.cos(heading) * speed * dt;
        s.pos.y += Math.sin(heading) * speed * dt;
        pivot.current.position.set(s.pos.x, BASE_Y + s.pos.y, 0);
        s.shake = Math.max(0, 0.5 - s.liftT * 0.25);
        if (s.liftT > 2.6 && !s.done) {
          s.done = true;
          onLiftoffDone();
        }
      } else {
        pivot.current.position.set(0, BASE_Y, 0);
        s.pos.set(0, 0);
      }
      pivot.current.rotation.z = -tilt;
    }

    // Chama e partículas
    const target_thrust =
      phase === 'liftoff' ? 2.2 : phase === 'countdown' ? 0.25 + Math.random() * 0.15 : phase === 'power' ? 0.05 + (aim.power / 100) * 0.2 : 0;
    thrust.current = THREE.MathUtils.lerp(thrust.current, target_thrust, 1 - Math.exp(-8 * dt));

    if (nozzle.current && fire.current && smoke.current) {
      const p = nozzle.current.getWorldPosition(tmp.v);
      if (phase === 'liftoff') {
        for (let i = 0; i < 6; i++) {
          fire.current.emit(p, tmp.w.set(Math.sin(tilt), Math.cos(tilt), 0).multiplyScalar(-10 - Math.random() * 6).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), trailColor.current, { size: 0.9, life: 0.4, drag: 1, grow: 1.5 });
        }
        if (s.liftT < 1.6) {
          for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 3 + Math.random() * 5;
            smoke.current.emit(
              tmp.w.set(Math.cos(a) * 0.8, BASE_Y + 0.2, Math.sin(a) * 0.8),
              new THREE.Vector3(Math.cos(a) * sp, 0.6 + Math.random(), Math.sin(a) * sp),
              smokeColor,
              { size: 2.4, life: 2.6, drag: 0.9, grow: 3 }
            );
          }
        }
      } else if (phase === 'countdown') {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          smoke.current.emit(
            tmp.w.set(Math.cos(a) * 0.6, BASE_Y + 0.2, Math.sin(a) * 0.6),
            new THREE.Vector3(Math.cos(a) * 2, 0.3 + Math.random() * 0.5, Math.sin(a) * 2),
            smokeColor,
            { size: 1.6, life: 2, drag: 1, grow: 2.5 }
          );
        }
        fire.current.emit(p, tmp.w.set(0, -3, 0), hot, { size: 0.5, life: 0.25, drag: 2, grow: 1 });
      }
    }

    // Trajetória prevista (pontos)
    if (dots.current) {
      dots.current.visible = phase === 'angle' || phase === 'power';
      const arr = dotGeo.attributes.position.array as Float32Array;
      const reach = AIM_REACH - 0.9;
      for (let i = 0; i < DOTS; i++) {
        const u = (i + ((t * 2) % 1)) / DOTS;
        const d = 0.5 + u * reach;
        arr[i * 3] = tmp.dir.x * d;
        arr[i * 3 + 1] = NOSE_Y + tmp.dir.y * d;
        arr[i * 3 + 2] = 0;
      }
      dotGeo.attributes.position.needsUpdate = true;
      const inZone = Math.abs(aim.angle - aim.targetAngle) <= aim.angleHalf;
      (dots.current.material as THREE.PointsMaterial).color.set(inZone ? '#4ade80' : '#e2e8f0');
    }

    // Câmera
    // Leve respiração da câmera frontal; na decolagem ela acompanha o foguete.
    // Telas em pé: câmera mais afastada e mais alta, com o foguete acima dos medidores.
    const portrait = size.width / size.height < 1;
    const dist = portrait ? 16 : 11;
    const lookX = portrait ? 1.6 : 1.8;
    const lookY = portrait ? 1.6 : 2.0;
    const base = tmp.w.set(lookX + Math.sin(t * 0.13) * 0.3, lookY - 1.2 + Math.sin(t * 0.21) * 0.08, dist);
    let look = tmp.v.set(lookX, lookY, 0);
    if (phase === 'liftoff' && pivot.current) {
      const rp = pivot.current.position;
      base.set(rp.x * 0.75 + lookX, rp.y * 0.8 + lookY - 1.2, dist + s.liftT * 2.5);
      look = tmp.v.copy(rp).add(tmp.dir.clone().multiplyScalar(2));
    }
    base.x += (Math.random() - 0.5) * s.shake * s.shake;
    base.y += (Math.random() - 0.5) * s.shake * s.shake;
    camera.position.lerp(base, 1 - Math.exp(-(phase === 'liftoff' ? 6 : 2) * dt));
    camera.lookAt(look);
  });

  return (
    <>
      <SkyBackground dim={0.3} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#b9ccff', '#2a1a3a', 0.6]} />
      <directionalLight position={[-8, 6, 10]} intensity={2.4} color="#ffe6c8" />
      <directionalLight position={[-10, 3, -4]} intensity={1.2} color="#7aa2ff" />
      <StudioEnvironment />
      <Stars radius={260} depth={60} count={2500} factor={4} saturation={0.2} fade speed={0.5} />

      <fog attach="fog" args={['#140f33', 25, 150]} />
      <LaunchSite groundY={GROUND_Y} />
      <group ref={target}>
        <HoloTarget kind={route.destination} color={route.color} />
      </group>

      <Platform />
      <PadDog phaseRef={phaseRef} pilotRef={pilot} />
      <group ref={pivot}>
        <PadRocket look={look} thrustRef={thrust} nozzleRef={nozzle} trailColorRef={trailColor} pilotRef={pilot} />
      </group>

      <points ref={dots} geometry={dotGeo}>
        <pointsMaterial size={0.2} color="#e2e8f0" sizeAttenuation transparent opacity={0.95} toneMapped={false} />
      </points>

      <Particles ref={smoke} capacity={1400} additive={false} />
      <Particles ref={fire} capacity={1400} />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.65} luminanceSmoothing={0.2} radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  );
}
