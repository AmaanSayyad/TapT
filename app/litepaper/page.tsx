'use client';

import MermaidDiagram from '@/components/ui/MermaidDiagram';
import { SiteFooter } from '@/components/ui/SiteFooter';
import Link from 'next/link';

const PROJECT_GITHUB = 'https://github.com/AmaanSayyad/TapT';

const metamask = { name: 'MetaMask', src: '/logos/companies/metamask.svg' };

const chains = [
  { name: 'Robinhood Chain', asset: 'ETH', src: '/partners/robinhood.svg', wallets: [metamask] },
  { name: 'Solana', asset: 'SOL', src: '/logos/chains/solana.png', wallets: [
    { name: 'Phantom', src: '/logos/companies/phantom.svg' },
    { name: 'Backpack', src: '/logos/companies/backpack.png' },
  ] },
  { name: 'Base', asset: 'USDC', src: '/logos/chains/base.png', wallets: [
    { name: 'Coinbase Wallet', src: '/logos/companies/coinbase.svg' },
  ] },
  { name: 'Arbitrum', asset: 'ETH', src: '/logos/chains/arbitrum.png', wallets: [metamask] },
  { name: 'Tempo', asset: 'OUSD', src: '/logos/chains/tempo.png', wallets: [metamask] },
];

const marketMarks = [
  { src: '/logos/ticker/btc.svg', label: 'BTC' },
  { src: '/logos/ticker/eth.svg', label: 'ETH' },
  { src: '/logos/ticker/sol.svg', label: 'SOL' },
  { src: '/logos/ticker/aapl.svg', label: 'AAPL' },
  { src: '/logos/ticker/nvda.svg', label: 'NVDA' },
  { src: '/logos/ticker/tsla.svg', label: 'TSLA' },
  { src: '/logos/ticker/gold.svg', label: 'Gold' },
  { src: '/logos/ticker/silver.svg', label: 'Silver' },
  { src: '/logos/ticker/eur.svg', label: 'EUR' },
  { src: '/logos/ticker/gbp.svg', label: 'GBP' },
  { src: '/logos/ticker/jpy.svg', label: 'JPY' },
];

const chainMarks = [
  { src: '/partners/robinhood.svg', label: 'Robinhood', detail: 'ETH' },
  { src: '/logos/chains/solana.png', label: 'Solana', detail: 'SOL' },
  { src: '/logos/chains/base.png', label: 'Base', detail: 'USDC' },
  { src: '/logos/chains/arbitrum.png', label: 'Arbitrum', detail: 'ETH' },
  { src: '/logos/chains/tempo.png', label: 'Tempo', detail: 'OUSD' },
];

