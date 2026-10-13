'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { displayUsername } from '@/lib/brand/names';

interface LeaderboardEntry {
    wallet_address: string;
    username: string | null;
    total_bets: number;
    wins: number;
    losses: number;
    total_wagered: number;
    total_payout: number;
    net_profit: number;
    win_rate: number;
    primary_network: string;
}

const CHAINS: { code: string; label: string; asset: string; logo: string }[] = [
    { code: 'ALL', label: 'All chains', asset: '', logo: '' },
    { code: 'ROBINHOOD', label: 'Robinhood', asset: 'ETH', logo: '/partners/robinhood.svg' },
    { code: 'SOL', label: 'Solana', asset: 'SOL', logo: '/logos/chains/solana.png' },
    { code: 'BASE', label: 'Base', asset: 'USDC', logo: '/logos/chains/base.png' },
    { code: 'ARB', label: 'Arbitrum', asset: 'ETH', logo: '/logos/chains/arbitrum.png' },
    { code: 'TEMPO', label: 'Tempo', asset: 'OUSD', logo: '/logos/chains/tempo.png' },
];

const MARKETS: { code: string; label: string; logo: string }[] = [
    { code: 'ALL', label: 'All', logo: '' },
    { code: 'BTC', label: 'BTC', logo: '/logos/ticker/btc.svg' },
    { code: 'ETH', label: 'ETH', logo: '/logos/ticker/eth.svg' },
    { code: 'SOL', label: 'SOL', logo: '/logos/ticker/sol.svg' },
    { code: 'BNB', label: 'BNB', logo: '/logos/ticker/bnb.svg' },
    { code: 'GOLD', label: 'Gold', logo: '/logos/ticker/gold.svg' },
    { code: 'NVDA', label: 'NVDA', logo: '/logos/ticker/nvda.svg' },
    { code: 'TSLA', label: 'TSLA', logo: '/logos/ticker/tsla.svg' },
];

const WINDOWS = [
    { hours: '24', label: '24h' },
    { hours: '168', label: '7d' },
    { hours: '720', label: '30d' },
];

function chainMeta(network: string) {
    return CHAINS.find((chain) => chain.code === network) ?? null;
}

