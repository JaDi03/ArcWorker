import { NextResponse } from 'next/server';
import { updateUserUserId, getUserByEmailOrUsername } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { username, userId } = await request.json();

        if (!username || !userId) {
            return NextResponse.json({ error: 'Missing username or userId' }, { status: 400 });
        }

        console.log(`[Auth Sync] Syncing userId for ${username}: ${userId}`);

        await updateUserUserId(username, userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Auth Sync] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
