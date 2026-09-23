import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetKind } from '../types';
import { makeRockGeometry } from './rocks';

/**
 * Cenário de fundo do voo: rochas gigantes fora da área de jogo, que passam
 * devagar (parallax) e dão profundidade, mais satélites à deriva.
 * Nada aqui colide com a nave.
 */

/** Cor das rochas conforme o destino da rota. */
export const ROCK_TINT: Record<PlanetKind, string> = {
  earth: '#a39788',
  moon: '#a8a6a3',
  ceres: '#8f8a86',
  mars: '#b07a62',
  gas: '#b39a7c',
};

const Z_NEAR = 30;
const Z_FAR = -420;

interface Drifter {
  p: THREE.Vector3;
  s: number;
  rot: THREE.Euler;
  spin: THREE.Vector3;
}

function placeDrifter(d: Drifter, z: number) {
  // Anel em volta do corredor de voo: longe o bastante para nunca atrapalhar.
  const a = Math.random() * Math.PI * 2;
  const r = 34 + Math.random() * 70;
  d.p.set(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.8, z);
  d.s = 2.5 + Math.pow(Math.random(), 2) * 11;
  d.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  d.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.25);
}

export function DeepField({ speedRef, kind, count = 70 }: { speedRef: MutableRefObject<number>; kind: PlanetKind; count?: number }) {
  const shapes = useMemo(
    () => [
      makeRockGeometry({ seed: 41, detail: 3, rough: 0.7, squash: 0.7, craters: 7 }),
      makeRockGeometry({ seed: 57, detail: 3, rough: 0.6, squash: 0.85, craters: 5 }),
    ],
    []
  );
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const drifters = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const d: Drifter = { p: new THREE.Vector3(), s: 1, rot: new THREE.Euler(), spin: new THREE.Vector3() };
        placeDrifter(d, THREE.MathUtils.lerp(Z_NEAR, Z_FAR, Math.random()));
        return d;
      }),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const per = Math.ceil(count / shapes.length);

  useEffect(() => {
    const c = new THREE.Color();
    meshes.current.forEach((m, k) => {
      if (!m) return;
      for (let i = 0; i < per; i++) {
        // Leve variação de tom entre as rochas.
        const v = 0.75 + ((i * 37 + k * 11) % 17) / 17 * 0.4;
        m.setColorAt(i, c.setRGB(v, v, v));
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [per]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // Mais lentas que os asteroides do jogo: parecem mais distantes.
    const dz = speedRef.current * 0.45 * dt;
    const idx = [0, 0];
    drifters.forEach((d, i) => {
      d.p.z += dz;
      if (d.p.z > Z_NEAR) placeDrifter(d, Z_FAR - Math.random() * 40);
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      const k = i % shapes.length;
      const m = meshes.current[k];
      if (!m) return;
      dummy.position.copy(d.p);
      dummy.rotation.copy(d.rot);
      // Nasce pequenininha no fundo e cresce ao se aproximar (sem "pular" na tela).
      dummy.scale.setScalar(d.s * THREE.MathUtils.smoothstep(d.p.z, Z_FAR - 40, Z_FAR + 160));
      dummy.updateMatrix();
      m.setMatrixAt(idx[k]++, dummy.matrix);
    });
    meshes.current.forEach((m, k) => {
      if (!m) return;
      m.count = idx[k];
      m.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {shapes.map((g, k) => (
        <instancedMesh key={k} ref={el => (meshes.current[k] = el)} args={[g, undefined, per]} frustumCulled={false}>
          <meshStandardMaterial color={ROCK_TINT[kind]} roughness={0.95} metalness={0.05} vertexColors flatShading fog={false} />
        </instancedMesh>
      ))}
    </>
  );
}

/** Satélite com painéis solares e luz piscando, à deriva no fundo. */
function Satellite() {
  const blink = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (blink.current) blink.current.emissiveIntensity = Math.sin(clock.elapsedTime * 5) > 0.6 ? 5 : 0.1;
  });
  const panel = (
    <group>
      <mesh>
        <boxGeometry args={[3.2, 0.06, 1.3]} />
        <meshStandardMaterial color="#1d3f94" metalness={0.7} roughness={0.25} emissive="#0a1a55" emissiveIntensity={0.4} />
      </mesh>
      {[-1.07, 0, 1.07].map(x => (
        <mesh key={x} position={[x, 0.04, 0]}>
          <boxGeometry args={[0.04, 0.02, 1.3]} />
          <meshStandardMaterial color="#cfd6e3" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.55, 0.55, 1.6, 16]} />
        <meshStandardMaterial color="#e6e2da" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.57, 0.57, 0.25, 16]} />
        <meshStandardMaterial color="#ef7b22" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <coneGeometry args={[0.45, 0.5, 16]} />
        <meshStandardMaterial color="#c9a13b" metalness={0.9} roughness={0.25} />
      </mesh>
      <group position={[2.35, 0, 0]}>{panel}</group>
      <group position={[-2.35, 0, 0]}>{panel}</group>
      <mesh position={[0, -0.95, 0.3]} rotation={[0.6, 0, 0]}>
        <sphereGeometry args={[0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3]} />
        <meshStandardMaterial color="#f2f2f2" metalness={0.3} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.6, -0.56]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial ref={blink} color="#ff4d5e" emissive="#ff4d5e" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Um satélite que cruza o fundo de tempos em tempos. */
export function DriftingSatellite({ speedRef, delay = 0 }: { speedRef: MutableRefObject<number>; delay?: number }) {
  const group = useRef<THREE.Group>(null);
  const st = useRef({ z: Z_FAR - delay, x: 24, y: 10, spin: 0.3 });
  const reset = () => {
    const side = Math.random() < 0.5 ? -1 : 1;
    st.current.z = Z_FAR - 80 - Math.random() * 300;
    st.current.x = side * (18 + Math.random() * 14);
    st.current.y = (Math.random() - 0.3) * 18;
    st.current.spin = (Math.random() - 0.5) * 0.6;
  };
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    s.z += speedRef.current * 0.5 * dt;
    if (s.z > Z_NEAR) reset();
    if (!group.current) return;
    group.current.visible = s.z > -210;
    group.current.position.set(s.x, s.y, s.z);
    group.current.scale.setScalar(1.6 * THREE.MathUtils.smoothstep(s.z, -210, -90));
    group.current.rotation.x += s.spin * dt;
    group.current.rotation.y += s.spin * 0.7 * dt;
  });
  return (
    <group ref={group} scale={1.6}>
      <Satellite />
    </group>
  );
}
