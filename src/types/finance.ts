export type TxType = "debit" | "credit";

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: TxType;
  currency?: string;
  category?: string;
  account?: string;
  balance?: number;
}

export interface ParseResult {
  transactions: Transaction[];
  currency: string;
}

export interface Anomaly {
  index: number;
  reason: string;
  amount: number;
  description: string;
  date: string;
}

export type AIProvider = "openai" | "openai_compatible" | "ollama";

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
