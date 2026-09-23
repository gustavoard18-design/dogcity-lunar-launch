import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { spaceBackgroundArt } from '../lib/evolution';

/** Iluminação de estúdio gerada em código (sem baixar HDRI) para reflexos metálicos. */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, -9]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={2} color="#9ec5ff" position={[-9, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer form="rect" intensity={1.5} color="#ff9ecb" position={[9, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer form="ring" intensity={2} color="#ffd9a8" position={[0, -6, 3]} scale={4} />
    </Environment>
  );
}

/** Traços de velocidade que passam pela câmera durante o voo. */
export function SpeedStreaks({ speedRef, count = 220, color = '#a9c8ff' }: { speedRef: React.MutableRefObject<number>; count?: number; color?: string }) {
  const { geometry, data } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 6);
    const data = new Float32Array(count * 3);
    // Cabeça clara e cauda apagada (mistura aditiva: preto = transparente).
    const col = new Float32Array(count * 6);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const k = 0.5 + Math.random() * 0.5;
      col.set([c.r * k, c.g * k, c.b * k, 0, 0, 0], i * 6);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 40;
      data[i * 3] = Math.cos(a) * r;
      data[i * 3 + 1] = Math.sin(a) * r;
      data[i * 3 + 2] = -Math.random() * 220;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return { geometry, data };
  }, [count]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const speed = speedRef.current;
    const len = 0.5 + speed * 0.06;
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let z = data[i * 3 + 2] + speed * 1.6 * dt;
      if (z > 8) {
        z = -220;
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * 40;
        data[i * 3] = Math.cos(a) * r;
        data[i * 3 + 1] = Math.sin(a) * r;
      }
      data[i * 3 + 2] = z;
      const x = data[i * 3];
      const y = data[i * 3 + 1];
      pos.set([x, y, z, x, y, z - len], i * 6);
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

const SKY_ASPECT = 1400 / 1412;

/**
 * Céu do jogo como fundo da cena, enquadrado em "cover" (sem distorcer) e com
 * deriva lenta. `zoomRef` (0..1) aproxima a imagem, ex.: progresso do voo.
 */
export function SkyBackground({ zoomRef, drift = 1, dim = 0 }: { zoomRef?: MutableRefObject<number>; drift?: number; dim?: number }) {
  const source = useTexture(spaceBackgroundArt());
  // Versão escurecida: no voo o céu não pode competir com os asteroides reais.
  const tex = useMemo(() => {
    const img = source.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const g = canvas.getContext('2d')!;
    g.drawImage(img, 0, 0);
    if (dim > 0) {
      g.fillStyle = `rgba(3, 6, 22, ${dim})`;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.matrixAutoUpdate = false;
    return t;
  }, [source, dim]);
  const scene = useThree(s => s.scene);
  const size = useThree(s => s.size);

  useEffect(() => {
    const previous = scene.background;
    scene.background = tex;
    return () => {
      if (scene.background === tex) scene.background = previous;
    };
  }, [tex, scene]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const view = size.width / size.height;
    // Parte da imagem que cabe na tela sem distorcer.
    let sx = 1;
    let sy = 1;
    if (view > SKY_ASPECT) sy = SKY_ASPECT / view;
    else sx = view / SKY_ASPECT;
    const zoom = 1.06 + 0.04 * Math.sin(t * 0.05 * drift) + (zoomRef ? zoomRef.current * 0.45 : 0);
    sx /= zoom;
    sy /= zoom;
    // Deriva limitada à folga que sobra após o zoom.
    const tx = ((1 - sx) / 2) * Math.sin(t * 0.023 * drift) * 0.8;
    const ty = ((1 - sy) / 2) * Math.cos(t * 0.017 * drift) * 0.8;
    tex.matrix.setUvTransform(tx, ty, sx, sy, Math.sin(t * 0.01 * drift) * 0.01, 0.5, 0.5);
  });

  return null;
}
