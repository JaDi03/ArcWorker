import { getClients, CONTRACT_ADDRESSES } from './config';
import { parseUnits, formatUnits } from 'viem';

// Minimal ABIs for the SDK to keep it lightweight
const TASK_ESCROW_ABI = [
    { name: "taskCount", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { name: "getTask", type: "function", inputs: [{ name: "_id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "agency", type: "address" }, { name: "reward", type: "uint256" }, { name: "depositShares", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" }, { name: "metadataHash", type: "string" }, { name: "requiredSubmissions", type: "uint256" }, { name: "currentSubmissions", type: "uint256" }, { name: "correctAnswerHash", type: "string" }] }], stateMutability: "view" },
    { name: "taskParticipated", type: "function", inputs: [{ name: "_taskId", type: "uint256" }, { name: "_user", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
    { name: "submitTask", type: "function", inputs: [{ name: "_taskId", type: "uint256" }, { name: "_metadataHash", type: "string" }], outputs: [], stateMutability: "nonpayable" },
    { name: "createTasksBatch", type: "function", inputs: [{ name: "_rewardPerTask", type: "uint256" }, { name: "_count", type: "uint256" }, { name: "_deadline", type: "uint256" }, { name: "_metadataHash", type: "string" }, { name: "_requiredSubmissions", type: "uint256" }, { name: "_correctAnswerHash", type: "bytes32" }], outputs: [], stateMutability: "payable" }
] as const;

const USER_REGISTRY_ABI = [
    { name: "getName", type: "function", inputs: [{ name: "_user", type: "address" }], outputs: [{ type: "string" }], stateMutability: "view" },
    { name: "register", type: "function", inputs: [{ name: "_name", type: "string" }], outputs: [], stateMutability: "nonpayable" }
] as const;

export class ArcWorkerAgent {
    private privateKey: string;
    private publicClient: any;
    private walletClient: any;
    private account: any;

    constructor(privateKey: string) {
        this.privateKey = privateKey;
        const { publicClient, walletClient, account } = getClients(privateKey);
        this.publicClient = publicClient;
        this.walletClient = walletClient;
        this.account = account;
    }

    async getAddress() {
        return this.account.address;
    }

    async getName() {
        try {
            return await this.publicClient.readContract({
                address: CONTRACT_ADDRESSES.UserRegistry,
                abi: USER_REGISTRY_ABI,
                functionName: 'getName',
                args: [this.account.address]
            });
        } catch (e) {
            return null;
        }
    }

    async register(name: string) {
        console.log(`🤖 Registering agent as: ${name}...`);
        const hash = await this.walletClient.writeContract({
            address: CONTRACT_ADDRESSES.UserRegistry,
            abi: USER_REGISTRY_ABI,
            functionName: 'register',
            args: [name]
        });
        return hash;
    }

    async fetchAvailableTasks() {
        const count = await this.publicClient.readContract({
            address: CONTRACT_ADDRESSES.TaskEscrow,
            abi: TASK_ESCROW_ABI,
            functionName: 'taskCount'
        });

        const tasks = [];
        for (let i = 0; i < Number(count); i++) {
            const task = await this.publicClient.readContract({
                address: CONTRACT_ADDRESSES.TaskEscrow,
                abi: TASK_ESCROW_ABI,
                functionName: 'getTask',
                args: [BigInt(i)]
            });

            // Check participation status
            const participated = await this.publicClient.readContract({
                address: CONTRACT_ADDRESSES.TaskEscrow,
                abi: TASK_ESCROW_ABI,
                functionName: 'taskParticipated',
                args: [BigInt(i), this.account.address]
            });

            if (!participated && Number(task.status) <= 1) {
                tasks.push(task);
            }
        }
        return tasks;
    }

    async submitWork(taskId: number, result: any) {
        console.log(`🚀 Submitting work for Task #${taskId}...`);
        const metadataHash = typeof result === 'string' ? result : JSON.stringify(result);

        const hash = await this.walletClient.writeContract({
            address: CONTRACT_ADDRESSES.TaskEscrow,
            abi: TASK_ESCROW_ABI,
            functionName: 'submitTask',
            args: [BigInt(taskId), metadataHash]
        });

        return hash;
    }

    async createTask(params: {
        reward: number,
        count: number,
        deadlineDays: number,
        metadata: any,
        requiredSubmissions: number
    }) {
        const rewardWei = parseUnits(params.reward.toString(), 18);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadlineDays * 86400));
        const metadataHash = typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata);

        // Zero hash for correctAnswer if not provided (for open tasks)
        const emptyCorrectAnswer = "0x0000000000000000000000000000000000000000000000000000000000000000";

        console.log(`📤 Publishing batch of ${params.count} tasks...`);

        const platformFeeBps = BigInt(500); // 5% fee from contract
        const fee = (rewardWei * platformFeeBps) / BigInt(10000);
        const requiredPerSub = rewardWei + fee;
        const totalValue = requiredPerSub * BigInt(params.count) * BigInt(params.requiredSubmissions);

        console.log(`💰 Reward/Task: ${formatUnits(rewardWei, 18)} USDC`);
        console.log(`💰 Fee/Sub: ${formatUnits(fee, 18)} USDC`);
        console.log(`💰 Total Required Deposit: ${formatUnits(totalValue, 18)} USDC`);

        const hash = await this.walletClient.writeContract({
            address: CONTRACT_ADDRESSES.TaskEscrow,
            abi: TASK_ESCROW_ABI,
            functionName: 'createTasksBatch',
            args: [
                rewardWei,
                BigInt(params.count),
                deadline,
                metadataHash,
                BigInt(params.requiredSubmissions),
                emptyCorrectAnswer
            ],
            value: totalValue
        });

        return hash;
    }
}
