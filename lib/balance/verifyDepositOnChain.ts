import { NEAR_CONFIG } from '@/lib/near/config';
import { getTezosTzktApiBase } from '@/lib/tezos/client';
import { getStarknetConfig } from '@/lib/starknet/config';
import { getOneChainConfig } from '@/lib/onechain/config';
import { verifyPaymentProof } from '@/lib/sui/verify-payment';
import { getSuiConfig } from '@/lib/sui/config';

const STELLAR_HORIZON =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon.stellar.org';
const TEZOS_TREASURY = process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS || '';
const NEAR_TREASURY = process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || '';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

export async function verifySuiFamilyDepositDigest(
  digest: string,
  sender: string,
  amount?: number,
  currency?: 'SUI' | 'USDC',
): Promise<boolean> {
  const baseOk = await verifyPaymentProof({ digest, sender });
  if (!baseOk) return false;
  if (!amount || !Number.isFinite(amount) || amount <= 0 || !currency) return false;

  try {
    const { SuiClient } = await import('@mysten/sui/client');
    const cfg = getSuiConfig();
    const client = new SuiClient({ url: cfg.rpcEndpoint });
    const tx = await withTimeout(
      client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showBalanceChanges: true,
          showInput: true,
        },
      }),
      15_000,
    );
    const balanceChanges = (tx as any)?.balanceChanges;
    if (!Array.isArray(balanceChanges)) return false;

    const treasury = cfg.treasuryAddress.toLowerCase();
    const expectedCoinType = currency === 'USDC' ? cfg.usdcType : '0x2::sui::SUI';
    const minUnits = BigInt(
      Math.floor(
        amount * (currency === 'USDC' ? 1_000_000 : 1_000_000_000) * 0.99,
      ),
    );

    let credited = BigInt(0);
    for (const change of balanceChanges) {
      const owner = change?.owner?.AddressOwner;
      const coinType = String(change?.coinType || '');
      const amountRaw = change?.amount;
      if (!owner || !amountRaw) continue;
      if (owner.toLowerCase() !== treasury) continue;
      if (coinType !== expectedCoinType) continue;
      const delta = BigInt(String(amountRaw));
      if (delta > BigInt(0)) credited += delta;
    }
    return credited >= minUnits;
  } catch (e) {
    console.error('[verifySuiFamilyDepositDigest]', e);
    return false;
  }
}

export async function verifyNearDepositTx(
  txHash: string,
  signerAccountId: string,
  amountNear: number,
): Promise<boolean> {
  if (!NEAR_TREASURY || !Number.isFinite(amountNear) || amountNear <= 0) return false;
  try {
    const res = await withTimeout(
      fetch(NEAR_CONFIG.nodeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'bynomo-deposit',
          method: 'tx',
          params: [txHash, signerAccountId],
        }),
      }),
      15_000,
    );
    const json = (await res.json()) as any;
    if (json.error) return false;
    const r = json.result;
    if (!r || r.status?.Failure) return false;

    const receiver = r.transaction?.receiver_id;
    if (receiver !== NEAR_TREASURY) return false;

    const actions = r.transaction?.actions;
    if (!Array.isArray(actions)) return false;
    const yoctoNeeded = BigInt(Math.floor(amountNear * 1e24 * 0.99));
    for (const a of actions) {
      if (a?.Transfer?.deposit) {
        const dep = BigInt(a.Transfer.deposit);
        if (dep >= yoctoNeeded) return true;
      }
    }
    return false;
  } catch (e) {
    console.error('[verifyNearDepositTx]', e);
    return false;
  }
}

