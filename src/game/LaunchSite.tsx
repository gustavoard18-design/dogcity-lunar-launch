import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetKind } from '../types';
import Planet from '../three/Planet';
import { getRegolithTexture } from '../three/textures';

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

/** Altura do terreno: plano perto da plataforma, dunas suaves e colinas ao fundo. */
function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const flat = THREE.MathUtils.smoothstep(r, 7, 16);
  const dunes = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.7 + Math.sin(x * 0.07 + z * 0.11) * 1.2;
  const hills = THREE.MathUtils.smoothstep(-z, 35, 110) * (6 + Math.sin(x * 0.045) * 5 + Math.sin(x * 0.13 + 1.3) * 2.5);
  return flat * dunes + hills;
}

function Terrain({ groundY }: { groundY: number }) {
  const map = useMemo(() => {
    const t = getRegolithTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(26, 26);
    return t;
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(420, 420, 220, 220);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, groundY, -60]}>
      <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.35} roughness={0.95} metalness={0.05} color="#b9aea4" />
    </mesh>
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
  return (
    <group>
      <Terrain groundY={groundY} />
      <Dome position={[-9.5, groundY, -12]} radius={2.8} />
      <Dome position={[-15, groundY, -20]} radius={1.8} />
      <CommTower position={[13, groundY, -22]} />
      <RadarDish position={[-13, groundY, -9]} />
      <FuelTanks position={[7.5, groundY, -8]} />
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
      <Planet kind={kind} radius={0.85} spin={0.25} />
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
