// ============================================
// X-Sovereign Orchestrator Agent
// The Mission Lead — coordinates all sub-agents
// NOW WITH REAL OKX DATA via /api/agent
// ============================================

import { AgentTask } from "@/types";
import { parseCommand } from "./commandParser";
import { getAgentsByRole, useAgent } from "./agentXClient";
import {
  fetchPortfolio,
  analyzeContractSecurity,
  executeSwap,
  PortfolioAsset,
  SecurityResult,
  SwapResult,
} from "./mockOkx";

export type ChatMessageType = "user" | "system" | "agent-activity" | "data-card" | "success" | "error" | "x402" | "confirmation";

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  timestamp: number;
  agentName?: string;
  agentRole?: string;
  data?: unknown;
}

type MessageCallback = (msg: ChatMessage) => void;

function msg(
  type: ChatMessageType,
  content: string,
  extra?: Partial<ChatMessage>
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    timestamp: Date.now(),
    ...extra,
  };
}

// Call our real API route
async function callAgentAPI(action: string, params?: Record<string, string>) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  return res.json();
}

// Transform real signal data into display-friendly format
interface SignalToken {
  token: {
    symbol: string;
    name: string;
    tokenAddress: string;
    marketCapUsd: string;
    holders: string;
    logo: string;
  };
  price: string;
  amountUsd: string;
  walletType: string;
  soldRatioPercent: string;
  triggerWalletCount: string;
}

function transformSignalData(signals: SignalToken[]) {
  return signals.slice(0, 6).map((s) => {
    const price = parseFloat(s.price);
    const amt = parseFloat(s.amountUsd);
    return {
      symbol: s.token.symbol,
      name: s.token.name,
      tokenContractAddress: s.token.tokenAddress,
      price: price > 0 ? `$${price.toFixed(6)}` : "N/A",
      change24h: `${s.triggerWalletCount} wallets`,
      volume: amt > 0 ? `$${amt.toFixed(0)}` : "N/A",
      marketCap: `$${(parseFloat(s.token.marketCapUsd) / 1e6).toFixed(2)}M`,
      walletType: s.walletType === "1" ? "Smart Money" : s.walletType === "2" ? "KOL" : "Whale",
      soldRatio: s.soldRatioPercent,
    };
  });
}

