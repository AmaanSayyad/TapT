/**
 * Wallet state slice for Zustand store
 * Manages wallet connection status and address
 * 
 * Note: This slice is now primarily used for storing wallet state.
 * Actual wallet connection is handled by BNB Wallet integration in lib/bnb/wallet.ts
 */

import { StateCreator } from "zustand";

export interface WalletState {
  // State
  address: string | null;
  walletBalance: number;
  isConnected: boolean;
  isConnecting: boolean;
  network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null;
  preferredNetwork: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null;
  selectedCurrency: string | null;
  error: string | null;
  isConnectModalOpen: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshWalletBalance: () => Promise<void>;
  clearError: () => void;
  setConnectModalOpen: (open: boolean) => void;

  // Setters for wallet integration
  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null) => void;
  setPreferredNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null) => void;
  setSelectedCurrency: (currency: string | null) => void;
}

/**
 * Create wallet slice for Zustand store
 * Handles wallet state management for multi-chain integration
 */
export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  // Initial state
  address: null,
  walletBalance: 0,
  isConnected: false,
  isConnecting: false,
  network: null,
  // Default preferred network for new sessions.
  // Users can switch networks via the connect modal / UI.
  preferredNetwork: (typeof window !== 'undefined' &&
    (['ROBINHOOD', 'BASE', 'ARB', 'TEMPO', 'SOL'].includes(localStorage.getItem('solnomo_preferred_network') || '')
      ? (localStorage.getItem('solnomo_preferred_network') as WalletState['preferredNetwork'])
      : null)) || 'ROBINHOOD',
  selectedCurrency: null,
  error: null,
  isConnectModalOpen: false,

  /**
   * Connect wallet
   * Note: Actual connection is handled by Privy integration
   */
  connect: async () => {
    set({ isConnectModalOpen: true });
  },

  /**
   * Disconnect wallet
   * Note: Actual disconnection is handled by Privy integration
   */
  disconnect: () => {
    console.log('Disconnect called - handled by Privy');
    const state = get() as any;
    const accountType = state.accountType;

    // Reset state
    set({
      address: null,
      walletBalance: 0,
      isConnected: false,
      isConnecting: false,
      network: null,
      selectedCurrency: null,
      error: null
    } as any);

    // Only clear profile data if we are NOT in demo mode AND don't have an access code
    // When exiting demo mode, we want to keep the accessCode to show the "Demo Mode" button
    // Also if the user just refreshed, we want to keep the accessCode if it exists
    const currentAccessCode = state.accessCode;
    if (accountType !== 'demo' && !currentAccessCode) {
      set({
        // @ts-ignore - Profile slice fields
        username: null,
        // @ts-ignore - Profile slice fields
        accessCode: null
      } as any);
    }
  },

  /**
   * Refresh token balance for connected wallet
   */
  refreshWalletBalance: async () => {
    const { address, isConnected, network } = get();

    if (!isConnected || !address || !network) {
      return;
    }

    try {
      if (network === 'BNB') {
        const { getBNBBalance } = await import('@/lib/bnb/client');
        const bal = await getBNBBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'SOL') {
        const { getSOLBalance } = await import('@/lib/solana/client');
        const bal = await getSOLBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'SUI') {
        const suiCurrency = get().selectedCurrency || 'SUI';
        if (suiCurrency === 'SUI') {
          const { getSUIBalance } = await import('@/lib/sui/client');
          const bal = await getSUIBalance(address);
          set({ walletBalance: bal });
        } else {
          const { getUSDCBalance } = await import('@/lib/sui/client');
          const bal = await getUSDCBalance(address);
          set({ walletBalance: bal });
        }
      } else if (network === 'XLM') {
        const { getXLMBalance } = await import('@/lib/stellar/client');
        const bal = await getXLMBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'XTZ') {
        const { getXTZBalance } = await import('@/lib/tezos/client');
        const bal = await getXTZBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'NEAR') {
        const { getNearBalance } = await import('@/lib/near/wallet');
        const bal = await getNearBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'STRK') {
        const { getSTRKBalance } = await import('@/lib/starknet/client');
        const bal = await getSTRKBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'PUSH') {
        const { getPUSHBalance } = await import('@/lib/push/client');
        const bal = await getPUSHBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'SOMNIA') {
        const { getSOMNIABalance } = await import('@/lib/somnia/client');
        const bal = await getSOMNIABalance(address);
        set({ walletBalance: bal });
      } else if (network === 'OCT') {
        const { getOCTBalance } = await import('@/lib/onechain/client');
        const bal = await getOCTBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'ZG') {
        const { getZGBalance } = await import('@/lib/zg/client');
        const bal = await getZGBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'INIT') {
        const { getINITBalance } = await import('@/lib/initia/balance');
        const bal = await getINITBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'APT') {
        const { getAPTBalance } = await import('@/lib/aptos/client');
        const bal = await getAPTBalance(address);
        set({ walletBalance: bal });
      } else if (network === 'ROBINHOOD' || network === 'BASE' || network === 'ARB' || network === 'TEMPO') {
        const { readEvmWalletBalance } = await import('@/lib/chains/evmTreasury');
        const bal = await readEvmWalletBalance(network, address);
        set({ walletBalance: bal });
      }
    } catch (error) {
      console.error("Error refreshing wallet balance:", error);
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set connect modal visibility
   */
  setConnectModalOpen: (open: boolean) => {
    set({ isConnectModalOpen: open });
  },

  /**
   * Set address (used by wallet integration)
   */
  setAddress: (address: string | null) => {
    set({ address });
  },

  /**
   * Set connected status (used by wallet integration)
   */
  setIsConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  /**
   * Set active network (BNB, SOL, SUI, XLM, XTZ, NEAR, STRK, PUSH or APT)
   */
  setNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null) => {
    set({ network });
  },

  setPreferredNetwork: (network: 'BNB' | 'SOL' | 'SUI' | 'XLM' | 'XTZ' | 'NEAR' | 'STRK' | 'PUSH' | 'SOMNIA' | 'OCT' | 'ZG' | 'INIT' | 'APT' | 'ROBINHOOD' | 'BASE' | 'ARB' | 'TEMPO' | null) => {
    const effective = network;
    set({ preferredNetwork: effective });
    if (typeof window !== 'undefined') {
      if (effective) {
        localStorage.setItem('solnomo_preferred_network', effective);
      } else {
        localStorage.removeItem('solnomo_preferred_network');
      }
    }
  },

  /**
   * Set selected currency for the current network
   */
  setSelectedCurrency: (currency: string | null) => {
    set({ selectedCurrency: currency === 'BYNOMO' ? 'SOL' : currency });
    // Trigger balance refresh when currency changes
    const { isConnected, address } = get();
    if (isConnected && address) {
      get().refreshWalletBalance();
    }
  }
});
