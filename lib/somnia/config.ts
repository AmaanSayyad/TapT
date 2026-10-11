import type { Address } from 'viem';

export interface SomniaConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  treasuryAddress: Address | `0x${string}` | string;
  reactorAddress: Address | `0x${string}` | string;
  reactivityPrecompile: Address | `0x${string}` | string;
}

export const somniaTestnet: SomniaConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CHAIN_ID) || 50312,
  chainName: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CHAIN_NAME || 'Somnia Testnet',
  nativeCurrency: {
    name: 'Somnia Test Token',
    symbol: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CURRENCY_SYMBOL || 'STT',
    decimals: Number(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CURRENCY_DECIMALS) || 18,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC || 'https://dream-rpc.somnia.network'],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_SOMNIA_TESTNET_EXPLORER || 'https://shannon-explorer.somnia.network',
  ],
  treasuryAddress:
    (process.env.NEXT_PUBLIC_SOMNIA_TREASURY_ADDRESS as any) || '0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123',
  reactorAddress:
    (process.env.NEXT_PUBLIC_SOMNIA_REACTOR_ADDRESS as any) ||
    '0x2E3C3333E57f2aCEe8236A27a21718BeD39a94A1',
  reactivityPrecompile:
    (process.env.NEXT_PUBLIC_SOMNIA_REACTIVITY_PRECOMPILE as any) ||
    '0x0000000000000000000000000000000000000100',
};

export function getSomniaConfig(): SomniaConfig {
  return somniaTestnet;
}

export function getRpcUrl(): string {
  return somniaTestnet.rpcUrls[0];
}

export function getExplorerTxUrl(txHash: string): string {
  return `${somniaTestnet.blockExplorerUrls[0]}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${somniaTestnet.blockExplorerUrls[0]}/address/${address}`;
}

