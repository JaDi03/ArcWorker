import { createPublicClient, http, fallback } from 'viem';
import TaskEscrowArtifact from './frontend/src/abis/TaskEscrow.json';

const PRIMARY_RPC = "https://rpc.testnet.arc.network";
const FALLBACK_RPC = "https://rpc-arc-testnet-aq76f9v92y.t.conduit.xyz";

const client = createPublicClient({
    chain: {
        id: 5042002,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: {
            default: { http: [PRIMARY_RPC] },
            public: { http: [PRIMARY_RPC] },
        },
    },
    transport: fallback([
        http(PRIMARY_RPC),
        http(FALLBACK_RPC)
    ])
});

const CONTRACT_ADDRESS = "0xac0919c141d2696dbede3ffccc2c19a4079a235f";

async function checkTask(id) {
    try {
        const task = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: TaskEscrowArtifact.abi,
            functionName: 'tasks',
            args: [BigInt(id)],
        });
        console.log(`Task #${id} Details:`, JSON.stringify(task, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    } catch (e) {
        console.error(`Error reading task #${id}:`, e.message);
    }
}

checkTask(1);
