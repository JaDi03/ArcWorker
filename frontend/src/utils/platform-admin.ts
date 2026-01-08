import { createWalletClient, createPublicClient, http, publicActions, parseUnits, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from './contracts';

// Arc Testnet Configuration
const PRIMARY_RPC = "https://rpc.testnet.arc.network";
const FALLBACK_RPC = "https://rpc-arc-testnet-aq76f9v92y.t.conduit.xyz";

export const publicClient = createPublicClient({
    chain: {
        id: 5042002,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
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


// Lazy load functionality to prevent top-level crashes if env is missing
function getPlatformClient() {
    const key = process.env.DEPLOYER_PRIVATE_KEY;
    if (!key) throw new Error("DEPLOYER_PRIVATE_KEY missing");

    const account = privateKeyToAccount(key as `0x${string}`);
    return createWalletClient({
        account,
        chain: {
            id: 5042002,
            name: 'Arc Testnet',
            nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
            rpcUrls: {
                default: { http: [PRIMARY_RPC] },
                public: { http: [PRIMARY_RPC] },
            },
        },
        transport: fallback([
            http(PRIMARY_RPC),
            http(FALLBACK_RPC)
        ])
    }).extend(publicActions);
}

/**
 * Automatically approves a task IF the answer matches the metadata's correct answer.
 */
export async function platformAutoVerify(taskId: number | bigint) {
    try {
        console.log(`[Platform Admin] Starting auto-verify for task ${taskId}...`);
        const client = getPlatformClient();
        const id = BigInt(taskId);
        let retries = 5;
        let processed = false;

        while (retries > 0 && !processed) {
            // 1. Fetch current task state
            const task = await client.readContract({
                address: CONTRACTS.TaskEscrow.address,
                abi: CONTRACTS.TaskEscrow.abi,
                functionName: 'tasks',
                args: [id],
            }) as any;

            // Task Struct: [id, agency, worker, reward, deposit, deadline, status, metadataHash, answer]
            const status = Number(task[6]); // 1 = Submitted, 2 = Approved
            const metadataStr = task[7];
            const workerAnswer = task[8];

            if (status === 2) {
                console.log(`[Platform Admin] Task ${taskId} is already approved.`);
                return true;
            }

            if (status === 1) {
                // 2. Validate Answer
                console.log(`[Platform Admin] Task ${taskId} submitted. Validating answer...`);

                try {
                    const metadata = JSON.parse(metadataStr);

                    if (metadata.verification !== 'auto') {
                        console.log(`[Platform Admin] Task ${taskId} requires manual verification. Skipping.`);
                        return false;
                    }

                    const correctAnswer = metadata.correctAnswer?.trim().toLowerCase();
                    const submission = workerAnswer?.trim().toLowerCase();

                    if (!correctAnswer) {
                        console.warn(`[Platform Admin] Task ${taskId} has 'auto' verification but no correct answer set.`);
                        return false;
                    }

                    if (submission === correctAnswer) {
                        console.log(`[Platform Admin] MATCH: '${submission}' === '${correctAnswer}'. Approving...`);

                        const hash = await client.writeContract({
                            address: CONTRACTS.TaskEscrow.address,
                            abi: CONTRACTS.TaskEscrow.abi,
                            functionName: 'approveTask',
                            args: [id],
                        });
                        console.log(`[Platform Admin] Task ${taskId} auto-approved! Hash: ${hash}`);
                        processed = true;
                        return hash;
                    } else {
                        console.log(`[Platform Admin] MISMATCH: '${submission}' !== '${correctAnswer}'. Manual review required.`);
                        return false;
                    }

                } catch (parseError) {
                    console.error(`[Platform Admin] Failed to parse metadata for task ${taskId}`, parseError);
                    return false;
                }
            }

            console.log(`[Platform Admin] Task ${taskId} status: ${status}. Waiting... (${retries} retries)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            retries--;
        }

        return null;
    } catch (error: any) {
        console.error(`[Platform Admin] Error in auto-verify for task ${taskId}:`, error.message);
        return null;
    }
}
