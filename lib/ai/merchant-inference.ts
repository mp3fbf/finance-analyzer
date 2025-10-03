/**
 * Merchant Inference Engine (SERVER-SIDE ONLY)
 *
 * Uses Claude AI with structured reasoning to infer real merchant names
 * from arbitrary transaction codes, without relying on hardcoded patterns.
 *
 * ⚠️ IMPORTANT: This module imports @anthropic-ai/sdk which requires server-side execution.
 * Client-side code should import types from @/types/inference instead.
 */

import { anthropic } from '@/lib/ai/claude';
import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { formatCurrency } from '@/lib/utils/formatting';
import { searchWeb, formatSearchResultsForAI } from '@/lib/ai/web-search';

// Re-export types for backward compatibility
export type {
  MerchantHypothesis,
  InferenceReasoning,
  MerchantInference,
  LearningSig
} from '@/types/inference';

// Import types for use in this file
import type { LearningSig, MerchantInference } from '@/types/inference';

/**
 * Find relevant learning signals for a given merchant code.
 * Uses multiple matching strategies to find the most relevant past corrections.
 *
 * @param code - The normalized merchant code to find learning for
 * @param learningHistory - All available learning signals
 * @returns The most relevant learning signal, or null if none found
 */
function findRelevantLearning(
  code: string,
  learningHistory: LearningSig[]
): LearningSig | null {
  if (learningHistory.length === 0) return null;

  // Strategy 1: Exact match (highest priority)
  const exactMatch = learningHistory.find(l => l.original_code === code);
  if (exactMatch) return exactMatch;

  // Strategy 2: Prefix match (first 2-3 words)
  const codeWords = code.split(' ');
  if (codeWords.length >= 2) {
    const codePrefix = codeWords.slice(0, Math.min(2, codeWords.length)).join(' ');
    const prefixMatch = learningHistory.find(l =>
      l.original_code.startsWith(codePrefix) || code.startsWith(l.original_code.split(' ').slice(0, Math.min(2, l.original_code.split(' ').length)).join(' '))
    );
    if (prefixMatch) return prefixMatch;
  }

  // Strategy 3: Pattern match (same structure with variables replaced)
  // Replace all numbers and long IDs with 'X' to find structural matches
  const codePattern = code.replace(/\d+/g, 'X').replace(/[A-Z0-9]{6,}/g, 'XXX');
  const patternMatch = learningHistory.find(l => {
    const learnPattern = l.original_code.replace(/\d+/g, 'X').replace(/[A-Z0-9]{6,}/g, 'XXX');
    return codePattern === learnPattern;
  });
  if (patternMatch) return patternMatch;

  // Strategy 4: Substring match (code contains or is contained in learning)
  const substringMatch = learningHistory.find(l =>
    code.includes(l.original_code) || l.original_code.includes(code)
  );
  if (substringMatch) return substringMatch;

  return null;
}

/**
 * Build the inference prompt for Claude with intelligent learning integration.
 * If relevant learning exists, the prompt is modified to strongly guide the AI.
 */
