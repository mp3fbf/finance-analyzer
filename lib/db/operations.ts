import { v4 as uuidv4 } from 'uuid';
import { db } from './schema';
import { Transaction } from '@/types/transaction';
import { Merchant, MerchantMapping } from '@/types/merchant';
import { Category } from '@/types/category';
import { Insight } from '@/types/insight';
import { ChatSession } from '@/types/chat';

// ==================== TRANSACTIONS ====================

export async function addTransaction(
  transaction: Omit<Transaction, 'id' | 'created_at'>
): Promise<string> {
  const id = uuidv4();
  await db.transactions.add({
    ...transaction,
    id,
    created_at: new Date(),
  });
  return id;
}

export async function addTransactions(
  transactions: Omit<Transaction, 'id' | 'created_at'>[]
): Promise<string[]> {
  const ids = transactions.map(() => uuidv4());
  const timestamped = transactions.map((t, i) => ({
    ...t,
    id: ids[i]!,
    created_at: new Date(),
  }));
  await db.transactions.bulkAdd(timestamped);
  return ids;
}

export async function getTransactionsByPeriod(
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  return db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function getTransactionsByMerchant(
  merchantId: string
): Promise<Transaction[]> {
  return db.transactions.where('merchant_id').equals(merchantId).toArray();
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

// ==================== MERCHANTS ====================

export async function addMerchant(
  merchant: Omit<Merchant, 'id' | 'created_at'>
): Promise<string> {
  const id = uuidv4();
  await db.merchants.add({
    ...merchant,
    id,
    created_at: new Date(),
  });
  return id;
}

export async function getMerchant(id: string): Promise<Merchant | undefined> {
  return db.merchants.get(id);
}

export async function getMerchantByName(
  name: string
): Promise<Merchant | undefined> {
  return db.merchants.where('name').equals(name).first();
}

export async function getAllMerchants(): Promise<Merchant[]> {
  return db.merchants.orderBy('total_spent').reverse().toArray();
}

export async function updateMerchant(
  id: string,
  updates: Partial<Merchant>
): Promise<void> {
  await db.merchants.update(id, updates);
}

// ==================== MAPPINGS ====================

export async function addMapping(
  mapping: Omit<MerchantMapping, 'created_at'>
): Promise<void> {
  await db.mappings.add({
    ...mapping,
    created_at: new Date(),
  });
}

export async function getMapping(
  rawName: string
): Promise<MerchantMapping | undefined> {
  return db.mappings.get(rawName);
}

export async function getAllMappings(): Promise<MerchantMapping[]> {
  return db.mappings.toArray();
}

export async function updateMapping(
  rawName: string,
  updates: Partial<MerchantMapping>
): Promise<void> {
  await db.mappings.update(rawName, updates);
}

// ==================== CATEGORIES ====================

export async function addCategory(
  category: Omit<Category, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date();
  await db.categories.add({
    ...category,
    id,
    created_at: now,
    updated_at: now,
  });
  return id;
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('total_amount').reverse().toArray();
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<void> {
  await db.categories.update(id, {
    ...updates,
    updated_at: new Date(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// ==================== INSIGHTS ====================

export async function addInsight(
  insight: Omit<Insight, 'id' | 'created_at'>
): Promise<string> {
  const id = uuidv4();
  await db.insights.add({
    ...insight,
    id,
    created_at: new Date(),
  });
  return id;
}

export async function getInsightsByPeriod(period: string): Promise<Insight[]> {
  return db.insights
    .where('period')
    .equals(period)
    .and((i) => !i.dismissed)
    .sortBy('priority');
}

export async function getAllInsights(): Promise<Insight[]> {
  return db.insights.orderBy('created_at').reverse().toArray();
}

export async function dismissInsight(id: string): Promise<void> {
  await db.insights.update(id, { dismissed: true });
}

export async function deleteInsight(id: string): Promise<void> {
  await db.insights.delete(id);
}

// ==================== CHAT SESSIONS ====================

export async function addChatSession(
  session: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date();
  await db.chatSessions.add({
    ...session,
    id,
    created_at: now,
    updated_at: now,
  });
  return id;
}

export async function getChatSession(
  id: string
): Promise<ChatSession | undefined> {
  return db.chatSessions.get(id);
}

export async function updateChatSession(
  id: string,
  updates: Partial<ChatSession>
): Promise<void> {
  await db.chatSessions.update(id, {
    ...updates,
    updated_at: new Date(),
  });
}

export async function getLatestChatSession(): Promise<ChatSession | undefined> {
  return db.chatSessions.orderBy('updated_at').reverse().first();
}

export async function deleteChatSession(id: string): Promise<void> {
  await db.chatSessions.delete(id);
}

// ==================== UTILITY ====================

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.transactions.clear(),
    db.merchants.clear(),
    db.mappings.clear(),
    db.categories.clear(),
    db.insights.clear(),
    db.chatSessions.clear(),
  ]);
}

export async function exportData() {
  const data = {
    transactions: await db.transactions.toArray(),
    merchants: await db.merchants.toArray(),
    mappings: await db.mappings.toArray(),
    categories: await db.categories.toArray(),
    insights: await db.insights.toArray(),
    chatSessions: await db.chatSessions.toArray(),
  };
  return data;
}
