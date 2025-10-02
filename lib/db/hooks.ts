import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import {
  getAllTransactions,
  getAllMerchants,
  getAllCategories,
  getInsightsByPeriod,
} from './operations';
import { Transaction } from '@/types/transaction';
import { Merchant } from '@/types/merchant';
import { Category } from '@/types/category';
import { Insight } from '@/types/insight';

/**
 * React hook to fetch all transactions with live updates.
 * @returns Array of transactions or undefined while loading
 */
export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => getAllTransactions(), []);
}

/**
 * React hook to fetch all merchants with live updates.
 * @returns Array of merchants or undefined while loading
 */
export function useMerchants(): Merchant[] | undefined {
  return useLiveQuery(() => getAllMerchants(), []);
}

/**
 * React hook to fetch all categories with live updates.
 * @returns Array of categories or undefined while loading
 */
export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => getAllCategories(), []);
}

/**
 * React hook to fetch insights with live updates.
 * @param period - Optional period filter
 * @returns Array of insights or undefined while loading
 */
export function useInsights(period?: string): Insight[] | undefined {
  return useLiveQuery(
    () => (period ? getInsightsByPeriod(period) : db.insights.toArray()),
    [period]
  );
}

/**
 * React hook to fetch transactions by date range with live updates.
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of transactions in the date range, or empty array if dates not provided
 */
export function useTransactionsByPeriod(
  startDate?: Date,
  endDate?: Date
): Transaction[] | undefined {
  return useLiveQuery(() => {
    if (!startDate || !endDate) return [];
    return db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, [startDate, endDate]);
}
