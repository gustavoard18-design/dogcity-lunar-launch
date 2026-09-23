import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Casco do foguete em 3D, gerado a partir da arte oficial (cutout-rocket) no
 * 3D AI Studio (Tripo 3.2). Encaixado nas mesmas medidas do foguete antigo:
 * bocal em y = -1.55, nariz em y = 1.9, escotilha virada para +Z.
 */

const URL = `${import.meta.env.BASE_URL || './'}models/rocket.glb`;

/** Base do bocal e ponta do nariz no espaço do modelo original (medidos na arte). */
const SRC_NOZZLE_Y = -0.431;
const SRC_TOP_Y = 0.482;
export const ROCKET_NOZZLE_Y = -1.55;
export const ROCKET_TOP_Y = 1.9;

export default function RocketModel({ tint }: { tint?: string }) {
  const { scene } = useGLTF(URL);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const k = (ROCKET_TOP_Y - ROCKET_NOZZLE_Y) / (SRC_TOP_Y - SRC_NOZZLE_Y);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.scale.setScalar(k);
    root.position.set(-c.x * k, ROCKET_NOZZLE_Y - SRC_NOZZLE_Y * k, -c.z * k);
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      // Metal vem da textura; limita um pouco para o casco não ficar espelhado.
      mat.metalness = 0.6;
      mat.envMapIntensity = 1;
      if (tint) mat.color.set(tint);
      m.material = mat;
    });
    return root;
  }, [scene, tint]);
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
