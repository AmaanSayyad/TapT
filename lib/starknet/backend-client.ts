import { getStarknetConfig } from './config';

const DECIMALS = BigInt(18);

function parseToUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    return BigInt(0);
  }

  const normalized = amount.toFixed(Number(DECIMALS));
  const [whole, fraction = ''] = normalized.split('.');
  const fractionPadded = fraction.padEnd(Number(DECIMALS), '0').slice(0, Number(DECIMALS));
  return BigInt(whole) * BigInt(10) ** DECIMALS + BigInt(fractionPadded || '0');
}

function toUint256Parts(value: bigint): { low: string; high: string } {
  const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
  return {
    low: (value & mask).toString(),
    high: (value >> BigInt(128)).toString(),
  };
}

export async function transferSTRKFromTreasury(toAddress: string, amountSTRK: number): Promise<string> {
  const privateKey = process.env.STARKNET_TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('STARKNET_TREASURY_PRIVATE_KEY is not configured');
  }

  const { RpcProvider, Account } = await import('starknet');
  const { rpcEndpoint, treasuryAddress, strkTokenAddress } = getStarknetConfig();

  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS is not configured');
  }

  const cairoVersion = (process.env.STARKNET_TREASURY_CAIRO_VERSION || '1') as '0' | '1';
  const provider = new RpcProvider({ nodeUrl: rpcEndpoint });
  const account = new Account(provider, treasuryAddress, privateKey, cairoVersion);

  const amountWei = parseToUnits(amountSTRK);
  const { low, high } = toUint256Parts(amountWei);

  const tx = await account.execute({
    contractAddress: strkTokenAddress,
    entrypoint: 'transfer',
    calldata: [toAddress, low, high],
  });

  const txHash = tx.transaction_hash;
  await provider.waitForTransaction(txHash);

  return txHash;
}
