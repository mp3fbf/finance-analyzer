'use client';

import * as React from 'react';
import { Transaction } from '@/types/transaction';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { cn } from '@/lib/utils';

interface TransactionItemProps {
  /** Transaction data to display */
  transaction: Transaction;
  /** Optional click handler for the transaction item */
  onClick?: () => void;
}

/**
 * TransactionItem component displays a single transaction with amount, type, date, and category.
 * Supports keyboard navigation (Enter/Space) and includes proper ARIA labels for accessibility.
 * Forwards refs for better composability.
 *
 * @param transaction - The transaction object containing all transaction details
 * @param onClick - Optional callback fired when the item is clicked or activated via keyboard
 */
export const TransactionItem = React.forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ transaction, onClick }, ref) => {
    const isExpense = transaction.amount < 0;
    const isIncome = transaction.amount > 0;
    const isZero = transaction.amount === 0;
    const isInteractive = !!onClick;

    const getTypeIcon = () => {
      if (transaction.type === 'pix') {
        return <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />;
      }
      return isExpense ? (
        <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
      );
    };

    const getTypeColor = () => {
      if (isExpense) return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      if (isIncome) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
    };

    const getAmountColor = () => {
      if (isZero) return 'text-muted-foreground';
      if (isExpense) return 'text-red-600 dark:text-red-400';
      return 'text-green-600 dark:text-green-400';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        {...(isInteractive
          ? {
              role: 'button',
              tabIndex: 0,
              onClick,
              onKeyDown: handleKeyDown,
            }
          : {})}
        aria-label={`Transaction: ${transaction.description}, ${formatCurrency(Math.abs(transaction.amount))}`}
        className={cn(
          'flex justify-between items-center p-4 transition-colors rounded-lg',
          isInteractive && 'hover:bg-accent/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring'
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={cn('p-2 rounded-full', getTypeColor())}>
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
          <p className={cn('font-semibold text-lg', getAmountColor())}>
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
);

TransactionItem.displayName = 'TransactionItem';
