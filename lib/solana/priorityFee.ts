import { ComputeBudgetProgram, Connection, Transaction } from '@solana/web3.js';

/** Quiet-network floor, in micro-lamports per compute unit. */
const FEE_FLOOR = 5_000;
/** Cap so a congested sample cannot turn a transfer into a large SOL tip. */
const FEE_CAP = 1_000_000;

/**
 * 75th percentile of recent non-zero prioritization fees.
 * Falls back to the floor when the RPC has no samples or the call fails.
 */
export async function priorityFeeMicroLamports(connection: Connection): Promise<number> {
    try {
        const samples = await connection.getRecentPrioritizationFees();
        const fees = samples
            .map((sample) => sample.prioritizationFee)
            .filter((fee) => fee > 0)
            .sort((a, b) => a - b);
        if (fees.length === 0) return FEE_FLOOR;
        const index = Math.min(fees.length - 1, Math.floor(fees.length * 0.75));
        const picked = fees[index] ?? FEE_FLOOR;
        return Math.min(FEE_CAP, Math.max(FEE_FLOOR, picked));
    } catch {
        return FEE_FLOOR;
    }
}

/** Prepend a compute-unit limit and a priority fee. Wallets that already add a fee keep this one. */
export async function withPriorityFee(
    transaction: Transaction,
    connection: Connection,
    unitLimit: number,
): Promise<Transaction> {
    const microLamports = await priorityFeeMicroLamports(connection);
    transaction.instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: unitLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
        ...transaction.instructions,
    ];
    return transaction;
}