export async function verifyStellarDepositTx(
  txHash: string,
  sourcePublicKey: string,
  amountXlm: number,
): Promise<boolean> {
  const treasury = process.env.NEXT_PUBLIC_STELLAR_TREASURY_ADDRESS;
  if (!treasury || !Number.isFinite(amountXlm) || amountXlm <= 0) return false;
  try {
    const url = `${STELLAR_HORIZON.replace(/\/$/, '')}/transactions/${txHash}`;
    const res = await withTimeout(fetch(url), 12_000);
    if (!res.ok) return false;
    const data = (await res.json()) as any;
    if (!data.successful) return false;
    const ops = await withTimeout(
      fetch(`${url}/operations?limit=20`),
      12_000,
    ).then((r) => r.json());
    const records = ops?._embedded?.records || [];
    const min = amountXlm * 0.99;
    for (const op of records) {
      if (
        op.type === 'payment' &&
        op.from === sourcePublicKey &&
        op.to === treasury &&
        op.asset_type === 'native' &&
        Number(op.amount) >= min
      ) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('[verifyStellarDepositTx]', e);
    return false;
  }
}

function tezosTzktAddress(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (typeof v === 'object' && v !== null && 'address' in v) {
    const a = (v as { address?: string }).address;
    return typeof a === 'string' ? a.trim().toLowerCase() : '';
  }
  return '';
}

function tezosDepositMatchesRecord(
  rec: Record<string, unknown>,
  source: string,
  treasury: string,
  amountXtz: number,
): boolean {
  if (String(rec.status ?? '').toLowerCase() !== 'applied') return false;
  const typ = rec.type != null ? String(rec.type).toLowerCase() : '';
  if (typ !== '' && typ !== 'transaction') return false;
  const sender = tezosTzktAddress(rec.sender);
  const target = tezosTzktAddress(rec.target);
  if (sender !== source || target !== treasury) return false;
  const mutez = Number(rec.amount ?? 0);
  if (!Number.isFinite(mutez)) return false;
  return mutez / 1e6 >= amountXtz * 0.99;
}

async function verifyTezosDepositOnce(
  base: string,
  txHash: string,
  source: string,
  treasury: string,
  amountXtz: number,
): Promise<boolean> {
  const h = encodeURIComponent(txHash.trim());

  const txRes = await withTimeout(fetch(`${base}/v1/transactions/${h}`), 12_000);
  if (txRes.ok) {
    const tx = (await txRes.json()) as Record<string, unknown>;
    if (tx && typeof tx === 'object' && !Array.isArray(tx) && tezosDepositMatchesRecord(tx, source, treasury, amountXtz)) {
      return true;
    }
  }

  const opRes = await withTimeout(
    fetch(`${base}/v1/operations?hash=${h}&limit=20`),
    12_000,
  );
  if (!opRes.ok) return false;
  const list = (await opRes.json()) as unknown;
  if (!Array.isArray(list)) return false;
  for (const item of list) {
    if (item && typeof item === 'object' && tezosDepositMatchesRecord(item as Record<string, unknown>, source, treasury, amountXtz)) {
      return true;
    }
  }
  return false;
}

export async function verifyTezosDepositTx(
  txHash: string,
  sourceAddress: string,
  amountXtz: number,
): Promise<boolean> {
  if (!TEZOS_TREASURY || !Number.isFinite(amountXtz) || amountXtz <= 0) return false;
  const base = getTezosTzktApiBase();
  const source = sourceAddress.trim().toLowerCase();
  const treasury = TEZOS_TREASURY.trim().toLowerCase();

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }
    try {
      if (await verifyTezosDepositOnce(base, txHash, source, treasury, amountXtz)) return true;
    } catch (e) {
      console.error('[verifyTezosDepositTx]', e);
    }
  }
  return false;
}

