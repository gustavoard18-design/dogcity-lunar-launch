import { forwardRef, MutableRefObject, Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox, useTexture } from '@react-three/drei';
import RocketModel from './RocketModel';
import { getRocketDecalTexture } from './textures';
import type { DogStats } from '../lib/stats';
import type { AstronautLook } from '../types';
import { UPGRADE_VISUALS } from '../lib/stats';

export type RocketLook = AstronautLook;

interface RocketProps extends RocketLook {
  /** Intensidade da chama (0 = desligado, 1 = cruzeiro, 2 = boost). */
  thrust?: number;
  thrustRef?: MutableRefObject<number>;
  /** Objeto posicionado no bocal, útil para emitir partículas em coordenadas de mundo. */
  nozzleRef?: MutableRefObject<THREE.Object3D | null>;
  /** Cor atual do rastro (atualizada a cada frame; útil para rastro arco-íris). */
  trailColorRef?: MutableRefObject<THREE.Color>;
  /** Rosto do DOG na escotilha (a plataforma o esconde até o embarque). */
  pilotRef?: MutableRefObject<THREE.Group | null>;
}

export const SOLAR_A = '#ff6a00';
const SOLAR_A_COLOR = new THREE.Color(SOLAR_A);
const SOLAR_B_COLOR = new THREE.Color('#ffc21a');

/** Cor inicial de um rastro (o 'solar' é animado dentro do Rocket). */
export const trailStartColor = (trail: string) => (trail === 'solar' ? SOLAR_A : trail);

const NO_UPGRADES: DogStats = { power: 1, accuracy: 1, luck: 1, speed: 1 };
const GOLD = '#ffc93a';

/** Peças que a Oficina instala no foguete (ver UPGRADE_VISUALS). */
function UpgradeParts({ upgrades, fin }: { upgrades: DogStats; fin: THREE.BufferGeometry }) {
  const v = UPGRADE_VISUALS;
  const boosters = upgrades.power >= v.power[0].level;
  const hotBoosters = upgrades.power >= v.power[1].level;
  const antenna = upgrades.accuracy >= v.accuracy[0].level;
  const radar = upgrades.accuracy >= v.accuracy[1].level;
  const canards = upgrades.speed >= v.speed[1].level;
  return (
    <>
      {boosters &&
        [-1, 1].map(s => (
          <group key={s} position={[0.97 * s, -0.4, -0.08]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 1.25, 32]} />
              <meshPhysicalMaterial color="#eef1f6" metalness={0.35} roughness={0.3} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <coneGeometry args={[0.16, 0.36, 32]} />
              <meshPhysicalMaterial color="#e63946" metalness={0.4} roughness={0.25} clearcoat={1} />
            </mesh>
            <mesh position={[0, -0.72, 0]}>
              <cylinderGeometry args={[0.1, 0.17, 0.2, 24]} />
              <meshStandardMaterial color="#3a3d4a" metalness={1} roughness={0.25} />
            </mesh>
            <mesh position={[-0.12 * s, 0.25, 0]}>
              <boxGeometry args={[0.14, 0.06, 0.06]} />
              <meshStandardMaterial color="#1d1f2b" metalness={0.8} roughness={0.35} />
            </mesh>
            {hotBoosters && (
              <mesh position={[0, -0.55, 0]}>
                <torusGeometry args={[0.165, 0.025, 12, 32]} />
                <meshStandardMaterial color="#ff8a1f" emissive="#ff6a00" emissiveIntensity={3} toneMapped={false} />
              </mesh>
            )}
          </group>
        ))}
      {antenna && (
        <group position={[0, 1.88, 0]}>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
            <meshStandardMaterial color="#c9ced8" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.46, 0]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#ff3d5a" emissive="#ff3d5a" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      )}
      {radar && (
        <group position={[0.7, 0.62, 0.16]} rotation={[0, 0, -(Math.PI / 2 + 0.4)]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
            <meshStandardMaterial color="#c9ced8" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial color="#e8ecf2" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
      )}
      {canards &&
        [0, 1, 2].map(i => (
          <group key={i} rotation={[0, (i * Math.PI * 2) / 3 + Math.PI / 2, 0]}>
            <mesh geometry={fin} position={[0.6, 0.95, 0]} scale={[0.45, 0.35, 0.8]}>
              <meshPhysicalMaterial color="#e63946" metalness={0.4} roughness={0.3} clearcoat={1} />
            </mesh>
          </group>
        ))}
    </>
  );
}

const lathe = (pts: [number, number][], segments = 64) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments);

