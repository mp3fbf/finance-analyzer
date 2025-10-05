'use client';

import { useInsights, useMerchants } from '@/lib/db/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { format } from 'date-fns';
import { generateInsights } from '@/lib/analysis/insights';
import { formatCurrency } from '@/lib/utils/formatting';

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

  const renderInsightContent = (insight: any) => {
    switch (insight.type) {
      case 'top_spending':
        return (
          <div className="mt-4 space-y-2">
            {insight.data.merchants.map((m: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{i + 1}º</Badge>
                  <span className="font-medium">{m.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(m.amount)}</div>
                  <div className="text-xs text-muted-foreground">{m.count} transações</div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'subscriptions':
        return (
          <div className="mt-4">
            <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm text-muted-foreground">Total mensal</div>
              <div className="text-2xl font-bold">{formatCurrency(insight.data.total)}</div>
            </div>
            <div className="space-y-2">
              {insight.data.subscriptions.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="font-medium">{s.name}</span>
                  <span className="font-bold">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alert':
        return (
          <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total gasto</div>
                <div className="text-xl font-bold">{formatCurrency(insight.data.total)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pedidos</div>
                <div className="text-xl font-bold">{insight.data.count}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-destructive/20">
              <div className="text-xs text-muted-foreground mb-2">Estabelecimentos:</div>
              <div className="flex flex-wrap gap-2">
                {insight.data.merchants.map((m: any, i: number) => (
                  <Badge key={i} variant="secondary">{m.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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

        {insights && insights.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum insight gerado ainda.</p>
            <p className="text-sm mt-2">Clique em "Gerar Insights" para analisar seus dados.</p>
          </div>
        )}

        <div className="space-y-6">
          {insights?.map((insight) => (
            <Card key={insight.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">
                  {insight.type === 'top_spending' && '💰'}
                  {insight.type === 'subscriptions' && '🔄'}
                  {insight.type === 'alert' && '⚠️'}
                  {insight.type === 'growth' && '📈'}
                  {insight.type === 'opportunity' && '💡'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{insight.title}</h3>
                  <p className="text-muted-foreground mt-1">{insight.description}</p>
                  {renderInsightContent(insight)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
