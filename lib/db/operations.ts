import { v4 as uuidv4 } from 'uuid';
import { db } from './schema';
import { Transaction } from '@/types/transaction';
import { Merchant, MerchantMapping } from '@/types/merchant';
import { Category } from '@/types/category';
import { Insight } from '@/types/insight';
import { ChatSession } from '@/types/chat';
import { MerchantDiscovery, DiscoveryLearning, DiscoveryStatus } from '@/types/discovery';

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

/**
 * Adds multiple transactions to the database in a single batch operation.
 * @param transactions - Array of transactions without id and created_at
 * @returns Array of generated transaction IDs
 * @throws Error if transactions array is empty or database operation fails
 */
export async function addTransactions(
  transactions: Omit<Transaction, 'id' | 'created_at'>[]
): Promise<string[]> {
  if (!transactions || transactions.length === 0) {
    throw new Error('Cannot add empty transactions array');
  }

  try {
    const timestamped = transactions.map((t) => ({
      id: uuidv4(),
      ...t,
      created_at: new Date(),
    }));
    await db.transactions.bulkAdd(timestamped);
    return timestamped.map((t) => t.id);
  } catch (error) {
    console.error('Failed to add transactions:', error);
    throw new Error(
      `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  const normalizedName = name.toLowerCase().trim();
  return db.merchants
    .where('name')
    .equalsIgnoreCase(normalizedName)
    .first();
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

// ==================== MERCHANT DISCOVERY ====================

/**
 * Add a new merchant discovery record
 */
export async function addMerchantDiscovery(
  discovery: Omit<MerchantDiscovery, 'id' | 'created_at'>
): Promise<number> {
  const id = await db.merchantDiscovery.add({
    ...discovery,
    created_at: new Date(),
  });
  return id;
}

/**
 * Get all pending merchant discoveries, sorted by impact score
 */
export async function getPendingDiscoveries(): Promise<MerchantDiscovery[]> {
  return db.merchantDiscovery
    .where('status')
    .equals('pending')
    .reverse()
    .sortBy('impact_score');
}

/**
 * Get a specific merchant discovery by ID
 */
export async function getDiscoveryById(id: number): Promise<MerchantDiscovery | undefined> {
  return db.merchantDiscovery.get(id);
}

/**
 * Get discovery by raw code
 */
export async function getDiscoveryByCode(code: string): Promise<MerchantDiscovery | undefined> {
  return db.merchantDiscovery.where('raw_code').equals(code).first();
}

/**
 * Update discovery status and user feedback
 */
export async function updateDiscoveryStatus(
  id: number,
  status: DiscoveryStatus,
  userValidatedName?: string,
  userFeedbackNotes?: string
): Promise<void> {
  await db.merchantDiscovery.update(id, {
    status,
    user_validated_name: userValidatedName,
    user_feedback_notes: userFeedbackNotes,
    validated_at: new Date(),
  });
}

/**
 * Confirm a discovery (user agrees with AI inference)
 */
export async function confirmDiscovery(id: number): Promise<void> {
  await updateDiscoveryStatus(id, 'confirmed');
}

/**
 * Correct a discovery (user provides the right name)
 */
export async function correctDiscovery(
  id: number,
  correctedName: string,
  notes?: string
): Promise<void> {
  await updateDiscoveryStatus(id, 'corrected', correctedName, notes);
}

/**
 * Reject a discovery (cannot be determined)
 */
export async function rejectDiscovery(id: number, notes?: string): Promise<void> {
  await updateDiscoveryStatus(id, 'rejected', undefined, notes);
}

/**
 * Get all validated discoveries (confirmed or corrected)
 */
export async function getValidatedDiscoveries(): Promise<MerchantDiscovery[]> {
  return db.merchantDiscovery
    .where('status')
    .anyOf(['confirmed', 'corrected'])
    .toArray();
}

/**
 * Get discovery statistics
 */
export async function getDiscoveryStats(): Promise<{
  total: number;
  pending: number;
  confirmed: number;
  corrected: number;
  rejected: number;
  accuracy: number;
}> {
  const all = await db.merchantDiscovery.toArray();
  const pending = all.filter(d => d.status === 'pending').length;
  const confirmed = all.filter(d => d.status === 'confirmed').length;
  const corrected = all.filter(d => d.status === 'corrected').length;
  const rejected = all.filter(d => d.status === 'rejected').length;
  const validated = confirmed + corrected;
  const accuracy = validated > 0 ? (confirmed / validated) * 100 : 0;

  return {
    total: all.length,
    pending,
    confirmed,
    corrected,
    rejected,
    accuracy,
  };
}

// ==================== DISCOVERY LEARNING ====================

/**
 * Add a learning record from user feedback
 */
export async function addDiscoveryLearning(
  learning: Omit<DiscoveryLearning, 'id' | 'created_at'>
): Promise<number> {
  const id = await db.discoveryLearning.add({
    ...learning,
    created_at: new Date(),
  });
  return id;
}

/**
 * Get learning history for similar patterns
 */
export async function getLearningByPattern(
  patternSignature: string
): Promise<DiscoveryLearning[]> {
  return db.discoveryLearning
    .where('pattern_signature')
    .equals(patternSignature)
    .toArray();
}

/**
 * Get all learning records, most recent first
 */
export async function getAllLearning(): Promise<DiscoveryLearning[]> {
  return db.discoveryLearning.orderBy('created_at').reverse().toArray();
}

/**
 * Get learning records for codes with similar prefixes
 */
export async function getLearningBySimilarCodes(codePrefix: string): Promise<DiscoveryLearning[]> {
  const all = await db.discoveryLearning.toArray();
  return all.filter(l => l.original_code.startsWith(codePrefix));
}

// ==================== UTILITY ====================

/**
 * Clears all data from all tables in the database.
 * WARNING: This action is irreversible.
 * @throws Error if database operation fails
 */
export async function clearAllData(): Promise<void> {
  try {
    await Promise.all([
      db.transactions.clear(),
      db.merchants.clear(),
      db.mappings.clear(),
      db.categories.clear(),
      db.insights.clear(),
      db.chatSessions.clear(),
      db.merchantDiscovery.clear(),
      db.discoveryLearning.clear(),
    ]);
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw new Error(
      `Database clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Exports all data from the database as a consistent snapshot.
 * Uses a read transaction to ensure data consistency during export.
 * @returns Object containing all tables data
 * @throws Error if database operation fails
 */
export async function exportData(): Promise<{
  transactions: Transaction[];
  merchants: Merchant[];
  mappings: MerchantMapping[];
  categories: Category[];
  insights: Insight[];
  chatSessions: ChatSession[];
  merchantDiscovery: MerchantDiscovery[];
  discoveryLearning: DiscoveryLearning[];
}> {
  try {
    return await db.transaction('r', [
      db.transactions,
      db.merchants,
      db.mappings,
      db.categories,
      db.insights,
      db.chatSessions,
      db.merchantDiscovery,
      db.discoveryLearning,
    ], async () => {
      return {
        transactions: await db.transactions.toArray(),
        merchants: await db.merchants.toArray(),
        mappings: await db.mappings.toArray(),
        categories: await db.categories.toArray(),
        insights: await db.insights.toArray(),
        chatSessions: await db.chatSessions.toArray(),
        merchantDiscovery: await db.merchantDiscovery.toArray(),
        discoveryLearning: await db.discoveryLearning.toArray(),
      };
    });
  } catch (error) {
    console.error('Failed to export data:', error);
    throw new Error(
      `Database export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
