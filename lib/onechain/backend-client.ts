/**
 * OneChain Backend Client
 * Used for administrative operations like withdrawals.
 * Uses @mysten/sui with OneChain's Sui-layer RPC.
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getOneChainConfig } from './config';

let client: SuiClient | null = null;

function getBackendClient(): SuiClient {
  if (!client) {
    const { rpcEndpoint } = getOneChainConfig();
    client = new SuiClient({ url: rpcEndpoint });
  }
  return client;
}

/**
 * Load the treasury keypair from ONECHAIN_TREASURY_PRIVATE_KEY.
 * Supports both bech32 (suiprivkey1...) and base64 formats.
 */
export function getOneChainTreasuryKeypair(): Ed25519Keypair {
  const rawKey = process.env.ONECHAIN_TREASURY_PRIVATE_KEY;
  if (!rawKey) throw new Error('ONECHAIN_TREASURY_PRIVATE_KEY is not configured');

  // Try bech32 format first (suiprivkey1...)
  try {
    const { secretKey } = decodeSuiPrivateKey(rawKey);
    return Ed25519Keypair.fromSecretKey(secretKey);
  } catch {
    // Fall back to raw base64
    try {
      const bytes = Buffer.from(rawKey, 'base64');
      // Sui sometimes prepends a 1-byte scheme flag (0x00 for Ed25519)
      const rawBytes = bytes.length === 33 ? bytes.slice(1) : bytes;
      return Ed25519Keypair.fromSecretKey(rawBytes);
    } catch (err) {
      throw new Error(`Invalid ONECHAIN_TREASURY_PRIVATE_KEY format: ${err}`);
    }
  }
}

/**
 * Transfer OCT from the treasury to a user address.
 */
export async function transferOCTFromTreasury(
  toAddress: string,
  amountOCT: number,
): Promise<string> {
  const { octCoinType, decimals } = getOneChainConfig();
  const suiClient = getBackendClient();
  const keypair = getOneChainTreasuryKeypair();
  const treasuryAddress = keypair.toSuiAddress();
  const amountInSmallestUnit = Math.floor(amountOCT * Math.pow(10, decimals));

  // Get treasury's OCT coins to use as gas payment (required for server-side tx)
  const coins = await suiClient.getCoins({ owner: treasuryAddress, coinType: octCoinType });
  if (coins.data.length === 0) throw new Error('Treasury has no OCT coins');

  const totalBalance = coins.data.reduce(
    (sum: number, c: any) => sum + parseInt(c.balance), 0,
  );
  if (totalBalance < amountInSmallestUnit + 50_000_000) {
    throw new Error('Treasury has insufficient OCT balance');
  }

  // Find a single coin large enough to cover transfer + gas, or use the largest
  const sorted = [...coins.data].sort((a, b) => parseInt(b.balance) - parseInt(a.balance));
  const gasCoin = sorted[0];

  const tx = new Transaction();
  // Explicitly set gas payment coin (required for server-side execution)
  tx.setGasPayment([{
    objectId: gasCoin.coinObjectId,
    version: gasCoin.version,
    digest: gasCoin.digest,
  }]);
  const [withdrawCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInSmallestUnit)]);
  tx.transferObjects([withdrawCoin], tx.pure.address(toAddress));
  tx.setGasBudget(50_000_000);

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true },
  });

  if (result.effects?.status.status !== 'success') {
    throw new Error(`OCT withdrawal failed: ${result.effects?.status.error || 'Unknown error'}`);
  }

  console.log(`OneChain OCT withdrawal successful: ${result.digest}`);
  return result.digest;
}
