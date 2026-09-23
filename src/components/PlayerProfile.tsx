import { PlayerProfile, Stat } from '../types';
import { getTierColor } from '../lib/economy';
import { MAX_STAT_LEVEL, STAT_INFO } from '../lib/stats';
import { astronautArt, astronautTier } from '../lib/evolution';
import GameIcon, { LunarDust, Stardust, TIER_INFO, statIcon } from './GameIcon';

interface PlayerProfileProps {
  profile: PlayerProfile;
}

export default function PlayerProfileCard({ profile }: PlayerProfileProps) {
  const { dog } = profile;
  const { tier } = astronautTier(dog);
  const onchain = profile.dogBalanceSource === 'real' ? profile.dogOnchain : undefined;
  const lot = onchain?.dogcity?.status === 'in_snapshot' ? onchain.dogcity : null;
  const xpPercent = Math.min(100, (dog.xp / dog.xpToNext) * 100);
  const successRate = profile.launches.length
    ? Math.round((profile.launches.filter(l => l.success).length / profile.launches.length) * 100)
    : 0;

  return (
    <div className="panel">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-24 shrink-0 aspect-[220/302] rounded-xl overflow-hidden border border-white/15 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
          <img src={astronautArt(tier)} alt={`Astronauta ${dog.name} — ${tier.name}`} className="w-full h-full object-cover" draggable={false} />
          <div className={`absolute bottom-0 inset-x-0 bg-black/70 text-center font-display text-[9px] py-0.5 ${tier.accent}`}>{tier.name.toUpperCase()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.3em] text-slate-500">PILOTO</div>
          <h2 className="font-display text-xl sm:text-2xl text-white leading-tight truncate">{dog.name}</h2>
          <p className="text-xs text-slate-400">{dog.breed}</p>
          <div className={`text-sm font-bold mt-1 ${getTierColor(profile.tier)}`}>
            <GameIcon name={TIER_INFO[profile.tier].icon} size={18} className="mr-1" />
            {TIER_INFO[profile.tier].label}
          </div>
          <p className="text-[10px] text-slate-500 font-mono" title={profile.address}>
            {profile.address.slice(0, 8)}…{profile.address.slice(-5)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-1">
        <div className="font-display text-3xl text-amber-300 leading-none">{dog.level}</div>
        <div className="flex-1">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>NÍVEL</span>
            <span>
              {dog.xp}/{dog.xpToNext} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-700" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4 text-center">
        <div className="rounded-xl bg-white/5 py-2">
          <div className="text-white font-bold">{dog.missions}</div>
          <div className="text-[10px] text-slate-400">Voos</div>
        </div>
        <div className="rounded-xl bg-white/5 py-2">
          <div className="text-white font-bold">{successRate}%</div>
          <div className="text-[10px] text-slate-400">Sucesso</div>
        </div>
        <div className="rounded-xl bg-white/5 py-2">
          <div className="text-white font-bold">{profile.bestScore}</div>
          <div className="text-[10px] text-slate-400">Recorde</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {(Object.keys(STAT_INFO) as Stat[]).map(stat => (
          <div key={stat} className="flex items-center gap-2 text-xs">
            <span className="w-28 flex items-center gap-1.5 text-slate-300">
              <GameIcon name={statIcon(stat)} size={22} className="rounded-md" /> {STAT_INFO[stat].label}
            </span>
            <div className="flex-1 flex gap-0.5">
              {Array.from({ length: MAX_STAT_LEVEL }, (_, i) => (
                <div key={i} className="stat-pip" style={i < dog[stat] ? { background: 'linear-gradient(90deg,#38bdf8,#f97316)' } : undefined} />
              ))}
            </div>
            <span className="w-5 text-right text-white font-bold">{dog[stat]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-2 text-center">
          <div className="text-amber-300 font-bold"><Stardust value={profile.stardust} size={22} /></div>
          <div className="text-[10px] text-slate-400">Stardust</div>
        </div>
        <div className="rounded-xl bg-violet-500/10 border border-violet-400/20 p-2 text-center">
          <div className="text-violet-300 font-bold"><LunarDust value={profile.lunarDust} size={22} /></div>
          <div className="text-[10px] text-slate-400">Pó Lunar</div>
        </div>
      </div>
      <div className="rounded-xl bg-orange-500/10 border border-orange-400/20 px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">
            Saldo DOG <span className="text-slate-500">({profile.dogBalanceSource === 'real' ? 'on-chain' : 'simulado'})</span>
          </span>
          <span className="text-orange-300 font-bold">{profile.dogBalance.toLocaleString('pt-BR')}</span>
        </div>
        {onchain && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {onchain.rank && <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">Holder #{onchain.rank.toLocaleString('pt-BR')}</span>}
            {onchain.dogcity?.genesis && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">Genesis · recebeu o airdrop</span>}
            {onchain.dogcity?.status === 'exchange' && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">Endereço de corretora{onchain.dogcity.identity ? ` (${onchain.dogcity.identity})` : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Lote no DogCity (snapshot do bloco 966.670) */}
      {lot?.lotId && (
        <a
          href={lot.mapUrl ?? 'https://www.dogdata.xyz/dogcity'}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs hover:bg-sky-500/15 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] tracking-wider text-sky-200">SEU LOTE NO DOGCITY</span>
            <span className="text-sky-300">mapa ↗</span>
          </div>
          <div className="mt-1 text-white font-semibold">
            {lot.district} · {lot.typology}
          </div>
          <div className="text-slate-400">
            {lot.areaM2?.toLocaleString('pt-BR')} m² · lote {lot.lotId}
          </div>
        </a>
      )}
      {onchain?.dogcity?.status === 'not_in_snapshot' && (
        <a href="https://www.dogdata.xyz/dogcity" target="_blank" rel="noreferrer" className="mt-2 block text-[11px] text-slate-500 hover:text-slate-300">
          Esta carteira não estava no snapshot do DogCity (bloco 966.670). Saiba mais ↗
        </a>
      )}
      {onchain && <p className="mt-2 text-[10px] text-slate-600">Dados on-chain: DogData (dogdata.xyz)</p>}
    </div>
  );
}
