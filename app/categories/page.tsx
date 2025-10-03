'use client';

import { useCategories } from '@/lib/db/hooks';
import { Card } from '@/components/ui/card';
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
      const response = await fetch('/api/categorize', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Categorization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
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
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
          </div>
        )}

        {!categories || categories.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center">
            <p className="text-gray-600">
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
                    <p className="mt-2 text-gray-600">{cat.description}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {cat.transaction_ids.length} transações
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-danger-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(cat.total_amount)}
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
