export interface Merchant {
  id: string;
  name: string;
  variations: string[]; // Lista de nomes raw que mapeiam para este
  category_suggestion?: string;
  total_spent: number;
  transaction_count: number;
  last_seen: Date;
  created_at: Date;
}

export interface MerchantMapping {
  raw_name: string; // Primary key
  merchant_id: string;
  confirmed: boolean; // Confirmado pelo usuário ou inferido?
  created_at: Date;
}