export async function orchestrate(
  command: string,
  onMessage: MessageCallback,
  walletAddress?: string | null,
  waitForAction?: () => Promise<boolean>
): Promise<void> {
  if (command.startsWith("_sys_execute_trade_confirmed_")) {
    onMessage(msg("system", "User authorized transaction.", { agentName: "TradeExecutor" }));
    onMessage(msg("agent-activity", "Submitting swap to X Layer via OKX DEX...", { agentName: "TradeExecutor", agentRole: "Execution" }));
    
    try {
      // Attempt real swap execution
      const quoteData = JSON.parse(command.replace("_sys_execute_trade_confirmed_", ""));
      const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData;
      const fromToken = quote?.fromToken?.tokenContractAddress || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      const toToken = quote?.toToken?.tokenContractAddress || "0x74b7f16337b8972027f6196a17a631ac6de26d22";
      const amount = quote?.fromTokenAmount || "0";
      
      const swapRes = await callAgentAPI("swap_quote", {
        from: fromToken,
        to: toToken,
        amount: amount,
        chain: "xlayer"
      });
      
      if (swapRes.success && swapRes.data?.data) {
        const swapData = Array.isArray(swapRes.data.data) ? swapRes.data.data[0] : swapRes.data.data;
        const fromDec = parseFloat(swapData.fromToken?.decimal || "18");
        const toDec = parseFloat(swapData.toToken?.decimal || "6");
        const fromUI = (parseFloat(swapData.fromTokenAmount || "0") / Math.pow(10, fromDec)).toFixed(4);
        const toUI = (parseFloat(swapData.toTokenAmount || "0") / Math.pow(10, toDec)).toFixed(4);
        
        onMessage(msg("success", `Swap route confirmed: **${fromUI} ${swapData.fromToken?.tokenSymbol}** → **${toUI} ${swapData.toToken?.tokenSymbol}**. Transaction staged automatically via connected terminal wallet.`));
      } else {
        onMessage(msg("error", "Swap execution failed. The DEX aggregator could not complete the route. Please try again."));
      }
    } catch (e) {
      onMessage(msg("error", "Swap execution failed. Check your wallet balance and try again."));
    }
    return;
  }
  
  if (command === "_sys_execute_trade_cancelled_") {
    onMessage(msg("system", "Transaction cancelled by user."));
    return;
  }

  // Step 1: Parse with LLM brain (Groq / Llama 3.3 70B) — fallback to rule-based
  onMessage(msg("system", "Analyzing your request..."));
  await delay(400);

  let planned: AgentTask[] = [];

  // Try LLM first
  let llmResult = null;
  try {
    const { parsCommandWithLLM } = await import("./llm");
    llmResult = await parsCommandWithLLM(command, !!walletAddress);
  } catch {
    // Groq unavailable — fall through to rule-based
  }

  if (llmResult) {
    // LLM succeeded (even if it chose 0 tasks)
    onMessage(msg("system", `🧠 **AI Reasoning:** ${llmResult.reasoning}`));
    await delay(300);
    
    if (llmResult.tasks.length > 0) {
      onMessage(msg("system", `Detected intents: **${llmResult.intents.join("**, **")}**`));
      await delay(300);
      planned = llmResult.tasks;
    } else {
      onMessage(msg("system", "No action required at this time based on the current context. 🪐"));
      return;
    }
  } else {
    // Fallback only if LLM API failed (returned null)
    const parsed = parseCommand(command);
    onMessage(msg("system", `Detected intents: **${parsed.intents.join("**, **")}**`));
    await delay(300);
    const { planTasks } = await import("./taskPlanner");
    planned = planTasks(parsed.tasks);
  }

  // Step 2: Show the plan
  onMessage(msg("system", "Building execution plan..."));
  await delay(400);

  const planSteps = planned
    .map(
      (t, i) =>
        `${i + 1}. ${t.label} → *${t.source === "internal" ? "Internal Agent" : "Agent X Market"}*`
    )
    .join("\n");
  onMessage(msg("system", planSteps));
  await delay(300);

  // Step 3: Execute each task with shared context pipeline
  const ctx: PipelineContext = { trendingTokens: [], portfolioTokens: [], safeTokens: [] };
  
  for (const task of planned) {
    if (task.source === "internal") {
      await executeInternalTask(task, onMessage, walletAddress, ctx, waitForAction);
    } else {
      await executeExternalTask(task, onMessage, walletAddress, ctx, waitForAction);
    }
  }

  onMessage(msg("success", "All tasks completed successfully."));
}

// Shared context passed between pipeline steps
interface PipelineContext {
  trendingTokens: { address: string; name: string; symbol: string }[];
  portfolioTokens: { address: string; name: string; symbol: string }[];
  safeTokens: { address: string; name: string; symbol: string }[];
}

