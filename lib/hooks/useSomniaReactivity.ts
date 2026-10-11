'use client';

import { useCallback, useEffect, useRef } from 'react';
import { formatEther, getAddress } from 'viem';
import { useOverflowStore } from '@/lib/store';
import { useToastStore } from '@/lib/hooks/useToast';
import { subscribeToReactorEvents, type ConfirmedTreasuryEvent } from '@/lib/somnia/reactivity';
import { getExplorerTxUrl, getSomniaConfig } from '@/lib/somnia/config';

const REFETCH_DEBOUNCE_MS = 600;
const BACKLOG_IGNORE_SECONDS = 60;

export function useSomniaReactivity() {
  const { address, network, fetchBalance, refreshWalletBalance } = useOverflowStore();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  const handleEvent = useCallback(
    (event: ConfirmedTreasuryEvent) => {
      if (!address) return;
      if (network !== 'SOMNIA') return;

      try {
        if (getAddress(event.user) !== getAddress(address)) return;
      } catch {
        return;
      }

      // Ignore backlogged events
      if (Date.now() / 1000 - event.reactedAt > BACKLOG_IGNORE_SECONDS) {
        return;
      }

      const amountStr = parseFloat(formatEther(event.amount)).toFixed(4);
      const isDeposit = event.type === 'deposit_confirmed';

      const dedupeKey = `${event.type}-${amountStr}`;
      const nowSec = Date.now() / 1000;
      const last = lastEventRef.current;
      if (last.key === dedupeKey && Math.abs(nowSec - last.time) < 20) return;
      lastEventRef.current = { key: dedupeKey, time: nowSec };

      const label = isDeposit ? 'Deposit confirmed on-chain' : 'Withdrawal confirmed on-chain';
      const links = event.txHash
        ? [{
            label: `Tx ${event.txHash.slice(0, 10)}…${event.txHash.slice(-6)}`,
            href: getExplorerTxUrl(event.txHash),
          }]
        : undefined;
      useToastStore.getState().addToast(`${label} · ${amountStr} STT`, 'success', links);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchBalance(address);
        refreshWalletBalance();
      }, REFETCH_DEBOUNCE_MS);
    },
    [address, network, fetchBalance, refreshWalletBalance]
  );

  useEffect(() => {
    if (!address) return;
    if (network !== 'SOMNIA') return;

    const { reactorAddress } = getSomniaConfig();
    if (!reactorAddress) return;

    let active = true;

    subscribeToReactorEvents(
      reactorAddress as `0x${string}` as any,
      (event) => {
        if (!active) return;
        handleEvent(event);
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Somnia Reactivity] subscription error:', err.message);
        }
      }
    )
      .then((unsub) => {
        if (!active) {
          unsub();
          return;
        }
        unsubscribeRef.current = unsub;
      })
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Somnia Reactivity] failed to subscribe:', err.message);
        }
      });

    return () => {
      active = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [address, network, handleEvent]);
}

