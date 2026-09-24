import LegalLinks from './LegalLinks';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { WALLETS, WalletConnection, WalletId, connectGuest, connectWallet, isMobileBrowser, isWalletInstalled } from '../lib/wallet';
import { GAME_URL } from '../lib/shareCard';
import { sfx } from '../lib/audio';
import { cutoutArt } from '../lib/evolution';
import GameIcon from './GameIcon';
import LanguageSwitcher from './LanguageSwitcher';
import { L } from '../lib/i18n';

const walletLogo = (id: WalletId) => `${import.meta.env.BASE_URL}art/wallets/${id}.webp`;

interface ConnectWalletProps {
  onConnect: (wallet: WalletConnection) => void;
}

/** Astronauta e foguete recortados, flutuando sobre o espaço. */
function HeroArt() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="relative w-full max-w-[360px] sm:max-w-[440px] lg:max-w-[560px] aspect-[1.3] shrink-0"
    >
      <div className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.35),rgba(37,99,235,0.18)_45%,transparent_70%)] blur-2xl" />
      <motion.img
        src={cutoutArt('rocket')}
        alt={L({ en: 'DOG rocket', pt: 'Foguete DOG', es: 'Cohete DOG' })}
        draggable={false}
        animate={{ y: [0, -14, 0], rotate: [10, 12, 10] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[2%] top-[0%] h-[92%] object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.55)]"
      />
      <motion.img
        src={cutoutArt('astronaut')}
        alt={L({ en: 'DOG astronaut', pt: 'Astronauta DOG', es: 'Astronauta DOG' })}
        draggable={false}
        animate={{ y: [0, -10, 0], rotate: [-3, -1.5, -3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute left-[2%] bottom-[0%] h-[100%] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
      />
    </motion.div>
  );
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const [connecting, setConnecting] = useState<'guest' | WalletId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWallets, setShowWallets] = useState(false);

  const handle = async (kind: 'guest' | WalletId) => {
    sfx.unlock();
    sfx.click();
    setConnecting(kind);
    setError(null);
    try {
      onConnect(kind === 'guest' ? await connectGuest() : await connectWallet(kind));
    } catch (err) {
      setError(err instanceof Error ? err.message : L({ en: 'Could not connect.', pt: 'Falha ao conectar.', es: 'No se pudo conectar.' }));
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-[6vw] p-4 lg:px-[8vw]">
      <LanguageSwitcher className="!absolute top-4 right-4 z-20" />
      <HeroArt />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-md w-full lg:order-first"
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-xs tracking-[0.4em] text-sky-300/90 mb-3">
          {L({ en: 'DOGCITY ECOSYSTEM', pt: 'ECOSSISTEMA DOGCITY', es: 'ECOSISTEMA DOGCITY' })}
        </motion.div>
        <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] mb-2 bg-gradient-to-br from-white via-sky-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]">
          LUNAR
          <br />
          LAUNCH
        </h1>
        <p className="text-slate-300 mb-8 text-base sm:text-lg max-w-sm">
          {L({ en: 'From the DogCity Lunar Base, aim, launch and pilot your astronaut dog to Earth orbit, the Sea of Tranquility, Ceres and Mars.', pt: 'Da Base Lunar DogCity, mire, lance e pilote seu cão astronauta até a órbita da Terra, o Mar da Tranquilidade, Ceres e Marte.', es: 'Desde la Base Lunar DogCity, apunta, lanza y pilota a tu perro astronauta hasta la órbita de la Tierra, el Mar de la Tranquilidad, Ceres y Marte.' })}
        </p>

        <div className="panel space-y-3">
          <button onClick={() => handle('guest')} disabled={!!connecting} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
            {connecting === 'guest' ? (
              L({ en: 'Preparing hangar…', pt: 'Preparando hangar…', es: 'Preparando hangar…' })
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <GameIcon name="rocket" size={30} className="-my-2 rotate-[30deg]" /> {L({ en: 'Play now', pt: 'Jogar agora', es: 'Jugar ahora' })}
              </span>
            )}
          </button>
          <button onClick={() => setShowWallets(v => !v)} disabled={!!connecting} className="btn-ghost w-full py-3 text-sm disabled:opacity-40">
            {showWallets ? L({ en: 'Close wallets', pt: 'Fechar carteiras', es: 'Cerrar billeteras' }) : L({ en: 'Connect Bitcoin wallet', pt: 'Conectar carteira Bitcoin', es: 'Conectar billetera Bitcoin' })}
          </button>
          {showWallets && (
            <div className="space-y-2">
              {WALLETS.map(w => {
                const installed = isWalletInstalled(w.id);
                // No celular sem a carteira: abre o jogo dentro do app dela (navegador interno).
                const appLink = !installed && isMobileBrowser() ? w.appLink?.(GAME_URL) : undefined;
                return (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl border border-sky-400/15 bg-[#0b1733]/70 px-3 py-2.5">
                    <img src={walletLogo(w.id)} alt={w.name} className="w-9 h-9 shrink-0 rounded-lg object-cover border border-white/10" draggable={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {w.name} {w.note && <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded border border-orange-400/40 text-orange-300">{w.note}</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{installed
                          ? L({ en: 'Detected', pt: 'Detectada', es: 'Detectada' })
                          : appLink
                            ? L({ en: 'Open the game in the app', pt: 'Abra o jogo pelo app', es: 'Abre el juego en la app' })
                            : L({ en: 'Not installed', pt: 'Não instalada', es: 'No instalada' })}</div>
                    </div>
                    {installed ? (
                      <button onClick={() => handle(w.id)} disabled={!!connecting} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                        {connecting === w.id ? L({ en: 'Waiting…', pt: 'Aguardando…', es: 'Esperando…' }) : L({ en: 'Connect', pt: 'Conectar', es: 'Conectar' })}
                      </button>
                    ) : appLink ? (
                      <a href={appLink} rel="noreferrer" className="btn-primary px-3 py-1.5 text-xs">
                        {L({ en: 'Open in app ↗', pt: 'Abrir no app ↗', es: 'Abrir en la app ↗' })}
                      </a>
                    ) : (
                      <a href={w.installUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                        {L({ en: 'Install ↗', pt: 'Instalar ↗', es: 'Instalar ↗' })}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {L({
              en: '“Play now” creates a guest pilot in this browser, with a simulated DOG balance. With a wallet, your DOG balance, holder rank and DogCity plot are read from the blockchain (data from',
              pt: '“Jogar agora” cria um piloto convidado neste navegador, com saldo DOG simulado. Com uma carteira, o saldo DOG, seu ranking de holder e seu lote no DogCity são lidos da blockchain (dados do',
              es: '“Jugar ahora” crea un piloto invitado en este navegador, con saldo DOG simulado. Con una billetera, tu saldo DOG, tu ranking de holder y tu parcela en DogCity se leen de la blockchain (datos de',
            })}{' '}
            <a href="https://www.dogdata.xyz" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">DogData</a>
            {L({
              en: '). The wallet signs a sign-in message once: it is free and moves no funds. It proves the pilot is yours and saves your progress in the cloud.',
              pt: '). A carteira assina uma mensagem de login uma vez: é grátis e não move fundos. Isso prova que o piloto é seu e salva seu progresso na nuvem.',
              es: '). La billetera firma un mensaje de inicio de sesión una vez: es gratis y no mueve fondos. Demuestra que el piloto es tuyo y guarda tu progreso en la nube.',
            })}
          </p>
          <p className="text-[11px] text-slate-500">
            {L({ en: 'By playing you agree to the', pt: 'Ao jogar, você concorda com os', es: 'Al jugar, aceptas los' })} <LegalLinks inline />
          </p>
        </div>
      </motion.div>
    </div>
  );
}
