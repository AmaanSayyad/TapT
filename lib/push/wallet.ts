/**
 * Push Chain Wallet Module
 * Handles deposit (user → treasury) on Push Chain Donut Testnet
 * Wallet connection managed by @pushchain/ui-kit
 */

import { ethers } from 'ethers';
import { getPushConfig } from './config';
import { getPushChainClientGlobal } from './push-chain-client-store';
import { handleTransactionError } from './client';

/**
 * Deposit PC (native Push Chain token) from user's Push wallet to treasury.
 * Uses the PushChain client initialized by PushProvider.
 */
export async function depositPC(amountPC: number): Promise<string> {
    const pushChainClient = getPushChainClientGlobal();
    if (!pushChainClient) {
        throw new Error('Push Chain client not initialized. Please connect your Push wallet first.');
    }

    const config = getPushConfig();
    if (!config.treasuryAddress) {
        throw new Error('Push Chain treasury address not configured.');
    }

    try {
        const amountWei = ethers.parseEther(amountPC.toString());

        console.log('Push Chain Deposit Debug:', {
            amountPC,
            amountWei: amountWei.toString(),
            treasuryAddress: config.treasuryAddress,
            clientUniversal: !!pushChainClient.universal,
        });

        const targetAddress = (config.treasuryAddress as string).toLowerCase() as `0x${string}`;

        console.log('Push Chain SendTransaction Request:', {
            to: targetAddress,
            value: amountWei.toString(),
            isDirect: !!pushChainClient.sendTransaction
        });

        let tx;
        if (pushChainClient.sendTransaction) {
            // Direct call from usePushChainClient wrapper
            tx = await pushChainClient.sendTransaction({
                to: targetAddress,
                value: amountWei,
            });
        } else if (pushChainClient.universal?.sendTransaction) {
            // Call via universal sub-client
            tx = await pushChainClient.universal.sendTransaction({
                to: targetAddress,
                value: amountWei,
                data: '0x' as `0x${string}`,
            });
        } else {
            throw new Error('Push Chain client sendTransaction method not found');
        }

        console.log(`PC deposit transaction sent: ${tx.hash}`);
        return tx.hash;
    } catch (error: any) {
        throw handleTransactionError(error);
    }
}
