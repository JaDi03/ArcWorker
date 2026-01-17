
import { createWalletClient, http, createPublicClient, defineChain, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
// import TaskEscrowArtifact from '../frontend/src/abis/TaskEscrow.json';
// Using absolute path or hardcoded ABI to avoid resolution issues in tsx/node
import fs from 'fs';
import path from 'path';

const ABI_PATH = path.resolve(__dirname, '../frontend/src/abis/TaskEscrow.json');
const TaskEscrowArtifact = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));

// --- CONFIG ---
const TASK_ESCROW_ADDRESS = "0x43AE98Ff8A2af37855C0209F4470e849B75cBE0F"; // Arc Testnet
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error("FATAL: DEPLOYER_PRIVATE_KEY env var is missing.");
    process.exit(1);
}

const chain = defineChain({
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc-testnet-1.arc.market'] },
        public: { http: ['https://rpc-testnet-1.arc.market'] },
    },
});

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
    chain,
    transport: http()
});

function parseMetadata(metadataHash: string) {
    if (!metadataHash) return { title: 'No Metadata' };
    try {
        if (metadataHash.startsWith('{')) return JSON.parse(metadataHash);
    } catch (e) { }
    return { title: metadataHash.substring(0, 20) + '...' };
}

async function listTasks() {
    console.log(`[List] Fetching tasks for Agency: ${account.address} ...`);

    try {
        // Fetch last 50 tasks
        const rawTasks = await publicClient.readContract({
            address: TASK_ESCROW_ADDRESS,
            abi: TaskEscrowArtifact.abi,
            functionName: 'getRecentTasks',
            args: [BigInt(50)]
        }) as any[];

        if (!rawTasks || rawTasks.length === 0) {
            console.log("No recent tasks found on contract.");
            return;
        }

        const myTasks = rawTasks.filter((t: any) => {
            // t.agency or t[1]
            const agency = t.agency || t[1];
            return agency && agency.toLowerCase() === account.address.toLowerCase();
        });

        if (myTasks.length === 0) {
            console.log("No tasks found for this agency in the last 50 items.");
            return;
        }

        console.log("\n--- YOUR ACTIVE TASKS ---");

        let found = 0;
        for (const t of myTasks) {
            // Normalize fields (handling arrays from readContract)
            const id = t.id !== undefined ? Number(t.id) : Number(t[0]);
            const status = t.status !== undefined ? Number(t.status) : Number(t[5]);
            const metadataStr = t.metadataHash || t[6] || t.correctAnswerHash || t[9]; // Fallback

            // Filter: Only show 0 (Created) or 1 (Submitted)
            // (You can change this if you want to see all)
            if (status !== 0 && status !== 1) continue;

            const metadata = parseMetadata(metadataStr);
            const statusLabel = status === 0 ? "OPEN (0)" : "SUBMITTED (1)";
            const color = status === 0 ? "\x1b[32m" : "\x1b[33m"; // Green for Open, Yellow for Submitted
            const reset = "\x1b[0m";

            console.log(`${color}[ID: ${id}] ${statusLabel}${reset} | Title: "${metadata.title}"`);
            found++;
        }

        if (found === 0) {
            console.log("You have tasks, but none are active (all completed or cancelled).");
        } else {
            console.log("------------------------");
            console.log(`Found ${found} active tasks.`);
        }

    } catch (error: any) {
        console.error("Error fetching tasks:", error.message || error);
    }
}

listTasks();
