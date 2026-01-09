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

            // Task Struct indices: 0:id, 1:agency, 2:reward, 3:deposit, 4:deadline, 5:status, 6:metadataHash, 7:requiredSubmissions, 8:currentSubmissions, 9:correctAnswerHash
            const status = Number(task[5]);
            const metadataStr = task[6];
            const currentSubmissions = Number(task[8]);

            if (status === 2) {
                console.log(`[Platform Admin] Task ${taskId} is already approved.`);
                return true;
            }

            if (status === 0 || status === 1) {
                // 2. Fetch Latest Submission
                if (currentSubmissions === 0) {
                    console.log(`[Platform Admin] Task ${taskId} has no submissions yet. Waiting...`);
                } else {
                    console.log(`[Platform Admin] Task ${taskId} has ${currentSubmissions} submissions. Validating last one...`);

                    try {
                        // Submission struct: [address, answer, approved]
                        const submissionIndex = BigInt(currentSubmissions - 1);
                        const sub = await client.readContract({
                            address: CONTRACTS.TaskEscrow.address,
                            abi: CONTRACTS.TaskEscrow.abi,
                            functionName: 'taskSubmissions',
                            args: [id, submissionIndex],
                        }) as any;

                        const workerAnswer = sub[1]; // Answer is at index 1

                        const metadata = JSON.parse(metadataStr);

                        if (metadata.ver !== 'auto' && metadata.verification !== 'auto' && metadata.verificationStrategy !== 'Instant Auto-Pay') {
                            console.log(`[Platform Admin] Task ${taskId} requires manual verification or consensus. Skipping.`);
                            return false;
                        }

                        const correctAnswer = metadata.correctAnswer?.trim().toLowerCase();
                        const submission = workerAnswer?.trim().toLowerCase();

                        if (!correctAnswer) {
                            console.warn(`[Platform Admin] Task ${taskId} has 'auto' verification but no correct answer set in metadata.`);
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
                            console.log(`[Platform Admin] MISMATCH: '${submission}' !== '${correctAnswer}'. Manual review or consensus required.`);
                            return false;
                        }

                    } catch (err: any) {
                        console.error(`[Platform Admin] Error processing validation for task ${taskId}:`, err.message);
                        // Fallback: maybe the index is different? Non-critical, just log.
                    }
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
