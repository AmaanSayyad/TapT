'use client';

import React from 'react';
import { useOverflowStore } from '@/lib/store';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useModal } from 'connectkit';
import { useConnect, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { EVM_CHAINS, type EvmPlayNetwork } from '@/lib/chains/supported';
import type { EIP1193Provider } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type NetworkCode = 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | 'SOL';

const CHAINS: {
  code: NetworkCode;
  name: string;
  hint: string;
  badge: string;
  logo: string;
  well: string;
  img: string;
  wide?: boolean;
}[] = [
  {
    code: 'ROBINHOOD',
    name: 'Robinhood Chain',
    hint: 'ETH · MetaMask',
    badge: 'ETH',
    logo: '/partners/robinhood.svg',
    well: 'bg-[#110e08]',
    img: 'h-6 w-6 object-contain',
  },
  {
    code: 'SOL',
    name: 'Solana',
    hint: 'SOL · Phantom, Backpack',
    badge: 'SOL',
    logo: '/logos/chains/solana.png',
    well: 'bg-[#0b0b0f]',
    img: 'h-full w-full object-cover',
  },
  {
    code: 'BASE',
    name: 'Base',
    hint: 'USDC · Coinbase Wallet',
    badge: 'USDC',
    logo: '/logos/chains/base.png',
    well: 'bg-[#110e08]',
    img: 'h-full w-full object-contain',
  },
  {
    code: 'ARB',
    name: 'Arbitrum',
    hint: 'ETH · MetaMask',
    badge: 'ETH',
    logo: '/logos/chains/arbitrum.png',
    well: 'bg-[#0b0b0f]',
    img: 'h-full w-full object-cover',
  },
  {
    code: 'TEMPO',
    name: 'Tempo',
    hint: 'OUSD · fee in OUSD',
    badge: 'OUSD',
    logo: '/logos/chains/tempo.png',
    well: 'bg-black',
    img: 'h-full w-full object-cover',
  },
];

type EthereumWindow = Window & {
  ethereum?: EIP1193Provider & { isMetaMask?: boolean; providers?: Array<EIP1193Provider & { isMetaMask?: boolean }> };
};

function phoneBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** MetaMask’s in-app browser injects this. A normal phone browser does not. */
function metaMaskProvider(): EIP1193Provider | null {
  const ethereum = (window as EthereumWindow).ethereum;
  if (!ethereum) return null;
  const listed = ethereum.providers?.find((provider) => provider.isMetaMask);
  return listed ?? ethereum;
}

export const WalletConnectModal: React.FC = () => {
  const isOpen = useOverflowStore((state) => state.isConnectModalOpen);
  const setOpen = useOverflowStore((state) => state.setConnectModalOpen);
  const setPreferredNetwork = useOverflowStore((state) => state.setPreferredNetwork);
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const { setOpen: openConnectKit } = useModal();
  const { connect } = useConnect();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();

  const close = () => setOpen(false);

  const choose = (network: NetworkCode) => {
    setPreferredNetwork(network);
    close();
    if (network === 'SOL') {
      wagmiDisconnect();
      setTimeout(() => setSolanaModalVisible(true), 100);
      return;
    }
    // ConnectKit asks MetaMask 600ms after the tap, and MetaMask on a phone drops that.
    // WalletConnect is off, so the mobile deep link also has no request to deliver.
    const narrow = window.innerWidth < 820;
    const provider = metaMaskProvider();
    if ((phoneBrowser() || narrow) && provider) {
      const chainId = EVM_CHAINS[network as EvmPlayNetwork].chainId;
      const connector = injected({
        target: () => ({ id: 'metaMask', name: 'MetaMask', provider }),
      });
      void provider.request({ method: 'eth_requestAccounts' }).then(
        () => connect({ connector, chainId }),
        () => undefined,
      );
      return;
    }
    if (phoneBrowser() && !provider) {
      const target = window.location.href.replace(/^https?:\/\//, '');
      window.location.assign(`https://metamask.app.link/dapp/${target}`);
      return;
    }
    openConnectKit(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative flex max-h-[min(90dvh,640px)] w-full max-w-[26rem] flex-col overflow-y-auto rounded-3xl border border-[#2a2a2a] bg-[#0c0c0c] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between px-5 pb-3 pt-5">
              <div>
                <h2 className="text-[18px] font-medium tracking-tight text-white">Connect wallet</h2>
                <p className="mt-1 text-[13px] leading-5 text-[#9a9590]">
                  Pick where your balance lives. You can switch later.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9a9590] transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 px-3 pb-3">
              {CHAINS.map((chain) => (
                <button
                  key={chain.code}
                  type="button"
                  onClick={() => choose(chain.code)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-[#232323] bg-[#141414] px-3 py-2.5 text-left transition hover:border-[#ccff00] hover:bg-[#181818]"
                >
                  <span className={`flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${chain.wide ? 'w-[6.5rem] px-2' : 'w-11'} ${chain.well}`}>
                    <img src={chain.logo} alt="" className={chain.img} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-white">{chain.name}</span>
                      <span className="rounded-full bg-[#ccff00]/12 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#ccff00]">
                        {chain.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#9a9590]">{chain.hint}</p>
                  </div>
                  <span className="pr-1 text-lg leading-none text-[#4d4a46] transition group-hover:text-[#ccff00]">›</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
