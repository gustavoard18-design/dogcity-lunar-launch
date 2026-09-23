import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rosto 3D do mascote DOG (Shiba), usado na escotilha do foguete em voo.
 * Fora do voo o mascote aparece pelas artes oficiais (public/art).
 */

const CREAM = '#fbeedd';
const DEFAULT_FUR = '#d9924f';

function useFur(skinColor: string) {
  return useMemo(() => {
    const fur = new THREE.Color(skinColor || DEFAULT_FUR);
    const glow = skinColor.toLowerCase() === '#3ff0ff';
    return { fur, glow, inner: fur.clone().lerp(new THREE.Color(CREAM), 0.55) };
  }, [skinColor]);
}

/**
 * Rosto do Shiba com orelhas (cabeça com raio ~0.5, centrada na origem).
 * `earScale` > 1 deixa as orelhas saírem pelo topo do capacete, como nas artes.
 */
export function DogHead({ skinColor = DEFAULT_FUR, earScale = 1 }: { skinColor?: string; earScale?: number }) {
  const { fur, glow, inner } = useFur(skinColor);
  const furMat = <meshStandardMaterial color={fur} roughness={0.88} emissive={glow ? fur : '#000'} emissiveIntensity={glow ? 0.7 : 0} />;
  const cream = <meshStandardMaterial color={CREAM} roughness={0.92} />;

  return (
    <group>
      <mesh scale={[1.05, 0.93, 0.95]}>
        <sphereGeometry args={[0.5, 48, 48]} />
        {furMat}
      </mesh>
      {/* Máscara creme: bochechas, focinho e queixo */}
      <mesh position={[0, -0.14, 0.2]} scale={[1.3, 0.78, 0.95]}>
        <sphereGeometry args={[0.34, 40, 40]} />
        {cream}
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={`cheek${s}`} position={[0.23 * s, -0.11, 0.3]} scale={[1.1, 0.9, 0.8]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          {cream}
        </mesh>
      ))}
      <mesh position={[0, -0.1, 0.45]} scale={[1.15, 0.82, 0.9]}>
        <sphereGeometry args={[0.16, 32, 32]} />
        {cream}
      </mesh>
      <mesh position={[0, -0.03, 0.6]} scale={[1.35, 0.95, 0.9]}>
        <sphereGeometry args={[0.058, 24, 24]} />
        <meshStandardMaterial color="#141011" roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.16, 0.555]} rotation={[0.25, 0, Math.PI]}>
        <torusGeometry args={[0.055, 0.011, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#3a2420" roughness={0.6} />
      </mesh>
      {[-1, 1].map(s => (
        <group key={`eye${s}`} position={[0.18 * s, 0.05, 0.42]}>
          <mesh scale={[1, 1.12, 0.7]}>
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshStandardMaterial color="#1b120f" roughness={0.12} />
          </mesh>
          <mesh position={[0.022 * s, 0.028, 0.045]}>
            <sphereGeometry args={[0.019, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.005 * s, 0.13, -0.01]} scale={[1.2, 0.7, 0.6]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            {cream}
          </mesh>
        </group>
      ))}
      {[-1, 1].map(s => (
        <group key={`ear${s}`} position={[0.3 * s, 0.44 + (earScale - 1) * 0.2, -0.02]} rotation={[-0.1, 0, -0.32 * s]} scale={earScale}>
          <mesh>
            <coneGeometry args={[0.18, 0.42, 24]} />
            {furMat}
          </mesh>
          <mesh position={[0, -0.03, 0.07]} scale={[0.6, 0.75, 0.4]}>
            <coneGeometry args={[0.18, 0.42, 24]} />
            <meshStandardMaterial color={inner} roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
