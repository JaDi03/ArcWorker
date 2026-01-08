import { ArcWorker } from '../index';
import axios from 'axios';

export class AuthModule {
    private sdk: ArcWorker;
    private userToken: string | null = null;
    private encryptionKey: string | null = null;

    constructor(sdk: ArcWorker) {
        this.sdk = sdk;
        // Restore session if available
        if (typeof localStorage !== 'undefined') {
            this.userToken = localStorage.getItem('arc_session_token');
            this.encryptionKey = localStorage.getItem('arc_encryption_key');
        }
    }

    /**
     * Start the login flow via Email
     * @param email User email
     * @returns Challenge status or Direct success if session active
     */
    public async loginWithEmail(email: string): Promise<{ address: string }> {
        if (this.userToken && this.encryptionKey) {
            // Validate session ?
            return { address: await this.getWalletAddress() };
        }

        const circleSdk = this.sdk.getCircleSdk();
        if (!circleSdk) throw new Error("SDK not initialized in browser");

        const deviceId = await circleSdk.getDeviceId();

        // Request OTP
        const authRes = await axios.post('/api/circle/auth/email', { email, deviceId });
        const { deviceToken, deviceEncryptionKey, otpToken, appId } = authRes.data;

        // Challenge Circle
        return new Promise((resolve, reject) => {
            circleSdk.updateConfigs({
                appSettings: { appId },
                loginConfigs: { deviceToken, deviceEncryptionKey, otpToken }
            }, async (error: any, result: any) => {
                if (error) reject(error);
                else if (result && result.userToken && result.encryptionKey) {
                    this.setSession(result.userToken, result.encryptionKey);
                    const address = await this.setupWallet();
                    resolve({ address });
                }
            });
            (circleSdk as any).verifyOtp();
        });
    }

    /**
     * Finalize Wallet Creation / Retrieval
     */
    private async setupWallet(): Promise<string> {
        if (!this.userToken) throw new Error("No session");

        const circleSdk = this.sdk.getCircleSdk();

        if (!this.encryptionKey) throw new Error("Encryption Key missing for session");

        // Authenticate SDK
        circleSdk?.setAuthentication({
            userToken: this.userToken,
            encryptionKey: this.encryptionKey
        });

        // Create Wallet
        const res = await axios.post('/api/circle/wallet', { userToken: this.userToken });
        const { challengeId, address } = res.data;

        if (challengeId && circleSdk) {
            await new Promise((resolve, reject) => {
                circleSdk.execute(challengeId, (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });
            // Poll for address... (Simplified for now)
            return await this.pollAddress();
        }

        return address || await this.pollAddress();
    }

    private async pollAddress(): Promise<string> {
        let retries = 10;
        while (retries > 0) {
            const res = await axios.post('/api/circle/wallet/address', { userToken: this.userToken });
            if (res.data.address) return res.data.address;
            await new Promise(r => setTimeout(r, 2000));
            retries--;
        }
        throw new Error("Address generation timeout");
    }

    // Check Address (Public)
    public async getWalletAddress(): Promise<string> {
        // Logic to get stored address or fetch
        return this.pollAddress();
    }

    private setSession(token: string, key: string) {
        this.userToken = token;
        this.encryptionKey = key;
        localStorage.setItem('arc_session_token', token);
        localStorage.setItem('arc_encryption_key', key);
    }

    public logout() {
        this.userToken = null;
        this.encryptionKey = null;
        localStorage.removeItem('arc_session_token');
        localStorage.removeItem('arc_encryption_key');
    }
}
