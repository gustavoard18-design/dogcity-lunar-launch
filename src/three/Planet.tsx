import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetKind } from '../types';
import { getTexture } from './textures';

const ATMOSPHERE: Partial<Record<PlanetKind, string>> = {
  earth: '#4da6ff',
  mars: '#ff8a5c',
  gas: '#ffd7a0',
  moon: '#9fb4d6',
  ceres: '#8a8a9a',
};

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = 1.0 - max(dot(vNormal, vView), 0.0);
    float a = pow(rim, uPower) * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export function Atmosphere({ radius, color, strength = 1.4, power = 3 }: { radius: number; color: string; strength?: number; power?: number }) {
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uStrength: { value: strength } }),
    [color, power, strength]
  );
  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

interface PlanetProps {
  kind: PlanetKind;
  radius: number;
  position?: [number, number, number];
  spin?: number;
  tilt?: number;
  rings?: boolean;
  /** Desliga a névoa da cena (planetas de fundo muito distantes). */
  fog?: boolean;
}

export default function Planet({ kind, radius, position = [0, 0, 0], spin = 0.02, tilt = 0.3, rings = false, fog = true }: PlanetProps) {
  const body = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const map = useMemo(() => getTexture(kind), [kind]);
  const cloudMap = useMemo(() => (kind === 'earth' ? getTexture('clouds') : null), [kind]);
  const bumpy = kind === 'moon' || kind === 'ceres' || kind === 'mars';

  useFrame((_, dt) => {
    if (body.current) body.current.rotation.y += spin * dt;
    if (clouds.current) clouds.current.rotation.y += spin * 1.3 * dt;
  });

  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh ref={body}>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshStandardMaterial
          map={map}
          bumpMap={bumpy ? map : undefined}
          bumpScale={bumpy ? radius * 0.015 : 0}
          roughness={kind === 'earth' ? 0.75 : 0.95}
          metalness={0}
          fog={fog}
        />
      </mesh>
      {cloudMap && (
        <mesh ref={clouds} scale={1.012}>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial map={cloudMap} transparent depthWrite={false} roughness={1} fog={fog} />
        </mesh>
      )}
      {ATMOSPHERE[kind] && <Atmosphere radius={radius} color={ATMOSPHERE[kind]!} strength={kind === 'earth' ? 1.8 : 1.1} />}
      {rings && (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2.3, 128]} />
          <meshStandardMaterial color="#d9c29a" transparent opacity={0.45} side={THREE.DoubleSide} roughness={1} fog={fog} />
        </mesh>
      )}
    </group>
  );
}
