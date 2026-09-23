import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface EmitOptions {
  size?: number;
  life?: number;
  drag?: number;
  grow?: number;
  gravity?: number;
}

export interface ParticleApi {
  emit(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color, opts?: EmitOptions): void;
  burst(pos: THREE.Vector3, count: number, speed: number, color: THREE.Color, opts?: EmitOptions): void;
}

const vertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a *= a;
    if (vAlpha * a < 0.003) discard;
    gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
  }
`;

interface ParticlesProps {
  capacity?: number;
  additive?: boolean;
}

/** Sistema de partículas imperativo: um único draw call para milhares de faíscas. */
const Particles = forwardRef<ParticleApi, ParticlesProps>(function Particles({ capacity = 2500, additive = true }, ref) {
  const size = useThree(s => s.size);
  const dpr = useThree(s => s.viewport.dpr);

  const sim = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(capacity * 3);
    const col = new Float32Array(capacity * 3);
    const sz = new Float32Array(capacity);
    const alpha = new Float32Array(capacity);
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sz, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return {
      geometry,
      pos,
      col,
      sz,
      alpha,
      vel: new Float32Array(capacity * 3),
      life: new Float32Array(capacity),
      maxLife: new Float32Array(capacity),
      baseSize: new Float32Array(capacity),
      drag: new Float32Array(capacity),
      grow: new Float32Array(capacity),
      gravity: new Float32Array(capacity),
      cursor: 0,
    };
  }, [capacity]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uScale: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [additive]
  );
  material.uniforms.uScale.value = (size.height * dpr) / 14;

  useImperativeHandle(ref, () => {
    const tmp = new THREE.Vector3();
    const api: ParticleApi = {
      emit(p, v, c, opts = {}) {
        const i = sim.cursor;
        sim.cursor = (sim.cursor + 1) % capacity;
        sim.pos.set([p.x, p.y, p.z], i * 3);
        sim.vel.set([v.x, v.y, v.z], i * 3);
        sim.col.set([c.r, c.g, c.b], i * 3);
        const life = opts.life ?? 0.6;
        sim.life[i] = life;
        sim.maxLife[i] = life;
        sim.baseSize[i] = opts.size ?? 0.4;
        sim.drag[i] = opts.drag ?? 1;
        sim.grow[i] = opts.grow ?? 0;
        sim.gravity[i] = opts.gravity ?? 0;
      },
      burst(p, count, speed, c, opts) {
        for (let k = 0; k < count; k++) {
          tmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
          api.emit(p, tmp, c, opts);
        }
      },
    };
    return api;
  }, [sim, capacity]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    for (let i = 0; i < capacity; i++) {
      if (sim.life[i] <= 0) {
        sim.alpha[i] = 0;
        continue;
      }
      sim.life[i] -= dt;
      const k = Math.max(0, 1 - sim.drag[i] * dt);
      const j = i * 3;
      sim.vel[j] *= k;
      sim.vel[j + 1] = sim.vel[j + 1] * k - sim.gravity[i] * dt;
      sim.vel[j + 2] *= k;
      sim.pos[j] += sim.vel[j] * dt;
      sim.pos[j + 1] += sim.vel[j + 1] * dt;
      sim.pos[j + 2] += sim.vel[j + 2] * dt;
      const t = Math.max(0, sim.life[i] / sim.maxLife[i]);
      sim.alpha[i] = t;
      sim.sz[i] = sim.baseSize[i] * (1 + sim.grow[i] * (1 - t));
    }
    const g = sim.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  });

  return <points geometry={sim.geometry} material={material} frustumCulled={false} />;
});

export default Particles;
