// ============================================
// Mock OKX OnchainOS API Responses
// Simulates okx-dex-signal, okx-wallet-portfolio,
// okx-dex-swap, and okx-security
// ============================================

export interface TrendingToken {
  symbol: string;
  name: string;
  chain: string;
  price: string;
  change24h: string;
  volume: string;
  contractAddress: string;
}

export interface PortfolioAsset {
  symbol: string;
  balance: string;
  valueUsd: string;
  allocation: number;
}

export interface SecurityResult {
  contractAddress: string;
  safe: boolean;
  riskScore: number;
  flags: string[];
}

export interface SwapResult {
  fromToken: string;
  toToken: string;
  amount: string;
  txHash: string;
  status: "success" | "failed";
}

// -- okx-dex-signal --
export async function fetchTrendingTokens(): Promise<TrendingToken[]> {
  await new Promise((r) => setTimeout(r, 1200));
  return [
    {
      symbol: "XLT",
      name: "X Layer Token",
      chain: "X Layer",
      price: "$2.47",
      change24h: "+18.4%",
      volume: "$12.3M",
      contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    },
    {
      symbol: "AGNT",
      name: "AgentCoin",
      chain: "X Layer",
      price: "$0.89",
      change24h: "+42.1%",
      volume: "$8.7M",
      contractAddress: "0xabcdef1234567890abcdef1234567890abcdef34",
    },
    {
      symbol: "DEFI",
      name: "DeFi Protocol X",
      chain: "X Layer",
      price: "$15.32",
      change24h: "+7.2%",
      volume: "$24.1M",
      contractAddress: "0x567890abcdef1234567890abcdef1234567890ab",
    },
  ];
}

// -- okx-wallet-portfolio --
export async function fetchPortfolio(): Promise<PortfolioAsset[]> {
  await new Promise((r) => setTimeout(r, 800));
  return [
    { symbol: "ETH", balance: "2.45", valueUsd: "$4,312.00", allocation: 45 },
    { symbol: "USDC", balance: "1,200.00", valueUsd: "$1,200.00", allocation: 25 },
    { symbol: "OKB", balance: "85.2", valueUsd: "$980.00", allocation: 20 },
    { symbol: "XLT", balance: "320", valueUsd: "$480.00", allocation: 10 },
  ];
}

// -- okx-security --
export async function analyzeContractSecurity(contractAddress: string): Promise<SecurityResult> {
  await new Promise((r) => setTimeout(r, 1500));

  // Simulate: most contracts pass, some fail
  const isSafe = !contractAddress.endsWith("34");

  return {
    contractAddress,
    safe: isSafe,
    riskScore: isSafe ? 95 : 22,
    flags: isSafe
      ? []
      : ["Hidden mint function", "Ownership not renounced", "High sell tax (45%)"],
  };
}

// -- okx-dex-swap --
export async function executeSwap(fromToken: string, toToken: string, amount: string): Promise<SwapResult> {
  await new Promise((r) => setTimeout(r, 2000));

  const txHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  return {
    fromToken,
    toToken,
    amount,
    txHash,
    status: "success",
  };
}
