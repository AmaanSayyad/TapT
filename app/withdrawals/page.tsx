'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getPushExplorerTxUrl } from '@/lib/push/config';
import { CheckCircle2, Clock3, ExternalLink, Search, XCircle } from 'lucide-react';

type WithdrawalRow = {
  id: number;
  user_address: string;
  currency: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  decided_at?: string | null;
  tx_hash?: string | null;
  fee_tx_hash?: string | null;
};

function getExplorerUrl(currency: string, hash: string | null | undefined) {
  if (!hash || hash === 'INTERNAL' || hash === 'PENDING') return null;
  const c = currency.toUpperCase();
  if (c === 'BNB') return `https://bscscan.com/tx/${hash}`;
  if (c === 'SOL' || c === 'BYNOMO') return `https://solscan.io/tx/${hash}`;
  if (c === 'SUI') return `https://suiscan.xyz/mainnet/tx/${hash}`;
  if (c === 'XLM') return `https://stellar.expert/explorer/public/tx/${hash}`;
  if (c === 'XTZ') return `https://tzkt.io/${hash}`;
  if (c === 'NEAR') return `https://nearblocks.io/txns/${hash}`;
  if (c === 'STRK') return `https://starkscan.co/tx/${hash}`;
  if (c === 'ROBINHOOD') return `https://robinhoodchain.blockscout.com/tx/${hash}`;
  if (c === 'BASE' || c === 'USDC_BASE') return `https://basescan.org/tx/${hash}`;
  if (c === 'ARB') return `https://arbiscan.io/tx/${hash}`;
  if (c === 'TEMPO' || c === 'OUSD') return `https://explore.tempo.xyz/tx/${hash}`;
  if (c === 'PUSH' || c === 'PC') return getPushExplorerTxUrl(hash);
  if (c === 'SOMNIA' || c === 'STT') return `https://shannon-explorer.somnia.network/tx/${hash}`;
  return null;
}

function chainLabel(currency: string) {
  const c = currency.toUpperCase();
  if (c === 'ROBINHOOD' || c === 'ARB') return 'ETH';
  if (c === 'BASE' || c === 'USDC_BASE') return 'USDC';
  if (c === 'TEMPO' || c === 'OUSD') return 'OUSD';
  if (c === 'SOL') return 'SOL';
  if (c === 'BYNOMO') return 'Legacy';
  return c;
}

function networkLabel(currency: string) {
  const c = currency.toUpperCase();
  if (c === 'ROBINHOOD') return 'Robinhood';
  if (c === 'ARB') return 'Arbitrum';
  if (c === 'BASE' || c === 'USDC_BASE') return 'Base';
  if (c === 'TEMPO' || c === 'OUSD') return 'Tempo';
  if (c === 'SOL') return 'Solana';
  return chainLabel(c);
}

