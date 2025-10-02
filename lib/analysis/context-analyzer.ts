/**
 * Context Analyzer
 *
 * Extracts all available signals from transactions to help AI infer
 * the real merchant behind arbitrary transaction codes.
 *
 * This is a deterministic, scalable signal extraction system that doesn't
 * rely on hardcoded patterns or specific merchant knowledge.
 */

import { Transaction } from '@/types/transaction';

/**
 * Statistical analysis of transaction amounts
 */
export interface AmountStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  /** Coefficient of variation (stddev/mean) - indicates regularity */
  cv: number;
}

/**
 * Temporal patterns in transaction occurrences
 */
export interface TemporalPattern {
  /** Distribution across days of month (1-31) */
  day_of_month_distribution: number[];
  /** Distribution across days of week (0=Sun, 6=Sat) */
  day_of_week_distribution: number[];
  /** Most common day of month (if exists) */
  dominant_day_of_month?: number;
  /** Description of detected pattern */
  pattern_description: string;
}

/**
 * Structural analysis of the transaction code text
 */
export interface CodeStructure {
  /** Original raw text */
  raw: string;
  /** Length of the code */
  length: number;
  /** Contains asterisk (*) character */
  has_asterisk: boolean;
  /** Has numeric suffix that changes per transaction */
  has_variable_numeric_suffix: boolean;
  /** All uppercase letters */
  is_all_caps: boolean;
  /** Common payment keywords found */
  payment_keywords: string[];
  /** Character composition */
  composition: {
    letters: number;
    digits: number;
    spaces: number;
    special_chars: string[];
  };
  /** Detected prefixes (e.g., "PAG*", "UBER *") */
  detected_prefix?: string;
  /** Detected suffix pattern */
  detected_suffix_pattern?: string;
}

/**
 * Complete context for a merchant code
 */
export interface TransactionContext {
  /** The normalized merchant code */
  code: string;
  /** Original raw texts (all variations) */
  raw_variations: string[];
  /** Number of occurrences */
  occurrence_count: number;
  /** Total amount across all transactions */
  total_amount: number;
  /** Statistical analysis of amounts */
  amount_stats: AmountStats;
  /** Temporal patterns */
  temporal_pattern: TemporalPattern;
  /** Structural analysis of the code */
  code_structure: CodeStructure;
  /** Transaction types seen (debit, credit, pix, etc) */
  transaction_types: string[];
  /** Other codes that co-occur in same invoices */
  co_occurring_codes: string[];
  /** Date range */
  date_range: {
    first: Date;
    last: Date;
    span_days: number;
  };
  /** Sample transaction IDs for reference */
  sample_transaction_ids: string[];
}

/**
 * Common payment-related keywords in Brazilian banking
 */
const PAYMENT_KEYWORDS = [
  'PAG', 'PAGTO', 'TED', 'DOC', 'PIX', 'TRANSF',
  'CARTAO', 'CARD', 'DEBITO', 'CREDITO',
  'REC', 'RECARGA', 'SAQUE', 'DEP', 'DEPOSITO'
];

/**
 * Normalize a transaction code by removing variable suffixes
 */
export function normalizeCode(raw: string): string {
  let normalized = raw.trim().toUpperCase();

  // Remove long numeric suffixes (likely transaction IDs)
  normalized = normalized.replace(/\s+\d{6,}$/, '');

  // Remove short numeric suffixes if pattern detected
  // (but keep if it's part of the merchant name like "99")
  if (normalized.match(/\s+\d{1,5}$/)) {
    const withoutSuffix = normalized.replace(/\s+\d{1,5}$/, '');
    // Only remove if the base is long enough (not just a number)
    if (withoutSuffix.length > 2) {
      normalized = withoutSuffix;
    }
  }

  return normalized;
}

/**
 * Analyze the structure of a transaction code
 */
export function analyzeCodeStructure(raw: string, allVariations: string[]): CodeStructure {
  const normalized = normalizeCode(raw);

  // Detect if variations suggest a variable numeric suffix
  const hasVariableNumericSuffix = allVariations.length > 1 &&
    allVariations.every(v => /\d+$/.test(v));

  // Character composition
  const letters = (raw.match(/[a-zA-Z]/g) || []).length;
  const digits = (raw.match(/\d/g) || []).length;
  const spaces = (raw.match(/\s/g) || []).length;
  const specialChars = raw.match(/[^a-zA-Z0-9\s]/g) || [];

  // Detect common keywords
  const paymentKeywords = PAYMENT_KEYWORDS.filter(keyword =>
    raw.toUpperCase().includes(keyword)
  );

  // Detect prefix patterns
  let detectedPrefix: string | undefined;
  const asteriskMatch = raw.match(/^([A-Z0-9]+)\s*\*/);
  if (asteriskMatch) {
    detectedPrefix = asteriskMatch[1] + ' *';
  }

  // Detect suffix pattern
  let suffixPattern: string | undefined;
  if (hasVariableNumericSuffix) {
    suffixPattern = 'VARIABLE_NUMERIC';
  }

  return {
    raw: normalized,
    length: normalized.length,
    has_asterisk: raw.includes('*'),
    has_variable_numeric_suffix: hasVariableNumericSuffix,
    is_all_caps: raw === raw.toUpperCase(),
    payment_keywords: paymentKeywords,
    composition: {
      letters,
      digits,
      spaces,
      special_chars: [...new Set(specialChars)]
    },
    detected_prefix: detectedPrefix,
    detected_suffix_pattern: suffixPattern
  };
}

