import { getDefaultConfig } from 'connectkit';
import { createConfig, fallback, http, webSocket } from 'wagmi';
import { arbitrum, base, bsc } from 'wagmi/chains';
import { ARBITRUM_PUBLIC_RPC, EVM_CHAINS, TEMPO_WS, robinhood, tempo } from '@/lib/chains/supported';

/** Robinhood Chain is the first chain so wallets prompt for it before Base, Arbitrum, or Tempo. */
const wagmiGlobal = globalThis as typeof globalThis & { __taptWagmiConfig?: ReturnType<typeof createConfig> };

export const config = wagmiGlobal.__taptWagmiConfig ?? (wagmiGlobal.__taptWagmiConfig = createConfig(
  getDefaultConfig({
    chains: [robinhood, base, arbitrum, tempo, bsc],
    transports: {
      [robinhood.id]: http(EVM_CHAINS.ROBINHOOD.rpc),
      [base.id]: http(EVM_CHAINS.BASE.rpc),
      [arbitrum.id]: fallback(
        EVM_CHAINS.ARB.rpc === ARBITRUM_PUBLIC_RPC
          ? [http(ARBITRUM_PUBLIC_RPC)]
          : [http(EVM_CHAINS.ARB.rpc), http(ARBITRUM_PUBLIC_RPC)],
      ),
      [tempo.id]: fallback([webSocket(TEMPO_WS), http(EVM_CHAINS.TEMPO.rpc)]),
      [bsc.id]: http('https://bsc-dataseed.binance.org'),
    },
    enableFamily: false,
    // The saved project id is rejected by the relay ("Project not found") and the socket reconnects forever.
    // MetaMask and Coinbase still connect. Put a registered id here to turn WalletConnect back on.
    walletConnectProjectId: '',
    appName: 'TapT',
    appDescription: 'Binary options on Robinhood Chain, Base, Arbitrum, Tempo, and Solana',
    appUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    appIcon: typeof window !== 'undefined' ? `${window.location.origin}/brand/tapt-mark.jpg` : '/brand/tapt-mark.jpg',
  }),
));
