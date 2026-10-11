/**
 * Solana Network Configuration
 *
 * Three different concepts (do not mix them up):
 *
 * - **Operational treasury** (`NEXT_PUBLIC_SOL_TREASURY_ADDRESS`) — house vault for SOL deposits and withdrawals. Must be the **only** pubkey controlled by `SOL_TREASURY_SECRET_KEY` (server-side).
 * - **Protocol fee collector** (`NEXT_PUBLIC_PLATFORM_FEE_WALLET_SOL`) — **different** pubkey that receives the tier fee via backend transfers *from* the treasury after deposits and withdrawals.
 */

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

const PUBLIC_SOLANA_RPCS = [
    'https://solana-rpc.publicnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.rpc.extrnode.com',
    'https://api.mainnet-beta.solana.com',
];

function normalizeRpc(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

/** Solana Labs' shared cluster is not a production RPC and often returns 403. */
export function isFlakyPublicSolanaRpc(url: string): boolean {
    const norm = normalizeRpc(url);
    return (
        norm === 'https://api.mainnet-beta.solana.com' ||
        norm === 'http://api.mainnet-beta.solana.com' ||
        norm === 'https://api.mainnet.solana.com' ||
        norm === 'http://api.mainnet.solana.com'
    );
}

/**
 * First usable Solana RPC.
 * The server prefers SOLANA_RPC_URL so a dedicated key stays off the browser.
 * The browser uses NEXT_PUBLIC_SOLANA_RPC_ENDPOINT, then the public fallbacks.
 */
export function solanaRpcEndpoint(): string {
    const server = typeof window === 'undefined' ? process.env.SOLANA_RPC_URL?.trim() : '';
    const pub = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.trim();
    for (const candidate of [server, pub]) {
        if (candidate && !isFlakyPublicSolanaRpc(candidate)) return normalizeRpc(candidate);
    }
    return PUBLIC_SOLANA_RPCS[0];
}

/** Primary endpoint first, then public fallbacks. Duplicates removed. */
export function solanaRpcFallbacks(primary?: string): string[] {
    const first = normalizeRpc(primary || solanaRpcEndpoint());
    return [...new Set([first, ...PUBLIC_SOLANA_RPCS].filter(Boolean))];
}

export interface SolanaConfig {
    network: WalletAdapterNetwork;
    rpcEndpoint: string;
    treasuryAddress: string;
}

/**
 * Get Solana configuration from environment variables
 * 
 * @throws {Error} If required environment variables are missing
 * @returns {SolanaConfig} The Solana configuration object
 */
export function getSolanaConfig(): SolanaConfig {
    const requested = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
    const networkStr = requested === 'testnet' || requested === 'devnet' ? 'mainnet-beta' : requested;
    let network: WalletAdapterNetwork;

    switch (networkStr) {
        case 'mainnet-beta':
            network = WalletAdapterNetwork.Mainnet;
            break;
        case 'devnet':
            network = WalletAdapterNetwork.Devnet;
            break;
        case 'testnet':
        default:
            network = WalletAdapterNetwork.Testnet;
            break;
    }

    const rpcEndpoint = solanaRpcEndpoint();
    const treasuryAddress = process.env.NEXT_PUBLIC_SOL_TREASURY_ADDRESS;

    // Validate required environment variables
    if (!treasuryAddress) {
        throw new Error(
            'Missing required Solana environment variable: NEXT_PUBLIC_SOL_TREASURY_ADDRESS. ' +
            'Please check your .env file and ensure it is set.'
        );
    }

    return {
        network,
        rpcEndpoint,
        treasuryAddress,
    };
}

/**
 * Validate that all required environment variables are present
 */
export function validateSolanaConfig(): void {
    getSolanaConfig();
}
