// ============================================
// X-Sovereign API Route
// Executes agent commands via onchainos CLI
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchTrendingTokensReal,
  fetchSignalChains,
  fetchPortfolioReal,
  analyzeSecurityReal,
  getSwapDataReal,
  getSwapQuoteReal,
  fetchLeaderboardReal,
  getApproveDataReal,
} from "@/lib/okxLive";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, params } = body as {
      action: string;
      params?: Record<string, string>;
    };

    let result: unknown;

    switch (action) {
      case "signal_chains":
        result = await fetchSignalChains();
        break;

      case "fetch_trends":
        result = await fetchTrendingTokensReal(params?.chain || "xlayer");
        break;

      case "fetch_portfolio":
        if (!params?.address) {
          return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
        }
        result = await fetchPortfolioReal(params.address, params?.chains || "xlayer");
        break;

      case "analyze_security":
        if (!params?.tokenAddress) {
          return NextResponse.json({ error: "Missing token address" }, { status: 400 });
        }
        result = await analyzeSecurityReal(params.tokenAddress, params?.chain || "xlayer");
        break;

      case "swap_quote":
        if (!params?.from || !params?.to || !params?.amount) {
          return NextResponse.json({ error: "Missing swap parameters" }, { status: 400 });
        }
        result = await getSwapQuoteReal(params.from, params.to, params.amount, params?.chain || "xlayer");
        break;

      case "leaderboard":
        result = await fetchLeaderboardReal(
          params?.chain || "xlayer",
          params?.timeFrame || "3",
          params?.sortBy || "1"
        );
        break;

      case "hire_agent": {
        const { ethers } = await import("ethers");
        const { XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, XLAYER_RPC, AGENT_MARKET_ADDRESS } = await import("@/lib/contractConfig");
        
        const marketAddress = params?.marketAddress || AGENT_MARKET_ADDRESS;
        const agentId = params?.agentId || "1";
        const taskType = params?.taskType || "execution";
        
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
        const contract = new ethers.Contract(XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, wallet);
        
        const tx = await contract.hireAgentFrom(marketAddress, agentId, taskType, {
          value: 0
        });
        
        const receipt = await tx.wait();
        result = {
          txHash: tx.hash,
          agentId,
          marketAddress,
          taskType,
          status: receipt.status === 1 ? "success" : "failed"
        };
        break;
      }

      case "get_market_agents": {
        const { ethers } = await import("ethers");
        const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, XLAYER_RPC } = await import("@/lib/contractConfig");
        
        const role = params?.role || "Security";
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, provider);
        
        const agents = await contract.getAgentsByRole(role);
        result = agents.map((a: any) => ({
          id: Number(a.id),
          creator: a.creator,
          owner: a.owner,
          mintPrice: a.mintPrice.toString(),
          usageCount: Number(a.usageCount),
          listed: a.listed,
          price: a.price.toString(),
          role: a.role,
          metadataURI: a.metadataURI,
        }));
        break;
      }

      case "use_market_agent": {
        const { ethers } = await import("ethers");
        const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, XLAYER_RPC } = await import("@/lib/contractConfig");
        
        const agentId = params?.agentId || "1";
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
        const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, wallet);
        
        const tx = await contract.useAgent(agentId);
        const receipt = await tx.wait();
        result = {
          txHash: tx.hash,
          agentId,
          status: receipt.status === 1 ? "success" : "failed"
        };
        break;
      }

      case "mint_agent": {
        const { ethers } = await import("ethers");
        const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, XLAYER_RPC } = await import("@/lib/contractConfig");
        
        const role = params?.role || "Brain";
        // Simulate dynamic OpenAI trait logic via dummy IPFS CID
        const metadataURI = params?.metadataURI || "ipfs://QmDefaultMetadata";
        
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
        const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, wallet);
        
        const mintFee = ethers.parseEther("0.001");
        const tx = await contract.mintAgent(role, metadataURI, { value: mintFee });
        const receipt = await tx.wait();
        
        const myAddressTopic = ethers.zeroPadValue(wallet.address, 32).toLowerCase();
        const mintLog = receipt?.logs.find((log: any) => 
          log.topics && log.topics.length >= 3 && log.topics[2].toLowerCase() === myAddressTopic
        );
        const parsedAgentId = mintLog ? BigInt(mintLog.topics[1]).toString() : null;
        
        result = {
          txHash: tx.hash,
          agentId: parsedAgentId,
          role,
          status: receipt?.status === 1 ? "success" : "failed"
        };
        break;
      }

      case "burn_agent": {
        const { ethers } = await import("ethers");
        const { AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, XLAYER_RPC } = await import("@/lib/contractConfig");
        
        const agentId = params?.agentId;
        if (!agentId) throw new Error("Missing agentId for burn_agent");
        
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
        const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, wallet);
        
        const tx = await contract.burnAgent(agentId);
        const receipt = await tx.wait();
        
        const burnEvent = receipt?.logs.map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        }).find((e: any) => e?.name === "AgentBurned");
        
        result = {
          txHash: tx.hash,
          agentId,
          refundOKB: burnEvent ? ethers.formatEther(burnEvent.args.refundAmount) : "0",
          status: receipt?.status === 1 ? "success" : "failed"
        };
        break;
      }

      case "get_swap_data": {
        if (!params?.from || !params?.to || !params?.amount || !params?.userAddress) {
          return NextResponse.json({ error: "Missing swap execute parameters (requires userAddress)" }, { status: 400 });
        }

        // 1. Get transaction data from OKX DEX CLI for the CONNECTED user wallet
        const swapDataRaw: any = await getSwapDataReal(params.from, params.to, params.amount, params.userAddress, params?.chain || "xlayer");
        
        // Handle CLI error responses (e.g. { ok: false, error: "..." })
        if (swapDataRaw?.ok === false) {
          throw new Error(swapDataRaw.error || "OKX DEX returned an error");
        }
        
        const txData = Array.isArray(swapDataRaw?.data) ? swapDataRaw.data[0]?.tx : swapDataRaw?.data?.[0]?.tx;

        if (!txData || !txData.data) {
          throw new Error("No valid swap transaction data returned. The token pair may lack liquidity on X Layer.");
        }

        // 2. Return the raw payload exactly as the OKX API provides it
        // The frontend will prompt MetaMask to sign it natively.
        result = {
          tx: {
            to: txData.to,
            data: txData.data,
            value: txData.value || "0"
          }
        };
        break;
      }

      case "get_approve_data": {
        if (!params?.token || !params?.amount) {
          return NextResponse.json({ error: "Missing approve parameters" }, { status: 400 });
        }

        const approveDataRaw: any = await getApproveDataReal(params.token, params.amount, params?.chain || "xlayer");
        
        if (approveDataRaw?.ok === false) {
          throw new Error(approveDataRaw.error || "OKX DEX returned an error for approve");
        }
        
        const txData = Array.isArray(approveDataRaw?.data) ? approveDataRaw.data[0] : approveDataRaw?.data;

        if (!txData || !txData.data || !txData.dexContractAddress) {
          throw new Error("No valid approve transaction data returned.");
        }

        result = {
          tx: {
            to: txData.dexContractAddress,
            data: txData.data,
            value: "0"
          }
        };
        break;
      }


      case "get_hire_history": {
        const { ethers } = await import("ethers");
        const { XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, XLAYER_RPC } = await import("@/lib/contractConfig");
        
        const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
        const contract = new ethers.Contract(XSOVEREIGN_ADDRESS, XSOVEREIGN_ABI, provider);
        
        const history = await contract.getHireHistory();
        result = history.map((h: any) => ({
          agentId: Number(h.agentId),
          marketplace: h.marketplace,
          amountPaid: ethers.formatEther(h.amountPaid),
          timestamp: Number(h.timestamp),
          taskType: h.taskType,
        }));
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[API Error]", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
