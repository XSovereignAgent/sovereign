const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying XSovereign with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "OKB");

  const XSovereign = await hre.ethers.getContractFactory("XSovereign");
  const sovereign = await XSovereign.deploy();
  await sovereign.waitForDeployment();

  const address = await sovereign.getAddress();
  console.log("");
  console.log("=".repeat(50));
  console.log("XSovereign deployed to:", address);
  console.log("=".repeat(50));
  console.log("");
  console.log("Add this to your .env:");
  console.log(`NEXT_PUBLIC_XSOVEREIGN_ADDRESS="${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
