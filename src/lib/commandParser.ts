// ============================================
// X-Sovereign Command Parser
// Detects intents from natural language input
// ============================================

import { AgentTask, ParsedIntent } from "@/types";

const INTENT_PATTERNS: { pattern: RegExp; intent: string; task: AgentTask }[] = [
  {
    pattern: /\b(trend|trending|hot|popular|signal|smart money|whale)\b/i,
    intent: "fetch_trends",
    task: {
      type: "fetch_trends",
      label: "Fetch trending tokens via OKX Signal",
      source: "internal",
      agentName: "TrendAnalyzer",
    },
  },
  {
    pattern: /\b(safe|security|audit|scan|honeypot|rug|malicious|contract)\b/i,
    intent: "analyze_security",
    task: {
      type: "analyze_security",
      label: "Analyze contract security",
      source: "external",
      agentName: "SecurityAgent",
    },
  },
  {
    pattern: /\b(buy|swap|trade|purchase|execute|sell)\b/i,
    intent: "execute_trade",
    task: {
      type: "execute_trade",
      label: "Execute trade via X-Agent Market (Action Agent)",
      source: "external",
      agentName: "ActionAgent",
    },
  },
  {
    pattern: /\b(portfolio|balance|holdings|wallet|assets)\b/i,
    intent: "fetch_portfolio",
    task: {
      type: "fetch_portfolio",
      label: "Fetch portfolio data",
      source: "internal",
      agentName: "PortfolioManager",
    },
  },
  {
    pattern: /\b(rebalance|optimize|redistribute|adjust)\b/i,
    intent: "rebalance",
    task: {
      type: "rebalance",
      label: "Rebalance portfolio holdings",
      source: "internal",
      agentName: "RebalancerAgent",
    },
  },
  {
    pattern: /\b(mint|create|spawn|generate|hire)\b/i,
    intent: "mint_agent",
    task: {
      type: "mint_agent",
      label: "Autonomous Agent Minting",
      source: "internal",
      agentName: "AgentSpawner",
    },
  },
  {
    pattern: /\b(burn|fire|destroy|delete|remove|retire)\b/i,
    intent: "burn_agent",
    task: {
      type: "burn_agent",
      label: "Autonomous Agent Burning",
      source: "internal",
      agentName: "AgentRecycler",
    },
  },
  {
    pattern: /\b(list|show|my|search|all|have|own|find|what)\b.*\bagent/i,
    intent: "list_agents",
    task: {
      type: "list_agents",
      label: "List all agents on X-Agent Market",
      source: "internal",
      agentName: "MarketScanner",
    },
  },
];

export function parseCommand(input: string): ParsedIntent {
  const detectedIntents: string[] = [];
  const tasks: AgentTask[] = [];

  for (const { pattern, intent, task } of INTENT_PATTERNS) {
    if (pattern.test(input)) {
      detectedIntents.push(intent);
      
      let taskData = undefined;
      if (intent === "execute_trade") {
        const match = input.match(/([\d.]+)\s*(OKB|USDC|ETH|USDT)/i);
        if (match) {
          taskData = { amountStr: match[1], token: match[2].toUpperCase() };
        }
      } else if (intent === "burn_agent" || intent === "mint_agent") {
        const roleMatch = input.match(/\b(brain|security|research|execution|economy|action|signal|portfolio|rebalancer)\b/i);
        if (roleMatch) {
          taskData = { role: roleMatch[1].charAt(0).toUpperCase() + roleMatch[1].slice(1).toLowerCase() };
        }
      }

      tasks.push({ ...task, data: taskData });
    }
  }

  // If no intents detected, default to a general query
  if (tasks.length === 0) {
    detectedIntents.push("general_query");
    tasks.push({
      type: "fetch_trends",
      label: "General market overview",
      source: "internal",
      agentName: "TrendAnalyzer",
    });
  }

  return {
    raw: input,
    intents: detectedIntents,
    tasks,
  };
}
