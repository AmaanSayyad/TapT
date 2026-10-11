'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { chainMark } from '@/components/wallet/WalletConnect';
import { useOverflowStore } from '@/lib/store';
import { getFeePercent, getFeePercentLabel } from '@/lib/fees/platformFee';
import { resolveHouseLedgerCurrency } from '@/lib/balance/houseLedgerCurrency';
import { useToast } from '@/lib/hooks/useToast';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient, useAccount } from 'wagmi';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, withdrawFunds, houseBalance, network, refreshWalletBalance, isConnected } = useOverflowStore();
  const toast = useToast();
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const { connector } = useAccount();

  // Aptos Hook
  const { signMessage: signAptosMessage, connected: isAptosConnected } = useAptosWallet();

  const selectedCurrency = useOverflowStore(state => state.selectedCurrency);
  const setSelectedCurrency = useOverflowStore(state => state.setSelectedCurrency);
  const suiToken = network === 'SUI' ? (selectedCurrency === 'USDC' ? 'USDC' : 'SUI') : null;
  const userTier = useOverflowStore(state => state.userTier);
  const feePercent = getFeePercent(userTier);
  const feeLabel = getFeePercentLabel(userTier);
  const currencySymbol =
    network === 'ROBINHOOD' || network === 'ARB' ? 'ETH' :
      network === 'BASE' ? 'USDC' :
      network === 'TEMPO' ? 'OUSD' :
    network === 'SUI' ? (suiToken ?? 'SUI') :
      network === 'SOL' ? 'SOL' :
        network === 'APT' ? 'APT' :
          network === 'XLM' ? 'XLM' :
            network === 'XTZ' ? 'XTZ' :
              network === 'NEAR' ? 'NEAR' :
                network === 'STRK' ? 'STRK' :
                  network === 'PUSH' ? 'PC' :
                    network === 'SOMNIA' ? 'STT' :
                      network === 'OCT' ? 'OCT' :
                        network === 'ZG' ? '0G' :
                          network === 'INIT' ? 'INIT' :
                            'BNB';

  const networkName =
    network === 'ROBINHOOD' ? 'Robinhood Chain' :
      network === 'BASE' ? 'Base' :
        network === 'ARB' ? 'Arbitrum One' :
          network === 'TEMPO' ? 'Tempo' :
    network === 'SUI' ? 'Sui Network' :
      network === 'SOL' ? 'Solana' :
        network === 'APT' ? 'Aptos Mainnet' :
          network === 'XLM' ? 'Stellar' :
            network === 'XTZ' ? 'Tezos' :
              network === 'NEAR' ? 'NEAR Protocol' :
                network === 'STRK' ? 'Starknet Mainnet' :
                  network === 'PUSH' ? 'Push Chain' :
                    network === 'SOMNIA' ? 'Somnia Testnet' :
                      network === 'OCT' ? 'OneChain' :
                        network === 'ZG' ? '0G Mainnet' :
                          network === 'INIT' ? 'Initia Mainnet' :
                            'BNB Chain';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const validateAmount = (value: string): string | null => {
    if (!value || value.trim() === '') {
      return 'Please enter an amount';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }

    if (numValue <= 0) {
      return 'Amount must be greater than zero';
    }

    if (numValue > houseBalance) {
      return 'Insufficient house balance';
    }

    return null;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleMaxClick = () => {
    if (houseBalance > 0) {
      setAmount(houseBalance.toString());
      setError(null);
    }
  };

  const handleWithdraw = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const withdrawAmount = parseFloat(amount);
      toast.info('Processing withdrawal...');

      let signature: string | undefined;
      let signedAt: number | undefined;
      const isEvmLike =
        network === 'BNB' ||
        network === 'PUSH' ||
        network === 'SOMNIA' ||
        network === 'ZG' ||
        network === 'ROBINHOOD' ||
        network === 'BASE' ||
        network === 'ARB' ||
        network === 'TEMPO';

      if (isEvmLike) {
        signedAt = Date.now();
        const ledgerCurrency = resolveHouseLedgerCurrency({
          network: network || 'ROBINHOOD',
          selectedCurrency,
          userAddress: address,
        });
        const message = `TapT withdrawal authorization\naddress:${address}\namount:${withdrawAmount.toFixed(8)}\ncurrency:${ledgerCurrency}\nsignedAt:${signedAt}`;
        toast.info('Sign the withdrawal in your wallet.');

        if (walletClient) {
          // MetaMask / any wagmi-connected wallet (works for BNB, PUSH, SOMNIA, ZG)
          signature = await walletClient.signMessage({ account: address as `0x${string}`, message });
        } else if (connector && network === 'ZG') {
          // Fallback: use wagmi connector provider for 0G signing
          const connectorProvider = await connector.getProvider() as any;
          const ethersModule = await import('ethers');
          const signer = await new ethersModule.ethers.BrowserProvider(connectorProvider).getSigner();
          signature = await signer.signMessage(message);
        } else if (authenticated) {
          // Privy embedded wallet fallback (BNB only)
          const wallet = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
          if (!wallet) throw new Error('Wallet not found for signing');
          const provider = await wallet.getEthereumProvider();
          const ethersModule = await import('ethers');
          const signer = await new ethersModule.ethers.BrowserProvider(provider).getSigner();
          signature = await signer.signMessage(message);
        } else {
          throw new Error('Unable to sign withdrawal authorization message for this wallet');
        }
      } else if (network === 'APT') {
        if (!isAptosConnected) throw new Error('Aptos wallet not connected');
        signedAt = Date.now();
        const message = `TapT withdrawal authorization\naddress:${address}\namount:${withdrawAmount.toFixed(8)}\ncurrency:APT\nsignedAt:${signedAt}`;
        
        toast.info('Please sign the withdrawal authorization message in your Aptos wallet...');
        
        const response = await signAptosMessage({
          message: message,
          nonce: signedAt.toString(),
        });
        
        signature = (response as any).signature;
      }

      // Call the withdrawal store action (which calls the backend)
      const result = await withdrawFunds(address, withdrawAmount, { signature, signedAt });

      // Refresh balances
      refreshWalletBalance();

      const txHash = (result && (result as any).txHash) ? String((result as any).txHash) : 'PENDING';
      const status = result && (result as any).status;

      if (status === 'pending') {
        toast.success('This withdrawal is over $10, so it is waiting for approval.');
        if (onSuccess) onSuccess(withdrawAmount, txHash);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Withdrawal successful:', txHash);
        }
        toast.success(
          `Successfully withdrew ${withdrawAmount.toFixed(4)} ${currencySymbol}! Balance updated.`
        );
        if (onSuccess) onSuccess(withdrawAmount, txHash);
      }
      onClose();
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Withdrawal error:', err);
      }
      const errorMessage = err.message || 'Failed to withdraw funds';
      setError(errorMessage);
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Withdraw ${currencySymbol}`}
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        {/* SUI token selector */}
        {network === 'SUI' && (
          <div className="flex gap-2">
            {(['SUI', 'USDC'] as const).map(tok => (
              <button
                key={tok}
                onClick={() => { setSelectedCurrency(tok); setAmount(''); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-black uppercase tracking-widest transition-colors ${
                  suiToken === tok
                    ? 'border-[#FF006E]/60 bg-[#FF006E]/10 text-[#FF006E]'
                    : 'border-white/10 bg-white/[0.03] text-white/30 hover:text-white/60'
                }`}
              >
                <img
                  src={tok === 'SUI' ? '/sui-logo.png' : '/logos/usdc-logo.png'}
                  alt={tok}
                  className="w-4 h-4 rounded-full"
                />
                {tok}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#9a9590]">House balance</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#ccff00]">
              {chainMark(network)?.logo ? <img src={chainMark(network)!.logo} alt="" className="h-4 w-4 rounded-sm object-contain" /> : null}
              {networkName}
            </span>
          </div>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">
            {houseBalance.toFixed(4)} <span className="text-base text-[#ccff00]">{currencySymbol}</span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="withdraw-amount" className="text-xs text-[#9a9590]">Amount</label>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isLoading || houseBalance === 0}
              className="text-xs text-[#ccff00] disabled:opacity-40"
            >
              Withdraw all
            </button>
          </div>
          <div className="relative">
            <input
              id="withdraw-amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={isLoading}
              className={`h-12 w-full rounded-xl border bg-black px-4 pr-16 text-lg text-white outline-none focus:border-[#ccff00] disabled:opacity-50 ${error ? 'border-[#ff5c5c]' : 'border-[#2a2a2a]'}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#9a9590]">
              {currencySymbol}
            </span>
          </div>
          <p className="text-xs leading-5 text-[#9a9590]">
            Fee {feeLabel}.
            {amount && !isNaN(parseFloat(amount)) ? (
              <span className="text-white"> You receive {(parseFloat(amount) * (1 - feePercent)).toFixed(4)} {currencySymbol}.</span>
            ) : null}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 flex-1 rounded-full border border-[#2a2a2a] text-sm text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isLoading || !amount || parseFloat(amount || '0') <= 0}
            className="h-11 flex-1 rounded-full bg-[#ccff00] text-sm font-medium text-[#110e08] disabled:opacity-40"
          >
            {isLoading ? 'Sending…' : `Withdraw ${currencySymbol}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
