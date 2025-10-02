import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import {
  getAllTransactions,
  getAllMerchants,
  getAllCategories,
  getInsightsByPeriod,
} from './operations';

export function useTransactions() {
  return useLiveQuery(() => getAllTransactions(), []);
}

export function useMerchants() {
  return useLiveQuery(() => getAllMerchants(), []);
}

export function useCategories() {
  return useLiveQuery(() => getAllCategories(), []);
}

export function useInsights(period?: string) {
  return useLiveQuery(
    () => (period ? getInsightsByPeriod(period) : db.insights.toArray()),
    [period]
  );
}

export function useTransactionsByPeriod(startDate?: Date, endDate?: Date) {
  return useLiveQuery(() => {
    if (!startDate || !endDate) return [];
    return db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, [startDate, endDate]);
}
