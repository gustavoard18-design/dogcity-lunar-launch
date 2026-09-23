import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ChromaticAberrationEffect } from 'postprocessing';
import * as THREE from 'three';
import type { Route } from '../types';
import type { GameTuning } from '../lib/stats';
import type { FlightResult } from '../lib/scoring';
import Rocket, { RocketLook, trailStartColor } from '../three/Rocket';
import Planet from '../three/Planet';
import Particles, { ParticleApi } from '../three/Particles';
import { SkyBackground, SpeedStreaks, StudioEnvironment } from '../three/SpaceBits';
import { makeRockGeometry } from '../three/rocks';
import { DeepField, DriftingSatellite, ROCK_TINT } from '../three/DeepSpace';

export interface FlightInput {
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  keys: { up: boolean; down: boolean; left: boolean; right: boolean };
}

export interface FlightHud {
  progress: number;
  hull: number;
  hullMax: number;
  shield: boolean;
  points: number;
  combo: number;
  orbs: number;
  rings: number;
  boost: boolean;
}

export type FlightEvent =
  | { type: 'pickup'; combo: number }
  | { type: 'ring' }
  | { type: 'shield' }
  | { type: 'shieldBreak' }
  | { type: 'hit' }
  | { type: 'crash' }
  | { type: 'arrive' };

export type { FlightResult } from '../lib/scoring';

interface FlightWorldProps {
  route: Route;
  tuning: GameTuning;
  look: RocketLook;
  startShield: boolean;
  inputRef: MutableRefObject<FlightInput>;
  abortRef: MutableRefObject<boolean>;
  onHud(h: FlightHud): void;
  onEvent(e: FlightEvent): void;
  onDone(r: FlightResult): void;
}

const BX = 6.5;
const BY = 3.6;
const SPAWN_Z = -170;
const MAX_ASTEROIDS = 110;
const MAX_ORBS = 180;
const MAX_RINGS = 6;
const MAX_SHIELDS = 3;

interface Body {
  active: boolean;
  p: THREE.Vector3;
  s: number;
  rot: THREE.Euler;
  spin: THREE.Vector3;
}

const makePool = (n: number): Body[] =>
  Array.from({ length: n }, () => ({ active: false, p: new THREE.Vector3(), s: 1, rot: new THREE.Euler(), spin: new THREE.Vector3() }));

function spawnFrom(pool: Body[]): Body | null {
  return pool.find(b => !b.active) ?? null;
}

/** Formatos de asteroide (cada um vira um InstancedMesh). */
const ROCK_SHAPES = 3;
function useRockGeometries() {
  return useMemo(
    () => [
      makeRockGeometry({ seed: 5, detail: 2, rough: 0.65, squash: 0.8, craters: 6 }),
      makeRockGeometry({ seed: 13, detail: 2, rough: 0.55, squash: 0.65, craters: 4 }),
      makeRockGeometry({ seed: 29, detail: 2, rough: 0.75, squash: 0.9, craters: 7 }),
    ],
    []
  );
}

