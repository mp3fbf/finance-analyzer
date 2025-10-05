'use client';

import { useTransactions, useMerchants, useCategories } from '@/lib/db/hooks';
import { clearAllData, exportData } from '@/lib/db/operations';
import { db } from '@/lib/db/schema';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Debug - IndexedDB</h1>

        {message && (
          <Card className="mb-6 border-blue-500/50">
            <CardContent className="pt-6">
              <p className="text-foreground">{message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {transactions?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estabelecimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {merchants?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {categories?.length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 mb-8">
          <Button onClick={handleExportData} variant="default">
            <Download className="w-4 h-4 mr-2" />
            Exportar Dados (JSON)
          </Button>
          <Button onClick={handleClearData} variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Todos os Dados
          </Button>
          <Button onClick={handleResetDatabase} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Database (Fix Schema)
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas 20 Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions?.slice(0, 20).map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-3 bg-muted rounded text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.date ? formatDate(t.date) : 'Data inválida'} • {t.type}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      t.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
