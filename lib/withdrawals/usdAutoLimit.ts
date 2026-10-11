import { fetchPythLatestPrices } from '@/lib/server/pythLatest';

/** Amounts at or under this USD value pay immediately. Anything above waits for review. */
export const AUTO_WITHDRAW_USD = 10;

const STABLE_USD: Record<string, number> = {
  USDC: 1,
  USDC_BASE: 1,
  OUSD: 1,
};

/** House-ledger currency to the chart asset that prices it. */
const PRICE_ASSET: Record<string, string> = {
  ROBINHOOD: 'ETH',
  ARB: 'ETH',
  SOL: 'SOL',
  BNB: 'BNB',
  SUI: 'SUI',
  XLM: 'XLM',
  XTZ: 'XTZ',
  NEAR: 'NEAR',
  STRK: 'STRK',
  APT: 'APT',
  INIT: 'INIT',
};

export function exceedsAutoWithdrawUsd(
  currency: string,
  amount: number,
  prices: Partial<Record<string, number>>,
): boolean {
  const stable = STABLE_USD[currency];
  const price = stable ?? prices[PRICE_ASSET[currency] || ''];
  if (!(typeof price === 'number' && price > 0)) return true;
  return amount * price > AUTO_WITHDRAW_USD;
}

export async function withdrawalExceedsTenUsd(currency: string, amount: number): Promise<boolean> {
  if (STABLE_USD[currency]) return exceedsAutoWithdrawUsd(currency, amount, {});
  const asset = PRICE_ASSET[currency];
  if (!asset) return true;
  try {
    const prices = await fetchPythLatestPrices([asset]);
    return exceedsAutoWithdrawUsd(currency, amount, prices);
  } catch {
    return true;
  }
}
