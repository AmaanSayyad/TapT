/**
 * Aptos Client Module for Binomo
 *
 * This module provides a client wrapper for interacting with Aptos mainnet
 * using the Aptos TS SDK.
 */

import {
  Account,
  AccountAddress,
  Aptos as AptosSDK,
  AptosConfig as AptosSDKConfig,
  Ed25519PrivateKey,
  Network,
} from '@aptos-labs/ts-sdk';
import { getRpcUrl } from './config';

const APTOS_COIN_TYPE = '0x1::aptos_coin::AptosCoin';
/** 10^8 — avoid `n` literals (tsconfig target ES2017) */
const APT_DECIMALS_NUM = 8;
const APT_FACTOR = BigInt(10 ** APT_DECIMALS_NUM);

function normalizeAddress(address: string): string {
  try {
    return AccountAddress.from(address).toString();
  } catch {
    return address;
  }
}

export class AptosClient {
  private aptos: AptosSDK;
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || getRpcUrl();
    const config = new AptosSDKConfig({
      network: Network.MAINNET,
      fullnode: this.rpcUrl,
    });
    this.aptos = new AptosSDK(config);
  }

  getSDK(): AptosSDK {
    return this.aptos;
  }

  async getBalance(address: string): Promise<number> {
    const accountAddress = normalizeAddress(address);
    try {
      const amount = await this.aptos.getAccountCoinAmount({
        accountAddress,
        coinType: APTOS_COIN_TYPE,
      });
      return Number(amount) / Number(APT_FACTOR);
    } catch (error: any) {
      // Handle case where account doesn't exist yet
      const isNotFound = 
        error?.status === 404 || 
        error?.message?.includes('resource_not_found') ||
        error?.message?.includes('Account not found') ||
        error?.data?.error_code === 'resource_not_found';
        
      if (isNotFound) {
        return 0;
      }
      console.error("Error fetching Aptos balance:", error);
      return 0;
    }
  }

  formatAPT(amount: bigint): string {
    const whole = amount / APT_FACTOR;
    const fraction = amount % APT_FACTOR;
    const fractionStr = fraction.toString().padStart(APT_DECIMALS_NUM, '0').replace(/0+$/, '');
    return fractionStr.length ? `${whole}.${fractionStr}` : `${whole}`;
  }

  parseAPT(amount: string): bigint {
    const [whole, fraction = ''] = amount.trim().split('.');
    const paddedFraction = fraction.padEnd(APT_DECIMALS_NUM, '0').slice(0, APT_DECIMALS_NUM);
    return BigInt(whole) * APT_FACTOR + BigInt(paddedFraction || '0');
  }
}

let clientInstance: AptosClient | null = null;

export function getAptosClient(): AptosClient {
  if (!clientInstance) {
    clientInstance = new AptosClient();
  }
  return clientInstance;
}

export async function getAPTBalance(address: string): Promise<number> {
  const client = getAptosClient();
  return await client.getBalance(address);
}

export function buildAptosSigner(privateKey: string): Account {
  let clean = privateKey;
  if (clean.startsWith('0x')) {
    clean = clean.slice(2);
  }
  const pk = new Ed25519PrivateKey(clean);
  return Account.fromPrivateKey({ privateKey: pk });
}
