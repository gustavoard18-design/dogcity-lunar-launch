import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// Foguete 3D com animações
function Rocket3D({ phase, power }: { phase: string; power: number }) {
  const rocketRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (rocketRef.current) {
      // Flutuação suave
      rocketRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      rocketRef.current.rotation.y += 0.01;
    }
    
    if (flameRef.current && phase === 'flying') {
      // Chama pulsante
      const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
      flameRef.current.scale.y = scale;
    }
  });

  return (
    <group ref={rocketRef} position={[0, -2, 0]}>
      {/* Corpo principal */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 2, 32]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Nariz */}
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.3, 0.6, 32]} />
        <meshStandardMaterial color="#ff4444" metalness={0.7} roughness={0.2} emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Janela */}
      <mesh position={[0, 0.5, 0.35]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#4488ff" metalness={0.95} roughness={0.05} emissive="#2266cc" emissiveIntensity={0.8} />
      </mesh>
      
      {/* Asas */}
      <mesh position={[-0.5, -0.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.1, 0.8, 0.4]} />
        <meshStandardMaterial color="#ff4444" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0.5, -0.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.1, 0.8, 0.4]} />
        <meshStandardMaterial color="#ff4444" metalness={0.7} roughness={0.2} />
      </mesh>
      
      {/* Motor */}
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.3, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Chama do motor */}
      <mesh ref={flameRef} position={[0, -1.5, 0]}>
        <coneGeometry args={[0.2, 0.8, 32]} />
        <meshStandardMaterial 
          color="#ff8800" 
          emissive="#ff4400" 
          emissiveIntensity={3}
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* Brilho da chama */}
      <pointLight position={[0, -1.5, 0]} color="#ff6600" intensity={5} distance={5} />
    </group>
  );
}

// Lua 3D
function Moon3D() {
  const moonRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.002;
    }
  });

  return (
    <mesh ref={moonRef} position={[0, 3, -15]}>
      <sphereGeometry args={[3, 64, 64]} />
      <meshStandardMaterial 
        color="#cccccc" 
        roughness={0.9} 
        metalness={0.1}
      />
    </mesh>
  );
}

// Alvo 3D animado
function Target3D({ position }: { position: [number, number, number] }) {
  const targetRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (targetRef.current) {
      targetRef.current.rotation.y += 0.03;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      targetRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={targetRef} position={position}>
      {/* Anel externo */}
      <mesh>
        <torusGeometry args={[1, 0.08, 16, 100]} />
        <meshStandardMaterial 
          color="#ffdd00" 
          emissive="#ffaa00" 
          emissiveIntensity={2}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Anel médio */}
      <mesh>
        <torusGeometry args={[0.6, 0.08, 16, 100]} />
        <meshStandardMaterial 
          color="#ffdd00" 
          emissive="#ffaa00" 
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Centro */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color="#ffdd00" 
          emissive="#ffaa00" 
          emissiveIntensity={4}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>
      
      {/* Brilho */}
      <pointLight color="#ffdd00" intensity={5} distance={10} />
    </group>
  );
}

// Partículas 3D
function Particles3D({ count = 2000 }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0003;
      particlesRef.current.rotation.x += 0.0001;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#8888ff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Cena principal
function Scene({ phase, power }: { phase: string; power: number }) {
  return (
    <>
      {/* Iluminação */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={0.8} color="#4444ff" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ff44ff" />
      
      {/* Estrelas de fundo */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Partículas */}
      <Particles3D count={3000} />
      
      {/* Lua */}
      <Moon3D />
      
      {/* Foguete */}
      <Rocket3D phase={phase} power={power} />
      
      {/* Alvo */}
      <Target3D position={[5, 5, -8]} />
      
      {/* Controles de câmera */}
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        minDistance={8}
        maxDistance={25}
        autoRotate
        autoRotateSpeed={0.5}
      />
      
      {/* Post-processing */}
      <EffectComposer>
        <Bloom 
          intensity={2}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
      </EffectComposer>
    </>
  );
}

// Componente principal
export default function SpaceScene3D({ phase = 'idle', power = 0 }: { phase?: string; power?: number }) {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={75} />
        <Scene phase={phase} power={power} />
      </Canvas>
    </div>
  );
}
