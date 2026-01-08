import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername } from '@/utils/db';
import { getOrCreateCircleUser, createCircleSession, initiateRecovery } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { username } = await request.json();

        if (!username) {
            console.error('[API] Recovery Init: Username missing');
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        console.log(`[API] Recovery Init for: ${username}`);
        const user = await getUserByEmailOrUsername(username);

        if (!user) {
            console.warn(`[API] Recovery Init: User ${username} not found in DB`);
            // Security: Don't reveal user existence
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log(`[API] User found (ID: ${user.id}). Fetching Circle User...`);

        // 1. Get Circle User & Session
        // IMPORTANT: We use the 'username' as the primary Circle identifier 
        // to match the registration logic in UserSetupModal.tsx
        const circleIdentifier = user.username || username;
        console.log(`[API] Circle Identifier used: ${circleIdentifier}`);

        const circleUser = await getOrCreateCircleUser(circleIdentifier);
        console.log(`[API] Circle User Response:`, JSON.stringify(circleUser, null, 2));

        // Use the actual ID returned by Circle just in case, but fallback to our identifier
        const userId = circleUser.id || circleUser.userId || circleIdentifier;
        console.log(`[API] Circle User ID resolved: ${userId}`);

        const session = await createCircleSession(userId);
        console.log(`[API] Circle Session created. User Token: ${session.userToken?.substring(0, 10)}...`);

        // 2. Initiate Sign Message Challenge
        const { challengeId, message } = await initiateRecovery(session.userToken, username);
        console.log(`[API] Recovery Challenge Initiated: ${challengeId}`);

        return NextResponse.json({
            success: true,
            challengeId,
            message,
            userToken: session.userToken,
            encryptionKey: session.encryptionKey
        });

    } catch (error: any) {
        console.error('[API] Recovery Init Error Trace:', error);
        console.error('[API] Recovery Init Error Msg:', error.message);
        console.error('[API] Recovery Init Error Stack:', error.stack);
        return NextResponse.json({
            error: 'Failed to initiate recovery',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
