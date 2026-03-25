// ============================================
// X-Sovereign LLM Brain - Client Bridge
// Calls the secure server-side API at /api/llm
// ============================================

import { AgentTask, TaskType } from "@/types";

interface LLMParseResult {
  intents: string[];
  tasks: AgentTask[];
  reasoning: string;
}

export async function parsCommandWithLLM(
  command: string,
  walletConnected: boolean
): Promise<LLMParseResult | null> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, walletConnected }),
    });

    if (!res.ok) return null;

    const result = await res.json();
    if (result.success && result.data) {
      const parsed = result.data;
      
      // Validate the tasks have the right shape
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) return null;
      
      parsed.tasks = parsed.tasks.map((t: any) => ({
        type: t.type as TaskType,
        label: t.label || t.type,
        source: t.source || "internal",
        agentName: t.agentName || "SovereignAgent",
      }));
      
      return parsed as LLMParseResult;
    }
    return null;
  } catch {
    return null;
  }
}
