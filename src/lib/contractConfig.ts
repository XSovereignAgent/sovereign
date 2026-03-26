// XSovereign Contract Config
// Deployed on X Layer Mainnet (Chain 196)

export const XSOVEREIGN_ADDRESS = process.env.NEXT_PUBLIC_XSOVEREIGN_ADDRESS || "0xb327709Ec4f0830722776746b1da42F98d51868e";

export const XSOVEREIGN_ABI = [
  "function owner() view returns (address)",
  "function agentMarket() view returns (address)",
  "function getBalance() view returns (uint256)",
  "function totalHires() view returns (uint256)",
  "function totalSpent() view returns (uint256)",
  "function getHireHistory() view returns (tuple(uint256 agentId, address marketplace, uint256 amountPaid, uint256 timestamp, string taskType)[])",
  "function hireAgent(uint256 agentId, string taskType) payable",
  "function hireAgentFrom(address marketplace, uint256 agentId, string taskType) payable",
  "function setAgentMarket(address _market)",
  "function withdraw(uint256 amount)",
  "event AgentHired(uint256 indexed agentId, address indexed marketplace, uint256 amountPaid, string taskType, uint256 timestamp)",
  "event FundsDeposited(address indexed from, uint256 amount)",
] as const;

// Partner's AgentMarket.sol — LIVE on X Layer Mainnet
export const AGENT_MARKET_ADDRESS = "0x38Af6e66e91D0EDbA41aC00e763414e418d0dAC3";

export const AGENT_MARKET_ABI = [
  "function getAgentsByRole(string role) view returns (tuple(uint256 id, address creator, address owner, uint256 mintPrice, uint256 usageCount, bool listed, uint256 price, string role, string metadataURI)[])",
  "function useAgent(uint256 agentId) external",
  "function mintAgent(string role, string metadataURI) payable",
  "function burnAgent(uint256 agentId)",
  "function unlistAgent(uint256 agentId) external",
  "event AgentMinted(uint256 indexed agentId, address indexed creator, string role, uint256 mintPrice)",
  "event AgentBurned(uint256 indexed agentId, address indexed owner, uint256 refundAmount)",
] as const;

export const XLAYER_RPC = process.env.NEXT_PUBLIC_XLAYER_RPC || "https://rpc.xlayer.tech";
export const XLAYER_CHAIN_ID = 196;
