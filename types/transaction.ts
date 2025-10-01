export type TransactionType = 'debit' | 'credit' | 'pix';

export interface Transaction {
  id: string;
  date: Date;
  time?: string;
  description: string;
  amount: number; // Negativo para saídas
  type: TransactionType;
  raw_description: string;
  merchant_id?: string;
  category?: string;
  source_file: string;
  metadata?: {
    installments?: {
      current: number;
      total: number;
    };
    original_bank_category?: string;
  };
  created_at: Date;
}

export interface ExtractionResult {
  transactions: Omit<Transaction, 'id' | 'created_at'>[];
  metadata: {
    file_name: string;
    processed_at: Date;
    total_transactions: number;
    period?: {
      start: Date;
      end: Date;
    };
  };
}
