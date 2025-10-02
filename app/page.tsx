'use client';

import { useTransactions } from '@/lib/db/hooks';
import { TransactionList } from '@/components/Dashboard/TransactionList';
import Link from 'next/link';
import { Upload, Loader2 } from 'lucide-react';

export default function Home() {
  const transactions = useTransactions();

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
            Nenhuma transação ainda
          </h1>
          <p className="text-muted-foreground mb-8">
            Faça upload do seu primeiro extrato para começar
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Fazer Upload
          </Link>
        </div>
      </div>
    );
  }

  // Main dashboard with transactions
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Finance Analyzer
          </h1>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Novo Upload
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <TransactionList transactions={transactions} />
      </main>
    </div>
  );
}
