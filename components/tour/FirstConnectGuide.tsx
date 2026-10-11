'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useModal } from 'connectkit';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useStore } from '@/lib/store';

const SEEN_KEY = 'tapt_guide_seen';

function seenAddresses(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map((item) => String(item).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

function remember(address: string) {
  const seen = seenAddresses();
  seen.add(address.toLowerCase());
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

/** Opens the trade guide the first time a wallet address connects in this browser. */
export function FirstConnectGuide() {
  const router = useRouter();
  const address = useStore((state) => state.address);
  const isConnected = useStore((state) => state.isConnected);
  const accountType = useStore((state) => state.accountType);
  const setIsTourOpen = useStore((state) => state.setIsTourOpen);
  const setConnectModalOpen = useStore((state) => state.setConnectModalOpen);
  const { setOpen: setConnectKitOpen } = useModal();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || accountType === 'demo' || address.startsWith('0xDEMO')) {
      pending.current = null;
      return;
    }

    const id = address.toLowerCase();
    if (seenAddresses().has(id) || pending.current === id) return;
    pending.current = id;

    const timer = window.setTimeout(() => {
      remember(id);
      setConnectModalOpen(false);
      setConnectKitOpen(false);
      setSolanaModalVisible(false);
      setIsTourOpen(true);
      if (window.location.pathname !== '/trade') router.push('/trade');
    }, 700);

    return () => {
      window.clearTimeout(timer);
      if (!seenAddresses().has(id)) pending.current = null;
    };
  }, [
    address,
    isConnected,
    accountType,
    router,
    setConnectKitOpen,
    setConnectModalOpen,
    setIsTourOpen,
    setSolanaModalVisible,
  ]);

  return null;
}
