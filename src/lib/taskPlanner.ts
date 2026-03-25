// ============================================
// X-Sovereign Task Planner
// Orders tasks into a safe execution sequence
// ============================================

import { AgentTask } from "@/types";

// Priority order: admin -> data first → security → execution
const TASK_PRIORITY: Record<string, number> = {
  mint_agent: 0,
  fetch_portfolio: 1,
  fetch_trends: 2,
  analyze_security: 3,
  rebalance: 4,
  execute_trade: 5,
  burn_agent: 6,
};

export function planTasks(tasks: AgentTask[]): AgentTask[] {
  return [...tasks].sort(
    (a, b) => (TASK_PRIORITY[a.type] ?? 99) - (TASK_PRIORITY[b.type] ?? 99)
  );
}
