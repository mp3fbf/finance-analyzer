'use client';

import { useInsights, useMerchants } from '@/lib/db/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { format } from 'date-fns';
import { generateInsights } from '@/lib/analysis/insights';

export default function InsightsPage() {
  const period = format(new Date(), 'yyyy-MM');
  const insights = useInsights(period);
  const merchants = useMerchants();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!merchants) return;
    setLoading(true);
    await generateInsights(merchants, period);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Insights</h1>
          <Button
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Gerando...' : 'Gerar Insights'}
          </Button>
        </div>

        <div className="space-y-6">
          {insights?.map((insight) => (
            <Card key={insight.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {insight.type === 'top_spending' && '💰'}
                  {insight.type === 'subscriptions' && '🔄'}
                  {insight.type === 'alert' && '⚠️'}
                  {insight.type === 'growth' && '📈'}
                  {insight.type === 'opportunity' && '💡'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{insight.title}</h3>
                  <p className="text-muted-foreground mt-2">{insight.description}</p>
                  {insight.data && (
                    <pre className="mt-4 text-xs bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(insight.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
