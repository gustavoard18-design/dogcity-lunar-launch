import { useEffect, useRef } from 'react';
import { spaceBackgroundArt } from '../lib/evolution';

/**
 * Céu do jogo: a arte de fundo com deriva lenta e parallax do mouse, mais uma
 * camada em canvas com estrelas cintilando, estrelas cadentes e poeira.
 * Sem WebGL: leve para ficar atrás do hangar o tempo todo.
 */
export default function SpaceBackdrop() {
  const art = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const c = canvas.current!;
    const g = c.getContext('2d')!;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; r: number; phase: number; speed: number; hue: number };
    type Meteor = { x: number; y: number; vx: number; vy: number; life: number; max: number; len: number };
    type Dust = { x: number; y: number; r: number; vx: number; vy: number; a: number };
    let stars: Star[] = [];
    let dust: Dust[] = [];
    const meteors: Meteor[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 5500);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? 1.2 + Math.random() * 1.1 : 0.35 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 2.2,
        hue: [210, 230, 280, 45][Math.floor(Math.random() * 4)],
      }));
      dust = Array.from({ length: Math.round(n / 6) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.6,
        vx: -4 - Math.random() * 8,
        vy: 1 + Math.random() * 4,
        a: 0.08 + Math.random() * 0.2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnMeteor = () => {
      // Da direita para a esquerda, descendo, como os rastros da arte.
      const fromTop = Math.random() < 0.6;
      const speed = 700 + Math.random() * 600;
      const angle = Math.PI * (0.82 + Math.random() * 0.1);
      meteors.push({
        x: fromTop ? w * (0.3 + Math.random() * 0.8) : w + 20,
        y: fromTop ? -20 : h * Math.random() * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle)) * speed,
        life: 0,
        max: 0.9 + Math.random() * 0.8,
        len: 120 + Math.random() * 180,
      });
    };

    let raf = 0;
    let last = performance.now();
    let nextMeteor = 0.8;
    let mx = 0;
    let my = 0;
    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / w - 0.5;
      my = e.clientY / h - 0.5;
    };
    window.addEventListener('pointermove', onMove);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      g.clearRect(0, 0, w, h);

      // Parallax suave da arte + deriva lenta (zoom e pan em ciclo longo).
      px += (mx - px) * Math.min(1, dt * 2);
      py += (my - py) * Math.min(1, dt * 2);
      if (art.current) {
        const zoom = 1.08 + Math.sin(t * 0.05) * 0.04;
        const dx = Math.sin(t * 0.031) * 1.5 - px * 2.4;
        const dy = Math.cos(t * 0.023) * 1.2 - py * 2.4;
        art.current.style.transform = `translate3d(${dx}%, ${dy}%, 0) scale(${zoom}) rotate(${Math.sin(t * 0.02) * 0.6}deg)`;
      }

      // Poeira cósmica atravessando a tela.
      for (const d of dust) {
        d.x += (d.vx - px * 20) * dt;
        d.y += d.vy * dt;
        if (d.x < -10) d.x = w + 10;
        if (d.y > h + 10) d.y = -10;
        g.fillStyle = `rgba(190,210,255,${d.a})`;
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
      }

      // Estrelas cintilando (com leve parallax próprio).
      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        const x = s.x - px * 14 * s.r;
        const y = s.y - py * 14 * s.r;
        g.fillStyle = `hsla(${s.hue}, 90%, 88%, ${tw})`;
        g.beginPath();
        g.arc(x, y, s.r, 0, Math.PI * 2);
        g.fill();
        if (s.r > 1.2) {
          g.strokeStyle = `hsla(${s.hue}, 90%, 85%, ${tw * 0.45})`;
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(x - s.r * 4 * tw, y);
          g.lineTo(x + s.r * 4 * tw, y);
          g.moveTo(x, y - s.r * 4 * tw);
          g.lineTo(x, y + s.r * 4 * tw);
          g.stroke();
        }
      }

      // Estrelas cadentes.
      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        spawnMeteor();
        nextMeteor = 1.2 + Math.random() * 3.5;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const k = Math.sin(Math.min(1, m.life / m.max) * Math.PI);
        const sp = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / sp) * m.len;
        const ty = m.y - (m.vy / sp) * m.len;
        const grad = g.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
        grad.addColorStop(0.2, `rgba(147,197,253,${0.6 * k})`);
        grad.addColorStop(1, 'rgba(99,102,241,0)');
        g.strokeStyle = grad;
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(m.x, m.y);
        g.lineTo(tx, ty);
        g.stroke();
        if (m.life > m.max) meteors.splice(i, 1);
      }

      raf = requestAnimationFrame(frame);
    };

    if (reduce) {
      // Movimento reduzido: um único quadro estático de estrelas.
      frame(performance.now());
      cancelAnimationFrame(raf);
    } else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070a24]">
      <div
        ref={art}
        className="absolute -inset-[8%] bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url(${spaceBackgroundArt()})` }}
      />
      {/* Nebulosas "respirando" por cima da arte */}
      <div className="absolute inset-0 mix-blend-screen opacity-60 animate-[nebula-a_14s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_22%_42%,rgba(59,130,246,0.35),transparent_45%)]" />
      <div className="absolute inset-0 mix-blend-screen opacity-50 animate-[nebula-b_18s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_80%_60%,rgba(217,70,239,0.3),transparent_45%)]" />
      <canvas ref={canvas} className="absolute inset-0" />
      {/* Vinheta para destacar a interface */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,4,18,0.65))]" />
    </div>
  );
}
