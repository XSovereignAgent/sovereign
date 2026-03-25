const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentMarket with account:", deployer.address);

  const Market = await hre.ethers.getContractFactory("AgentMarket");
  const market = await Market.deploy();
  await market.waitForDeployment();

  const address = await market.getAddress();
  console.log("AgentMarket deployed to:", address);
  
  // also send 0.0005 OKB to the existing XSovereign contract so it has funds to pay the market
  const sovereignAddress = process.env.NEXT_PUBLIC_XSOVEREIGN_ADDRESS;
  if (sovereignAddress) {
    console.log("Funding XSovereign contract...");
    const tx = await deployer.sendTransaction({
      to: sovereignAddress,
      value: hre.ethers.parseEther("0.0005")
    });
    await tx.wait();
    console.log("Funded XSovereign with 0.0005 OKB");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
