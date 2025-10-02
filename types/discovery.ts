/**
 * Merchant Discovery Types
 *
 * Types for the AI-powered merchant discovery system that infers
 * real merchant names from arbitrary transaction codes.
 */

import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { InferenceReasoning } from '@/lib/ai/merchant-inference';

/**
 * Status of a merchant discovery record
 */
export type DiscoveryStatus = 'pending' | 'confirmed' | 'corrected' | 'rejected';

/**
 * Merchant type classification
 */
export type MerchantType = 'service' | 'product' | 'transfer' | 'subscription' | 'marketplace' | 'other';

/**
 * Merchant Discovery record - AI inference waiting for validation
 */
export interface MerchantDiscovery {
  id?: number;
  /** The normalized merchant code */
  raw_code: string;
  /** Snapshot of transaction context used for inference */
  context_snapshot: TransactionContext;

  // AI Inference
  /** Full reasoning from Claude */
  ai_reasoning: InferenceReasoning;
  /** Final inferred name */
  ai_final_inference: string;
  /** AI confidence score (0-1) */
  ai_confidence: number;
  /** Merchant type classification */
  ai_merchant_type: MerchantType;
  /** Summary of reasoning */
  ai_reasoning_summary: string;
  /** Whether web search was used */
  ai_used_web_search: boolean;

  // User Feedback
  /** Current status */
  status: DiscoveryStatus;
  /** User-validated name (if corrected) */
  user_validated_name?: string;
  /** User feedback notes */
  user_feedback_notes?: string;

  // Prioritization
  /** Impact score for prioritizing validation */
  impact_score: number;

  // Metadata
  created_at: Date;
  validated_at?: Date;
}

/**
 * Discovery Learning record - feedback for improving future inferences
 */
export interface DiscoveryLearning {
  id?: number;
  /** Hash of structural patterns (for matching similar codes) */
  pattern_signature: string;
  /** Original code that was inferred */
  original_code: string;
  /** Summary of context features */
  context_summary: string;
  /** What AI inferred */
  ai_inference: string;
  /** AI confidence at time of inference */
  ai_confidence: number;
  /** User's correction (null if confirmed) */
  user_correction: string | null;
  /** Whether AI was correct */
  was_correct: boolean;
  /** Type of error if incorrect */
  error_type?: 'completely_wrong' | 'partially_correct' | 'missing_nuance';
  /** Context features that led to this outcome */
  context_features: {
    has_asterisk: boolean;
    has_numeric_suffix: boolean;
    value_cv: number;
    occurrence_count: number;
    temporal_pattern: string;
  };
  created_at: Date;
}

/**
 * Helper to create pattern signature for learning
 */
export function createPatternSignature(context: TransactionContext): string {
  // Create a signature based on structural patterns, not specific codes
  const parts = [
    context.code_structure.has_asterisk ? 'AST' : '',
    context.code_structure.has_variable_numeric_suffix ? 'NUMSUF' : '',
    context.code_structure.payment_keywords.length > 0 ? 'PAYKW' : '',
    context.amount_stats.cv < 0.3 ? 'REGULAR' : context.amount_stats.cv < 0.7 ? 'MODERATE' : 'VARIABLE',
    context.occurrence_count > 10 ? 'FREQUENT' : context.occurrence_count > 3 ? 'OCCASIONAL' : 'RARE',
  ].filter(p => p !== '');

  return parts.join('_');
}

/**
 * Helper to create context summary for learning
 */
export function createContextSummary(context: TransactionContext): string {
  return `${context.occurrence_count} txns, R$${context.total_amount.toFixed(0)}, ${context.temporal_pattern.pattern_description}`;
}
