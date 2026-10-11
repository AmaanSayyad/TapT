/**
 * Initia Backend Client
 * Server-side treasury withdrawal using @cosmjs/stargate.
 */
import { getInitiaConfig, toUinit, fromUinit, INITIA_CHAIN_ID } from './config';

async function getTreasuryWallet(privateKeyHex: string) {
  const { DirectSecp256k1Wallet } = await import('@cosmjs/proto-signing');
  const { fromHex } = await import('@cosmjs/encoding');
  const privkeyBytes = fromHex(privateKeyHex.replace(/^0x/, ''));
  return DirectSecp256k1Wallet.fromKey(privkeyBytes, 'init');
}

/**
 * Transfer INIT from treasury to a user address.
 * Uses server-side keypair signing via @cosmjs/stargate.
 */
export async function transferINITFromTreasury(
  toAddress: string,
  amountINIT: number,
): Promise<string> {
  const privateKeyHex = process.env.INITIA_TREASURY_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('INITIA_TREASURY_PRIVATE_KEY is not configured');
  }

  const { rpcUrl, denom } = getInitiaConfig();
  const treasuryAddress = process.env.NEXT_PUBLIC_INITIA_TREASURY_ADDRESS;
  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_INITIA_TREASURY_ADDRESS is not configured');
  }

  const { SigningStargateClient, GasPrice } = await import('@cosmjs/stargate');

  const wallet = await getTreasuryWallet(privateKeyHex);
  const [account] = await wallet.getAccounts();

  if (account.address !== treasuryAddress) {
    console.warn(
      `Initia treasury address mismatch: key derives ${account.address}, env says ${treasuryAddress}`,
    );
  }

  const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
    gasPrice: GasPrice.fromString('0.015uinit'),
  });

  const amountInUinit = toUinit(amountINIT);

  const result = await client.sendTokens(
    account.address,
    toAddress,
    [{ denom, amount: amountInUinit }],
    'auto',
    `TapT withdrawal: ${amountINIT} INIT`,
  );

  if (result.code !== 0) {
    throw new Error(`Initia transfer failed with code ${result.code}: ${result.rawLog}`);
  }

  return result.transactionHash;
}

/**
 * Verify an Initia deposit transaction via LCD REST API.
 * Returns the amount sent to treasury and the sender address.
 */
export async function verifyInitiaDepositTx(txHash: string): Promise<{
  sender: string;
  amountINIT: number;
  confirmed: boolean;
}> {
  const { restUrl, denom } = getInitiaConfig();
  const treasuryAddress = process.env.NEXT_PUBLIC_INITIA_TREASURY_ADDRESS;

  const res = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs/${txHash}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Initia tx: ${res.status}`);
  }

  const data = await res.json();
  const txResponse = data.tx_response;

  if (!txResponse) {
    throw new Error('Transaction not found');
  }

  if (txResponse.code !== 0) {
    throw new Error(`Transaction failed with code ${txResponse.code}`);
  }

  // Find MsgSend to treasury
  const messages = data.tx?.body?.messages ?? [];
  for (const msg of messages) {
    if (msg['@type'] === '/cosmos.bank.v1beta1.MsgSend') {
      if (msg.to_address === treasuryAddress) {
        const initCoin = (msg.amount as Array<{ denom: string; amount: string }>).find(
          (c) => c.denom === denom,
        );
        if (initCoin) {
          return {
            sender: msg.from_address,
            amountINIT: fromUinit(initCoin.amount),
            confirmed: true,
          };
        }
      }
    }
  }

  throw new Error('No valid MsgSend to treasury found in transaction');
}
