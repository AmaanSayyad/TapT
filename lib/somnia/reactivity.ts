/**
 * Somnia Reactivity (read-side) helpers
 *
 * Subscribes to Somnia Reactivity reactor contract events via WebSocket and
 * decodes DepositConfirmed / WithdrawConfirmed logs.
 */
import {
  createPublicClient,
  createWalletClient,
  webSocket,
  http,
  keccak256,
  toHex,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { SDK } from '@somnia-chain/reactivity';
import { getRpcUrl, getSomniaConfig } from '@/lib/somnia/config';

const somniaCfg = getSomniaConfig();
const somniaTestnet = defineChain({
  id: somniaCfg.chainId,
  name: somniaCfg.chainName,
  nativeCurrency: somniaCfg.nativeCurrency,
  rpcUrls: { default: { http: somniaCfg.rpcUrls } },
  testnet: true,
});

const WS_RPC =
  process.env.NEXT_PUBLIC_SOMNIA_TESTNET_WS_RPC || 'wss://dream-rpc.somnia.network';

// BomniaTreasuryReactor:
// DepositConfirmed(address indexed user, uint256 amount, uint256 reactedAt)
export const DEPOSIT_CONFIRMED_TOPIC = keccak256(
  toHex('DepositConfirmed(address,uint256,uint256)')
) as Hex;

// BomniaTreasuryReactor:
// WithdrawConfirmed(address indexed to, uint256 amount, uint256 reactedAt)
export const WITHDRAW_CONFIRMED_TOPIC = keccak256(
  toHex('WithdrawConfirmed(address,uint256,uint256)')
) as Hex;

export type ConfirmedTreasuryEvent = {
  type: 'deposit_confirmed' | 'withdraw_confirmed';
  user: Address;
  amount: bigint;
  reactedAt: number;
  txHash?: string;
};

let _wsPublicClient:
  | ReturnType<typeof createPublicClient>
  | null = null;

let _readSDK: SDK | null = null;

export function createReadSDK(): SDK {
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(WS_RPC),
  });
  return new SDK({ public: publicClient });
}

export function getReadSDK(): SDK {
  if (!_readSDK) _readSDK = createReadSDK();
  return _readSDK;
}

export function createWriteSDK(privateKey: Hex): SDK {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(getRpcUrl()),
  });
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(getRpcUrl()),
  });
  return new SDK({ public: publicClient, wallet: walletClient });
}

function getWSPublicClient() {
  if (!_wsPublicClient) {
    _wsPublicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(WS_RPC),
    });
  }
  return _wsPublicClient;
}

function decodeConfirmedEvent(
  type: ConfirmedTreasuryEvent['type'],
  topics: readonly Hex[],
  data: Hex,
  txHash?: string
): ConfirmedTreasuryEvent | null {
  if (topics.length < 2) return null;

  const user = `0x${topics[1].slice(-40)}` as Address;
  const hex = data.startsWith('0x') ? data.slice(2) : data;
  if (hex.length < 128) return null;

  const amount = BigInt(`0x${hex.slice(0, 64)}`);
  const reactedAt = Number(BigInt(`0x${hex.slice(64, 128)}`));

  return { type, user, amount, reactedAt, txHash };
}

export async function subscribeToReactorEvents(
  reactorAddress: Address,
  onEvent: (event: ConfirmedTreasuryEvent) => void,
  onError?: (err: Error) => void
): Promise<() => void> {
  const client = getWSPublicClient();

  const makeSub = (topic: Hex, type: ConfirmedTreasuryEvent['type']) =>
    client.watchEvent({
      address: reactorAddress,
      onLogs: (logs) => {
        for (const log of logs) {
          try {
            if (log.topics[0] !== topic) continue;
            const txHash: string | undefined = log.transactionHash ?? undefined;
            const topicsHex = log.topics.filter((t): t is Hex => t !== null);
            const event = decodeConfirmedEvent(type, topicsHex, log.data, txHash);
            if (event) onEvent(event);
          } catch (err) {
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      },
    });

  const unsubDeposit = makeSub(DEPOSIT_CONFIRMED_TOPIC, 'deposit_confirmed');
  const unsubWithdraw = makeSub(WITHDRAW_CONFIRMED_TOPIC, 'withdraw_confirmed');

  return () => {
    unsubDeposit();
    unsubWithdraw();
  };
}

