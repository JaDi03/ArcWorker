import { NextResponse } from 'next/server';
import { getUserByEmailOrUsername } from '@/utils/db';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Security: Don't log credentials
        const user = await getUserByEmailOrUsername(email);

        if (!user || user.password !== password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        console.log(`[Auth] User logged in: ${user.username}`);

        return NextResponse.json({
            success: true,
            user: {
                username: user.username,
                name: user.username,
                role: user.role,
                walletAddress: user.wallet_address || user.walletAddress,
                email: user.email,
                walletType: user.wallet_type || user.walletType || 'circle',
                id: user.user_id || user.userId || user.id || user.email,
                userId: user.user_id || user.userId
            }
        });
    } catch (error: any) {
        console.error('[Auth] Login error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
