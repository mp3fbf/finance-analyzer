'use client';

import { Insight } from '@/types/insight';
import { Card } from '@/components/ui/card';

interface InsightCardProps {
  insight: Insight;
  onClick?: () => void;
}

const ICONS: Record<string, string> = {
  top_spending: '💰',
  subscriptions: '🔄',
  alert: '⚠️',
  growth: '📈',
  opportunity: '💡',
  contextual: '👶',
  comparison: '📊',
};

/**
 * Insight card component with icon, title, description and action button
 */
export function InsightCard({ insight, onClick }: InsightCardProps) {
  return (
    <Card
      onClick={onClick}
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{ICONS[insight.type] || '📌'}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-foreground">{insight.title}</h3>
          <p className="text-muted-foreground mt-2 text-sm">{insight.description}</p>
          <button className="mt-4 text-primary text-sm font-medium hover:underline">
            Explorar no chat →
          </button>
        </div>
      </div>
    </Card>
  );
}
