import { ethers } from 'ethers';
import { getBNBConfig } from '@/lib/bnb/config';
import { getPushConfig } from '@/lib/push/config';
import { getSomniaConfig } from '@/lib/somnia/config';
import { getZGConfig } from '@/lib/zg/config';
import { evmChainForCurrency, TEMPO_OUSD, TEMPO_RECEIVE_POLICY_GUARD, treasuryAddressFor } from '@/lib/chains/supported';

export class TempoPaymentHeldError extends Error {
  constructor() {
    super('Tempo held this payment instead of delivering it to the treasury. It was not credited.');
    this.name = 'TempoPaymentHeldError';
  }
}

export async function verifyEvmDepositTx(
  txHash: string,
  userAddress: string,
  amount: number,
  currency: string
): Promise<boolean> {
  let rpc = '';
  let treasury = '';
  if (currency === 'BNB') {
    const cfg = getBNBConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'PC' || currency === 'PUSH') {
    const cfg = getPushConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'STT' || currency === 'SOMNIA') {
    const cfg = getSomniaConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else if (currency === '0G') {
    const cfg = getZGConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else {
    const spec = evmChainForCurrency(currency);
    if (!spec) return false;
    rpc = spec.rpc;
    treasury = treasuryAddressFor(spec.network);
    if (spec.token) {
      const delivered = await verifyTokenDeposit(rpc, treasury, spec.token.address, spec.token.decimals, txHash, userAddress, amount);
      if (delivered) return true;
      if (spec.network === 'BASE') return verifyBasePayDeposit(txHash, userAddress, amount);
      return false;
    }
  }

  if (!rpc || !treasury) return false;

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('RPC timeout')), ms))]);

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const [tx, receipt] = await Promise.all([
      withTimeout(provider.getTransaction(txHash), 12_000),
      withTimeout(provider.getTransactionReceipt(txHash), 12_000),
    ]);
    if (!tx || !receipt || receipt.status !== 1) return false;

    if (!tx.from || tx.from.toLowerCase() !== userAddress.toLowerCase()) return false;
    if (!tx.to || tx.to.toLowerCase() !== treasury.toLowerCase()) return false;

    const minWei = ethers.parseEther(amount.toString());
    return tx.value >= minWei;
  } catch (err) {
    console.error('[verifyEvmDepositTx] RPC error:', err);
    return false;
  }
}

/** Coinbase Wallet pay() returns a user-operation id. The USDC transfer is inside that receipt. */
async function verifyBasePayDeposit(txHash: string, userAddress: string, amount: number): Promise<boolean> {
  if (!txHash.startsWith('0x')) return false;
  const treasury = treasuryAddressFor('BASE');
  if (!treasury) return false;
  try {
    const { getPaymentStatus } = await import('@base-org/account/payment/browser');
    const status = await getPaymentStatus({ id: txHash, testnet: false, telemetry: false });
    if (status.status !== 'completed' || !status.sender || !status.recipient || !status.amount) return false;
    if (status.sender.toLowerCase() !== userAddress.toLowerCase()) return false;
    if (status.recipient.toLowerCase() !== treasury.toLowerCase()) return false;
    const paid = ethers.parseUnits(status.amount, 6);
    const min = ethers.parseUnits(amount.toString(), 6);
    return paid >= min;
  } catch (err) {
    console.error('[verifyEvmDepositTx] Base Pay check failed:', err);
    return false;
  }
}

async function verifyTokenDeposit(
  rpc: string,
  treasury: string,
  token: string,
  decimals: number,
  txHash: string,
  userAddress: string,
  amount: number,
): Promise<boolean> {
  if (!rpc || !treasury) return false;
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;
    const iface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);
    const min = ethers.parseUnits(amount.toString(), decimals);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== token.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;
        const from = String(parsed.args[0]).toLowerCase();
        const to = String(parsed.args[1]).toLowerCase();
        const value = parsed.args[2] as bigint;
        if (
          token.toLowerCase() === TEMPO_OUSD.toLowerCase() &&
          from === userAddress.toLowerCase() &&
          to === TEMPO_RECEIVE_POLICY_GUARD.toLowerCase()
        ) {
          throw new TempoPaymentHeldError();
        }
        if (from === userAddress.toLowerCase() && to === treasury.toLowerCase() && value >= min) {
          return true;
        }
      } catch (err) {
        if (err instanceof TempoPaymentHeldError) throw err;
        continue;
      }
    }
    return false;
  } catch (err) {
    if (err instanceof TempoPaymentHeldError) throw err;
    console.error('[verifyEvmDepositTx] token verification failed:', err);
    return false;
  }
}
