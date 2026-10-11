import {
  getStarknetConfig,
  getStrkTokenAddressForChainId,
  STARKNET_STRK_MAINNET,
  STARKNET_STRK_SEPOLIA,
} from './config';

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

function uint256ToBigInt(low: string, high: string): bigint {
  return BigInt(low) + (BigInt(high) << BigInt(128));
}

function toUint256Parts(value: bigint): { low: string; high: string } {
  const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
  return {
    low: (value & mask).toString(),
    high: (value >> BigInt(128)).toString(),
  };
}

function balanceFromCallResult(result: string[]): number {
  const low = result[0] ?? '0';
  const high = result[1] ?? '0';
  const balanceWei = uint256ToBigInt(low, high);
  return Number(balanceWei) / 10 ** Number(DECIMALS);
}

type MinimalProvider = {
  callContract: (params: {
    contractAddress: string;
    entrypoint: string;
    calldata: string[];
  }) => Promise<string[]>;
  getChainId?: () => Promise<string>;
};

export async function getSTRKBalance(address: string): Promise<number> {
  try {
    const { RpcProvider } = await import('starknet');
    const cfg = getStarknetConfig();

    // Prefer the injected wallet's RPC — matches Sepolia vs mainnet automatically.
    if (typeof window !== 'undefined') {
      const stark = (window as unknown as {
        starknet?: { provider?: MinimalProvider; account?: { provider?: MinimalProvider } };
      }).starknet;
      const wp = stark?.provider ?? stark?.account?.provider;
      if (wp?.callContract) {
        let chainHex: string | undefined;
        if (typeof wp.getChainId === 'function') {
          try {
            chainHex = await wp.getChainId();
          } catch {
            chainHex = undefined;
          }
        }
        const primaryToken =
          chainHex != null
            ? getStrkTokenAddressForChainId(chainHex)
            : cfg.strkTokenAddress;
        const altToken =
          primaryToken.toLowerCase() === STARKNET_STRK_SEPOLIA.toLowerCase()
            ? STARKNET_STRK_MAINNET
            : STARKNET_STRK_SEPOLIA;
        const tokenOrder =
          chainHex != null ? [primaryToken] : [primaryToken, altToken];
        try {
          for (const token of tokenOrder) {
            try {
              const result = await wp.callContract({
                contractAddress: token,
                entrypoint: 'balance_of',
                calldata: [address],
              });
              return balanceFromCallResult(result);
            } catch {
              if (tokenOrder.length === 1) throw new Error('balance_of failed');
              continue;
            }
          }
        } catch (e) {
          console.warn('[getSTRKBalance] wallet provider balance call failed, trying config RPC', e);
        }
      }
    }

    const fallbackRpcEndpoints =
      cfg.network === 'sepolia'
        ? [
            cfg.rpcEndpoint,
            'https://starknet-sepolia.public.blastapi.io/rpc/v0_8',
          ]
        : [
            cfg.rpcEndpoint,
            'https://rpc.starknet.lava.build',
            'https://starknet-mainnet.public.blastapi.io/rpc/v0_8',
          ];

    const triedEndpoints = Array.from(new Set(fallbackRpcEndpoints.filter(Boolean)));

    for (const endpoint of triedEndpoints) {
      try {
        const provider = new RpcProvider({ nodeUrl: endpoint });
        const result = await provider.callContract({
          contractAddress: cfg.strkTokenAddress,
          entrypoint: 'balance_of',
          calldata: [address],
        });
        return balanceFromCallResult(result);
      } catch {
        continue;
      }
    }

    throw new Error('Unable to reach Starknet RPC endpoints');
  } catch (error) {
    console.error('Failed to fetch STRK balance:', error);
    return 0;
  }
}

export async function buildSTRKTransferCalldata(toAddress: string, amountSTRK: number): Promise<string[]> {
  const amountWei = parseToUnits(amountSTRK);
  const { low, high } = toUint256Parts(amountWei);
  return [toAddress, low, high];
}
