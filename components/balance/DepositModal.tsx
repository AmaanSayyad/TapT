'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Modal } from '@/components/ui/Modal';
import { chainMark } from '@/components/wallet/WalletConnect';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { getBNBConfig } from '@/lib/bnb/config';
import { formatUnits, getAddress, pad, parseUnits } from 'viem';
import { getSomniaConfig } from '@/lib/somnia/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSuiConfig } from '@/lib/sui/config';
import { buildDepositTransaction as buildSuiDepositTransaction, buildNativeSuiDepositTransaction } from '@/lib/sui/client';

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { tempo, EVM_CHAINS, type EvmPlayNetwork } from '@/lib/chains/supported';
import { parseEther } from 'viem';
import { useInterwovenKit } from '@initia/interwovenkit-react';

const TEMPO_TRANSFER_MEMO_ABI = [
  {
    name: 'transferWithMemo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

async function readTreasury(network: EvmPlayNetwork): Promise<string> {
  const response = await fetch(`/api/treasury?network=${network}`);
  if (!response.ok) return '';
  const data = await response.json();
  return String(data.address || '').trim();
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayWalletBalance, setDisplayWalletBalance] = useState<number>(0);
  const [sentTransfer, setSentTransfer] = useState<{ hash: string; amount: number } | null>(null);
  const [coinbaseNotice, setCoinbaseNotice] = useState(false);

  const { wallets: privyWallets } = useWallets();
  const { authenticated, user } = usePrivy();

  // Solana Hook
  const { sendTransaction: signAndSendSolana, publicKey: solanaPublicKey } = useSolanaWallet();

  // Sui Hooks
  const { mutateAsync: signAndExecuteSui } = useSignAndExecuteTransaction();
  const suiAccount = useCurrentAccount();

  // Aptos Hook
  const { signAndSubmitTransaction: signAndSubmitAptos, connected: isAptosConnected } = useAptosWallet();

  // wagmi wallet client — already authorized, no eth_requestAccounts needed
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const tempoClient = usePublicClient({ chainId: tempo.id });
  const { connector } = useAccount();

  // Initia / InterwovenKit
  const { requestTxBlock: requestInitiaTx } = useInterwovenKit();

  const { depositFunds, network, walletBalance, refreshWalletBalance, address } = useOverflowStore();
  const toast = useToast();

  const assetPrices = useOverflowStore(state => state.assetPrices);
  const selectedCurrency = useOverflowStore(state => state.selectedCurrency);
  const setSelectedCurrency = useOverflowStore(state => state.setSelectedCurrency);
  const suiToken = network === 'SUI' ? (selectedCurrency === 'USDC' ? 'USDC' : 'SUI') : null;
  const currencySymbol = network === 'ROBINHOOD' || network === 'ARB' ? 'ETH' : network === 'BASE' ? 'USDC' : network === 'TEMPO' ? 'OUSD' : network === 'SUI' ? (suiToken ?? 'SUI') : network === 'SOL' ? 'SOL' : network === 'APT' ? 'APT' : network === 'XLM' ? 'XLM' : network === 'XTZ' ? 'XTZ' : network === 'NEAR' ? 'NEAR' : network === 'STRK' ? 'STRK' : network === 'PUSH' ? 'PC' : network === 'SOMNIA' ? 'STT' : network === 'OCT' ? 'OCT' : network === 'ZG' ? '0G' : network === 'INIT' ? 'INIT' : 'BNB';
  const networkName = network === 'ROBINHOOD' ? 'Robinhood Chain' : network === 'BASE' ? 'Base' : network === 'ARB' ? 'Arbitrum One' : network === 'TEMPO' ? 'Tempo' : network === 'SUI' ? 'Sui Network' : network === 'SOL' ? 'Solana' : network === 'APT' ? 'Aptos Mainnet' : network === 'XLM' ? 'Stellar' : network === 'XTZ' ? 'Tezos' : network === 'NEAR' ? 'NEAR Protocol' : network === 'STRK' ? 'Starknet Mainnet' : network === 'PUSH' ? 'Push Chain Donut' : network === 'SOMNIA' ? 'Somnia Testnet' : network === 'OCT' ? 'OneChain' : network === 'ZG' ? '0G Mainnet' : network === 'INIT' ? 'Initia Mainnet' : 'BNB Chain';
  const unitUsd = currencySymbol === 'USDC' || currencySymbol === 'OUSD' ? 1 : (assetPrices[currencySymbol] || 0);
  const usdFor = (tokenAmount: number) => {
    if (!(unitUsd > 0) || !(tokenAmount > 0)) return null;
    const usd = tokenAmount * unitUsd;
    return usd.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: usd < 1 ? 4 : 2,
    });
  };
  const walletUsd = usdFor(displayWalletBalance);
  const amountUsd = usdFor(parseFloat(amount) || 0);

  // Quick select amounts
  const quickAmounts = network === 'SUI' ? (suiToken === 'USDC' ? [1, 5, 10, 25] : [0.5, 1, 2, 5]) : [0.1, 0.5, 1, 5];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
      setCoinbaseNotice(false);
    }
  }, [isOpen]);

  // Keep the modal wallet balance in sync with the connected chain.
  useEffect(() => {
    let cancelled = false;
    const syncDisplayedBalance = async () => {
      if (!isOpen || !address || !network) {
        if (!cancelled) setDisplayWalletBalance(0);
        return;
      }

      try {
        if (network === 'SOL') {
          const { getSOLBalance } = await import('@/lib/solana/client');
          const bal = await getSOLBalance(address);
          if (!cancelled) setDisplayWalletBalance(bal);
          return;
        }

        // Non-Solana networks continue to use store-fed walletBalance.
        if (!cancelled) setDisplayWalletBalance(walletBalance);
      } catch {
        if (!cancelled) {
          setDisplayWalletBalance(walletBalance);
        }
      }
    };

    void syncDisplayedBalance();
    return () => {
      cancelled = true;
    };
  }, [isOpen, address, network, selectedCurrency, walletBalance]);

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

    if (numValue > displayWalletBalance) {
      return `Insufficient ${currencySymbol} balance`;
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

  const handleQuickSelect = (value: number) => {
    setAmount(value.toString());
    setError(null);
  };

  const handleMaxClick = async () => {
    if (displayWalletBalance <= 0) return;
    const nativeEvm = network === 'ROBINHOOD' || network === 'ARB';
    let gasBuffer = network === 'BASE' ? 0 : network === 'SUI' ? (suiToken === 'SUI' ? 0.01 : 0) : network === 'SOL' ? 0.001 : network === 'APT' ? 0.001 : nativeEvm ? 0.00002 : 0.0005;
    if (nativeEvm && publicClient) {
      try {
        const gasPrice = await publicClient.getGasPrice();
        const fee = Number(formatUnits(21_000n * gasPrice * 3n, 18));
        if (Number.isFinite(fee) && fee > 0 && fee < displayWalletBalance) gasBuffer = fee;
      } catch {
        gasBuffer = 0.00002;
      }
    }
    if (network === 'TEMPO' && tempoClient && address) {
      try {
        const treasury = await readTreasury('TEMPO');
        const token = EVM_CHAINS.TEMPO.token;
        if (treasury && token) {
          const memo = pad(getAddress(address), { size: 32 });
          const gas = await tempoClient.estimateContractGas({
            address: token.address,
            abi: TEMPO_TRANSFER_MEMO_ABI,
            functionName: 'transferWithMemo',
            args: [getAddress(treasury), parseUnits('1', token.decimals), memo],
            account: getAddress(address),
          });
          const gasPrice = await tempoClient.getGasPrice();
          const padded = (gas * 3n) / 2n;
          const micro = (padded * gasPrice + 10n ** 12n - 1n) / 10n ** 12n;
          gasBuffer = Number(formatUnits(micro, token.decimals));
        }
      } catch {
        gasBuffer = 0.005;
      }
    }
    const maxAmount = displayWalletBalance - gasBuffer;
    if (!(maxAmount > 0)) {
      setAmount('');
      setError(`Not enough ${currencySymbol} left after the network fee.`);
      return;
    }
    const decimals = network === 'TEMPO' || network === 'BASE' ? 6 : 8;
    setAmount(maxAmount.toFixed(decimals).replace(/\.?0+$/, ''));
    setError(null);
  };

  const payWithCoinbase = async (depositAmount: number): Promise<string> => {
    const treasury = await readTreasury('BASE');
    if (!treasury) throw new Error('Base treasury is not configured.');
    const { pay, getPaymentStatus } = await import('@base-org/account/payment/browser');
    toast.info('Confirm the USDC payment in Coinbase Wallet...');
    const payment = await pay({
      amount: depositAmount.toString(),
      to: treasury,
      testnet: false,
      telemetry: false,
    });
    toast.info('Waiting for Base...');
    const deadline = Date.now() + 60_000;
    let status = await getPaymentStatus({ id: payment.id, testnet: false, telemetry: false });
    while (status.status === 'pending' || status.status === 'not_found') {
      if (Date.now() > deadline) {
        throw new Error('Base has not confirmed this payment yet. It was not added to your balance.');
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      status = await getPaymentStatus({ id: payment.id, testnet: false, telemetry: false });
    }
    if (status.status !== 'completed') {
      throw new Error(status.reason || status.message || 'Base payment failed.');
    }
    if (!status.sender || status.sender.toLowerCase() !== address!.toLowerCase()) {
      throw new Error('Coinbase paid from a different wallet than the one connected. This payment was not added to this account.');
    }
    return payment.id;
  };

  const handleDeposit = async (mode: 'wallet' | 'coinbase' = 'wallet') => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (mode === 'coinbase' && !coinbaseNotice) {
      setCoinbaseNotice(true);
      setError(null);
      return;
    }

    let txHash = '';
    let depositAmount = 0;
    try {
      setIsLoading(true);
      setError(null);

      depositAmount = parseFloat(amount);

      if (mode === 'coinbase') {
        if (network !== 'BASE') throw new Error('Coinbase Pay is only for Base USDC.');
        txHash = await payWithCoinbase(depositAmount);
      } else if (network === 'SUI') {
        if (!suiAccount) throw new Error('Sui wallet not connected');
        toast.info('Please confirm the transaction in your Sui wallet...');

        const tx = suiToken === 'SUI'
          ? await buildNativeSuiDepositTransaction(depositAmount, address)
          : await buildSuiDepositTransaction(depositAmount, address);
        const result = await signAndExecuteSui({ transaction: tx as any });
        txHash = result.digest;

      } else if (network === 'SOL') {
        if (!solanaPublicKey) throw new Error('Solana wallet not connected');

        const { buildDepositTransaction, getSolanaConnection, waitForSolanaSignatureConfirmed } = await import('@/lib/solana/client');
        const connection = getSolanaConnection();
        const transaction = await buildDepositTransaction(depositAmount, address);

        toast.info('Please confirm the transaction in your Solana wallet...');

        txHash = await signAndSendSolana(transaction, connection);
        toast.info('Waiting for on-chain confirmation...');
        await waitForSolanaSignatureConfirmed(connection, txHash);
      } else if (network === 'NEAR') {
        const { depositNEAR } = await import('@/lib/near/wallet');
        toast.info('Please confirm the transaction in your NEAR wallet...');
        txHash = await depositNEAR(amount);
      } else if (network === 'PUSH') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        const { getPushConfig } = await import('@/lib/push/config');
        const pushConfig = getPushConfig();
        if (!pushConfig.treasuryAddress) throw new Error('Push Chain treasury address not configured.');
        toast.info('Please confirm the transaction in your wallet...');
        const pushHash = await walletClient.sendTransaction({
          to: pushConfig.treasuryAddress as `0x${string}`,
          value: parseEther(depositAmount.toString()),
        });
        toast.info('Transaction submitted. Waiting for confirmation...');
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, { hash: pushHash as `0x${string}`, timeout: 60_000 });
        txHash = pushHash;
      } else if (network === 'STRK') {
        const { depositSTRK } = await import('@/lib/starknet/wallet');
        toast.info('Please confirm the transaction in your Starknet wallet...');
        txHash = await depositSTRK(depositAmount);
      } else if (network === 'XTZ') {
        const { BeaconWallet } = await import('@taquito/beacon-wallet');
        const { NetworkType } = await import('@airgap/beacon-types');
        const { getTezosClient } = await import('@/lib/tezos/client');

        const rpcUrl = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://rpc.tzkt.io/mainnet';
        const wallet = new BeaconWallet({
          name: "TapT",
          preferredNode: rpcUrl,
          network: {
            type: NetworkType.MAINNET,
            rpcUrl,
          },
        } as any);

        // Clear any cached connection that might use old ecadinfra RPC
        await wallet.clearActiveAccount();
        await wallet.requestPermissions();

        const tezos = await getTezosClient();
        tezos.setWalletProvider(wallet);

        const treasuryAddress = process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS;
        if (!treasuryAddress) throw new Error('Tezos treasury not configured');

        toast.info('Please confirm the transaction in your Tezos wallet...');
        const op = await tezos.wallet.transfer({ to: treasuryAddress, amount: depositAmount }).send();
        toast.info('Waiting for Tezos inclusion (needed for deposit verification)...');
        await Promise.race([
          op.confirmation(1),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error('Tezos confirmation timed out after 2 minutes')), 120_000),
          ),
        ]);
        txHash = op.opHash;
      } else if (network === 'XLM') {
        // Stellar deposit via Stellar Wallets Kit
        const { StellarWalletsKit, WalletNetwork, allowAllModules } = await import('@creit.tech/stellar-wallets-kit');
        const { TransactionBuilder, Networks, Operation, Asset } = await import('@stellar/stellar-sdk');
        const { Horizon } = await import('@stellar/stellar-sdk');

        const treasuryAddress = process.env.NEXT_PUBLIC_STELLAR_TREASURY_ADDRESS;
        if (!treasuryAddress) throw new Error('Stellar treasury not configured');

        const server = new Horizon.Server(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon.stellar.org');
        const account = await server.loadAccount(address);

        const transaction = new TransactionBuilder(account, {
          fee: '100',
          networkPassphrase: Networks.PUBLIC,
        })
          .addOperation(
            Operation.payment({
              destination: treasuryAddress,
              asset: Asset.native(),
              amount: depositAmount.toFixed(7),
            })
          )
          .setTimeout(30)
          .build();

        const kit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          modules: allowAllModules(),
        });

        toast.info('Please confirm the transaction in your Stellar wallet...');
        const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());
        const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedTxXdr, Networks.PUBLIC));
        txHash = (result as any).hash || (result as any).id || signedTxXdr.slice(0, 16);
      } else if (network === 'SOMNIA') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');

        const somniaConfig = getSomniaConfig();
        if (!somniaConfig.treasuryAddress) throw new Error('Somnia treasury address not configured');

        toast.info('Please confirm the transaction in your wallet...');
        const somniaHash = await walletClient.sendTransaction({
          to: getAddress(somniaConfig.treasuryAddress as string),
          value: parseEther(depositAmount.toString()),
        });
        toast.info('Transaction submitted. Waiting for on-chain confirmation...');
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, { hash: somniaHash as `0x${string}`, timeout: 60_000 });
        txHash = somniaHash;
      } else if (network === 'ZG') {
        const { getZGConfig } = await import('@/lib/zg/config');
        const zgConfig = getZGConfig();
        if (!zgConfig.treasuryAddress) throw new Error('0G treasury address not configured');
        if (!connector) throw new Error('Wallet not connected. Please reconnect.');

        // Get the provider from the current wagmi connector (avoids window.ethereum pointing to wrong wallet)
        const connectorProvider = await connector.getProvider() as any;
        const zgChainIdHex = '0x' + (16661).toString(16);

        // Ensure wallet is on 0G Mainnet — add if needed
        try {
          await connectorProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: zgChainIdHex }] });
        } catch (switchErr: any) {
          if (switchErr.code === 4902 || switchErr.code === -32603) {
            await connectorProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: zgChainIdHex,
                chainName: '0G Mainnet',
                nativeCurrency: { name: '0G Token', symbol: '0G', decimals: 18 },
                rpcUrls: ['https://evmrpc.0g.ai'],
                blockExplorerUrls: ['https://chainscan.0g.ai'],
              }],
            });
          } else if (switchErr.code !== 4001) {
            // 4001 = user rejected switch (already on 0G or cancelled) — continue anyway
            throw switchErr;
          }
        }

        toast.info('Please confirm the transaction in your wallet...');
        const { ethers: ethersLib } = await import('ethers');
        const provider = new ethersLib.BrowserProvider(connectorProvider);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: zgConfig.treasuryAddress as string,
          value: ethersLib.parseEther(depositAmount.toString()),
        });
        toast.info('Transaction submitted. Waiting for on-chain confirmation...');
        const receipt = await tx.wait();
        txHash = receipt!.hash;
      } else if (network === 'OCT') {
        if (!suiAccount) throw new Error('Sui-compatible wallet not connected');
        const { buildOCTDepositTransaction } = await import('@/lib/onechain/client');
        toast.info('Please confirm the transaction in your Sui wallet...');
        const tx = await buildOCTDepositTransaction(depositAmount, address);
        const result = await signAndExecuteSui({ transaction: tx as any });
        txHash = result.digest;
      } else if (network === 'INIT') {
        const { buildInitiaDepositTxRequest } = await import('@/lib/initia/client');
        const txRequest = buildInitiaDepositTxRequest(address, depositAmount);
        toast.info('Please confirm the transaction in your Initia wallet...');
        const result = await requestInitiaTx(txRequest);
        txHash = result.transactionHash;
      } else if (network === 'APT') {
        if (!isAptosConnected) throw new Error('Aptos wallet not connected');
        const { getAptosConfig } = await import('@/lib/aptos/config');
        const aptosConfig = getAptosConfig();
        
        toast.info('Please confirm the transaction in your Aptos wallet...');
        
        // Build transaction payload for APT transfer
        const result = await signAndSubmitAptos({
          data: {
            function: "0x1::aptos_account::transfer",
            typeArguments: [],
            functionArguments: [aptosConfig.treasuryAddress, Math.floor(depositAmount * 100_000_000)], // 8 decimals for APT
          },
        });
        
        txHash = result.hash;
      } else if (network === 'ROBINHOOD' || network === 'BASE' || network === 'ARB' || network === 'TEMPO') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        const spec = EVM_CHAINS[network];
        const treasury = await readTreasury(spec.network);
        if (!treasury) throw new Error(`${spec.name} treasury is not configured.`);
        toast.info('Please confirm the transaction in your wallet...');
        let hash: `0x${string}`;
        if (spec.token) {
          const units = parseUnits(depositAmount.toString(), spec.token.decimals);
          if (network === 'TEMPO') {
            const memo = pad(getAddress(address), { size: 32 });
            const args = [getAddress(treasury), units, memo] as const;
            let gas: bigint | undefined;
            try {
              if (!tempoClient) throw new Error('Tempo client unavailable');
              const estimated = await tempoClient.estimateContractGas({
                address: spec.token.address,
                abi: TEMPO_TRANSFER_MEMO_ABI,
                functionName: 'transferWithMemo',
                args,
                account: getAddress(address),
              });
              gas = (estimated * 12n) / 10n;
            } catch {
              gas = undefined;
            }
            hash = await walletClient.writeContract({
              address: spec.token.address,
              abi: TEMPO_TRANSFER_MEMO_ABI,
              functionName: 'transferWithMemo',
              args,
              gas,
            });
          } else {
            hash = await walletClient.writeContract({
              address: spec.token.address,
              abi: [{
                name: 'transfer',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'to', type: 'address' },
                  { name: 'amount', type: 'uint256' },
                ],
                outputs: [{ name: '', type: 'bool' }],
              }],
              functionName: 'transfer',
              args: [getAddress(treasury), units],
            });
          }
        } else {
          const value = parseEther(depositAmount.toString());
          const to = getAddress(treasury);
          let gas: bigint | undefined;
          if (network === 'ARB') {
            try {
              const estimated = await publicClient?.estimateGas({
                account: walletClient.account,
                to,
                value,
              });
              if (estimated) gas = (estimated * 12n) / 10n;
            } catch {
              gas = undefined;
            }
          }
          hash = await walletClient.sendTransaction({ to, value, gas });
        }
        toast.info(
          network === 'ARB'
            ? 'Transaction submitted. Waiting for the Arbitrum block...'
            : network === 'TEMPO'
              ? 'Transaction submitted. Waiting for Tempo finality...'
              : network === 'BASE'
                ? 'Transaction submitted. Waiting for the Base block...'
                : 'Transaction submitted. Waiting for on-chain confirmation...',
        );
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, {
          hash,
          timeout: 60_000,
          confirmations: network === 'ARB' || network === 'TEMPO' || network === 'BASE' ? 1 : undefined,
        });
        txHash = hash;
      } else if (network == null) {
        throw new Error('This chain is turned off. Connect Robinhood Chain, Base, Arbitrum, Tempo, or Solana.');
      } else {
        // BNB (EVM) — support both wagmi wallets (MetaMask) and Privy embedded wallets.
        const bnbConfig = getBNBConfig();
        if (!bnbConfig.treasuryAddress) throw new Error('Treasury address not configured');

        if (walletClient) {
          toast.info('Please confirm the transaction in your wallet...');
          const bnbHash = await walletClient.sendTransaction({
            to: getAddress(bnbConfig.treasuryAddress as string),
            value: parseEther(depositAmount.toString()),
          });
          toast.info('Transaction submitted. Waiting for on-chain confirmation...');
          const { waitForTransactionReceipt } = await import('@wagmi/core');
          const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
          await waitForTransactionReceipt(wagmiCfg, { hash: bnbHash as `0x${string}`, timeout: 60_000 });
          txHash = bnbHash;
        } else {
          if (!authenticated) throw new Error('Not authenticated with Privy');
          const wallet = privyWallets.find(w => w.address.toLowerCase() === address.toLowerCase());
          if (!wallet) throw new Error('Privy wallet not found');

          const ethereumProvider = await wallet.getEthereumProvider();
          const provider = new ethers.BrowserProvider(ethereumProvider);
          const signer = await provider.getSigner();

          toast.info('Please confirm the transaction in your wallet...');
          const txResponse = await signer.sendTransaction({
            to: getAddress(bnbConfig.treasuryAddress),
            value: ethers.parseEther(depositAmount.toString()),
          });
          await txResponse.wait();
          txHash = txResponse.hash;
        }
      }

      toast.info('Transaction submitted. Waiting for confirmation...');

      // Update balance in database
      await depositFunds(address, depositAmount, txHash!);

      // Refresh balances
      refreshWalletBalance();

      toast.success(`${depositAmount.toFixed(4)} ${currencySymbol} is in your house balance.`);

      if (onSuccess) onSuccess(depositAmount, txHash!);
      onClose();
    } catch (err: any) {
      console.error('Deposit error:', err);
      if (txHash) {
        setSentTransfer({ hash: txHash, amount: depositAmount });
        const held = 'Your transfer is on-chain, but the house balance could not be saved. Do not send it again.';
        setError(held);
        toast.error(held);
        if (onError) onError(held);
        return;
      }
      const errorMessage = err.message || 'Failed to deposit funds';
      setError(errorMessage);
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const creditSentTransfer = async () => {
    if (!sentTransfer || !address) return;
    try {
      setIsLoading(true);
      setError(null);
      await depositFunds(address, sentTransfer.amount, sentTransfer.hash);
      refreshWalletBalance();
      toast.success(`House balance updated with ${sentTransfer.amount.toFixed(4)} ${currencySymbol}.`);
      setSentTransfer(null);
      if (onSuccess) onSuccess(sentTransfer.amount, sentTransfer.hash);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The house balance still could not be saved.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deposit ${currencySymbol}`}
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
                    ? 'border-[#00f5ff]/60 bg-[#00f5ff]/10 text-[#00f5ff]'
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
            <p className="text-xs text-[#9a9590]">In your wallet</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#ccff00]">
              {chainMark(network)?.logo ? <img src={chainMark(network)!.logo} alt="" className="h-4 w-4 rounded-sm object-contain" /> : null}
              {networkName}
            </span>
          </div>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">
            {displayWalletBalance.toFixed(4)} <span className="text-base text-[#ccff00]">{currencySymbol}</span>
          </p>
          {walletUsd && <p className="mt-1 text-sm tabular-nums text-[#9a9590]">{walletUsd}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="deposit-amount" className="text-xs text-[#9a9590]">Amount</label>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isLoading}
              className="text-xs text-[#ccff00] disabled:opacity-40"
            >
              Use max
            </button>
          </div>
          <div className="relative">
            <input
              id="deposit-amount"
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
          {amountUsd && <p className="text-xs tabular-nums text-[#9a9590]">{amountUsd}</p>}

          {network === 'TEMPO' && (
            <p className="text-[11px] text-[#9a9590]">
              The OUSD you send arrives in full. Tempo takes the network fee in OUSD on top of it.
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => handleQuickSelect(quickAmount)}
              disabled={isLoading}
              className={`h-10 rounded-xl text-sm disabled:opacity-40 ${amount === quickAmount.toString() ? 'bg-[#ccff00] text-[#110e08]' : 'border border-[#2a2a2a] bg-[#141414] text-[#9a9590]'}`}
            >
              {quickAmount}
            </button>
          ))}
        </div>

        {network === 'BASE' && coinbaseNotice && address && (
          <div className="rounded-2xl border border-[#2a2a2a] bg-black px-4 py-4">
            <p className="text-sm text-white">Check the Coinbase address</p>
            <p className="mt-2 text-sm leading-6 text-[#9a9590]">Pay only if Coinbase shows</p>
            <p className="mt-1 font-mono text-sm text-[#ccff00]">{`${address.slice(0, 6)}…${address.slice(-4)}`}</p>
            <p className="mt-2 text-sm leading-6 text-[#9a9590]">If it shows another address, cancel. Send from wallet uses the account connected here.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs font-mono">{error}</p>
            {sentTransfer && (
              <button
                type="button"
                onClick={creditSentTransfer}
                disabled={isLoading}
                className="mt-2 h-9 w-full rounded-full bg-[#ccff00] text-xs font-medium text-[#110e08] disabled:opacity-40"
              >
                Credit this transfer
              </button>
            )}
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
          {network === 'BASE' && (
            <button
              type="button"
              onClick={() => handleDeposit('wallet')}
              disabled={isLoading || !amount || parseFloat(amount || '0') <= 0 || !!sentTransfer}
              className={`h-11 flex-1 rounded-full text-sm disabled:opacity-40 ${coinbaseNotice ? 'bg-[#ccff00] font-medium text-[#110e08]' : 'border border-[#2a2a2a] text-white'}`}
            >
              Send from wallet
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDeposit(network === 'BASE' ? 'coinbase' : 'wallet')}
            disabled={isLoading || !amount || parseFloat(amount || '0') <= 0 || !!sentTransfer}
            className={`h-11 flex-1 rounded-full text-sm disabled:opacity-40 ${network === 'BASE' && coinbaseNotice ? 'border border-[#2a2a2a] text-white' : 'bg-[#ccff00] font-medium text-[#110e08]'}`}
          >
            {isLoading ? 'Sending…' : network === 'BASE' ? (coinbaseNotice ? 'Open Coinbase' : 'Pay with Coinbase') : `Deposit ${currencySymbol}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
