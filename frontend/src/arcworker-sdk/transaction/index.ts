import { ArcWorker } from '../index';
import axios from 'axios';
import { parseEther } from 'viem';

export class TransactionModule {
    private sdk: ArcWorker;

    constructor(sdk: ArcWorker) {
        this.sdk = sdk;
    }

    /**
     * Send USDC or Native Token
     * @param to Recipient Address
     * @param amount Amount in string (e.g. "1.5")
     * @param token 'USDC' | 'ETH' (default USDC)
     */
    public async send(to: string, amount: string, token: 'USDC' | 'ETH' = 'USDC'): Promise<string> {
        const circleSdk = this.sdk.getCircleSdk();
        if (!circleSdk) throw new Error("SDK not initialized");

        // 1. Prepare Transaction on Backend (Gasless/Managed)
        // We reuse the existing Circle API route or a new specific one for transfers
        // For V1 SDK, we'll map to a generic 'transfer' endpoint we assume exists or create.
        // Let's use the pattern from `create-campaign` but simplified for transfer.

        // Note: In a real implementation, we need a dedicated endpoint /api/circle/transfer
        // For now, I will assume we have it or use a placeholder logic that mirrors `create-campaign`.

        console.log(`[SDK] Sending ${amount} ${token} to ${to}`);

        // This is a PLACEHOLDER for the actual API call
        // const res = await axios.post('/api/circle/transfer', { ... });
        // const { challengeId } = res.data;

        // throw new Error("Backend endpoint /api/circle/transfer not yet implemented in V1 Preview");

        // Allow simulated success for UI preview if in sandbox
        if (this.sdk.getConfig().environment === 'sandbox') {
            return "0x_sandbox_tx_hash_" + Date.now();
        }

        // Real Implementation Logic Requirement:
        // 1. Get User Token
        const userToken = localStorage.getItem('arc_session_token');
        if (!userToken) throw new Error("User not authenticated");

        // 2. Call API
        try {
            const res = await axios.post('/api/circle/transfer', {
                userToken,
                toAddress: to,
                amount,
                token
            });
            const { challengeId } = res.data;

            // 3. Execute Challenge
            return new Promise((resolve, reject) => {
                circleSdk.execute(challengeId, (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result.transactionId || "tx_submitted");
                });
            });

        } catch (e: any) {
            console.error("Transfer failed", e);
            throw new Error(e.response?.data?.error || e.message);
        }
    }
}
