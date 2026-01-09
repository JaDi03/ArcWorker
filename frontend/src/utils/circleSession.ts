/**
 * Helper para renovar automáticamente la sesión de Circle cuando expira
 * Uso: await ensureCircleSession(userId)
 */

interface CircleSessionData {
    userToken: string;
    encryptionKey: string;
}

/**
 * Verifica si la sesión de Circle es válida y la renueva si es necesario
 * @param userId - ID del usuario de Circle
 * @returns Datos de sesión (userToken y encryptionKey) o null si falla
 */
export async function ensureCircleSession(userId: string, force: boolean = false): Promise<CircleSessionData | null> {
    try {
        const sessionToken = localStorage.getItem('arc_session_token');
        const encryptionKey = localStorage.getItem('arc_encryption_key');
        const lastRenewed = localStorage.getItem('arc_session_timestamp');

        const now = Date.now();
        const isOld = lastRenewed ? (now - parseInt(lastRenewed)) > 50 * 60 * 1000 : true; // 50 mins

        if (!force && sessionToken && encryptionKey && !isOld) {
            console.log('[CircleSession] Sesión válida encontrada (menos de 50m)');
            return { userToken: sessionToken, encryptionKey };
        }

        console.log(force ? '[CircleSession] Forzando renovación de sesión...' : '[CircleSession] Token expirado o viejo, renovando...');

        const renewRes = await fetch('/api/circle/auth/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (!renewRes.ok) {
            console.error('[CircleSession] Error renovando sesión:', renewRes.status);
            return null;
        }

        const renewData = await renewRes.json();

        if (renewData.userToken && renewData.encryptionKey) {
            localStorage.setItem('arc_session_token', renewData.userToken);
            localStorage.setItem('arc_encryption_key', renewData.encryptionKey);
            localStorage.setItem('arc_session_timestamp', Date.now().toString());
            console.log('[CircleSession] Sesión renovada y guardada con éxito');

            return {
                userToken: renewData.userToken,
                encryptionKey: renewData.encryptionKey
            };
        }

        console.error('[CircleSession] Respuesta inválida del servidor');
        return null;

    } catch (error) {
        console.error('[CircleSession] Error en renovación:', error);
        return null;
    }
}

/**
 * Obtiene el userId de Circle desde localStorage
 * @returns userId o null si no está disponible
 */
export function getCircleUserId(): string | null {
    try {
        const circleUser = localStorage.getItem('arc_user');
        if (!circleUser) return null;

        const user = JSON.parse(circleUser);
        return user.id || user.userId || null;
    } catch (error) {
        console.error('[CircleSession] Error obteniendo userId:', error);
        return null;
    }
}
