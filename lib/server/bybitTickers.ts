const TICKERS_URL = 'https://api.bybit.com/v5/market/tickers?category=linear';

/**
 * Perps whose last trade moves when the rounded Hyperliquid mid sits still.
 * Prices are the same instrument the chart shows (XAU, USD/JPY, the stock).
 */
const BYBIT_SYMBOL: Record<string, string> = {
  GOLD: 'XAUUSDT',
  SILVER: 'XAGUSDT',
  EUR: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  AAPL: 'AAPLUSDT',
  GOOGL: 'GOOGLUSDT',
  AMZN: 'AMZNUSDT',
  MSFT: 'MSFTUSDT',
  NVDA: 'NVDAUSDT',
  TSLA: 'TSLAUSDT',
  META: 'METAUSDT',
  NFLX: 'NFLXUSDT',
  BABA: 'BABAUSDT',
  JPM: 'JPMUSDT',
  V: 'VUSDT',
  MA: 'MAUSDT',
  PYPL: 'PYPLUSDT',
  COIN: 'COINUSDT',
  MSTR: 'MSTRUSDT',
  UBER: 'UBERUSDT',
  PLTR: 'PLTRUSDT',
  CRM: 'CRMUSDT',
  INTC: 'INTCUSDT',
  TSM: 'TSMUSDT',
};

/** Bid/ask size shifts the price inside the spread, so a quiet last trade still draws a line. */
function microPrice(row: { lastPrice?: string; bid1Price?: string; ask1Price?: string; bid1Size?: string; ask1Size?: string }): number | null {
  const bid = Number(row.bid1Price);
  const ask = Number(row.ask1Price);
  const bidSize = Number(row.bid1Size);
  const askSize = Number(row.ask1Size);
  if (bid > 0 && ask > 0 && bidSize + askSize > 0) {
    return (bid * askSize + ask * bidSize) / (bidSize + askSize);
  }
  const last = Number(row.lastPrice);
  return last > 0 ? last : null;
}

let cached: { at: number; prices: Record<string, number> } | null = null;
let inflight: Promise<Record<string, number>> | null = null;

async function loadLastPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cached && now - cached.at < 400) return cached.prices;
  if (!inflight) {
    inflight = fetch(TICKERS_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    }).then(async (response) => {
      if (!response.ok) return cached?.prices || {};
      const data = await response.json() as {
        result?: { list?: { symbol?: string; lastPrice?: string; bid1Price?: string; ask1Price?: string; bid1Size?: string; ask1Size?: string }[] };
      };
      const bySymbol = new Map<string, number>();
      for (const row of data.result?.list || []) {
        const price = microPrice(row);
        if (row.symbol && price > 0) bySymbol.set(row.symbol, price);
      }
      const prices: Record<string, number> = {};
      for (const [asset, symbol] of Object.entries(BYBIT_SYMBOL)) {
        const price = bySymbol.get(symbol);
        if (price && price > 0) prices[asset] = price;
      }
      cached = { at: Date.now(), prices };
      return prices;
    }).catch(() => cached?.prices || {}).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function fetchBybitQuotes(assets: string[]): Promise<Partial<Record<string, number>>> {
  const wanted = assets.filter((asset) => BYBIT_SYMBOL[asset]);
  if (wanted.length === 0) return {};
  const book = await loadLastPrices();
  const out: Partial<Record<string, number>> = {};
  for (const asset of wanted) {
    if (book[asset] > 0) out[asset] = book[asset];
  }
  return out;
}
