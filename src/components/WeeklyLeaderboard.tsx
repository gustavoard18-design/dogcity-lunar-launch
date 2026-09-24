import { type ReactNode, useEffect, useState } from 'react';
import type { DogDataIdentity, LeaderboardEntry } from '../types';
import { getEventLeaderboard, getLeaderboard } from '../lib/storage';
import {
  type DistrictStanding,
  fetchDistrictLeaderboard,
  fetchEventLeaderboard,
  fetchIdentities,
  fetchSeasonLeaderboard,
  fetchWeeklyLeaderboard,
  onlineEnabled,
} from '../lib/online';
import { getTierColor } from '../lib/economy';
import { getCurrentEvent } from '../lib/events';
import { titleText } from '../lib/achievements';
import { DISTRICT_PRIZE } from '../lib/districts';
import { seasonId, seasonName } from '../lib/seasons';
import GameIcon, { LunarDust, PLANET_ICON, Stardust, TIER_INFO } from './GameIcon';
import PilotName from './PilotName';
import OrdinalAvatar from './OrdinalAvatar';
import { dogDataProfileUrl } from '../lib/dogdata';
import { L } from '../lib/i18n';

interface WeeklyLeaderboardProps {
  playerAddress?: string;
  /** Distrito do lote do piloto no DogCity (só carteira real no snapshot). */
  playerDistrict?: string | null;
}

type Board = 'general' | 'event' | 'season' | 'districts';
type PilotBoard = Exclude<Board, 'districts'>;

const flightsLabel = (n: number) =>
  n === 1 ? L({ en: '1 flight', pt: '1 voo', es: '1 vuelo' }) : L({ en: `${n} flights`, pt: `${n} voos`, es: `${n} vuelos` });

const medalClass = (index: number) => ['bg-yellow-400/20 text-yellow-300', 'bg-slate-300/20 text-slate-200', 'bg-orange-500/20 text-orange-300'][index] ?? 'bg-white/5 text-slate-400';

