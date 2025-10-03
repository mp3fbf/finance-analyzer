import { anthropic, MODELS } from './claude';
import { Transaction } from '@/types/transaction';
import { Merchant } from '@/types/merchant';

export interface CategorySuggestion {
  name: string;
  description: string;
  transaction_ids: string[];
  total_amount: number;
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
  return parsed.categories;
}
