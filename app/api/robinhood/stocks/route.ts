import { NextRequest, NextResponse } from 'next/server';
import { fetchRobinhoodStockMeta } from '@/lib/server/robinhoodStocks';

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') || '';
  const symbols = raw.split(',').map((symbol) => symbol.trim()).filter(Boolean).slice(0, 40);
  const meta = await fetchRobinhoodStockMeta(symbols);
  return NextResponse.json({ meta });
}
