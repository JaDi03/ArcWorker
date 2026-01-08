import { NextResponse } from 'next/server';
import { updateUserPassword } from '@/utils/db';
import { verifyRecovery } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { username, newPassword, userToken, challengeId } = await request.json();

        if (!username || !newPassword || !userToken || !challengeId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify Signature Challenge
        console.log(`[API] Verifying Recovery Challenge: ${challengeId}`);
        const verification = await verifyRecovery(userToken, challengeId);
        console.log(`[API] Verification Result:`, JSON.stringify(verification, null, 2));

        if (!verification.valid) {
            console.warn(`[API] Verification Failed: ${verification.status}`);
            return NextResponse.json({ error: 'Invalid PIN signature or challenge failed' }, { status: 401 });
        }

        // 2. Update Password in DB
        await updateUserPassword(username, newPassword);

        console.log(`[Auth] Password reset via PIN for: ${username}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[API] Recovery Verify Error:', error.message);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
