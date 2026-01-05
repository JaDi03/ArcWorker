import { ArcWorkerConfig } from './types.js';
import { AuthModule } from './auth.js';
import { TransactionModule } from './transactions.js';
import { EscrowModule } from './escrow.js';
import { IdentityModule } from './identity.js';

export class ArcWorker {
    public auth: AuthModule;
    public transactions: TransactionModule;
    public escrow: EscrowModule;
    public identity: IdentityModule;

    constructor(config: ArcWorkerConfig) {
        const finalConfig: ArcWorkerConfig = {
            baseUrl: 'https://api.arcworker.com/v1',
            network: 'arc-testnet',
            ...config
        };

        this.auth = new AuthModule(finalConfig);
        this.transactions = new TransactionModule(finalConfig, this.auth);
        this.escrow = new EscrowModule(finalConfig, this.auth, this.transactions);
        this.identity = new IdentityModule(finalConfig);
    }
}

export * from './types.js';
