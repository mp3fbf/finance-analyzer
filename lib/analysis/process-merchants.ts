import { getAllTransactions } from '@/lib/db/operations';
import { getOrCreateMerchant } from './merchants';
import { db } from '@/lib/db/schema';

/**
 * Processes all transactions without merchant_id and creates/updates merchants.
 * This function should be called after uploading new transactions.
 * @throws Error if database operations fail
 */
export async function processMerchantsForAllTransactions() {
  const transactions = await getAllTransactions();

  console.log(`Processing ${transactions.length} transactions...`);

  for (const transaction of transactions) {
    if (!transaction.merchant_id) {
      const merchantId = await getOrCreateMerchant(
        transaction.raw_description,
        transaction.amount
      );

      // Atualizar transação
      await db.transactions.update(transaction.id, {
        merchant_id: merchantId,
      });
    }
  }

  console.log('Merchant processing complete!');
}
