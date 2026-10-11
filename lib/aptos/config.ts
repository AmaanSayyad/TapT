/**
 * Aptos Mainnet Configuration
 */

export interface AptosConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  treasuryAddress: string;
  network: 'mainnet' | 'testnet' | 'devnet';
}

export const aptosMainnet: AptosConfig = {
  chainId: 1,
  chainName: "Aptos Mainnet",
  nativeCurrency: {
    name: "Aptos",
    symbol: "APT",
    decimals: 8,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_APTOS_MAINNET_RPC || "https://fullnode.mainnet.aptoslabs.com/v1"
  ],
  blockExplorerUrls: [
    "https://explorer.aptoslabs.com"
  ],
  treasuryAddress:
    process.env.NEXT_PUBLIC_APTOS_TREASURY_ADDRESS ||
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  network: 'mainnet',
};

export function getAptosConfig(): AptosConfig {
  return aptosMainnet;
}

export function getRpcUrl(): string {
  return aptosMainnet.rpcUrls[0];
}

export function getExplorerTxUrl(txHash: string): string {
  return `${aptosMainnet.blockExplorerUrls[0]}/txn/${txHash}?network=mainnet`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${aptosMainnet.blockExplorerUrls[0]}/account/${address}?network=mainnet`;
}
