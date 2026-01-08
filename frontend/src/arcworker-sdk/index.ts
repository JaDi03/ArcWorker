import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import axios from 'axios';

// SDK Modules (Placeholders for now)
import { AuthModule } from './auth';
import { TransactionModule } from './transaction';
import { EscrowModule } from './escrow';
import { ReputationModule } from './reputation';

export interface ArcWorkerConfig {
    appId: string;
    environment?: 'sandbox' | 'live';
    rpcUrl?: string; // Optional custom RPC
    contracts?: {
        escrow: string;
        reputation: string;
    };
}

/**
 * ArcWorker SDK V1
 * The main entry point for the Gig-Economy Integration Layer.
 */
export class ArcWorker {
    private config: ArcWorkerConfig;
    private sdk: W3SSdk | null = null;

    // Modules
    public auth: AuthModule;
    public transactions: TransactionModule;
    public escrow: EscrowModule;
    public reputation: ReputationModule;

    constructor(config: ArcWorkerConfig) {
        this.config = {
            environment: 'live',
            rpcUrl: 'https://rpc.testnet.arc.network', // Default
            contracts: {
                // Default Arc Testnet Addresses (deployed via Hardhat)
                escrow: '0xb2659fe01b2DB2d6A5e52FcA318585a62fcfe74B',
                reputation: '0x7f85BACE984B8966DEE8D51691eaED089c4363f8',
                ...config.contracts // Allow override
            },
            ...config
        };

        // Initialize Modules
        this.auth = new AuthModule(this);
        this.transactions = new TransactionModule(this);
        this.escrow = new EscrowModule(this);
        this.reputation = new ReputationModule(this);

        // Initialize Core Circle SDK if in browser
        if (typeof window !== 'undefined') {
            this.initCircleSdk();
        }
    }

    private initCircleSdk() {
        if (!window.__circle_sdk_instance) {
            window.__circle_sdk_instance = new W3SSdk({
                appSettings: { appId: this.config.appId }
            });
        }
        this.sdk = window.__circle_sdk_instance;
    }

    /**
     * Internal: Access to the low-level Circle SDK
     */
    public getCircleSdk(): W3SSdk | null {
        return this.sdk;
    }

    /**
     * Internal: Get Config
     */
    public getConfig(): ArcWorkerConfig {
        return this.config;
    }
}

// Global declaration for the SDK instance to survive HMR
declare global {
    interface Window {
        __circle_sdk_instance?: W3SSdk;
    }
}
