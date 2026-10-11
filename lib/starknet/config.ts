export type StarknetNetworkId = 'mainnet' | 'sepolia';

export interface StarknetConfig {
  rpcEndpoint: string;
  chainId: string;
  treasuryAddress: string;
  strkTokenAddress: string;
  /** Resolved from env; used for RPC fallbacks and defaults. */
  network: StarknetNetworkId;
}

/** STRK (ERC-20) on Starknet mainnet — official bridged token. */
export const STARKNET_STRK_MAINNET =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5d4f8b9e98e31f5f17d9d6c17d';

/** STRK on Starknet Sepolia — starknet-io/starknet-addresses bridged_tokens/sepolia.json */
export const STARKNET_STRK_SEPOLIA =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

/** `getChainId()` return values from starknet.js RpcProvider */
export const STARKNET_CHAIN_ID_HEX = {
  MAIN: '0x534e5f4d41494e',
  SEPOLIA: '0x534e5f5345504f4c4941',
} as const;

const DEFAULT_MAINNET_RPC = 'https://rpc.starknet.lava.build';
const DEFAULT_SEPOLIA_RPC = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_8';

function resolveStarknetNetworkId(): StarknetNetworkId {
  const net = (process.env.NEXT_PUBLIC_STARKNET_NETWORK || '').toLowerCase().trim();
  if (net === 'sepolia' || net === 'testnet') return 'sepolia';
  const chain = (process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID || '').toUpperCase().trim();
  if (chain === 'SN_SEPOLIA' || chain.includes('SEPOLIA')) return 'sepolia';
  return 'mainnet';
}

/**
 * STRK token contract for the chain the wallet reports (ignores a single global env token
 * so mainnet .env does not break Sepolia balances).
 */
export function getStrkTokenAddressForChainId(chainIdHex: string | null | undefined): string {
  const id = (chainIdHex || '').toLowerCase();
  if (id === STARKNET_CHAIN_ID_HEX.SEPOLIA.toLowerCase()) return STARKNET_STRK_SEPOLIA;
  return STARKNET_STRK_MAINNET;
}

export function getStarknetConfig(): StarknetConfig {
  const network = resolveStarknetNetworkId();
  if (network === 'sepolia') {
    return {
      rpcEndpoint: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || DEFAULT_SEPOLIA_RPC,
      chainId: process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID || 'SN_SEPOLIA',
      treasuryAddress: process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || '',
      strkTokenAddress: process.env.NEXT_PUBLIC_STARKNET_STRK_TOKEN_ADDRESS || STARKNET_STRK_SEPOLIA,
      network: 'sepolia',
    };
  }
  return {
    rpcEndpoint: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || DEFAULT_MAINNET_RPC,
    chainId: process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID || 'SN_MAIN',
    treasuryAddress: process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || '',
    strkTokenAddress: process.env.NEXT_PUBLIC_STARKNET_STRK_TOKEN_ADDRESS || STARKNET_STRK_MAINNET,
    network: 'mainnet',
  };
}
