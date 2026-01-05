import axios from 'axios';
import { ArcWorkerConfig } from './types.js';

export interface UserProfile {
    address: string;
    username?: string;
    reputationScore: number;
    tasksCompleted: number;
}

export class IdentityModule {
    private config: ArcWorkerConfig;

    constructor(config: ArcWorkerConfig) {
        this.config = config;
    }

    async resolveUsername(username: string): Promise<string> {
        const cleanName = username.startsWith('@') ? username.slice(1) : username;
        try {
            const response = await axios.get(`${this.config.baseUrl}/identity/resolve/${cleanName}`);
            return response.data.address;
        } catch (error) {
            console.error(`[ArcWorker Identity] Error resolving username ${username}:`, error);
            throw new Error('Could not resolve username');
        }
    }

    async getProfile(identifier: string): Promise<UserProfile> {
        try {
            const response = await axios.get(`${this.config.baseUrl}/identity/profile/${identifier}`);
            return response.data;
        } catch (error) {
            console.error(`[ArcWorker Identity] Error fetching profile for ${identifier}:`, error);
            throw error;
        }
    }
}
