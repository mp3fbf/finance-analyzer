import { getAllTransactions } from '@/lib/db/operations';
import { getOrCreateMerchant } from './merchants';
import { db } from '@/lib/db/schema';

/**
 * Result of merchant processing operation.
 */
export interface ProcessingResult {
  total: number;
  processed: number;
  errors: number;
  errorDetails: Array<{ transactionId: string; error: string }>;
}

/**
 * Processes all transactions without merchant_id and creates/updates merchants.
 * This function should be called after uploading new transactions.
 * Includes per-transaction error handling for resilience.
 * @returns Processing statistics including error count
 */
export async function processMerchantsForAllTransactions(): Promise<ProcessingResult> {
  const transactions = await getAllTransactions();
  const result: ProcessingResult = {
    total: transactions.length,
    processed: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log(`Processing ${transactions.length} transactions...`);

  for (const transaction of transactions) {
    try {
      if (!transaction.merchant_id) {
        const merchantId = await getOrCreateMerchant(
          transaction.raw_description,
          transaction.amount
        );

        // Atualizar transação
        await db.transactions.update(transaction.id, {
          merchant_id: merchantId,
        });

        result.processed++;
      }
    } catch (error) {
      result.errors++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errorDetails.push({
        transactionId: transaction.id,
        error: errorMessage,
      });
      console.error(`Failed to process transaction ${transaction.id}:`, error);
    }
  }

  console.log(`Merchant processing complete! Processed: ${result.processed}, Errors: ${result.errors}`);
  return result;
}
