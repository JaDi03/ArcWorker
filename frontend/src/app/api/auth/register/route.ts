import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername, createUser } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { username, password, email, walletAddress, role, walletType, userId } = await request.json();

        if (!username || !password || !walletAddress || !walletType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if username OR email is already taken
        const [existingByUsername, existingByEmail] = await Promise.all([
            getUserByEmailOrUsername(username),
            email ? getUserByEmailOrUsername(email) : Promise.resolve(null)
        ]);

        if (existingByUsername || existingByEmail) {
            const conflict = existingByUsername ? 'Username' : 'Email';
            return NextResponse.json({ error: `${conflict} already taken` }, { status: 400 });
        }

        const userData = {
            username,
            password,
            email,
            walletAddress,
            role,
            walletType,
            userId
        };

        await createUser(userData);

        console.log(`[Auth] New user registered: ${username} (${role}) | ID: ${userId || 'N/A'}`);

        return NextResponse.json({ success: true, user: { username, role, walletAddress, walletType, userId } });
    } catch (error: any) {
        console.error('[Auth] Registration error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
