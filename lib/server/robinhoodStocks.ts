/**
 * Robinhood Chain stock-token prices.
 * Chainlink feeds on chain 4663 quote the token's total return (share price × uiMultiplier).
 * Addresses come from Chainlink's reference directory, not a hardcoded list.
 * A quote older than four days is dropped so a dead feed cannot pin the chart.
 */

const DIRECTORY_URL = 'https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json';
const ASSETS_URL = 'https://api.robinhood.com/rhj/assets';
const PRICES_URL = 'https://api.robinhood.com/rhj/prices';
const PUBLIC_RPC = 'https://rpc.mainnet.chain.robinhood.com';
const LATEST_ROUND_DATA = '0xfeaf968c';
const ORACLE_PAUSED = '0x7706ba52';
const MAX_AGE_SEC = 4 * 24 * 60 * 60;
const HEADERS = { 'user-agent': 'tapt', accept: 'application/json' };

type FeedRow = {
  name?: string;
  proxyAddress?: string;
  decimals?: number;
};

type AssetRow = {
  tokenSymbol?: string;
  logoUrl?: string;
  status?: string;
  deployments?: { contractAddress?: string; chainId?: number }[];
};

type StockMeta = {
  logoUrl?: string;
  contract?: string;
  halted?: boolean;
  oraclePaused?: boolean;
};

let feedCache: { at: number; bySymbol: Map<string, { proxy: string; decimals: number }> } | null = null;
let assetCache: { at: number; bySymbol: Map<string, StockMeta> } | null = null;
let priceCache: { at: number; prices: Record<string, number> } | null = null;

function rpcUrl(): string {
  return process.env.ROBINHOOD_RPC_URL?.trim() || PUBLIC_RPC;
}

function symbolFromFeedName(name: string): string | null {
  const match = name.match(/^Robinhood ([A-Z][A-Z0-9]{0,5})(?: \/ |- )USD$/);
  return match ? match[1] : null;
}

function signedWord(hex: string, index: number): bigint | null {
  const start = 2 + index * 64;
  const word = hex.slice(start, start + 64);
  if (word.length !== 64) return null;
  let value = BigInt(`0x${word}`);
  if (value >= 1n << 255n) value -= 1n << 256n;
  return value;
}

async function loadFeeds(): Promise<Map<string, { proxy: string; decimals: number }>> {
  if (feedCache && Date.now() - feedCache.at < 60 * 60 * 1000) return feedCache.bySymbol;
  const response = await fetch(DIRECTORY_URL, { cache: 'no-store', signal: AbortSignal.timeout(8_000), headers: HEADERS });
  if (!response.ok) throw new Error(`chainlink directory ${response.status}`);
  const rows = (await response.json()) as FeedRow[];
  const bySymbol = new Map<string, { proxy: string; decimals: number }>();
  for (const row of rows) {
    const symbol = symbolFromFeedName(row.name || '');
    if (!symbol || !row.proxyAddress || !Number.isFinite(row.decimals)) continue;
    bySymbol.set(symbol, { proxy: row.proxyAddress, decimals: Number(row.decimals) });
  }
  feedCache = { at: Date.now(), bySymbol };
  return bySymbol;
}

async function loadAssets(): Promise<Map<string, StockMeta>> {
  if (assetCache && Date.now() - assetCache.at < 5 * 60 * 1000) return assetCache.bySymbol;
  const response = await fetch(ASSETS_URL, { cache: 'no-store', signal: AbortSignal.timeout(8_000), headers: HEADERS });
  if (!response.ok) throw new Error(`robinhood assets ${response.status}`);
  const body = (await response.json()) as { assets?: AssetRow[] };
  const bySymbol = new Map<string, StockMeta>();
  for (const asset of body.assets || []) {
    const symbol = asset.tokenSymbol?.toUpperCase();
    if (!symbol || asset.status !== 'ASSET_STATUS_ACTIVE') continue;
    const deployment = asset.deployments?.find((item) => item.chainId === 4663);
    bySymbol.set(symbol, {
      logoUrl: asset.logoUrl,
      contract: deployment?.contractAddress,
    });
  }
  assetCache = { at: Date.now(), bySymbol };
  return bySymbol;
}

async function ethCalls(calls: { id: string; to: string; data: string }[]): Promise<Map<string, string>> {
  if (calls.length === 0) return new Map();
  const payload = calls.map((call) => ({
    jsonrpc: '2.0',
    id: call.id,
    method: 'eth_call',
    params: [{ to: call.to, data: call.data }, 'latest'],
  }));
  const response = await fetch(rpcUrl(), {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
    headers: { ...HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`robinhood rpc ${response.status}`);
  const rows = (await response.json()) as { id?: string | number; result?: string }[];
  const out = new Map<string, string>();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.id !== undefined && typeof row.result === 'string') out.set(String(row.id), row.result);
  }
  return out;
}

