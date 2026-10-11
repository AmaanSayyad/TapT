/**
 * Admin treasury balance table: omit testnet / dev networks by default.
 * Set ADMIN_TREASURY_SHOW_TESTNET=true to include them (local debugging).
 */

export function adminTreasuryShowTestnets(): boolean {
  return process.env.ADMIN_TREASURY_SHOW_TESTNET === 'true';
}

function mainnetOnly(): boolean {
  return !adminTreasuryShowTestnets();
}

export function shouldQueryBnbTreasury(bnbNetwork: string): boolean {
  if (!mainnetOnly()) return true;
  return bnbNetwork === 'mainnet';
}

/** Push Donut integration in this repo is testnet-only (chain 42101). */
export function shouldQueryPushTreasury(): boolean {
  if (!mainnetOnly()) return true;
  return false;
}

export function shouldQuerySomniaTreasury(chainName: string): boolean {
  if (!mainnetOnly()) return true;
  return !/testnet|test net/i.test(chainName);
}

export function shouldQueryOneChainTreasury(rpc: string, explorerBase: string): boolean {
  if (!mainnetOnly()) return true;
  const s = `${rpc} ${explorerBase}`.toLowerCase();
  if (s.includes('testnet') || s.includes('devnet')) return false;
  return true;
}

export function shouldQuerySolanaTreasury(): boolean {
  if (!mainnetOnly()) return true;
  return (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') === 'mainnet-beta';
}

export function shouldQuerySuiTreasury(): boolean {
  if (!mainnetOnly()) return true;
  return (process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet') === 'mainnet';
}

export function shouldQueryStellarTreasury(network: string, horizonUrl: string): boolean {
  if (!mainnetOnly()) return true;
  const n = (network || 'public').toLowerCase();
  if (n !== 'public') return false;
  return !horizonUrl.toLowerCase().includes('testnet');
}

export function shouldQueryTezosTreasury(rpcUrl: string): boolean {
  if (!mainnetOnly()) return true;
  const u = rpcUrl.toLowerCase();
  return (
    !u.includes('ghostnet') &&
    !u.includes('jakartanet') &&
    !u.includes('kathmandunet') &&
    !u.includes('mondaynet') &&
    !u.includes('sandbox')
  );
}

export function shouldQueryStarknetTreasury(chainId: string): boolean {
  if (!mainnetOnly()) return true;
  const u = chainId.toUpperCase();
  return !u.includes('SEPOLIA') && !u.includes('GOERLI');
}

export function shouldQueryInitiaTreasury(): boolean {
  if (!mainnetOnly()) return true;
  const rest = (process.env.NEXT_PUBLIC_INITIA_REST_URL || '').toLowerCase();
  const rpc = (process.env.NEXT_PUBLIC_INITIA_RPC_URL || '').toLowerCase();
  return !rest.includes('testnet') && !rpc.includes('testnet');
}

export function shouldQueryZgTreasury(rpcUrl: string): boolean {
  if (!mainnetOnly()) return true;
  return !rpcUrl.toLowerCase().includes('testnet');
}
