/**
 * Somnia (EVM-like) SDK Integration Module
 */

import { ethers } from 'ethers';
import { getRpcUrl, getSomniaConfig } from './config';

// Singleton Provider instance
let provider: ethers.JsonRpcProvider | null = null;

export function getSomniaProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(getRpcUrl());
  }
  return provider;
}

export async function getSOMNIABalance(address: string): Promise<number> {
  const p = getSomniaProvider();
  try {
    const balance = await p.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error('Failed to get Somnia balance:', error);
    return 0;
  }
}

export async function getSomniaTreasuryBalance(): Promise<number> {
  const { treasuryAddress } = getSomniaConfig();
  if (!treasuryAddress) return 0;
  return getSOMNIABalance(treasuryAddress as string);
}

