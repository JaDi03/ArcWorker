import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import axios from 'axios';
import { ArcWorkerConfig, UserSession } from './types.js';

export class AuthModule {
    private sdk: W3SSdk;
    private config: ArcWorkerConfig;
    private session: UserSession | null = null;

    constructor(config: ArcWorkerConfig) {
        this.config = config;
        this.sdk = new W3SSdk({
            appSettings: { appId: config.appId }
        });
    }

    async login(email: string): Promise<UserSession> {
        try {
            const response = await axios.post(`${this.config.baseUrl}/auth/login`, { email });
            const data = response.data;

            this.session = {
                userId: data.userId,
                userToken: data.userToken,
                encryptionKey: data.encryptionKey,
                walletAddress: data.walletAddress
            };

            this.sdk.setAuthentication({
                userToken: data.userToken,
                encryptionKey: data.encryptionKey
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem('arc_user_session', JSON.stringify(this.session));
            }

            return this.session;
        } catch (error) {
            console.error('[ArcWorker Auth] Error during login:', error);
            throw error;
        }
    }

    async getSession(): Promise<UserSession | null> {
        if (this.session) return this.session;

        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('arc_user_session');
            if (saved) {
                this.session = JSON.parse(saved);
                if (this.session?.userToken && this.session?.encryptionKey) {
                    this.sdk.setAuthentication({
                        userToken: this.session.userToken,
                        encryptionKey: this.session.encryptionKey
                    });
                }
                return this.session;
            }
        }
        return null;
    }

    logout(): void {
        this.session = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('arc_user_session');
        }
    }

    getSdkInstance(): W3SSdk {
        return this.sdk;
    }
}
