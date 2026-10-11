import { treasuryAddressFor, type EvmPlayNetwork } from '@/lib/chains/supported';

/** Blitz entry is $0.10 on every chain, paid in that chain's play token. */
export const BLITZ_ENTRY_USD = 0.1;

const STABLE_SYMBOLS = new Set(['USDC', 'OUSD']);

/** Token the wallet actually sends for a blitz entry on this network. */
export function blitzPaySymbol(network: string | null | undefined): string {
  switch (network) {
    case 'SOL': return 'SOL';
    case 'SUI': return 'SUI';
    case 'XLM': return 'XLM';
    case 'XTZ': return 'XTZ';
    case 'NEAR': return 'NEAR';
    case 'STRK': return 'STRK';
    case 'PUSH': return 'PC';
    case 'SOMNIA': return 'STT';
    case 'OCT': return 'OCT';
    case 'ZG': return '0G';
    case 'INIT': return 'INIT';
    case 'APT': return 'APT';
    case 'BNB': return 'BNB';
    case 'BASE': return 'USDC';
    case 'TEMPO': return 'OUSD';
    case 'ROBINHOOD':
    case 'ARB':
    default:
      return 'ETH';
  }
}

/**
 * Token units equal to $0.10. Stables are exactly 0.1.
 * Returns null when a non-stable price is missing so the wallet is not asked for a guessed amount.
 */
export function blitzTokenForUsd(
  network: string | null | undefined,
  prices: Record<string, number>,
): number | null {
  const symbol = blitzPaySymbol(network);
  const decimals = STABLE_SYMBOLS.has(symbol) ? 6 : 8;
  if (STABLE_SYMBOLS.has(symbol)) return BLITZ_ENTRY_USD;
  const price = prices[symbol];
  if (!Number.isFinite(price) || price <= 0) return null;
  const scale = 10 ** decimals;
  return Math.ceil((BLITZ_ENTRY_USD / price) * scale) / scale;
}

export function formatBlitzToken(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  const digits = amount >= 1 ? 4 : Math.min(8, Math.max(2, Math.ceil(-Math.log10(amount)) + 1));
  return amount.toFixed(digits).replace(/\.?0+$/, '');
}

/** House treasury for the connected chain. Blitz fees are paid here, not to the fee collector. */
export function blitzTreasury(network: string | null | undefined): string {
  switch (network) {
    case 'SOL':
      return (process.env.NEXT_PUBLIC_SOL_TREASURY_ADDRESS || '').trim();
    case 'ROBINHOOD':
    case 'BASE':
    case 'ARB':
    case 'TEMPO':
      return treasuryAddressFor(network as EvmPlayNetwork);
    case 'BNB':
      return (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').trim();
    case 'SUI':
      return (process.env.NEXT_PUBLIC_SUI_TREASURY_ADDRESS || '').trim();
    case 'XLM':
      return (process.env.NEXT_PUBLIC_STELLAR_TREASURY_ADDRESS || '').trim();
    case 'XTZ':
      return (process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS || '').trim();
    case 'NEAR':
      return (process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || '').trim();
    case 'STRK':
      return (process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || '').trim();
    case 'PUSH':
      return (process.env.NEXT_PUBLIC_PUSH_TREASURY_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').trim();
    case 'SOMNIA':
      return (process.env.NEXT_PUBLIC_SOMNIA_TREASURY_ADDRESS || '').trim();
    case 'ZG':
      return (process.env.NEXT_PUBLIC_ZG_TREASURY_ADDRESS || '').trim();
    case 'OCT':
      return (process.env.NEXT_PUBLIC_ONECHAIN_TREASURY_ADDRESS || '').trim();
    case 'INIT':
      return (process.env.NEXT_PUBLIC_INITIA_TREASURY_ADDRESS || '').trim();
    case 'APT':
      return (process.env.NEXT_PUBLIC_APTOS_TREASURY_ADDRESS || '').trim();
    default:
      return '';
  }
}
