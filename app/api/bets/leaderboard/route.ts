/**
 * API Route: Leaderboard
 * GET /api/bets/leaderboard?limit=10
 * 
 * Returns top winners ranked by total profit
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoBetHistoryRow, walletAddressSearchVariants } from '@/lib/admin/walletAddressVariants';
import { isDbUnreachable, logDbOnce, supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';
import { displayUsername } from '@/lib/brand/names';

type LeaderboardRow = {
  wallet_address: string; // always truncated before sending to client
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_payout: number;
  net_profit: number;
  win_rate: number;
  primary_network: string;
  username?: string | null;
};

/** Truncate wallet address so it cannot be used to query other APIs */
function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Full addresses stay in this process cache and are truncated before the response.
let cachedSorted: { rows: LeaderboardRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

async function fetchLeaderboardFromSupabase(
  opts?: { network?: string; asset?: string; timeframeHours?: number }
): Promise<LeaderboardRow[]> {
  // Fetch raw bet history
  let query = supabase
    .from('bet_history')
    .select('id, wallet_address, amount, payout, won, network, asset, created_at');

  if (opts?.network && opts.network !== 'ALL') {
    query = query.eq('network', opts.network);
  }
  if (opts?.asset && opts.asset !== 'ALL') {
    query = query.eq('asset', opts.asset);
  }
  if (opts?.timeframeHours && Number.isFinite(opts.timeframeHours)) {
    const since = new Date(Date.now() - opts.timeframeHours * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    logDbOnce('leaderboard', error);
    if (isDbUnreachable(error)) return [];
    throw new Error('Failed to fetch leaderboard from Supabase');
  }

  // Aggregate per wallet
  const walletStats: Record<string, {
    wallet_address: string;
    total_bets: number;
    wins: number;
    losses: number;
    total_wagered: number;
    total_payout: number;
    net_profit: number;
    networks: Record<string, number>;
  }> = {};

  /** Public leaderboard: real balance-backed play only (not demo mode / demo-* bet ids). */
  const realRows = (data || []).filter((row: any) => !isDemoBetHistoryRow(row));

  realRows.forEach((row: any) => {
    const addr = canonicalHouseUserAddress(row.wallet_address ?? '');
    const net = row.network || 'SOL';
    if (!walletStats[addr]) {
      walletStats[addr] = {
        wallet_address: addr,
        total_bets: 0,
        wins: 0,
        losses: 0,
        total_wagered: 0,
        total_payout: 0,
        net_profit: 0,
        networks: {},
      };
    }
    walletStats[addr].total_bets += 1;
    walletStats[addr].total_wagered += parseFloat(row.amount) || 0;
    walletStats[addr].networks[net] = (walletStats[addr].networks[net] || 0) + 1;

    if (row.won) {
      walletStats[addr].wins += 1;
      walletStats[addr].total_payout += parseFloat(row.payout) || 0;
    } else {
      walletStats[addr].losses += 1;
    }
  });

  const leaderboard = Object.values(walletStats)
    .map((s) => {
      const [primary_network] =
        Object.entries(s.networks).sort((a, b) => b[1] - a[1])[0] || ['SOL', 0];
      return {
        wallet_address: s.wallet_address,
        total_bets: s.total_bets,
        wins: s.wins,
        losses: s.losses,
        total_wagered: s.total_wagered,
        total_payout: s.total_payout,
        net_profit: s.total_payout - s.total_wagered,
        win_rate: s.total_bets > 0 ? (s.wins / s.total_bets) * 100 : 0,
        primary_network,
      };
    })
    .sort((a, b) => b.net_profit - a.net_profit);

  if (leaderboard.length === 0) {
    return leaderboard;
  }

  const profileLookupKeys = new Set<string>();
  leaderboard.forEach((l) => {
    walletAddressSearchVariants(l.wallet_address).forEach((v) => profileLookupKeys.add(v));
  });
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_address, username')
    .in('user_address', [...profileLookupKeys]);

  if (profileError) {
    console.warn('Supabase leaderboard profile error:', profileError);
  }

  const usernameMap: Record<string, string> = {};
  profileData?.forEach((p) => {
    usernameMap[canonicalHouseUserAddress(p.user_address)] = displayUsername(p.username) || '';
  });

  return leaderboard.map((l) => ({
    ...l,
    username: usernameMap[l.wallet_address] || null,
  }));
}

function publish(rows: LeaderboardRow[], limit: number, wallet?: string | null) {
  let myRank: number | null = null;
  if (wallet) {
    const canon = canonicalHouseUserAddress(wallet);
    const idx = rows.findIndex((row) => canonicalHouseUserAddress(row.wallet_address) === canon);
    myRank = idx >= 0 ? idx + 1 : null;
  }
  return {
    leaderboard: rows.slice(0, limit).map((row) => ({
      ...row,
      wallet_address: truncateAddress(row.wallet_address),
    })),
    myRank,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const network = (searchParams.get('network') || 'ALL').toUpperCase();
    const asset = (searchParams.get('asset') || 'ALL').toUpperCase();
    const timeframeHoursRaw = searchParams.get('timeframeHours');
    const timeframeHours = timeframeHoursRaw ? Number(timeframeHoursRaw) : undefined;
    const wallet = searchParams.get('wallet');
    const now = Date.now();

    const useBaseCache = network === 'ALL' && asset === 'ALL' && !timeframeHours;
    if (useBaseCache && cachedSorted && now - cachedSorted.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({ ...publish(cachedSorted.rows, limit, wallet), cached: true });
    }

    // Add a hard timeout so we don't hang for minutes on upstream 522s.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s

    let data: LeaderboardRow[];
    try {
      // Note: supabase-js doesn't take AbortController directly here, so we just
      // bound our own Promise timeout around the fetch function.
      const result = await Promise.race([
        fetchLeaderboardFromSupabase({ network, asset, timeframeHours }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Leaderboard fetch timeout')), 10_000);
        }),
      ]);
      data = result as LeaderboardRow[];
    } finally {
      clearTimeout(timeout);
    }

    if (useBaseCache) {
      cachedSorted = { rows: data, fetchedAt: now };
    }
    return NextResponse.json({ ...publish(data, limit, wallet), cached: false });
  } catch (error) {
    logDbOnce('leaderboard', error);

    // If we have a recent cached snapshot, serve it instead of outright failing
    if (cachedSorted) {
      const wallet = new URL(request.url).searchParams.get('wallet');
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10', 10);
      return NextResponse.json(
        {
          ...publish(cachedSorted.rows, limit, wallet),
          cached: true,
          stale: true,
          error: 'Upstream leaderboard provider unavailable, serving cached data',
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: 'Leaderboard temporarily unavailable, please try again soon.' },
      { status: 503 },
    );
  }
}
