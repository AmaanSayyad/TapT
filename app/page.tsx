'use client';

import Link from 'next/link';
import { MusicPlayer } from '@/components/ui/MusicPlayer';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { LivePriceLine } from '@/components/ui/LivePriceLine';

const partners = [
  { name: 'Robinhood Chain', logo: '/partners/robinhood.svg', size: 'h-9' },
  { name: 'Solana', logo: '/logos/chains/solana.png', size: 'h-[3.25rem]' },
  { name: 'Base', logo: '/logos/chains/base.png', size: 'h-10' },
  { name: 'Arbitrum', logo: '/partners/arbitrum.png', size: 'h-11' },
  { name: 'Tempo', logo: '/logos/chains/tempo.png', size: 'h-[3.25rem]' },
];

const steps = [
  {
    n: '01',
    title: 'Connect a wallet',
    body: 'Pick a network and fund the house balance. Bets settle from that balance, so a round does not wait on a chain confirmation.',
  },
  {
    n: '02',
    title: 'Pick the chart',
    body: 'Trade crypto, stocks, metals, and FX. Classic is up or down. Box targets a range. Draw uses the zone you mark.',
  },
  {
    n: '03',
    title: 'Settle the tick',
    body: 'Rounds run from 5 seconds to 1 minute. The close uses the live mid, and a win pays back into the house balance.',
  },
];

const faqs = [
  {
    q: 'How does the house balance work?',
    a: 'You deposit to the treasury for the chain you selected. That credit shows up in the house balance so bets can open and settle without a transaction per round.',
  },
  {
    q: 'What can I trade?',
    a: 'Majors, listed stocks, metals, FX, and indexes. Prices come from Hyperliquid mids, with Binance and Yahoo filling names those books do not list.',
  },
  {
    q: 'What are the trade modes?',
    a: 'Classic is up or down. Box wins if the close lands in a price band. Draw wins if the close lands inside a zone you draw on the chart.',
  },
  {
    q: 'Where do deposits sit?',
    a: 'Deposits go to the treasury wallet for that network. Withdrawals are paid back from the same treasury.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-black text-white">
      <MusicPlayer />
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-black">
        <video
          className="absolute inset-0 hidden h-full w-full object-cover md:block"
          autoPlay
          muted
          loop
          playsInline
          poster="/brand/home/poster-desktop.jpeg"
        >
          <source src="/brand/home/HPTO_V3-Fade-Desktop.mp4" type="video/mp4" />
        </video>
        <video
          className="absolute inset-0 h-full w-full object-cover md:hidden"
          autoPlay
          muted
          loop
          playsInline
          poster="/brand/home/poster-mobile.jpeg"
        >
          <source src="/brand/home/HPTO_V3-Fade-Mobile.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black" />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-24 text-center">
          <p className="rh-display mb-4 text-[clamp(2.6rem,8vw,4.5rem)] text-[#ccff00]">TapT</p>
          <h1 className="mb-5 max-w-3xl text-[clamp(1.45rem,3.4vw,2.15rem)] font-medium leading-snug text-white">
            Predict the next tick.
          </h1>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-white/70">
            Short charts across crypto, stocks, metals, and FX. Connect a wallet, fund the house balance, and trade the move.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/trade" className="neon-btn h-12 px-8 text-[0.95rem]">Launch</Link>
            <Link href="/litepaper" className="ghost-btn h-12 px-7 text-[0.95rem]">Litepaper</Link>
            <a href="https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing" target="_blank" rel="noreferrer" className="ghost-btn h-12 px-7 text-[0.95rem]">Pitch deck</a>
            <a href="https://x.com/TapT_fun" target="_blank" rel="noreferrer" className="ghost-btn h-12 px-7 text-[0.95rem]">X</a>
          </div>
        </div>
        <div className="relative z-10">
          <LivePriceLine />
        </div>
      </section>

      <section className="bg-black">
        <div className="rh-container py-10">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-[#4d4a46]">
            Prices, wallets, and settlement rails
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {partners.map((p) => (
              <img key={p.name} src={p.logo} alt={p.name} className={`${p.size} w-auto object-contain`} />
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-black">
        <div className="rh-container py-24">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">How it works</p>
          <h2 className="rh-display mt-3 text-[clamp(2.2rem,5vw,3.75rem)] text-white">Fund. Mark. Settle.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#9a9590]">
            A house balance for fast rounds, with the price path drawn from public market mids.
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="border-t border-white/15 pt-6">
                <div className="inline-block rounded-full bg-[#ccff00] px-2.5 py-1 text-xs font-medium text-[#110e08]">{step.n}</div>
                <h3 className="mt-5 text-2xl font-medium text-white">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-[#9a9590]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black">
        <div className="rh-container grid gap-4 py-8 md:grid-cols-3">
          {[
            ['Classic', 'Up or down against the open. Fixed payout when the close agrees.'],
            ['Box', 'A price band. Higher payout when the close lands inside it.'],
            ['Draw', 'Your own zone on the chart. It wins if the close stays inside.'],
          ].map(([title, body]) => (
            <div key={title} className="panel p-6">
              <h3 className="text-xl font-medium text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9a9590]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="questions" className="bg-black">
        <div className="rh-container py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#ccff00]">Questions</p>
          <h2 className="rh-display mt-3 text-[clamp(2rem,4vw,3.5rem)] text-white">Straight answers</h2>
          <dl className="mt-12 grid gap-8 md:grid-cols-2">
            {faqs.map((item) => (
              <div key={item.q} className="border-t border-white/12 pt-5">
                <dt className="text-lg font-medium text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[#9a9590]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-black">
        <div className="rh-container py-20 text-center">
          <h2 className="rh-display text-[clamp(2.2rem,5vw,3.6rem)] text-white">Open the chart.</h2>
          <Link href="/trade" className="neon-btn mt-8 h-12 px-8 text-[0.95rem]">Launch</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
