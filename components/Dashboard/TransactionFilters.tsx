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
  type?: TransactionType;
  search?: string;
}

interface TransactionFiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
}

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
