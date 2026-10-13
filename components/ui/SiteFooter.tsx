import Link from 'next/link';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
  logo?: string;
};

const PRODUCT: FooterLink[] = [
  { href: '/trade', label: 'Trade' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/#questions', label: 'FAQ' },
];

const PLATFORM: FooterLink[] = [
  { href: '/litepaper', label: 'Litepaper' },
  { href: 'https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing', label: 'Pitch deck', external: true },
  { href: 'https://youtu.be/1guno3_jB_Y', label: 'Pitch video', external: true },
  { href: 'https://youtu.be/mG0AfMT4qhY', label: 'Demo video', external: true },
  { href: 'https://github.com/AmaanSayyad/TapT', label: 'GitHub', external: true },
];

const RESOURCES: FooterLink[] = [
  { href: 'https://docs.robinhood.com/chain/', label: 'Chain docs', logo: '/partners/robinhood.svg', external: true },
  { href: 'https://docs.arbitrum.io/', label: 'Arbitrum docs', logo: '/partners/arbitrum.png', external: true },
  { href: 'https://docs.base.org/', label: 'Base docs', logo: '/logos/chains/base.png', external: true },
  { href: 'https://robinhoodchain.blockscout.com', label: 'Robinhood explorer', logo: '/partners/robinhood.svg', external: true },
  { href: 'https://basescan.org', label: 'Base', external: true },
  { href: 'https://solscan.io', label: 'Solana', external: true },
];

const COMMUNITY: FooterLink[] = [
  { href: 'https://x.com/TapT_fun', label: 'X', external: true },
  { href: 'https://t.me/tapt_fun', label: 'Telegram', external: true },
];

function LinkMark({ logo }: { logo?: string }) {
  if (!logo) return null;
  if (logo.endsWith('.svg') && !logo.includes('/logos/ticker/')) {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#110e08]/90 ring-1 ring-black/20">
        <img src={logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" aria-hidden />
      </span>
    );
  }
  return <img src={logo} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-[5px] object-cover" aria-hidden />;
}

function Col({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="mb-4 text-[15px] font-medium text-[#110e08]">{title}</p>
      <ul className="space-y-2.5">
        {links.map((item) => {
          const className = 'inline-flex items-center gap-2 text-[14px] text-[#110e08]/85 transition-colors hover:text-[#110e08]';
          const content = (
            <>
              <LinkMark logo={item.logo} />
              <span>{item.label}</span>
            </>
          );
          return (
            <li key={`${item.href}-${item.label}`}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                  {content}
                </a>
              ) : (
                <Link href={item.href} className={className}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chip({ href, label, logo, internal }: { href: string; label: string; logo?: string; internal?: boolean }) {
  const className = 'inline-flex items-center gap-2 rounded-full bg-[#110e08] px-3 py-1.5 text-[13px] font-medium text-[#ccff00] ring-1 ring-black/25';
  const content = (
    <>
      {logo ? <img src={logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" aria-hidden /> : null}
      <span>{label}</span>
    </>
  );
  if (internal) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-[#ccff00] text-[#110e08]">
      <div className="rh-container pb-12 pt-10 sm:pb-14 sm:pt-12">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/brand/tapt-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <span className="text-[17px] font-medium">TapT.fun</span>
          </Link>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Chip href="/trade" label="Trade" internal />
              <Chip href="/litepaper" label="Litepaper" internal />
              <Chip href="https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing" label="Pitch deck" />
              <Chip href="https://youtu.be/1guno3_jB_Y" label="Pitch video" />
              <Chip href="https://youtu.be/mG0AfMT4qhY" label="Demo video" />
              <Chip href="https://github.com/AmaanSayyad/TapT" label="GitHub" />
              <Chip href="https://x.com/TapT_fun" label="X" />
              <Chip href="https://t.me/tapt_fun" label="Telegram" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px] text-[#110e08]/70">Built on</span>
              <Chip href="https://robinhood.com/us/en/chain/" label="Robinhood Chain" logo="/partners/robinhood.svg" />
              <Chip href="https://solana.com/" label="Solana" logo="/logos/chains/solana.png" />
              <Chip href="https://www.base.org/" label="Base" logo="/logos/chains/base.png" />
              <Chip href="https://arbitrum.io/" label="Arbitrum" logo="/partners/arbitrum.png" />
              <Chip href="https://tempo.xyz/" label="Tempo" logo="/logos/chains/tempo.png" />
            </div>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-10">
          <Col title="Product" links={PRODUCT} />
          <Col title="Platform" links={PLATFORM} />
          <Col title="Resources" links={RESOURCES} />
          <Col title="Community" links={COMMUNITY} />
        </div>

        <div className="max-w-4xl space-y-3 border-t border-[#110e08]/20 pt-8 text-[12px] leading-relaxed text-[#110e08]/75">
          <p>
            TapT is a short-chart desk for crypto, stocks, metals, and FX. Rounds run from 5 seconds to 1 minute and settle from the house balance.
          </p>
          <p>
            Crypto and tokenized assets involve significant risk and can result in loss of capital. Nothing on this site is financial advice. TapT is an independent project and is not affiliated with or endorsed by Robinhood Markets, Inc. unless explicitly stated.
          </p>
          <p className="pt-1 text-[#110e08]/55">© {new Date().getFullYear()} TapT.fun</p>
        </div>
      </div>

      <div className="overflow-hidden select-none" aria-hidden>
        <p className="whitespace-nowrap px-3 pb-2 text-[clamp(2.75rem,11vw,8rem)] font-bold leading-[0.85] tracking-[-0.04em] text-[#110e08] sm:px-5 sm:pb-4">
          TapT.fun
        </p>
      </div>
    </footer>
  );
}
