/**
 * Merchant Inference Engine
 *
 * Uses Claude AI with structured reasoning to infer real merchant names
 * from arbitrary transaction codes, without relying on hardcoded patterns.
 */

import { anthropic } from '@/lib/ai/claude';
import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { formatCurrency } from '@/lib/utils/formatting';

/**
 * A hypothesis about what a merchant code might represent
 */
export interface MerchantHypothesis {
  name: string;
  confidence: number;
  evidence_for: string[];
  evidence_against: string[];
}

/**
 * Structured reasoning output from AI
 */
export interface InferenceReasoning {
  structural_analysis: string;
  value_analysis: string;
  temporal_analysis: string;
  hypotheses: MerchantHypothesis[];
  needs_web_search: boolean;
  search_terms: string[];
}

/**
 * Final inference result
 */
export interface MerchantInference {
  code: string;
  inferred_name: string;
  confidence: number;
  type: 'service' | 'product' | 'transfer' | 'subscription' | 'marketplace' | 'other';
  reasoning: InferenceReasoning;
  reasoning_summary: string;
  used_web_search: boolean;
}

/**
 * Learning signal from previous validations
 */
export interface LearningSig {
  original_code: string;
  context_summary: string;
  ai_inference: string;
  user_correction: string | null;
  was_correct: boolean;
}

/**
 * Build the inference prompt for Claude
 */
function buildInferencePrompt(
  context: TransactionContext,
  learningHistory: LearningSig[]
): string {
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
- Período: ${context.date_range.first.toLocaleDateString('pt-BR')} a ${context.date_range.last.toLocaleDateString('pt-BR')} (${context.date_range.span_days} dias)
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
 * Infer merchant name using Claude AI with structured reasoning
 */
export async function inferMerchant(
  context: TransactionContext,
  learningHistory: LearningSig[] = []
): Promise<MerchantInference> {
  const prompt = buildInferencePrompt(context, learningHistory);

  try {
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

    // Parse JSON response - use non-greedy match to get the last JSON object
    // Claude typically puts the JSON at the end of the response
    const jsonMatch = content.text.match(/\{[\s\S]*?\}(?=\s*$)/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const response = JSON.parse(jsonMatch[0]);

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
      used_web_search: false // Will be updated if web search is performed
    };
  } catch (error) {
    console.error('Error inferring merchant:', error);
    throw new Error(`Failed to infer merchant for code ${context.code}: ${error}`);
  }
}

/**
 * Batch inference for multiple merchant codes
 * More efficient than individual calls when processing many codes
 */
export async function inferMerchantsBatch(
  contexts: TransactionContext[],
  learningHistory: LearningSig[] = []
): Promise<MerchantInference[]> {
  // For now, process sequentially to avoid rate limits
  // In production, could implement parallel processing with rate limiting
  const results: MerchantInference[] = [];

  for (const context of contexts) {
    try {
      const inference = await inferMerchant(context, learningHistory);
      results.push(inference);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to infer merchant for ${context.code}:`, error);
      // Continue with other codes even if one fails
    }
  }

  return results;
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