export async function fetchRobinhoodStockPrices(assets: string[]): Promise<Partial<Record<string, number>>> {
  const wanted = Array.from(new Set(assets.map((asset) => asset.toUpperCase())));
  if (wanted.length === 0) return {};

  try {
    const feeds = await loadFeeds();
    if (priceCache && Date.now() - priceCache.at < 10_000) {
      const uncovered = wanted.filter((asset) => priceCache!.prices[asset] === undefined && feeds.has(asset));
      if (uncovered.length === 0) {
        const cached: Partial<Record<string, number>> = {};
        for (const asset of wanted) {
          const price = priceCache.prices[asset];
          if (Number.isFinite(price)) cached[asset] = price;
        }
        return cached;
      }
    }
    const calls = wanted
      .map((symbol) => {
        const feed = feeds.get(symbol);
        return feed ? { id: symbol, to: feed.proxy, data: LATEST_ROUND_DATA, decimals: feed.decimals } : null;
      })
      .filter((call): call is { id: string; to: string; data: string; decimals: number } => !!call);
    const results = await ethCalls(calls.map(({ id, to, data }) => ({ id, to, data })));
    const now = Math.floor(Date.now() / 1000);
    const prices: Record<string, number> = { ...(priceCache?.prices || {}) };
    const out: Partial<Record<string, number>> = {};
    for (const call of calls) {
      const hex = results.get(call.id);
      if (!hex) continue;
      const answer = signedWord(hex, 1);
      const updatedAt = signedWord(hex, 3);
      if (answer === null || updatedAt === null || answer <= 0n || updatedAt <= 0n) continue;
      if (now - Number(updatedAt) > MAX_AGE_SEC) continue;
      const price = Number(answer) / 10 ** call.decimals;
      if (!Number.isFinite(price) || price <= 0) continue;
      prices[call.id] = price;
      out[call.id] = price;
    }
    priceCache = { at: Date.now(), prices };
    return out;
  } catch {
    return {};
  }
}

let quoteCache: { at: number; prices: Record<string, number> } | null = null;

/** Robinhood's own bid/ask for a stock token. The mid moves when the token market does. */
export async function fetchRobinhoodQuoteMids(assets: string[]): Promise<Partial<Record<string, number>>> {
  const wanted = Array.from(new Set(assets.map((asset) => asset.toUpperCase())));
  if (wanted.length === 0) return {};
  try {
    if (quoteCache && Date.now() - quoteCache.at < 1_000) {
      const cached: Partial<Record<string, number>> = {};
      for (const asset of wanted) {
        const price = quoteCache.prices[asset];
        if (price > 0) cached[asset] = price;
      }
      return cached;
    }
    const response = await fetch(PRICES_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: HEADERS,
    });
    if (!response.ok) return {};
    const body = (await response.json()) as {
      quotes?: { tokenSymbol?: string; bid?: string; ask?: string; isTradingHalt?: boolean }[];
    };
    const prices: Record<string, number> = {};
    for (const quote of body.quotes || []) {
      const symbol = quote.tokenSymbol?.toUpperCase();
      if (!symbol || quote.isTradingHalt) continue;
      const bid = Number(quote.bid);
      const ask = Number(quote.ask);
      if (!(bid > 0) || !(ask > 0)) continue;
      prices[symbol] = (bid + ask) / 2;
    }
    quoteCache = { at: Date.now(), prices };
    const out: Partial<Record<string, number>> = {};
    for (const asset of wanted) {
      if (prices[asset] > 0) out[asset] = prices[asset];
    }
    return out;
  } catch {
    return {};
  }
}

export async function fetchRobinhoodStockMeta(symbols: string[]): Promise<Record<string, StockMeta>> {
  const wanted = Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase())));
  try {
    const assets = await loadAssets();
    const meta: Record<string, StockMeta> = {};
    const pauseCalls: { id: string; to: string; data: string }[] = [];
    await Promise.all(
      wanted.map(async (symbol) => {
        const asset = assets.get(symbol);
        if (!asset) return;
        meta[symbol] = { logoUrl: asset.logoUrl, contract: asset.contract };
        if (asset.contract) pauseCalls.push({ id: symbol, to: asset.contract, data: ORACLE_PAUSED });
        try {
          const response = await fetch(`${PRICES_URL}/${encodeURIComponent(symbol)}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(6_000),
            headers: HEADERS,
          });
          if (!response.ok) return;
          const body = (await response.json()) as { quotes?: { isTradingHalt?: boolean }[] };
          meta[symbol].halted = body.quotes?.[0]?.isTradingHalt === true;
        } catch {
          /* halt is optional */
        }
      }),
    );
    try {
      const paused = await ethCalls(pauseCalls);
      for (const [symbol, hex] of paused) {
        if (meta[symbol]) meta[symbol].oraclePaused = hex.endsWith('1');
      }
    } catch {
      /* pause flag is optional */
    }
    return meta;
  } catch {
    return {};
  }
}
