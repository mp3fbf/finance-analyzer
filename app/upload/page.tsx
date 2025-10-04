'use client';

import { useState } from 'react';
import { FileUploader } from '@/components/Upload/FileUploader';
import { ProcessingStatus } from '@/components/Upload/ProcessingStatus';
import { ProgressTimer } from '@/components/Upload/ProgressTimer';
import { ExtractionResult } from '@/types/transaction';
import { useRouter } from 'next/navigation';
import { addTransactions } from '@/lib/db/operations';
import { processMerchantsForAllTransactions } from '@/lib/analysis/process-merchants';

type Status = 'idle' | 'processing' | 'success' | 'error';

const DISPLAY_TRANSACTION_LIMIT = 10;
const REDIRECT_DELAY_MS = 2000;

export default function UploadPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>();
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const router = useRouter();

  const handleUpload = async (file: File) => {
    setStatus('processing');
    setCurrentStep('📤 Enviando arquivo...');
    setMessage(`Enviando ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setCurrentStep('🤖 Processando com Claude AI...');
      setMessage('Isso pode levar 10-30 segundos dependendo do tamanho');

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }

      setCurrentStep('📊 Finalizando extração...');
      const data: { data: ExtractionResult } = await response.json();

      // Converter strings ISO de volta para Date objects
      const parsedResult: ExtractionResult = {
        ...data.data,
        transactions: data.data.transactions.map((t) => ({
          ...t,
          date: new Date(t.date),
        })),
        metadata: {
          ...data.data.metadata,
          processed_at: new Date(data.data.metadata.processed_at),
          period: data.data.metadata.period ? {
            start: new Date(data.data.metadata.period.start),
            end: new Date(data.data.metadata.period.end),
          } : undefined,
        },
      };

      setResult(parsedResult);

      // Salvar no IndexedDB
      if (parsedResult.transactions.length === 0) {
        setStatus('error');
        setCurrentStep('⚠️ Nenhuma transação encontrada');
        setMessage('O arquivo foi processado mas nenhuma transação foi extraída');
        return;
      }

      try {
        setCurrentStep('💾 Salvando transações...');
        setMessage(`Armazenando ${parsedResult.transactions.length} transações localmente`);
        await addTransactions(parsedResult.transactions);

        setCurrentStep('🏪 Processando estabelecimentos...');
        setMessage('Criando mapeamentos de merchants');
        await processMerchantsForAllTransactions();

        setCurrentStep('✅ Concluído!');
        setStatus('success');
        setMessage(`${parsedResult.transactions.length} transações salvas com sucesso!`);
      } catch (dbError) {
        console.error('IndexedDB save error:', dbError);
        setStatus('error');
        setCurrentStep('❌ Erro ao salvar');
        setMessage(
          `Extração OK, mas falha ao salvar no banco: ${
            dbError instanceof Error ? dbError.message : 'Erro desconhecido no IndexedDB'
          }`
        );
        return;
      }

      // Redirecionar para dashboard após delay
      setTimeout(() => {
        router.push('/');
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Upload de Extrato
          </h1>
          <p className="text-muted-foreground mt-2">
            Envie seu extrato bancário ou fatura de cartão em PDF
          </p>
        </div>

        <div className="space-y-6">
          <FileUploader
            onUpload={handleUpload}
            isProcessing={status === 'processing'}
          />

          <ProcessingStatus
            status={status}
            message={currentStep || message}
            transactionCount={result?.metadata.total_transactions}
          />

          {status === 'processing' && (
            <ProgressTimer isActive={true} />
          )}

          {status === 'success' && result && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4">
                ✅ Transações Salvas no Banco de Dados
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.transactions.slice(0, DISPLAY_TRANSACTION_LIMIT).map((t, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 bg-muted rounded"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.date.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        t.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
              {result.transactions.length > DISPLAY_TRANSACTION_LIMIT && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  + {result.transactions.length - DISPLAY_TRANSACTION_LIMIT} transações
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
