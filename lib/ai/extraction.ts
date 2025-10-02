import { anthropic, MODELS } from './claude';
import { ExtractionResult } from '@/types/transaction';

export async function extractTransactionsFromPDF(
  fileBase64: string,
  fileName: string,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' = 'application/pdf'
): Promise<ExtractionResult> {
  console.log('[Extraction] 🚀 Iniciando extração');
  console.log('[Extraction] 📄 Arquivo:', fileName);
  console.log('[Extraction] 🤖 Modelo:', MODELS.SONNET);
  console.log('[Extraction] 📏 Base64 size:', (fileBase64.length / 1024).toFixed(1), 'KB');
  console.log('[Extraction] 🎨 Media type:', mediaType);

  const prompt = `Extraia todas as transações financeiras deste documento (extrato bancário ou fatura de cartão).

IMPORTANTE:
- Valores de SAÍDA devem ser negativos (ex: -47.80)
- Valores de ENTRADA devem ser positivos (ex: 1500.00)
- Formato de data: YYYY-MM-DD
- Horário (se disponível): HH:MM

Output em JSON:
{
  "transactions": [
    {
      "date": "2024-09-15",
      "time": "20:35",
      "description": "RAPPI",
      "raw_description": "RAPPI *MOUSTACHE BEANS SAO PAULO BR",
      "amount": -47.80,
      "type": "credit"
    }
  ],
  "period": {
    "start": "2024-09-01",
    "end": "2024-09-30"
  }
}

Regras:
1. "type" pode ser: "debit", "credit", "pix"
2. Se for parcelado, adicione em metadata.installments: { current: 1, total: 12 }
3. Normalize descrições (remova códigos/IDs quando possível)
4. Se encontrar categoria do banco, salve em metadata.original_bank_category
5. Ignore linhas de total, saldo, etc - apenas transações individuais`;

  console.log('[Extraction] 📝 Prompt size:', prompt.length, 'caracteres');
  console.log('[Extraction] ⏳ Chamando API Anthropic...');
  console.log('[Extraction] 🧪 Usando API Beta para PDF (pdfs-2024-09-25)');

  const apiStartTime = Date.now();

  let message;
  try {
    message = await anthropic.beta.messages.create({
      model: MODELS.SONNET,
      betas: ["pdfs-2024-09-25"],
      max_tokens: 64000, // Máximo real do Sonnet 4.5
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType as 'application/pdf',
                data: fileBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
    console.log('[Extraction] ✅ Resposta recebida em', apiDuration + 's');
    console.log('[Extraction] 📊 Tokens input:', message.usage.input_tokens);
    console.log('[Extraction] 📊 Tokens output:', message.usage.output_tokens);
    console.log('[Extraction] 🛑 Stop reason:', message.stop_reason);
  } catch (error) {
    const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
    console.error('[Extraction] ❌ Erro na chamada API após', apiDuration + 's');

    if (error instanceof Error) {
      console.error('[Extraction] 💬 Erro:', error.message);
      if ('status' in error) {
        console.error('[Extraction] 📡 Status HTTP:', (error as { status: unknown }).status);
      }
      if ('code' in error) {
        console.error('[Extraction] 🔧 Código erro:', (error as { code: unknown }).code);
      }
    }

    throw error;
  }

  // Parse response
  console.log('[Extraction] 🔍 Parsing resposta...');
  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    console.error('[Extraction] ❌ Nenhum conteúdo de texto na resposta');
    throw new Error('No text content in response');
  }

  console.log('[Extraction] 📝 Resposta recebida:', textContent.text.substring(0, 200) + '...');

  // Extract JSON from response (pode vir com markdown)
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Extraction] ❌ Nenhum JSON encontrado na resposta');
    console.error('[Extraction] 📄 Resposta completa:', textContent.text);
    throw new Error('No JSON found in response');
  }

  console.log('[Extraction] ✓ JSON extraído, fazendo parse...');
  const parsed = JSON.parse(jsonMatch[0]);
  console.log('[Extraction] ✓ JSON parseado:', parsed.transactions?.length || 0, 'transações');

  // Transform to ExtractionResult
  const result: ExtractionResult = {
    transactions: parsed.transactions.map((t: {
      date: string;
      time?: string;
      description: string;
      raw_description?: string;
      amount: number;
      type: string;
      metadata?: unknown;
    }) => ({
      date: new Date(t.date),
      time: t.time || undefined,
      description: t.description,
      raw_description: t.raw_description || t.description,
      amount: t.amount,
      type: t.type,
      source_file: fileName,
      metadata: t.metadata,
    })),
    metadata: {
      file_name: fileName,
      processed_at: new Date(),
      total_transactions: parsed.transactions.length,
      period: parsed.period
        ? {
            start: new Date(parsed.period.start),
            end: new Date(parsed.period.end),
          }
        : undefined,
    },
  };

  console.log('[Extraction] ✅ Extração finalizada com sucesso');
  return result;
}
