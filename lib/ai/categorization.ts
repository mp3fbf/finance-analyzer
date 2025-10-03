import { anthropic, MODELS } from './claude';
import { Transaction } from '@/types/transaction';
import { Merchant } from '@/types/merchant';

/**
 * AI-generated category suggestion with contextual grouping.
 *
 * This interface represents a behavior-based category created by analyzing
 * transaction patterns, NOT generic categories like "food" or "transport".
 */
export interface CategorySuggestion {
  /** Descriptive, specific category name (e.g., "Late Night Delivery", "Work Commute Uber") */
  name: string;
  /** Explanation of why transactions were grouped together (context, detected pattern) */
  description: string;
  /** Array of transaction IDs belonging to this category */
  transaction_ids: string[];
  /** Total accumulated amount for all transactions in this category */
  total_amount: number;
  /** Array of insights about spending patterns and impact */
  insights: string[];
}

/**
 * Categorizes transactions using AI to create contextual, behavior-based groupings.
 *
 * IMPORTANT: This function enforces dynamic categorization based on spending patterns,
 * NOT generic categories like "food" or "transport". It detects behavioral contexts
 * such as time patterns, merchant significance, and spending habits.
 *
 * @param transactions - Array of all transactions to analyze
 * @param merchants - Array of consolidated merchant data
 * @returns Array of contextual category suggestions with insights
 * @throws Error if Claude API call fails or response parsing fails
 */
export async function categorizeTransactions(
  transactions: Transaction[],
  merchants: Merchant[]
): Promise<CategorySuggestion[]> {
  const prompt = `Analise estas transações e sugira agrupamentos contextuais inteligentes:

TRANSAÇÕES:
${JSON.stringify(
  transactions.map((t) => ({
    id: t.id,
    date: t.date,
    time: t.time,
    description: t.description,
    amount: t.amount,
    type: t.type,
  })),
  null,
  2
)}

ESTABELECIMENTOS (consolidados):
${JSON.stringify(
  merchants.map((m) => ({
    name: m.name,
    total_spent: m.total_spent,
    transaction_count: m.transaction_count,
  })),
  null,
  2
)}

REGRAS IMPORTANTES:
1. NÃO use categorias genéricas (alimentação, transporte)
2. Busque padrões de comportamento (horários, valores, frequência)
3. Separe estabelecimentos com alto valor acumulado individualmente
4. Identifique contextos (trabalho, família, pessoal, lazer)
5. Detecte tipos específicos (assinaturas, delivery, impulso)

Output em JSON:
{
  "categories": [
    {
      "name": "Nome descritivo e específico",
      "description": "Por que agrupei assim (contexto, padrão detectado)",
      "transaction_ids": ["id1", "id2"],
      "total_amount": 1234.56,
      "insights": [
        "Insight 1 sobre o padrão",
        "Insight 2 sobre impacto"
      ]
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate response shape before returning
  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error('Invalid Claude response: missing or malformed "categories" array');
  }

  // Validate each category has required fields with correct types
  for (const cat of parsed.categories) {
    if (typeof cat.name !== 'string' || !cat.name.trim()) {
      throw new Error('Invalid category: "name" must be a non-empty string');
    }
    if (typeof cat.description !== 'string' || !cat.description.trim()) {
      throw new Error('Invalid category: "description" must be a non-empty string');
    }
    if (!Array.isArray(cat.transaction_ids)) {
      throw new Error('Invalid category: "transaction_ids" must be an array');
    }
    if (typeof cat.total_amount !== 'number' || isNaN(cat.total_amount)) {
      throw new Error('Invalid category: "total_amount" must be a valid number');
    }
    if (!Array.isArray(cat.insights)) {
      throw new Error('Invalid category: "insights" must be an array');
    }
  }

  return parsed.categories;
}
