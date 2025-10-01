import { NextRequest, NextResponse } from 'next/server';
import { extractTransactionsFromPDF } from '@/lib/ai/extraction';

export const runtime = 'nodejs'; // Necessário para processar arquivos grandes
export const maxDuration = 300; // 5 minutos - timeout máximo para PDFs grandes

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[API] 📥 Arquivo recebido:', file.name);
    console.log('[API] 📊 Tamanho:', (file.size / 1024).toFixed(1), 'KB');
    console.log('[API] 📄 Tipo:', file.type);

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      console.log('[API] ❌ Tipo de arquivo inválido:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPEG, and PNG are allowed.' },
        { status: 400 }
      );
    }

    // Validar tamanho (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('[API] ❌ Arquivo muito grande:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Converter para base64
    console.log('[API] 🔄 Convertendo para base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    console.log('[API] ✓ Base64 gerado:', (base64.length / 1024).toFixed(1), 'KB');

    // Extrair transações
    console.log('[API] 🤖 Chamando extração com Claude...');
    const result = await extractTransactionsFromPDF(
      base64,
      file.name,
      file.type as any
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[API] ✅ Extração concluída em', duration + 's');
    console.log('[API] 📊', result.metadata.total_transactions, 'transações extraídas');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('[API] ❌ Erro após', duration + 's:', error);

    if (error instanceof Error) {
      console.error('[API] 💬 Mensagem:', error.message);
      console.error('[API] 📚 Stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Failed to extract transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
