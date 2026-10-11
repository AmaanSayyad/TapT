/**
 * POST /api/balance/deposit endpoint
 * 
 * Task: 7.2 Update deposit endpoint for Sui
 * Requirements: 2.4
 * 
 * Called by blockchain event listener after deposit transaction.
 * Updates Supabase balance by adding deposit amount.
 * Inserts audit log entry with operation_type='deposit'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { isValidAddress } from '@/lib/utils/address';
import { calculateFeeAmount, collectPlatformFeeFromTreasury, getFeePercentLabel } from '@/lib/fees/platformFee';
import { isWalletGloballyBanned } from '@/lib/bans/walletBan';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';
import { assertBalanceApiAuthorized } from '@/lib/balance/balanceApiGuard';
import {
  verifyNearDepositTx,
  verifyOctDepositDigest,
  verifyStarknetDepositTx,
  verifyStellarDepositTx,
  verifySuiFamilyDepositDigest,
  verifyTezosDepositTx,
} from '@/lib/balance/verifyDepositOnChain';
import { TempoPaymentHeldError, verifyEvmDepositTx } from '@/lib/balance/verifyEvmDepositTx';

interface DepositRequest {
  userAddress: string;
  amount: number;
  txHash: string;
  currency: string;
  userTier?: 'free' | 'standard' | 'vip';
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = assertBalanceApiAuthorized(request);
    if (unauthorized) return unauthorized;

    // Parse request body
    const body: DepositRequest = await request.json();
    const { userAddress, amount, txHash, currency = 'BNB', userTier = 'free' } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount, txHash' },
        { status: 400 }
      );
    }

    // Guard against NaN / Infinity which bypass > 0 checks
    if (!Number.isFinite(Number(amount))) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    const isValid = await isValidAddress(userAddress);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (BNB, Solana, Sui, Aptos, Starknet, Stellar, Tezos or NEAR required)' },
        { status: 400 }
      );
    }

    if (await isWalletGloballyBanned(userAddress)) {
      return NextResponse.json(
        { error: 'This wallet is banned from the platform.' },
        { status: 403 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Deposit amount must be greater than zero' },
        { status: 400 }
      );
    }

    // For EVM-like chains, verify tx sender/recipient/value on-chain before crediting.
    const normalizedCurrency = currency.toUpperCase();
    const supportedCurrencies = new Set([
      'ROBINHOOD', 'USDC_BASE', 'ARB', 'OUSD', 'SOL',
    ]);
    if (!supportedCurrencies.has(normalizedCurrency)) {
      return NextResponse.json(
        { error: `Unsupported deposit currency: ${normalizedCurrency}` },
        { status: 400 }
      );
    }
    // ── Idempotency: reject if this txHash was already credited ──
    // Check both the raw txHash AND any combinedTxHash variant (e.g. txHash|feeTx:…)
    // This prevents replay when fee collection generates a combined hash stored in the audit log
    const { data: existingTxByHash } = await supabase
      .from('balance_audit_log')
      .select('id, transaction_hash')
      .eq('operation_type', 'deposit')
      .or(`transaction_hash.eq.${txHash},transaction_hash.like.${txHash}|feeTx:%`)
      .limit(1);
    if (existingTxByHash && existingTxByHash.length > 0) {
      return NextResponse.json(
        { error: 'This transaction has already been credited' },
        { status: 409 }
      );
    }

    // Look up user tier from DB instead of trusting client
    const depositUserKey = canonicalHouseUserAddress(userAddress);
    let resolvedTier: 'free' | 'standard' | 'vip' = 'free';
    try {
      const { data: tierRow } = await supabase
        .from('user_balances')
        .select('tier')
        .eq('user_address', depositUserKey)
        .limit(1)
        .single();
      if (tierRow?.tier && ['free', 'standard', 'vip'].includes(tierRow.tier)) {
        resolvedTier = tierRow.tier as 'free' | 'standard' | 'vip';
      }
    } catch {
      // New user — default tier is fine
    }

    const feeAmount = calculateFeeAmount(amount, resolvedTier);
    const netDepositAmount = amount - feeAmount;
    const feePercentLabel = getFeePercentLabel(resolvedTier);

    if (netDepositAmount <= 0) {
      return NextResponse.json(
        { error: `Deposit amount after ${feePercentLabel} fee must be greater than zero` },
        { status: 400 }
      );
    }

    const isEvmLike =
      normalizedCurrency === 'ROBINHOOD' ||
      normalizedCurrency === 'USDC_BASE' ||
      normalizedCurrency === 'ARB' ||
      normalizedCurrency === 'OUSD';
    if (isEvmLike) {
      try {
        const isValidTx = await verifyEvmDepositTx(txHash, userAddress, amount, normalizedCurrency);
        if (!isValidTx) {
          return NextResponse.json(
            { error: 'Deposit transaction could not be verified on-chain' },
            { status: 400 }
          );
        }
      } catch (err) {
        const held = err instanceof TempoPaymentHeldError;
        return NextResponse.json(
          { error: held ? err.message : 'Deposit transaction could not be verified on-chain' },
          { status: 400 }
        );
      }
    }

    // Initia deposit verification
    if (normalizedCurrency === 'INIT') {
      try {
        const { verifyInitiaDepositTx } = await import('@/lib/initia/backend-client');
        const verified = await verifyInitiaDepositTx(txHash);
        const senderMatches =
          (verified.sender || '').trim().toLowerCase() === userAddress.trim().toLowerCase();
        if (!verified.confirmed || !senderMatches || verified.amountINIT < amount * 0.99) {
          return NextResponse.json(
            { error: 'Initia deposit transaction could not be verified on-chain' },
            { status: 400 }
          );
        }
      } catch (verifyErr) {
        console.error('[deposit] Initia verification failed:', verifyErr);
        return NextResponse.json(
          { error: 'Failed to verify Initia transaction' },
          { status: 400 }
        );
      }
    }

    // Aptos deposit verification
    if (normalizedCurrency === 'APT') {
      try {
        const { verifyAptosDepositTx } = await import('@/lib/aptos/backend-client');
        const verified = await verifyAptosDepositTx(txHash, userAddress, amount);
        if (!verified) {
          return NextResponse.json(
            { error: 'Aptos deposit transaction could not be verified on-chain' },
            { status: 400 }
          );
        }
      } catch (verifyErr) {
        console.error('[deposit] Aptos verification failed:', verifyErr);
        return NextResponse.json(
          { error: 'Failed to verify Aptos transaction' },
          { status: 400 }
        );
      }
    }

    if (normalizedCurrency === 'SOL') {
      try {
        const { verifySolanaDepositTx } = await import('@/lib/solana/backend-client');
        const ok = await verifySolanaDepositTx(txHash, userAddress, amount);
        if (!ok) {
          return NextResponse.json(
            { error: 'Solana deposit transaction could not be verified on-chain' },
            { status: 400 },
          );
        }
      } catch (verifyErr) {
        console.error('[deposit] Solana verification failed:', verifyErr);
        return NextResponse.json({ error: 'Failed to verify Solana transaction' }, { status: 400 });
      }
    }

    // Sui native + USDC (digest)
    if (normalizedCurrency === 'SUI' || normalizedCurrency === 'USDC') {
      const ok = await verifySuiFamilyDepositDigest(
        txHash,
        userAddress,
        amount,
        normalizedCurrency as 'SUI' | 'USDC',
      );
      if (!ok) {
        return NextResponse.json(
          { error: 'Sui deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    if (normalizedCurrency === 'NEAR') {
      const ok = await verifyNearDepositTx(txHash, userAddress, amount);
      if (!ok) {
        return NextResponse.json(
          { error: 'NEAR deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    if (normalizedCurrency === 'XLM') {
      const ok = await verifyStellarDepositTx(txHash, userAddress, amount);
      if (!ok) {
        return NextResponse.json(
          { error: 'Stellar deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    if (normalizedCurrency === 'XTZ') {
      const ok = await verifyTezosDepositTx(txHash, userAddress, amount);
      if (!ok) {
        return NextResponse.json(
          { error: 'Tezos deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    if (normalizedCurrency === 'STRK') {
      const ok = await verifyStarknetDepositTx(txHash, userAddress, amount);
      if (!ok) {
        return NextResponse.json(
          { error: 'Starknet deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    if (normalizedCurrency === 'OCT') {
      const ok = await verifyOctDepositDigest(txHash, userAddress, amount);
      if (!ok) {
        return NextResponse.json(
          { error: 'OneChain deposit transaction could not be verified on-chain' },
          { status: 400 },
        );
      }
    }

    // Tiered platform/protocol fee: move the fee portion from treasury to a dedicated collector wallet.
    // A failure here must NOT block the user's deposit — log the error and continue.
    let feeTxHash: string | null = null;
    try {
      feeTxHash = await collectPlatformFeeFromTreasury(normalizedCurrency, feeAmount);
    } catch (feeErr) {
      console.error('[deposit] Fee collection failed (non-blocking):', feeErr);
    }
    const combinedTxHash = feeTxHash ? `${txHash}|feeTx:${feeTxHash}` : txHash;

    const userKey = canonicalHouseUserAddress(userAddress);

    // Call update_balance_for_deposit stored procedure
    const { data, error } = await supabase.rpc('update_balance_for_deposit', {
      p_user_address: userKey,
      p_deposit_amount: netDepositAmount,
      p_currency: normalizedCurrency,
      p_transaction_hash: combinedTxHash,
    });

    // Handle database errors
    if (error) {
      console.error('Database error in deposit:', error);
      return NextResponse.json(
        { error: 'Your transfer is on-chain, but the house balance could not be saved. Do not send it again.' },
        { status: 503 }
      );
    }

    // Parse the JSON result from the stored procedure
    const result = data as { success: boolean; error: string | null; new_balance: number };

    // Check if the procedure reported an error
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Deposit failed' },
        { status: 400 }
      );
    }

    // Log the platform fee so the admin dashboard can track per-wallet fee totals.
    // Non-blocking — a fee logging failure must never break the deposit.
    if (feeAmount > 0) {
      supabase.from('balance_audit_log').insert({
        user_address: userKey,
        currency: normalizedCurrency,
        operation_type: 'platform_fee',
        amount: feeAmount,
        transaction_hash: `fee:deposit:${combinedTxHash}`,
      }).then(({ error: feeErr }) => {
        if (feeErr) console.warn('[deposit] fee log failed (non-blocking):', feeErr.message);
      });
    }

    // Return success with new balance
    return NextResponse.json({
      success: true,
      newBalance: parseFloat(result.new_balance.toString()),
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/balance/deposit:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
