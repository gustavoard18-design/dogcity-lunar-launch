import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { L, fmtNumber, type Tr } from '../lib/i18n';
import { CHESTS, CHEST_LIMITS, CHEST_TREASURY, chestName, chestOdds } from '../lib/chests';

/** Canal de suporte: issues do repositório (qualquer conta do GitHub abre um chamado). */
export const SUPPORT_URL = 'https://github.com/gustavoard18-design/dogcity-lunar-launch/issues/new';
export const LEGAL_UPDATED = '2026-09-24';

/** Link do suporte já com o título preenchido (ex.: o pedido de baú). */
export function supportUrl(subject?: string): string {
  return subject ? `${SUPPORT_URL}?title=${encodeURIComponent(`[Support] ${subject}`)}` : SUPPORT_URL;
}

type Doc = 'terms' | 'privacy';

/** Links para Termos de Uso, Privacidade e Suporte (abrem uma janela no próprio jogo). */
export default function LegalLinks({ className = '', inline = false }: { className?: string; inline?: boolean }) {
  const [open, setOpen] = useState<Doc | null>(null);
  const link = 'underline underline-offset-2 hover:text-slate-300';
  return (
    <>
      <span className={`${inline ? '' : 'block'} ${className}`}>
        <button type="button" onClick={() => setOpen('terms')} className={link}>
          {L({ en: 'Terms of Use', pt: 'Termos de Uso', es: 'Términos de Uso' })}
        </button>
        {' · '}
        <button type="button" onClick={() => setOpen('privacy')} className={link}>
          {L({ en: 'Privacy', pt: 'Privacidade', es: 'Privacidad' })}
        </button>
        {!inline && (
          <>
            {' · '}
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={link}>
              {L({ en: 'Support', pt: 'Suporte', es: 'Soporte' })}
            </a>
          </>
        )}
      </span>
      {open && createPortal(<LegalModal doc={open} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

function LegalModal({ doc, onClose }: { doc: Doc; onClose(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const sections = doc === 'terms' ? termsSections() : privacySections();
  const title = doc === 'terms' ? L({ en: 'Terms of Use', pt: 'Termos de Uso', es: 'Términos de Uso' }) : L({ en: 'Privacy Policy', pt: 'Política de Privacidade', es: 'Política de Privacidad' });
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="hud-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 text-left" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-display text-xl text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2.5 py-1 text-xs" aria-label={L({ en: 'Close', pt: 'Fechar', es: 'Cerrar' })}>
            ✕
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          {L({ en: 'Last updated', pt: 'Atualizado em', es: 'Actualizado el' })} {LEGAL_UPDATED}
        </p>
        <div className="space-y-4 text-[13px] leading-relaxed text-slate-300">
          {sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-semibold text-white mb-1">{L(s.title)}</h3>
              {s.body.map((p, j) => (
                <p key={j} className="mb-1.5">
                  {L(p)}
                </p>
              ))}
              {s.extra}
            </section>
          ))}
          <p className="text-slate-400">
            {L({ en: 'Questions or problems:', pt: 'Dúvidas ou problemas:', es: 'Dudas o problemas:' })}{' '}
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="underline text-sky-300">
              {L({ en: 'open a support ticket', pt: 'abra um chamado no suporte', es: 'abre un ticket de soporte' })}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

interface Section {
  title: Tr;
  body: Tr[];
  extra?: React.ReactNode;
}

function OddsTable() {
  return (
    <div className="grid gap-2 sm:grid-cols-3 mt-2">
      {CHESTS.map(c => (
        <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px]">
          <div className="font-semibold text-white">
            {chestName(c.id)} · {fmtNumber(c.priceDog)} DOG
          </div>
          {chestOdds(c).map((o, i) => (
            <div key={i} className="flex justify-between text-slate-400">
              <span>
                {o.stardust} Stardust{o.lunarDust ? ` + ${o.lunarDust} ${L({ en: 'Lunar Dust', pt: 'Pó Lunar', es: 'Polvo Lunar' })}` : ''}
              </span>
              <span className="shrink-0 pl-2">{fmtNumber(o.percent, { maximumFractionDigits: 1 })}%</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const termsSections = (): Section[] => [
  {
    title: { en: '1. The game', pt: '1. O jogo', es: '1. El juego' },
    body: [
      {
        en: 'DogCity Lunar Launch is a free browser game made by the DogCity community, part of the DogData ecosystem. It is offered "as is", may change or go offline at any time, and has no link to any exchange or to the DOG•GO•TO•THE•MOON rune issuers.',
        pt: 'DogCity Lunar Launch é um jogo grátis de navegador feito pela comunidade DogCity, parte do ecossistema DogData. Ele é oferecido "como está", pode mudar ou sair do ar a qualquer momento e não tem ligação com corretoras nem com os emissores da rune DOG•GO•TO•THE•MOON.',
        es: 'DogCity Lunar Launch es un juego gratis de navegador hecho por la comunidad DogCity, parte del ecosistema DogData. Se ofrece "tal cual", puede cambiar o salir del aire en cualquier momento y no tiene relación con exchanges ni con los emisores de la rune DOG•GO•TO•THE•MOON.',
      },
    ],
  },
  {
    title: { en: '2. Wallets', pt: '2. Carteiras', es: '2. Billeteras' },
    body: [
      {
        en: 'Connecting a wallet reads your public address. The game asks you to sign a sign-in message: it is free, does not move funds and only proves the address is yours. We never ask for your seed phrase or private keys. Anyone who does is a scammer.',
        pt: 'Conectar a carteira lê o seu endereço público. O jogo pede a assinatura de uma mensagem de login: é grátis, não move fundos e só prova que o endereço é seu. Nunca pedimos sua frase semente nem chaves privadas. Quem pedir é golpista.',
        es: 'Conectar la billetera lee tu dirección pública. El juego pide firmar un mensaje de inicio de sesión: es gratis, no mueve fondos y solo prueba que la dirección es tuya. Nunca pedimos tu frase semilla ni claves privadas. Quien las pida es un estafador.',
      },
    ],
  },
  {
    title: { en: '3. DOG chests (optional purchases)', pt: '3. Baús DOG (compras opcionais)', es: '3. Cofres DOG (compras opcionales)' },
    body: [
      {
        en: 'Chests are optional and paid in DOG to the game treasury. Each chest gives a random amount of Stardust and Lunar Dust, with the odds below (the same ones the server uses). Everything in the game can also be earned by flying.',
        pt: 'Os baús são opcionais e pagos em DOG para a tesouraria do jogo. Cada baú dá uma quantidade aleatória de Stardust e Pó Lunar, com as chances abaixo (as mesmas que o servidor usa). Tudo no jogo também pode ser conquistado voando.',
        es: 'Los cofres son opcionales y se pagan en DOG a la tesorería del juego. Cada cofre da una cantidad aleatoria de Stardust y Polvo Lunar, con las probabilidades de abajo (las mismas que usa el servidor). Todo en el juego también se puede ganar volando.',
      },
      {
        en: `Limit: ${CHEST_LIMITS.perDay} per day and ${CHEST_LIMITS.perWeek} per week per wallet (Brasília time). Treasury: ${CHEST_TREASURY}.`,
        pt: `Limite: ${CHEST_LIMITS.perDay} por dia e ${CHEST_LIMITS.perWeek} por semana por carteira (horário de Brasília). Tesouraria: ${CHEST_TREASURY}.`,
        es: `Límite: ${CHEST_LIMITS.perDay} por día y ${CHEST_LIMITS.perWeek} por semana por billetera (hora de Brasilia). Tesorería: ${CHEST_TREASURY}.`,
      },
      {
        en: 'Blockchain payments are final and non-refundable. Only send the exact amount, from the connected wallet, after creating the order. A payment that does not match an order (wrong amount, other wallet, no order) cannot be credited automatically: contact support.',
        pt: 'Pagamentos na blockchain são definitivos e sem reembolso. Envie só o valor exato, da carteira conectada, depois de criar o pedido. Um pagamento que não confere com um pedido (valor errado, outra carteira, sem pedido) não é creditado automaticamente: fale com o suporte.',
        es: 'Los pagos en blockchain son definitivos y sin reembolso. Envía solo el monto exacto, desde la billetera conectada, después de crear el pedido. Un pago que no coincide con un pedido (monto incorrecto, otra billetera, sin pedido) no se acredita automáticamente: contacta al soporte.',
      },
      {
        en: 'Stardust, Lunar Dust, upgrades and cosmetics exist only inside the game: they are not money, cannot be withdrawn, sold or exchanged for DOG or any other asset, and may be rebalanced. You must be of legal age in your country, and it must be legal there for you to buy random items with crypto.',
        pt: 'Stardust, Pó Lunar, upgrades e cosméticos só existem dentro do jogo: não são dinheiro, não podem ser sacados, vendidos nem trocados por DOG ou outro ativo, e podem ser rebalanceados. Você precisa ser maior de idade no seu país, e a compra de itens aleatórios com cripto precisa ser permitida lá.',
        es: 'Stardust, Polvo Lunar, mejoras y cosméticos solo existen dentro del juego: no son dinero, no se pueden retirar, vender ni cambiar por DOG u otro activo, y pueden reequilibrarse. Debes ser mayor de edad en tu país, y la compra de objetos aleatorios con cripto debe estar permitida allí.',
      },
    ],
    extra: <OddsTable />,
  },
  {
    title: { en: '4. Fair play', pt: '4. Jogo limpo', es: '4. Juego limpio' },
    body: [
      {
        en: 'Rankings, seasons and the district war only count flights accepted by the server, sent with a valid session (a verified wallet, or the guest pilot of this browser). Scores that look manipulated may be removed, and the related rewards cancelled.',
        pt: 'Rankings, temporadas e a guerra de distritos só contam voos aceitos pelo servidor, enviados com uma sessão válida (carteira verificada, ou o piloto convidado deste navegador). Pontuações que pareçam manipuladas podem ser removidas, e as recompensas ligadas a elas canceladas.',
        es: 'Rankings, temporadas y la guerra de distritos solo cuentan vuelos aceptados por el servidor, enviados con una sesión válida (billetera verificada, o el piloto invitado de este navegador). Las puntuaciones que parezcan manipuladas pueden eliminarse, y sus recompensas cancelarse.',
      },
    ],
  },
  {
    title: { en: '5. Liability', pt: '5. Responsabilidade', es: '5. Responsabilidad' },
    body: [
      {
        en: 'To the extent the law allows, the game makers are not liable for losses from wallet software, network fees, blockchain delays, third-party services (DogData, wallets, hosting) or the loss of progress kept only in your browser.',
        pt: 'Na medida permitida por lei, quem faz o jogo não responde por perdas causadas por software de carteira, taxas de rede, atrasos da blockchain, serviços de terceiros (DogData, carteiras, hospedagem) ou pela perda de progresso guardado só no seu navegador.',
        es: 'En la medida que la ley lo permita, los creadores del juego no responden por pérdidas causadas por software de billetera, comisiones de red, retrasos de la blockchain, servicios de terceros (DogData, billeteras, hosting) o la pérdida de progreso guardado solo en tu navegador.',
      },
    ],
  },
];

const privacySections = (): Section[] => [
  {
    title: { en: 'What we store', pt: 'O que guardamos', es: 'Qué guardamos' },
    body: [
      {
        en: 'In your browser: your pilot and progress (localStorage). On the server, only for the game to work: your public wallet address, pilot name, scores, chest orders with their transaction ids, and, for verified wallets, a copy of your progress so you can play on another device.',
        pt: 'No seu navegador: seu piloto e progresso (localStorage). No servidor, só para o jogo funcionar: o endereço público da carteira, o nome do piloto, as pontuações, os pedidos de baú com o id das transações e, para carteiras verificadas, uma cópia do progresso para você jogar em outro aparelho.',
        es: 'En tu navegador: tu piloto y progreso (localStorage). En el servidor, solo para que el juego funcione: la dirección pública de la billetera, el nombre del piloto, las puntuaciones, los pedidos de cofres con el id de las transacciones y, para billeteras verificadas, una copia del progreso para que juegues en otro dispositivo.',
      },
      {
        en: 'Wallet addresses and pilot names appear publicly in the rankings. Blockchain transactions are public by nature.',
        pt: 'Endereços e nomes de piloto aparecem publicamente nos rankings. Transações na blockchain são públicas por natureza.',
        es: 'Las direcciones y nombres de piloto aparecen públicamente en los rankings. Las transacciones en blockchain son públicas por naturaleza.',
      },
    ],
  },
  {
    title: { en: 'Anonymous usage metrics', pt: 'Métricas de uso anônimas', es: 'Métricas de uso anónimas' },
    body: [
      {
        en: 'The game records anonymous events (opened the game, started or finished a flight, language, wallet type) with a random id created in your browser. They never include your address and are used only to improve the game.',
        pt: 'O jogo registra eventos anônimos (abriu o jogo, começou ou terminou um voo, idioma, tipo de carteira) com um id aleatório criado no seu navegador. Eles nunca incluem seu endereço e servem só para melhorar o jogo.',
        es: 'El juego registra eventos anónimos (abrió el juego, empezó o terminó un vuelo, idioma, tipo de billetera) con un id aleatorio creado en tu navegador. Nunca incluyen tu dirección y sirven solo para mejorar el juego.',
      },
      {
        en: 'For security, sign-in keeps a one-way hash of your IP address for up to 24 hours, to limit abuse. No cookies, ads or trackers from third parties.',
        pt: 'Por segurança, o login guarda um hash irreversível do seu IP por até 24 horas, para limitar abusos. Sem cookies, anúncios ou rastreadores de terceiros.',
        es: 'Por seguridad, el inicio de sesión guarda un hash irreversible de tu IP por hasta 24 horas, para limitar abusos. Sin cookies, anuncios ni rastreadores de terceros.',
      },
    ],
  },
  {
    title: { en: 'Services we use', pt: 'Serviços que usamos', es: 'Servicios que usamos' },
    body: [
      {
        en: 'GitHub Pages (hosting), Supabase (database and server functions), DogData (on-chain DOG data) and your wallet provider. Each has its own privacy policy.',
        pt: 'GitHub Pages (hospedagem), Supabase (banco de dados e funções do servidor), DogData (dados on-chain do DOG) e o provedor da sua carteira. Cada um tem sua própria política de privacidade.',
        es: 'GitHub Pages (hosting), Supabase (base de datos y funciones del servidor), DogData (datos on-chain de DOG) y el proveedor de tu billetera. Cada uno tiene su propia política de privacidad.',
      },
    ],
  },
  {
    title: { en: 'Your choices', pt: 'Suas escolhas', es: 'Tus opciones' },
    body: [
      {
        en: 'Clearing the site data in your browser erases the local copy. To delete your server data (scores, cloud progress), open a support ticket from the connected address, and we remove it. Chest orders are kept as payment records.',
        pt: 'Limpar os dados do site no navegador apaga a cópia local. Para apagar seus dados no servidor (pontuações, progresso na nuvem), abra um chamado no suporte a partir do endereço conectado, e nós removemos. Pedidos de baú ficam guardados como registro de pagamento.',
        es: 'Borrar los datos del sitio en tu navegador elimina la copia local. Para borrar tus datos del servidor (puntuaciones, progreso en la nube), abre un ticket de soporte desde la dirección conectada y los eliminamos. Los pedidos de cofres se guardan como registro de pago.',
      },
    ],
  },
];