function useRocketGeometry() {
  return useMemo(() => {
    // Corpo "ovo" das artes oficiais: largo, com nariz vermelho arredondado.
    const body = lathe([
      [0.0, -1.1],
      [0.5, -1.1],
      [0.64, -0.9],
      [0.72, -0.5],
      [0.75, -0.05],
      [0.73, 0.4],
      [0.66, 0.8],
      [0.56, 1.08],
      [0.0, 1.08],
    ]);
    const nose = lathe([
      [0.0, 1.02],
      [0.585, 1.02],
      [0.5, 1.3],
      [0.38, 1.55],
      [0.22, 1.76],
      [0.08, 1.88],
      [0.0, 1.9],
    ]);
    const bell = lathe([
      [0.52, -1.06],
      [0.53, -1.18],
      [0.44, -1.24],
      [0.47, -1.33],
      [0.38, -1.39],
      [0.41, -1.48],
      [0.3, -1.55],
      [0.2, -1.55],
    ]);
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0.1);
    finShape.lineTo(0.36, -0.25);
    finShape.lineTo(0.64, -0.95);
    finShape.lineTo(0.62, -1.38);
    finShape.lineTo(0.3, -1.22);
    finShape.lineTo(0.0, -0.9);
    finShape.closePath();
    const fin = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 });
    fin.translate(0, 0, -0.045);
    return { body, nose, bell, fin };
  }, []);
}

/** Cor do aro da cabine conforme o capacete equipado. */
function cockpitRing(helmet: string) {
  switch (helmet) {
    case 'helmet_gold': return { color: '#ffc93a', emissive: '#000000', glow: 0, tint: '#5a3e0a' };
    case 'helmet_neon': return { color: '#e879f9', emissive: '#c026d3', glow: 3, tint: '#1a1450' };
    case 'helmet_classic': return { color: '#f4f6fa', emissive: '#000000', glow: 0, tint: '#0d2240' };
    default: return { color: '#d88a2a', emissive: '#000000', glow: 0, tint: '#0a1a33' };
  }
}


interface EngineFlameProps {
  trailColor: string;
  thrust?: number;
  thrustRef?: MutableRefObject<number>;
  nozzleRef?: MutableRefObject<THREE.Object3D | null>;
  trailColorRef?: MutableRefObject<THREE.Color>;
  /** Rosto do DOG na escotilha (a plataforma o esconde até o embarque). */
  pilotRef?: MutableRefObject<THREE.Group | null>;
}

// Cones com a base no bocal e a ponta para baixo: escalar em Y só alonga a chama.
const FLAME_OUTER = new THREE.ConeGeometry(0.34, 1.6, 32, 1, true).rotateX(Math.PI).translate(0, -0.8, 0);
const FLAME_INNER = new THREE.ConeGeometry(0.18, 0.9, 24, 1, true).rotateX(Math.PI).translate(0, -0.45, 0);

/** Chama do motor na cor do rastro equipado ('solar' pulsa entre laranja e dourado). Origem = bocal. */
export function EngineFlame({ trailColor, thrust = 1, thrustRef, nozzleRef, trailColorRef }: EngineFlameProps) {
  const flameOuter = useRef<THREE.Mesh>(null);
  const flameInner = useRef<THREE.Mesh>(null);
  const flameLight = useRef<THREE.PointLight>(null);
  const solar = trailColor === 'solar';
  const baseColor = useMemo(() => new THREE.Color(solar ? SOLAR_A : trailColor), [trailColor, solar]);
  const outerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: baseColor.clone(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [baseColor]
  );
  const innerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    []
  );

  useFrame(state => {
    const t = state.clock.elapsedTime;
    const k = thrustRef ? thrustRef.current : thrust;
    const flicker = 1 + Math.sin(t * 40) * 0.08 + Math.sin(t * 23) * 0.06;
    const len = Math.max(0.001, k) * flicker;
    if (solar) outerMat.color.copy(SOLAR_A_COLOR).lerp(SOLAR_B_COLOR, 0.5 + 0.5 * Math.sin(t * 6));
    if (trailColorRef) trailColorRef.current.copy(outerMat.color);
    if (flameOuter.current) {
      flameOuter.current.visible = k > 0.02;
      flameOuter.current.scale.set(0.9 + k * 0.15, len * 1.1, 0.9 + k * 0.15);
    }
    if (flameInner.current) {
      flameInner.current.visible = k > 0.02;
      flameInner.current.scale.set(1, len * 0.9, 1);
    }
    if (flameLight.current) {
      flameLight.current.intensity = k * 12 * flicker;
      flameLight.current.color.copy(outerMat.color);
    }
  });

  return (
    <group>
      <mesh ref={flameOuter} geometry={FLAME_OUTER} material={outerMat} />
      <mesh ref={flameInner} geometry={FLAME_INNER} material={innerMat} />
      <pointLight ref={flameLight} distance={8} decay={2} />
      <object3D ref={nozzleRef ?? undefined} position={[0, -0.15, 0]} />
    </group>
  );
}

