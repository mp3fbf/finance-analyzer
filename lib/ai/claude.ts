import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 600000, // 10 minutos - timeout no talo
  maxRetries: 3,   // 3 tentativas se falhar
});

export const MODELS = {
  SONNET: 'claude-sonnet-4-5-20250929',
  OPUS: 'claude-opus-4-20250514',
} as const;
