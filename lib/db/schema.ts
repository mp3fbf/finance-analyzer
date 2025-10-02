import Dexie, { Table } from 'dexie';
import { Transaction } from '@/types/transaction';
import { Merchant, MerchantMapping } from '@/types/merchant';
import { Category } from '@/types/category';
import { Insight } from '@/types/insight';
import { ChatSession } from '@/types/chat';

export class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>;
  merchants!: Table<Merchant, string>;
  mappings!: Table<MerchantMapping, string>;
  categories!: Table<Category, string>;
  insights!: Table<Insight, string>;
  chatSessions!: Table<ChatSession, string>;

  constructor() {
    super('FinanceAnalyzerDB');

    this.version(1).stores({
      // Transações
      transactions: 'id, date, merchant_id, category, source_file, type, amount',

      // Estabelecimentos
      merchants: 'id, name, total_spent, last_seen',

      // Mapeamentos (raw_name é a primary key)
      mappings: 'raw_name, merchant_id, confirmed',

      // Categorias
      categories: 'id, name, created_at',

      // Insights
      insights: 'id, type, priority, period, created_at, dismissed',

      // Chat
      chatSessions: 'id, created_at, updated_at',
    });
  }
}

export const db = new FinanceDB();
