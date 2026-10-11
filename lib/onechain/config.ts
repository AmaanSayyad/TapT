/**
 * OneChain Network Configuration
 * Sui-compatible chain — native currency OCT
 */

export interface OneChainConfig {
  rpcEndpoint: string;
  treasuryAddress: string;
  octCoinType: string;
  decimals: number;
}

export function getOneChainConfig(): OneChainConfig {
  const rpcEndpoint =
    process.env.NEXT_PUBLIC_ONECHAIN_RPC || 'https://rpc-testnet.onelabs.cc';
  const treasuryAddress =
    process.env.NEXT_PUBLIC_ONECHAIN_TREASURY_ADDRESS || '';
  const octCoinType =
    process.env.NEXT_PUBLIC_ONECHAIN_OCT_COIN_TYPE || '0x2::oct::OCT';
  const decimals =
    Number(process.env.NEXT_PUBLIC_OCT_DECIMALS) || 9;

  return { rpcEndpoint, treasuryAddress, octCoinType, decimals };
}

export function getExplorerTxUrl(txHash: string): string {
  const base =
    process.env.NEXT_PUBLIC_ONECHAIN_EXPLORER ||
    'https://explorer-testnet.onechain.one';
  return `${base}/tx/${txHash}`;
}
