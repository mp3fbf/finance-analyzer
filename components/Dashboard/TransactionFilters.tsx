'use client';

import { TransactionType } from '@/types/transaction';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface FilterOptions {
  /** Transaction type filter (debit, credit, or pix) */
  type?: TransactionType;
  /** Search query string */
  search?: string;
}

interface TransactionFiltersProps {
  /** Current filter values */
  filters: FilterOptions;
  /** Callback fired when filters change */
  onChange: (filters: FilterOptions) => void;
}

/**
 * TransactionFilters component provides search and type filtering for transactions.
 * Features:
 * - Text search with icon
 * - Transaction type dropdown (All, Débito, Crédito, PIX)
 * - Controlled component pattern
 *
 * @param filters - Current filter state
 * @param onChange - Handler for filter updates
 */
export function TransactionFilters({
  filters,
  onChange,
}: TransactionFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Buscar
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nome do estabelecimento..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Tipo
        </label>
        <Select
          value={filters.type || 'all'}
          onValueChange={(value) =>
            onChange({
              ...filters,
              type: value === 'all' ? undefined : (value as TransactionType),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="debit">Débito</SelectItem>
            <SelectItem value="credit">Crédito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
