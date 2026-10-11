import type { Address } from 'viem';

export interface ZGConfig {
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
}

export const zgMainnetConfig: ZGConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_ZG_MAINNET_CHAIN_ID) || 16661,
  chainName: process.env.NEXT_PUBLIC_ZG_MAINNET_NAME || '0G Mainnet',
  nativeCurrency: {
    name: '0G Token',
    symbol: process.env.NEXT_PUBLIC_ZG_MAINNET_CURRENCY_SYMBOL || '0G',
    decimals: 18,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_ZG_MAINNET_RPC || 'https://evmrpc.0g.ai'],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_ZG_MAINNET_EXPLORER || 'https://chainscan.0g.ai',
  ],
  treasuryAddress:
    (process.env.NEXT_PUBLIC_ZG_TREASURY_ADDRESS as any) || '',
};

export function getZGConfig(): ZGConfig {
  return zgMainnetConfig;
}

export function getRpcUrl(): string {
  return zgMainnetConfig.rpcUrls[0];
}

export function getExplorerTxUrl(txHash: string): string {
  return `${zgMainnetConfig.blockExplorerUrls[0]}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${zgMainnetConfig.blockExplorerUrls[0]}/address/${address}`;
}
