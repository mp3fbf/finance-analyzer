/**
 * Type definitions for merchant inference
 *
 * These types are used by both client and server code,
 * so they must NOT import any server-only modules.
 */

/**
 * A hypothesis about what a merchant code might represent during AI inference.
 *
 * @property name - The hypothesized merchant name
 * @property confidence - Confidence score (0-1) for this hypothesis
 * @property evidence_for - List of supporting evidence for this hypothesis
 * @property evidence_against - List of contradicting evidence for this hypothesis
 */
export interface MerchantHypothesis {
  name: string;
  confidence: number;
  evidence_for: string[];
  evidence_against: string[];
}

/**
 * Structured reasoning output from AI inference process.
 *
 * @property structural_analysis - Analysis of the transaction code structure
 * @property value_analysis - Analysis of transaction amounts and patterns
 * @property temporal_analysis - Analysis of time-based patterns
 * @property hypotheses - List of potential merchant identifications with evidence
 * @property needs_web_search - Whether web search is needed to confirm identification
 * @property search_terms - Suggested search terms if web search is needed
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
 * Final merchant inference result from AI analysis.
 *
 * @property code - The normalized transaction code that was analyzed
 * @property inferred_name - The AI-inferred merchant name
 * @property confidence - Overall confidence score (0-1) in the inference
 * @property type - Categorization of the merchant type
 * @property reasoning - Detailed reasoning behind the inference
 * @property reasoning_summary - Brief summary of the reasoning
 * @property used_web_search - Whether web search was used in the inference
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
 * Learning signal from previous user validations.
 * Used to improve future AI inferences based on user corrections.
 *
 * @property original_code - The original transaction code
 * @property context_summary - Summary of the transaction context
 * @property ai_inference - What the AI originally inferred
 * @property user_correction - User's correction (null if AI was correct)
 * @property was_correct - Whether the AI inference was correct
 */
export interface LearningSig {
  original_code: string;
  context_summary: string;
  ai_inference: string;
  user_correction: string | null;
  was_correct: boolean;
}
