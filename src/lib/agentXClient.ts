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
 * Registers agent usage on the LIVE AgentMarket.sol contract via MetaMask.
 * Calls: useAgent(agentId) → prompts user to sign transaction
 */
export async function useAgent(agentId: number, taskType: string = "execution"): Promise<{ success: boolean; txHash: string }> {
  try {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No Web3 wallet found. Please install MetaMask.");
    }

    const { ethers } = await import("ethers");
    const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI } = await import("@/lib/contractConfig");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, signer);

    const tx = await contract.useAgent(agentId);
    const receipt = await tx.wait();
    
    if (receipt?.status === 1) {
      return { success: true, txHash: tx.hash };
    }
    throw new Error("Transaction reverted");
  } catch (error: any) {
    console.error("X402 payment failed:", error);
    throw new Error(`On-chain useAgent failed: ${error.message || "User denied transaction signature"}`);
  }
}
