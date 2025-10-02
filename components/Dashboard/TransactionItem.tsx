'use client';

import { Transaction } from '@/types/transaction';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

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
    if (isExpense) return 'text-red-600 bg-red-50';
    if (isIncome) return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center p-4 hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-2 rounded-full ${getTypeColor()}`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{transaction.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{transaction.date.toLocaleDateString('pt-BR')}</span>
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
            isExpense ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(Math.abs(transaction.amount))}
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
