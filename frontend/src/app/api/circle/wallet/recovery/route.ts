import { NextResponse } from 'next/server';
import { createCircleSession, createSecurityQuestionsChallenge } from '@/arcworker-sdk/wallet/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { username } = await req.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // 1. Get user from DB to find their registered email
        const DB_PATH = path.join(process.cwd(), 'src/data/users.json');
        const users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const userRecord = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

        if (!userRecord || !userRecord.email) {
            return NextResponse.json({ error: 'User email not found for wallet challenge' }, { status: 404 });
        }

        // 2. Get user token for the session using the registered email
        const sanitizedEmail = userRecord.email.toLowerCase().replace(/[^a-z0-9\-_\.@]/g, '_');
        const userId = `arc_user_${sanitizedEmail}`;

        // Ensure user exists in Circle system
        const { getOrCreateCircleUser } = await import('@/arcworker-sdk/wallet/server');
        await getOrCreateCircleUser(userId);

        const { userToken } = await createCircleSession(userId);

        // 3. Create the security questions challenge
        const challengeId = await createSecurityQuestionsChallenge(userToken);

        return NextResponse.json({ challengeId });
    } catch (error: any) {
        console.error('[Recovery API] Error:', error.response?.data || error.message);
        return NextResponse.json({ error: error.response?.data?.message || 'Failed to create recovery challenge' }, { status: 500 });
    }
}