function shortHash(hash: string) {
  if (hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatAmount(n: number) {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const text = n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return text || '0';
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusPill({ status }: { status: WithdrawalRow['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#e6c200]">
        <Clock3 className="h-3.5 w-3.5" />
        Waiting
      </span>
    );
  }
  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#ccff00]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#ff5c5c]">
      <XCircle className="h-3.5 w-3.5" />
      Rejected
    </span>
  );
}

export default function WithdrawalsPage() {
  const address = useStore((s) => s.address);
  const isConnected = useStore((s) => s.isConnected);
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | WithdrawalRow['status']>('all');
  const [chainFilter, setChainFilter] = useState<'ALL' | string>('ALL');
  const [query, setQuery] = useState('');

  const fetchRows = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/withdrawals?address=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error('Failed to load withdrawals');
      const data = await res.json();
      setRows(data.withdrawals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    const int = setInterval(fetchRows, 30_000);
    return () => clearInterval(int);
  }, [address]);

  const counts = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending').length;
    const accepted = rows.filter((r) => r.status === 'accepted').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    return { pending, accepted, rejected };
  }, [rows]);

  const chainOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(String(r.currency || '').toUpperCase());
    return ['ALL', ...Array.from(set).filter(Boolean).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (chainFilter === 'ALL' ? true : String(r.currency || '').toUpperCase() === chainFilter))
      .filter((r) => {
        if (!q) return true;
        const tx = String(r.tx_hash || '').toLowerCase();
        const feeTx = String(r.fee_tx_hash || '').toLowerCase();
        const cur = String(r.currency || '').toLowerCase();
        return tx.includes(q) || feeTx.includes(q) || cur.includes(q);
      })
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [rows, statusFilter, chainFilter, query]);

  if (!isConnected || !address) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-2xl text-white">Withdrawals</h1>
        <p className="mt-2 text-sm leading-6 text-[#9a9590]">Connect a wallet to see withdrawals that are waiting for approval.</p>
        <Link href="/trade" className="neon-btn mt-6 h-11 w-fit px-5 text-sm">
          Go to trade
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">Withdrawals</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#9a9590]">
            Amounts at or under $10 are sent straight to your wallet. Only withdrawals over $10 are listed here while they wait for approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRows}
            className="h-10 rounded-full border border-[#2a2a2a] px-4 text-sm text-[#9a9590] transition hover:text-white"
          >
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <Link href="/trade" className="neon-btn h-10 px-4 text-sm">
            Back to trade
          </Link>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2 overflow-x-auto">
            {([
              ['all', `All ${rows.length}`],
              ['pending', `Waiting ${counts.pending}`],
              ['accepted', `Sent ${counts.accepted}`],
              ['rejected', `Rejected ${counts.rejected}`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`h-9 shrink-0 rounded-full px-3 text-sm ${
                  statusFilter === key
                    ? 'bg-[#ccff00] text-[#110e08]'
                    : 'border border-[#2a2a2a] bg-[#141414] text-[#9a9590]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d4a46]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a transaction"
                className="h-10 w-full rounded-full border border-[#2a2a2a] bg-[#101010] pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#4d4a46] focus:border-[#ccff00]"
              />
            </div>
            {chainOptions.length > 2 && (
              <select
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                className="h-10 rounded-full border border-[#2a2a2a] bg-[#101010] px-3 text-sm text-white outline-none"
              >
                {chainOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'All chains' : networkLabel(c)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading && rows.length === 0 ? (
          <div className="panel px-5 py-10 text-center text-sm text-[#9a9590]">Loading withdrawals.</div>
        ) : rows.length === 0 ? (
          <div className="panel px-5 py-10 text-center">
            <p className="text-base text-white">Nothing waiting</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#9a9590]">
              This wallet has no withdrawals over $10. Smaller ones are paid immediately and do not appear here.
            </p>
            <Link href="/trade" className="neon-btn mt-5 inline-flex h-11 px-5 text-sm">
              Back to trade
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel px-5 py-10 text-center">
            <p className="text-base text-white">No matches</p>
            <p className="mt-2 text-sm text-[#9a9590]">Try another status or clear the search.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setChainFilter('ALL');
                setQuery('');
              }}
              className="mt-5 h-10 rounded-full border border-[#2a2a2a] px-4 text-sm text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const link = getExplorerUrl(r.currency, r.tx_hash || null);
              return (
                <li key={r.id} className="panel flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg tabular-nums text-white">
                      {formatAmount(Number(r.net_amount))} <span className="text-sm text-[#ccff00]">{chainLabel(r.currency)}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#9a9590]">
                      {networkLabel(r.currency)} · {formatWhen(r.requested_at)}
                      {Number(r.fee_amount) > 0 ? ` · fee ${formatAmount(Number(r.fee_amount))}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <StatusPill status={r.status} />
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-white"
                      >
                        {shortHash(r.tx_hash || '')}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#4d4a46]">{r.status === 'pending' ? 'No transaction yet' : '—'}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
