const { ethers, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║      BlindHire Contract Deployment        ║");
  console.log("║      Powered by Zama fhEVM on Sepolia     ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`📁 Deployer address  : ${deployer.address}`);
  console.log(`💰 Deployer balance  : ${ethers.formatEther(balance)} ETH`);
  console.log(`🌐 Network           : ${(await ethers.provider.getNetwork()).name}\n`);

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  WARNING: Low balance! Consider topping up your Sepolia wallet.");
    console.warn("   Get free Sepolia ETH: https://sepoliafaucet.com\n");
  }

  // ─── Deploy ──────────────────────────────────────────────────────────────────
  console.log("🚀 Deploying BlindHire...");
  const BlindHire = await ethers.getContractFactory("BlindHire");
  const blindHire = await BlindHire.deploy();
  await blindHire.waitForDeployment();

  const contractAddress = await blindHire.getAddress();
  const deployTx = blindHire.deploymentTransaction();

  console.log(`\n✅ BlindHire deployed!`);
  console.log(`   Contract address : ${contractAddress}`);
  console.log(`   Transaction hash : ${deployTx.hash}`);
  console.log(`   Block number     : ${deployTx.blockNumber ?? "pending..."}\n`);
  console.log(`🔗 Etherscan       : https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log(`🔗 Tx              : https://sepolia.etherscan.io/tx/${deployTx.hash}\n`);

  // ─── Save deployment info ────────────────────────────────────────────────────
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contractAddress,
    deployerAddress: deployer.address,
    transactionHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
    etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentFile = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentFile}\n`);

  // ─── Update .env hint ────────────────────────────────────────────────────────
  console.log("📝 Update your .env and Vercel environment variables:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}\n`);

  // ─── Etherscan verification ──────────────────────────────────────────────────
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (ETHERSCAN_API_KEY && ETHERSCAN_API_KEY !== "YOUR_ETHERSCAN_API_KEY") {
    console.log("🔍 Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // wait 30 seconds

    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan!\n");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("✅ Contract already verified.\n");
      } else {
        console.error("❌ Verification failed:", err.message);
        console.log("   Run manually: npx hardhat verify --network sepolia", contractAddress, "\n");
      }
    }
  } else {
    console.log("ℹ️  Skipping Etherscan verification (no API key set).");
    console.log(`   Verify manually: npx hardhat verify --network sepolia ${contractAddress}\n`);
  }

  console.log("🎉 Deployment complete!\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exitCode = 1;
});
