import Dexie, { Table } from 'dexie';
import { Transaction } from '@/types/transaction';
import { Merchant, MerchantMapping } from '@/types/merchant';
import { Category } from '@/types/category';
import { Insight } from '@/types/insight';
import { ChatSession } from '@/types/chat';
import { MerchantDiscovery, DiscoveryLearning } from '@/types/discovery';

/**
 * IndexedDB database schema for Finance Analyzer.
 * Uses Dexie.js wrapper for better TypeScript support and simplified API.
 */
export class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>;
  merchants!: Table<Merchant, string>;
  mappings!: Table<MerchantMapping, string>;
  categories!: Table<Category, string>;
  insights!: Table<Insight, string>;
  chatSessions!: Table<ChatSession, string>;
  merchantDiscovery!: Table<MerchantDiscovery, number>;
  discoveryLearning!: Table<DiscoveryLearning, number>;

  constructor() {
    super('FinanceAnalyzerDB');

    // Version 1: Initial schema
    this.version(1).stores({
      transactions: 'id, date, merchant_id, category, source_file, type, amount',
      merchants: 'id, name, total_spent, last_seen',
      mappings: 'raw_name, merchant_id, confirmed',
      categories: 'id, name, total_amount, created_at',
      insights: 'id, type, priority, period, created_at, dismissed',
      chatSessions: 'id, created_at, updated_at',
    });

    // Version 2: Add merchant discovery tables
    this.version(2).stores({
      transactions: 'id, date, merchant_id, category, source_file, type, amount',
      merchants: 'id, name, total_spent, last_seen',
      mappings: 'raw_name, merchant_id, confirmed',
      categories: 'id, name, total_amount, created_at',
      insights: 'id, type, priority, period, created_at, dismissed',
      chatSessions: 'id, created_at, updated_at',
      merchantDiscovery: '++id, raw_code, status, impact_score, created_at, validated_at',
      discoveryLearning: '++id, pattern_signature, created_at',
    });

    // Handle database errors
    this.on('blocked', () => {
      console.warn('Database upgrade blocked - close other tabs using this app');
    });

    this.on('versionchange', () => {
      console.warn('Database version changed in another tab - reloading');
      db.close();
      window.location.reload();
    });
  }
}

// Singleton instance
export const db = new FinanceDB();

/**
 * Checks if the database connection is open and ready.
 * @returns true if database is open, false otherwise
 */
export function isDatabaseOpen(): boolean {
  return db.isOpen();
}

/**
 * Safely closes the database connection if open.
 */
export async function closeDatabaseSafely(): Promise<void> {
  if (db.isOpen()) {
    await db.close();
  }
}
