import { NextResponse } from 'next/server';
import { getAllMerchants } from '@/lib/db/operations';
import { generateInsights } from '@/lib/analysis/insights';
import { format } from 'date-fns';

export async function POST() {
  try {
    const merchants = await getAllMerchants();
    const period = format(new Date(), 'yyyy-MM');

    await generateInsights(merchants, period);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
