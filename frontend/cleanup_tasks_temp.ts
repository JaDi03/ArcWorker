
import { createWalletClient, http, createPublicClient, defineChain, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';

// --- CONFIG ---
const TASK_ESCROW_ADDRESS = "0x43AE98Ff8A2af37855C0209F4470e849B75cBE0F"; // Arc Testnet

// Load env from current directory (frontend)
const loadEnv = (filename: string) => {
    try {
        const envPath = path.resolve(__dirname, filename);
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    if (key.trim() === 'DEPLOYER_PRIVATE_KEY') process.env.DEPLOYER_PRIVATE_KEY = value.trim().replace(/"/g, '');
                    if (key.trim() === 'NEXT_PUBLIC_ARC_RPC_URL') process.env.NEXT_PUBLIC_ARC_RPC_URL = value.trim().replace(/"/g, '');
                }
            });
        }
    } catch (e) { }
};

loadEnv('.env.local');
loadEnv('.env');

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error("FATAL: DEPLOYER_PRIVATE_KEY not found in .env.local or .env");
    process.exit(1);
}

const ABI_PATH = path.resolve(__dirname, './src/abis/TaskEscrow.json');
if (!fs.existsSync(ABI_PATH)) {
    console.error(`FATAL: ABI not found at ${ABI_PATH}`);
    process.exit(1);
}
const TaskEscrowArtifact = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));

const chain = defineChain({
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc-testnet-1.arc.market'] },
        public: { http: ['https://rpc-testnet-1.arc.market'] },
    },
});

const ENV_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL;
const rpcList = [];
if (ENV_RPC) rpcList.push(http(ENV_RPC));
rpcList.push(http('https://rpc-testnet-1.arc.market'));
rpcList.push(http('https://rpc-testnet-2.arc.market'));
rpcList.push(http('https://testnet-rpc.arc.market'));

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
    account,
    chain,
    transport: fallback(rpcList)
});

const publicClient = createPublicClient({
    chain,
    transport: fallback(rpcList)
});


async function cleanupTasks() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: npx tsx cleanup_tasks_temp.ts <TASK_ID_1> <TASK_ID_2> ...");
        process.exit(0);
    }

    const taskIds = args.map(id => BigInt(id));

    console.log(`[Cleanup] Agency: ${account.address}`);
    console.log(`[Cleanup] Targets: ${taskIds.join(', ')}`);

    for (const taskId of taskIds) {
        console.log(`\nChecking Task ${taskId}...`);

        try {
            const taskData = await publicClient.readContract({
                address: TASK_ESCROW_ADDRESS,
                abi: TaskEscrowArtifact.abi,
                functionName: 'tasks',
                args: [taskId]
            }) as any;

            // Mapping returns array: [id, agency, reward, deposit, deadline, status, ...]
            // Status is index 5
            const status = Number(taskData[5]);
            // const status = Number(task.status); // If struct, but mapping is array usually in viem unless ABI defines outputs named

            console.log(`> Current Status: ${status} (${status === 0 ? 'Open' : status === 1 ? 'Submitted' : 'Finalized'})`);

            if (status === 0) {
                console.log(`> Action: Cancelling (batch)...`);
                const hash = await client.writeContract({
                    address: TASK_ESCROW_ADDRESS,
                    abi: TaskEscrowArtifact.abi,
                    functionName: 'cancelTasksBatch',
                    args: [[taskId]]
                });
                console.log(`> ✅ Cancelled! Tx: ${hash}`);
            }
            else if (status === 1) {
                console.log(`> Action: Rejecting submission...`);
                // Note: rejectTask usually takes just the ID
                const hash = await client.writeContract({
                    address: TASK_ESCROW_ADDRESS,
                    abi: TaskEscrowArtifact.abi,
                    functionName: 'rejectTask',
                    args: [taskId]
                });
                console.log(`> ✅ Rejected! Tx: ${hash}`);
            }
            else {
                console.log(`> Action: None (Already finalized)`);
            }

        } catch (error: any) {
            console.error(`> ❌ Failed:`, error.message || error);
        }
    }
}

cleanupTasks();