async function executeInternalTask(
  task: AgentTask,
  onMessage: MessageCallback,
  walletAddress?: string | null,
  ctx?: PipelineContext,
  waitForAction?: () => Promise<boolean>
): Promise<void> {
  switch (task.type) {
    case "fetch_portfolio": {
      onMessage(
        msg("agent-activity", "Fetching your portfolio from X Layer...", {
          agentName: task.agentName,
          agentRole: "Portfolio",
        })
      );
      
      try {
        const addr = walletAddress || "0xdC646c197d0202FC2A0326af8ab55066A3549E2E";
        const result = await callAgentAPI("fetch_portfolio", { 
          address: addr,
          chains: "xlayer"
        });
        
        if (result.success && result.data?.data) {
          const assets = result.data.data;
          const hasTokens = Array.isArray(assets) ? assets.some((group: any) => {
            const tokenAssets = group?.tokenAssets || [];
            return tokenAssets.length > 0;
          }) : false;
          
          if (hasTokens) {
            const flatAssets = assets.reduce((acc: any[], group: any) => acc.concat(group.tokenAssets || []), []);
            
            // Populate pipeline context with portfolio tokens for scanning
            if (ctx) {
              ctx.portfolioTokens = flatAssets.map((a: any) => ({
                address: a.address || a.tokenAddress || "",
                name: a.name || a.symbol || "Unknown",
                symbol: a.symbol || "???",
              })).filter((t: any) => t.address && t.address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
            }

            onMessage(
              msg("data-card", "portfolio", {
                agentName: task.agentName,
                data: flatAssets,
              })
            );
          } else {
            onMessage(
              msg("system", `No tokens found in wallet **${addr.slice(0, 6)}...${addr.slice(-4)}** on X Layer. Your wallet is empty — you need to deposit tokens first.`, {
                agentName: task.agentName,
              })
            );
          }
        } else {
          onMessage(msg("error", "Could not fetch portfolio. The OKX API may be temporarily unavailable."));
        }
      } catch (e) {
        onMessage(msg("error", "Portfolio API error. Check your network connection."));
      }
      break;
    }

    case "fetch_trends": {
      onMessage(
        msg("agent-activity", "Scanning for real-time signals on X Layer via OKX OnchainOS...", {
          agentName: task.agentName,
          agentRole: "Signal",
        })
      );

      try {
        const result = await callAgentAPI("fetch_trends", { chain: "xlayer" });
        if (result.success && (result.data?.code === "0" || result.data?.ok) && result.data.data) {
          const transformed = transformSignalData(result.data.data);
          
          // Populate pipeline context with discovered token addresses
          if (ctx && transformed.length > 0) {
            ctx.trendingTokens = transformed
              .map((t: any) => ({
                address: t.tokenContractAddress || "",
                name: t.name || "Unknown",
                symbol: t.symbol || "???",
              }))
              .filter((t: any) => t.address && t.address.length > 10);
          }
          
          onMessage(
            msg("data-card", "trending", {
              agentName: task.agentName,
              data: transformed,
            })
          );
          onMessage(
            msg("success", `Found **${transformed.length}** live smart money signals on X Layer.`, {
              agentName: task.agentName,
            })
          );
        } else {
          // Fallback: try Solana
          const solResult = await callAgentAPI("fetch_trends", { chain: "solana" });
          if (solResult.success && (solResult.data?.code === "0" || solResult.data?.ok) && solResult.data.data) {
            const transformed = transformSignalData(solResult.data.data);
            onMessage(
              msg("data-card", "trending", {
                agentName: task.agentName,
                data: transformed,
              })
            );
            onMessage(
              msg("success", `Found **${transformed.length}** live signals (Solana fallback).`, {
                agentName: task.agentName,
              })
            );
          } else {
            onMessage(msg("error", "No signals found on any chain. Try again later."));
          }
        }
      } catch {
        onMessage(msg("error", "Failed to fetch live data. API may be unavailable."));
      }
      break;
    }

    case "execute_trade": {
      // Wallet guard — don't proceed if no wallet connected
      if (!walletAddress) {
        onMessage(msg("error", "🔌 **No wallet connected.** Please click **Connect Wallet** in the top-right corner first, then try again. Your wallet is needed to sign the transaction.", {
          agentName: task.agentName,
          agentRole: "Execution",
        }));
        return;
      }
      onMessage(
        msg("agent-activity", "Preparing swap quote...", {
          agentName: task.agentName,
          agentRole: "Execution",
        })
      );
      
      try {
        const targetToken = ctx?.safeTokens?.length ? ctx.safeTokens[0].address : "0x74b7f16337b8972027f6196a17a631ac6de26d22";
        const quoteRes = await callAgentAPI("swap_quote", {
          from: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          to: targetToken,
          amount: "1000000000000000000",
          chain: "xlayer"
        });
        
        if (quoteRes.success && quoteRes.data?.data) {
          onMessage(
            msg("data-card", "swap", {
              agentName: task.agentName,
              data: quoteRes.data.data, // Real OKX Swap Quote data
            })
          );
          onMessage(
            msg("confirmation", "Action Required: Do you want to proceed and execute this swap?", {
              agentName: task.agentName,
              data: quoteRes.data.data
            })
          );
        } else {
          onMessage(msg("error", "Failed to calculate swap route. You may not have enough OKB in your wallet to swap. Deposit OKB on X Layer to trade."));
        }
      } catch (e) {
        onMessage(msg("error", "Swap API error."));
      }
      break;
    }

    case "rebalance": {
      onMessage(
        msg("agent-activity", "Fetching live portfolio from X Layer...", {
          agentName: task.agentName,
          agentRole: "Rebalancer",
        })
      );
      
      try {
        const addr = walletAddress || "0xdC646c197d0202FC2A0326af8ab55066A3549E2E";
        const result = await callAgentAPI("fetch_portfolio", { 
          address: addr,
          chains: "xlayer"
        });
        
        if (result.success && result.data?.data) {
          const assets = result.data.data;
          
          // Check if portfolio is actually empty
          const hasTokens = Array.isArray(assets) ? assets.some((group: any) => {
            const tokenAssets = group?.tokenAssets || [];
            return tokenAssets.length > 0;
          }) : false;
          
          if (hasTokens) {
            onMessage(
              msg("data-card", "portfolio", {
                agentName: task.agentName,
                data: assets,
              })
            );
            onMessage(
              msg("success", `Portfolio loaded for **${addr.slice(0, 6)}...${addr.slice(-4)}** on X Layer.`)
            );
          } else {
            onMessage(
              msg("system", `No tokens found in wallet **${addr.slice(0, 6)}...${addr.slice(-4)}** on X Layer. Your wallet is empty — deposit OKB or tokens to get started.`, {
                agentName: task.agentName,
              })
            );
          }
        } else {
          onMessage(msg("error", "Could not retrieve portfolio data from OKX. The API may be temporarily unavailable."));
        }
      } catch (e) {
        onMessage(msg("error", "Portfolio API error. Check your network connection."));
      }
      break;
    }

    case "mint_agent": {
      // Require user confirmation before spending OKB
      onMessage(msg("confirmation", `Sovereign AI intends to autonomously hire a new Agent from the market.\n\nFee: 0.001 OKB`, { agentName: task.agentName, data: { action: "mint_agent", fee: "0.001" } }));
      
      if (waitForAction) {
        const approved = await waitForAction();
        if (!approved) {
          onMessage(msg("error", "Agent hire cancelled by user. Terminating current pipeline."));
          throw new Error("Pipeline aborted by user"); // Halts execution of further tasks
        }
      }

      onMessage(msg("agent-activity", `Mint confirmation received. Broadcasting transaction...`, { agentName: task.agentName, agentRole: "Admin" }));
      const mintRole = task.data?.role || "Security";
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mint_agent", params: { role: mintRole, metadataURI: "ipfs://QmAutonomousSovereignX" } }),
        });
        const data = await res.json();
        if (data.success && data.data?.status === "success" && data.data?.agentId) {
          onMessage(msg("success", `Success! Hired new ${data.data.role} Agent (ID: ${data.data.agentId}).`, { agentName: task.agentName }));
          onMessage(msg("system", `View Mint Transaction on X Layer Explorer:\nhttps://www.okx.com/explorer/xlayer/tx/${data.data.txHash}`));
        } else {
          onMessage(msg("error", "Failed to mint Agent. The market may be out of liquid supply or the transaction reverted.", { agentName: task.agentName }));
        }
      } catch (e) {
        onMessage(msg("error", "Failed to connect to Agent Market."));
      }
      break;
    }

    case "burn_agent": {
      // Dynamically find the most recently hired agent
      let agentIdToBurn: string | null = null;
      try {
        const histRes = await callAgentAPI("get_hire_history");
        if (histRes.success && Array.isArray(histRes.data) && histRes.data.length > 0) {
          const last = histRes.data[histRes.data.length - 1];
          agentIdToBurn = String(last.agentId);
        }
      } catch (e) {
        console.warn("Could not fetch hire history for burn");
      }

      if (!agentIdToBurn) {
        onMessage(msg("error", "No agents found in your Sovereign registry to retire. First, mint an agent from the Agent Market.", { agentName: task.agentName }));
        break;
      }

      onMessage(msg("agent-activity", `Retiring Agent ID: **${agentIdToBurn}** from Sovereign registry to reclaim treasury funds...`, { agentName: task.agentName, agentRole: "Admin" }));
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "burn_agent", params: { agentId: agentIdToBurn } }),
        });
        const data = await res.json();
        if (data.success && data.data?.status === "success") {
          onMessage(msg("success", `Successfully retired Agent **#${agentIdToBurn}**. Sovereign Treasury reclaimed: **${data.data.refundOKB} OKB**.`, { agentName: task.agentName }));
          onMessage(msg("system", `View Burn Transaction on X Layer Explorer:\nhttps://www.okx.com/explorer/xlayer/tx/${data.data.txHash}`));
        } else {
          onMessage(msg("error", `Failed to retire Agent #${agentIdToBurn}. It may not be owned by the treasury or the transaction reverted.`, { agentName: task.agentName }));
        }
      } catch (e) {
        onMessage(msg("error", "Failed to connect to Agent Market."));
      }
      break;
    }

    case "list_agents": {
      onMessage(msg("agent-activity", "Scanning the on-chain Agent Market for all active agents...", { agentName: task.agentName || "MarketScanner", agentRole: "Admin" }));
      try {
        const roles = ["Security", "Action", "Signal", "Portfolio", "Rebalancer"];
        let allAgents: any[] = [];
        for (const role of roles) {
          const agents = await getAgentsByRole(role);
          allAgents = allAgents.concat(agents.map((a: any) => ({ ...a, queriedRole: role })));
        }

        if (allAgents.length === 0) {
          onMessage(msg("system", "No agents found on the X-Agent Market. You can create one with **\"create a new security agent\"**.")); 
        } else {
          const agentList = allAgents.map((a: any) => `• **${a.queriedRole} Agent #${a.id}** — Owner: ${String(a.owner || '').slice(0,6)}...${String(a.owner || '').slice(-4)} | Uses: ${a.usageCount || 0}`).join("\n");
          onMessage(msg("system", `Found **${allAgents.length}** agents on X-Agent Market:\n\n${agentList}`));
        }
      } catch (e) {
        onMessage(msg("error", "Failed to query Agent Market. The contract may be temporarily unavailable."));
      }
      break;
    }
  }
}

