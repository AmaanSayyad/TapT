'use client';

/**
 * PriceTicker — reads live prices directly from the Zustand store's
 * `assetPrices` map (already populated by the global Pyth feed).
 * Zero extra network requests.
 */

import React, { useEffect, useState } from 'react';
import { useOverflowStore } from '@/lib/store';
import type { AssetType } from '@/lib/utils/priceFeed';

// ── Ordered list of assets to show ─────────────────────────────────────────
const TICKER_ITEMS: { key: string; label: string; logo: string; category: 'crypto' | 'forex' | 'metal' | 'stock' }[] = [
  { key: 'BTC',    label: 'BTC/USD',  logo: '/logos/ticker/btc.svg',    category: 'crypto' },
  { key: 'ETH',    label: 'ETH/USD',  logo: '/logos/ticker/eth.svg',    category: 'crypto' },
  { key: 'SOL',    label: 'SOL/USD',  logo: '/logos/ticker/sol.svg',    category: 'crypto' },
  { key: 'BNB',    label: 'BNB/USD',  logo: '/logos/ticker/bnb.svg',    category: 'crypto' },
  { key: 'XRP',    label: 'XRP/USD',  logo: '/logos/ticker/xrp.svg',    category: 'crypto' },
  { key: 'DOGE',   label: 'DOGE/USD', logo: '/logos/ticker/doge.svg',   category: 'crypto' },
  { key: 'ADA',    label: 'ADA/USD',  logo: '/logos/ticker/ada.svg',    category: 'crypto' },
  { key: 'SUI',    label: 'SUI/USD',  logo: '/logos/ticker/sui.svg',    category: 'crypto' },
  { key: 'NEAR',   label: 'NEAR/USD', logo: '/logos/ticker/near.svg',   category: 'crypto' },
  { key: 'XLM',    label: 'XLM/USD',  logo: '/logos/ticker/xlm.svg',    category: 'crypto' },
  { key: 'TRX',    label: 'TRX/USD',  logo: '/logos/ticker/trx.svg',    category: 'crypto' },
  { key: 'EUR',    label: 'EUR/USD',  logo: '/logos/ticker/eur.svg',    category: 'forex'  },
  { key: 'GBP',    label: 'GBP/USD',  logo: '/logos/ticker/gbp.svg',    category: 'forex'  },
  { key: 'JPY',    label: 'USD/JPY',  logo: '/logos/ticker/jpy.svg',    category: 'forex'  },
  { key: 'AUD',    label: 'AUD/USD',  logo: '/logos/ticker/aud.svg',    category: 'forex'  },
  { key: 'GOLD',   label: 'XAU/USD',  logo: '/logos/ticker/gold.svg',   category: 'metal'  },
  { key: 'SILVER', label: 'XAG/USD',  logo: '/logos/ticker/silver.svg', category: 'metal'  },
  { key: 'AAPL',   label: 'AAPL',     logo: '/logos/stock-AAPL-logo.png',   category: 'stock'  },
  { key: 'NVDA',   label: 'NVDA',     logo: '/logos/stock-NVDA-logo.png',   category: 'stock'  },
  { key: 'TSLA',   label: 'TSLA',     logo: '/logos/stock-TSLA-logo.png',   category: 'stock'  },
  { key: 'MSFT',   label: 'MSFT',     logo: '/logos/stock-MSFT-logo.png',   category: 'stock'  },
  { key: 'META',   label: 'META',     logo: '/logos/stock-META-logo.png',   category: 'stock'  },
  { key: 'AMZN',   label: 'AMZN',     logo: '/logos/stock-AMZN-logo.png',   category: 'stock'  },
  { key: 'NFLX',   label: 'NFLX',     logo: '/logos/stock-NFLX-logo.png',   category: 'stock'  },
  { key: 'GOOGL',  label: 'GOOGL',    logo: '/logos/stock-GOOGL-logo.png',  category: 'stock'  },
];

function fmt(price: number, key: string): string {
  if (key === 'JPY')   return price.toFixed(price >= 1 ? 3 : 4);
  // High-priced majors: show extra decimals so sub‑$1 Hermes moves are visible (2dp looked “frozen”).
  if (['BTC', 'ETH', 'BNB'].includes(key) && price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  if (price >= 10000)  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1000)   return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)      return price.toFixed(4);
  return price.toFixed(6);
}

export const PriceTicker: React.FC = () => {
  const assetPrices = useOverflowStore(state => state.assetPrices);
  const selectedAsset = useOverflowStore(state => state.selectedAsset);
  const setSelectedAsset = useOverflowStore(state => state.setSelectedAsset);
  const [halts, setHalts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const symbols = TICKER_ITEMS.filter((item) => item.category === 'stock').map((item) => item.key);
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/robinhood/stocks?symbols=${symbols.join(',')}`);
        if (!response.ok) return;
        const body = (await response.json()) as { meta?: Record<string, { logoUrl?: string; halted?: boolean }> };
        if (cancelled) return;
        const nextHalts: Record<string, boolean> = {};
        for (const [symbol, meta] of Object.entries(body.meta || {})) {
          if (meta.halted) nextHalts[symbol] = true;
        }
        setHalts(nextHalts);
      } catch {
        /* local ticker marks stay in place */
      }
    };
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const items = TICKER_ITEMS.filter(item => assetPrices[item.key] !== undefined && assetPrices[item.key] > 0);

  if (items.length === 0) {
    return (
      <div className="h-8 bg-black/80 border-b border-white/5 flex items-center overflow-hidden shrink-0">
        <div className="flex gap-6 px-4 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-3 bg-white/10 rounded w-28" />
          ))}
        </div>
      </div>
    );
  }

  const loop = [...items, ...items];

  return (
    <div className="relative w-full shrink-0 overflow-hidden border-b border-white/5 bg-black">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black to-transparent" />
      <div className="ticker-track py-2">
        {loop.map((item, index) => {
          const price = assetPrices[item.key];
          const selected = selectedAsset === item.key;
          const copy = index >= items.length;
          return (
            <button
              key={`${item.key}-${index}`}
              type="button"
              aria-hidden={copy}
              tabIndex={copy ? -1 : 0}
              aria-label={`Show ${item.label} on the chart`}
              aria-pressed={selected}
              onClick={() => setSelectedAsset(item.key as AssetType)}
              className={`mx-1 flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 transition ${selected ? 'bg-[#ccff00] text-[#110e08]' : 'hover:bg-white/10'}`}
            >
              <img src={item.logo} alt="" className="h-5 w-5 shrink-0 rounded-full bg-white object-contain" />
              <span className={`text-xs font-medium ${selected ? 'text-[#110e08]' : 'text-white'}`}>
                {item.label}{halts[item.key] ? ' · Halt' : ''}
              </span>
              <span className={`text-xs font-medium tabular-nums ${selected ? 'text-[#110e08]' : 'text-[#ccff00]'}`}>
                ${fmt(price, item.key)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
