'use client';

import { Insight } from '@/types/insight';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer focus:ring-2 focus:ring-primary focus:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{ICONS[insight.type] || '📌'}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-foreground">{insight.title}</h3>
          <p className="text-muted-foreground mt-2 text-sm">{insight.description}</p>
          <Button
            variant="link"
            className="mt-4 px-0 h-auto text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            Explorar no chat →
          </Button>
        </div>
      </div>
    </Card>
  );
}
