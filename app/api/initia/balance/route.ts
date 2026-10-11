import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });

  const restUrl = process.env.NEXT_PUBLIC_INITIA_REST_URL || 'https://rest.initia.xyz';

  try {
    const res = await fetch(
      `${restUrl}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uinit`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return NextResponse.json({ balance: { amount: '0' } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ balance: { amount: '0' } });
  }
}
