'use client';

import { useTransactions, useInsights } from '@/lib/db/hooks';
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout';
import { InsightCard } from '@/components/Dashboard/InsightCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatting';
import { generateInsights } from '@/lib/analysis/insights';
import { useMerchants } from '@/lib/db/hooks';

export default function Home() {
  const transactions = useTransactions();
  const merchants = useMerchants();
  const period = format(new Date(), 'yyyy-MM');
  const insights = useInsights(period);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const stats = useMemo(() => {
    if (!transactions) return { total: 0, expenses: 0, income: 0 };

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    return { total, expenses, income };
  }, [transactions]);

  const handleGenerateInsights = async () => {
    if (!merchants) return;
    setGeneratingInsights(true);
    try {
      await generateInsights(merchants, period);
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Loading state
  if (!transactions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando transações...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-6">
            <Upload className="w-16 h-16 text-muted-foreground mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao Finance Analyzer
          </h1>
          <p className="text-muted-foreground mb-8">
            Faça upload do seu primeiro extrato para começar
          </p>
          <Button asChild size="lg">
            <Link href="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Main dashboard with stats and insights
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Stats Overview */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Visão Geral</h2>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(stats.total)}
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-3xl font-bold text-danger-600 mt-2">
                {formatCurrency(stats.expenses)}
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-3xl font-bold text-success-600 mt-2">
                {formatCurrency(stats.income)}
              </p>
            </Card>
          </div>
        </div>

        {/* Insights Cards */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Insights do Mês</h2>
          {!insights || insights.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Nenhum insight gerado ainda</p>
              <Button
                onClick={handleGenerateInsights}
                disabled={generatingInsights || !merchants}
              >
                {generatingInsights ? 'Gerando...' : 'Gerar Insights'}
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onClick={() => console.log('Open chat with insight:', insight.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
