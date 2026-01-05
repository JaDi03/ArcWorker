export interface ArcWorkerConfig {
    appId: string;
    baseUrl?: string;
    network?: string;
}

export interface UserSession {
    userId: string;
    userToken: string;
    encryptionKey: string;
    walletAddress?: string;
}

export interface TaskMetadata {
    title: string;
    description: string;
    options: string[];
    correctOption?: number;
    externalLink?: string;
}

export interface SendTransactionOptions {
    note?: string;
    gasless?: boolean;
}
