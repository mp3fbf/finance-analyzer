'use client';

import { useTransactions, useMerchants, useCategories } from '@/lib/db/hooks';
import { clearAllData, exportData } from '@/lib/db/operations';
import { db } from '@/lib/db/schema';
import { useState } from 'react';

export default function DebugPage() {
  const transactions = useTransactions();
  const merchants = useMerchants();
  const categories = useCategories();
  const [message, setMessage] = useState<string>();

  const handleClearData = async () => {
    if (!confirm('Tem certeza? Isso apagará TODOS os dados.')) {
      return;
    }

    try {
      await clearAllData();
      setMessage('✅ Dados apagados com sucesso!');
    } catch (error) {
      setMessage(
        `❌ Erro ao apagar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      console.error('Clear data error:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url); // Free memory
      setMessage('✅ Dados exportados com sucesso!');
    } catch (error) {
      setMessage(
        `❌ Erro ao exportar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      console.error('Export error:', error);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Isso vai DELETAR o banco e RECARREGAR a página. Continuar?')) {
      return;
    }

    try {
      await db.close(); // Close Dexie connection first
      indexedDB.deleteDatabase('FinanceAnalyzerDB');
      setMessage('🔄 Banco deletado. Recarregando...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setMessage(
        `❌ Erro ao resetar banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      console.error('Reset database error:', error);
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
                    {t.date?.toLocaleDateString('pt-BR') || 'Data inválida'} • {t.type}
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
