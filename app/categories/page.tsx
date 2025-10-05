'use client';

import { useCategories } from '@/lib/db/hooks';
import { getAllTransactions, getAllMerchants, addCategory, clearAllCategories } from '@/lib/db/operations';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatting';
import { useState, useMemo } from 'react';

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

  // Sort categories by total_amount (descending) - highest impact first
  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => b.total_amount - a.total_amount);
  }, [categories]);

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

      // Clear existing categories to prevent duplicates
      console.log('[Client] Clearing existing categories...');
      await clearAllCategories();

      // Save new categories to IndexedDB
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Categorias Inteligentes</h1>
          <button
            onClick={handleCategorize}
            disabled={loading}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Categorizando...' : 'Gerar Categorias'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
          </div>
        )}

        {sortedCategories.length === 0 ? (
          <div className="rounded-lg bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma categoria gerada ainda. Clique em &quot;Gerar
              Categorias&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedCategories.map((cat) => (
              <Card key={cat.id} className="p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{cat.name}</h3>
                    <p className="mt-2 text-muted-foreground">{cat.description}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {cat.transaction_ids.length} transações
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-destructive">
                      {formatCurrency(cat.total_amount)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
