/**
 * Manual test script for aggressive normalization
 * Run with: npx tsx scripts/test-aggressive-normalization.ts
 */

import { aggressiveNormalizeCode } from '../lib/analysis/context-analyzer';

console.log('Testing aggressive normalization...\n');

const testCases = [
  // Isolated digits
  { input: 'ZUL 1 CARTAO', expected: 'ZUL CARTAO' },
  { input: 'ZUL 2 CARTAO', expected: 'ZUL CARTAO' },
  { input: 'ZUL 3 CARTAO', expected: 'ZUL CARTAO' },

  // Digits stuck to words (NEW)
  { input: 'ZUL1 CARTAO 1MK1EX', expected: 'ZUL CARTAO' },
  { input: 'ZUL2 CARTOES 1LPL3D', expected: 'ZUL CARTAO' },
  { input: 'DROGASIL1984', expected: 'DROGASIL' },

  // Asterisk suffixes
  { input: 'IFOOD *RESTABCD', expected: 'IFOOD' },
  { input: 'IFOOD *RESTXYZ', expected: 'IFOOD' },
  { input: 'UBER *TRIP', expected: 'UBER' },
  { input: 'IFOOD ** FOR', expected: 'IFOOD' },

  // Hyphenated suffixes
  { input: 'PAG*SERVICO-01', expected: 'PAG' },
  { input: 'PAG*SERVICO-02', expected: 'PAG' },
  { input: 'MERCHANT-ABC123', expected: 'MERCHANT' },

  // Long alphanumeric suffixes (NEW)
  { input: 'ZUL CARTAO 1LAGWG', expected: 'ZUL CARTAO' },
  { input: 'ZUL CARTAO 1MC3RO', expected: 'ZUL CARTAO' },
  { input: 'ZUL CARTAO 1MDB8X', expected: 'ZUL CARTAO' },

  // Numeric suffixes
  { input: 'UBER TRIP 123456', expected: 'UBER TRIP' },
  { input: 'RESTAURANT 42', expected: 'RESTAURANT' },

  // Location qualifiers (NEW)
  { input: 'PETZ DIGITAL', expected: 'PETZ' },
  { input: 'PETZ ITAIM', expected: 'PETZ' },
  { input: 'LINDT SPRUNGLI BRAZIL', expected: 'LINDT SPRUNGLI' },

  // Duplicate words (NEW)
  { input: 'UBER UBER * MEMBERS', expected: 'UBER' },
  { input: 'UBER UBER * HELP.UB', expected: 'UBER' },

  // CARTOES → CARTAO unification (NEW)
  { input: 'ZUL CARTOES 1LCICH', expected: 'ZUL CARTAO' },

  // Preserve distinct merchants
  { input: 'UBER TRIP', expected: 'UBER TRIP' },
  { input: 'NETFLIX', expected: 'NETFLIX' },
  { input: '99 FOOD', expected: '99 FOOD' },
  { input: 'OPENAI', expected: 'OPENAI' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = aggressiveNormalizeCode(input);
  const success = result === expected;

  if (success) {
    passed++;
    console.log(`✓ "${input}" → "${result}"`);
  } else {
    failed++;
    console.log(`✗ "${input}"`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Got:      "${result}"`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);

// Test grouping reduction
console.log('\n--- Grouping Test ---');
const variations = [
  'ZUL 1 CARTAO',
  'ZUL 2 CARTAO',
  'ZUL 3 CARTAO',
  'IFOOD *RESTABCD',
  'IFOOD *RESTXYZ',
  'IFOOD *REST123',
  'PAG*NETFLIX-01',
  'PAG*NETFLIX-02',
];

const normalized = variations.map(aggressiveNormalizeCode);
const unique = new Set(normalized);

console.log(`Original variations: ${variations.length}`);
console.log(`After normalization: ${unique.size}`);
console.log(`Reduction: ${((1 - unique.size / variations.length) * 100).toFixed(1)}%`);
console.log('\nUnique merchants:');
unique.forEach(code => console.log(`  - ${code}`));

process.exit(failed > 0 ? 1 : 0);
