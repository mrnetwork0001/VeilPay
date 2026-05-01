const { ethers, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║   VeilPay + cUSDC Contract Deployment     ║");
  console.log("║   Powered by Zama fhEVM on Sepolia        ║");
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

  // ─── Step 1: Deploy ConfidentialUSDC (cUSDC) ──────────────────────────────────
  console.log("🪙  Deploying ConfidentialUSDC (cUSDC)...");
  const CUSDC = await ethers.getContractFactory("ConfidentialUSDC");
  const cusdc = await CUSDC.deploy();
  await cusdc.waitForDeployment();

  const cusdcAddress = await cusdc.getAddress();
  const cusdcTx = cusdc.deploymentTransaction();

  console.log(`\n✅ cUSDC deployed!`);
  console.log(`   Contract address : ${cusdcAddress}`);
  console.log(`   Transaction hash : ${cusdcTx.hash}`);
  console.log(`🔗 Etherscan       : https://sepolia.etherscan.io/address/${cusdcAddress}\n`);

  // ─── Step 2: Deploy VeilPay (with cUSDC address) ──────────────────────────────
  console.log("🚀 Deploying VeilPay (bountyToken = cUSDC)...");
  const VeilPay = await ethers.getContractFactory("VeilPay");
  const veilPay = await VeilPay.deploy(cusdcAddress);
  await veilPay.waitForDeployment();

  const contractAddress = await veilPay.getAddress();
  const deployTx = veilPay.deploymentTransaction();

  console.log(`\n✅ VeilPay deployed!`);
  console.log(`   Contract address : ${contractAddress}`);
  console.log(`   Transaction hash : ${deployTx.hash}`);
  console.log(`   Bounty token     : ${cusdcAddress}`);
  console.log(`🔗 Etherscan       : https://sepolia.etherscan.io/address/${contractAddress}\n`);

  // ─── Save deployment info ────────────────────────────────────────────────────
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contracts: {
      ConfidentialUSDC: {
        address: cusdcAddress,
        transactionHash: cusdcTx.hash,
      },
      VeilPay: {
        address: contractAddress,
        transactionHash: deployTx.hash,
        constructorArgs: [cusdcAddress],
      },
    },
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentFile = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentFile}\n`);

  // ─── Update .env hint ────────────────────────────────────────────────────────
  console.log("📝 Update your frontend .env:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   VITE_CUSDC_ADDRESS=${cusdcAddress}\n`);

  // ─── Etherscan verification ──────────────────────────────────────────────────
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  if (ETHERSCAN_API_KEY && ETHERSCAN_API_KEY !== "YOUR_ETHERSCAN_API_KEY") {
    console.log("🔍 Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Verify cUSDC
    try {
      await run("verify:verify", { address: cusdcAddress, constructorArguments: [] });
      console.log("✅ cUSDC verified on Etherscan!");
    } catch (err) {
      if (err.message.includes("Already Verified")) console.log("✅ cUSDC already verified.");
      else console.error("❌ cUSDC verification failed:", err.message);
    }

    // Verify VeilPay
    try {
      await run("verify:verify", { address: contractAddress, constructorArguments: [cusdcAddress] });
      console.log("✅ VeilPay verified on Etherscan!\n");
    } catch (err) {
      if (err.message.includes("Already Verified")) console.log("✅ VeilPay already verified.");
      else console.error("❌ VeilPay verification failed:", err.message);
    }
  } else {
    console.log("ℹ️  Skipping Etherscan verification (no API key set).");
    console.log(`   Verify cUSDC:   npx hardhat verify --network sepolia ${cusdcAddress}`);
    console.log(`   Verify VeilPay: npx hardhat verify --network sepolia ${contractAddress} "${cusdcAddress}"\n`);
  }

  console.log("🎉 Deployment complete!\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exitCode = 1;
});
