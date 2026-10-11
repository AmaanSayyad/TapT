/**
 * Stellar (XLM) wallet kit – connect/disconnect via @creit.tech/stellar-wallets-kit
 */

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
} from '@creit.tech/stellar-wallets-kit';

let kitInstance: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      modules: allowAllModules(),
    });
  }
  return kitInstance;
}

/**
 * Initialize the Stellar Wallet Kit (creates the singleton). Call once on app load if you use XLM.
 */
export async function initWalletKit(): Promise<void> {
  getKit();
}

/**
 * Open the Stellar wallet selection modal and return the selected address, or null if closed/canceled.
 */
export async function openWalletModal(): Promise<string | null> {
  return new Promise((resolve) => {
    const kit = getKit();
    kit
      .openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            // Save successful wallet ID for restoration
            if (typeof window !== 'undefined') {
              localStorage.setItem('stellar_wallet_id', option.id);
            }
            resolve(address);
          } catch {
            resolve(null);
          }
        },
        onClosed: () => {
          resolve(null);
        },
      })
      .catch(() => resolve(null));
  });
}

/**
 * Attempt to restore a previous session using stored wallet ID.
 */
export async function restoreSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const savedId = localStorage.getItem('stellar_wallet_id');
  if (!savedId) return null;

  try {
    const kit = getKit();
    kit.setWallet(savedId);
    const { address } = await kit.getAddress();
    return address;
  } catch (e) {
    console.warn('Failed to restore Stellar session:', e);
    return null;
  }
}

/**
 * Disconnect the current Stellar wallet (clears stored address in the kit).
 */
export async function disconnectWallet(): Promise<void> {
  const kit = kitInstance;
  if (kit) {
    await kit.disconnect();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stellar_wallet_id');
  }
}
