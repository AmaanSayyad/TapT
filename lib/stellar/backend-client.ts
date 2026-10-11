/**
 * Stellar (XLM) backend client – treasury withdrawals
 * Uses dynamic import so the build does not require @stellar/stellar-sdk at bundle time.
 */

import { STELLAR_HORIZON_URL, STELLAR_NETWORK_PASSPHRASE } from './config';

/**
 * Transfer XLM from treasury to a user address.
 * @param toAddress Stellar destination address (G...)
 * @param amountXLM Amount in XLM (lumens)
 * @returns Transaction hash
 */
export async function transferXLMFromTreasury(
  toAddress: string,
  amountXLM: number
): Promise<string> {
  const secret = process.env.STELLAR_TREASURY_SECRET;
  if (!secret) {
    throw new Error('STELLAR_TREASURY_SECRET is not configured');
  }

  const { Horizon, Keypair, TransactionBuilder, Operation, Asset } = await import(
    '@stellar/stellar-sdk'
  );

  const server = new Horizon.Server(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || STELLAR_HORIZON_URL);
  const keypair = Keypair.fromSecret(secret);
  const sourcePublicKey = keypair.publicKey();

  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const amountStr = amountXLM.toFixed(7);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: toAddress,
        asset: Asset.native(),
        amount: amountStr,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);

  const result = await server.submitTransaction(transaction);
  return result.hash;
}
