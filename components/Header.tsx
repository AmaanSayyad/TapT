'use client';

import React, { useState } from 'react';
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

  return (
    <header className="relative z-[100] shrink-0 bg-black pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 w-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/brand/tapt-mark.jpg" alt="" className="h-7 w-7 rounded-[7px]" />
          <span className="hidden text-[15px] font-medium text-white/90 sm:inline">TapT</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-tour={link.href === '/leaderboard' ? 'board-link' : undefined}
                className={`rounded-full px-2.5 py-2 text-sm font-medium transition sm:px-3.5 ${active ? 'text-white' : 'text-[#9a9590] hover:text-white'}`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://docs.google.com/presentation/d/1fU8I2s4G7NfGJGbwYn-6qHP0JO45BBTLO-1hhKIBdzQ/edit?usp=sharing"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#9a9590] transition hover:text-white sm:px-3.5"
          >
            Deck
          </a>
          <a
            href="https://youtu.be/1guno3_jB_Y"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#9a9590] transition hover:text-white sm:px-3.5"
          >
            Pitch
          </a>
          <a
            href="https://youtu.be/mG0AfMT4qhY"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#9a9590] transition hover:text-white sm:px-3.5"
          >
            Demo
          </a>
          <a
            href="https://x.com/TapT_fun"
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#9a9590] transition hover:text-white sm:px-3.5"
          >
            X
          </a>
        </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
            <Link href="/trade" className="neon-btn h-10 px-4 text-sm">
              Launch
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
