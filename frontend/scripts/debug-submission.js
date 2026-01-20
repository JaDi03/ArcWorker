
const { createPublicClient, http, parseAbiItem, keccak256, encodePacked } = require('viem');
const { mainnet, sepolia } = require('viem/chains');

// Arc Testnet Config
const chain = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.testnet.arc.network'] },
        public: { http: ['https://rpc.testnet.arc.network'] },
    },
};

const client = createPublicClient({
    chain,
    transport: http()
});

async function debugSubmission(txHash) {
    console.log(`\n🔍 Analyzing Transaction: ${txHash}\n`);

    try {
        const receipt = await client.getTransactionReceipt({ hash: txHash });

        if (!receipt) {
            console.log("❌ Transaction not found.");
            return;
        }

        console.log(`✅ Status: ${receipt.status === 'success' ? 'Success' : 'Reverted'}`);

        // Define Event ABI
        const taskSubmittedEvent = parseAbiItem('event TaskSubmitted(uint256 indexed taskId, address indexed worker, string answer)');

        // Using `decodeEventLog` from viem
        const { decodeEventLog } = require('viem');

        let taskId = null;
        let workerAnswer = null;

        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: [taskSubmittedEvent],
                    data: log.data,
                    topics: log.topics
                });

                if (decoded.eventName === 'TaskSubmitted') {
                    taskId = decoded.args.taskId;
                    workerAnswer = decoded.args.answer;
                    console.log(`\n📄 Event Found: TaskSubmitted`);
                    console.log(`   - Task ID: ${taskId}`);
                    console.log(`   - Worker Answer: "${workerAnswer}"`);
                }
            } catch (e) {
                // Not our event
            }
        }

        if (taskId === null) {
            console.log("⚠️ No 'TaskSubmitted' event found in this transaction.");
            return;
        }

        // Now Fetch Task Details
        console.log(`\n🔄 Fetching Task #${taskId} details from contract...`);
        const TASK_ESCROW_ABI = [
            {
                "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "name": "tasks",
                "outputs": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "address", "name": "agency", "type": "address" },
                    { "internalType": "uint256", "name": "reward", "type": "uint256" },
                    { "internalType": "uint256", "name": "depositShares", "type": "uint256" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    { "internalType": "string", "name": "metadataHash", "type": "string" },
                    { "internalType": "uint256", "name": "requiredSubmissions", "type": "uint256" },
                    { "internalType": "uint256", "name": "currentSubmissions", "type": "uint256" },
                    { "internalType": "bytes32", "name": "correctAnswerHash", "type": "bytes32" }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // Address from contracts.ts
        const CONTRACTS = {
            TaskEscrow: { address: "0x43AE98Ff8A2af37855C0209F4470e849B75cBE0F" }
        };

        // Read Task
        const task = await client.readContract({
            address: CONTRACTS.TaskEscrow.address,
            abi: TASK_ESCROW_ABI,
            functionName: 'tasks',
            args: [BigInt(taskId)]
        });

        // Task Struct: [id, agency, reward, deposit, deadline, status, metadataHash, requiredSubs, currentSubs, correctAnswerHash]
        const storedHash = task[9]; // Index 9 per ABI

        console.log(`\n📦 Contract State:`);
        console.log(`   - Stored Hash:   ${storedHash}`);

        // Compute Worker Hash

        // Try exact match
        const exactHash = keccak256(encodePacked(['string'], [workerAnswer]));
        console.log(`   - Worker Hash:   ${exactHash} (Exact: "${workerAnswer}")`);

        // Try trimmed/lowercase match (what the server does)
        const cleanAnswer = workerAnswer.trim().toLowerCase();
        const cleanHash = keccak256(encodePacked(['string'], [cleanAnswer]));
        console.log(`   - Cleaned Hash:  ${cleanHash} (Clean: "${cleanAnswer}")`);

        // Try common variations
        const variations = [
            workerAnswer,
            workerAnswer.trim(),
            workerAnswer.toLowerCase(),
            workerAnswer.trim().toLowerCase(),
            ` ${workerAnswer}`, // Leading space
            `${workerAnswer} `, // Trailing space
            workerAnswer.replace(/^\w/, c => c.toUpperCase()), // Title case
            "rain", "Rain", "stormy", "Stormy", "cloudy", "Cloudy", "sunny", "Sunny", "wet", "Wet" // Common weather
        ];

        console.log(`\n🔍 Checking variations...`);
        let found = false;
        for (const v of variations) {
            const h = keccak256(encodePacked(['string'], [v]));
            if (h === storedHash) {
                console.log(`\n🎉 MATCH FOUND! The stored hash corresponds to: "${v}"`);
                console.log(`   (Quote: '${v}')`);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log(`\n❌ No match found in variations. Stored hash is unknown word/string.`);
        }

        if (storedHash === exactHash) {
            console.log("\n✅ EXACT MATCH! Protocol should have auto-paid.");
        } else if (storedHash === cleanHash) {
            console.log("\n⚠️ CLEAN MATCH! Protocol expects strict match, but this would pass if cleaned.");
            console.log("   (This explains why server-side verification passes but on-chain fails if contract is strict)");
        } else {
            console.log("\n❌ NO MATCH. The stored hash is completely different.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

// Allow running with arg
const arg = process.argv[2];
if (arg) {
    debugSubmission(arg);
} else {
    console.log("Usage: node debug-submission.js <tx_hash>");
}