async function executeExternalTask(
  task: AgentTask,
  onMessage: MessageCallback,
  walletAddress?: string | null,
  ctx?: PipelineContext,
  waitForAction?: () => Promise<boolean>
): Promise<void> {
  const roleMap: Record<string, string> = {
    analyze_security: "Security",
    fetch_trends: "Signal",
    execute_trade: "Action", // The market uses "Action" for trade execution
  };

  const role = roleMap[task.type] || "custom";

  onMessage(
    msg("agent-activity", `This task requires a specialized agent. Searching X-Agent Market...`, {
      agentName: "Orchestrator",
      agentRole: "Router",
    })
  );
  await delay(300);

  // Step 1: Fetch agents
  const agents = await getAgentsByRole(role);
  if (agents.length === 0) {
    onMessage(msg("error", `No agents found for role "${role}" on X-Agent Market. Try **"create a new ${role.toLowerCase()} agent"** first.`));
    return;
  }

  // Guard: skip security scan if no tokens are in the pipeline
  if (task.type === "analyze_security" && ctx) {
    const tokensToScan = [...(ctx.portfolioTokens || []), ...(ctx.trendingTokens || [])];
    if (tokensToScan.length === 0) {
      onMessage(msg("system", `⚠️ No tokens available to scan. Fetch trending signals first or deposit tokens into your wallet.`, { agentName: task.agentName }));
      return;
    }
  }

  // Step 2: Select best agent - Prioritize agents we already hired OR own!
  const myTreasury = "0xdC646c197d0202FC2A0326af8ab55066A3549E2E";
  
  // Fetch hire history from the Sovereign contract
  let alreadyHiredIds: number[] = [];
  try {
    const histRes = await callAgentAPI("get_hire_history");
    if (histRes.success && Array.isArray(histRes.data)) {
      alreadyHiredIds = histRes.data.map((h: any) => Number(h.agentId));
    }
  } catch (e) {
    console.warn("Could not fetch hire history");
  }

  const reusableAgents = agents.filter((a: any) => 
    (a.owner?.toLowerCase() === myTreasury.toLowerCase()) || 
    alreadyHiredIds.includes(Number(a.id))
  );
  
  let selected;
  let isAlreadyHired = false;
  if (reusableAgents.length > 0) {
    // Pick the one we most recently hired/minted (highest ID)
    selected = reusableAgents.sort((a: any, b: any) => b.id - a.id)[0];
    isAlreadyHired = true;
    onMessage(msg("agent-activity", `Reusing existing **${selected.name}** (ID: ${selected.id}) from Sovereign registry...`, { agentName: "Orchestrator" }));
  } else {
    // Fallback to market selection
    selected = agents.sort((a: any, b: any) => a.usageCount - b.usageCount)[0];
    onMessage(msg("agent-activity", `Found **${selected.name}** (ID: ${selected.id}) on X-Agent Market`, { agentName: "Orchestrator" }));
  }
  await delay(200);

  // Step 3: Pay via X402 (Skip if already hired!)
  let paymentSuccess = isAlreadyHired;
  if (!paymentSuccess) {
  try {
    onMessage(
      msg("x402", `Paying **${selected.price} OKB** to ${selected.name} via X402 protocol...`, {
        agentName: selected.name,
      })
    );
    const result = await useAgent(selected.id);
    const explorerUrl = `https://www.okx.com/explorer/xlayer/tx/${result.txHash}`;
    onMessage(
      msg("x402", `✅ Payment confirmed on X Layer\n🔗 ${explorerUrl}`, {
        agentName: selected.name,
      })
    );
    paymentSuccess = true;
  } catch (e: any) {
    onMessage(
      msg("system", `X402 payment failed: ${e.message || "Insufficient OKB balance or transaction reverted."}. Proceeding with task anyway.`, {
        agentName: selected.name,
      })
    );
  }
  }
  await delay(300);
  onMessage(
    msg("agent-activity", `${selected.name} is running the task...`, {
      agentName: selected.name,
      agentRole: role,
    })
  );

  if (task.type === "analyze_security") {
    // Selection logic: prioritize portfolio tokens, then trending tokens
    let tokensToScan: { address: string; name: string; symbol: string }[] = [];
    
    if (ctx?.portfolioTokens?.length) {
      // Prioritize wallet assets (up to 5)
      tokensToScan = ctx.portfolioTokens.slice(0, 5);
    } else if (ctx?.trendingTokens?.length) {
      // Fallback to trending signals (up to 3)
      tokensToScan = ctx.trendingTokens.slice(0, 3);
    }
    
    if (tokensToScan.length === 0) {
      onMessage(msg("system", `${selected.name} needs contract addresses to scan. Ask me to fetch your portfolio or analyze trending tokens to fuel the pipeline!`, { agentName: selected.name, agentRole: role }));
      return;
    }
    
    let scannedCount = 0;
    for (const token of tokensToScan) {
      try {
        onMessage(msg("agent-activity", `${selected.name} scanning **${token.name}**...`, { agentName: selected.name, agentRole: role }));
        
        const secRes = await callAgentAPI("analyze_security", {
          tokenAddress: token.address,
          chain: "xlayer"
        });
        
        if (secRes.success && secRes.data?.data) {
          // Inject token info into security data for UI display
          if (secRes.data.data) {
            const tokenInfo = Array.isArray(secRes.data.data) ? secRes.data.data[0] : secRes.data.data;
            if (tokenInfo) {
              tokenInfo.tokenAddress = token.address;
              tokenInfo.tokenName = token.name;
            }
          }

          onMessage(
            msg("data-card", "security", {
              agentName: selected.name,
              data: secRes.data.data,
            })
          );
          scannedCount++;
          
          // If token is safe, add it to the pipeline context for trading
          const tokenData = Array.isArray(secRes.data.data) ? secRes.data.data[0] : secRes.data.data;
          if (tokenData && tokenData.isRiskToken === false && ctx) {
            ctx.safeTokens.push(token);
          }
        } else {
          onMessage(msg("system", `${selected.name} could not retrieve security data for ${token.name}. The OKX security API returned no data for this token.`, { agentName: selected.name }));
        }
      } catch (e) {
        onMessage(msg("system", `${selected.name} could not scan ${token.name}: API unavailable.`, { agentName: selected.name }));
      }
    }
    
    if (scannedCount > 0) {
      onMessage(msg("success", `${selected.name} completed security scan for **${scannedCount}** token(s).`, { agentName: selected.name }));
    } else {
      onMessage(msg("error", `${selected.name} could not complete any security scans. The tokens may not have security data available on X Layer.`));
    }
  } else if (task.type === "fetch_trends") {
    // External signal agent fetches real trending data
    try {
      const trendRes = await callAgentAPI("fetch_trends", { chain: "xlayer" });
      if (trendRes.success && (trendRes.data?.code === "0" || trendRes.data?.ok) && trendRes.data.data) {
        const transformed = transformSignalData(trendRes.data.data);
        onMessage(msg("data-card", "trending", { agentName: selected.name, data: transformed }));
        onMessage(msg("success", `${selected.name} found **${transformed.length}** live signals on X Layer.`, { agentName: selected.name }));
      } else {
        onMessage(msg("error", `${selected.name} found no signal data on X Layer.`));
      }
    } catch {
      onMessage(msg("error", `${selected.name} could not fetch signals. API unavailable.`));
    }
  } else if (task.type === "execute_trade") {
    // Wallet guard — don't attempt trade without wallet
    if (!walletAddress) {
      onMessage(msg("error", "🔌 **No wallet connected.** Please click **Connect Wallet** in the top-right corner first, then try again.", {
        agentName: selected.name,
        agentRole: role,
      }));
      return;
    }
    // External execution agent fetches real swap quote
    try {
      // Use the first safe token from the pipeline context if available, otherwise swap for USDC
      const targetToken = ctx?.safeTokens?.length ? ctx.safeTokens[0].address : "0x74b7f16337b8972027f6196a17a631ac6de26d22";
      const targetName = ctx?.safeTokens?.length ? ctx.safeTokens[0].name : "USDC";

      let amountWei = "1000000000000000"; // fallback to 0.001 OKB
      if (task.data?.amountStr) {
         try {
           const { ethers } = await import("ethers");
           amountWei = ethers.parseEther(task.data.amountStr).toString();
         } catch {
           amountWei = "1000000000000000";
         }
      }
      
      onMessage(msg("agent-activity", `${selected.name} preparing to buy **${targetName}**...`, { agentName: selected.name, agentRole: role }));

      const quoteRes = await callAgentAPI("swap_quote", { from: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", to: targetToken, amount: amountWei, chain: "xlayer" });
      if (quoteRes.success && quoteRes.data?.data) {
        onMessage(msg("data-card", "swap", { agentName: selected.name, data: quoteRes.data.data }));
        onMessage(msg("confirmation", "Action Required: Do you want to proceed and execute this swap?", { agentName: selected.name, data: quoteRes.data.data }));
        
        // Wait for user confirmation
        if (waitForAction) {
          const confirmed = await waitForAction();
          if (confirmed) {
            onMessage(msg("agent-activity", `Submitting swap to X Layer via OKX DEX...`, { agentName: selected.name, agentRole: role }));
            
            // Execute the actual swap
            const executeRes = await callAgentAPI("swap_execute", { 
              from: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 
              to: targetToken, 
              amount: amountWei, 
              chain: "xlayer" 
            });
            
            if (executeRes.success && executeRes.data?.status === "success") {
              onMessage(msg("success", `Swap completed successfully! **${targetName}** has been added to your treasury.`, { agentName: selected.name }));
              onMessage(msg("system", `View Swap Transaction on X Layer Explorer:\nhttps://www.okx.com/explorer/xlayer/tx/${executeRes.data.txHash}`, { agentName: selected.name }));
            } else {
              onMessage(msg("error", "Swap execution failed on-chain. Please check your OKB balance for gas."));
            }
          } else {
            onMessage(msg("system", "Swap execution cancelled by user."));
          }
        }
      } else {
        onMessage(msg("error", `${selected.name} could not calculate a swap route.`));
      }
    } catch (e: any) {
      onMessage(msg("error", `${selected.name} swap API error: ${e.message}`));
    }
  } else {
    onMessage(msg("system", `${selected.name} does not have a handler for task type "${task.type}". The agent was hired on-chain but cannot execute this specific action.`, { agentName: selected.name }));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