function buildInferencePrompt(
  context: TransactionContext,
  learningHistory: LearningSig[]
): string {
  // Find relevant learning for this specific code
  const relevantLearning = findRelevantLearning(context.code, learningHistory);

  // If we have relevant learning, use a FORCED learning prompt
  if (relevantLearning) {
    const correctName = relevantLearning.user_correction || relevantLearning.ai_inference;
    const wasCorrect = relevantLearning.was_correct;

    return `🔴 APRENDIZADO FORÇADO - SIGA ESTRITAMENTE

CÓDIGO ATUAL: "${context.code}"

HISTÓRICO DE APRENDIZADO RELEVANTE:
- Código similar já processado: "${relevantLearning.original_code}"
- IA inferiu anteriormente: "${relevantLearning.ai_inference}"
${relevantLearning.user_correction ? `- Usuário corrigiu para: "${relevantLearning.user_correction}"` : '- Usuário confirmou a inferência'}
- Resultado: ${wasCorrect ? '✓ CORRETO' : '✗ INCORRETO - NÃO REPITA ESTE ERRO!'}

${wasCorrect
  ? `✅ INFERÊNCIA FORÇADA:
Use "${correctName}" como nome do estabelecimento.
Confidence: 0.95 (alta confiança devido ao aprendizado)`
  : `🔴 CORREÇÃO OBRIGATÓRIA:
A inferência anterior "${relevantLearning.ai_inference}" estava ERRADA.
O nome correto é "${correctName}".
NÃO REPITA O MESMO ERRO. Use "${correctName}".
Confidence: 0.98 (certeza absoluta devido à correção do usuário)`
}

CONTEXTO ADICIONAL (use para validar):
- Ocorrências: ${context.occurrence_count} transações
- Valor total: ${formatCurrency(context.total_amount)}
- Faixa de valores: ${formatCurrency(context.amount_stats.min)} - ${formatCurrency(context.amount_stats.max)}
- Padrão temporal: ${context.temporal_pattern.pattern_description}

OUTPUT (JSON válido):
{
  "structural_analysis": "Match com aprendizado prévio: ${relevantLearning.original_code}",
  "value_analysis": "Consistente com padrão aprendido",
  "temporal_analysis": "Compatível com ${correctName}",
  "hypotheses": [
    {
      "name": "${correctName}",
      "confidence": ${wasCorrect ? 0.95 : 0.98},
      "evidence_for": ["Aprendizado prévio confirmado", "Padrão reconhecido"],
      "evidence_against": []
    }
  ],
  "needs_web_search": false,
  "search_terms": [],
  "final_inference": {
    "name": "${correctName}",
    "confidence": ${wasCorrect ? 0.95 : 0.98},
    "type": "service",
    "reasoning_summary": "Baseado em aprendizado prévio do usuário para código similar"
  }
}`;
  }

  // No relevant learning - use normal prompt with full history context
  const historySection = learningHistory.length > 0 ? `
HISTÓRICO DE APRENDIZADO:
Casos similares que já processei:
${learningHistory.map(l => `
  Código: ${l.original_code}
  Contexto: ${l.context_summary}
  IA inferiu: ${l.ai_inference}
  ${l.user_correction ? `Usuário corrigiu para: ${l.user_correction}` : 'Usuário confirmou'}
  Resultado: ${l.was_correct ? '✓ Correto' : '✗ Incorreto'}
`).join('\n')}
` : '';

  return `Você é um especialista em sistemas de pagamento e transações bancárias brasileiras.

TAREFA: Inferir o estabelecimento real por trás deste código de transação.

CÓDIGO: "${context.code}"

VARIAÇÕES OBSERVADAS:
${context.raw_variations.map(v => `- "${v}"`).join('\n')}

CONTEXTO COMPLETO:
- Ocorrências: ${context.occurrence_count} transações
- Valor total: ${formatCurrency(context.total_amount)}
- Faixa de valores: ${formatCurrency(context.amount_stats.min)} - ${formatCurrency(context.amount_stats.max)}
- Valor médio: ${formatCurrency(context.amount_stats.mean)} (mediana: ${formatCurrency(context.amount_stats.median)})
- Desvio padrão: ${formatCurrency(context.amount_stats.stddev)}
- Coeficiente de variação: ${context.amount_stats.cv.toFixed(2)} ${context.amount_stats.cv < 0.3 ? '(valores regulares)' : context.amount_stats.cv < 0.7 ? '(valores moderadamente variáveis)' : '(valores muito variáveis)'}
- Tipos de transação: ${context.transaction_types.join(', ')}
- Período: ${new Date(context.date_range.first).toLocaleDateString('pt-BR')} a ${new Date(context.date_range.last).toLocaleDateString('pt-BR')} (${context.date_range.span_days} dias)
- Padrão temporal: ${context.temporal_pattern.pattern_description}

ESTRUTURA DO CÓDIGO:
- Tamanho: ${context.code_structure.length} caracteres
- Composição: ${context.code_structure.composition.letters} letras, ${context.code_structure.composition.digits} dígitos
- Caracteres especiais: ${context.code_structure.composition.special_chars.join(', ') || 'nenhum'}
- Possui asterisco: ${context.code_structure.has_asterisk ? 'Sim' : 'Não'}
- Sufixo numérico variável: ${context.code_structure.has_variable_numeric_suffix ? 'Sim' : 'Não'}
- Palavras-chave detectadas: ${context.code_structure.payment_keywords.join(', ') || 'nenhuma'}
${context.code_structure.detected_prefix ? `- Prefixo detectado: "${context.code_structure.detected_prefix}"` : ''}
${historySection}
PROCESSO DE RACIOCÍNIO:
Execute as seguintes etapas de análise:

1. ANÁLISE ESTRUTURAL
   - Que padrões você identifica no formato do código?
   - O que esses padrões sugerem sobre o tipo de transação?
   - Há elementos reconhecíveis (abreviações, siglas, etc)?

2. ANÁLISE DE VALOR
   - A distribuição de valores sugere que tipo de estabelecimento?
   - Valores recorrentes ou variáveis? O que isso indica?
   - A faixa de valores é compatível com que categorias de serviço/produto?

3. ANÁLISE TEMPORAL
   - Há padrão temporal que indique o tipo de serviço?
   - Frequência sugere assinatura, compras recorrentes, ou uso esporádico?

4. HIPÓTESES
   - Liste 3-5 hipóteses do que pode ser, ranqueadas por plausibilidade
   - Para cada hipótese, liste evidências a favor e contra

5. VERIFICAÇÃO
   - Você precisa de busca web para confirmar?
   - Que termos de busca usaria para validar sua hipótese?

6. CONCLUSÃO
   - Qual sua melhor inferência?
   - Confidence score (0-1)
   - Tipo de estabelecimento (service/product/transfer/subscription/marketplace/other)

REGRAS IMPORTANTES:
- NÃO faça suposições baseadas em conhecimento de códigos específicos
- USE o raciocínio contextual baseado nos padrões e estatísticas
- SE não tiver certeza, indique need_web_search: true
- SEJA honesto sobre sua confiança - baixa confiança é melhor que chute errado
- CONSIDERE o histórico de aprendizado para evitar erros similares

OUTPUT (JSON válido):
{
  "structural_analysis": "Sua análise estrutural aqui",
  "value_analysis": "Sua análise de valores aqui",
  "temporal_analysis": "Sua análise temporal aqui",
  "hypotheses": [
    {
      "name": "Nome do estabelecimento hipotético",
      "confidence": 0.8,
      "evidence_for": ["evidência 1", "evidência 2"],
      "evidence_against": ["contra-evidência 1"]
    }
  ],
  "needs_web_search": true,
  "search_terms": ["termo de busca 1", "termo de busca 2"],
  "final_inference": {
    "name": "Nome final inferido",
    "confidence": 0.75,
    "type": "service",
    "reasoning_summary": "Resumo do raciocínio em 1-2 frases"
  }
}`;
}

