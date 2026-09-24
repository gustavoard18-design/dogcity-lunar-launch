import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import type { LaunchOutcome, LaunchSummary, PlayerProfile, Route } from '../types';
import { computeOutcome } from '../lib/scoring';
import { cutoutArt } from '../lib/evolution';
import { gaugeQuality, getGameTuning, isPerfect } from '../lib/stats';
import { getLook } from '../lib/shop';
import { engineSound, sfx } from '../lib/audio';
import { music } from '../lib/music';
import PadScene, { AimState, PadPhase } from './PadScene';
import FlightWorld, { FlightEvent, FlightHud, FlightInput } from './FlightWorld';
import type { FlightResult } from '../lib/scoring';
import ResultScreen from './ResultScreen';
import { titleText } from '../lib/achievements';
import { FLIGHT_TIP_TEXT, FLIGHT_TIP_TIMELINE, FlightTip, TUTORIAL_GAUGE_SLOWDOWN, isTutorialPending, markTutorialDone } from '../lib/tutorial';
import GameIcon, { Difficulty, EjectIcon, HeartIcon, PLANET_ICON, Stardust } from '../components/GameIcon';
import { L } from '../lib/i18n';

type Phase = PadPhase | 'flight' | 'result';

interface LaunchGameProps {
  route: Route;
  profile: PlayerProfile;
  paidCost: number;
  summary: LaunchSummary | null;
  canRetry: boolean;
  onFinish(outcome: LaunchOutcome): void;
  onCancel(): void;
  onExit(): void;
  onRetry(): void;
}

const ANGLE_MIN = 15;
const ANGLE_MAX = 80;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function qualityLabel(q: number, perfect: boolean) {
  if (perfect) return { text: L({ en: 'PERFECT!', pt: 'PERFEITO!', es: '¡PERFECTO!' }), cls: 'text-yellow-300' };
  if (q >= 0.9) return { text: L({ en: 'GREAT', pt: 'ÓTIMO', es: 'GENIAL' }), cls: 'text-emerald-300' };
  if (q >= 0.7) return { text: L({ en: 'GOOD', pt: 'BOM', es: 'BIEN' }), cls: 'text-sky-300' };
  if (q >= 0.4) return { text: 'OK', cls: 'text-slate-300' };
  return { text: L({ en: 'WEAK', pt: 'FRACO', es: 'DÉBIL' }), cls: 'text-red-400' };
}

