'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WalletConnect } from './wallet';
import { useStore } from '@/lib/store';

const links = [
  { href: '/trade', label: 'Trade' },
  { href: '/litepaper', label: 'Litepaper' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/referrals', label: 'Rewards' },
];

export function Header() {
  const [demoActivated, setDemoActivated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === '/';

  const {
    setAddress,
    setBalance,
    setIsConnected,
    toggleAccountType,
    accountType,
    accessCode,
    setIsTourOpen,
  } = useStore();

  const activateDemoMode = () => {
    if (accountType === 'demo') {
      toggleAccountType();
      setAddress(null);
      setIsConnected(false);
      return;
    }
    setAddress('0xDEMO_1234567890');
    setBalance(5000);
    setIsConnected(true);
    if (accountType === 'real') toggleAccountType();
    setDemoActivated(true);
    setTimeout(() => setDemoActivated(false), 2000);
  };

  const startGuide = () => {
    setIsTourOpen(true);
    if (pathname !== '/trade') router.push('/trade');
  };

  const closeMenu = () => setMenuOpen(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const nav = [
    ...links,
    { href: 'https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing', label: 'Deck', external: true },
    { href: 'https://youtu.be/1guno3_jB_Y', label: 'Pitch', external: true },
    { href: 'https://youtu.be/mG0AfMT4qhY', label: 'Demo', external: true },
    { href: 'https://x.com/TapT_fun', label: 'X', external: true },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full max-w-full shrink-0 overflow-x-clip bg-black pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-full min-w-0 max-w-full items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={closeMenu}>
          <img src="/brand/tapt-mark.png" alt="" className="h-7 w-7 rounded-[7px]" />
          <span className="hidden text-[15px] font-medium text-white/90 sm:inline">TapT</span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex sm:gap-1">
          {nav.map((link) => {
            const active = !('external' in link) && (pathname === link.href || pathname?.startsWith(`${link.href}/`));
            const className = `rounded-full px-2.5 py-2 text-sm font-medium transition sm:px-3.5 ${active ? 'text-white' : 'text-[#9a9590] hover:text-white'}`;
            if ('external' in link) {
              return (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={className}>
                  {link.label}
                </a>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.href === '/leaderboard' ? 'board-link' : undefined}
                className={className}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        </div>

        <div className="flex min-w-0 shrink items-center justify-end gap-1.5 sm:gap-2">
          {demoActivated && (
            <span className="text-[11px] font-medium text-[#ccff00]">Demo on</span>
          )}
          <button
            type="button"
            onClick={startGuide}
            className="hidden h-10 items-center rounded-full px-3 text-sm text-[#9a9590] transition hover:text-white sm:inline-flex"
          >
            Guide
          </button>
          {!onHome && accessCode !== null && (
            <button
              type="button"
              onClick={activateDemoMode}
              className="hidden h-10 items-center rounded-full px-3 text-sm text-[#9a9590] transition hover:text-white sm:inline-flex"
            >
              {accountType === 'demo' ? 'Exit demo' : 'Demo'}
            </button>
          )}
          <WalletConnect />
          {onHome && (
            <Link href="/trade" className="neon-btn h-9 shrink-0 px-3 text-sm sm:h-10 sm:px-4">
              Launch
            </Link>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#141414] text-white lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="flex w-[18px] flex-col gap-[5px]" aria-hidden>
              <span className={`block h-[2px] w-full origin-center rounded-full bg-white transition ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
              <span className={`block h-[2px] w-full rounded-full bg-white transition ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[2px] w-full origin-center rounded-full bg-white transition ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="absolute inset-x-0 top-full z-[120] max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-t border-[#2a2a2a] bg-black px-3 py-2 lg:hidden">
          {nav.map((link) => {
            const className = 'block rounded-xl px-3 py-3 text-[15px] text-white';
            if ('external' in link) {
              return (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={className} onClick={closeMenu}>
                  {link.label}
                </a>
              );
            }
            return (
              <Link key={link.href} href={link.href} className={className} onClick={closeMenu}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
