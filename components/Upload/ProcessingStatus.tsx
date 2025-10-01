'use client';

import { CheckCircle, XCircle } from 'lucide-react';

type Status = 'processing' | 'success' | 'error' | 'idle';

interface ProcessingStatusProps {
  status: Status;
  message?: string;
  transactionCount?: number;
}

export function ProcessingStatus({
  status,
  message,
  transactionCount,
}: ProcessingStatusProps) {
  if (status === 'idle') return null;

  const icons = {
    processing: <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />,
    success: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <XCircle className="w-5 h-5 text-danger-500" />,
  };

  const colors = {
    processing: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-danger-50 border-danger-200 text-danger-800',
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-4 border rounded-lg
        ${colors[status]}
      `}
    >
      {icons[status]}
      <div className="flex-1">
        <p className="font-medium">
          {message ||
            (status === 'processing'
              ? 'Processando...'
              : status === 'success'
              ? 'Sucesso!'
              : 'Erro ao processar')}
        </p>
        {transactionCount !== undefined && (
          <p className="text-sm mt-1 opacity-80">
            {transactionCount} transações encontradas
          </p>
        )}
      </div>
    </div>
  );
}
