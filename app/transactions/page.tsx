'use client';

import { useTransactions } from '@/lib/db/hooks';
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout';
import { TransactionList } from '@/components/Dashboard/TransactionList';
import { Loader2 } from 'lucide-react';

/**
 * Transactions page - displays all transactions with filtering and search
 */
export default function TransactionsPage() {
  const transactions = useTransactions();

  return (
    <DashboardLayout>
      {!transactions ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando transações...</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-6">Todas as Transações</h2>
          <TransactionList transactions={transactions} />
        </div>
      )}
    </DashboardLayout>
  );
}
