/**
 * Push Chain SDK Integration Module
 * Push Chain is EVM-compatible — uses ethers.js like BNB
 */

import { ethers } from 'ethers';
import { getPushConfig } from './config';

export async function getPUSHBalance(address: string): Promise<number> {
    try {
        const config = getPushConfig();
        // Use a static provider to ensure we are always on the correct network (Push Chain)
        // This avoids issues when MetaMask is connected to another network like BSC
        const provider = new ethers.JsonRpcProvider(config.rpcEndpoint, {
            chainId: config.chainId,
            name: 'push-donut'
        });

        console.log(`Fetching PUSH balance for ${address} on chain ${config.chainId}...`);
        const balance = await provider.getBalance(address);
        const balNum = parseFloat(ethers.formatEther(balance));
        console.log(`PUSH balance for ${address}: ${balNum}`);
        return balNum;
    } catch (error) {
        console.error('Failed to get PUSH balance:', error);
        return 0;
    }
}

/**
 * Get treasury balance on Push Chain
 */
export async function getTreasuryBalance(): Promise<number> {
    const config = getPushConfig();
    if (!config.treasuryAddress) return 0;
    return getPUSHBalance(config.treasuryAddress);
}

/**
 * Handle transaction errors
 */
export function handleTransactionError(error: any): Error {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (
        errorMessage.includes('user rejected') ||
        errorMessage.includes('action_rejected') ||
        errorMessage.includes('user_rejected')
    ) {
        return new Error('Transaction was cancelled by user.');
    }

    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        return new Error('Insufficient PUSH balance for this transaction.');
    }

    if (error instanceof Error) {
        return new Error(`Transaction failed: ${error.message}`);
    }

    return new Error('Transaction failed. Please try again.');
}
