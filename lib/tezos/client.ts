/**
 * Tezos Client Utils
 * Handles Tezos balance fetching and wallet interactions using Taquito
 * Uses dynamic import so the build does not require @taquito/taquito to be resolved at bundle time.
 */

const RPC_URL = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://rpc.tzkt.io/mainnet';

/**
 * TzKT REST base URL for the same network as {@link RPC_URL}.
 * Mainnet indexer cannot see Ghostnet ops (and vice versa).
 */
export function getTezosTzktApiBase(): string {
  const explicit = process.env.TEZOS_TZKT_API_URL || process.env.NEXT_PUBLIC_TEZOS_TZKT_API_URL;
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, '');
  const rpc = RPC_URL.toLowerCase();
  if (/\bghostnet\b/.test(rpc) || rpc.includes('/ghostnet')) {
    return 'https://api.ghostnet.tzkt.io';
  }
  return 'https://api.tzkt.io';
}

/**
 * Get a TezosToolkit instance configured with the RPC URL.
 */
export const getTezosClient = async () => {
    const { TezosToolkit } = await import('@taquito/taquito');
    return new TezosToolkit(RPC_URL);
};

/**
 * Get XTZ balance for an address
 * @param address Tezos address (tz1...)
 * @returns Balance in XTZ
 */
export const getXTZBalance = async (address: string): Promise<number> => {
    try {
        const { TezosToolkit } = await import('@taquito/taquito');
        const tezos = new TezosToolkit(RPC_URL);
        const balance = await tezos.tz.getBalance(address);
        // Balance is in mutez (1 XTZ = 1,000,000 mutez)
        return balance.toNumber() / 1000000;
    } catch (error) {
        console.error('Error fetching Tezos balance:', error);
        return 0;
    }
};

/**
 * Check if an address is a valid Tezos address
 */
export const isValidTezosAddress = (address: string): boolean => {
    return /^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(address);
};
