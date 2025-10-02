/**
 * Merchant Discovery API
 *
 * Analyzes transactions and uses AI to discover real merchant names
 * from arbitrary transaction codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllTransactions, calculateImpactScore } from '@/lib/analysis/context-analyzer';
import { inferMerchantsBatch, filterContextsNeedingInference } from '@/lib/ai/merchant-inference';
import {
  getAllTransactions,
  getValidatedDiscoveries,
  getAllLearning,
  addMerchantDiscovery,
  addDiscoveryLearning,
  getDiscoveryByCode
} from '@/lib/db/operations';
import {
  createPatternSignature,
  createContextSummary,
  MerchantDiscovery
} from '@/types/discovery';

export async function POST(request: NextRequest) {
  try {
    // 1. Get all transactions
    const transactions = await getAllTransactions();

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 400 }
      );
    }

    // 2. Analyze and extract contexts for all unique codes
    const contexts = analyzeAllTransactions(transactions);

    // 3. Get existing discoveries to avoid re-inferring
    const existingDiscoveries = await getValidatedDiscoveries();
    const existingMap = new Map(
      existingDiscoveries.map(d => [
        d.raw_code,
        {
          confidence: d.ai_confidence,
          confirmed: d.status === 'confirmed' || d.status === 'corrected'
        }
      ])
    );

    // 4. Filter contexts that need inference
    const contextsArray = Array.from(contexts.values());
    const contextsNeedingInference = filterContextsNeedingInference(
      contextsArray,
      existingMap
    );

    if (contextsNeedingInference.length === 0) {
      return NextResponse.json({
        message: 'All merchants already discovered',
        discoveries_count: 0,
        total_codes: contextsArray.length
      });
    }

    // 5. Get learning history for better inference
    const allLearning = await getAllLearning();
    const learningSignals = allLearning.map(l => ({
      original_code: l.original_code,
      context_summary: l.context_summary,
      ai_inference: l.ai_inference,
      user_correction: l.user_correction,
      was_correct: l.was_correct
    }));

    // 6. Perform batch inference
    const inferences = await inferMerchantsBatch(
      contextsNeedingInference,
      learningSignals
    );

    // 7. Save discoveries to database
    const discoveryIds: number[] = [];

    for (const inference of inferences) {
      // Check if already exists
      const existing = await getDiscoveryByCode(inference.code);
      if (existing) {
        discoveryIds.push(existing.id!);
        continue;
      }

      // Find the context for this inference
      const context = contexts.get(inference.code);
      if (!context) continue;

      // Calculate impact score
      const impactScore = calculateImpactScore(context, inference.confidence);

      // Create discovery record
      const discoveryId = await addMerchantDiscovery({
        raw_code: inference.code,
        context_snapshot: context,
        ai_reasoning: inference.reasoning,
        ai_final_inference: inference.inferred_name,
        ai_confidence: inference.confidence,
        ai_merchant_type: inference.type,
        ai_reasoning_summary: inference.reasoning_summary,
        ai_used_web_search: inference.used_web_search,
        status: 'pending',
        impact_score: impactScore,
      });

      discoveryIds.push(discoveryId);
    }

    return NextResponse.json({
      message: 'Merchant discovery completed',
      discoveries_count: inferences.length,
      total_codes: contextsArray.length,
      discovery_ids: discoveryIds,
    });

  } catch (error) {
    console.error('Error in merchant discovery:', error);
    return NextResponse.json(
      {
        error: 'Failed to discover merchants',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check discovery status
 */
export async function GET() {
  try {
    const { getDiscoveryStats } = await import('@/lib/db/operations');
    const stats = await getDiscoveryStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting discovery stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to get discovery stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
