/**
 * Single source for which `user_balances.currency` row to use for house ledger
 * (fetch, bet, deposit, withdraw). Keeps client paths aligned with Supabase.
 */

export function resolveHouseLedgerCurrency(params: {
  network: string;
  selectedCurrency: string | null | undefined;
  userAddress?: string | null;
}): string {
  const network = params.network || 'ROBINHOOD';
  const selected = params.selectedCurrency;
  let currency =
    network === 'SOL'
      ? 'SOL'
      : (network === 'SUI' && selected)
        ? selected
        : network === 'PUSH'
          ? 'PC'
          : network === 'SOMNIA'
            ? 'STT'
            : network === 'OCT'
              ? 'OCT'
              : network === 'ZG'
                ? '0G'
                : network === 'INIT'
                  ? 'INIT'
                  : network === 'ROBINHOOD'
                    ? 'ROBINHOOD'
                    : network === 'BASE'
                      ? 'USDC_BASE'
                      : network === 'ARB'
                        ? 'ARB'
                        : network === 'TEMPO'
                          ? 'OUSD'
                          : network;

  const addr = params.userAddress;
  if (addr && (addr.endsWith('.near') || addr.endsWith('.testnet'))) {
    currency = 'NEAR';
  } else if (addr && /^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(addr)) {
    currency = 'XTZ';
  }

  return currency;
}