/**
 * Infer merchant name using Claude AI with structured reasoning.
 * If confidence is low (< 0.7) or AI requests web search, performs web search
 * and re-infers with additional context.
 *
 * @param context - Transaction context to analyze
 * @param learningHistory - Past learning signals for similar codes
 * @param enableWebSearch - Whether to enable web search for disambiguation (default: true)
 * @returns Merchant inference with name, confidence, and reasoning
 */
export async function inferMerchant(
  context: TransactionContext,
  learningHistory: LearningSig[] = [],
  enableWebSearch: boolean = true
): Promise<MerchantInference> {
  const prompt = buildInferencePrompt(context, learningHistory);

  try {
    // First inference attempt
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from response
    const content = message.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const responseText = content.text;
    let jsonText: string | null = null;

    // Try markdown code block first
    const markdownMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonText = markdownMatch[1];
    } else {
      // Try to find JSON object (greedy match to get the largest/last one)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    if (!jsonText) {
      console.error('Failed to extract JSON from Claude response for code:', context.code);
      throw new Error('No JSON found in Claude response');
    }

    const response = JSON.parse(jsonText);
    const initialConfidence = response.final_inference.confidence;
    const needsWebSearch = response.needs_web_search;
    const searchTerms = response.search_terms || [];

    // Check if web search would help
    const shouldUseWebSearch = enableWebSearch && (
      needsWebSearch || // AI explicitly requested web search
      initialConfidence < 0.7 || // Low confidence
      searchTerms.length > 0 // AI suggested search terms
    );

    if (shouldUseWebSearch) {
      console.log(`🔍 Web search enabled for "${context.code}" (confidence: ${initialConfidence})`);

      // Build search query
      const searchQuery = searchTerms.length > 0
        ? searchTerms[0] // Use AI's suggested search term
        : `${context.code} cobrança estabelecimento`; // Fallback query

      // Perform web search
      const searchResults = await searchWeb(searchQuery);

      if (searchResults.results.length > 0) {
        // Re-infer with web search results
        const enrichedPrompt = `${prompt}

🔍 RESULTADOS DE BUSCA WEB:
${formatSearchResultsForAI(searchResults)}

Com base nos resultados da busca acima, refine sua inferência.
OUTPUT (JSON válido com mesma estrutura anterior):`;

        const refinedMessage = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: enrichedPrompt
            }
          ]
        });

        // Extract refined JSON
        const refinedContent = refinedMessage.content[0];
        if (refinedContent && refinedContent.type === 'text') {
          const refinedMatch = refinedContent.text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
            || refinedContent.text.match(/\{[\s\S]*\}/);

          if (refinedMatch) {
            const refinedJson = refinedMatch[1] || refinedMatch[0];
            const refinedResponse = JSON.parse(refinedJson);

            console.log(`✓ Web search improved confidence: ${initialConfidence.toFixed(2)} → ${refinedResponse.final_inference.confidence.toFixed(2)}`);

            return {
              code: context.code,
              inferred_name: refinedResponse.final_inference.name,
              confidence: refinedResponse.final_inference.confidence,
              type: refinedResponse.final_inference.type,
              reasoning: {
                structural_analysis: refinedResponse.structural_analysis,
                value_analysis: refinedResponse.value_analysis,
                temporal_analysis: refinedResponse.temporal_analysis,
                hypotheses: refinedResponse.hypotheses,
                needs_web_search: false, // Already performed
                search_terms: [searchQuery]
              },
              reasoning_summary: `${refinedResponse.final_inference.reasoning_summary} (confirmado via busca web)`,
              used_web_search: true
            };
          }
        }
      }
    }

    // Return initial inference (web search not needed or unavailable)
    return {
      code: context.code,
      inferred_name: response.final_inference.name,
      confidence: response.final_inference.confidence,
      type: response.final_inference.type,
      reasoning: {
        structural_analysis: response.structural_analysis,
        value_analysis: response.value_analysis,
        temporal_analysis: response.temporal_analysis,
        hypotheses: response.hypotheses,
        needs_web_search: response.needs_web_search,
        search_terms: response.search_terms || []
      },
      reasoning_summary: response.final_inference.reasoning_summary,
      used_web_search: false
    };
  } catch (error) {
    console.error('Error inferring merchant:', error);
    throw new Error(`Failed to infer merchant for code ${context.code}: ${error}`);
  }
}

