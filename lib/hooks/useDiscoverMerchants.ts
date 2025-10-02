/**
 * Client-side hook for merchant discovery
 *
 * Uses IndexedDB (via Dexie) to analyze transactions and trigger AI inference.
 * Since this involves IndexedDB, it must run client-side only.
 */

import { useState } from 'react';
import { analyzeAllTransactions, calculateImpactScore } from '@/lib/analysis/context-analyzer';
import { inferMerchantsBatch, filterContextsNeedingInference } from '@/lib/ai/merchant-inference';
import {
  getAllTransactions,
  getValidatedDiscoveries,
  getAllLearning,
  addMerchantDiscovery,
  getDiscoveryByCode,
} from '@/lib/db/operations';

/**
 * Progress state for merchant discovery process
 */
export interface DiscoveryProgress {
  /** Current stage of discovery */
  stage: 'idle' | 'analyzing' | 'inferring' | 'saving' | 'complete' | 'error';
  /** Current progress value */
  current: number;
  /** Total progress value */
  total: number;
  /** Human-readable progress message */
  message: string;
}

/**
 * Result of merchant discovery process
 */
export interface DiscoveryResult {
  /** Number of new discoveries made */
  discoveries_count: number;
  /** Total number of unique merchant codes analyzed */
  total_codes: number;
  /** IDs of created discovery records */
  discovery_ids: number[];
}

/**
 * React hook for merchant discovery workflow
 *
 * Orchestrates client-side merchant discovery:
 * 1. Analyzes transactions from IndexedDB
 * 2. Calls server API for AI inference
 * 3. Saves discoveries back to IndexedDB
 * 4. Reports progress and results
 *
 * @returns Discovery function, progress state, result, error, and loading flag
 *
 * @example
 * ```tsx
 * const { discoverMerchants, progress, isDiscovering } = useDiscoverMerchants();
 *
 * const handleDiscover = async () => {
 *   try {
 *     const result = await discoverMerchants();
 *     console.log(`Discovered ${result.discoveries_count} merchants`);
 *   } catch (error) {
 *     console.error('Discovery failed:', error);
 *   }
 * };
 * ```
 */
export function useDiscoverMerchants() {
  const [progress, setProgress] = useState<DiscoveryProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: ''
  });

  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function discoverMerchants(): Promise<DiscoveryResult> {
    try {
      setError(null);
      setProgress({ stage: 'analyzing', current: 0, total: 100, message: 'Analisando transações...' });

      // 1. Get all transactions
      const transactions = await getAllTransactions();

      if (transactions.length === 0) {
        throw new Error('Nenhuma transação encontrada');
      }

      // 2. Analyze and extract contexts
      setProgress({ stage: 'analyzing', current: 20, total: 100, message: 'Extraindo contextos...' });
      const contexts = analyzeAllTransactions(transactions);

      // 3. Get existing discoveries
      const existingDiscoveries = await getValidatedDiscoveries();
      const existingMap = new Map(
        existingDiscoveries.map(d => [
          d.raw_code,
          {
            confidence: d.ai_confidence,
            confirmed: d.status === 'confirmed' || d.status === 'corrected'
          }
        ])
      );

      // 4. Filter contexts that need inference
      const contextsArray = Array.from(contexts.values());
      const contextsNeedingInference = filterContextsNeedingInference(
        contextsArray,
        existingMap
      );

      if (contextsNeedingInference.length === 0) {
        const result: DiscoveryResult = {
          discoveries_count: 0,
          total_codes: contextsArray.length,
          discovery_ids: []
        };
        setProgress({ stage: 'complete', current: 100, total: 100, message: 'Todos os estabelecimentos já foram descobertos' });
        setResult(result);
        return result;
      }

      // 5. Get learning history
      setProgress({ stage: 'inferring', current: 40, total: 100, message: `Inferindo ${contextsNeedingInference.length} estabelecimentos...` });
      const allLearning = await getAllLearning();
      const learningSignals = allLearning.map(l => ({
        original_code: l.original_code,
        context_summary: l.context_summary,
        ai_inference: l.ai_inference,
        user_correction: l.user_correction,
        was_correct: l.was_correct
      }));

      // 6. Perform batch inference via API
      // Since AI calls must go through server, we need to send data to API
      const response = await fetch('/api/infer-merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexts: contextsNeedingInference,
          learning_signals: learningSignals
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const inferences = await response.json();

      // 7. Save discoveries to database
      setProgress({ stage: 'saving', current: 80, total: 100, message: 'Salvando descobertas...' });
      const discoveryIds: number[] = [];

      for (const inference of inferences) {
        // Check if already exists
        const existing = await getDiscoveryByCode(inference.code);
        if (existing) {
          discoveryIds.push(existing.id!);
          continue;
        }

        // Find the context for this inference
        const context = contexts.get(inference.code);
        if (!context) continue;

        // Calculate impact score
        const impactScore = calculateImpactScore(context, inference.confidence);

        // Create discovery record
        const discoveryId = await addMerchantDiscovery({
          raw_code: inference.code,
          context_snapshot: context,
          ai_reasoning: inference.reasoning,
          ai_final_inference: inference.inferred_name,
          ai_confidence: inference.confidence,
          ai_merchant_type: inference.type,
          ai_reasoning_summary: inference.reasoning_summary,
          ai_used_web_search: inference.used_web_search,
          status: 'pending',
          impact_score: impactScore,
        });

        discoveryIds.push(discoveryId);
      }

      const finalResult: DiscoveryResult = {
        discoveries_count: inferences.length,
        total_codes: contextsArray.length,
        discovery_ids: discoveryIds,
      };

      setProgress({ stage: 'complete', current: 100, total: 100, message: `${inferences.length} estabelecimentos descobertos!` });
      setResult(finalResult);
      return finalResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setProgress({ stage: 'error', current: 0, total: 100, message: errorMessage });
      throw err;
    }
  }

  return {
    discoverMerchants,
    progress,
    result,
    error,
    isDiscovering: progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error'
  };
}
