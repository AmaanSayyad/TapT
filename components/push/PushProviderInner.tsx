'use client';

import React, { useEffect } from 'react';
import {
    PushUniversalWalletProvider,
    usePushWalletContext,
    usePushChainClient,
    ConnectionStatus,
} from '@pushchain/ui-kit';
import { PUSH_NETWORK } from '@pushchain/core/src/lib/constants/enums';
import { useOverflowStore } from '@/lib/store';
import { setPushChainClientGlobal } from '@/lib/push/push-chain-client-store';

export const PUSH_CONNECT_EVENT = 'push_wallet_connect';

const PUSH_WALLET_UID = 'bynomo-push-wallet';

function PushWalletSyncInner() {
    const { universalAccount, connectionStatus, handleConnectToPushWallet } = usePushWalletContext(PUSH_WALLET_UID);
    const { pushChainClient } = usePushChainClient(PUSH_WALLET_UID);

    const preferredNetwork = useOverflowStore(state => state.preferredNetwork);
    const address = useOverflowStore(state => state.address);
    const setAddress = useOverflowStore(state => state.setAddress);
    const setIsConnected = useOverflowStore(state => state.setIsConnected);
    const setNetwork = useOverflowStore(state => state.setNetwork);
    const refreshWalletBalance = useOverflowStore(state => state.refreshWalletBalance);
    const fetchProfile = useOverflowStore(state => state.fetchProfile);

    // Listen for connect event dispatched from WalletConnectModal
    useEffect(() => {
        const handler = () => handleConnectToPushWallet();
        window.addEventListener(PUSH_CONNECT_EVENT, handler);
        return () => window.removeEventListener(PUSH_CONNECT_EVENT, handler);
    }, [handleConnectToPushWallet]);

    // Store pushChainClient in module-level global for use in DepositModal etc.
    useEffect(() => {
        if (pushChainClient) {
            setPushChainClientGlobal(pushChainClient);
        }
    }, [pushChainClient]);

    // Sync Push wallet state to Zustand
    useEffect(() => {
        if (
            connectionStatus === ConnectionStatus.CONNECTED &&
            universalAccount?.address &&
            preferredNetwork === 'PUSH'
        ) {
            const addr = universalAccount.address;
            setNetwork('PUSH');
            if (address !== addr) {
                setAddress(addr);
                setIsConnected(true);
                refreshWalletBalance();
                fetchProfile(addr);
            }
        } else if (connectionStatus === ConnectionStatus.NOT_CONNECTED) {
            const state = useOverflowStore.getState();
            if (state.network === 'PUSH') {
                setAddress(null);
                setIsConnected(false);
                setNetwork(null);
            }
        }
    }, [connectionStatus, universalAccount, preferredNetwork]);

    // Added polling for PUSH balance updates
    useEffect(() => {
        if (connectionStatus === ConnectionStatus.CONNECTED && preferredNetwork === 'PUSH') {
            const interval = setInterval(() => {
                refreshWalletBalance();
            }, 10000); // 10s polling
            return () => clearInterval(interval);
        }
    }, [connectionStatus, preferredNetwork, refreshWalletBalance]);

    return null;
}

export default function PushProviderInner() {
    return (
        <PushUniversalWalletProvider
            config={{
                uid: 'bynomo-push-wallet',
                network: PUSH_NETWORK.TESTNET,
                rpcUrl: process.env.NEXT_PUBLIC_PUSH_RPC_ENDPOINT || 'https://evm.rpc-testnet-donut-node1.push.org/',
                login: {
                    email: true,
                    google: true,
                    wallet: {
                        enabled: true,
                    }
                }
            }}
            app={{
                title: 'TapT',
                description: 'Binary Options on Push Chain',
                logoUrl: 'https://tapt.fun/brand/tapt-mark.jpg',
                url: 'https://tapt.fun',
            } as any}
            themeMode="dark"
        >
            <PushWalletSyncInner />
        </PushUniversalWalletProvider>
    );
}
