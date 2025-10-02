export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    insight_id?: string; // Se iniciou de um card
    transaction_ids?: string[]; // Transações referenciadas
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context: {
    period?: string;
    focus_area?: string;
  };
  created_at: Date;
  updated_at: Date;
}
