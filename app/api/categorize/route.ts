import { NextResponse } from 'next/server';
import {
  getAllTransactions,
  getAllMerchants,
  addCategory,
} from '@/lib/db/operations';
import { categorizeTransactions } from '@/lib/ai/categorization';

/**
 * POST /api/categorize
 *
 * Generates contextual categories for all transactions using AI analysis.
 * This endpoint:
 * 1. Fetches all transactions and merchants from IndexedDB
 * 2. Sends data to Claude API for intelligent categorization
 * 3. Saves suggested categories back to the database
 * 4. Returns the generated categories to the client
 *
 * @returns JSON response with success status and categories array
 */
export async function POST() {
  try {
    const transactions = await getAllTransactions();
    const merchants = await getAllMerchants();

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Please upload data first.' },
        { status: 400 }
      );
    }

    const suggestions = await categorizeTransactions(transactions, merchants);

    // Save categories to database
    for (const cat of suggestions) {
      await addCategory({
        name: cat.name,
        description: cat.description,
        transaction_ids: cat.transaction_ids,
        total_amount: cat.total_amount,
      });
    }

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