export default function FlightWorld({ route, tuning, look, startShield, inputRef, abortRef, onHud, onEvent, onDone }: FlightWorldProps) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree(s => s.size.width / s.size.height);
  // Em telas em pé a área de voo encolhe na horizontal para o foguete não sair do quadro.
  const bx = BX * THREE.MathUtils.clamp(aspect / 1.6, 0.42, 1);
  const baseFov = aspect < 1 ? 82 : 70;
  const rocketGroup = useRef<THREE.Group>(null);
  const rocketInner = useRef<THREE.Group>(null);
  const shieldMesh = useRef<THREE.Mesh>(null);
  const nozzle = useRef<THREE.Object3D | null>(null);
  const trailColor = useRef(new THREE.Color(trailStartColor(look.trailColor)));
  const thrust = useRef(1.2);
  const speedRef = useRef(tuning.worldSpeed);
  const skyZoom = useRef(0);
  const fx = useRef<ParticleApi>(null);
  const asteroidMeshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const orbMesh = useRef<THREE.InstancedMesh>(null);
  const ringMeshes = useRef<(THREE.Group | null)[]>([]);
  const shieldPickups = useRef<(THREE.Group | null)[]>([]);
  const planetGroup = useRef<THREE.Group>(null);
  const chroma = useMemo(
    () => new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: false, modulationOffset: 0 }),
    []
  );
  const rockGeos = useRockGeometries();

  const sim = useRef({
    t: 0,
    progress: 0,
    pos: new THREE.Vector3(0, -0.5, 0),
    target: new THREE.Vector2(0, -0.5),
    prev: new THREE.Vector2(0, -0.5),
    vel: new THREE.Vector2(),
    hull: tuning.hull,
    shield: startShield,
    invuln: 1.5,
    boost: 0,
    roll: 0,
    points: 0,
    spawned: 0,
    combo: 0,
    orbs: 0,
    rings: 0,
    hits: 0,
    acc: { hazard: 0, orb: 3, ring: 1.5, shield: 0 },
    shake: 0,
    chroma: 0,
    finished: false,
    crashed: false,
    endTimer: 0,
    hudTimer: 0,
    asteroids: makePool(MAX_ASTEROIDS),
    orbList: makePool(MAX_ORBS),
    ringList: makePool(MAX_RINGS),
    shieldList: makePool(MAX_SHIELDS),
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Color() }), []);
  const colors = useMemo(
    () => ({
      gold: new THREE.Color('#ffd35a'),
      rock: new THREE.Color('#a08a74'),
      fire: new THREE.Color('#ff7a2a'),
      cyan: new THREE.Color('#5ff3ff'),
      white: new THREE.Color('#ffffff'),
      magenta: new THREE.Color('#ff4fd8'),
    }),
    []
  );

  useEffect(() => {
    camera.position.set(0, 1.2, 5.4);
    camera.lookAt(0, 0, -12);
  }, [camera]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = sim.current;
    s.t += dt;

    // ---------- Entrada ----------
    const input = inputRef.current;
    const k = input.keys;
    const kx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const ky = (k.up ? 1 : 0) - (k.down ? 1 : 0);
    if (!s.crashed) {
      if (kx || ky) {
        input.pointerActive = false;
        s.target.x += kx * (6 + tuning.steer) * dt;
        s.target.y += ky * (6 + tuning.steer) * dt;
      } else if (input.pointerActive) {
        s.target.set(input.pointerX * bx, input.pointerY * BY);
      }
      s.target.x = THREE.MathUtils.clamp(s.target.x, -bx, bx);
      s.target.y = THREE.MathUtils.clamp(s.target.y, -BY, BY);
      const follow = 1 - Math.exp(-tuning.steer * dt);
      s.prev.set(s.pos.x, s.pos.y);
      s.pos.x += (s.target.x - s.pos.x) * follow;
      s.pos.y += (s.target.y - s.pos.y) * follow;
      s.vel.set((s.pos.x - s.prev.x) / dt, (s.pos.y - s.prev.y) / dt);
    }

    // ---------- Progresso ----------
    s.boost = Math.max(0, s.boost - dt);
    const boostK = s.boost > 0 ? 1.45 : 1;
    const speed = tuning.worldSpeed * boostK * (s.finished ? 0.6 : 1);
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, s.crashed ? 0 : speed, 1 - Math.exp(-4 * dt));
    if (!s.finished && !s.crashed) s.progress = Math.min(1, s.progress + (dt * boostK) / tuning.flightSeconds);
    const spawning = !s.finished && !s.crashed && s.progress < 0.97;

    if (abortRef.current && !s.crashed && !s.finished) {
      s.crashed = true;
      s.endTimer = 1.2;
      fx.current?.burst(s.pos, 160, 14, colors.fire, { size: 1.2, life: 1.2, drag: 1.5, grow: 2 });
      onEvent({ type: 'crash' });
    }

    // ---------- Geração ----------
    if (spawning) {
      const ramp = 0.6 + 0.8 * s.progress;
      s.acc.hazard += tuning.hazardRate * ramp * (0.4 + 0.6 * (bx / BX)) * dt;
      while (s.acc.hazard >= 1) {
        s.acc.hazard -= 1;
        const a = spawnFrom(s.asteroids);
        if (!a) break;
        a.active = true;
        const aimed = Math.random() < tuning.aimedHazards;
        const x = aimed ? s.pos.x + (Math.random() - 0.5) * 2 : (Math.random() * 2 - 1) * bx * 1.25;
        const y = aimed ? s.pos.y + (Math.random() - 0.5) * 2 : (Math.random() * 2 - 1) * BY * 1.3;
        a.p.set(x, y, SPAWN_Z - Math.random() * 20);
        a.s = 0.8 + Math.random() * (1.0 + route.difficulty * 0.3);
        a.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        a.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2);
      }

      s.acc.orb += tuning.orbRate * dt;
      if (s.acc.orb >= 6) {
        s.acc.orb -= 6;
        const x0 = (Math.random() * 2 - 1) * bx * 0.85;
        const y0 = (Math.random() * 2 - 1) * BY * 0.85;
        const x1 = THREE.MathUtils.clamp(x0 + (Math.random() * 2 - 1) * 5, -bx, bx);
        const y1 = THREE.MathUtils.clamp(y0 + (Math.random() * 2 - 1) * 3, -BY, BY);
        const wave = Math.random() < 0.5;
        for (let i = 0; i < 7; i++) {
          const o = spawnFrom(s.orbList);
          if (!o) break;
          const t = i / 6;
          o.active = true;
          o.p.set(
            THREE.MathUtils.lerp(x0, x1, t) + (wave ? Math.sin(t * Math.PI * 2) * 1.2 : 0),
            THREE.MathUtils.lerp(y0, y1, t),
            SPAWN_Z - i * 3.2
          );
          o.s = 1;
          s.spawned += 1;
        }
      }

      s.acc.ring += dt;
      if (s.acc.ring >= 5) {
        s.acc.ring = Math.random() * 1.5;
        const r = spawnFrom(s.ringList);
        if (r) {
          r.active = true;
          r.p.set((Math.random() * 2 - 1) * bx * 0.7, (Math.random() * 2 - 1) * BY * 0.7, SPAWN_Z);
          r.s = 0;
          s.spawned += 3;
        }
      }

      s.acc.shield += tuning.shieldRate * dt;
      if (s.acc.shield >= 1) {
        s.acc.shield = 0;
        const sh = spawnFrom(s.shieldList);
        if (sh) {
          sh.active = true;
          sh.p.set((Math.random() * 2 - 1) * bx * 0.8, (Math.random() * 2 - 1) * BY * 0.8, SPAWN_Z);
        }
      }
    }

    const dz = speedRef.current * dt;
    const hitCenter = tmp.a.set(s.pos.x, s.pos.y, s.pos.z - 0.4);
    const alive = !s.crashed && !s.finished;
    const mult = () => 1 + Math.min(4, Math.floor(s.combo / 6));

    // ---------- Asteroides ----------
    if (asteroidMeshes.current.every(Boolean)) {
      const idx = [0, 0, 0];
      for (let ai = 0; ai < s.asteroids.length; ai++) {
        const a = s.asteroids[ai];
        if (!a.active) continue;
        a.p.z += dz;
        a.rot.x += a.spin.x * dt;
        a.rot.y += a.spin.y * dt;
        a.rot.z += a.spin.z * dt;
        if (a.p.z > 12) {
          a.active = false;
          continue;
        }
        if (alive && s.invuln <= 0 && Math.abs(a.p.z - hitCenter.z) < a.s + 1 && a.p.distanceTo(hitCenter) < a.s * 0.85 + 0.45) {
          a.active = false;
          fx.current?.burst(a.p, 40, 9, colors.rock, { size: 0.7, life: 0.9, drag: 1.2, grow: 1 });
          fx.current?.burst(a.p, 25, 12, colors.fire, { size: 0.5, life: 0.5, drag: 2 });
          if (s.shield) {
            s.shield = false;
            s.invuln = 0.6;
            s.shake = 0.25;
            onEvent({ type: 'shieldBreak' });
          } else {
            s.hull -= 1;
            s.hits += 1;
            s.combo = 0;
            s.invuln = 1.3;
            s.shake = 0.7;
            s.chroma = 1;
            if (s.hull <= 0) {
              s.crashed = true;
              s.endTimer = 2.2;
              fx.current?.burst(s.pos, 260, 18, colors.fire, { size: 1.4, life: 1.4, drag: 1.2, grow: 2.5 });
              fx.current?.burst(s.pos, 120, 26, colors.white, { size: 0.6, life: 0.7, drag: 1.5 });
              onEvent({ type: 'crash' });
            } else onEvent({ type: 'hit' });
          }
          continue;
        }
        dummy.position.copy(a.p);
        dummy.rotation.copy(a.rot);
        // Surge crescendo lá longe (sem névoa, que deixava silhuetas pretas).
        dummy.scale.setScalar(a.s * THREE.MathUtils.smoothstep(a.p.z, SPAWN_Z - 25, SPAWN_Z + 70));
        dummy.updateMatrix();
        const k = ai % ROCK_SHAPES;
        asteroidMeshes.current[k]!.setMatrixAt(idx[k]++, dummy.matrix);
      }
      asteroidMeshes.current.forEach((m, k) => {
        m!.count = idx[k];
        m!.instanceMatrix.needsUpdate = true;
      });
    }

    // ---------- Orbes ----------
    if (orbMesh.current) {
      let idx = 0;
      const reach = 0.95 * tuning.magnet;
      for (const o of s.orbList) {
        if (!o.active) continue;
        o.p.z += dz;
        // Ímã: orbes próximos deslizam até a nave.
        if (alive && Math.abs(o.p.z - s.pos.z) < 3) {
          tmp.b.set(s.pos.x - o.p.x, s.pos.y - o.p.y, 0);
          const d = tmp.b.length();
          if (d < reach * 2.2) o.p.addScaledVector(tmp.b, Math.min(1, dt * 10 * tuning.magnet));
        }
        if (alive && Math.abs(o.p.z - s.pos.z) < 1.2 && Math.hypot(o.p.x - s.pos.x, o.p.y - s.pos.y) < reach) {
          o.active = false;
          s.combo += 1;
          s.orbs += 1;
          s.points += mult();
          fx.current?.burst(o.p, 12, 5, colors.gold, { size: 0.35, life: 0.45, drag: 3 });
          onEvent({ type: 'pickup', combo: s.combo });
          continue;
        }
        if (o.p.z > s.pos.z + 1) {
          o.active = false;
          if (alive) s.combo = 0;
          continue;
        }
        dummy.position.copy(o.p);
        dummy.rotation.set(s.t * 2 + o.p.x, s.t * 3, 0);
        dummy.scale.setScalar(0.42 + Math.sin(s.t * 8 + o.p.z) * 0.05);
        dummy.updateMatrix();
        orbMesh.current.setMatrixAt(idx++, dummy.matrix);
      }
      orbMesh.current.count = idx;
      orbMesh.current.instanceMatrix.needsUpdate = true;
    }

    // ---------- Anéis de impulso ----------
    s.ringList.forEach((r, i) => {
      const mesh = ringMeshes.current[i];
      if (!mesh) return;
      mesh.visible = r.active;
      if (!r.active) return;
      const before = r.p.z;
      r.p.z += dz;
      if (alive && before < s.pos.z && r.p.z >= s.pos.z && r.s === 0) {
        r.s = 1;
        if (Math.hypot(r.p.x - s.pos.x, r.p.y - s.pos.y) < 1.7) {
          s.rings += 1;
          s.points += 3 * mult();
          s.boost = 1.6;
          s.roll = Math.PI * 2;
          fx.current?.burst(r.p, 50, 10, colors.magenta, { size: 0.5, life: 0.6, drag: 2 });
          onEvent({ type: 'ring' });
        }
      }
      if (r.p.z > 10) r.active = false;
      mesh.position.copy(r.p);
      mesh.rotation.z = s.t * 1.5;
    });

    // ---------- Escudos ----------
    s.shieldList.forEach((sh, i) => {
      const mesh = shieldPickups.current[i];
      if (!mesh) return;
      mesh.visible = sh.active;
      if (!sh.active) return;
      sh.p.z += dz;
      if (alive && Math.abs(sh.p.z - s.pos.z) < 1.3 && Math.hypot(sh.p.x - s.pos.x, sh.p.y - s.pos.y) < 1.2) {
        sh.active = false;
        s.shield = true;
        fx.current?.burst(sh.p, 40, 8, colors.cyan, { size: 0.5, life: 0.6, drag: 2 });
        onEvent({ type: 'shield' });
      }
      if (sh.p.z > 10) sh.active = false;
      mesh.position.copy(sh.p);
      mesh.rotation.set(s.t, s.t * 1.3, 0);
    });

    // ---------- Nave ----------
    s.invuln = Math.max(0, s.invuln - dt);
    s.roll = Math.max(0, s.roll - dt * 11);
    if (rocketGroup.current) {
      rocketGroup.current.visible = !s.crashed && (s.invuln <= 0 || Math.floor(s.t * 14) % 2 === 0 || s.invuln > 1.2);
      rocketGroup.current.position.copy(s.pos);
      if (s.finished) rocketGroup.current.position.z -= (2.5 - s.endTimer) * 6;
      rocketGroup.current.rotation.z = THREE.MathUtils.lerp(rocketGroup.current.rotation.z, -s.vel.x * 0.07 + s.roll, 1 - Math.exp(-10 * dt));
    }
    if (rocketInner.current) {
      rocketInner.current.rotation.x = -Math.PI / 2 + THREE.MathUtils.clamp(s.vel.y * 0.035, -0.4, 0.4);
    }
    if (shieldMesh.current) {
      shieldMesh.current.visible = s.shield && !s.crashed;
      shieldMesh.current.position.copy(s.pos).z -= 0.3;
      shieldMesh.current.rotation.y = s.t;
      (shieldMesh.current.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.sin(s.t * 6) * 0.05;
    }
    thrust.current = s.crashed ? 0 : s.boost > 0 ? 1.6 : 0.85;

    // Exaustão
    if (!s.crashed && nozzle.current && fx.current) {
      const p = nozzle.current.getWorldPosition(tmp.b);
      const n = s.boost > 0 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        fx.current.emit(
          p,
          tmp.a.set((Math.random() - 0.5) * 1.5 - s.vel.x * 0.3, (Math.random() - 0.5) * 1.5 - s.vel.y * 0.3, 16 + Math.random() * 8),
          trailColor.current,
          { size: 0.55, life: 0.35, drag: 0.5, grow: 1.4 }
        );
      }
    }

    skyZoom.current = s.progress;

    // ---------- Destino ----------
    if (planetGroup.current) {
      // Na chegada o planeta avança sobre a câmera.
      const approach = s.finished ? Math.min(2.5, 2.5 - s.endTimer) * 45 : 0;
      planetGroup.current.position.set(0, -38 + s.progress * 18 - approach * 0.15, THREE.MathUtils.lerp(-1100, -230, Math.pow(s.progress, 1.6)) + approach);
    }

    // ---------- Câmera ----------
    s.shake = Math.max(0, s.shake - dt * 1.6);
    s.chroma = Math.max(0, s.chroma - dt * 2.2);
    const sh = s.shake * s.shake;
    const camTarget = tmp.a.set(s.pos.x * 0.7 + (Math.random() - 0.5) * sh, s.pos.y * 0.65 + 1.7 + (Math.random() - 0.5) * sh, 5.4 + (s.boost > 0 ? 1.0 : 0));
    camera.position.lerp(camTarget, 1 - Math.exp(-5 * dt));
    camera.lookAt(s.pos.x * 0.85, s.pos.y * 0.8 + 0.2, -12);
    const fov = baseFov + (s.boost > 0 ? 14 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 1 - Math.exp(-4 * dt));
    camera.updateProjectionMatrix();
    chroma.offset.set(s.chroma * 0.012, s.chroma * 0.006);

    // ---------- Fim ----------
    if (!s.finished && !s.crashed && s.progress >= 1 && s.asteroids.every(a => !a.active || a.p.z > 0)) {
      s.finished = true;
      s.endTimer = 2.5;
      onEvent({ type: 'arrive' });
    }
    if (s.finished || s.crashed) {
      s.endTimer -= dt;
      if (s.endTimer <= 0 && s.endTimer > -1) {
        s.endTimer = -5;
        onDone({
          crashed: s.crashed,
          orbs: s.orbs,
          rings: s.rings,
          hits: s.hits,
          hullLeft: Math.max(0, s.hull),
          hullMax: tuning.hull,
          points: s.points,
          spawnedPoints: s.spawned,
          progress: s.progress,
        });
      }
    }

    s.hudTimer -= dt;
    if (s.hudTimer <= 0) {
      s.hudTimer = 0.08;
      onHud({
        progress: s.progress,
        hull: Math.max(0, s.hull),
        hullMax: tuning.hull,
        shield: s.shield,
        points: s.points,
        combo: s.combo,
        orbs: s.orbs,
        rings: s.rings,
        boost: s.boost > 0,
      });
    }
  });

  return (
    <>
      <SkyBackground zoomRef={skyZoom} drift={2} dim={0.55} />
      <fog attach="fog" args={['#05050f', 110, 200]} />
      <hemisphereLight args={['#b8c8ff', '#2a1a10', 0.6]} />
      <directionalLight position={[8, 10, 6]} intensity={2.4} color="#fff3e0" />
      <directionalLight position={[-10, -4, -8]} intensity={0.6} color="#6a8cff" />
      <StudioEnvironment />
      <Stars radius={300} depth={80} count={6000} factor={6} saturation={0.3} fade speed={0.6} />
      <SpeedStreaks speedRef={speedRef} />
      <DeepField speedRef={speedRef} kind={route.destination} count={route.destination === 'ceres' ? 110 : 60} />
      <DriftingSatellite speedRef={speedRef} />

      <group ref={planetGroup}>
        <Planet kind={route.destination} radius={70} spin={0.03} tilt={0.2} fog={false} />
      </group>

      <group ref={rocketGroup}>
        <group ref={rocketInner} scale={0.55}>
          <Rocket {...look} thrustRef={thrust} nozzleRef={nozzle} trailColorRef={trailColor} />
        </group>
      </group>
      <mesh ref={shieldMesh}>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshStandardMaterial color="#5ff3ff" emissive="#22c8ff" emissiveIntensity={1.5} transparent opacity={0.2} wireframe toneMapped={false} />
      </mesh>

      {rockGeos.map((g, k) => (
        <instancedMesh key={k} ref={el => (asteroidMeshes.current[k] = el)} args={[g, undefined, Math.ceil(MAX_ASTEROIDS / ROCK_SHAPES)]} frustumCulled={false}>
          <meshStandardMaterial color={ROCK_TINT[route.destination]} roughness={0.9} metalness={0.05} vertexColors flatShading emissive="#3a1a0a" emissiveIntensity={0.3} fog={false} />
        </instancedMesh>
      ))}
      <instancedMesh ref={orbMesh} args={[undefined, undefined, MAX_ORBS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffd35a" emissive="#ffb020" emissiveIntensity={1.8} toneMapped={false} metalness={0.6} roughness={0.2} />
      </instancedMesh>

      {Array.from({ length: MAX_RINGS }, (_, i) => (
        <group key={i} ref={el => (ringMeshes.current[i] = el)} visible={false}>
          <mesh>
            <torusGeometry args={[1.7, 0.09, 16, 64]} />
            <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[1.95, 0.03, 8, 64]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: MAX_SHIELDS }, (_, i) => (
        <group key={i} ref={el => (shieldPickups.current[i] = el)} visible={false}>
          <mesh>
            <icosahedronGeometry args={[0.55, 1]} />
            <meshStandardMaterial color="#5ff3ff" emissive="#22c8ff" emissiveIntensity={2.5} wireframe toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#bff9ff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      <Particles ref={fx} capacity={3000} />

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.75} luminanceSmoothing={0.2} radius={0.7} />
        <primitive object={chroma} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
