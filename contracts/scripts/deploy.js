const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy ReputationRegistry
    const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
    const reputationRegistry = await ReputationRegistry.deploy();
    await reputationRegistry.waitForDeployment();
    const reputationAddress = await reputationRegistry.getAddress();

    console.log("ReputationRegistry deployed to:", reputationAddress);

    // 2. Deploy UserRegistry (Identity)
    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    const registryAddress = await userRegistry.getAddress();
    console.log("UserRegistry deployed to:", registryAddress);

    // 3. Deploy MockYieldVault (New)
    const MockYieldVault = await hre.ethers.getContractFactory("MockYieldVault");
    const mockYieldVault = await MockYieldVault.deploy();
    await mockYieldVault.waitForDeployment();
    const vaultAddress = await mockYieldVault.getAddress();
    console.log("MockYieldVault deployed to:", vaultAddress);

    // 4. Deploy TaskEscrow (linked to ReputationRegistry AND Vault)
    const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(reputationAddress, vaultAddress);
    await taskEscrow.waitForDeployment();
    const escrowAddress = await taskEscrow.getAddress();

    console.log("TaskEscrow deployed to:", escrowAddress);

    // 4. Link Escrow to Registry (Set permission)
    console.log("Setting TaskEscrow permissions in ReputationRegistry...");
    const tx = await reputationRegistry.setTaskEscrow(escrowAddress);
    await tx.wait();

    console.log("Configuration complete.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
