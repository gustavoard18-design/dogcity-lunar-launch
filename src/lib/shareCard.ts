import type { LaunchSummary, Route } from '../types';
import { cutoutArt, spaceBackgroundArt } from './evolution';
import { iconUrl, PLANET_ICON } from '../components/GameIcon';
import { getNameFrame } from './frames';
import { L } from './i18n';

/**
 * Cartão de compartilhamento do voo (JPEG 1080×1080) desenhado em canvas com as
 * artes e as fontes do jogo. Compartilha pelo menu nativo (celular) ou baixa.
 */

export const GAME_URL = 'https://gustavoard18-design.github.io/dogcity-lunar-launch/';
const S = 1080;

export interface ShareInfo {
  route: Route;
  summary: LaunchSummary;
  pilotName: string;
  pilotTitle?: string;
  /** Id da moldura de nome escolhida (mesmo visual do perfil). */
  pilotStyle?: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  g.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
}

function contain(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / img.width, h / img.height);
  g.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, filled: boolean) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = filled ? '#fcd34d' : 'rgba(148,163,184,0.25)';
  g.fill();
}

/** Nome do piloto com o degradê, o brilho, a moldura e o selo da moldura escolhida. */
function drawPilotName(g: CanvasRenderingContext2D, name: string, styleId: string | undefined, x: number, y: number, maxW: number, font: string) {
  const frame = getNameFrame(styleId);
  const card = frame?.card;
  g.save();
  g.font = font;
  let tx = x;
  let room = maxW;
  if (card?.border) {
    tx += 18;
    room -= 36;
  }
  if (frame?.badge) {
    g.fillText(frame.badge, tx, y);
    const bw = g.measureText(frame.badge).width + 12;
    tx += bw;
    room -= bw;
  }
  const w = Math.min(g.measureText(name).width, room);
  if (card?.border) {
    roundRect(g, x, y - 46, tx + w + 18 - x, 64, 16);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fill();
    g.shadowColor = card.glow ?? 'transparent';
    g.shadowBlur = 18;
    g.strokeStyle = card.border;
    g.lineWidth = 3;
    g.stroke();
    g.shadowBlur = 0;
  }
  const colors = card?.colors ?? ['#ffffff'];
  if (colors.length > 1) {
    const grad = g.createLinearGradient(tx, 0, tx + w, 0);
    colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
    g.fillStyle = grad;
  } else {
    g.fillStyle = colors[0];
  }
  if (card?.glow) {
    g.shadowColor = card.glow;
    g.shadowBlur = 16;
  }
  g.fillText(name, tx, y, room);
  g.restore();
}

