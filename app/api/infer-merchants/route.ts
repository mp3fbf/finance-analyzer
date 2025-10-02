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

    // Validate contexts
    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return NextResponse.json(
        { error: 'No contexts provided or invalid format' },
        { status: 400 }
      );
    }

    // Validate learning_signals
    if (learning_signals !== undefined && !Array.isArray(learning_signals)) {
      return NextResponse.json(
        { error: 'Invalid learning_signals format - must be an array' },
        { status: 400 }
      );
    }

    // Rehydrate Date objects that were serialized as strings during JSON transport
    const rehydratedContexts = contexts.map(ctx => ({
      ...ctx,
      date_range: {
        ...ctx.date_range,
        first: new Date(ctx.date_range.first),
        last: new Date(ctx.date_range.last)
      }
    }));

    // Perform batch AI inference
    const inferences = await inferMerchantsBatch(
      rehydratedContexts,
      learning_signals || []
    );

    return NextResponse.json(inferences);

  } catch (error) {
    console.error('Error in merchant inference:', error);

    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to infer merchants',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
