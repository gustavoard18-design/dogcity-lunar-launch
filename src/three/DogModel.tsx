import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * DOG astronauta em 3D, gerado a partir da arte oficial (cutout-astronaut) no
 * 3D AI Studio (Tripo 3.2). Origem nos pés, de frente para +Z.
 * (O GLB vem olhando para +X; o grupo interno gira para +Z.)
 */

const URL = `${import.meta.env.BASE_URL || './'}models/dog-astronaut.glb`;

export default function DogModel({ height = 1.4 }: { height?: number }) {
  const { scene } = useGLTF(URL);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const k = height / size.y;
    root.scale.setScalar(k);
    // Pés na origem, centrado em X/Z.
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        // O GLB vem com metal = 1; o traje é tecido e plástico.
        mat.metalnessMap = null;
        mat.metalness = 0.15;
        mat.envMapIntensity = 0.8;
        mat.needsUpdate = true;
      }
    });
    return root;
  }, [scene, height]);
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