export async function renderShareCard({ route, summary, pilotName, pilotTitle, pilotStyle }: ShareInfo): Promise<Blob> {
  const { outcome } = summary;
  const [bg, dog, planet, orb, ring, shield] = await Promise.all([
    loadImage(spaceBackgroundArt()),
    loadImage(cutoutArt('astronaut')),
    loadImage(iconUrl(PLANET_ICON[route.destination])),
    loadImage(iconUrl('orb')),
    loadImage(iconUrl('ring')),
    loadImage(iconUrl('escudo')),
  ]);
  await document.fonts?.ready;

  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const display = (px: number) => `700 ${px}px Orbitron, 'Space Grotesk', sans-serif`;
  const body = (px: number, w = 500) => `${w} ${px}px 'Space Grotesk', sans-serif`;

  // Fundo: arte do céu + escurecimento para o texto
  g.fillStyle = '#070a24';
  g.fillRect(0, 0, S, S);
  if (bg) cover(g, bg, S, S);
  const shade = g.createLinearGradient(0, 0, S, 0);
  shade.addColorStop(0, 'rgba(5,8,28,0.25)');
  shade.addColorStop(0.55, 'rgba(5,8,28,0.75)');
  shade.addColorStop(1, 'rgba(5,8,28,0.9)');
  g.fillStyle = shade;
  g.fillRect(0, 0, S, S);

  // Planeta de destino e o DOG
  if (planet) {
    g.save();
    g.shadowColor = route.color;
    g.shadowBlur = 60;
    contain(g, planet, 90, 70, 300, 300);
    g.restore();
  }
  if (dog) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 40;
    g.shadowOffsetY = 20;
    if (!outcome.success) g.filter = 'grayscale(0.8) brightness(0.8)';
    contain(g, dog, 30, 300, 470, 700);
    g.restore();
  }

  // Coluna de texto
  const X = 520;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#7dd3fc';
  g.font = body(24, 600);
  g.fillText('DOGCITY · LUNAR LAUNCH', X, 110);

  g.fillStyle = '#ffffff';
  g.font = display(40);
  g.fillText(route.name.toUpperCase(), X, 170, S - X - 50);
  if (route.event) {
    g.fillStyle = route.color;
    g.font = body(22, 700);
    g.fillText(L({ en: 'EVENT OF THE WEEK', pt: 'EVENTO DA SEMANA', es: 'EVENTO DE LA SEMANA' }), X, 205);
  }

  const verdict = outcome.success
    ? L({ en: 'MISSION COMPLETE', pt: 'MISSÃO CUMPRIDA', es: 'MISIÓN CUMPLIDA' })
    : outcome.aborted
      ? L({ en: 'MISSION ABORTED', pt: 'MISSÃO ABORTADA', es: 'MISIÓN ABORTADA' })
      : L({ en: 'SHIP LOST', pt: 'NAVE PERDIDA', es: 'NAVE PERDIDA' });
  g.fillStyle = outcome.success ? '#6ee7b7' : '#fca5a5';
  g.font = display(34);
  g.fillText(verdict, X, 275, S - X - 50);

  // Placar
  g.fillStyle = '#ffffff';
  g.font = display(150);
  g.fillText(String(outcome.score), X - 6, 435, S - X - 40);
  g.fillStyle = '#94a3b8';
  g.font = body(28);
  g.fillText(L({ en: `of ${route.maxScore} pts · ${Math.round(summary.quality * 100)}%`, pt: `de ${route.maxScore} pts · ${Math.round(summary.quality * 100)}%`, es: `de ${route.maxScore} pts · ${Math.round(summary.quality * 100)}%` }), X, 480);

  const stars = !outcome.success ? 0 : summary.quality >= 0.85 ? 3 : summary.quality >= 0.6 ? 2 : 1;
  for (let i = 0; i < 3; i++) star(g, X + 30 + i * 72, 545, 28, i < stars);

  // Estatísticas do voo
  const stats: [HTMLImageElement | null, string, string][] = [
    [orb, String(outcome.orbs), L({ en: 'orbs', pt: 'orbes', es: 'orbes' })],
    [ring, String(outcome.rings), L({ en: 'rings', pt: 'anéis', es: 'anillos' })],
    [shield, `${outcome.hullLeft}/${outcome.hullMax}`, L({ en: 'hull', pt: 'casco', es: 'casco' })],
  ];
  stats.forEach(([icon, value, label], i) => {
    const bx = X + i * 170;
    roundRect(g, bx, 600, 155, 150, 22);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.fill();
    g.strokeStyle = 'rgba(125,211,252,0.25)';
    g.lineWidth = 2;
    g.stroke();
    if (icon) contain(g, icon, bx + 50, 615, 55, 55);
    g.fillStyle = '#ffffff';
    g.font = display(34);
    g.textAlign = 'center';
    g.fillText(value, bx + 77, 712);
    g.fillStyle = '#94a3b8';
    g.font = body(20);
    g.fillText(label, bx + 77, 738);
    g.textAlign = 'left';
  });

  if (outcome.perfectLaunch) {
    g.fillStyle = '#fde047';
    g.font = body(24, 700);
    g.fillText(L({ en: '★ PERFECT LAUNCH', pt: '★ LANÇAMENTO PERFEITO', es: '★ LANZAMIENTO PERFECTO' }), X, 800);
  }

  // Piloto, com a moldura de nome escolhida
  drawPilotName(g, pilotName, pilotStyle, X, 880, S - X - 50, display(38));
  if (pilotTitle) {
    g.fillStyle = '#fcd34d';
    g.font = body(26, 600);
    g.fillText(`«${pilotTitle}»`, X, getNameFrame(pilotStyle)?.card.border ? 932 : 918, S - X - 50);
  }

  // Rodapé
  g.fillStyle = 'rgba(5,8,28,0.85)';
  g.fillRect(0, S - 80, S, 80);
  g.fillStyle = '#f59e0b';
  g.fillRect(0, S - 80, S, 4);
  g.fillStyle = '#e2e8f0';
  g.font = body(26, 600);
  g.textAlign = 'center';
  g.fillText(L({ en: 'Play too: ', pt: 'Jogue também: ', es: 'Juega tú también: ' }) + GAME_URL.replace('https://', ''), S / 2, S - 30);
  g.textAlign = 'left';

  // JPEG: bem mais leve que PNG para mandar em mensageiros.
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('canvas vazio'))), 'image/jpeg', 0.9));
}

export function shareText({ route, summary }: ShareInfo): string {
  const o = summary.outcome;
  return o.success
    ? L({ en: `My DOG astronaut scored ${o.score} pts on ${route.name} in DogCity Lunar Launch! 🚀🐕 Can you beat it?`, pt: `Meu DOG astronauta fez ${o.score} pts em ${route.name} no DogCity Lunar Launch! 🚀🐕 Consegue superar?`, es: `¡Mi DOG astronauta hizo ${o.score} pts en ${route.name} en DogCity Lunar Launch! 🚀🐕 ¿Puedes superarlo?` })
    : L({ en: `My DOG astronaut tried ${route.name} in DogCity Lunar Launch… and the ship didn't make it! 🚀💥 Your turn:`, pt: `Meu DOG astronauta tentou ${route.name} no DogCity Lunar Launch… e a nave não aguentou! 🚀💥 Tenta você:`, es: `Mi DOG astronauta intentó ${route.name} en DogCity Lunar Launch… ¡y la nave no aguantó! 🚀💥 Inténtalo tú:` });
}

/**
 * Compartilha a imagem pelo menu nativo quando o navegador aceita arquivos;
 * senão baixa a imagem. Devolve o que aconteceu (para a mensagem na tela).
 */
export async function shareFlight(info: ShareInfo): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareCard(info);
  const file = new File([blob], `dogcity-${info.route.id}-${info.summary.outcome.score}.jpg`, { type: 'image/jpeg' });
  const text = shareText(info);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${GAME_URL}` });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
