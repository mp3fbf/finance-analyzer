import { Merchant } from '@/types/merchant';
import { Insight } from '@/types/insight';
import { addInsight } from '@/lib/db/operations';
import { formatCurrency } from '@/lib/utils/formatting';

export async function generateInsights(
  merchants: Merchant[],
  period: string
): Promise<void> {
  const insights: Omit<Insight, 'id' | 'created_at'>[] = [];

  // 1. TOP SPENDING - Maiores ralos
  const topMerchants = merchants
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  insights.push({
    type: 'top_spending',
    title: 'Maiores Ralos do Mês',
    description: `${topMerchants[0]?.name} lidera com ${formatCurrency(topMerchants[0]?.total_spent ?? 0)}`,
    priority: 10,
    period,
    data: {
      merchants: topMerchants.map((m) => ({
        name: m.name,
        amount: m.total_spent,
        count: m.transaction_count,
      })),
    },
  });

  // 2. SUBSCRIPTIONS - Assinaturas
  const subscriptionKeywords = ['netflix', 'spotify', 'prime', 'disney', 'youtube', 'cloud', 'ai'];
  const subscriptions = merchants.filter((m) =>
    subscriptionKeywords.some((k) => m.name.toLowerCase().includes(k))
  );

  if (subscriptions.length > 0) {
    const total = subscriptions.reduce((sum, m) => sum + m.total_spent, 0);
    insights.push({
      type: 'subscriptions',
      title: 'Suas Assinaturas',
      description: `${subscriptions.length} serviços ativos custam ${formatCurrency(total)}/mês`,
      priority: 8,
      period,
      data: {
        subscriptions: subscriptions.map((s) => ({
          name: s.name,
          amount: s.total_spent,
        })),
        total,
      },
    });
  }

  // 3. ALERTS - Delivery alto
  const deliveryKeywords = ['ifood', 'uber eats', 'rappi', '99food'];
  const delivery = merchants.filter((m) =>
    deliveryKeywords.some((k) => m.name.toLowerCase().includes(k))
  );

  if (delivery.length > 0) {
    const total = delivery.reduce((sum, m) => sum + m.total_spent, 0);
    const count = delivery.reduce((sum, m) => sum + m.transaction_count, 0);

    if (total > 500) {
      insights.push({
        type: 'alert',
        title: 'Delivery em Alta',
        description: `${formatCurrency(total)} em ${count} pedidos este mês`,
        priority: 9,
        period,
        data: { total, count, merchants: delivery },
      });
    }
  }

  // Salvar insights
  for (const insight of insights) {
    await addInsight(insight);
  }
}