/** Casco montado em código (usado enquanto o modelo 3D carrega). */
function ProceduralHull({
  geo,
  goldNose,
  bigFins,
  seam,
  red,
  hull,
  decal,
}: {
  geo: ReturnType<typeof useRocketGeometry>;
  goldNose: boolean;
  bigFins: boolean;
  seam: JSX.Element;
  red: JSX.Element;
  hull: JSX.Element;
  decal: THREE.Texture;
}) {
  return (
    <>
      <mesh geometry={geo.body} castShadow>
        {hull}
      </mesh>
      {/* Nariz vermelho, ou de ouro com Sorte nv 6 */}
      <mesh geometry={geo.nose}>
        {goldNose ? (
          <meshPhysicalMaterial color={GOLD} metalness={1} roughness={0.18} clearcoat={1} emissive="#6a4200" emissiveIntensity={0.35} />
        ) : (
          red
        )}
      </mesh>
      {/* Emendas do casco (douradas com Sorte nv 3) */}
      {[
        [1.03, 0.59],
        [0.55, 0.71],
        [-0.5, 0.726],
      ].map(([y, r]) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[r, r, 0.035, 64, 1, true]} />
          {seam}
        </mesh>
      ))}
      {/* Faixa vermelha perto da base */}
      <mesh position={[0, -0.86, 0]}>
        <cylinderGeometry args={[0.675, 0.66, 0.12, 64, 1, true]} />
        {red}
      </mesh>
      {/* Motor em anéis com brilho dourado */}
      <mesh geometry={geo.bell}>
        <meshStandardMaterial color="#6b7079" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.045, 12, 48]} />
        <meshStandardMaterial color="#ffb23a" emissive="#ff9a1a" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map(i => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 3 + Math.PI / 2, 0]}>
          <mesh geometry={geo.fin} position={[0.6, -0.2, 0]} scale={bigFins ? [1.3, 1.2, 1] : 1}>
            {red}
          </mesh>
        </group>
      ))}

      {/* Painel lateral com luz laranja */}
      <group position={[-0.515, -0.25, 0.53]} rotation={[0, -0.77, 0]}>
        <RoundedBox args={[0.22, 0.58, 0.06]} radius={0.02}>
          <meshStandardMaterial color="#5a5f68" metalness={0.6} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.08, 0.035]}>
          <boxGeometry args={[0.08, 0.2, 0.02]} />
          <meshStandardMaterial color="#ffb23a" emissive="#ff9a1a" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>
      {/* Adesivo de foguete */}
      <mesh position={[0.51, -0.22, 0.555]} rotation={[0, 0.77, 0]}>
        <planeGeometry args={[0.36, 0.36]} />
        <meshStandardMaterial map={decal} transparent roughness={0.5} polygonOffset polygonOffsetFactor={-2} depthWrite={false} />
      </mesh>

    </>
  );
}

const FACE_URL = `${import.meta.env.BASE_URL || './'}dog-face.png`;
const DEFAULT_FUR = '#d9924f';

/**
 * O DOG visto pela escotilha: a arte oficial do rosto recortada em círculo,
 * levemente iluminada por dentro. Pelagens da Loja tingem a arte.
 */
