'use client';

import { useTransactions, useMerchants, useCategories } from '@/lib/db/hooks';
import { clearAllData, exportData } from '@/lib/db/operations';
import { useState } from 'react';

export default function DebugPage() {
  const transactions = useTransactions();
  const merchants = useMerchants();
  const categories = useCategories();
  const [message, setMessage] = useState<string>();

  const handleClearData = async () => {
    if (confirm('Tem certeza? Isso apagará TODOS os dados.')) {
      await clearAllData();
      setMessage('Dados apagados com sucesso!');
    }
  };

  const handleExportData = async () => {
    const data = await exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-data-${Date.now()}.json`;
    a.click();
    setMessage('Dados exportados!');
  };

  const handleResetDatabase = () => {
    if (confirm('Isso vai DELETAR o banco e RECARREGAR a página. Continuar?')) {
      indexedDB.deleteDatabase('FinanceAnalyzerDB');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug - IndexedDB</h1>

        {message && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Transações</h3>
            <p className="text-4xl font-bold text-primary-600">
              {transactions?.length || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Estabelecimentos</h3>
            <p className="text-4xl font-bold text-primary-600">
              {merchants?.length || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Categorias</h3>
            <p className="text-4xl font-bold text-primary-600">
              {categories?.length || 0}
            </p>
          </div>
        </div>

        <div className="space-x-4 mb-8">
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            Exportar Dados (JSON)
          </button>
          <button
            onClick={handleClearData}
            className="px-4 py-2 bg-danger-500 text-white rounded hover:bg-danger-600"
          >
            Limpar Todos os Dados
          </button>
          <button
            onClick={handleResetDatabase}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            🔄 Reset Database (Fix Schema)
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            Últimas 20 Transações
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions?.slice(0, 20).map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {t.date.toLocaleDateString('pt-BR')} • {t.type}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    t.amount < 0 ? 'text-danger-600' : 'text-success-600'
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
        </div>
      </div>
    </div>
  );
}