/**
 * Calculate statistical measures for amounts
 */
export function calculateAmountStats(amounts: number[]): AmountStats {
  if (amounts.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stddev: 0,
      cv: 0
    };
  }

  const sorted = [...amounts].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  const median = sorted.length % 2 === 0
    ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2
    : sorted[Math.floor(sorted.length / 2)] ?? 0;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
  const stddev = Math.sqrt(variance);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean,
    median,
    stddev,
    cv: Math.abs(mean) > 0 ? stddev / Math.abs(mean) : 0
  };
}

/**
 * Analyze temporal patterns in transaction dates
 */
export function analyzeTemporalPattern(dates: Date[]): TemporalPattern {
  const dayOfMonth = new Array(31).fill(0);
  const dayOfWeek = new Array(7).fill(0);

  dates.forEach(date => {
    dayOfMonth[date.getDate() - 1]++;
    dayOfWeek[date.getDay()]++;
  });

  // Find dominant day of month (if >50% of transactions on same day)
  const maxDayCount = Math.max(...dayOfMonth);
  const dominantDay = maxDayCount > dates.length * 0.5
    ? dayOfMonth.indexOf(maxDayCount) + 1
    : undefined;

  // Generate pattern description
  let description = '';
  if (dominantDay) {
    description = `Concentrado no dia ${dominantDay} do mês`;
  } else if (dayOfMonth.slice(0, 10).reduce((a, b) => a + b, 0) > dates.length * 0.7) {
    description = 'Concentrado no início do mês (dias 1-10)';
  } else if (dayOfMonth.slice(20, 31).reduce((a, b) => a + b, 0) > dates.length * 0.7) {
    description = 'Concentrado no fim do mês (dias 21-31)';
  } else {
    description = 'Distribuído ao longo do mês';
  }

  return {
    day_of_month_distribution: dayOfMonth,
    day_of_week_distribution: dayOfWeek,
    dominant_day_of_month: dominantDay,
    pattern_description: description
  };
}

/**
 * Extract complete context for a group of transactions with the same code
 */
export function extractContext(
  code: string,
  transactions: Transaction[],
  allTransactions: Transaction[]
): TransactionContext {
  const amounts = transactions.map(t => t.amount);
  const dates = transactions.map(t => new Date(t.date));
  const rawVariations = [...new Set(transactions.map(t => t.description))];

  // Find co-occurring codes: other merchants that appear in the same invoices/dates
  const transactionDates = new Set(transactions.map(t => t.date));
  const coOccurringCodesMap = new Map<string, number>();

  // Count how many times each other code appears on the same dates
  allTransactions
    .filter(t => {
      const normalizedCode = normalizeCode(t.description);
      return normalizedCode !== code && transactionDates.has(t.date);
    })
    .forEach(t => {
      const normalizedCode = normalizeCode(t.description);
      coOccurringCodesMap.set(normalizedCode, (coOccurringCodesMap.get(normalizedCode) || 0) + 1);
    });

  // Get top 10 most frequently co-occurring codes
  const coOccurringCodes = Array.from(coOccurringCodesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, _]) => code);

  // Sort dates
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0] ?? new Date();
  const lastDate = sortedDates[sortedDates.length - 1] ?? new Date();
  const spanDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    code,
    raw_variations: rawVariations,
    occurrence_count: transactions.length,
    total_amount: amounts.reduce((a, b) => a + b, 0),
    amount_stats: calculateAmountStats(amounts),
    temporal_pattern: analyzeTemporalPattern(dates),
    code_structure: analyzeCodeStructure(rawVariations[0] ?? '', rawVariations),
    transaction_types: [...new Set(transactions.map(t => t.type || 'unknown'))],
    co_occurring_codes: coOccurringCodes,
    date_range: {
      first: firstDate,
      last: lastDate,
      span_days: spanDays
    },
    sample_transaction_ids: transactions.slice(0, 5).map(t => t.id)
  };
}

/**
 * Analyze all transactions and extract contexts for unique merchant codes
 */
export function analyzeAllTransactions(transactions: Transaction[]): Map<string, TransactionContext> {
  // Group by normalized code
  const groupedByCode = new Map<string, Transaction[]>();

  transactions.forEach(transaction => {
    const code = normalizeCode(transaction.description);
    if (!groupedByCode.has(code)) {
      groupedByCode.set(code, []);
    }
    groupedByCode.get(code)!.push(transaction);
  });

  // Extract context for each code
  const contexts = new Map<string, TransactionContext>();

  groupedByCode.forEach((txns, code) => {
    contexts.set(code, extractContext(code, txns, transactions));
  });

  return contexts;
}

/**
 * Calculate impact score for prioritizing validation
 * Higher score = more important to validate
 */
export function calculateImpactScore(context: TransactionContext, aiConfidence: number): number {
  // Impact = (total_value × occurrence_count) / confidence
  // Higher total value and frequency, lower confidence = higher priority
  const baseImpact = context.total_amount * context.occurrence_count;
  const confidencePenalty = aiConfidence > 0 ? (1 / aiConfidence) : 10;

  return baseImpact * confidencePenalty;
}
