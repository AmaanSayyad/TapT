import { NextRequest, NextResponse } from 'next/server';
import { treasuryAddressFor, type EvmPlayNetwork } from '@/lib/chains/supported';

const EVM = new Set<EvmPlayNetwork>(['ROBINHOOD', 'BASE', 'ARB', 'TEMPO']);

/** Public house-wallet address for a deposit. Secrets stay on the server. */
export async function GET(request: NextRequest) {
  const network = (request.nextUrl.searchParams.get('network') || '').toUpperCase();
  if (network === 'SOL') {
    return NextResponse.json({
      address: (process.env.NEXT_PUBLIC_SOL_TREASURY_ADDRESS || '').trim(),
    });
  }
  if (!EVM.has(network as EvmPlayNetwork)) {
    return NextResponse.json({ address: '' }, { status: 400 });
  }
  return NextResponse.json({
    address: treasuryAddressFor(network as EvmPlayNetwork),
  });
}
