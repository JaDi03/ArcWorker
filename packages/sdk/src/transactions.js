"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModule = void 0;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./auth");
const types_1 = require("./types");
class TransactionModule {
    config;
    auth;
    constructor(config, auth) {
        this.config = config;
        this.auth = auth;
    }
    /**
     * Envía una transacción, opcionalmente sin gas (si el backend lo soporta).
     */
    async send(to, value, options = {}) {
        const session = await this.auth.getSession();
        if (!session)
            throw new Error('Usuario no autenticado');
        try {
            const payload = {
                userId: session.userId,
                to,
                value,
                note: options.note ? this.encodeNote(options.note) : undefined,
                gasless: options.gasless ?? true // Por defecto intentamos gasless
            };
            const response = await axios_1.default.post(`${this.config.baseUrl}/transactions/send`, payload, {
                headers: { 'Authorization': `Bearer ${session.userToken}` }
            });
            const { challengeId } = response.data;
            // Ejecutar el reto de firma de Circle
            return await new Promise((resolve, reject) => {
                this.auth.getSdkInstance().execute(challengeId, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result.txHash || result.signature);
                });
            });
        }
        catch (error) {
            console.error('[ArcWorker Transactions] Error sending tx:', error);
            throw error;
        }
    }
    /**
     * Codifica un string en Hex para incrustarlo en los Input Data de EVM.
     */
    encodeNote(note) {
        return '0x' + Buffer.from(note, 'utf8').toString('hex');
    }
    /**
     * Decodifica una nota en Hex a string.
     */
    decodeNote(hex) {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return Buffer.from(cleanHex, 'hex').toString('utf8');
    }
}
exports.TransactionModule = TransactionModule;
//# sourceMappingURL=transactions.js.map