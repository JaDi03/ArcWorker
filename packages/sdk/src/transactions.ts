import axios from 'axios';
import { AuthModule } from './auth.js';
import { ArcWorkerConfig, SendTransactionOptions } from './types.js';

export class TransactionModule {
    private config: ArcWorkerConfig;
    private auth: AuthModule;

    constructor(config: ArcWorkerConfig, auth: AuthModule) {
        this.config = config;
        this.auth = auth;
    }

    async send(to: string, value: string, options: SendTransactionOptions = {}): Promise<string> {
        const session = await this.auth.getSession();
        if (!session) throw new Error('User not authenticated');

        try {
            const payload = {
                userId: session.userId,
                to,
                value,
                note: options.note ? this.encodeNote(options.note) : undefined,
                gasless: options.gasless ?? true
            };

            const response = await axios.post(`${this.config.baseUrl}/transactions/send`, payload, {
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
            console.error('[ArcWorker Transactions] Error sending tx:', error);
            throw error;
        }
    }

    private encodeNote(note: string): string {
        return '0x' + Buffer.from(note, 'utf8').toString('hex');
    }

    decodeNote(hex: string): string {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return Buffer.from(cleanHex, 'hex').toString('utf8');
    }
}
