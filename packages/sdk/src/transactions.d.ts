import { AuthModule } from './auth';
import { ArcWorkerConfig, SendTransactionOptions } from './types';
export declare class TransactionModule {
    private config;
    private auth;
    constructor(config: ArcWorkerConfig, auth: AuthModule);
    /**
     * Envía una transacción, opcionalmente sin gas (si el backend lo soporta).
     */
    send(to: string, value: string, options?: SendTransactionOptions): Promise<string>;
    /**
     * Codifica un string en Hex para incrustarlo en los Input Data de EVM.
     */
    private encodeNote;
    /**
     * Decodifica una nota en Hex a string.
     */
    decodeNote(hex: string): string;
}
//# sourceMappingURL=transactions.d.ts.map