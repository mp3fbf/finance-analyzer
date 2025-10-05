'use client';

import { useCategories } from '@/lib/db/hooks';
import { getAllTransactions, getAllMerchants, addCategory } from '@/lib/db/operations';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatting';
import { useState } from 'react';

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

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Categorias Inteligentes</h1>
          <button
            onClick={handleCategorize}
            disabled={loading}
            className="rounded bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Categorizando...' : 'Gerar Categorias'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
          </div>
        )}

        {!categories || categories.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-300">
              Nenhuma categoria gerada ainda. Clique em &quot;Gerar
              Categorias&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {categories.map((cat) => (
              <Card key={cat.id} className="p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{cat.name}</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{cat.description}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {cat.transaction_ids.length} transações
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-danger-600">
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