function formatProfit(value: number) {
    const abs = Math.abs(value);
    const digits = abs >= 100 ? 2 : abs >= 1 ? 3 : 4;
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function shorten(addr: string) {
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [networkFilter, setNetworkFilter] = useState('ALL');
    const [assetFilter, setAssetFilter] = useState('ALL');
    const [timeframe, setTimeframe] = useState('720');
    const [myRank, setMyRank] = useState<number | null>(null);
    const [loadError, setLoadError] = useState(false);
    const address = useStore((s) => s.address);

    const fetchLeaderboard = useCallback(async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const params = new URLSearchParams({
                limit: '50',
                network: networkFilter,
                asset: assetFilter,
                timeframeHours: timeframe,
            });
            if (address) params.set('wallet', address);
            const res = await fetch(`/api/bets/leaderboard?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
                setMyRank(typeof data.myRank === 'number' ? data.myRank : null);
            } else {
                setLeaderboard([]);
                setMyRank(null);
                setLoadError(true);
            }
        } catch (err) {
            setLoadError(true);
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setIsLoading(false);
        }
    }, [networkFilter, assetFilter, timeframe, address]);

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchLeaderboard]);

    const filteredLeaderboard = leaderboard.filter(entry =>
        !searchTerm ||
        (entry.username && entry.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeChain = CHAINS.find((chain) => chain.code === networkFilter) ?? CHAINS[0];
    const activeMarket = MARKETS.find((market) => market.code === assetFilter) ?? MARKETS[0];
    const activeWindow = WINDOWS.find((window) => window.hours === timeframe) ?? WINDOWS[2];
    const profitUnit = networkFilter === 'ALL' ? '' : activeChain.asset;
    const rounds = filteredLeaderboard.reduce((sum, entry) => sum + entry.total_bets, 0);

    return (
        <div className="bg-black text-white">
            <div className="rh-container py-8 sm:py-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="rh-display text-[clamp(2.6rem,5vw,4rem)] text-white">Leaderboard</h1>
                        <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#9a9590]">
                            Settled rounds, ranked by net profit. A chain filter keeps profit in that play asset.
                        </p>
                    </div>
                    <Link href="/trade" className="neon-btn h-10 shrink-0 px-5 text-sm">Open the chart</Link>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat label="Window" value={activeWindow.label} hint="Settled rounds" />
                    <Stat label="Chain" value={activeChain.label} hint={profitUnit || 'Mixed assets'} />
                    <Stat label="Traders" value={isLoading || loadError ? '—' : String(filteredLeaderboard.length)} hint={isLoading || loadError ? 'Waiting on the board' : `${rounds} rounds`} />
                    <Stat
                        label="Your rank"
                        value={address ? (myRank ? `#${myRank}` : '—') : '—'}
                        hint={address ? (myRank ? shorten(address) : 'No settled rounds') : 'Wallet not connected'}
                        accent={!!myRank}
                    />
                </div>

                <div className="panel mt-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="block min-w-0 flex-1">
                            <span className="sr-only">Search a trader</span>
                            <input
                                type="text"
                                placeholder="Search a name or address"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 w-full rounded-full border border-[#2a2a2a] bg-black px-4 text-sm text-white outline-none placeholder:text-[#4d4a46] focus:border-[#ccff00]"
                            />
                        </label>
                        <div className="flex h-10 shrink-0 rounded-full border border-[#2a2a2a] bg-black p-1">
                            {WINDOWS.map((window) => (
                                <button
                                    key={window.hours}
                                    type="button"
                                    onClick={() => setTimeframe(window.hours)}
                                    className={`rounded-full px-4 text-sm ${
                                        timeframe === window.hours ? 'bg-[#ccff00] text-[#110e08]' : 'text-[#9a9590]'
                                    }`}
                                >
                                    {window.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {CHAINS.map((chain) => (
                            <Chip key={chain.code} active={networkFilter === chain.code} onClick={() => setNetworkFilter(chain.code)}>
                                {chain.logo ? (
                                    <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-black">
                                        <img src={chain.logo} alt="" className="h-4 w-4 object-contain" />
                                    </span>
                                ) : null}
                                {chain.code === 'ALL' ? 'All' : chain.label}
                            </Chip>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#232323] pt-3">
                        {MARKETS.map((market) => (
                            <Chip key={market.code} active={assetFilter === market.code} onClick={() => setAssetFilter(market.code)}>
                                {market.logo ? <img src={market.logo} alt="" className="h-4 w-4 object-contain" /> : null}
                                {market.label}
                            </Chip>
                        ))}
                    </div>
                </div>

                <div className="panel mt-4 overflow-hidden">
                    {isLoading && leaderboard.length === 0 ? (
                        <Empty title="Loading the board" body="Pulling settled rounds for this window." />
                    ) : filteredLeaderboard.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead>
                                    <tr className="border-b border-[#232323] text-xs text-[#4d4a46]">
                                        <th className="w-16 px-5 py-3 font-medium">#</th>
                                        <th className="px-5 py-3 font-medium">Trader</th>
                                        <th className="px-5 py-3 font-medium">Rounds</th>
                                        <th className="px-5 py-3 font-medium">Win rate</th>
                                        <th className="px-5 py-3 text-right font-medium">
                                            Net profit{profitUnit ? ` · ${profitUnit}` : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaderboard.map((entry, index) => {
                                        const chain = chainMeta(entry.primary_network);
                                        const unit = profitUnit || chain?.asset || '';
                                        const top = index < 3;
                                        return (
                                            <tr key={`${entry.wallet_address}-${index}`} className="border-b border-[#232323] last:border-0 hover:bg-white/[0.03]">
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs ${top ? 'bg-[#ccff00] text-[#110e08]' : 'bg-[#141414] text-[#9a9590]'}`}>
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {chain?.logo ? (
                                                            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-black">
                                                                <img src={chain.logo} alt="" className="h-6 w-6 object-contain" />
                                                            </span>
                                                        ) : (
                                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-xs text-[#9a9590]">
                                                                {(entry.primary_network || '?').slice(0, 1)}
                                                            </span>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm text-white">
                                                                {displayUsername(entry.username) || entry.wallet_address}
                                                            </p>
                                                            <p className="truncate font-mono text-xs text-[#4d4a46]">
                                                                {entry.username ? entry.wallet_address : chain?.label || entry.primary_network}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-sm text-[#9a9590]">{entry.total_bets}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-1 w-16 overflow-hidden rounded-full bg-[#2a2a2a]">
                                                            <div className="h-full bg-[#ccff00]" style={{ width: `${Math.max(0, Math.min(100, entry.win_rate))}%` }} />
                                                        </div>
                                                        <span className="font-mono text-sm text-white">{entry.win_rate.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className={`px-5 py-3.5 text-right font-mono text-sm ${entry.net_profit >= 0 ? 'text-[#ccff00]' : 'text-white'}`}>
                                                    {formatProfit(entry.net_profit)}
                                                    {unit && !profitUnit ? <span className="ml-2 font-sans text-xs text-[#9a9590]">{unit}</span> : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <Empty
                            title={loadError ? 'Leaderboard unavailable' : searchTerm ? 'No matching trader' : 'No settled rounds'}
                            body={
                                loadError
                                    ? 'The ranking service did not respond. The filters stay ready for the next load.'
                                    : searchTerm
                                        ? 'Try another name, or clear the search.'
                                        : `${activeMarket.label === 'All' ? 'Every market' : activeMarket.label} on ${activeChain.label.toLowerCase()} is quiet for the last ${activeWindow.label}.`
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
    return (
        <div className="rounded-2xl border border-[#232323] bg-[#101010] px-4 py-4">
            <p className="text-xs text-[#4d4a46]">{label}</p>
            <p className={`mt-2 truncate text-xl ${accent ? 'text-[#ccff00]' : 'text-white'}`}>{value}</p>
            <p className="mt-1 h-4 truncate text-xs text-[#9a9590]">{hint}</p>
        </div>
    );
}

function Empty({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            <img src="/brand/tapt-mark.png" alt="" className="h-12 w-12 rounded-xl" />
            <p className="mt-4 text-base text-white">{title}</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#9a9590]">{body}</p>
        </div>
    );
}

function Chip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm ${
                active ? 'bg-[#ccff00] text-[#110e08]' : 'border border-[#2a2a2a] bg-black text-[#9a9590] hover:text-white'
            }`}
        >
            {children}
        </button>
    );
}
