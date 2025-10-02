'use client';

import { Transaction } from '@/types/transaction';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const isExpense = transaction.amount < 0;
  const isIncome = transaction.amount > 0;

  const getTypeIcon = () => {
    if (transaction.type === 'pix') {
      return <ArrowLeftRight className="w-4 h-4" />;
    }
    return isExpense ? (
      <ArrowDownLeft className="w-4 h-4" />
    ) : (
      <ArrowUpRight className="w-4 h-4" />
    );
  };

  const getTypeColor = () => {
    if (isExpense) return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
    if (isIncome) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
    return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Transaction: ${transaction.description}, ${formatCurrency(Math.abs(transaction.amount))}`}
      className="flex justify-between items-center p-4 hover:bg-accent/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-2 rounded-full ${getTypeColor()}`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{transaction.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatDate(transaction.date)}</span>
            {transaction.time && <span>• {transaction.time}</span>}
            <Badge variant="outline" className="ml-1">
              {transaction.type === 'debit'
                ? 'Débito'
                : transaction.type === 'credit'
                ? 'Crédito'
                : 'PIX'}
            </Badge>
            {transaction.category && (
              <Badge variant="secondary">{transaction.category}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-semibold text-lg ${
            isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}
        >
          {formatCurrency(Math.abs(transaction.amount))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(transaction.created_at, {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
    </div>
  );
}
