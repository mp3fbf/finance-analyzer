/**
 * Merchant Inference API with Server-Sent Events (SSE) Streaming
 *
 * Provides real-time progress updates while performing parallel AI inference.
 * Uses SSE to stream progress events to the client.
 */

import { NextRequest } from 'next/server';
import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { inferMerchant, LearningSig } from '@/lib/ai/merchant-inference';
import type { MerchantInference } from '@/types/inference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProgressEvent {
  type: 'start' | 'progress' | 'result' | 'complete' | 'error';
  current?: number;
  total?: number;
  code?: string;
  message?: string;
  inference?: MerchantInference;
  error?: string;
  results?: MerchantInference[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse request body
        const body = await request.json();
        const { contexts, learning_signals } = body as {
          contexts: TransactionContext[];
          learning_signals: LearningSig[];
        };

        // Validate
        if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: 'No contexts provided'
          } as ProgressEvent)}\n\n`));
          controller.close();
          return;
        }

        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          total: contexts.length,
          message: `Iniciando inferência de ${contexts.length} estabelecimentos...`
        } as ProgressEvent)}\n\n`));

        // Rehydrate Date objects
        const rehydratedContexts = contexts.map(ctx => ({
          ...ctx,
          date_range: {
            ...ctx.date_range,
            first: new Date(ctx.date_range.first),
            last: new Date(ctx.date_range.last)
          }
        }));

        // Process ALL contexts in parallel (maintains speed)
        // But use Promise.allSettled to track completion and report progress
        const results: MerchantInference[] = [];
        let completed = 0;

        const promises = rehydratedContexts.map(async (context) => {
          try {
            // Send "processing" update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: completed + 1,
              total: contexts.length,
              code: context.code,
              message: `Processando ${context.code}...`
            } as ProgressEvent)}\n\n`));

            const inference = await inferMerchant(context, learning_signals || []);

            completed++;

            // Send result event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'result',
              current: completed,
              total: contexts.length,
              code: context.code,
              inference,
              message: `✓ ${inference.inferred_name} (${(inference.confidence * 100).toFixed(0)}%)`
            } as ProgressEvent)}\n\n`));

            return inference;
          } catch (error) {
            completed++;

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Send error event but continue
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              current: completed,
              total: contexts.length,
              code: context.code,
              error: errorMessage,
              message: `✗ Erro em ${context.code}`
            } as ProgressEvent)}\n\n`));

            return null;
          }
        });

        // Wait for all promises
        const settled = await Promise.allSettled(promises);

        // Collect successful results
        settled.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          }
        });

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          total: contexts.length,
          current: completed,
          results,
          message: `✓ Concluído! ${results.length}/${contexts.length} estabelecimentos descobertos`
        } as ProgressEvent)}\n\n`));

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: errorMessage,
          message: 'Erro fatal na inferência'
        } as ProgressEvent)}\n\n`));

        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
