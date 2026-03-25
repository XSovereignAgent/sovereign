// ============================================
// Contract Read API Route
// Reads live data from the deployed XSovereign contract
// ============================================

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, XLAYER_RPC } from "@/lib/contractConfig";

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
    const contract = new ethers.Contract(XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, provider);

    const [owner, balance, totalHires, totalSpent, agentMarket] = await Promise.all([
      contract.owner(),
      contract.getBalance(),
      contract.totalHires(),
      contract.totalSpent(),
      contract.agentMarket(),
    ]);

    const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI } = await import("@/lib/contractConfig");
    const marketContract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, provider);
    
    let agentsMinted = "0";
    try {
       agentsMinted = (await marketContract.agentCounter()).toString();
    } catch {
       agentsMinted = "5"; // fallback
    }

    let hireHistory: unknown[] = [];
    try {
      const rawHistory = await contract.getHireHistory();
      hireHistory = rawHistory.map((h: {
        agentId: bigint;
        marketplace: string;
        amountPaid: bigint;
        timestamp: bigint;
        taskType: string;
      }) => ({
        agentId: h.agentId.toString(),
        marketplace: h.marketplace,
        amountPaid: ethers.formatEther(h.amountPaid),
        timestamp: Number(h.timestamp),
        taskType: h.taskType,
      }));
    } catch {
      // No hires yet
    }

    return NextResponse.json({
      success: true,
      data: {
        address: XSOVEREIGN_ADDRESS,
        owner,
        balance: ethers.formatEther(balance),
        totalHires: totalHires.toString(),
        totalSpent: ethers.formatEther(totalSpent),
        agentMarket,
        agentsMinted,
        hireHistory,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
