"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const w3s_pw_web_sdk_1 = require("@circle-fin/w3s-pw-web-sdk");
const axios_1 = __importDefault(require("axios"));
const types_1 = require("./types");
class AuthModule {
    sdk;
    config;
    session = null;
    constructor(config) {
        this.config = config;
        this.sdk = new w3s_pw_web_sdk_1.W3SSdk({
            appSettings: { appId: config.appId }
        });
    }
    /**
     * Inicia sesión o registra a un usuario mediante su email.
     * @param email Correo electrónico del usuario.
     */
    async login(email) {
        try {
            const response = await axios_1.default.post(`${this.config.baseUrl}/auth/login`, { email });
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
            // Guardar en localStorage si estamos en el navegador
            if (typeof window !== 'undefined') {
                localStorage.setItem('arc_user_session', JSON.stringify(this.session));
            }
            return this.session;
        }
        catch (error) {
            console.error('[ArcWorker Auth] Error during login:', error);
            throw error;
        }
    }
    /**
     * Recupera la sesión actual desde el almacenamiento local.
     */
    async getSession() {
        if (this.session)
            return this.session;
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
    /**
     * Cierra la sesión activa.
     */
    logout() {
        this.session = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('arc_user_session');
        }
    }
    getSdkInstance() {
        return this.sdk;
    }
}
exports.AuthModule = AuthModule;
//# sourceMappingURL=auth.js.map