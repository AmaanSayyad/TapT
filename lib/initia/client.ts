/**
 * Initia Frontend Client
 * Builds Cosmos MsgSend messages for use with useInterwovenKit's requestTxBlock.
 */
import { getInitiaConfig, toUinit, INITIA_CHAIN_ID } from './config';

export interface InitiaDepositMessage {
  typeUrl: string;
  value: {
    fromAddress: string;
    toAddress: string;
    amount: Array<{ denom: string; amount: string }>;
  };
}

export interface InitiaDepositTxRequest {
  messages: InitiaDepositMessage[];
  chainId: string;
}

/**
 * Build a deposit transaction request for InterwovenKit's requestTxBlock.
 * Returns the messages array ready to pass to requestTxBlock.
 */
export function buildInitiaDepositTxRequest(
  fromAddress: string,
  amountINIT: number,
): InitiaDepositTxRequest {
  const { treasuryAddress } = getInitiaConfig();
  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_INITIA_TREASURY_ADDRESS is not configured');
  }
  return buildInitiaTransferTxRequest(fromAddress, treasuryAddress, amountINIT);
}

/**
 * Build a generic INIT transfer request to any recipient (e.g. fee collector wallet).
 */
export function buildInitiaTransferTxRequest(
  fromAddress: string,
  toAddress: string,
  amountINIT: number,
): InitiaDepositTxRequest {
  const { denom } = getInitiaConfig();
  const amountInUinit = toUinit(amountINIT);

  return {
    messages: [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress,
          toAddress,
          amount: [{ denom, amount: amountInUinit }],
        },
      },
    ],
    chainId: INITIA_CHAIN_ID,
  };
}
