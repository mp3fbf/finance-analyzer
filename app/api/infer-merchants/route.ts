/**
 * Merchant Inference API (Server-side)
 *
 * This endpoint ONLY performs AI inference via Claude API.
 * It does NOT access IndexedDB - that's handled client-side.
 *
 * Input: Transaction contexts + learning signals (from client)
 * Output: AI inferences (to be saved by client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { inferMerchantsBatch, LearningSig } from '@/lib/ai/merchant-inference';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contexts, learning_signals } = body as {
      contexts: TransactionContext[];
      learning_signals: LearningSig[];
    };

    if (!contexts || contexts.length === 0) {
      return NextResponse.json(
        { error: 'No contexts provided' },
        { status: 400 }
      );
    }

    // Perform batch AI inference
    const inferences = await inferMerchantsBatch(contexts, learning_signals);

    return NextResponse.json(inferences);

  } catch (error) {
    console.error('Error in merchant inference:', error);
    return NextResponse.json(
      {
        error: 'Failed to infer merchants',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
