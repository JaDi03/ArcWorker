import { ArcWorkerConfig } from './types';
import { AuthModule } from './auth';
import { TransactionModule } from './transactions';
export declare class ArcWorker {
    auth: AuthModule;
    transactions: TransactionModule;
    constructor(config: ArcWorkerConfig);
}
export * from './types';
//# sourceMappingURL=index.d.ts.map