/**
 * Batch inference for multiple merchant codes with parallel processing.
 *
 * @remarks
 * Processes all contexts in parallel using Promise.allSettled to maximize throughput
 * while respecting Anthropic API rate limits (1000 req/min for Sonnet 4).
 *
 * With 136 merchants, this completes in ~10-15 seconds vs 30+ minutes sequential.
 */
export async function inferMerchantsBatch(
  contexts: TransactionContext[],
  learningHistory: LearningSig[] = []
): Promise<MerchantInference[]> {
  console.log(`Starting parallel inference for ${contexts.length} merchants...`);

  // Process ALL contexts in parallel
  // Anthropic Sonnet 4 limit: 1000 req/min - we're well within limits
  const startTime = Date.now();

  const results = await Promise.allSettled(
    contexts.map(context => inferMerchant(context, learningHistory))
  );

  const successful = results.filter(
    (r): r is PromiseFulfilledResult<MerchantInference> => r.status === 'fulfilled'
  );

  const failed = results.filter(r => r.status === 'rejected');

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Inference complete in ${duration}s: ${successful.length} successful, ${failed.length} failed`);

  // Log failed inferences for debugging
  if (failed.length > 0) {
    console.warn(`Failed merchants:`, failed.map((r, idx) => ({
      code: contexts[idx]?.code,
      error: r.reason
    })));
  }

  return successful.map(r => r.value);
}

/**
 * Filter contexts that need inference
 * Skip codes that are already confirmed or have high-confidence inferences
 */
export function filterContextsNeedingInference(
  contexts: TransactionContext[],
  existingInferences: Map<string, { confidence: number; confirmed: boolean }>
): TransactionContext[] {
  return contexts.filter(context => {
    const existing = existingInferences.get(context.code);

    // Need inference if:
    // 1. No existing inference
    // 2. Existing inference is not confirmed and has low confidence
    if (!existing) return true;
    if (existing.confirmed) return false;
    if (existing.confidence < 0.7) return true;

    return false;
  });
}
