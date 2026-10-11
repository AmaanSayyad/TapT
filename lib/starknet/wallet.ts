import { getStarknetConfig } from './config';
import { buildSTRKTransferCalldata } from './client';

interface StarknetAccount {
  execute: (call: {
    contractAddress: string;
    entrypoint: string;
    calldata: string[];
  }) => Promise<{ transaction_hash?: string; transactionHash?: string; hash?: string }>;
}

interface StarknetInjected {
  selectedAddress?: string;
  account?: StarknetAccount;
  enable: (options: { showModal: boolean }) => Promise<string[]>;
  disconnect?: () => Promise<void>;
}

declare global {
  interface Window {
    starknet?: StarknetInjected;
  }
}

function getInjectedWallet(): StarknetInjected | null {
  if (typeof window === 'undefined') return null;
  return window.starknet || null;
}

export function isStarknetWalletAvailable(): boolean {
  return !!getInjectedWallet();
}

export async function connectStarknetWallet(): Promise<string> {
  const wallet = getInjectedWallet();
  if (!wallet) {
    throw new Error('No Starknet wallet found. Install Argent X or Braavos.');
  }

  const accounts = await wallet.enable({ showModal: true });
  const selectedAddress = wallet.selectedAddress || accounts?.[0];

  if (!selectedAddress) {
    throw new Error('Failed to connect Starknet wallet.');
  }

  return selectedAddress;
}

export async function disconnectStarknetWallet(): Promise<void> {
  const wallet = getInjectedWallet();
  if (wallet?.disconnect) {
    await wallet.disconnect();
  }
}

export async function depositSTRK(amountSTRK: number): Promise<string> {
  const wallet = getInjectedWallet();
  if (!wallet) {
    throw new Error('No Starknet wallet found. Install Argent X or Braavos.');
  }

  if (!wallet.account) {
    await wallet.enable({ showModal: true });
  }

  if (!wallet.account) {
    throw new Error('Starknet wallet account not available.');
  }

  const { treasuryAddress, strkTokenAddress } = getStarknetConfig();
  if (!treasuryAddress) {
    throw new Error('Starknet treasury address not configured');
  }

  const calldata = await buildSTRKTransferCalldata(treasuryAddress, amountSTRK);

  const tx = await wallet.account.execute({
    contractAddress: strkTokenAddress,
    entrypoint: 'transfer',
    calldata,
  });

  const txHash = tx?.transaction_hash || tx?.transactionHash || tx?.hash;
  if (!txHash) {
    throw new Error('Starknet transaction hash not returned by wallet');
  }

  return txHash;
}

/**
 * Transfer STRK to any recipient (e.g. platform fee collector).
 */
export async function transferSTRKToAddress(amountSTRK: number, toAddress: string): Promise<string> {
  const wallet = getInjectedWallet();
  if (!wallet) {
    throw new Error('No Starknet wallet found. Install Argent X or Braavos.');
  }

  if (!wallet.account) {
    await wallet.enable({ showModal: true });
  }

  if (!wallet.account) {
    throw new Error('Starknet wallet account not available.');
  }

  const { strkTokenAddress } = getStarknetConfig();
  const calldata = await buildSTRKTransferCalldata(toAddress, amountSTRK);

  const tx = await wallet.account.execute({
    contractAddress: strkTokenAddress,
    entrypoint: 'transfer',
    calldata,
  });

  const txHash = tx?.transaction_hash || tx?.transactionHash || tx?.hash;
  if (!txHash) throw new Error('Starknet transaction hash not returned by wallet');
  return txHash;
}