function normalizeHex(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return `0x${BigInt(trimmed).toString(16)}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

function parseU256(low?: string, high?: string): bigint {
  const lo = BigInt(low || '0');
  const hi = BigInt(high || '0');
  return lo + (hi << BigInt(128));
}

export async function verifyStarknetDepositTx(
  txHash: string,
  senderAddress: string,
  amountStrk: number,
): Promise<boolean> {
  const { rpcEndpoint } = getStarknetConfig();
  try {
    const { RpcProvider, hash } = await import('starknet');
    const cfg = getStarknetConfig();
    if (!cfg.treasuryAddress || !cfg.strkTokenAddress) return false;
    if (!Number.isFinite(amountStrk) || amountStrk <= 0) return false;
    const provider = new RpcProvider({ nodeUrl: rpcEndpoint });
    const receipt = await withTimeout(provider.getTransactionReceipt(txHash), 20_000);
    if (!receipt) return false;
    const st = (receipt as any).execution_status ?? (receipt as any).finality_status;
    if (st && String(st).toUpperCase().includes('REVERT')) return false;
    if ((receipt as any).execution_status !== 'SUCCEEDED') return false;

    const transferSelector = hash.getSelectorFromName('Transfer').toLowerCase();
    const expectedFrom = normalizeHex(senderAddress);
    const expectedTo = normalizeHex(cfg.treasuryAddress);
    const expectedToken = normalizeHex(cfg.strkTokenAddress);
    const minWei = BigInt(Math.floor(amountStrk * 1e18 * 0.99));
    const events = (receipt as any).events;
    if (!Array.isArray(events)) return false;

    for (const ev of events) {
      const fromContract = normalizeHex(ev?.from_address);
      if (!fromContract || !expectedToken || fromContract !== expectedToken) continue;
      const keys = Array.isArray(ev?.keys) ? ev.keys.map((k: string) => String(k).toLowerCase()) : [];
      const data = Array.isArray(ev?.data) ? ev.data.map((d: string) => String(d)) : [];
      if (!keys.length || keys[0] !== transferSelector) continue;

      let from: string | null = null;
      let to: string | null = null;
      let value = BigInt(0);

      if (keys.length >= 3 && data.length >= 2) {
        from = normalizeHex(keys[1]);
        to = normalizeHex(keys[2]);
        value = parseU256(data[0], data[1]);
      } else if (data.length >= 4) {
        from = normalizeHex(data[0]);
        to = normalizeHex(data[1]);
        value = parseU256(data[2], data[3]);
      }

      if (!from || !to || !expectedFrom || !expectedTo) continue;
      if (from !== expectedFrom || to !== expectedTo) continue;
      if (value >= minWei) return true;
    }
    return false;
  } catch (e) {
    console.error('[verifyStarknetDepositTx]', e);
    return false;
  }
}

/** OneChain (OCT) — Sui-compatible digest with amount verification. */
export async function verifyOctDepositDigest(
  digest: string,
  sender: string,
  amount?: number,
): Promise<boolean> {
  const cfg = getOneChainConfig();
  const { rpcEndpoint } = cfg;
  if (!sender) return false;
  try {
    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: rpcEndpoint });
    const tx = await withTimeout(
      client.getTransactionBlock({
        digest,
        options: { showEffects: true, showInput: true, showBalanceChanges: true },
      }),
      15_000,
    );
    const status = tx.effects?.status;
    const ok =
      status?.status === 'success' ||
      (typeof status === 'string' && status === 'success');
    if (!ok) return false;

    const txSender = tx.transaction?.data?.sender;
    if (!txSender || txSender.toLowerCase() !== sender.toLowerCase()) return false;

    if (!amount || !Number.isFinite(amount) || amount <= 0) return false;

    const treasury = (cfg.treasuryAddress || '').toLowerCase();
    if (!treasury) return false;

    const balanceChanges = (tx as any)?.balanceChanges;
    if (!Array.isArray(balanceChanges)) return false;

    const minUnits = BigInt(Math.floor(amount * 1_000_000_000 * 0.99));
    let credited = BigInt(0);
    for (const change of balanceChanges) {
      const owner = change?.owner?.AddressOwner;
      const amountRaw = change?.amount;
      if (!owner || !amountRaw) continue;
      if (owner.toLowerCase() !== treasury) continue;
      const delta = BigInt(String(amountRaw));
      if (delta > BigInt(0)) credited += delta;
    }
    return credited >= minUnits;
  } catch (e) {
    console.error('[verifyOctDepositDigest]', e);
    return false;
  }
}
