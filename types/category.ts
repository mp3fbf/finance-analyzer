export interface Category {
  id: string;
  name: string;
  description: string;
  rules?: {
    // Regras para auto-categorização
    merchants?: string[];
    time_range?: { start: string; end: string };
    keywords?: string[];
  };
  transaction_ids: string[];
  total_amount: number;
  created_at: Date;
  updated_at: Date;
}
