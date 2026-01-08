const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Redeploying MockYieldVault with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Existing contract addresses
    const REPUTATION_REGISTRY = "0x5de82F982047365a68E6D87f740a6de656f6635A";
    const OLD_VAULT = "0xe0e2f4eA038B9dFdfb92B2761B752FBbE0cF292e";

    // 1. Deploy NEW MockYieldVault with receive() function
    console.log("\n1. Deploying new MockYieldVault...");
    const MockYieldVault = await hre.ethers.getContractFactory("MockYieldVault");
    const newVault = await MockYieldVault.deploy();
    await newVault.waitForDeployment();
    const newVaultAddress = await newVault.getAddress();
    console.log("✅ New MockYieldVault deployed to:", newVaultAddress);

    // 2. Deploy NEW TaskEscrow pointing to new vault
    console.log("\n2. Deploying new TaskEscrow with new vault...");
    const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
    const newEscrow = await TaskEscrow.deploy(REPUTATION_REGISTRY, newVaultAddress);
    await newEscrow.waitForDeployment();
    const newEscrowAddress = await newEscrow.getAddress();
    console.log("✅ New TaskEscrow deployed to:", newEscrowAddress);

    // 3. Update ReputationRegistry to point to new escrow
    console.log("\n3. Updating ReputationRegistry permissions...");
    const ReputationRegistry = await hre.ethers.getContractAt("ReputationRegistry", REPUTATION_REGISTRY);
    const tx = await ReputationRegistry.setTaskEscrow(newEscrowAddress);
    await tx.wait();
    console.log("✅ ReputationRegistry updated");

    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("========================================");
    console.log("Update frontend/src/utils/contracts.ts with:");
    console.log(`TaskEscrow address: "${newEscrowAddress}"`);
    console.log(`MockYieldVault address: "${newVaultAddress}"`);
    console.log("========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