export default function LaunchGame({ route, profile, paidCost, summary, canRetry, onFinish, onCancel, onExit, onRetry }: LaunchGameProps) {
  const tuning = useMemo(() => getGameTuning(profile.dog, route), [profile.dog, route]);
  const look = useMemo(() => getLook(profile.dog), [profile.dog]);

  const [phase, setPhase] = useState<Phase>('brief');
  const phaseRef = useRef<PadPhase>('brief');
  const powerTarget = useRef(rand(62, 90));
  const aimRef = useRef<AimState>({ angle: 45, power: 0, targetAngle: rand(30, 70), angleHalf: tuning.angleHalfZone });
  const [locks, setLocks] = useState<{ angleQ?: number; powerQ?: number; perfect?: boolean }>({});
  const [popup, setPopup] = useState<{ text: string; cls: string; key: number } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [hud, setHud] = useState<FlightHud | null>(null);
  const [hitFlash, setHitFlash] = useState(0);
  const [showHelp, setShowHelp] = useState(true);
  // Tutorial do primeiro voo (dicas passo a passo e medidores mais lentos).
  const [tutorial, setTutorial] = useState(() => isTutorialPending(profile));
  const [flightTip, setFlightTip] = useState<FlightTip | null>(null);
  const tipsSeen = useRef(new Set<FlightTip>());
  const skipTutorial = useCallback(() => {
    markTutorialDone(profile.address);
    setTutorial(false);
    setFlightTip(null);
  }, [profile.address]);
  const inputRef = useRef<FlightInput>({ pointerX: 0, pointerY: 0, pointerActive: false, keys: { up: false, down: false, left: false, right: false } });
  const abortRef = useRef(false);
  const launchRef = useRef({ quality: 0, perfect: false });

  const needleRef = useRef<SVGGElement>(null);
  const angleText = useRef<HTMLSpanElement>(null);
  const powerFill = useRef<HTMLDivElement>(null);
  const powerText = useRef<HTMLSpanElement>(null);

  const go = useCallback((p: Phase) => {
    if (p !== 'flight' && p !== 'result') phaseRef.current = p;
    setPhase(p);
  }, []);

  // Medidores oscilantes (animados direto no DOM, sem re-render a cada frame).
  useEffect(() => {
    if (phase !== 'angle' && phase !== 'power') return;
    let raf = 0;
    let last = performance.now();
    let t = Math.random();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      t += dt * tuning.gaugeSpeed * (phase === 'power' ? 1.35 : 1) * (tutorial ? TUTORIAL_GAUGE_SLOWDOWN : 1);
      const wave = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      if (phase === 'angle') {
        const a = ANGLE_MIN + (ANGLE_MAX - ANGLE_MIN) * wave;
        aimRef.current.angle = a;
        if (needleRef.current) needleRef.current.setAttribute('transform', `rotate(${-a} 20 180)`);
        if (angleText.current) angleText.current.textContent = `${Math.round(a)}°`;
      } else {
        const p = 100 * wave;
        aimRef.current.power = p;
        if (powerFill.current) powerFill.current.style.height = `${p}%`;
        if (powerText.current) powerText.current.textContent = `${Math.round(p)}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, tuning.gaugeSpeed, tutorial]);

  const showPopup = (q: number, perfect: boolean) => {
    const l = qualityLabel(q, perfect);
    setPopup({ ...l, key: Date.now() });
  };

  const act = useCallback(() => {
    sfx.unlock();
    if (phase === 'brief') {
      sfx.click();
      go('angle');
    } else if (phase === 'angle') {
      const a = aimRef.current;
      const q = gaugeQuality(a.angle, a.targetAngle, a.angleHalf);
      const perfect = isPerfect(a.angle, a.targetAngle, a.angleHalf);
      sfx.lock(perfect ? 1 : q);
      showPopup(q, perfect);
      setLocks(l => ({ ...l, angleQ: q, perfect }));
      go('power');
    } else if (phase === 'power') {
      const p = aimRef.current.power;
      const q = gaugeQuality(p, powerTarget.current, tuning.powerHalfZone);
      const perfectPower = isPerfect(p, powerTarget.current, tuning.powerHalfZone);
      const angleQ = locks.angleQ ?? 0;
      const perfect = !!locks.perfect && perfectPower;
      launchRef.current = { quality: (angleQ + q) / 2, perfect };
      if (perfect) sfx.perfect();
      else sfx.lock(perfectPower ? 1 : q);
      showPopup(perfect ? 1 : q, perfect || perfectPower);
      setLocks(l => ({ ...l, powerQ: q, perfect }));
      go('countdown');
    }
  }, [phase, go, locks, tuning.powerHalfZone]);

  // Contagem regressiva → decolagem
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timers: number[] = [];
    [3, 2, 1].forEach((n, i) =>
      timers.push(
        window.setTimeout(() => {
          setCount(n);
          sfx.countdown();
        }, 700 + i * 800)
      )
    );
    timers.push(
      window.setTimeout(() => {
        setCount(0);
        sfx.countdown(true);
        sfx.liftoff();
        engineSound.start();
        // Fora de `timers`: a mudança de fase abaixo limpa este efeito.
        window.setTimeout(() => setCount(null), 900);
        go('liftoff');
      }, 700 + 3 * 800)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, go]);

  const onLiftoffDone = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => go('flight'), 250);
    window.setTimeout(() => setFlash(false), 700);
  }, [go]);

  useEffect(() => {
    if (phase !== 'flight') return;
    const t = window.setTimeout(() => setShowHelp(false), 4500);
    return () => clearTimeout(t);
  }, [phase]);

  // Tutorial: dicas do voo em sequência; ao terminar o primeiro voo, não aparece mais.
  const showTip = useCallback((tip: FlightTip) => {
    if (tipsSeen.current.has(tip)) return;
    tipsSeen.current.add(tip);
    setFlightTip(tip);
  }, []);
  useEffect(() => {
    if (!tutorial) return;
    if (phase === 'result') {
      markTutorialDone(profile.address);
      setFlightTip(null);
      return;
    }
    if (phase !== 'flight') return;
    const timers = FLIGHT_TIP_TIMELINE.map(([s, tip]) => window.setTimeout(() => showTip(tip), s * 1000));
    timers.push(window.setTimeout(() => setFlightTip(null), 24000));
    return () => timers.forEach(clearTimeout);
  }, [phase, tutorial, profile.address, showTip]);

  useEffect(() => () => engineSound.stop(), []);

  // Trilha: tensão na base, ritmo de voo (tom do planeta, andamento da dificuldade), calma no resultado.
  useEffect(() => {
    if (phase === 'liftoff' || phase === 'flight') music.play('flight', route.destination, route.difficulty);
    else if (phase === 'result') music.play('hangar');
    else music.play('pad');
  }, [phase, route.destination, route.difficulty]);

  const comboTipRef = useRef<() => void>();
  const hitTipRef = useRef<() => void>();
  comboTipRef.current = tutorial ? () => showTip('combo') : undefined;
  hitTipRef.current = tutorial ? () => showTip('hit') : undefined;

  const onEvent = useCallback((e: FlightEvent) => {
    switch (e.type) {
      case 'pickup': sfx.pickup(e.combo); if (e.combo === 6) comboTipRef.current?.(); break;
      case 'ring': sfx.ring(); engineSound.set(1.2); window.setTimeout(() => engineSound.set(0.6), 1600); break;
      case 'shield': sfx.shield(); break;
      case 'shieldBreak': sfx.shieldBreak(); break;
      case 'hit': sfx.hit(); setHitFlash(Date.now()); hitTipRef.current?.(); break;
      case 'crash': sfx.explosion(); engineSound.stop(); setHitFlash(Date.now()); break;
      case 'arrive': sfx.success(); engineSound.stop(); break;
    }
  }, []);

  const onDone = useCallback(
    (r: FlightResult) => {
      const outcome = computeOutcome(route, launchRef.current.quality, launchRef.current.perfect, r, abortRef.current);
      if (!outcome.success && !outcome.aborted) sfx.fail();
      onFinish(outcome);
      go('result');
    },
    [route, onFinish, go]
  );

  // Teclado
  useEffect(() => {
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = inputRef.current.keys;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': k.up = v; break;
        case 'ArrowDown': case 's': case 'S': k.down = v; break;
        case 'ArrowLeft': case 'a': case 'A': k.left = v; break;
        case 'ArrowRight': case 'd': case 'D': k.right = v; break;
        default: return false;
      }
      return true;
    };
    const down = (e: KeyboardEvent) => {
      if (set(e, true)) e.preventDefault();
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        // Evita o clique nativo do botão em foco somar uma segunda ação.
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (!e.repeat) act();
        return;
      }
      if (e.repeat) return;
      if (e.key === 'Escape' && (phase === 'brief' || phase === 'angle' || phase === 'power')) onCancel();
    };
    const up = (e: KeyboardEvent) => void set(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [act, phase, onCancel]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'flight') return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = inputRef.current;
    i.pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
    i.pointerY = -(((e.clientY - r.top) / r.height) * 2 - 1);
    i.pointerActive = true;
  };

  const preLaunch = phase === 'brief' || phase === 'angle' || phase === 'power';
  const a = aimRef.current;
  const zoneA0 = a.targetAngle - a.angleHalf;
  const zoneA1 = a.targetAngle + a.angleHalf;
  const arc = (from: number, to: number, r: number) => {
    const p = (deg: number) => [20 + r * Math.cos((deg * Math.PI) / 180), 180 - r * Math.sin((deg * Math.PI) / 180)];
    const [x0, y0] = p(from);
    const [x1, y1] = p(to);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1}`;
  };

  return (
    <div className="fixed inset-0 bg-black select-none touch-none" onPointerMove={onPointerMove} onPointerDown={onPointerMove}>
      <Canvas dpr={[1, 2]} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.1, far: 3000, position: [-8, 2, 12] }}>
        <Suspense fallback={null}>
        {phase === 'flight' || phase === 'result' ? (
          <FlightWorld
            route={route}
            tuning={tuning}
            look={look}
            startShield={launchRef.current.perfect}
            inputRef={inputRef}
            abortRef={abortRef}
            onHud={setHud}
            onEvent={onEvent}
            onDone={onDone}
          />
        ) : (
          <PadScene route={route} look={look} phaseRef={phaseRef} aimRef={aimRef} onLiftoffDone={onLiftoffDone} />
        )}
        </Suspense>
      </Canvas>

      {/* Flash de transição e de dano */}
      <AnimatePresence>
        {flash && <motion.div key="flash" className="absolute inset-0 bg-white pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.45 } }} transition={{ duration: 0.2 }} />}
      </AnimatePresence>
      {hitFlash > 0 && (
        <motion.div
          key={hitFlash}
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 180px 40px rgba(255,40,40,0.75)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Topo: rota */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-start justify-between gap-3 pointer-events-none">
        <div className="hud-panel px-4 py-3">
          <div className="font-display text-sm sm:text-base text-white tracking-wider">
            <GameIcon name={PLANET_ICON[route.destination]} size={26} className="mr-2 -my-1" />
            {route.name.toUpperCase()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {paidCost === 0 ? L({ en: 'Free training', pt: 'Treino gratuito', es: 'Entrenamiento gratis' }) : <>{L({ en: 'Cost', pt: 'Custo', es: 'Coste' })} <Stardust value={paidCost} size="1em" /></>} · {L({ en: 'Max', pt: 'Máx', es: 'Máx' })} {route.maxScore} pts · <Difficulty level={route.difficulty} size={10} />
          </div>
        </div>
        {preLaunch && (
          <button onClick={onCancel} className="pointer-events-auto hud-panel px-4 py-2 text-xs text-slate-300 hover:text-white">
            ✕ {L({ en: 'Cancel', pt: 'Cancelar', es: 'Cancelar' })} <span className="text-slate-500">({L({ en: 'refund', pt: 'reembolsa', es: 'reembolso' })})</span>
          </button>
        )}
        {phase === 'flight' && hud && !abortRef.current && (
          <button
            onClick={() => {
              abortRef.current = true;
            }}
            className="pointer-events-auto hud-panel px-4 py-2 text-xs text-red-300 hover:text-red-200"
          >
            <span className="inline-flex items-center gap-1.5"><EjectIcon /> {L({ en: 'Abort', pt: 'Abortar', es: 'Abortar' })}</span>
          </button>
        )}
      </div>

      {/* Briefing */}
      <AnimatePresence>
        {phase === 'brief' && (
          <motion.div
            key="brief"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute inset-x-0 bottom-0 p-4 sm:p-8 flex items-end justify-center gap-2"
          >
            {/* Astronauta ao lado do painel (nunca por cima do texto) */}
            <img
              src={cutoutArt('astronaut')}
              alt=""
              draggable={false}
              className="hidden md:block h-72 w-auto shrink-0 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.6)] pointer-events-none"
            />
            <div className="hud-panel relative max-w-xl w-full p-5 sm:p-6">
              <div className="font-display text-xl sm:text-2xl text-white mb-3">{L({ en: 'Mission briefing', pt: 'Briefing da missão', es: 'Informe de la misión' })}</div>
              <ol className="space-y-2 text-sm text-slate-300 mb-5">
                <li>
                  <b className="text-emerald-300">1. {L({ en: 'Aim', pt: 'Mira', es: 'Puntería' })}</b> —{' '}
                  {L({ en: 'lock the needle inside the green band, pointing at the planet.', pt: 'trave o ponteiro dentro da faixa verde, apontando para o planeta.', es: 'fija la aguja dentro de la franja verde, apuntando al planeta.' })}
                </li>
                <li>
                  <b className="text-amber-300">2. {L({ en: 'Power', pt: 'Força', es: 'Fuerza' })}</b> — {L({ en: 'lock the bar in the golden zone.', pt: 'trave a barra na zona dourada.', es: 'fija la barra en la zona dorada.' })}
                </li>
                <li>
                  <b className="text-sky-300">3. {L({ en: 'Flight', pt: 'Voo', es: 'Vuelo' })}</b> —{' '}
                  {L({ en: 'steer with mouse/touch or WASD/arrows. Grab orbs', pt: 'pilote com mouse/toque ou WASD/setas. Pegue orbes', es: 'pilota con ratón/táctil o WASD/flechas. Atrapa orbes' })} <GameIcon name="orb" size="1.2em" />,{' '}
                  {L({ en: 'fly through rings', pt: 'atravesse anéis', es: 'atraviesa anillos' })} <GameIcon name="ring" size="1.2em" />,{' '}
                  {L({ en: 'dodge asteroids', pt: 'desvie de asteroides', es: 'esquiva asteroides' })} <GameIcon name="asteroid" size="1.2em" />.
                </li>
              </ol>
              <p className="text-xs text-slate-500 mb-4">
                {L({ en: 'Perfect aim and power give you a starting shield.', pt: 'Mira e força perfeitas dão um escudo inicial.', es: 'Puntería y fuerza perfectas dan un escudo inicial.' })}{' '}
                {L({ en: 'Hull', pt: 'Casco', es: 'Casco' })}: {tuning.hull} <HeartIcon size={12} /> ·{' '}
                {L({ en: 'Space/Enter/click to lock.', pt: 'Espaço/Enter/clique para travar.', es: 'Espacio/Enter/clic para fijar.' })}
              </p>
              <button onClick={act} className="btn-primary w-full py-4 text-lg">
                {L({ en: 'Start sequence ▶', pt: 'Iniciar sequência ▶', es: 'Iniciar secuencia ▶' })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medidores */}
      {(phase === 'angle' || phase === 'power') && (
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6 flex items-end justify-between gap-3 pointer-events-none">
          <div className={`hud-panel p-3 sm:p-4 transition-opacity pointer-events-auto ${phase === 'angle' ? '' : 'opacity-60'}`}>
            <div className="text-[11px] tracking-widest text-slate-400 mb-1 flex justify-between">
              <span>{L({ en: 'ANGLE', pt: 'ÂNGULO', es: 'ÁNGULO' })}</span>
              <span ref={angleText} className="font-display text-white">
                {Math.round(a.angle)}°
              </span>
            </div>
            <svg viewBox="0 0 200 200" className="w-32 h-32 sm:w-44 sm:h-44">
              <path d={arc(ANGLE_MIN, ANGLE_MAX, 150)} stroke="rgba(148,163,184,0.25)" strokeWidth="18" fill="none" strokeLinecap="round" />
              <path d={arc(Math.max(ANGLE_MIN, zoneA0 - a.angleHalf * 2), Math.min(ANGLE_MAX, zoneA1 + a.angleHalf * 2), 150)} stroke="rgba(74,222,128,0.18)" strokeWidth="18" fill="none" />
              <path d={arc(zoneA0, zoneA1, 150)} stroke="#4ade80" strokeWidth="18" fill="none" />
              <path d={arc(a.targetAngle - a.angleHalf * 0.4, a.targetAngle + a.angleHalf * 0.4, 150)} stroke="#fde047" strokeWidth="18" fill="none" />
              <g ref={needleRef} transform={`rotate(${-a.angle} 20 180)`}>
                <line x1="20" y1="180" x2="182" y2="180" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <circle cx="182" cy="180" r="6" fill="white" />
              </g>
              <circle cx="20" cy="180" r="10" fill="#f97316" />
            </svg>
            {locks.angleQ !== undefined && <div className={`text-center text-xs font-bold ${qualityLabel(locks.angleQ, false).cls}`}>{Math.round(locks.angleQ * 100)}%</div>}
          </div>

          <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className={`hud-panel p-3 sm:p-4 transition-opacity ${phase === 'power' ? '' : 'opacity-40'}`}>
            <div className="text-[11px] tracking-widest text-slate-400 mb-1 flex justify-between gap-3">
              <span>{L({ en: 'POWER', pt: 'FORÇA', es: 'FUERZA' })}</span>
              <span ref={powerText} className="font-display text-white">
                0%
              </span>
            </div>
            <div className="relative w-12 h-28 sm:h-40 mx-auto rounded-xl bg-slate-800/80 overflow-hidden border border-white/10">
              <div
                className="absolute inset-x-0 bg-amber-400/25 border-y border-amber-300/70"
                style={{ bottom: `${powerTarget.current - tuning.powerHalfZone}%`, height: `${tuning.powerHalfZone * 2}%` }}
              />
              <div
                className="absolute inset-x-0 bg-yellow-300/50"
                style={{ bottom: `${powerTarget.current - tuning.powerHalfZone * 0.4}%`, height: `${tuning.powerHalfZone * 0.8}%` }}
              />
              <div ref={powerFill} className="absolute bottom-0 inset-x-2 rounded-t-md bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 opacity-90" style={{ height: '0%' }} />
            </div>
          </div>

          <button onClick={act} className="btn-primary px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-xl">
            <span className="inline-flex items-center gap-2"><GameIcon name={phase === 'angle' ? 'radar' : 'propulsores'} size={30} className="-my-2 rounded-md" /> {L({ en: 'LOCK', pt: 'TRAVAR', es: 'FIJAR' })}</span>
          </button>
          </div>
        </div>
      )}

      {/* Popup de qualidade */}
      <AnimatePresence>
        {popup && (preLaunch || phase === 'countdown') && (
          <motion.div
            key={popup.key}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            onAnimationComplete={() => window.setTimeout(() => setPopup(p => (p?.key === popup.key ? null : p)), 700)}
            className={`absolute top-[14%] sm:top-[16%] inset-x-0 text-center font-display text-4xl sm:text-6xl drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-none ${popup.cls}`}
          >
            {popup.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contagem */}
      <AnimatePresence mode="wait">
        {count !== null && (
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-display text-8xl sm:text-9xl text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.9)]"
          >
            {count === 0 ? L({ en: 'IGNITION!', pt: 'IGNIÇÃO!', es: '¡IGNICIÓN!' }) : count}
          </motion.div>
        )}
      </AnimatePresence>
      {phase === 'countdown' && locks.powerQ !== undefined && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <div className="hud-panel px-5 py-2 text-sm text-slate-200">
            {L({ en: 'Launch quality', pt: 'Qualidade do lançamento', es: 'Calidad del lanzamiento' })}: <b className="font-display text-white">{Math.round(launchRef.current.quality * 100)}%</b>
            {launchRef.current.perfect && <span className="ml-2 inline-flex items-center gap-1 text-cyan-300">+ {L({ en: 'shield', pt: 'escudo', es: 'escudo' })} <GameIcon name="escudo" size={18} /></span>}
          </div>
        </div>
      )}

      {/* HUD de voo */}
      {phase === 'flight' && hud && (
        <>
          <div className="absolute top-20 sm:top-4 left-1/2 -translate-x-1/2 w-[min(520px,70vw)] pointer-events-none">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <GameIcon name="planet-moon" size={18} />
              <span className="font-display">{Math.round(hud.progress * 100)}%</span>
              <GameIcon name={PLANET_ICON[route.destination]} size={18} />
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300" style={{ width: `${hud.progress * 100}%` }} />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 hud-panel px-4 py-3 pointer-events-none">
            <div className="text-[10px] tracking-widest text-slate-400 mb-1">{L({ en: 'HULL', pt: 'CASCO', es: 'CASCO' })}</div>
            <div className="flex gap-1 text-xl">
              {Array.from({ length: hud.hullMax }, (_, i) => (
                <HeartIcon key={i} size={22} empty={i >= hud.hull} />
              ))}
              {hud.shield && <GameIcon name="escudo" size={22} className="ml-1 animate-pulse" />}
            </div>
          </div>
          <div className="absolute bottom-4 right-4 hud-panel px-4 py-3 text-right pointer-events-none">
            <div className="text-[10px] tracking-widest text-slate-400">{L({ en: 'POINTS', pt: 'PONTOS', es: 'PUNTOS' })}</div>
            <div className="font-display text-3xl text-amber-300 leading-none">{hud.points}</div>
            <div className="text-xs text-slate-300 mt-1">
              <span className="inline-flex items-center gap-1"><GameIcon name="orb" size={16} />{hud.orbs}</span> · <span className="inline-flex items-center gap-1"><GameIcon name="ring" size={16} />{hud.rings}</span>
              {hud.combo >= 6 && <span className="ml-2 font-display text-fuchsia-300">x{1 + Math.min(4, Math.floor(hud.combo / 6))}</span>}
            </div>
          </div>
          {hud.boost && (
            <div className="absolute top-1/4 inset-x-0 text-center font-display text-3xl text-fuchsia-300 drop-shadow-[0_0_20px_rgba(255,79,216,0.8)] pointer-events-none animate-pulse">
              BOOST!
            </div>
          )}
          <AnimatePresence>
            {showHelp && !tutorial && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-none"
              >
                <div className="hud-panel px-5 py-2 text-sm text-slate-200">{L({ en: 'Move the mouse or drag your finger · keyboard: WASD or arrows', pt: 'Mova o mouse ou arraste o dedo · teclado: WASD ou setas', es: 'Mueve el ratón o arrastra el dedo · teclado: WASD o flechas' })}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Tutorial do primeiro voo */}
      {tutorial && phase === 'brief' && (
        <div className="absolute top-24 sm:top-6 inset-x-0 flex justify-center px-4 pointer-events-none">
          <Coach text={L({ en: 'First flight? I\'ll guide you step by step. Tap Start sequence.', pt: 'Primeiro voo? Eu te guio passo a passo. Toque em Iniciar sequência.', es: '¿Primer vuelo? Te guío paso a paso. Toca Iniciar secuencia.' })} onSkip={skipTutorial} />
        </div>
      )}
      {tutorial && phase === 'angle' && (
        <div className="absolute left-3 sm:left-6 bottom-[205px] sm:bottom-[275px] max-w-[min(15.5rem,calc(100vw-1.5rem))] sm:max-w-[20rem]">
          <Coach arrow="left" text={L({ en: 'The needle swings up and down. Tap LOCK when it crosses the GREEN band (yellow is perfect).', pt: 'O ponteiro sobe e desce. Toque em TRAVAR quando ele passar pela faixa VERDE (a amarela é perfeita).', es: 'La aguja sube y baja. Toca FIJAR cuando pase por la franja VERDE (la amarilla es perfecta).' })} onSkip={skipTutorial} />
        </div>
      )}
      {tutorial && phase === 'power' && (
        <div className="absolute right-3 sm:right-6 bottom-[290px] sm:bottom-[360px] max-w-[min(15.5rem,calc(100vw-1.5rem))] sm:max-w-[20rem]">
          <Coach arrow="right" text={L({ en: 'Now the power: lock it when the bar is in the GOLDEN zone.', pt: 'Agora a força: trave quando a barra estiver na zona DOURADA.', es: 'Ahora la fuerza: fíjala cuando la barra esté en la zona DORADA.' })} onSkip={skipTutorial} />
        </div>
      )}
      {tutorial && phase === 'countdown' && (
        <div className="absolute bottom-20 inset-x-0 flex justify-center px-4">
          <Coach text={L({ en: 'Good aim and power make a better flight. Perfect on both earns a shield!', pt: 'Mira e força boas dão um voo melhor. Perfeito nos dois ganha um escudo!', es: 'Buena puntería y fuerza dan un mejor vuelo. ¡Perfecto en ambos gana un escudo!' })} onSkip={skipTutorial} />
        </div>
      )}
      <AnimatePresence>
        {tutorial && phase === 'flight' && flightTip && (
          <motion.div
            key={flightTip}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-36 sm:top-20 inset-x-0 flex justify-center px-4"
          >
            <Coach text={FLIGHT_TIP_TEXT[flightTip]} onSkip={skipTutorial} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'result' && summary && (
        <ResultScreen route={route} summary={summary} pilotName={profile.dog.name} pilotTitle={titleText(profile.title) || undefined} pilotStyle={profile.nameStyle} canRetry={canRetry} onRetry={onRetry} onExit={onExit} />
      )}
    </div>
  );
}

/** Balão de dica do tutorial, com o DOG e o botão de pular. */
function Coach({ text, arrow, onSkip }: { text: string; arrow?: 'left' | 'right'; onSkip(): void }) {
  return (
    <div className="relative pointer-events-auto hud-panel flex items-start gap-2.5 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 max-w-md border-amber-300/60 shadow-[0_0_24px_rgba(252,211,77,0.25)]">
      <img src={`${import.meta.env.BASE_URL}dog-face.png`} alt="" draggable={false} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-amber-300/70 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.2em] text-amber-300 mb-0.5">{L({ en: 'DOG TIP', pt: 'DICA DO DOG', es: 'CONSEJO DEL DOG' })}</div>
        <p className="text-[13px] sm:text-sm text-white leading-snug">{text}</p>
        <button onClick={onSkip} className="mt-1 text-[11px] text-slate-400 hover:text-white underline underline-offset-2">
          {L({ en: 'Skip tips', pt: 'Pular dicas', es: 'Saltar consejos' })}
        </button>
      </div>
      {/* Seta apontando para o medidor logo abaixo */}
      {arrow && (
        <span className={`absolute -bottom-2 ${arrow === 'left' ? 'left-8' : 'right-8'} w-4 h-4 rotate-45 bg-[#0b1733] border-r border-b border-amber-300/60`} />
      )}
    </div>
  );
}
