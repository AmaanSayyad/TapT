import { getAptosConfig } from './config';

/** REST response shape for GET /v1/transactions/by_hash/{hash} (user transaction) */
interface AptosUserTransactionRest {
  type?: string;
  success?: boolean;
  sender?: string;
  payload?: {
    function?: string;
    arguments?: string[];
  };
}

/**
 * Verifies an Aptos deposit transaction on-chain via REST (no legacy `aptos` SDK).
 * Avoids Turbopack issues: that package pulls `got` and incompatible @noble/hashes for @scure/bip39.
 */
export async function verifyAptosDepositTx(
  txHash: string,
  userAddress: string,
  amount: number
): Promise<boolean> {
  const config = getAptosConfig();
  const base = config.rpcUrls[0].replace(/\/$/, '');

  try {
    const res = await fetch(`${base}/transactions/by_hash/${encodeURIComponent(txHash)}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return false;

    const tx = (await res.json()) as AptosUserTransactionRest;
    if (!tx.success || tx.type !== 'user_transaction') return false;

    if (!tx.sender || tx.sender.toLowerCase() !== userAddress.toLowerCase()) return false;

    const payload = tx.payload;
    if (!payload?.function || payload.function !== '0x1::aptos_account::transfer') return false;

    const args = payload.arguments ?? [];
    const recipient = args[0];
    const amountArg = args[1];
    if (!recipient || amountArg === undefined) return false;

    const amountSent = typeof amountArg === 'string' ? parseInt(amountArg, 10) : Number(amountArg);
    if (!Number.isFinite(amountSent)) return false;

    if (recipient.toLowerCase() !== config.treasuryAddress.toLowerCase()) return false;

    const expectedOctas = Math.floor(amount * 100_000_000);
    return amountSent >= expectedOctas;
  } catch (err) {
    console.error('[verifyAptosDepositTx] Aptos RPC error:', err);
    return false;
  }
}

/**
 * Transfers APT from the treasury wallet to a user.
 * @param toAddress - Recipient address
 * @param amount - Amount in APT
 */
function normalizeAptosTreasurySecret(raw: string): string {
  let s = raw.trim();
  // Petra / CLI AIP-80-style prefix
  if (s.startsWith('ed25519-priv-')) {
    s = s.slice('ed25519-priv-'.length).trim();
  }
  return s.startsWith('0x') ? s : `0x${s}`;
}

export async function transferAPTFromTreasury(
  toAddress: string,
  amount: number
): Promise<string> {
  const { Ed25519Account, Aptos, AptosConfig, Network, Ed25519PrivateKey } = await import(
    '@aptos-labs/ts-sdk'
  );

  const chainCfg = getAptosConfig();
  const fullnode = chainCfg.rpcUrls[0]?.replace(/\/$/, '') || 'https://fullnode.mainnet.aptoslabs.com/v1';
  const networkByChain: Record<string, (typeof Network)[keyof typeof Network]> = {
    mainnet: Network.MAINNET,
    testnet: Network.TESTNET,
    devnet: Network.DEVNET,
  };
  const network = networkByChain[chainCfg.network] ?? Network.MAINNET;
  const aptosConfig = new AptosConfig({ network, fullnode });
  const aptos = new Aptos(aptosConfig);

  const secretKeyStr = process.env.APTOS_TREASURY_SECRET_KEY;
  if (!secretKeyStr) {
    throw new Error('APTOS_TREASURY_SECRET_KEY is not configured');
  }

  try {
    const hexKey = normalizeAptosTreasurySecret(secretKeyStr);
    const privateKey = new Ed25519PrivateKey(hexKey);
    // Avoid Account.fromPrivateKey({ privateKey: string }) — wrong overload and causes "publicKey is not a function".
    const adminAccount = new Ed25519Account({ privateKey });

    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [toAddress, Math.floor(amount * 100_000_000)],
      },
    });

    const pendingTx = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    const response = await aptos.waitForTransaction({ transactionHash: pendingTx.hash });
    return response.hash;
  } catch (error) {
    console.error('Error in transferAPTFromTreasury:', error);
    throw error;
  }
}
