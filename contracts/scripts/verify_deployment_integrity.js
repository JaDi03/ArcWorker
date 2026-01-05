const hre = require("hardhat");

async function main() {
    // Addresses from contracts.ts
    const ESCROW_ADDRESS = "0xBb05cdeA4Df545b2d30F95872e87cd26bEBDfC85";
    const VAULT_ADDRESS = "0x0671A237DbEBCA6899e18c789bA29C858Ef3ef7c";

    console.log("🔍 Verifying Deployment Integrity...");
    console.log(`Target Escrow: ${ESCROW_ADDRESS}`);
    console.log(`Target Vault: ${VAULT_ADDRESS}`);

    const provider = hre.ethers.provider;

    // 1. Check Code
    const escrowCode = await provider.getCode(ESCROW_ADDRESS);
    const vaultCode = await provider.getCode(VAULT_ADDRESS);

    if (escrowCode === "0x") {
        console.error("❌ ERROR: No code at TaskEscrow address! It is an EOA or does not exist.");
    } else {
        console.log("✅ TaskEscrow has code.");
    }

    if (vaultCode === "0x") {
        console.error("❌ ERROR: No code at MockYieldVault address!");
    } else {
        console.log("✅ MockYieldVault has code.");
    }

    // 2. Check Linkage
    try {
        const TaskEscrow = await hre.ethers.getContractFactory("TaskEscrow");
        const escrow = TaskEscrow.attach(ESCROW_ADDRESS);

        const vaultOnChain = await escrow.vault();
        console.log(`🔗 TaskEscrow.vault() points to: ${vaultOnChain}`);

        if (vaultOnChain.toLowerCase() === VAULT_ADDRESS.toLowerCase()) {
            console.log("✅ Linkage Verified: Escrow points to correct Vault.");
        } else {
            console.error("❌ CRITICAL: Escrow points to WRONG Vault!");
        }
    } catch (e) {
        console.error("❌ Check Failed: Could not call TaskEscrow.vault().", e);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
