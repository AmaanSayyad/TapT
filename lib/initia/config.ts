export const INITIA_CHAIN_ID = 'interwoven-1';
export const INITIA_DENOM = 'uinit';
export const INITIA_DECIMALS = 6;

export function getInitiaConfig() {
  return {
    chainId: INITIA_CHAIN_ID,
    rpcUrl: process.env.NEXT_PUBLIC_INITIA_RPC_URL || 'https://rpc.initia.xyz',
    restUrl: process.env.NEXT_PUBLIC_INITIA_REST_URL || 'https://rest.initia.xyz',
    treasuryAddress: process.env.NEXT_PUBLIC_INITIA_TREASURY_ADDRESS || '',
    denom: INITIA_DENOM,
    decimals: INITIA_DECIMALS,
  };
}

/** Convert human INIT amount → uinit integer string */
export function toUinit(amount: number): string {
  return Math.round(amount * 10 ** INITIA_DECIMALS).toString();
}

/** Convert uinit integer string → human INIT amount */
export function fromUinit(uinit: string | number): number {
  return Number(uinit) / 10 ** INITIA_DECIMALS;
}
