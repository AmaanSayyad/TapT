/**
 * Somnia Backend Client
 * Used for administrative operations like withdrawals.
 */

import { ethers } from 'ethers';
import { getRpcUrl, getSomniaConfig } from './config';

const treasuryAbi = [
  'function withdrawTo(address payable to, uint256 amount) external',
  'function deposit() external payable',
  'event Withdrawn(address indexed to, uint256 amount, uint256 timestamp)',
];

export function getSomniaTreasuryWallet(): ethers.Wallet {
  const config = getSomniaConfig();
  const rawSecretKey =
    process.env.SOMNIA_TREASURY_SECRET_KEY;

  if (!rawSecretKey) {
    throw new Error('SOMNIA_TREASURY_SECRET_KEY is not configured');
  }

  // Support env keys with or without 0x prefix.
  const secretKey = rawSecretKey.startsWith('0x') ? rawSecretKey : `0x${rawSecretKey}`;

  const provider = new ethers.JsonRpcProvider(getRpcUrl());
  return new ethers.Wallet(secretKey, provider);
}

export async function transferSOMNIAFromTreasury(
  toAddress: string,
  amountSOMNIA: number,
): Promise<string> {
  try {
    const { treasuryAddress } = getSomniaConfig();
    if (!treasuryAddress) throw new Error('Somnia treasuryAddress not configured');

    const wallet = getSomniaTreasuryWallet();
    const treasury = new ethers.Contract(treasuryAddress as string, treasuryAbi, wallet);

    // Avoid scientific notation (e.g. 1e-7), which parseEther rejects.
    const amountStr = amountSOMNIA.toFixed(18).replace(/\.?0+$/, '');
    const amountWei = ethers.parseEther(amountStr);

    const tx = await treasury.withdrawTo(toAddress, amountWei);
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error('Failed to transfer SOMNIA from treasury:', error);
    throw error;
  }
}

