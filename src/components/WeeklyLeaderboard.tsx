import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../lib/storage';
import { fetchWeeklyLeaderboard, onlineEnabled } from '../lib/online';
import { getTierColor } from '../lib/economy';
import GameIcon, { TIER_INFO } from './GameIcon';

interface WeeklyLeaderboardProps {
  playerAddress?: string;
}

export default function WeeklyLeaderboard({ playerAddress }: WeeklyLeaderboardProps) {
  // Ranking online (servidor); enquanto carrega ou se falhar, mostra o local.
  const [online, setOnline] = useState<LeaderboardEntry[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>(onlineEnabled ? 'loading' : 'offline');
  useEffect(() => {
    if (!onlineEnabled) return;
    let alive = true;
    fetchWeeklyLeaderboard(20)
      .then(rows => {
        if (!alive) return;
        setOnline(rows);
        setStatus('online');
      })
      .catch(() => alive && setStatus('offline'));
    return () => {
      alive = false;
    };
  }, []);
  const entries = online ?? getLeaderboard();

  return (
    <div className="panel">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-lg text-white">Ranking semanal</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : status === 'loading' ? 'bg-amber-400' : 'bg-slate-500'}`} />
          {status === 'online' ? 'Online' : status === 'loading' ? 'Conectando…' : 'Local'} · melhor voo concluído da semana
        </span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isPlayer = entry.address === playerAddress;
          const medal = ['bg-yellow-400/20 text-yellow-300', 'bg-slate-300/20 text-slate-200', 'bg-orange-500/20 text-orange-300'][index];
          return (
            <div
              key={entry.address}
              className={`flex items-center gap-3 p-3 rounded-2xl ${
                isPlayer ? 'bg-sky-500/15 border border-sky-300/50' : 'bg-white/[0.03] border border-white/5'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-display ${medal ?? 'bg-white/5 text-slate-400'}`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold truncate">{entry.dogName}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] ${getTierColor(entry.tier)}`}>
                    <GameIcon name={TIER_INFO[entry.tier].icon} size={14} />
                    {TIER_INFO[entry.tier].label}
                  </span>
                  {isPlayer && <span className="text-[10px] text-sky-300">você</span>}
                  {entry.simulated && <span className="text-[10px] text-slate-600">bot</span>}
                </div>
                <div className="text-[10px] text-slate-500">
                  {entry.totalLaunches} {entry.totalLaunches === 1 ? 'voo' : 'voos'} · recorde {entry.bestScore}
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
      {status === 'online' && entries.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum voo concluído nesta semana ainda. Seja o primeiro!</p>
      )}
      <p className="text-[11px] text-slate-600 mt-3">
        {status === 'online'
          ? 'Ranking global: todos os pilotos, reinicia toda segunda-feira. Só voos concluídos contam.'
          : 'Sem conexão com o servidor: mostrando o ranking local deste navegador (pilotos “bot” são simulados).'}
      </p>
    </div>
  );
}
