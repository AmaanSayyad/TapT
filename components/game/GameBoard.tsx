'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { LiveChart } from './';
import { BalanceDisplay } from '@/components/balance';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getBNBConfig } from '@/lib/bnb/config';
import { getAddress, pad, parseUnits } from 'viem';
import { EVM_CHAINS, type EvmPlayNetwork } from '@/lib/chains/supported';
import { blitzTokenForUsd, blitzTreasury, formatBlitzToken } from '@/lib/fees/blitzEntry';
import { ethers } from 'ethers';
import { useToast } from '@/lib/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ShieldCheck, Loader2, Wallet } from 'lucide-react';
import { useSignAndExecuteTransaction, useCurrentAccount, useDisconnectWallet as useSuiDisconnect } from '@mysten/dapp-kit';
import { useWalletClient, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { parseEther } from 'viem';
import posthog from 'posthog-js';
import { useSomniaReactivity } from '@/lib/hooks/useSomniaReactivity';


export const GameBoard: React.FC = () => {
  const {
    address,
    isConnected,
    network,
    walletBalance,
    houseBalance,
    accountType,
    bets,
    gameMode,
    setGameMode,
    setTimeframeSeconds,
    selectedAsset,
    updatePrice,
    placeBetFromHouseBalance,
    isBlitzActive,
    blitzEndTime,
    nextBlitzTime,
    hasBlitzAccess,
    updateBlitzTimer,
    enableBlitzAccess,
    assetPrices,
    error,
    clearError,
    isLoading: isLoadingBalance,
    activeTab,
    setConnectModalOpen,
    setActiveTab,
    userTier,
    refreshWalletBalance,
    accessCode,
    fetchProfile,
    selectedCurrency,
  } = useStore();

  // Real-time house balance updates for Somnia via Somnia Reactivity
  useSomniaReactivity();

  const { wallets } = useWallets();
  const { } = usePrivy();
  const { sendTransaction: sendSolanaTransaction } = useSolanaWallet();
  const { data: walletClient } = useWalletClient();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
  const { mutate: disconnectSui } = useSuiDisconnect();
  const { disconnect: disconnectInitia, requestTxBlock: requestInitiaTx } = useInterwovenKit();
  const { signAndSubmitTransaction: signAndSubmitAptos, disconnect: disconnectAptos } = useAptosWallet();

  const [betAmount, setBetAmount] = useState<string>('0.1');
  // Default box-mode settings (when user lands on /trade):
  // - Quick Amount: 0.1
  // - Expiration Time: 5s
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    const apply = () => {
      const mobile = window.matchMedia('(max-width: 639px)').matches;
      document.documentElement.style.setProperty(
        '--trade-sheet',
        mobile && isPanelOpen
          ? 'calc(min(38dvh, 340px) + max(0.75rem, env(safe-area-inset-bottom)))'
          : '0px',
      );
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('--trade-sheet');
    };
  }, [isPanelOpen]);
  const isTourOpen = useStore((state) => state.isTourOpen);
  useEffect(() => {
    if (isTourOpen) setIsPanelOpen(true);
  }, [isTourOpen]);

  const [blitzCountdown, setBlitzCountdown] = useState<string>('');
  const [blitzTimeRemaining, setBlitzTimeRemaining] = useState<string>('');
  const [isActivatingBlitz, setIsActivatingBlitz] = useState(false);
  const { mutateAsync: signAndExecuteSui } = useSignAndExecuteTransaction();
  const suiAccount = useCurrentAccount();

  const toast = useToast();
  const [accessInput, setAccessInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [walletPanelBalance, setWalletPanelBalance] = useState<number | null>(null);

  // Refresh the on-chain wallet figure when the chain or account changes.
  useEffect(() => {
    if (!isConnected || !address || !network) return;
    void refreshWalletBalance();
  }, [selectedCurrency, isConnected, address, network, refreshWalletBalance]);

  useEffect(() => {
    let cancelled = false;
    const loadWalletPanelBalance = async () => {
      if (!isConnected || !address || !network) {
        if (!cancelled) setWalletPanelBalance(null);
        return;
      }
      try {
        if (network === 'SOL') {
          const { getSOLBalance } = await import('@/lib/solana/client');
          const bal = await getSOLBalance(address);
          if (!cancelled) setWalletPanelBalance(bal);
          return;
        }

        if (!cancelled) setWalletPanelBalance(walletBalance);
      } catch {
        if (!cancelled) setWalletPanelBalance(walletBalance);
      }
    };

    void loadWalletPanelBalance();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, network, selectedCurrency, walletBalance]);

  // Unified balance and currency
  const currencySymbol =
    network === 'ROBINHOOD' || network === 'ARB' ? 'ETH'
      : network === 'BASE' ? 'USDC'
        : network === 'TEMPO' ? 'OUSD'
          : network === 'SOL' ? 'SOL'
            : network === 'SUI' ? (selectedCurrency === 'USDC' ? 'USDC' : 'SUI')
              : network === 'XLM' ? 'XLM'
                : network === 'XTZ' ? 'XTZ'
                  : network === 'NEAR' ? 'NEAR'
                    : network === 'STRK' ? 'STRK'
                      : network === 'PUSH' ? 'PC'
                        : network === 'SOMNIA' ? 'STT'
                          : network === 'OCT' ? 'OCT'
                            : network === 'ZG' ? '0G'
                              : network === 'INIT' ? 'INIT'
                                : network === 'APT' ? 'APT'
                                  : network === 'BNB' ? 'BNB'
                                    : 'ETH';
  // $0.10 in the chain's play token, paid to that chain's treasury.
  const blitzEntryFee = blitzTokenForUsd(network, assetPrices);

  // Connection status
  const isWalletConnected = !!address;
  const isUnauthorized = false; // Access codes disabled

  const handleEnterBlitz = async () => {
    if (!isWalletConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isBlitzActive) {
      toast.error("Blitz Round is not currently active");
      return;
    }

    if (blitzEntryFee == null) {
      toast.error("The token price is not ready, so the $0.10 fee cannot be priced yet.");
      return;
    }

    const treasury = blitzTreasury(network);
    if (!treasury) {
      toast.error("This chain’s treasury is not configured.");
      return;
    }

    try {
      setIsActivatingBlitz(true);
      
      // Track Blitz entry attempt (no wallet address sent to third-party analytics)
      posthog.capture('blitz_entry_started', {
        network,
        entryFee: blitzEntryFee
        // address intentionally omitted to protect user privacy
      })

      if (network === 'SOL') {
        const {
          getSolanaConnection,
          buildSolTransferTransaction,
        } = await import('@/lib/solana/client');
        const connection = getSolanaConnection();
        const transaction = await buildSolTransferTransaction(blitzEntryFee, address, treasury);
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} SOL ($0.10)…`);
        const signature = await sendSolanaTransaction(transaction, connection);
        if (process.env.NODE_ENV === 'development') {
          console.log("Solana Blitz confirmed");
        }
      } else if (network === 'BNB') {
        const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
        if (!wallet) {
          throw new Error("Active wallet not found in session. Please reconnect.");
        }

        const ethereumProvider = await wallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(ethereumProvider);
        const signer = await provider.getSigner();

        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} BNB ($0.10)…`);
        const txResponse = await signer.sendTransaction({
          to: getAddress(treasury),
          value: ethers.parseEther(blitzEntryFee.toString()),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log("BNB Blitz confirmed");
        }
      } else if (network === 'SUI') {
        if (!suiAccount) throw new Error('Sui wallet not connected');
        const { buildSuiNativeTransferTransaction } = await import('@/lib/sui/client');
        const tx = await buildSuiNativeTransferTransaction(blitzEntryFee, address, treasury);
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} SUI ($0.10)…`);
        const result = await signAndExecuteSui({ transaction: tx as any });
        if (process.env.NODE_ENV === 'development') {
          console.log("Sui Blitz confirmed");
        }
      } else if (network === 'XTZ') {
        const { BeaconWallet } = await import('@taquito/beacon-wallet');
        const { NetworkType } = await import('@airgap/beacon-types');
        const { getTezosClient } = await import('@/lib/tezos/client');

        const rpcUrl = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://rpc.tzkt.io/mainnet';
        const wallet = new BeaconWallet({
          name: "TapT",
          preferredNode: rpcUrl,
          network: { type: NetworkType.MAINNET, rpcUrl }
        } as any);

        await wallet.requestPermissions();
        const tezos = await getTezosClient();
        tezos.setWalletProvider(wallet);

        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} XTZ ($0.10)…`);
        const op = await tezos.wallet.transfer({ to: treasury, amount: blitzEntryFee }).send();
        if (process.env.NODE_ENV === 'development') {
          console.log("Tezos Blitz confirmed");
        }
      } else if (network === 'XLM') {
        const { StellarWalletsKit, WalletNetwork, allowAllModules } = await import('@creit.tech/stellar-wallets-kit');
        const { TransactionBuilder, Networks, Operation, Asset, Horizon } = await import('@stellar/stellar-sdk');

        const server = new Horizon.Server(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon.stellar.org');
        const account = await server.loadAccount(address);

        const transaction = new TransactionBuilder(account, {
          fee: '100',
          networkPassphrase: Networks.PUBLIC,
        })
          .addOperation(Operation.payment({
            destination: treasury,
            asset: Asset.native(),
            amount: blitzEntryFee.toFixed(7),
          }))
          .setTimeout(30)
          .build();

        const kit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          modules: allowAllModules(),
        });

        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} XLM ($0.10)…`);
        const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());
        const result = await server.submitTransaction(TransactionBuilder.fromXDR(signedTxXdr, Networks.PUBLIC));
        if (process.env.NODE_ENV === 'development') {
          console.log("Stellar Blitz confirmed");
        }
      } else if (network === 'NEAR') {
        const { transferNEARToAddress } = await import('@/lib/near/wallet');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} NEAR ($0.10)…`);
        const txHash = await transferNEARToAddress(blitzEntryFee.toString(), treasury);
        if (process.env.NODE_ENV === 'development') {
          console.log("NEAR Blitz confirmed");
        }
      } else if (network === 'STRK') {
        const { transferSTRKToAddress } = await import('@/lib/starknet/wallet');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} STRK ($0.10)…`);
        const txHash = await transferSTRKToAddress(blitzEntryFee, treasury);
        if (process.env.NODE_ENV === 'development') {
          console.log("Starknet Blitz confirmed");
        }
      } else if (network === 'PUSH') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} PC ($0.10)…`);
        const hash = await walletClient.sendTransaction({
          to: getAddress(treasury) as `0x${string}`,
          value: parseEther(blitzEntryFee.toString()),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log("Push Chain Blitz confirmed");
        }
      } else if (network === 'SOMNIA') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} STT ($0.10)…`);
        const hash = await walletClient.sendTransaction({
          to: getAddress(treasury),
          value: parseEther(blitzEntryFee.toString()),
        });
        toast.info('Waiting for on-chain confirmation...');
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, { hash: hash as `0x${string}`, timeout: 60_000 });
        if (process.env.NODE_ENV === 'development') {
          console.log("Somnia Blitz confirmed");
        }
      } else if (network === 'ZG') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} 0G ($0.10)…`);
        const hash = await walletClient.sendTransaction({
          to: getAddress(treasury),
          value: parseEther(blitzEntryFee.toString()),
        });
        toast.info('Waiting for on-chain confirmation...');
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, { hash: hash as `0x${string}`, timeout: 60_000 });
        if (process.env.NODE_ENV === 'development') {
          console.log("0G Blitz confirmed");
        }
      } else if (network === 'OCT') {
        if (!suiAccount) throw new Error('Sui-compatible wallet not connected');
        const { buildOCTTransferTransaction } = await import('@/lib/onechain/client');
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} OCT ($0.10)…`);
        const tx = await buildOCTTransferTransaction(blitzEntryFee, address!, treasury);
        const result = await signAndExecuteSui({ transaction: tx as any });
        if (process.env.NODE_ENV === 'development') {
          console.log("OneChain Blitz confirmed");
        }
      } else if (network === 'INIT') {
        const { buildInitiaTransferTxRequest } = await import('@/lib/initia/client');
        const txRequest = buildInitiaTransferTxRequest(address!, treasury, blitzEntryFee);
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} INIT ($0.10)…`);
        const result = await requestInitiaTx(txRequest);
        if (process.env.NODE_ENV === 'development') {
          console.log("Initia Blitz confirmed");
        }
      } else if (network === 'APT') {
        const { getAptosClient } = await import('@/lib/aptos/client');
        const client = getAptosClient();
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} APT ($0.10)…`);

        const response = await signAndSubmitAptos({
          data: {
            function: "0x1::aptos_account::transfer",
            typeArguments: [],
            functionArguments: [treasury, (BigInt(Math.floor(blitzEntryFee * 1e8))).toString()],
          }
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Aptos Blitz confirmed");
        }
        await client.getSDK().waitForTransaction({ transactionHash: response.hash });
      } else if (network === 'ROBINHOOD' || network === 'BASE' || network === 'ARB' || network === 'TEMPO') {
        if (!walletClient) throw new Error('Wallet not connected. Please reconnect via Connect Wallet.');
        const spec = EVM_CHAINS[network as EvmPlayNetwork];
        toast.info(`Confirming ${formatBlitzToken(blitzEntryFee)} ${spec.symbol} ($0.10)…`);
        let hash: `0x${string}`;
        if (spec.token) {
          const units = parseUnits(blitzEntryFee.toFixed(spec.token.decimals), spec.token.decimals);
          if (network === 'TEMPO') {
            hash = await walletClient.writeContract({
              address: spec.token.address,
              abi: [{
                name: 'transferWithMemo',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'to', type: 'address' },
                  { name: 'amount', type: 'uint256' },
                  { name: 'memo', type: 'bytes32' },
                ],
                outputs: [{ name: '', type: 'bool' }],
              }],
              functionName: 'transferWithMemo',
              args: [getAddress(treasury), units, pad(getAddress(address), { size: 32 })],
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
          hash = await walletClient.sendTransaction({
            to: getAddress(treasury),
            value: parseEther(blitzEntryFee.toString()),
          });
        }
        const { waitForTransactionReceipt } = await import('@wagmi/core');
        const { config: wagmiCfg } = await import('@/lib/bnb/wagmi');
        await waitForTransactionReceipt(wagmiCfg, { hash, timeout: 60_000, confirmations: 1 });
      } else {
        throw new Error(`Blitz not supported for network: ${network}`);
      }

      toast.success("Payment successful! Blitz Mode enabled.");
      enableBlitzAccess();
      refreshWalletBalance();
      
      // Track successful Blitz entry (sanitized - no wallet address)
      posthog.capture('blitz_entry_success', {
        network,
        entryFee: blitzEntryFee
        // address removed to protect user privacy
      })
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Blitz entry failed:", err.message || err);
      }
      const errorMessage = err.message || "";
      
      // Track Blitz entry failure (sanitized - no wallet address)
      posthog.capture('blitz_entry_failed', {
        network,
        error: errorMessage
        // address removed to protect user privacy
      })
      
      if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('User rejected')) {
        toast.error("User rejected");
      } else {
        toast.error(errorMessage || "Failed to enter Blitz Round");
      }
    } finally {
      setIsActivatingBlitz(false);
    }
  };

  const handleValidateAccess = async () => {
    if (!accessInput || isValidating || !address) return;
    setIsValidating(true);
    setAccessError(null);

    try {
      const { balanceMutationHeaders } = await import('@/lib/balance/balanceClientHeaders');
      const res = await fetch('/api/validate-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...balanceMutationHeaders() },
        body: JSON.stringify({
          code: accessInput.trim().toUpperCase(),
          walletAddress: address
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchProfile(address);
        toast.success("Access authorized!");
      } else {
        setAccessError(data.error || 'Invalid code');
      }
    } catch (err) {
      setAccessError('Neural connection failed');
    } finally {
      setIsValidating(false);
    }
  };

  // Update Blitz Timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateBlitzTimer();
      const now = Date.now();
      if (isBlitzActive && blitzEndTime) {
        const remaining = Math.max(0, blitzEndTime - now);
        setBlitzTimeRemaining(`${Math.floor(remaining / 1000)}s`);
        setBlitzCountdown('');
      } else {
        const timeToNext = Math.max(0, nextBlitzTime - now);
        const mins = Math.floor(timeToNext / 60000);
        const secs = Math.floor((timeToNext % 60000) / 1000);
        setBlitzCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        setBlitzTimeRemaining('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlitzActive, blitzEndTime, nextBlitzTime, updateBlitzTimer]);

  // Identify user when wallet connects — use a one-way hash of the address
  // so PostHog receives a stable anonymous ID without the raw wallet address.
  // This keeps session stitching while protecting user privacy.
  useEffect(() => {
    if (address) {
      // Simple deterministic hash: last 12 chars is NOT sufficient, use a digest approach
      // We XOR-fold a basic hash to create a stable non-reversible identifier
      const simpleHash = address
        .split('')
        .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
      const anonymousId = `u_${Math.abs(simpleHash).toString(36)}_${address.slice(-6)}`;
      posthog.identify(anonymousId, {
        // Never send raw wallet address to third-party analytics
        network,
        hasBlitzAccess,
        userTier,
        hasAccessCode: !!accessCode
      });
    }
  }, [address, network, hasBlitzAccess, userTier, accessCode])


  // Sync selectedDuration with store's timeframeSeconds
  useEffect(() => {
    // Classic: duration picker affects both betting window & grid
    if (gameMode === 'binomo') {
      setTimeframeSeconds(selectedDuration);
      return;
    }

    // Box/Draw: keep draw sizing/parity stable with the reference behavior
    if (gameMode === 'draw') {
      setTimeframeSeconds(5);
      return;
    }

    // Box keeps the existing behavior
    setTimeframeSeconds(selectedDuration);
  }, [selectedDuration, setTimeframeSeconds, gameMode]);

  // Multiplier mapping based on duration
  const getMultiplier = (duration: number) => {
    switch (duration) {
      case 5: return 1.75;
      case 10: return 1.80;
      case 15: return 1.85;
      case 30: return 1.90;
      case 60: return 1.95;
      default: return 1.90;
    }
  };

  const stakeValue = parseFloat(betAmount || '0');
  const needsDeposit = !!error && (
    /no house balance|insufficient house|user not found/i.test(error) ||
    ((houseBalance || 0) < (Number.isFinite(stakeValue) ? stakeValue : 0) && /service unavailable|temporarily unavailable/i.test(error))
  );

  useEffect(() => {
    if (needsDeposit) setActiveTab('wallet');
  }, [needsDeposit, setActiveTab]);

  const handleBynomoBet = async (direction: 'UP' | 'DOWN') => {
    if (!address || !isWalletConnected || gameMode !== 'binomo' || isUnauthorized) return;

    try {
      const multiplier = getMultiplier(selectedDuration);
      // Track bet placement (sanitized - no wallet address or specific amounts)
      posthog.capture('bet_placed', {
        direction,
        // amount removed to protect financial privacy
        multiplier,
        duration: selectedDuration,
        asset: selectedAsset,
        network,
        currency: currencySymbol
        // wallet address never sent to analytics
      })

      // House balance only — /api/balance/bet deducts Supabase balance; no on-chain stake per bet.
      await placeBetFromHouseBalance(
        betAmount,
        `${direction}-${multiplier}-${selectedDuration}`,
        address,
        undefined,
      );
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to place bet:", err instanceof Error ? err.message : err);
      }
      
      // Track bet failure (sanitized - no wallet address or specific amounts)
      posthog.capture('bet_failed', {
        direction,
        // amount removed to protect financial privacy
        error: err instanceof Error ? err.message : 'Unknown error',
        network
        // wallet address never sent to analytics
      })
    }
  };

  const activeWalletBalance = walletPanelBalance ?? walletBalance;

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '---';
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number) => {
    return isNaN(bal) ? '0.0000' : bal.toFixed(4);
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Main Interactive Chart */}
      <div className="absolute inset-0">
        <LiveChart
          betAmount={betAmount}
          setBetAmount={setBetAmount}
        />
      </div>

      {/* Blitz Round Indicator - Top Right */}
      <div className="absolute top-3 right-2 z-30 pointer-events-auto sm:top-6 sm:right-6">
        <div className={`rounded-2xl border px-3 py-2 ${isBlitzActive ? 'border-[#ccff00] bg-[#141414]' : 'border-[#2a2a2a] bg-[#0c0c0c]/90'}`}>
          <div>
            {isBlitzActive ? (
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[11px] text-[#ccff00]">Blitz live</p>
                  <p className="text-sm font-medium tabular-nums text-white">{blitzTimeRemaining}</p>
                </div>
                {hasBlitzAccess && (
                  <span className="rounded-full bg-[#ccff00] px-1.5 py-0.5 text-[10px] font-medium text-[#110e08]">2x</span>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-[#9a9590]">Next blitz</p>
                <p className="text-sm font-medium tabular-nums text-white">{blitzCountdown}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toggle Button - Fixed to bottom (Mobile only) */}
      {!isPanelOpen && (
        <div className="sm:hidden fixed bottom-24 left-4 z-40 animate-in slide-in-from-left duration-300">
          <div className="flex flex-col items-start gap-1">
            {/* Small win indicator if available */}
            {bets.length > 0 && bets[0].won && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-8 text-[11px] font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] flex items-center gap-1"
              >
                <span>+{parseFloat(bets[0].payout).toFixed(2)} {currencySymbol}</span>
              </motion.div>
            )}
            <button
              onClick={() => setIsPanelOpen(true)}
              className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 px-4 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all active:scale-95 border-emerald-500/20"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ccff00]/15 flex items-center justify-center text-[#ccff00] shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">House Balance</span>
                <span className="text-base font-black text-white leading-none font-mono">
                  {houseBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}


      {/* Modern Quick Bet Panel — height-capped + internal scroll so wallet/blitz never overflows under the viewport */}
      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 top-auto z-[110] flex max-h-[min(38dvh,340px)] min-h-0 flex-col justify-end pointer-events-none sm:bottom-12 sm:left-8 sm:right-auto sm:top-[12rem] sm:max-h-full">
        <div className={`max-h-full min-h-0 bg-[#0b0b0b] border border-[#232323] rounded-2xl overflow-hidden w-full sm:w-[272px] transition-all duration-300 ease-out pointer-events-auto flex flex-col ${isPanelOpen
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-full opacity-0 scale-95 !pointer-events-none sm:translate-y-0 sm:opacity-100 sm:scale-100 sm:!pointer-events-auto'
          }`}>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="sm:hidden absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-gray-300"
          >
            ✕
          </button>

          {/* Game Mode Selector */}
          <div className="flex shrink-0 gap-1 border-b border-[#232323] p-1 pr-10 sm:pr-1" data-tour="game-mode-toggle">
            <button
              data-tour="classic-mode"
              onClick={() => setGameMode('binomo')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${gameMode === 'binomo' ? 'bg-[#ccff00] text-[#110e08]' : 'text-[#9a9590] hover:text-white'}`}
            >
              Classic
            </button>
            <button
              data-tour="box-mode"
              onClick={() => setGameMode('box')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${gameMode === 'box' ? 'bg-[#ccff00] text-[#110e08]' : 'text-[#9a9590] hover:text-white'}`}
            >
              Box
            </button>
            <button
              data-tour="draw-mode"
              onClick={() => setGameMode('draw')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${gameMode === 'draw' ? 'bg-[#ccff00] text-[#110e08]' : 'text-[#9a9590] hover:text-white'}`}
            >
              Draw
            </button>
          </div>

          <div className="flex shrink-0 gap-1 px-1 pt-1" data-tour="side-tabs">
            <button
              data-tour="bet-tab"
              onClick={() => setActiveTab('bet')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${activeTab === 'bet' ? 'text-white' : 'text-[#9a9590] hover:text-white'}`}
            >
              Bet
            </button>
            <button
              data-tour="wallet-tab"
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${activeTab === 'wallet' ? 'text-white' : 'text-[#9a9590] hover:text-white'}`}
            >
              Wallet
            </button>
            <button
              data-tour="blitz-tab"
              onClick={() => setActiveTab('blitz')}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition ${activeTab === 'blitz' ? 'text-white' : 'text-[#9a9590] hover:text-white'}`}
            >
              Blitz
            </button>
          </div>

          {/* Tab body — scrolls inside the card when content (e.g. wallet) is tall */}
          <div className="relative flex flex-1 min-h-0 flex-col overflow-y-auto p-2.5">
            {/* Overlay if not authorized */}
            {isUnauthorized && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <div className="w-full space-y-4 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Key className="w-6 h-6 text-[#ccff00]" />
                  </div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Access Restricted</h4>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={accessInput}
                      onChange={(e) => setAccessInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      disabled={isValidating}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-center text-white font-mono text-base tracking-[0.2em] placeholder:tracking-normal placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <button
                      onClick={handleValidateAccess}
                      disabled={!accessInput || isValidating}
                      className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      {isValidating ? 'Validating...' : 'Unlock Node'}
                    </button>
                    {accessError && (
                      <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{accessError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={`flex min-h-0 flex-col transition-all duration-700 ${isUnauthorized ? 'blur-xl grayscale opacity-20 pointer-events-none select-none' : ''}`}>
              {activeTab === 'bet' ? (
                <div className="space-y-2">
                  <div data-tour="stake-controls" className="space-y-2">
                  {/* Amount Presets */}
                  <div>
                    <label className="mb-1 block text-[11px] text-[#9a9590]">
                      Amount
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[0.1, 0.5, 1, 5, 10].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setBetAmount(amt.toString())}
                          className={`rounded-lg py-1.5 text-xs font-medium transition ${betAmount === amt.toString()
                            ? 'bg-[#ccff00] text-[#110e08]'
                            : 'border border-[#2a2a2a] bg-[#141414] text-white/80 hover:border-white/20'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-[#9a9590]">
                      Expires
                    </label>
                    {gameMode === 'draw' && (
                      <p className="mb-2 text-xs text-[#ccff00]">
                        Draw is fixed at 5s
                      </p>
                    )}
                    <div className="grid grid-cols-5 gap-1">
                      {[5, 10, 15, 30, 60].map(duration => (
                        <button
                          key={duration}
                          onClick={() => gameMode !== 'draw' && setSelectedDuration(duration)}
                          disabled={gameMode === 'draw'}
                          className={`rounded-lg py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedDuration === duration
                            ? 'bg-[#ccff00] text-[#110e08]'
                            : 'border border-[#2a2a2a] bg-[#141414] text-[#9a9590] hover:text-white'
                          }`}
                        >
                          <span className="block">{duration < 60 ? `${duration}s` : '1m'}</span>
                          {gameMode === 'binomo' && (
                            <span className={`mt-0.5 block text-[10px] ${selectedDuration === duration ? 'text-[#110e08]/70' : 'text-[#4d4a46]'}`}>
                              x{getMultiplier(duration)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-[#9a9590]">
                      Stake
                    </label>
                    <div className="flex items-center rounded-xl border border-[#2a2a2a] bg-[#141414] px-2.5">
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white focus:outline-none"
                        placeholder="0.00"
                      />
                      <span className="text-xs font-medium text-[#ccff00]">
                        {currencySymbol}
                      </span>
                    </div>
                  </div>
                  </div>

                  {/* Action Buttons / Instructions */}
                  {gameMode === 'binomo' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1" data-tour="direction-buttons">
                      <button
                        onClick={() => handleBynomoBet('UP')}
                        disabled={!isWalletConnected || isUnauthorized}
                        className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#ccff00] py-3 text-[#110e08] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 sm:py-4"
                      >
                        <span className="text-lg leading-none">▲</span>
                        <span className="text-sm font-medium">Higher</span>
                      </button>

                      <button
                        onClick={() => handleBynomoBet('DOWN')}
                        disabled={!isWalletConnected || isUnauthorized}
                        className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#ff5c5c]/40 bg-[#141414] py-3 text-[#ff5c5c] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 sm:py-4"
                      >
                        <span className="text-lg leading-none">▼</span>
                        <span className="text-sm font-medium">Lower</span>
                      </button>
                    </div>
                  ) : gameMode === 'box' ? (
                    <div className="pt-1">
                      <div className="rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 px-3 py-2 text-center">
                        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-[#ccff00]">Box mode</p>
                        <p className="text-[10px] leading-snug text-[#9a9590]">
                          Tap a cell on the chart. The multiplier depends on how far that cell is from the price.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <div className="rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 px-3 py-2 text-center">
                        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-[#ccff00]">Draw mode</p>
                        <p className="text-[10px] leading-snug text-[#9a9590]">
                          Draw a box on the chart, then confirm the stake.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ERROR MESSAGE DISPLAY */}
                  {error && (
                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl relative group">
                      <button
                        onClick={clearError}
                        className="absolute top-2 right-2 text-red-500/50 hover:text-red-500 p-1"
                      >
                        ✕
                      </button>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Error</p>
                          <p className="text-red-300 text-[11px] leading-tight mt-0.5">
                            {needsDeposit
                              ? `Deposit ${currencySymbol} into your house balance, then place the round.`
                              : error}
                          </p>
                          {needsDeposit && (
                            <button
                              onClick={() => {
                                setActiveTab('wallet');
                                clearError();
                              }}
                              className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold transition-all"
                            >
                              Go to Deposit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isWalletConnected && null}
                </div>

              ) : activeTab === 'wallet' ? (
                <div className="space-y-2" data-tour="deposit-section">
                  {isWalletConnected && address ? (
                    <>
                      {accountType !== 'demo' && (houseBalance || 0) <= 0 && (
                        <div className="rounded-2xl border border-[#ccff00]/30 bg-[#ccff00]/10 px-3 py-3">
                          <p className="text-sm text-white">Deposit {currencySymbol} to play</p>
                          <p className="mt-1 text-xs leading-5 text-[#c8c2b8]">
                            Add it to your house balance. Each round is paid from there.
                          </p>
                        </div>
                      )}
                      <BalanceDisplay />

                      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-[#9a9590]">Connected wallet</p>
                            <p className="mt-1 truncate font-mono text-sm text-white">{formatAddress(address)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(address);
                              toast.success('Address copied');
                            }}
                            className="shrink-0 rounded-full border border-[#2a2a2a] px-3 py-1.5 text-xs text-white transition hover:border-[#ccff00]"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-3 border-t border-[#232323] pt-3 text-sm text-[#9a9590]">
                          In this wallet
                          <span className="ml-2 font-medium tabular-nums text-white">
                            {isLoadingBalance ? '…' : formatBalance(activeWalletBalance)} {currencySymbol}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const s = useStore.getState();
                          if (s.network === 'PUSH' || s.network === 'BNB' || s.network === 'SOMNIA' || s.network === 'ZG' || s.network === 'ROBINHOOD' || s.network === 'BASE' || s.network === 'ARB' || s.network === 'TEMPO') wagmiDisconnect();
                          else if (s.network === 'SUI' || s.network === 'OCT') disconnectSui();
                          else if (s.network === 'INIT') disconnectInitia();
                          else if (s.network === 'APT') disconnectAptos();
                          s.setPreferredNetwork(null);
                          s.disconnect();
                        }}
                        className="h-10 w-full rounded-full text-sm text-[#9a9590] transition hover:text-white"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <p className="py-6 text-center text-sm text-[#9a9590]">No wallet connected</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3" data-tour="blitz-panel">
                  <div className={`rounded-2xl border p-4 ${isBlitzActive ? 'border-[#ccff00]/50 bg-[#141414]' : 'border-[#2a2a2a] bg-[#141414]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs ${isBlitzActive ? 'text-[#ccff00]' : 'text-[#9a9590]'}`}>
                          {isBlitzActive ? 'Blitz is live' : 'Next blitz'}
                        </p>
                        <p className="mt-1 text-3xl font-medium tabular-nums text-white">
                          {isBlitzActive ? blitzTimeRemaining : blitzCountdown}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${isBlitzActive ? 'bg-[#ccff00] text-[#110e08]' : 'bg-[#110e08] text-[#9a9590]'}`}>
                        {isBlitzActive ? '2x' : '1x'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-[#9a9590]">
                        <span>Boost on marked cells</span>
                        <span className={isBlitzActive ? 'text-[#ccff00]' : ''}>{isBlitzActive ? '2.0x' : '1.0x'}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2a2a]">
                        <div className={`h-full rounded-full bg-[#ccff00] transition-all duration-700 ${isBlitzActive ? 'w-full' : 'w-0'}`} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleEnterBlitz}
                      disabled={!isWalletConnected || hasBlitzAccess || isActivatingBlitz || isUnauthorized}
                      className={`mt-4 h-11 w-full rounded-xl text-sm font-medium transition disabled:cursor-not-allowed ${hasBlitzAccess
                        ? 'border border-[#5cec8a]/40 bg-[#5cec8a]/10 text-[#5cec8a]'
                        : !isWalletConnected
                          ? 'border border-[#2a2a2a] bg-[#110e08] text-[#4d4a46]'
                          : 'bg-[#ccff00] text-[#110e08] hover:bg-[#b8e600] disabled:opacity-70'
                        }`}
                    >
                      {isActivatingBlitz
                        ? 'Entering…'
                        : hasBlitzAccess
                          ? 'You’re in this round'
                          : !isWalletConnected
                            ? 'Connect a wallet'
                            : 'Enter blitz · $0.10'}
                    </button>

                    <p className="mt-3 text-center text-xs leading-5 text-[#9a9590]">
                      {isBlitzActive
                        ? 'Marked cells pay double until the timer ends.'
                        : 'A blitz opens every 3 minutes.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#232323] px-3 py-2">
            {!isWalletConnected ? (
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="neon-btn h-10 w-full text-sm"
              >
                Connect wallet
              </button>
            ) : isUnauthorized ? (
              <p className="text-center text-sm text-[#9a9590]">
                Enter your access code
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                <span className="text-xs text-[#9a9590]">{currencySymbol} · {formatAddress(address)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
