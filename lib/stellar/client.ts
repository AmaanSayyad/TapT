/**
 * Stellar (XLM) client – balance and account helpers
 */

import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_HORIZON_URL } from './config';

let server: Horizon.Server | null = null;

function getServer(): Horizon.Server {
  if (!server) {
    server = new Horizon.Server(STELLAR_HORIZON_URL);
  }
  return server;
}

/**
 * Get native XLM balance for a Stellar address (mainnet)
 */
export async function getXLMBalance(address: string): Promise<number> {
  if (!address) return 0;

  try {
    const account = await getServer().loadAccount(address);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    if (!nativeBalance || typeof nativeBalance.balance !== 'string') return 0;
    return parseFloat(nativeBalance.balance);
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const res = (error as { response?: { status?: number } }).response;
      if (res?.status === 404) return 0;
    }
    console.warn(`Failed to get XLM balance for ${address}:`, error);
    return 0;
  }
}
