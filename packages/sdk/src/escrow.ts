import axios from 'axios';
import { AuthModule } from './auth.js';
import { TransactionModule } from './transactions.js';
import { ArcWorkerConfig, TaskMetadata } from './types.js';

export class EscrowModule {
    private config: ArcWorkerConfig;
    private auth: AuthModule;
    private transactions: TransactionModule;

    constructor(config: ArcWorkerConfig, auth: AuthModule, transactions: TransactionModule) {
        this.config = config;
        this.auth = auth;
        this.transactions = transactions;
    }

    async createCampaign(
        reward: string,
        totalQuantity: number,
        durationSeconds: number,
        metadata: TaskMetadata
    ): Promise<string> {
        const session = await this.auth.getSession();
        if (!session) throw new Error('User not authenticated');

        try {
            const payload = {
                userId: session.userId,
                reward,
                quantity: totalQuantity,
                deadline: durationSeconds,
                metadata: JSON.stringify(metadata)
            };

            const response = await axios.post(`${this.config.baseUrl}/escrow/create`, payload, {
                headers: { 'Authorization': `Bearer ${session.userToken}` }
            });

            const { challengeId } = response.data;

            return await new Promise((resolve, reject) => {
                this.auth.getSdkInstance().execute(challengeId, (error: any, result: any) => {
                    if (error) reject(error);
                    else resolve(result.txHash || result.signature);
                });
            });
        } catch (error) {
            console.error('[ArcWorker Escrow] Error creating campaign:', error);
            throw error;
        }
    }

    async submitTask(taskId: number, answer: string): Promise<string> {
        return this.transactions.send(
            'escrow-contract',
            '0',
            {
                note: `submit:${taskId}:${answer}`,
                gasless: true
            }
        );
    }
}
