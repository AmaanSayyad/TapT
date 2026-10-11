import { defineChain } from 'viem';
import { arbitrum, base } from 'wagmi/chains';

/** Chains this build accepts. Robinhood Chain is first and is the default. */
export const SUPPORTED_NETWORKS = ['ROBINHOOD', 'BASE', 'ARB', 'TEMPO', 'SOL'] as const;
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

export function isSupportedNetwork(network: string | null | undefined): network is SupportedNetwork {
  return !!network && (SUPPORTED_NETWORKS as readonly string[]).includes(network);
}

/** House-ledger codes for the live chains. Older currencies stay in the database and stay off the admin desk. */
export const ENABLED_PLAY_CURRENCIES = ['ROBINHOOD', 'SOL', 'USDC_BASE', 'BASE', 'ARB', 'OUSD', 'TEMPO'] as const;

export function isEnabledPlayCurrency(code: string | null | undefined): boolean {
  const value = String(code ?? '').trim().toUpperCase();
  return (ENABLED_PLAY_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Robinhood Chain mainnet. Gas is ETH. Chain id 4663.
 * https://docs.robinhood.com/chain/connecting/
 */
export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Explorer',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
});

/**
 * Tempo mainnet. Fees are paid in a USD TIP-20. Chain id 4217.
 * RPC and explorer: https://tempo.xyz/developers/docs/quickstart/connection-details
 */
export const tempo = defineChain({
  id: 4217,
  name: 'Tempo',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
});

/** Base mainnet USDC. https://docs.x402.org/core-concepts/network-and-token-support */
export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/** Reads and receipts. https://docs.base.org/get-started/connect-to-base */
export const BASE_RPC = 'https://mainnet.base.org';

/** Signed transactions only. The public read endpoint is not the submission endpoint. */
export const BASE_SEQUENCER_RPC = 'https://mainnet-sequencer.base.org';

/** Tempo mainnet OUSD, the stablecoin Tempo recommends for payments. 6 decimals. */
export const TEMPO_OUSD = '0x20c0000000000000000000006a37da5c996874be' as const;

/** Live mainnet websocket. https://tempo.xyz/developers/docs/quickstart/connection-details */
export const TEMPO_WS = 'wss://rpc.tempo.xyz';

/**
 * Payments a receive policy blocks are credited here instead of the recipient.
 * https://tempo.xyz/developers/docs/guide/payments/configure-receive-policies
 */
export const TEMPO_RECEIVE_POLICY_GUARD = '0xB10C000000000000000000000000000000000000' as const;

/** Public Arbitrum One RPC. No SLA. Used when ARBITRUM_RPC_URL is empty. */
export const ARBITRUM_PUBLIC_RPC = 'https://arb1.arbitrum.io/rpc';

/**
 * Provider RPC for Arbitrum One reads and treasury sends.
 * Server prefers ARBITRUM_RPC_URL so the key stays off the client.
 * The browser can only see NEXT_PUBLIC_ARBITRUM_RPC_URL.
 */
export function arbitrumRpcUrl(): string {
  const server = process.env.ARBITRUM_RPC_URL?.trim();
  const client = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL?.trim();
  if (typeof window === 'undefined' && server) return server;
  return client || server || ARBITRUM_PUBLIC_RPC;
}

export type EvmPlayNetwork = 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO';

export interface EvmChainSpec {
  network: EvmPlayNetwork;
  chainId: number;
  name: string;
  symbol: string;
  rpc: string;
  explorer: string;
  /** Ledger currency stored in Supabase. Kept distinct so the same ticker on two chains does not share one balance. */
  currency: string;
  treasuryEnv: string;
  secretEnv: string;
  /** When set, deposits are this token, not the native gas coin. */
  token?: { address: `0x${string}`; decimals: number };
}

export const EVM_CHAINS: Record<EvmPlayNetwork, EvmChainSpec> = {
  ROBINHOOD: {
    network: 'ROBINHOOD',
    chainId: robinhood.id,
    name: 'Robinhood Chain',
    symbol: 'ETH',
    rpc: robinhood.rpcUrls.default.http[0],
    explorer: robinhood.blockExplorers.default.url,
    currency: 'ROBINHOOD',
    treasuryEnv: 'NEXT_PUBLIC_ROBINHOOD_TREASURY_ADDRESS',
    secretEnv: 'ROBINHOOD_TREASURY_SECRET_KEY',
  },
  BASE: {
    network: 'BASE',
    chainId: base.id,
    name: 'Base',
    symbol: 'USDC',
    rpc: BASE_RPC,
    explorer: 'https://basescan.org',
    currency: 'USDC_BASE',
    treasuryEnv: 'NEXT_PUBLIC_BASE_TREASURY_ADDRESS',
    secretEnv: 'BASE_TREASURY_SECRET_KEY',
    token: { address: BASE_USDC, decimals: 6 },
  },
  ARB: {
    network: 'ARB',
    chainId: arbitrum.id,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpc: arbitrumRpcUrl(),
    explorer: 'https://arbiscan.io',
    currency: 'ARB',
    treasuryEnv: 'NEXT_PUBLIC_ARBITRUM_TREASURY_ADDRESS',
    secretEnv: 'ARBITRUM_TREASURY_SECRET_KEY',
  },
  TEMPO: {
    network: 'TEMPO',
    chainId: tempo.id,
    name: 'Tempo',
    symbol: 'OUSD',
    rpc: tempo.rpcUrls.default.http[0],
    explorer: tempo.blockExplorers.default.url,
    currency: 'OUSD',
    treasuryEnv: 'NEXT_PUBLIC_TEMPO_TREASURY_ADDRESS',
    secretEnv: 'TEMPO_TREASURY_SECRET_KEY',
    token: { address: TEMPO_OUSD, decimals: 6 },
  },
};

export function evmChainForCurrency(currency: string): EvmChainSpec | null {
  const key = currency.toUpperCase();
  return (
    Object.values(EVM_CHAINS).find((chain) => chain.currency === key) ?? null
  );
}

const TREASURY_ADDRESS: Record<EvmPlayNetwork, string | undefined> = {
  ROBINHOOD: process.env.NEXT_PUBLIC_ROBINHOOD_TREASURY_ADDRESS,
  BASE: process.env.NEXT_PUBLIC_BASE_TREASURY_ADDRESS,
  ARB: process.env.NEXT_PUBLIC_ARBITRUM_TREASURY_ADDRESS,
  TEMPO: process.env.NEXT_PUBLIC_TEMPO_TREASURY_ADDRESS,
};

export function treasuryAddressFor(network: EvmPlayNetwork): string {
  return (TREASURY_ADDRESS[network] || '').trim();
}
