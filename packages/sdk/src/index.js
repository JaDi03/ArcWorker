"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArcWorker = void 0;
const types_1 = require("./types");
const auth_1 = require("./auth");
const transactions_1 = require("./transactions");
class ArcWorker {
    auth;
    transactions;
    // Futuros módulos
    // public identity: IdentityModule;
    // public escrow: EscrowModule;
    constructor(config) {
        // Valores por defecto
        const finalConfig = {
            baseUrl: 'https://api.arcworker.com/v1',
            network: 'arc-testnet',
            ...config
        };
        this.auth = new auth_1.AuthModule(finalConfig);
        this.transactions = new transactions_1.TransactionModule(finalConfig, this.auth);
    }
}
exports.ArcWorker = ArcWorker;
// Re-exportar tipos para los desarrolladores
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map