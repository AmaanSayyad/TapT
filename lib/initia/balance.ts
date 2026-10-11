/**
 * Fetch INIT balance for a bech32 Initia address.
 * Proxied through Next.js API to avoid CORS issues with rest.initia.xyz.
 */
import { fromUinit } from './config';

export async function getINITBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`/api/initia/balance?address=${encodeURIComponent(address)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    const amount = data?.balance?.amount ?? '0';
    return fromUinit(amount);
  } catch {
    return 0;
  }
}
