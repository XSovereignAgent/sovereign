// ============================================
// X-Agent Market Client (Integration Layer)
// Calls partner's LIVE AgentMarket.sol on X Layer Mainnet
// Contract: 0xF53e7cD080211b4c38369f2e5f1A0b9401B5470C
// ============================================

import { ExternalAgent } from "@/types";

// Maps X-Sovereign internal roles → partner's on-chain role names
const ROLE_MAP: Record<string, string> = {
  signal: "Research",
  security: "Security",
  execution: "Action",
  custom: "Brain",
  economy: "Economy",
};

/**
 * Fetches agents from the LIVE AgentMarket.sol contract by role.
 * Calls: getAgentsByRole(role) → reads on-chain data
 */
export async function getAgentsByRole(role: string): Promise<ExternalAgent[]> {
  const contractRole = ROLE_MAP[role] || role;
  
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_market_agents",
        params: { role: contractRole }
      })
    });
    
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((a: any) => ({
        id: a.id,
        name: `${a.role}Agent #${a.id}`,
        role: role, // Map back to internal role
        price: (Number(a.price) / 1e18).toFixed(6), // Wei → OKB
        usageCount: a.usageCount,
        metadataURI: a.metadataURI || "",
      }));
    }
  } catch (e) {
    console.error("Failed to fetch agents from AgentMarket contract:", e);
  }
  
  // No agents found on-chain
  return [];
}

/**
 * Registers agent usage on the LIVE AgentMarket.sol contract.
 * Calls: useAgent(agentId) → sends on-chain transaction
 */
export async function useAgent(agentId: number, taskType: string = "execution"): Promise<{ success: boolean; txHash: string }> {
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "use_market_agent",
        params: { agentId: agentId.toString() }
      })
    });
    
    const data = await res.json();
    if (data.success && data.data?.status === "success") {
      return { success: true, txHash: data.data.txHash };
    }
    
    throw new Error(data.error || "useAgent transaction failed");
  } catch (error: any) {
    console.error("X402 payment failed:", error);
    throw new Error(`On-chain useAgent failed: ${error.message || "Transaction reverted"}`);
  }
}
