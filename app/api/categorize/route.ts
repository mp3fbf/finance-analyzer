import { NextResponse } from 'next/server';
import { categorizeTransactions } from '@/lib/ai/categorization';
import type { Transaction } from '@/types/transaction';
import type { Merchant } from '@/types/merchant';

/**
 * POST /api/categorize
 *
 * Generates contextual categories for all transactions using AI analysis.
 * This endpoint:
 * 1. Receives transactions and merchants data from client (IndexedDB is client-side only)
 * 2. Sends data to Claude API for intelligent categorization
 * 3. Returns suggested categories to client for saving
 *
 * @param request - Request body must contain { transactions, merchants }
 * @returns JSON response with success status and categories array
 */
export async function POST(request: Request) {
  try {
    const { transactions, merchants } = await request.json() as {
      transactions: Transaction[];
      merchants: Merchant[];
    };

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Please upload data first.' },
        { status: 400 }
      );
    }

    console.log(`[API] Categorizing ${transactions.length} transactions with ${merchants.length} merchants`);

    const suggestions = await categorizeTransactions(transactions, merchants);

    console.log(`[API] Generated ${suggestions.length} category suggestions`);

    return NextResponse.json({ success: true, categories: suggestions });
  } catch (error) {
    console.error('Categorization failed:', error);
    return NextResponse.json(
      {
        error: 'Categorization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
