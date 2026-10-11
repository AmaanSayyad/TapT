/**
 * OneChain (Sui-compatible) SDK Integration Module
 * Uses @mysten/sui with OneChain's Sui-layer RPC.
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getOneChainConfig } from './config';

// Singleton client pointing to OneChain Sui RPC
let client: SuiClient | null = null;

export function getOneChainClient(): SuiClient {
  if (!client) {
    const { rpcEndpoint } = getOneChainConfig();
    client = new SuiClient({ url: rpcEndpoint });
  }
  return client;
}

/**
 * Get OCT balance for an address (in OCT, not MIST)
 */
export async function getOCTBalance(address: string): Promise<number> {
  if (!address) return 0;
  const { octCoinType, decimals } = getOneChainConfig();
  try {
    const balance = await getOneChainClient().getBalance({
      owner: address,
      coinType: octCoinType,
    });
    return parseInt(balance.totalBalance) / Math.pow(10, decimals);
  } catch (error) {
    console.warn(`Failed to get OCT balance for ${address}:`, error);
    return 0;
  }
}

/**
 * Build a deposit transaction — transfers OCT coins to the treasury.
 * Uses tx.gas (native token pattern) so OCT serves as both payment and gas.
 */
export async function buildOCTDepositTransaction(
  amount: number,
  userAddress: string,
): Promise<Transaction> {
  const { treasuryAddress } = getOneChainConfig();
  if (!treasuryAddress) throw new Error('OneChain treasury address not configured');
  return buildOCTTransferTransaction(amount, userAddress, treasuryAddress);
}

/**
 * Build a generic OCT transfer to any recipient (e.g. fee collector wallet).
 */
export async function buildOCTTransferTransaction(
  amount: number,
  fromAddress: string,
  toAddress: string,
): Promise<Transaction> {
  const { decimals } = getOneChainConfig();

  const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

  const balance = await getOCTBalance(fromAddress);
  const GAS_RESERVE = 0.05;
  if (balance < amount + GAS_RESERVE) {
    throw new Error(
      `Insufficient OCT balance. Have: ${balance}, Need: ${amount} + ${GAS_RESERVE} for gas`,
    );
  }

  const tx = new Transaction();
  const [payCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInSmallestUnit)]);
  tx.transferObjects([payCoin], tx.pure.address(toAddress));
  tx.setSender(fromAddress);
  tx.setGasBudget(50_000_000);

  return tx;
}
