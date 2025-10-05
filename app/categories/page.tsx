'use client';

import { useCategories } from '@/lib/db/hooks';
import { getAllTransactions, getAllMerchants, addCategory } from '@/lib/db/operations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatting';
import { useState } from 'react';
import { TrendingUp, ShoppingCart, Plane, Heart, Zap } from 'lucide-react';

/**
 * Categorias Inteligentes page
 *
 * Displays AI-generated contextual categories with live updates from IndexedDB.
 * Categories are sorted by total_amount (descending) to show highest-impact groups first.
 *
 * Features:
 * - "Gerar Categorias" button triggers AI categorization
 * - Live-updating category cards via useLiveQuery
 * - Shows category name, description, transaction count, total amount
 * - Loading state during AI processing
 */
export default function CategoriesPage() {
  const categories = useCategories();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Client] Fetching transactions and merchants from IndexedDB...');

      // Fetch data from IndexedDB (client-side only)
      const transactions = await getAllTransactions();
      const merchants = await getAllMerchants();

      console.log(`[Client] Found ${transactions.length} transactions and ${merchants.length} merchants`);

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions found. Please upload data first.');
      }

      console.log('[Client] Calling /api/categorize...');

      // Send data to server for AI processing
      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, merchants }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Categorization failed');
      }

      console.log(`[Client] Received ${data.categories.length} categories from API`);

      // Save categories to IndexedDB
      for (const cat of data.categories) {
        await addCategory({
          name: cat.name,
          description: cat.description,
          transaction_ids: cat.transaction_ids,
          total_amount: cat.total_amount,
        });
      }

      console.log('[Client] Categories saved to IndexedDB');
    } catch (err) {
      console.error('[Client] Categorization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('viag') || lowerName.includes('hosped')) return Plane;
    if (lowerName.includes('compra') || lowerName.includes('shopping')) return ShoppingCart;
    if (lowerName.includes('saúde') || lowerName.includes('vet')) return Heart;
    if (lowerName.includes('assinatura') || lowerName.includes('ia') || lowerName.includes('tech')) return Zap;
    return TrendingUp;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categorias Inteligentes</h1>
            <p className="text-muted-foreground mt-1">Agrupamentos contextuais baseados em comportamento</p>
          </div>
          <Button
            onClick={handleCategorize}
            disabled={loading}
            size="lg"
          >
            {loading ? 'Categorizando...' : 'Gerar Categorias'}
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive bg-destructive/10 p-4">
            <p className="font-semibold text-destructive">Erro:</p>
            <p className="text-destructive/80">{error}</p>
          </Card>
        )}

        {!categories || categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Nenhuma categoria gerada ainda</p>
            <p className="text-muted-foreground mt-2">
              Clique em "Gerar Categorias" para analisar seus gastos
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              return (
                <Card key={cat.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{cat.name}</h3>
                            <Badge variant="secondary">
                              {cat.transaction_ids.length} transações
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{cat.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-destructive">
                            {formatCurrency(cat.total_amount)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatCurrency(cat.total_amount / cat.transaction_ids.length)}/transação
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
