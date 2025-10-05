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
  // Summarize transactions by merchant to reduce payload size
  const merchantSummary = merchants
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 30) // Top 30 merchants only
    .map(m => ({
      name: m.name,
      total_spent: m.total_spent,
      transaction_count: m.transaction_count,
    }));

  // Create a map of transaction IDs by merchant for reference
  const transactionsByMerchant = new Map<string, string[]>();
  transactions.forEach(t => {
    if (t.merchant_id) {
      if (!transactionsByMerchant.has(t.merchant_id)) {
        transactionsByMerchant.set(t.merchant_id, []);
      }
      transactionsByMerchant.get(t.merchant_id)!.push(t.id);
    }
  });

  const prompt = `Analise estes dados financeiros e sugira 5-8 agrupamentos contextuais inteligentes.

RESUMO DOS DADOS:
- Total de transações: ${transactions.length}
- Total gasto: R$ ${transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0).toFixed(2)}
- Período: ${new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))).toLocaleDateString('pt-BR')} a ${new Date(Math.max(...transactions.map(t => new Date(t.date).getTime()))).toLocaleDateString('pt-BR')}

TOP 30 ESTABELECIMENTOS (por valor total):
${JSON.stringify(merchantSummary, null, 2)}

REGRAS IMPORTANTES:
1. ❌ NÃO use categorias genéricas (alimentação, transporte, entretenimento)
2. ✅ Busque padrões de comportamento (horários, valores acumulados, frequência)
3. ✅ Separe estabelecimentos com alto valor acumulado individualmente (ex: "iFood", "Rappi", "Uber")
4. ✅ Identifique contextos específicos (trabalho, família, pessoal, lazer)
5. ✅ Detecte tipos específicos (assinaturas digitais, delivery noturno, compras impulsivas)
6. ✅ Agrupe merchants similares (ex: todos os streamings, todas as farmacias)

IMPORTANTE: Para cada categoria, você DEVE incluir os nomes EXATOS dos merchants que pertencem a ela (use os nomes da lista acima).

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações):
{
  "categories": [
    {
      "name": "Nome específico e descritivo",
      "description": "Por que agrupei assim (padrão detectado, contexto)",
      "merchant_names": ["Nome Exato 1", "Nome Exato 2"],
      "estimated_total": 1234.56,
      "insights": ["Insight sobre padrão", "Insight sobre impacto"]
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

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = textContent.text;
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonText = codeBlockMatch[1];
  } else {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch || !jsonMatch[0]) {
      throw new Error('No JSON found in Claude response');
    }
    jsonText = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonText);

  // Validate response shape
  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error('Invalid Claude response: missing or malformed "categories" array');
  }

  // Create merchant name -> ID lookup
  const merchantNameToId = new Map<string, string>();
  merchants.forEach(m => {
    merchantNameToId.set(m.name.toLowerCase(), m.id);
  });

  // Map merchant_names back to transaction_ids
  const result: CategorySuggestion[] = [];

  for (const cat of parsed.categories) {
    // Validation: Non-empty name
    if (typeof cat.name !== 'string' || !cat.name.trim()) {
      console.warn('Skipping invalid category: missing name');
      continue;
    }

    // Validation: No generic category names
    const genericCategories = [
      'alimentação', 'transporte', 'entretenimento', 'saúde',
      'educação', 'compras', 'lazer', 'outros', 'diversos'
    ];
    if (genericCategories.some(generic => cat.name.toLowerCase().includes(generic))) {
      console.warn(`Skipping generic category "${cat.name}" - violates contextual grouping rule`);
      continue;
    }

    // Validation: Merchant names array exists
    if (!Array.isArray(cat.merchant_names) || cat.merchant_names.length === 0) {
      console.warn(`Skipping category "${cat.name}": missing or empty merchant_names`);
      continue;
    }

    // Validation: Total amount is a finite number
    if (typeof cat.estimated_total === 'number' && !isFinite(cat.estimated_total)) {
      console.warn(`Skipping category "${cat.name}": invalid estimated_total`);
      continue;
    }

    // Find all transaction IDs for the merchants in this category
    const transaction_ids: string[] = [];
    let total_amount = 0;

    for (const merchantName of cat.merchant_names) {
      // Normalize names for matching
      const normalizedSearchName = merchantName.toLowerCase().trim();

      // Find merchant with strict word boundary matching
      const merchant = merchants.find(m => {
        const normalizedMerchantName = m.name.toLowerCase().trim();

        // Exact match (best case)
        if (normalizedMerchantName === normalizedSearchName) {
          return true;
        }

        // Word boundary match (prevents partial word matches)
        // e.g., "Uber" matches "Uber Eats" but not "Uberaba Store"
        const wordBoundaryPattern = new RegExp(`\\b${normalizedSearchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        return wordBoundaryPattern.test(normalizedMerchantName);
      });

      if (merchant) {
        // Find all transactions for this merchant
        const txs = transactions.filter(t => t.merchant_id === merchant.id);
        transaction_ids.push(...txs.map(t => t.id));
        total_amount += txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      } else {
        console.warn(`Could not match merchant name "${merchantName}" to any existing merchant`);
      }
    }

    result.push({
      name: cat.name,
      description: cat.description || 'Categoria gerada automaticamente',
      transaction_ids,
      total_amount,
      insights: Array.isArray(cat.insights) ? cat.insights : [],
    });
  }

  return result;
}
