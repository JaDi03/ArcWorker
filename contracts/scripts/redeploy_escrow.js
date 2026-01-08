const hre = require("hardhat");

async function main() {
    const reputationAddress = "0x5de82F982047365a68E6D87f740a6de656f6635A";
    const vaultAddress = "0xe0e2f4eA038B9dFdfb92B2761B752FBbE0cF292e";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Redeploying TaskEscrow with account:", deployer.address);

    const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(reputationAddress, vaultAddress);
    await taskEscrow.waitForDeployment();
    const escrowAddress = await taskEscrow.getAddress();

    console.log("TaskEscrow (with BATCH SUPPORT) deployed to:", escrowAddress);

    // Link Escrow to Registry
    console.log("Updating ReputationRegistry with new Escrow address...");
    const ReputationRegistry = await hre.ethers.getContractAt("ReputationRegistry", reputationAddress);
    const tx = await ReputationRegistry.setTaskEscrow(escrowAddress);
    await tx.wait();

    console.log("Redeployment complete.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
