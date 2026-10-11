'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore, useHouseBalance, useWalletAddress, useIsConnected } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { openReferralShareOnX, referralLandingUrl } from '@/lib/referral/shareOnX';
import { chainMark, useTapTDisconnect } from '@/components/wallet/WalletConnect';
import { getFeePercentLabel } from '@/lib/fees/platformFee';
import { assetLogo } from '@/lib/assets/logos';
import { displayReferralCode, displayUsername } from '@/lib/brand/names';

const LIVE = new Set(['ROBINHOOD', 'SOL', 'BASE', 'ARB', 'TEMPO']);

function shorten(addr: string) {
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function directionLabel(direction: string | undefined) {
    if (direction === 'UP') return 'Higher';
    if (direction === 'DOWN') return 'Lower';
    return direction || 'Round';
}

function AssetMark({ asset }: { asset?: string }) {
    const logo = assetLogo(asset);
    return (
        <span className="inline-flex items-center gap-2">
            {logo ? <img src={logo} alt="" className="h-5 w-5 rounded-full bg-[#1a1a1a] object-cover" /> : null}
            <span>{asset || '—'}</span>
        </span>
    );
}

export default function ProfilePage() {
    const isConnected = useIsConnected();
    const address = useWalletAddress();
    const houseBalance = useHouseBalance();
    const {
        username,
        updateUsername,
        recentTrades,
        isLoadingTrades,
        referralCode,
        referralCount,
        accessCode,
        network,
        preferredNetwork,
        fetchRecentTrades,
        fetchReferralInfo,
        demoBalance,
        accountType,
        fetchBalance,
        setConnectModalOpen,
        userTier,
    } = useStore();

    const shownNetwork = LIVE.has(preferredNetwork || '') ? preferredNetwork : network;
    const chain = chainMark(shownNetwork);
    const asset = chain?.asset ?? '';
    const treasuryAmount = accountType === 'demo' ? demoBalance : houseBalance;

    useEffect(() => {
        if (isConnected && address && accountType === 'real') fetchBalance(address);
    }, [isConnected, address, accountType, fetchBalance]);

    useEffect(() => {
        if (isConnected && address) {
            fetchRecentTrades(address);
            fetchReferralInfo(address);
        }
    }, [isConnected, address, fetchRecentTrades, fetchReferralInfo]);

    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [copied, setCopied] = useState<'code' | 'address' | null>(null);
    const toast = useToast();
    const disconnectWallet = useTapTDisconnect();

    useEffect(() => {
        if (username) setNewUsername(displayUsername(username) || '');
    }, [username]);

    const handleUpdateUsername = async () => {
        if (!address || !newUsername.trim()) return;
        const formattedUsername = `${newUsername.trim().toLowerCase()}.tapt`;
        const success = await updateUsername(address, formattedUsername);
        if (success) setIsEditing(false);
        else toast.error('That name is taken or invalid.');
    };

    const copyText = async (text: string, kind: 'code' | 'address') => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 1600);
    };

    if (!isConnected) {
        return (
            <div className="bg-black text-white">
                <div className="rh-container flex min-h-[60vh] flex-col items-start justify-center py-16">
                    <h1 className="rh-display text-[clamp(2.6rem,5vw,4rem)]">Profile</h1>
                    <p className="mt-4 max-w-md text-[15px] leading-6 text-[#9a9590]">
                        Connect a wallet to see the house balance, the fee for that tier, and settled rounds for that chain.
                    </p>
                    <button type="button" onClick={() => setConnectModalOpen(true)} className="neon-btn mt-8 h-11 w-full px-6 text-sm sm:w-auto">
                        Connect
                    </button>
                </div>
            </div>
        );
    }

    const displayName = displayUsername(username) || 'Trader';
    const shownReferralCode = displayReferralCode(referralCode);

    return (
        <div className="bg-black text-white">
            <div className="rh-container py-8 sm:py-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="rh-display text-[clamp(2rem,8vw,3.5rem)]">Profile</h1>
                        <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#9a9590]">
                            The house balance, fee, and settled rounds for the wallet you have connected.
                        </p>
                    </div>
                    <Link href="/trade" className="neon-btn h-11 w-full shrink-0 px-5 text-sm sm:h-10 sm:w-auto">Open the chart</Link>
                </div>

                <section className="panel mt-8 p-5 sm:p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            {chain ? (
                                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-black">
                                    <img src={chain.logo} alt="" className="h-8 w-8 object-contain" />
                                </span>
                            ) : (
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141414] text-lg text-[#9a9590]">
                                    {displayName.slice(0, 1).toUpperCase()}
                                </span>
                            )}
                            <div>
                                {isEditing ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            className="h-10 rounded-full border border-[#2a2a2a] bg-black px-4 text-sm text-white outline-none focus:border-[#ccff00]"
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleUpdateUsername} className="neon-btn h-10 px-4 text-sm">Save</button>
                                        <button type="button" onClick={() => setIsEditing(false)} className="text-sm text-[#9a9590]">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <p className="text-xl text-white">{displayName}</p>
                                        <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-[#9a9590] hover:text-white">
                                            Rename
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => copyText(address || '', 'address')}
                                    className="mt-1 font-mono text-xs text-[#9a9590] hover:text-white"
                                >
                                    {copied === 'address' ? 'Copied' : shorten(address || '')}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-[8.5rem] flex-1 rounded-2xl border border-[#232323] bg-[#101010] px-4 py-3 sm:flex-none">
                                <p className="text-xs text-[#4d4a46]">{chain ? chain.name : 'Chain'}</p>
                                <p className="mt-1 text-sm text-white">{chain ? chain.asset : 'Not selected'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => disconnectWallet()}
                                className="h-11 rounded-full px-4 text-sm text-[#9a9590] hover:text-white"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </section>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#232323] bg-[#101010] px-4 py-4">
                        <p className="text-xs text-[#4d4a46]">{accountType === 'demo' ? 'Practice balance' : 'House balance'}</p>
                        <p className="mt-2 font-mono text-2xl text-white">
                            {Number(treasuryAmount || 0).toFixed(4)}
                            {asset ? <span className="ml-2 font-sans text-sm text-[#ccff00]">{asset}</span> : null}
                        </p>
                        <p className="mt-1 text-xs text-[#9a9590]">
                            {accountType === 'demo' ? 'Demo mode. This balance is not on-chain.' : 'Rounds debit this balance. A win pays back here.'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-[#232323] bg-[#101010] px-4 py-4">
                        <p className="text-xs text-[#4d4a46]">Deposit and withdrawal fee</p>
                        <p className="mt-2 text-2xl text-[#ccff00]">{getFeePercentLabel(userTier)}</p>
                        <p className="mt-1 text-xs text-[#9a9590]">Taken from the amount you send or withdraw</p>
                    </div>
                    <div className="rounded-2xl border border-[#232323] bg-[#101010] px-4 py-4">
                        <p className="text-xs text-[#4d4a46]">Referrals</p>
                        <p className="mt-2 text-2xl text-white">{referralCount || 0}</p>
                        <Link href="/referrals" className="mt-1 inline-block text-xs text-[#ccff00]">Open rewards</Link>
                    </div>
                </div>

                <section className="panel mt-4 p-5 sm:p-6">
                    <h2 className="text-base text-white">Fee tiers</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9a9590]">
                        The fee comes off deposits and withdrawals. Every chain pays out immediately up to $10. Anything above $10 waits for review.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {([
                            ['free', 'Free', 'Start here'],
                            ['standard', 'Standard', 'From $50'],
                            ['vip', 'VIP', 'From $500'],
                        ] as const).map(([id, name, note]) => {
                            const yours = (userTier || 'free') === id;
                            return (
                                <div key={id} className={`rounded-2xl border px-4 py-4 ${yours ? 'border-[#ccff00] bg-[#ccff00]/10' : 'border-[#232323] bg-[#101010]'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white">{name}</p>
                                        {yours ? <span className="rounded-full bg-[#ccff00] px-2 py-0.5 text-[11px] font-medium text-[#110e08]">Yours</span> : null}
                                    </div>
                                    <p className="mt-3 text-2xl text-[#ccff00]">{getFeePercentLabel(id)}</p>
                                    <p className="mt-1 text-xs text-[#9a9590]">{note}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                    <section className="panel overflow-hidden">
                        <div className="flex items-center justify-between border-b border-[#232323] px-5 py-4">
                            <h2 className="text-base text-white">Settled rounds</h2>
                            <Link href="/leaderboard" className="text-sm text-[#9a9590] hover:text-white">Leaderboard</Link>
                        </div>
                        {isLoadingTrades ? (
                            <p className="px-5 py-16 text-center text-sm text-[#9a9590]">Loading rounds.</p>
                        ) : recentTrades.length === 0 ? (
                            <div className="px-5 py-12 text-center">
                                <p className="text-sm text-white">No settled rounds yet.</p>
                                <Link href="/trade" className="mt-3 inline-block text-sm text-[#ccff00]">Place one on the chart</Link>
                            </div>
                        ) : (
                            <>
                            <ul className="sm:hidden">
                                {recentTrades.map((trade: any, index: number) => (
                                    <li key={trade.id || index} className="flex items-center justify-between gap-3 border-b border-[#232323] px-4 py-3.5 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white"><AssetMark asset={trade.asset} /></p>
                                            <p className="mt-0.5 text-xs text-[#9a9590]">{directionLabel(trade.direction)} · {Number(trade.amount || 0).toFixed(4)}</p>
                                        </div>
                                        <p className={`shrink-0 font-mono text-sm ${trade.won ? 'text-[#ccff00]' : 'text-white'}`}>
                                            {trade.won ? `+${Number(trade.payout || 0).toFixed(4)}` : `-${Number(trade.amount || 0).toFixed(4)}`}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                            <div className="hidden overflow-x-auto sm:block">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-[#232323] text-xs text-[#4d4a46]">
                                            <th className="px-5 py-3 font-medium">Market</th>
                                            <th className="px-5 py-3 font-medium">Side</th>
                                            <th className="px-5 py-3 font-medium">Stake</th>
                                            <th className="px-5 py-3 text-right font-medium">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTrades.map((trade: any, index: number) => (
                                            <tr key={trade.id || index} className="border-b border-[#232323] last:border-0">
                                                <td className="px-5 py-3.5 text-sm text-white"><AssetMark asset={trade.asset} /></td>
                                                <td className="px-5 py-3.5 text-sm text-[#9a9590]">{directionLabel(trade.direction)}</td>
                                                <td className="px-5 py-3.5 font-mono text-sm text-[#9a9590]">{Number(trade.amount || 0).toFixed(4)}</td>
                                                <td className={`px-5 py-3.5 text-right font-mono text-sm ${trade.won ? 'text-[#ccff00]' : 'text-white'}`}>
                                                    {trade.won ? `+${Number(trade.payout || 0).toFixed(4)}` : `-${Number(trade.amount || 0).toFixed(4)}`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        )}
                    </section>

                    <div className="flex flex-col gap-4">
                        <section className="panel p-5">
                            <h2 className="text-base text-white">Referral</h2>
                            <p className="mt-2 text-sm leading-6 text-[#9a9590]">Share the code. New traders who use it are counted here.</p>
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#2a2a2a] bg-black px-3 py-3">
                                <span className="truncate font-mono text-sm text-white">{shownReferralCode || '—'}</span>
                                <button type="button" onClick={() => copyText(shownReferralCode || '', 'code')} className="shrink-0 text-sm text-[#ccff00]" disabled={!shownReferralCode}>
                                    {copied === 'code' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!shownReferralCode?.trim()) {
                                        toast.error('Referral code is not ready yet.');
                                        return;
                                    }
                                    openReferralShareOnX(referralLandingUrl(shownReferralCode));
                                }}
                                className="neon-btn mt-3 h-11 w-full text-sm"
                            >
                                Share
                            </button>
                            <Link href="/referrals" className="mt-3 block text-center text-sm text-[#9a9590] hover:text-white">See the rewards board</Link>
                        </section>

                        {accessCode ? (
                            <section className="panel p-5">
                                <h2 className="text-base text-white">Access code</h2>
                                <p className="mt-2 font-mono text-sm text-[#ccff00]">{accessCode}</p>
                                <p className="mt-2 text-sm leading-6 text-[#9a9590]">Keep this code private. It unlocks the trading panel for this wallet.</p>
                            </section>
                        ) : null}

                        <Link href="/withdrawals" className="panel flex items-center justify-between px-5 py-4 text-sm text-white">
                            Withdrawals
                            <span className="text-[#9a9590]">Open</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
