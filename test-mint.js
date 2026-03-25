require('dotenv').config();
const { ethers } = require("ethers");

const AGENT_MARKET_ADDRESS = "0xF53e7cD080211b4c38369f2e5f1A0b9401B5470C";
const AGENT_MARKET_ABI = [
  "function mintAgent(string role, string metadataURI) payable",
  "function burnAgent(uint256 agentId)"
];

async function run() {
  try {
    const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    console.log("Wallet Address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "OKB");
    
    const contract = new ethers.Contract(AGENT_MARKET_ADDRESS, AGENT_MARKET_ABI, wallet);
    
    const mintFee = ethers.parseEther("0.001");
    console.log("Estimating Gas for mintAgent...");
    await contract.mintAgent.estimateGas("Security", "ipfs://test", { value: mintFee });
    console.log("Gas estimation succeeded.");
  } catch (error) {
    console.error("Error:", error.shortMessage || error.message);
  }
}

run();
