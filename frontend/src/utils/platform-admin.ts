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



// Helper: Canonicalize JSON object for comparison
// 1. Sorts keys
// 2. Removes ignored keys (color, etc.)
// 3. Trims strings
function canonicalize(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj)
            .sort()
            .reduce((acc: any, key) => {
                // IGNORE FIELDS: color, etc.
                if (['color', 'ui_id', 'id'].includes(key)) return acc;

                const val = obj[key];
                // RAW VALUE TRANSFORMS: Trim strings
                if (typeof val === 'string') {
                    acc[key] = val.trim();
                } else {
                    acc[key] = canonicalize(val);
                }
                return acc;
            }, {});
    } else if (typeof obj === 'string') {
        return obj.trim();
    }
    return obj;
}

// Helper: Smart comparison for Strings and JSON
function areAnswersEqual(sub: string, correct: string): boolean {
    if (!sub || !correct) return false;
    const s = sub.trim();
    const c = correct.trim();
    // 1. Direct String Compare (Fast path)
    if (s.toLowerCase() === c.toLowerCase()) return true;

    // 2. JSON Structure Compare
    try {
        const jsonS = JSON.parse(s);
        const jsonC = JSON.parse(c);
        return JSON.stringify(canonicalize(jsonS)) === JSON.stringify(canonicalize(jsonC));
    } catch (e) {
        // One or both are not valid JSON, so they must be different since string compare failed
        return false;
    }
}

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

// Automatically approves a task IF the answer matches the metadata's correct answer.
export async function platformAutoVerify(taskId: number | bigint) {
    try {
        console.log(`[Platform Admin] Starting auto-verify for task ${taskId}...`);
        const client = getPlatformClient();
        const id = BigInt(taskId);
        let retries = 20; // Wait up to ~60 seconds for the transaction to be indexed
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
                return { success: true, reason: "Already approved" };
            }

            if (status === 0 || status === 1) {
                // 2. Fetch Latest Submission
                if (currentSubmissions === 0) {
                    console.log(`[Platform Admin] Task ${taskId} has no submissions yet. Waiting for indexing... (Retry ${21 - retries}/20)`);
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

                        let metadata: any = {};
                        try {
                            metadata = JSON.parse(metadataStr);
                        } catch (e) {
                            console.warn(`[Platform Admin] Metadata for task ${taskId} is not valid JSON.`);
                            return { success: false, reason: "Invalid JSON metadata in task" };
                        }

                        // Flexible Strategy Check
                        const strategy = (metadata.ver || metadata.verification || metadata.verificationStrategy || '').toLowerCase();
                        const isAuto = strategy === 'auto' || strategy.includes('instant') || strategy.includes('golden') || strategy.includes('classifier');

                        if (!isAuto) {
                            console.log(`[Platform Admin] Task ${taskId} strategy '${strategy}' does not imply auto-verify. Skipping.`);
                            return { success: false, reason: `Strategy '${strategy}' is not auto-verifiable` };
                        }

                        const correctAnswer = metadata.correctAnswer;
                        const submission = workerAnswer;

                        console.log(`[Platform Admin] Validating Task ${taskId}: Expected '${correctAnswer}' vs Got '${submission}'`);

                        if (!correctAnswer) {
                            console.warn(`[Platform Admin] Task ${taskId} has auto-verify enabled but no 'correctAnswer' in metadata.`);
                            return { success: false, reason: "Metadata missing 'correctAnswer'" };
                        }

                        if (areAnswersEqual(submission, correctAnswer)) {
                            console.log(`[Platform Admin] MATCH. Approving...`);

                            const hash = await client.writeContract({
                                address: CONTRACTS.TaskEscrow.address,
                                abi: CONTRACTS.TaskEscrow.abi,
                                functionName: 'approveTask',
                                args: [id],
                            });
                            console.log(`[Platform Admin] Task ${taskId} auto-approved! Hash: ${hash}`);
                            processed = true;
                            return { success: true, txHash: hash };
                        } else {
                            console.log(`[Platform Admin] MISMATCH. Manual review required.`);
                            return { success: false, reason: `Mismatch: Expected matches '${correctAnswer}' but got '${submission}'` };
                        }

                    } catch (err: any) {
                        const message = err.message || '';
                        if (message.includes('reverted') || message.includes('authorized')) {
                            console.error(`[Platform Admin] FATAL: Contract reverted. Reason: ${message}`);
                            return { success: false, reason: `Contract Reverted: Not Authorized (Agency Only)` };
                        }

                        console.error(`[Platform Admin] Error processing validation for task ${taskId}:`, message);
                        // Only continue loop for non-fatal errors (network, indexing)
                    }
                }
            }

            if (!processed) {
                console.log(`[Platform Admin] Task ${taskId} status: ${status}. Waiting... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                retries--;
            }
        }

        return { success: false, reason: "Timeout: Submission not found or indexing too slow" };
    } catch (error: any) {
        console.error(`[Platform Admin] Error in auto-verify for task ${taskId}:`, error.message);
        return { success: false, reason: `Exception: ${error.message}` };
    }
}
