'use client';

import { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface TransactionListProps {
  /** Array of transactions to display and filter */
  transactions: Transaction[];
}

/**
 * TransactionList component displays transactions with filtering capabilities and summary stats.
 * Features:
 * - Stats cards showing balance, expenses, and income
 * - Filter sidebar for search and transaction type
 * - Optimized search across description and raw_description fields
 * - Responsive grid layout
 *
 * @param transactions - Array of all transactions to display
 */
export function TransactionList({ transactions }: TransactionListProps) {
  const [filters, setFilters] = useState<{
    type?: TransactionType;
    search?: string;
  }>({});

  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((t) => {
      // Filter by type
      if (filters.type && t.type !== filters.type) return false;

      // Filter by search (description, raw_description, and category)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesDescription = t.description.toLowerCase().includes(searchLower);
        const matchesRawDescription = t.raw_description.toLowerCase().includes(searchLower);
        const matchesCategory = t.category?.toLowerCase().includes(searchLower);

        if (!matchesDescription && !matchesRawDescription && !matchesCategory) {
          return false;
        }
      }

      return true;
    });

    // Sort by recency (most recent first)
    return filtered.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, filters]);

  const stats = useMemo(() => {
    // Optimize: single pass through array to calculate all stats
    return filteredAndSortedTransactions.reduce(
      (acc, t) => {
        acc.total += t.amount;
        if (t.amount < 0) {
          acc.expenses += t.amount;
        } else if (t.amount > 0) {
          acc.income += t.amount;
        }
        return acc;
      },
      { total: 0, expenses: 0, income: 0 }
    );
  }, [filteredAndSortedTransactions]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de entradas e saídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(Math.abs(stats.expenses))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de saídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.income)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de entradas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Refine sua busca</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionFilters filters={filters} onChange={setFilters} />
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Transações ({filteredAndSortedTransactions.length})
              </CardTitle>
              <CardDescription>
                Histórico completo de movimentações
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredAndSortedTransactions.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </p>
                ) : (
                  filteredAndSortedTransactions.map((t) => (
                    <TransactionItem key={t.id} transaction={t} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
