export interface ArcWorkerConfig {
    appId: string;
    baseUrl?: string;
    network?: 'arc-testnet' | 'arc-mainnet';
}
export interface UserSession {
    userId: string;
    userToken?: string;
    encryptionKey?: string;
    walletAddress?: string;
}
export interface TaskMetadata {
    title: string;
    desc: string;
    tmpl: 'text-classification' | 'language-detection' | 'image-classification' | 'object-verification';
    content: string;
    options: string[];
    verification: 'manual' | 'auto';
    correctAnswer?: string;
}
export interface SendTransactionOptions {
    gasless?: boolean;
    note?: string;
}
//# sourceMappingURL=types.d.ts.map