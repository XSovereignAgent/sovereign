// ============================================
// X-Sovereign Core Types
// ============================================

export type TaskType =
  | "fetch_trends"
  | "analyze_security"
  | "execute_trade"
  | "fetch_portfolio"
  | "rebalance"
  | "mint_agent"
  | "burn_agent";

export type AgentSource = "internal" | "external";

export interface AgentTask {
  type: TaskType;
  label: string;
  source: AgentSource;
  agentName?: string;
  data?: any;
}

export interface ExecutionLog {
  id: string;
  timestamp: number;
  source: "parser" | "planner" | "internal" | "x-sovereign" | "x402" | "execution" | "tx" | "error" | "agent-x";
  message: string;
}

export interface ExternalAgent {
  id: number;
  name: string;
  role: string;
  price: string;
  usageCount: number;
  metadataURI: string;
}

export interface ParsedIntent {
  raw: string;
  intents: string[];
  tasks: AgentTask[];
}
export interface ContractStats {
  address: string;
  totalHires: string;
  agentsMinted: string;
}
