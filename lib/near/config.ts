const NEAR_MAINNET_DEFAULTS = {
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.near.org",
    walletUrl: "https://wallet.near.org",
    helperUrl: "https://helper.mainnet.near.org",
    explorerUrl: "https://explorer.near.org",
    headers: {},
} as const;

// NEAR RPC / network — override for testnet or custom RPC (must match treasury account network).
export const NEAR_CONFIG = {
    ...NEAR_MAINNET_DEFAULTS,
    networkId:
        process.env.NEAR_NETWORK_ID?.trim() ||
        process.env.NEXT_PUBLIC_NEAR_NETWORK?.trim() ||
        NEAR_MAINNET_DEFAULTS.networkId,
    nodeUrl:
        process.env.NEAR_NODE_URL?.trim() ||
        process.env.NEXT_PUBLIC_NEAR_NODE_URL?.trim() ||
        NEAR_MAINNET_DEFAULTS.nodeUrl,
};

export const BINOMO_NEAR_TREASURY = process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || "bynomo.near";
export const NEAR_CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || "bynomo.near";
