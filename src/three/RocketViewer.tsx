import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { AstronautLook } from '../types';
import Rocket from './Rocket';
import { StudioEnvironment } from './SpaceBits';

/**
 * Foguete 3D da vitrine (Loja e Oficina): o mesmo modelo do jogo, com as peças
 * da Oficina, o rastro na chama e o DOG na janela. Gira sozinho; arraste para girar.
 */
export default function RocketViewer({ look }: { look: AstronautLook }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0.4, 8.6], fov: 32 }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[-4, 5, 6]} intensity={2.6} color="#fff1dc" />
      <directionalLight position={[5, -1, -3]} intensity={1.3} color="#7aa2ff" />
      <pointLight position={[0, -2.4, 2]} intensity={5} distance={6} color="#ff9a3c" />
      <StudioEnvironment />
      <group position={[0, 0.2, 0]} scale={0.85}>
        <Rocket {...look} thrust={0.55} />
      </group>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.6}
        minPolarAngle={Math.PI / 2 - 0.35}
        maxPolarAngle={Math.PI / 2 + 0.2}
        target={[0, -0.05, 0]}
      />
    </Canvas>
  );
}
