import { ethers } from "ethers";

const AGENT_MARKET_ABI = [
  "function getAgentsByRole(string role) view returns (tuple(uint256 id, address creator, address owner, uint256 mintPrice, uint256 usageCount, bool listed, uint256 price, string role, string metadataURI)[])"
];
const AGENT_MARKET_ADDRESS = "0xF53e7cD080211b4c38369f2e5f1A0b9401B5470C";
const XLAYER_RPC = "https://rpc.xlayer.tech";

async function main() {
  const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
  const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, provider);
  
  const roles = ["Action", "Security", "Signal", "Brain", "Research", "execution", "security", "signal"];
  for (const role of roles) {
    try {
      const agents = await contract.getAgentsByRole(role);
      console.log(`Role: ${role}, Count: ${agents.length}`);
      agents.forEach((a: any) => {
        console.log(`  - ID: ${a.id}, Owner: ${a.owner}, Listed: ${a.listed}`);
      });
    } catch (e: any) {
      console.log(`Error fetching ${role}: ${e.message}`);
    }
  }
}
main();
