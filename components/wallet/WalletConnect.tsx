'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useOverflowStore } from '@/lib/store';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useDisconnectWallet as useSuiDisconnect } from '@mysten/dapp-kit';
import { useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';

const CHAIN_MARK: Record<string, { name: string; asset: string; logo: string }> = {
  ROBINHOOD: { name: 'Robinhood', asset: 'ETH', logo: '/partners/robinhood.svg' },
  SOL: { name: 'Solana', asset: 'SOL', logo: '/logos/chains/solana.png' },
  BASE: { name: 'Base', asset: 'USDC', logo: '/logos/chains/base.png' },
  ARB: { name: 'Arbitrum', asset: 'ETH', logo: '/logos/chains/arbitrum.png' },
  TEMPO: { name: 'Tempo', asset: 'OUSD', logo: '/logos/chains/tempo.png' },
};

export function chainMark(network: string | null | undefined) {
  if (!network) return null;
  return CHAIN_MARK[network] ?? null;
}

function formatHouseBalance(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

export function useTapTDisconnect() {
  const { logout: logoutPrivy } = usePrivy();
  const { disconnect: disconnectSolana } = useSolanaWallet();
  const { mutate: disconnectSui } = useSuiDisconnect();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
  const { disconnect: disconnectInitia } = useInterwovenKit();
  const { disconnect: disconnectAptos } = useAptosWallet();
  const { network, disconnect: disconnectStore, setPreferredNetwork } = useOverflowStore();

  return () => {
    if (network === 'BNB' || network === 'ROBINHOOD' || network === 'BASE' || network === 'ARB' || network === 'TEMPO' || network === 'PUSH' || network === 'SOMNIA' || network === 'ZG') {
      logoutPrivy();
      wagmiDisconnect();
    } else if (network === 'SOL') {
      disconnectSolana();
    } else if (network === 'SUI') {
      disconnectSui();
    } else if (network === 'XLM') {
      import('@/lib/stellar/wallet-kit').then(m => m.disconnectWallet());
    } else if (network === 'STRK') {
      import('@/lib/starknet/wallet').then(m => m.disconnectStarknetWallet());
    } else if (network === 'OCT') {
      disconnectSui();
    } else if (network === 'INIT') {
      disconnectInitia();
    } else if (network === 'APT') {
      disconnectAptos();
    }
    disconnectStore();
    setPreferredNetwork(null);
  };
}

export const WalletConnect: React.FC = () => {
  const { ready } = usePrivy();
  const handleDisconnect = useTapTDisconnect();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { network, address, setConnectModalOpen, houseBalance, demoBalance, accountType } = useOverflowStore();
  const chain = chainMark(network);
  const houseAmount = accountType === 'demo' ? demoBalance : houseBalance;
  const houseLabel = `${formatHouseBalance(houseAmount)}${chain ? ` ${chain.asset}` : ''}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isConnected = !!address;

  if (!ready) {
    return (
      <div className="hidden h-10 w-24 animate-pulse rounded-full bg-white/5 sm:block" />
    );
  }

  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => setConnectModalOpen(true)}
        data-tour="connect-button"
        className="neon-btn inline-flex h-9 px-3.5 text-sm sm:h-10 sm:px-5"
      >
        Connect
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        data-tour="connect-button"
        aria-expanded={open}
        aria-label={chain ? `House balance ${houseLabel} on ${chain.name}` : `House balance ${houseLabel}`}
        onClick={() => setOpen((value) => !value)}
        className="teal-btn h-9 gap-2 pl-1 pr-2.5 text-sm sm:h-10 sm:pr-3"
      >
        {chain ? (
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-black">
            <img src={chain.logo} alt="" className="h-5 w-5 object-contain" />
          </span>
        ) : null}
        <span className="tabular-nums text-white">
          {formatHouseBalance(houseAmount)}
          {chain ? <span className="ml-1 text-[#9a9590]">{chain.asset}</span> : null}
        </span>
        <span className="hidden h-4 w-px bg-[#2a2a2a] sm:block" aria-hidden />
        <span className="hidden font-mono text-[13px] text-[#9a9590] sm:inline">{short}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[140] w-60 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3 px-2 py-2">
            {chain ? (
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-black">
                <img src={chain.logo} alt="" className="h-6 w-6 object-contain" />
              </span>
            ) : null}
            <span>
              <span className="block text-sm text-white">{chain?.name ?? 'Connected'}</span>
              <span className="block text-xs text-[#9a9590]">{chain ? `${chain.asset} · ${short}` : short}</span>
            </span>
          </div>
          <div className="mx-2 mb-1 rounded-xl bg-black px-3 py-2">
            <p className="text-[11px] text-[#9a9590]">House balance</p>
            <p className="mt-0.5 text-sm tabular-nums text-white">{houseLabel}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-1 flex h-10 items-center rounded-xl px-3 text-sm text-white hover:bg-white/5"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              handleDisconnect();
              setOpen(false);
            }}
            className="flex h-10 w-full items-center rounded-xl px-3 text-left text-sm text-[#ff5c5c] hover:bg-[#ff5c5c]/10"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
