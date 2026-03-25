// ============================================
// X-Sovereign LLM Brain - powered by Groq
// Uses Llama 3.3 70B for FREE intelligent parsing
// ============================================

import { AgentTask, TaskType } from "@/types";

interface LLMParseResult {
  intents: string[];
  tasks: AgentTask[];
  reasoning: string;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the brain of X-Sovereign, an autonomous AI trading terminal running on X Layer blockchain (OKX ecosystem).

Your job is to analyze user commands and determine what tasks the agent should execute.

Available tasks:
- fetch_trends: Fetch real-time trending tokens and smart money signals from OKX
- analyze_security: Check if tokens are safe (honeypot detection, risk analysis)
- execute_trade: Execute a token swap/buy on X Layer via OKX DEX
- fetch_portfolio: Fetch the user's current wallet holdings
- rebalance: Analyze and suggest portfolio rebalancing
- mint_agent: Hire a new AI agent from the on-chain Agent Market
- burn_agent: Retire/burn an existing agent to reclaim funds

You MUST respond with valid JSON only, no markdown, no explanation outside JSON.
Format:
{
  "intents": ["short label for each intent detected"],
  "reasoning": "1-2 sentence explanation of what you understood and why you picked these tasks",
  "tasks": [
    {
      "type": "fetch_trends",
      "label": "Fetch trending tokens via OKX Signal",
      "source": "internal",
      "agentName": "TrendAnalyzer"
    }
  ]
}

Rules:
- source is "internal" for fetch_trends, fetch_portfolio, rebalance, mint_agent, burn_agent
- source is "external" for analyze_security, execute_trade (these use on-chain agents from the market)
- agentName should be creative and professional
- Keep tasks in logical order (fetch before analyze, analyze before execute)
- If the user wants to "buy safe tokens", include fetch_trends → analyze_security → execute_trade
- If the user asks for portfolio, include fetch_portfolio
- If the user mentions security or "is X safe", include analyze_security
- Only include relevant tasks, don't add unnecessary ones`;

export async function parsCommandWithLLM(
  command: string,
  walletConnected: boolean
): Promise<LLMParseResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const userContext = walletConnected
    ? "The user has a wallet connected."
    : "The user does NOT have a wallet connected. Do NOT include execute_trade tasks.";

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Context: ${userContext}\n\nUser command: "${command}"\n\nAnalyze this and return the JSON task plan.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as LLMParseResult;

    // Validate the tasks have the right shape
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return null;
    parsed.tasks = parsed.tasks.map((t) => ({
      type: t.type as TaskType,
      label: t.label || t.type,
      source: t.source || "internal",
      agentName: t.agentName || "SovereignAgent",
    }));

    return parsed;
  } catch {
    return null;
  }
}
