import { ArcWorker } from '../index';
import axios from 'axios';
import { parseEther } from 'viem';

export class EscrowModule {
    private sdk: ArcWorker;

    constructor(sdk: ArcWorker) {
        this.sdk = sdk;
    }

    /**
     * Create a new Gig/Task
     * @param reward Amount per task (USDC)
     * @param durationSeconds Time to complete
     * @param metadata JSON object with task details
     * @param quantity Number of tasks
     */
    public async createTask(reward: string, durationSeconds: number, metadata: any, quantity: number = 1): Promise<string> {
        const circleSdk = this.sdk.getCircleSdk();
        if (!circleSdk) throw new Error("SDK not initialized");

        const userToken = localStorage.getItem('arc_session_token');
        if (!userToken) throw new Error("User not authenticated");

        // Prepare args
        const metaString = JSON.stringify(metadata);
        const rewardWei = parseEther(reward).toString();

        // Calculate total amount for approval (Reward * Quantity * 1.05 fee)
        const subtotal = parseFloat(reward) * quantity;
        const total = subtotal * 1.05;

        const args = [rewardWei, durationSeconds.toString(), metaString];

        // Call API
        try {
            const res = await axios.post('/api/circle/create-campaign', {
                userToken,
                args,
                amount: total.toString()
            });
            const { challengeId } = res.data;

            // Execute Challenge
            return new Promise((resolve, reject) => {
                circleSdk.execute(challengeId, (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result.transactionId || "campaign_created");
                });
            });

        } catch (e: any) {
            console.error("Create Task Failed", e);
            throw new Error(e.response?.data?.error || e.message);
        }
    }

    /**
     * Approve a completed submission
     * @param taskId Task ID
     */
    public async approveTask(taskId: number): Promise<string> {
        const circleSdk = this.sdk.getCircleSdk();
        if (!circleSdk) throw new Error("SDK not initialized");

        const userToken = localStorage.getItem('arc_session_token');
        if (!userToken) throw new Error("User not authenticated");

        // We need userId for the current API implementation of approve-task
        // In V2 API, userToken should be enough. For now, we fetch profile from storage.
        const storedUser = localStorage.getItem('arc_user');
        const userId = storedUser ? JSON.parse(storedUser).id : null;

        if (!userId) throw new Error("User profile missing locally");

        try {
            const res = await axios.post('/api/circle/approve-task', {
                userId,
                taskId: taskId.toString(),
                userToken,
                // encryptionKey is handled by SDK session usually but API expects it passed?
                // The API route currently expects encryptionKey to *restore* session if needed.
                // We'll pass it if we have it, or let the backend handle it if we refactor.
                // For now, let's assume active session on SDK doesn't need re-init on backend if tokens are valid.
                encryptionKey: localStorage.getItem('arc_encryption_key')
            });

            const { challengeId } = res.data;

            return new Promise((resolve, reject) => {
                circleSdk.execute(challengeId, (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result.transactionId || "task_approved");
                });
            });

        } catch (e: any) {
            console.error("Approve Task Failed", e);
            throw new Error(e.response?.data?.error || e.message);
        }
    }
    /**
     * Fetch available tasks (Public)
     * @param filter Optional filtering
     */
    public async getTasks(filter?: { limit?: number; tag?: string; minReward?: number }): Promise<Array<{ id: string; title: string; reward: string; type: string; difficulty: 'Easy' | 'Medium' | 'Hard' }>> {
        // Mock Data for "Gig-in-a-Box" demo
        // In production, this would call GET /api/protocol/tasks
        const MOCK_TASKS = [
            { id: '1', title: 'Train AI Model: Identify Cars', reward: '5.00', type: 'AI Training', difficulty: 'Easy' as const },
            { id: '2', title: 'Beta Test: New DeFi Swap UI', reward: '15.00', type: 'Testing', difficulty: 'Medium' as const },
            { id: '3', title: 'Translate "Whitepaper" to Spanish', reward: '50.00', type: 'Translation', difficulty: 'Hard' as const },
            { id: '4', title: 'Verify Business Data', reward: '2.50', type: 'Data Entry', difficulty: 'Easy' as const },
            { id: '5', title: 'Social Share: Launch Tweet', reward: '1.00', type: 'Marketing', difficulty: 'Easy' as const },
        ];

        let results = MOCK_TASKS;
        if (filter?.tag) {
            results = results.filter(t => t.type.toLowerCase().includes(filter.tag!.toLowerCase()));
        }
        if (filter?.limit) {
            results = results.slice(0, filter.limit);
        }

        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));

        return results;
    }
}
