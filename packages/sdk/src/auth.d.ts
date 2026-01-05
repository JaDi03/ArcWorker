import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import { ArcWorkerConfig, UserSession } from './types';
export declare class AuthModule {
    private sdk;
    private config;
    private session;
    constructor(config: ArcWorkerConfig);
    /**
     * Inicia sesión o registra a un usuario mediante su email.
     * @param email Correo electrónico del usuario.
     */
    login(email: string): Promise<UserSession>;
    /**
     * Recupera la sesión actual desde el almacenamiento local.
     */
    getSession(): Promise<UserSession | null>;
    /**
     * Cierra la sesión activa.
     */
    logout(): void;
    getSdkInstance(): W3SSdk;
}
//# sourceMappingURL=auth.d.ts.map