export default function WeeklyLeaderboard({ playerAddress, playerDistrict }: WeeklyLeaderboardProps) {
  const event = getCurrentEvent();
  const [board, setBoard] = useState<Board>('general');
  // Ranking online (servidor); enquanto carrega ou se falhar, mostra o local (geral e evento).
  const [online, setOnline] = useState<Record<PilotBoard, LeaderboardEntry[] | null>>({ general: null, event: null, season: null });
  const [districts, setDistricts] = useState<DistrictStanding[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>(onlineEnabled ? 'loading' : 'offline');

  useEffect(() => {
    if (!onlineEnabled) return;
    if (board === 'districts' ? districts : online[board]) {
      setStatus('online');
      return;
    }
    let alive = true;
    setStatus('loading');
    const done = () => alive && setStatus('online');
    const fail = () => alive && setStatus('offline');
    if (board === 'districts') {
      fetchDistrictLeaderboard(0, 20)
        .then(rows => alive && (setDistricts(rows), done()))
        .catch(fail);
    } else {
      const load = board === 'general' ? fetchWeeklyLeaderboard(20) : board === 'event' ? fetchEventLeaderboard(event.route.id, 20) : fetchSeasonLeaderboard(20);
      load.then(rows => alive && (setOnline(o => ({ ...o, [board]: rows })), done())).catch(fail);
    }
    return () => {
      alive = false;
    };
  }, [board, event.route.id]);

  const pilotBoard = board === 'districts' ? null : board;
  const entries = pilotBoard
    ? online[pilotBoard] ?? (pilotBoard === 'general' ? getLeaderboard() : pilotBoard === 'event' ? getEventLeaderboard(event.route.id) : [])
    : [];
  const isOnline = status === 'online' && (pilotBoard ? online[pilotBoard] !== null : districts !== null);

  // Identidade DogData (avatar Ordinal e handle) dos pilotos do ranking online.
  const [identities, setIdentities] = useState<Record<string, DogDataIdentity>>({});
  const pending = isOnline ? entries.filter(e => !e.simulated && !(e.address in identities)).map(e => e.address) : [];
  const pendingKey = pending.join(',');
  useEffect(() => {
    if (!pendingKey) return;
    let alive = true;
    fetchIdentities(pendingKey.split(',')).then(found => {
      if (!alive) return;
      // Quem não tem identidade também entra (vazio), para não perguntar de novo.
      setIdentities(prev => {
        const next = { ...prev };
        for (const a of pendingKey.split(',')) next[a] = found[a] ?? { handle: null, avatarId: null };
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [pendingKey]);

  const subtitle =
    board === 'season'
      ? L({ en: 'season points this month', pt: 'pontos de temporada no mês', es: 'puntos de temporada del mes' })
      : board === 'districts'
        ? L({ en: 'DogCity districts this week', pt: 'distritos do DogCity na semana', es: 'distritos de DogCity esta semana' })
        : L({ en: 'best completed flight this week', pt: 'melhor voo concluído da semana', es: 'mejor vuelo completado de la semana' });

  const tabs: { id: Board; label: ReactNode }[] = [
    { id: 'general', label: <><GameIcon name="trophy" size={16} /> {L({ en: 'Overall', pt: 'Geral', es: 'General' })}</> },
    { id: 'event', label: <><GameIcon name={PLANET_ICON[event.route.destination]} size={16} /> {L({ en: 'Event', pt: 'Evento', es: 'Evento' })}: {event.name}</> },
    { id: 'season', label: <>🌙 {L({ en: 'Season', pt: 'Temporada', es: 'Temporada' })}</> },
    { id: 'districts', label: <>🏙️ {L({ en: 'Districts', pt: 'Distritos', es: 'Distritos' })}</> },
  ];

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-display text-lg text-white">{L({ en: 'Leaderboards', pt: 'Rankings', es: 'Clasificaciones' })}</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : status === 'loading' ? 'bg-amber-400' : 'bg-slate-500'}`} />
          {isOnline ? 'Online' : status === 'loading' ? L({ en: 'Connecting…', pt: 'Conectando…', es: 'Conectando…' }) : 'Local'} · {subtitle}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setBoard(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              board === t.id ? 'tab-active' : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {board === 'districts' ? (
        <DistrictBoard standings={districts} status={status} playerDistrict={playerDistrict ?? null} />
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const isPlayer = entry.address === playerAddress;
              const title = titleText(entry.title);
              const identity = identities[entry.address];
              return (
                <div
                  key={entry.address}
                  className={`flex items-center gap-3 p-3 rounded-2xl ${isPlayer ? 'bg-sky-500/15 border border-sky-300/50' : 'bg-white/[0.03] border border-white/5'}`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-display ${medalClass(index)}`}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {identity?.avatarId && <OrdinalAvatar id={identity.avatarId} size={24} className="ring-1 ring-white/20" />}
                      <span className="text-white text-sm font-semibold truncate min-w-0">
                        <PilotName name={entry.dogName} style={entry.style} />
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] ${getTierColor(entry.tier)}`}>
                        <GameIcon name={TIER_INFO[entry.tier].icon} size={14} />
                        {TIER_INFO[entry.tier].label}
                      </span>
                      {isPlayer && <span className="text-[10px] text-sky-300">{L({ en: 'you', pt: 'você', es: 'tú' })}</span>}
                      {entry.simulated && <span className="text-[10px] text-slate-600">bot</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {identity?.handle && (
                        <a href={dogDataProfileUrl(entry.address)} target="_blank" rel="noreferrer" className="text-sky-300/90 hover:text-sky-200">
                          @{identity.handle} ·{' '}
                        </a>
                      )}
                      {title && <span className="text-amber-300/90">«{title}» · </span>}
                      {flightsLabel(entry.totalLaunches)}
                      {board === 'general' && ` · ${L({ en: 'best', pt: 'recorde', es: 'récord' })} ${entry.bestScore}`}
                      {board === 'event' && ` · ${L({ en: 'in the event this week', pt: 'no evento esta semana', es: 'en el evento esta semana' })}`}
                      {board === 'season' && ` · ${L({ en: 'this month', pt: 'neste mês', es: 'este mes' })}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-display">{entry.weekScore}</div>
                    <div className="text-[10px] text-slate-500">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
          {entries.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              {board === 'season' && !isOnline
                ? L({ en: 'The season leaderboard needs a connection to the server.', pt: 'O ranking da temporada precisa de conexão com o servidor.', es: 'La clasificación de temporada necesita conexión con el servidor.' })
                : board === 'event'
                  ? L({ en: `Nobody has completed ${event.name} this week yet. Be the first!`, pt: `Ninguém concluiu ${event.name} nesta semana ainda. Seja o primeiro!`, es: `Nadie ha completado ${event.name} esta semana todavía. ¡Sé el primero!` })
                  : L({ en: 'No completed flights yet. Be the first!', pt: 'Nenhum voo concluído ainda. Seja o primeiro!', es: 'Ningún vuelo completado todavía. ¡Sé el primero!' })}
            </p>
          )}
          <p className="text-[11px] text-slate-600 mt-3">
            {!isOnline && board !== 'season'
              ? L({
                  en: 'No connection to the server: showing this browser\'s local leaderboard (“bot” pilots are simulated).',
                  pt: 'Sem conexão com o servidor: mostrando o ranking local deste navegador (pilotos “bot” são simulados).',
                  es: 'Sin conexión con el servidor: mostrando la clasificación local de este navegador (los pilotos “bot” son simulados).',
                })
              : board === 'general'
                ? L({
                    en: 'Global leaderboard: every pilot, resets every Monday. Only completed flights count.',
                    pt: 'Ranking global: todos os pilotos, reinicia toda segunda-feira. Só voos concluídos contam.',
                    es: 'Clasificación global: todos los pilotos, se reinicia cada lunes. Solo cuentan los vuelos completados.',
                  })
                : board === 'event'
                  ? L({
                      en: `Only completed flights on ${event.name} this week. The top 3 win Stardust, Lunar Dust and a name frame when the event changes on Monday.`,
                      pt: `Só voos concluídos na rota ${event.name} nesta semana. O top 3 ganha Stardust, Pó Lunar e moldura de nome quando o evento troca, na segunda-feira.`,
                      es: `Solo vuelos completados en ${event.name} esta semana. El top 3 gana Stardust, Polvo Lunar y un marco de nombre cuando el evento cambia, el lunes.`,
                    })
                  : L({
                      en: `${seasonName(seasonId())}: every completed flight adds 10 + score/10 points. Resets on the 1st of each month.`,
                      pt: `${seasonName(seasonId())}: cada voo concluído soma 10 + score/10 pontos. Reinicia no dia 1 de cada mês.`,
                      es: `${seasonName(seasonId())}: cada vuelo completado suma 10 + puntuación/10 puntos. Se reinicia el día 1 de cada mes.`,
                    })}
          </p>
        </>
      )}
    </div>
  );
}

/** Guerra de distritos: soma do melhor voo de cada piloto em cada rota, por distrito do DogCity. */
function DistrictBoard({ standings, status, playerDistrict }: { standings: DistrictStanding[] | null; status: string; playerDistrict: string | null }) {
  const max = Math.max(1, ...(standings ?? []).map(s => s.totalScore));
  return (
    <>
      <div
        className={`mb-3 rounded-xl border px-3 py-2 text-xs ${playerDistrict ? 'border-orange-300/40 bg-orange-500/10 text-slate-200' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}
      >
        {playerDistrict
          ? L({
              en: `You fly for ${playerDistrict}. Each pilot adds their best flight on each route this week.`,
              pt: `Você voa por ${playerDistrict}. Cada piloto soma o seu melhor voo em cada rota na semana.`,
              es: `Vuelas por ${playerDistrict}. Cada piloto suma su mejor vuelo en cada ruta de la semana.`,
            })
          : L({
              en: 'Connect a wallet that owns a DogCity plot to fight for your district.',
              pt: 'Conecte uma carteira com lote no DogCity para lutar pelo seu distrito.',
              es: 'Conecta una billetera con parcela en DogCity para luchar por tu distrito.',
            })}
      </div>

      {standings === null ? (
        <p className="text-sm text-slate-400 text-center py-6">
          {status === 'loading'
            ? L({ en: 'Loading districts…', pt: 'Carregando distritos…', es: 'Cargando distritos…' })
            : L({ en: 'The district war needs a connection to the server.', pt: 'A guerra de distritos precisa de conexão com o servidor.', es: 'La guerra de distritos necesita conexión con el servidor.' })}
        </p>
      ) : standings.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          {L({ en: 'No district has scored this week yet.', pt: 'Nenhum distrito pontuou nesta semana ainda.', es: 'Ningún distrito ha puntuado esta semana todavía.' })}
        </p>
      ) : (
        <div className="space-y-2">
          {standings.map((d, index) => {
            const mine = d.district === playerDistrict;
            return (
              <div key={d.district} className={`p-3 rounded-2xl ${mine ? 'bg-orange-500/15 border border-orange-300/50' : 'bg-white/[0.03] border border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-display ${medalClass(index)}`}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">
                      {d.district} {mine && <span className="text-[10px] text-orange-200">· {L({ en: 'your district', pt: 'seu distrito', es: 'tu distrito' })}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {d.pilots} {L({ en: d.pilots === 1 ? 'pilot' : 'pilots', pt: d.pilots === 1 ? 'piloto' : 'pilotos', es: d.pilots === 1 ? 'piloto' : 'pilotos' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-display">{d.totalScore}</div>
                    <div className="text-[10px] text-slate-500">pts</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: `${(d.totalScore / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-600 mt-3">
        {L({
          en: 'Resets every Monday. Pilots of the winning district who flew that week get',
          pt: 'Reinicia toda segunda-feira. Quem voou pelo distrito campeão na semana ganha',
          es: 'Se reinicia cada lunes. Quienes volaron por el distrito campeón esa semana ganan',
        })}{' '}
        <span className="text-amber-300">
          <Stardust value={DISTRICT_PRIZE.stardust} sign="+" size="1em" />
        </span>{' '}
        <span className="text-violet-300">
          <LunarDust value={DISTRICT_PRIZE.lunarDust} sign="+" size="1em" />
        </span>{' '}
        {L({ en: 'and the 🏙️ District Champion frame.', pt: 'e a moldura 🏙️ Distrito Campeão.', es: 'y el marco 🏙️ Distrito Campeón.' })}
      </p>
    </>
  );
}