function DiagramNode({ src, extra, label }: { src?: string; extra?: string; label: string }) {
  return (
    <div className="inline-flex w-full max-w-full items-center gap-2 rounded-lg border border-[#ccff00] bg-[#141414] px-3 py-2 text-sm text-white sm:w-auto">
      {src ? <img src={src} alt="" className="h-5 w-5 shrink-0 object-contain" /> : null}
      {extra ? <img src={extra} alt="" className="h-5 w-5 shrink-0 object-contain" /> : null}
      <span className="min-w-0 leading-5">{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <span className="self-center text-[#4d4a46]" aria-hidden>
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </span>
  );
}

const flow = 'flex flex-col items-stretch gap-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center';

function ChainLogoDiagram({ balance }: { balance?: boolean }) {
  return (
    <div className={flow}>
      <DiagramNode src="/brand/tapt-mark.jpg" label="TapT" />
      <Arrow />
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        {chainMarks.map((chain) => (
          <DiagramNode key={chain.label} src={chain.src} label={`${chain.label} ${chain.detail}`} />
        ))}
      </div>
      {balance ? (
        <>
          <Arrow />
          <DiagramNode label="House balance" />
        </>
      ) : null}
    </div>
  );
}

function TraderModeDiagram() {
  const modes = [
    {
      name: 'Classic',
      steps: ['Choose Higher or Lower', 'Wait for the window to end', 'Win on the correct side of the open'],
      visual: (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#ccff00] py-3 text-center text-sm text-[#110e08]">▲ Higher</div>
          <div className="rounded-xl border border-[#ff5c5c]/50 py-3 text-center text-sm text-[#ff5c5c]">▼ Lower</div>
        </div>
      ),
    },
    {
      name: 'Box',
      steps: ['Tap a tile on the grid', 'The tile shows its multiplier', 'Win when the price line enters it'],
      visual: (
        <div className="grid grid-cols-4 gap-1.5">
          {['1.4×', '2.1×', '3.6×', '1.8×', '1.2×', '4.8×', '2.4×', '1.6×'].map((mult, i) => (
            <div
              key={mult}
              className={`rounded-md py-2 text-center text-[11px] ${i === 5 ? 'bg-[#ccff00] text-[#110e08]' : 'border border-[#2a2a2a] text-[#9a9590]'}`}
            >
              {mult}
            </div>
          ))}
        </div>
      ),
    },
    {
      name: 'Draw',
      steps: ['Draw a band on the chart', 'Confirm the stake', 'Win when the close is inside'],
      visual: (
        <div className="relative h-[88px] rounded-xl border border-[#2a2a2a]">
          <div className="absolute left-[18%] top-[22%] h-10 w-[46%] rounded-md border-2 border-[#ccff00] bg-[#ccff00]/10" />
          <div className="absolute bottom-3 left-3 right-3 h-px bg-[#4d4a46]" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3 lg:grid-cols-3">
        {modes.map((mode) => (
          <div key={mode.name} className="rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">{mode.name}</p>
            <div className="mt-4">{mode.visual}</div>
            <ol className="mt-4 space-y-2">
              {mode.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-2 text-sm text-white">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#2a2a2a] text-[11px] text-[#9a9590]">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#ccff00] bg-[#141414] px-4 py-3 text-center text-sm text-white">
        A win pays stake × multiplier. A miss pays zero.
      </div>
    </div>
  );
}

function MarketStrip() {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {marketMarks.map((mark) => (
        <div key={mark.label} className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-sm text-white">
          <img src={mark.src} alt="" className="h-5 w-5 object-contain" />
          <span>{mark.label}</span>
        </div>
      ))}
    </div>
  );
}

function PriceDiagram() {
  const steps = [
    { label: 'Robinhood Chainlink', src: '/partners/robinhood.svg', extra: '/logos/chainlink-link-logo.png' },
    { label: 'Hyperliquid', src: '/logos/companies/hyperliquid.png' },
    { label: 'Public quotes' },
  ];
  return (
    <div className={flow}>
      {steps.map((step, index) => (
        <div key={step.label} className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          {index > 0 ? <Arrow /> : null}
          <DiagramNode src={step.src} extra={step.extra} label={step.label} />
        </div>
      ))}
      <Arrow />
      <DiagramNode src="/brand/tapt-mark.jpg" label="Chart and settlement" />
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className={flow}>
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-center">
        <DiagramNode label="Wallet" />
        <Arrow />
        <DiagramNode src="/brand/tapt-mark.jpg" label="TapT client" />
        <Arrow />
        <DiagramNode label="Trade and balance routes" />
      </div>
      <Arrow />
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <DiagramNode src="/logos/companies/postgresql.svg" label="Postgres" />
        <DiagramNode label="Price pipeline" />
        <DiagramNode label="Chain treasuries" />
      </div>
      <Arrow />
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        {chainMarks.map((chain) => (
          <DiagramNode key={chain.label} src={chain.src} label={chain.label} />
        ))}
      </div>
    </div>
  );
}

const sections: Array<{ id: string; title: string; body: string[]; mermaid?: string; logo?: 'modes' | 'chains' | 'markets' | 'balance' | 'prices' | 'architecture' }> = [
  {
    id: 'product',
    title: '1. Product',
    body: [
      'TapT is a short-chart desk. A round lasts 5, 10, 15, 30, or 60 seconds. The chart shows a live price, the player takes a position from the house balance, and the round settles against that price.',
      'There are three trader modes: Classic, Box, and Draw. Each one takes the stake from the house balance and pays the stake times the multiplier on a win.',
      'The chart can show a 20-period moving average, Bollinger bands, the Alligator, and a 14-period RSI. Those lines are drawn from the same ticks as the price path.',
    ],
  },
  {
    id: 'modes',
    title: '2. Trader modes',
    body: [
      'Classic is a direction call. The player chooses Higher or Lower, sets the window to 5, 10, 15, 30, or 60 seconds, and stakes from the house balance. The open price is the price when the round starts. Higher wins when the close is above that open. Lower wins when the close is below it. A tie pays zero. The multiplier is 1.75× at 5 seconds, 1.80× at 10, 1.85× at 15, 1.90× at 30, and 1.95× at 60.',
      'Box is a tile on the live grid. Each tile already shows its multiplier, which is higher when the tile sits farther from the current price. The player taps a tile. The round wins when the price line enters that tile, inside its price band. Blitz is a timed boost on eligible Box tiles. It raises the multiplier on those tiles after an on-chain entry fee in that chain’s play asset.',
      'Draw is a band the player marks on the chart. They draw the rectangle, confirm the stake, and the round runs to the end of that band. It wins when the close price is still inside the band they drew.',
    ],
    logo: 'modes',
  },
  {
    id: 'chains',
    title: '3. Chains',
    body: [
      'Five networks are live, in this connect order: Robinhood Chain, Solana, Base, Arbitrum, Tempo.',
      'Robinhood Chain and Arbitrum settle in ETH. Solana settles in native SOL. Base settles in USDC. Tempo settles in OUSD, and a Tempo transfer carries a memo that identifies the recipient. Each network has its own treasury. A deposit is credited to the house balance after the transfer is confirmed. A withdrawal is paid back from that treasury to the same wallet.',
      'Solana opens Phantom or Backpack. Robinhood Chain, Base, Arbitrum, and Tempo open the EVM wallet list. Solana transfers include a priority fee so they still land when the network is busy.',
    ],
    logo: 'chains',
  },
  {
    id: 'markets',
    title: '4. Markets',
    body: [
      'The same desk prices crypto, stocks, metals, and FX. Crypto includes BTC, ETH, and SOL. Stocks include names such as AAPL, NVDA, and TSLA. Metals include gold and silver. FX includes pairs such as EUR, GBP, and JPY.',
      'A market with no live quote stays blank. The chart does not invent a price for it.',
    ],
    logo: 'markets',
  },
  {
    id: 'round',
    title: '5. A round',
    body: [
      'The player picks an asset, a mode, a duration, and a stake. The stake comes off the house balance for the connected chain. The price is read on the chart. A win is credited back to that same balance. The stake is not sent on-chain for each round.',
      'Classic wins when the close is on the chosen side of the open. Draw wins when the close is inside the band the player marked. Box wins when the live price enters the chosen tile. A winning payout is the stake times the multiplier on that position. A loss pays zero.',
    ],
    mermaid: `sequenceDiagram
    participant W as Wallet
    participant UI as TapT
    participant API as House balance
    participant PF as Price
    W->>UI: Choose asset, mode, and stake
    UI->>API: Debit the house balance
    UI->>PF: Read the live price
    PF-->>UI: Price through the window
    UI->>API: Credit the payout on a win
    API-->>UI: Updated balance`,
  },
  {
    id: 'balance',
    title: '6. House balance',
    body: [
      'The house balance is the amount TapT holds for that wallet on that chain. Robinhood Chain and Arbitrum balances are ETH. Solana is SOL. Base is USDC. Tempo is OUSD. A wallet can hold a balance on more than one chain, and each one is settled on its own.',
      'Deposits and withdrawals charge 1% on Free, 0.9% on Standard, and 0.8% on VIP. The fee is taken from the amount. The rest is credited on deposit, or sent to the wallet on withdrawal. Withdrawals at or under $10 complete immediately on every chain. Anything above $10 waits for review before the treasury sends it.',
    ],
    logo: 'balance',
  },
  {
    id: 'prices',
    title: '7. Prices',
    body: [
      'Each asset is filled from the first source that returns a live price. Stocks use the Chainlink feed on Robinhood Chain. Anything still missing uses Hyperliquid mids, then public quotes. The chart asks about once a second. If a request fails, it keeps the last good price.',
      'An asset with no price stays blank. A round is not settled against a blank quote.',
    ],
    logo: 'prices',
  },
  {
    id: 'architecture',
    title: '8. Architecture',
    body: [
      'The desk is a Next.js app. The trade engine, the chart, and the house ledger are shared. Each chain has its own deposit check, treasury payout, and explorer link.',
      'Balances, rounds, withdrawals, and referrals live in Postgres. The client can request a deposit, a round, or a withdrawal. It cannot write the ledger itself. Admin actions use a separate signed session.',
    ],
    logo: 'architecture',
  },
  {
    id: 'security',
    title: '9. Security',
    body: [
      'Wallet addresses are stored in one canonical form so the same wallet does not split into two balances. A banned wallet is blocked from deposits, rounds, and withdrawals.',
      'Robinhood Chain, Base, Arbitrum, and Tempo withdrawals include a signed message with the address, amount, asset, and time. The server rejects a signature older than five minutes. Solana payouts are sent from the Solana treasury to the connected wallet.',
      'The database denies public writes. Privileged updates run on the server. API access is limited to tapt.fun, and the page cannot be embedded.',
    ],
  },
];

const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, (typeof sections)[number]>;

const groupedFlow = [
  { title: 'The desk', ids: ['product', 'modes', 'chains', 'markets'] },
  { title: 'How a round works', ids: ['round', 'balance', 'prices'] },
  { title: 'System', ids: ['architecture', 'security'] },
];

const chip =
  'inline-flex h-9 items-center rounded-full border border-[#2a2a2a] px-3 text-xs text-[#9a9590] transition hover:border-[#ccff00] hover:text-white';

export default function LitepaperPage() {
  return (
    <div className="lp-wide bg-black text-white">
      <div className="rh-container py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">Technical document</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="rh-display text-[clamp(2.4rem,5vw,4.25rem)] text-white">Litepaper</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/trade" className="neon-btn h-9 px-4 text-sm">Launch</Link>
            <a href="https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing" target="_blank" rel="noreferrer" className={chip}>Pitch deck</a>
            <a href="https://x.com/TapT_fun" target="_blank" rel="noreferrer" className={chip}>X</a>
            <a href="https://t.me/tapt_fun" target="_blank" rel="noreferrer" className={chip}>Telegram</a>
            <a href={PROJECT_GITHUB} target="_blank" rel="noreferrer" className={chip}>GitHub</a>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-[#9a9590]">
          How TapT prices a tick, settles a round, and pays the house balance on the five chains in the app.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {chains.map((chain) => (
            <div key={chain.name} className="panel flex items-center gap-4 p-5">
              <img src={chain.src} alt="" className="h-10 w-10 shrink-0 object-contain" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">{chain.asset}</p>
                <p className="mt-1 text-lg text-white">{chain.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chain.wallets.map((wallet) => (
                    <span key={wallet.name} className="inline-flex items-center gap-1.5 text-sm text-[#9a9590]">
                      <img src={wallet.src} alt="" className="h-4 w-4 object-contain" />
                      {wallet.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            ['Timeframes', '5s · 10s · 15s · 30s · 60s'],
            ['Markets', 'Crypto, stocks, metals, FX'],
            ['Modes', 'Box, Draw, Classic, Blitz'],
            ['Settlement', 'House balance, then the treasury'],
          ].map(([k, v]) => (
            <div key={k} className="panel p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#4d4a46]">{k}</p>
              <p className="mt-2 text-sm leading-relaxed text-white">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid items-start gap-12 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">Contents</p>
            <div className="mt-5 space-y-6">
              {groupedFlow.map((group) => (
                <div key={group.title}>
                  <p className="text-xs text-[#4d4a46]">{group.title}</p>
                  <div className="mt-2 space-y-1.5">
                    {group.ids.map((id) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="block text-[15px] leading-6 text-[#9a9590] transition hover:text-[#ccff00]"
                      >
                        {sectionMap[id].title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-14">
            {groupedFlow.map((group) => (
              <section key={group.title}>
                <h2 className="border-t border-[#2a2a2a] pt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">{group.title}</h2>
                <div className="mt-6 space-y-4">
                  {group.ids.map((id) => {
                    const section = sectionMap[id];
                    return (
                      <article
                        key={section.id}
                        id={section.id}
                        className="panel scroll-mt-6 p-6 sm:p-8"
                      >
                        <h3 className="text-2xl font-medium text-white">{section.title}</h3>
                        <div className="mt-4 space-y-4">
                          {section.body.map((paragraph) => (
                            <p key={paragraph} className="text-base leading-7 text-[#9a9590]">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        {(section.mermaid || section.logo) && (
                          <div className="mt-6 min-w-0 rounded-xl border border-[#2a2a2a] bg-black p-3 sm:p-4">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#4d4a46]">Diagram</p>
                            {section.logo === 'modes' ? <TraderModeDiagram /> : null}
                            {section.logo === 'chains' ? <ChainLogoDiagram balance /> : null}
                            {section.logo === 'markets' ? <MarketStrip /> : null}
                            {section.logo === 'balance' ? <ChainLogoDiagram /> : null}
                            {section.logo === 'prices' ? <PriceDiagram /> : null}
                            {section.logo === 'architecture' ? <ArchitectureDiagram /> : null}
                            {section.mermaid ? <MermaidDiagram chart={section.mermaid} /> : null}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            <section className="panel p-6 sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">Builder</p>
              <div className="mt-4 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
                <img src="/logos/Amaan-Sayyad.jpg?v=2" alt="Amaan Sayyad" className="aspect-[4/5] w-full max-w-[240px] rounded-xl object-cover object-[center_18%]" loading="lazy" />
                <div>
                  <h3 className="text-2xl font-medium text-white">Amaan Sayyad</h3>
                  <p className="mt-3 text-base leading-7 text-[#9a9590]">
                    Builder of TapT.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing" target="_blank" rel="noreferrer" className={chip}>Pitch deck</a>
                    <a href="https://x.com/TapT_fun" target="_blank" rel="noreferrer" className={chip}>TapT on X</a>
                    <a href="https://github.com/AmaanSayyad/TapT" target="_blank" rel="noreferrer" className={chip}>GitHub</a>
                    <a href="https://t.me/tapt_fun" target="_blank" rel="noreferrer" className={chip}>Telegram</a>
                    <a href="https://linkedin.com/in/amaan-sayyad-/" target="_blank" rel="noreferrer" className={chip}>LinkedIn</a>
                    <a href="https://x.com/amaanbiz" target="_blank" rel="noreferrer" className={chip}>X</a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