function PilotPortrait({ skinColor }: { skinColor: string }) {
  const tex = useTexture(FACE_URL);
  const map = useMemo(() => {
    const t = tex.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    // Aproxima no rosto (a arte tem o capacete inteiro).
    t.repeat.set(0.84, 0.84);
    t.offset.set(0.1, 0.06);
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [tex]);
  const custom = skinColor.toLowerCase() !== DEFAULT_FUR;
  const tint = useMemo(() => new THREE.Color('#ffffff').lerp(new THREE.Color(skinColor), custom ? 0.45 : 0), [skinColor, custom]);
  const glow = skinColor.toLowerCase() === '#3ff0ff';
  return (
    <mesh>
      <circleGeometry args={[0.35, 48]} />
      <meshStandardMaterial map={map} color={tint} emissiveMap={map} emissive={glow ? '#3ff0ff' : '#ffffff'} emissiveIntensity={glow ? 0.7 : 0.35} roughness={0.8} />
    </mesh>
  );
}

const Rocket = forwardRef<THREE.Group, RocketProps>(function Rocket(
  { skinColor, helmet, trailColor, thrust = 1, thrustRef, nozzleRef, trailColorRef, pilotRef, upgrades = NO_UPGRADES },
  ref
) {
  const geo = useRocketGeometry();
  const ring = cockpitRing(helmet);
  const goldBands = upgrades.luck >= UPGRADE_VISUALS.luck[0].level;
  const bigFins = upgrades.speed >= UPGRADE_VISUALS.speed[0].level;
  const goldNose = upgrades.luck >= UPGRADE_VISUALS.luck[1].level;
  const decal = useMemo(() => getRocketDecalTexture(), []);
  const hull = <meshPhysicalMaterial color="#ebe8e3" metalness={0.25} roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.3} />;
  const red = <meshPhysicalMaterial color="#d7322b" metalness={0.3} roughness={0.32} clearcoat={1} clearcoatRoughness={0.15} />;
  const seam = goldBands ? (
    <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} emissive="#6a4200" emissiveIntensity={0.4} />
  ) : (
    <meshStandardMaterial color="#4a4f58" metalness={0.7} roughness={0.4} />
  );

  return (
    <group ref={ref}>
      {/* Casco 3D gerado da arte oficial; o casco procedural aparece enquanto o modelo carrega. */}
      <Suspense fallback={<ProceduralHull geo={geo} goldNose={goldNose} bigFins={bigFins} seam={seam} red={red} hull={hull} decal={decal} />}>
        <RocketModel />
        {/* Peças da Oficina que mudam o próprio casco, por cima do modelo */}
        {goldNose && (
          <mesh geometry={geo.nose} position={[0, -0.05, 0]} scale={[1.1, 1.02, 1.1]}>
            <meshPhysicalMaterial color={GOLD} metalness={1} roughness={0.18} clearcoat={1} emissive="#6a4200" emissiveIntensity={0.35} />
          </mesh>
        )}
        {goldBands &&
          [
            [0.93, 0.7],
            [-0.93, 0.74],
          ].map(([y, r]) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[r, r, 0.07, 64, 1, true]} />
              {seam}
            </mesh>
          ))}
        {bigFins &&
          [0, Math.PI].map(r => (
            <group key={r} rotation={[0, r, 0]}>
              <mesh geometry={geo.fin} position={[0.72, -0.35, 0]} scale={[1.35, 1.25, 1]}>
                {red}
              </mesh>
            </group>
          ))}
      </Suspense>

      <UpgradeParts upgrades={upgrades} fin={geo.fin} />

      {/* Escotilha grande de vidro escuro, com o piloto dentro */}
      <group position={[0, 0.42, 0.86]}>
        <mesh>
          <torusGeometry args={[0.42, 0.08, 20, 56]} />
          <meshStandardMaterial color="#8f949c" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <torusGeometry args={[0.35, 0.035, 12, 56]} />
          <meshStandardMaterial color={ring.color} metalness={1} roughness={0.2} emissive={ring.emissive} emissiveIntensity={ring.glow} toneMapped={ring.glow === 0} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <circleGeometry args={[0.36, 40]} />
          <meshStandardMaterial color="#070d1a" roughness={0.6} />
        </mesh>
        <group ref={pilotRef} position={[0, 0, 0.05]}>
          <Suspense fallback={null}>
            <PilotPortrait skinColor={skinColor} />
          </Suspense>
        </group>
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.36, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color={ring.tint} transparent opacity={0.2} roughness={0.04} metalness={0.3} clearcoat={1} depthWrite={false} />
        </mesh>
        <mesh position={[-0.12, 0.14, 0.24]} rotation={[0.3, -0.3, 0.5]} scale={[1, 0.4, 1]}>
          <circleGeometry args={[0.08, 20]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      {/* Luzes de navegação */}
      <mesh position={[0.75, 0.05, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#3dff8a" toneMapped={false} />
      </mesh>
      <mesh position={[-0.75, 0.05, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ff3d5a" toneMapped={false} />
      </mesh>

      {/* Chama */}
      <group position={[0, -1.56, 0]}>
        <EngineFlame trailColor={trailColor} thrust={thrust} thrustRef={thrustRef} nozzleRef={nozzleRef} trailColorRef={trailColorRef} />
      </group>
    </group>
  );
});

export default Rocket;
