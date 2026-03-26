import { NextRequest, NextResponse } from "next/server";
import { AgentTask, TaskType } from "@/types";

const NOUS_API_URL = process.env.LLM_API_URL || "https://inference-api.nousresearch.com/v1/chat/completions";
const NOUS_MODEL = process.env.LLM_MODEL || "Hermes-4-70B";

const SYSTEM_PROMPT = `You are a deep-thinking AI brain for X-Sovereign, an autonomous trading terminal on X Layer.
You may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering.
You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem.

Your job is to analyze user commands and determine what tasks the agent should execute.

Available task types:
- fetch_trends: Fetch real-time trending tokens and smart money signals from OKX
- analyze_security: Check if tokens are safe (honeypot detection, risk analysis)
- execute_trade: Execute a token swap/buy on X Layer via OKX DEX
- fetch_portfolio: Fetch the user's current wallet holdings
- rebalance: Analyze and suggest portfolio rebalancing
- mint_agent: Hire/create a NEW AI agent on-chain. You MUST include data.role with one of: "Security", "Action", "Signal", "Portfolio", "Rebalancer"
- burn_agent: Retire/burn an existing agent to reclaim funds
- list_agents: List all agents in the on-chain Agent Market (use when user says "show my agents", "search agents", "list agents", "what agents do I have")

You MUST respond with valid JSON only (after any <think> block), no markdown.
Format:
{
  "intents": ["short label for each intent detected"],
  "reasoning": "1-2 sentence explanation of what you understood and why you picked these tasks",
  "tasks": [
    {
      "type": "mint_agent",
      "label": "Create a new Action agent on-chain",
      "source": "internal",
      "agentName": "AgentSpawner",
      "data": { "role": "Action" }
    }
  ]
}

CRITICAL RULES:
1. If the user wants to "analyze holdings" but has NO wallet connected, return NO tasks.
2. If the user wants to "trade/buy" but has NO wallet connected, EXCLUDE execute_trade.
3. NEVER plan analyze_security ALONE without fetch_trends or fetch_portfolio before it.
4. If the user says "burn agent" or "retire agent", ONLY plan burn_agent.
5. For mint_agent: ALWAYS include data.role matching the user's request ("Action" for trading, "Security" for scanning, "Signal" for trends). Default to "Security" only if unspecified.
6. For list_agents: use this when the user asks to see, search, or list their agents.
7. source is "internal" for: fetch_trends, fetch_portfolio, rebalance, mint_agent, burn_agent, list_agents
8. source is "external" for: analyze_security, execute_trade
9. Keep tasks in logical order (fetch before analyze, analyze before execute)`;

export async function POST(req: NextRequest) {
  try {
    const { command, walletConnected } = await req.json();
    const apiKey = process.env.HERMES_API_KEY || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing API Key (HERMES or GROQ)" }, { status: 500 });
    }

    const userContext = walletConnected
      ? "The user has a wallet connected."
      : "The user does NOT have a wallet connected. Do NOT include execute_trade tasks.";

    const res = await fetch(NOUS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NOUS_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Context: ${userContext}\n\nUser command: "${command}"\n\nAnalyze this and return the JSON task plan.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ success: false, error: errorData.error?.message || "LLM API error" }, { status: res.status });
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from LLM");

    // Strip <think>...</think> blocks (Hermes-4 deep reasoning output)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
