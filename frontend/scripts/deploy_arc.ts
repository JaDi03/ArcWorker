import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
// Removed JSON imports to avoid ESM issues
// import ReputationRegistryArtifact from '../src/abis/ReputationRegistry.json';
// import TaskEscrowArtifact from '../src/abis/TaskEscrow.json';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const rrAbiPath = path.resolve(process.cwd(), 'src/abis/ReputationRegistry.json');
const teAbiPath = path.resolve(process.cwd(), 'src/abis/TaskEscrow.json');

const ReputationRegistryArtifact = JSON.parse(fs.readFileSync(rrAbiPath, 'utf8'));
const TaskEscrowArtifact = JSON.parse(fs.readFileSync(teAbiPath, 'utf8'));

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// Try loading .env.local first, then .env
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn("⚠️ No .env or .env.local file found. Relying on system environment variables.");
}

// Define Arc Testnet Chain
const arcTestnet = defineChain({
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.testnet.arc.network'] },
    },
    testnet: true,
});

async function main() {
    // 1. Get Private Key
    const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
    if (!PRIVATE_KEY) {
        console.error("❌ Missing DEPLOYER_PRIVATE_KEY in .env.local");
        process.exit(1);
    }

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    // 2. Setup Client
    const client = createWalletClient({
        account,
        chain: arcTestnet,
        transport: http()
    }).extend(publicActions);

    console.log(`🚀 Deploying from address: ${account.address}`);

    // 3. Deploy Reputation Registry
    console.log("Deploying ReputationRegistry...");
    const hash1 = await client.deployContract({
        abi: ReputationRegistryArtifact.abi,
        bytecode: ReputationRegistryArtifact.bytecode as `0x${string}`,
    });
    console.log(`Transaction Hash: ${hash1}`);
    const receipt1 = await client.waitForTransactionReceipt({ hash: hash1 });
    const reputationAddress = receipt1.contractAddress;
    console.log(`✅ ReputationRegistry Deployed at: ${reputationAddress}`);

    if (!reputationAddress) throw new Error("ReputationRegistry deployment failed");

    // 4. Deploy Task Escrow
    console.log("Deploying TaskEscrow...");
    const hash2 = await client.deployContract({
        abi: TaskEscrowArtifact.abi,
        bytecode: TaskEscrowArtifact.bytecode as `0x${string}`,
        args: [reputationAddress] // Constructor args
    });
    console.log(`Transaction Hash: ${hash2}`);
    const receipt2 = await client.waitForTransactionReceipt({ hash: hash2 });
    const escrowAddress = receipt2.contractAddress;
    console.log(`✅ TaskEscrow Deployed at: ${escrowAddress}`);

    // 5. Output for Copy-Paste
    console.log("\n============================================");
    console.log("UPDATE src/utils/contracts.ts WITH THESE:");
    console.log("============================================");
    console.log(`TaskEscrow: "${escrowAddress}"`);
    console.log(`ReputationRegistry: "${reputationAddress}"`);
    console.log("============================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
