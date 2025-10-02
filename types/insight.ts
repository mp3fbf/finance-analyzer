export type InsightType =
  | 'top_spending' // Maiores ralos
  | 'growth' // Crescimento significativo
  | 'subscriptions' // Consolidação de assinaturas
  | 'alert' // Alertas (sobreposição, anomalias)
  | 'contextual' // Gastos contextuais (crianças, trabalho)
  | 'opportunity' // Oportunidades de economia
  | 'comparison'; // Comparativo mensal

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: number; // 1-10, maior = mais importante
  data: any; // Dados específicos do insight
  period: string; // Ex: "2024-09", "2024-Q3"
  created_at: Date;
  dismissed?: boolean;
}
