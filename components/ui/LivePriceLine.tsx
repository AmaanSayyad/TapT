'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STOCKS = [
  { symbol: 'NVDA', ltv: 60 },
  { symbol: 'GOOGL', ltv: 60 },
  { symbol: 'AAPL', ltv: 60 },
  { symbol: 'TSLA', ltv: 50 },
  { symbol: 'SPY', ltv: 65 },
  { symbol: 'AMZN', ltv: 60 },
  { symbol: 'MSFT', ltv: 60 },
  { symbol: 'META', ltv: 55 },
  { symbol: 'AMD', ltv: 55 },
  { symbol: 'COIN', ltv: 50 },
  { symbol: 'PLTR', ltv: 50 },
] as const;

function formatUsd(price: number) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function LivePriceLine() {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const symbols = STOCKS.map((stock) => stock.symbol);
    const load = async () => {
      try {
        const response = await fetch('/api/pyth/latest', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ assets: symbols }),
        });
        if (!response.ok) return;
        const body = (await response.json()) as { prices?: Record<string, number> };
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const symbol of symbols) {
          const price = body.prices?.[symbol];
          if (typeof price === 'number' && price > 0) next[symbol] = price;
        }
        setPrices(next);
      } catch {
        /* keep the last prices */
      }
    };
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const items = [...STOCKS, ...STOCKS];

  return (
    <div className="relative w-full overflow-hidden bg-black">
      <div className="ticker-track py-2.5">
        {items.map((stock, index) => {
          const price = prices[stock.symbol];
          return (
            <button
              key={`${stock.symbol}-${index}`}
              type="button"
              onClick={() => router.push('/trade')}
              className="mx-1 flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-left transition hover:bg-white/5"
            >
              <img
                src={`/tokens/${stock.symbol.toLowerCase()}.png`}
                alt=""
                className="h-5 w-5 rounded-full object-contain"
              />
              <span className="text-xs font-medium text-white">{stock.symbol}</span>
              <span className="text-xs font-medium tabular-nums text-[#ccff00]">
                {price ? formatUsd(price) : '—'}
              </span>
              <span className="rounded-full bg-[#ccff00]/10 px-2 py-0.5 text-[11px] font-medium text-[#ccff00]">
                {stock.ltv}% LTV
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
