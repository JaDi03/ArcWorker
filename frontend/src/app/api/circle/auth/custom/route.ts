import { NextResponse } from 'next/server';
import { getOrCreateCircleUser, createCircleSession } from '@/arcworker-sdk/wallet/server';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        console.log(`[API] Custom Auth Request for user: ${userId}`);

        // 1. Ensure user exists in Circle
        await getOrCreateCircleUser(userId);

        // 2. Create session token (No OTP needed for custom auth)
        const session = await createCircleSession(userId);

        return NextResponse.json({
            userToken: session.userToken,
            encryptionKey: session.encryptionKey,
            userId: session.userId // Return the bridged ID
        });

    } catch (error: any) {
        console.error('[API] Custom Auth Error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: error.message || 'Custom auth failed' },
            { status: 500 }
        );
    }
}
