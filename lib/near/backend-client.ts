import {
    Account,
    JsonRpcProvider,
    KeyPairSigner,
    actions,
    nearToYocto,
    type KeyPairString,
} from "near-api-js";
import { NEAR_CONFIG } from "./config";

/** Hash from `send_tx` / `signAndSendTransaction` (near-api-js v7 shape). */
function nearTxHashFromOutcome(result: {
    transaction?: { hash?: string };
    transaction_outcome?: { id?: string };
}): string {
    const fromTx = result.transaction?.hash;
    if (typeof fromTx === "string" && fromTx.length > 0) return fromTx;
    const fromOutcome = result.transaction_outcome?.id;
    if (typeof fromOutcome === "string" && fromOutcome.length > 0) return fromOutcome;
    throw new Error("NEAR RPC response missing transaction hash");
}

export const transferNEARFromTreasury = async (
    receiverId: string,
    amount: number
): Promise<string> => {
    const accountId = process.env.NEAR_TREASURY_ACCOUNT_ID;
    const privateKey = process.env.NEAR_TREASURY_PRIVATE_KEY;

    if (!accountId || !privateKey) {
        throw new Error("Missing NEAR treasury credentials in environment");
    }

    const provider = new JsonRpcProvider({ url: NEAR_CONFIG.nodeUrl });
    const signer = KeyPairSigner.fromSecretKey(privateKey.trim() as KeyPairString);
    const account = new Account(accountId, provider, signer);

    // Fixed decimals before yocto conversion avoids float drift (e.g. 0.8077999999…).
    const deposit = nearToYocto(Number(amount.toFixed(8)));

    try {
        const result = await account.signAndSendTransaction({
            receiverId,
            actions: [actions.transfer(deposit)],
            waitUntil: "INCLUDED_FINAL",
        });
        return nearTxHashFromOutcome(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
            msg.includes("does not exist") &&
            (msg.includes("Access key") || msg.includes("access key"))
        ) {
            throw new Error(
                `NEAR treasury signing key is not registered on account "${accountId}". ` +
                    `Use NEAR_TREASURY_PRIVATE_KEY for a full-access key that exists on NEAR_TREASURY_ACCOUNT_ID, ` +
                    `or fix the account id in env. (${msg})`
            );
        }
        throw e;
    }
};
